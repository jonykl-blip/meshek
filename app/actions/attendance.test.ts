import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  storage: {
    from: vi.fn(),
  },
};

const mockAdminClient = {
  auth: {
    admin: {
      createUser: vi.fn(),
    },
  },
  from: vi.fn(),
};

const mockLogAudit = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const {
  getPendingRecords,
  resolveWorker,
  resolveArea,
  getActiveWorkers,
  getActiveAreas,
  createWorkerAndResolve,
  approveRecord,
  rejectRecord,
  editRecord,
  getDailyAttendance,
  getAnomalies,
} = await import("./attendance");

const { verifyDashboardCaller } = await import("@/lib/auth-helpers");

function mockAuthenticatedAdmin() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "admin-1" } },
  });
}

function mockAdminRoleCheck() {
  return {
    select: () => ({
      eq: () => ({
        single: () =>
          Promise.resolve({ data: { role: "admin" }, error: null }),
      }),
    }),
  };
}

function mockRoleCheck(role: string) {
  return {
    select: () => ({
      eq: () => ({
        single: () =>
          Promise.resolve({ data: { role }, error: null }),
      }),
    }),
  };
}

describe("getPendingRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await getPendingRecords();

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("returns error when caller is not admin/owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabase.from.mockImplementation(() => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        single: () =>
          Promise.resolve({ data: { role: "worker" }, error: null }),
      };
      return builder;
    });

    const result = await getPendingRecords();

    expect(result).toEqual({ success: false, error: "אין הרשאה" });
  });

  it("returns pending records with joined worker/area names", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return mockAdminRoleCheck();
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "rec-1",
                      profile_id: "worker-1",
                      area_id: "area-1",
                      work_date: "2026-03-10",
                      total_hours: 8,
                      voice_ref_url: "2026/03/voice1.ogg",
                      raw_transcript: "עידן עבד 8 שעות בתפוזים",
                      status: "pending",
                      created_at: "2026-03-10T12:00:00Z",
                      profiles: { full_name: "עידן" },
                      areas: { name: "תפוזים" },
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      };
    });

    mockSupabase.storage.from.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://example.com/signed-url" },
        error: null,
      }),
    });

    const result = await getPendingRecords();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].worker_name).toBe("עידן");
      expect(result.data[0].area_name).toBe("תפוזים");
      expect(result.data[0].profile_id).toBe("worker-1");
      expect(result.data[0].area_id).toBe("area-1");
      expect(result.data[0].voice_signed_url).toBe(
        "https://example.com/signed-url"
      );
      expect(result.data[0].total_hours).toBe(8);
    }
  });

  it("handles NULL profile_id — worker_name is null", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return mockAdminRoleCheck();
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "rec-2",
                      profile_id: null,
                      area_id: "area-1",
                      work_date: "2026-03-10",
                      total_hours: 5,
                      voice_ref_url: null,
                      raw_transcript: "מישהו עבד 5 שעות",
                      status: "pending",
                      created_at: "2026-03-10T13:00:00Z",
                      profiles: null,
                      areas: { name: "אבוקדו" },
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      };
    });

    const result = await getPendingRecords();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].worker_name).toBeNull();
      expect(result.data[0].profile_id).toBeNull();
      expect(result.data[0].area_name).toBe("אבוקדו");
    }
  });

  it("handles NULL area_id — area_name is null", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return mockAdminRoleCheck();
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "rec-3",
                      profile_id: "worker-1",
                      area_id: null,
                      work_date: "2026-03-10",
                      total_hours: 6,
                      voice_ref_url: null,
                      raw_transcript: "עידן עבד 6 שעות",
                      status: "pending",
                      created_at: "2026-03-10T14:00:00Z",
                      profiles: { full_name: "עידן" },
                      areas: null,
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      };
    });

    const result = await getPendingRecords();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].worker_name).toBe("עידן");
      expect(result.data[0].area_name).toBeNull();
      expect(result.data[0].area_id).toBeNull();
    }
  });

  it("generates signed URLs for records with voice_ref_url", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { role: "owner" }, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "rec-4",
                      profile_id: "worker-2",
                      area_id: "area-2",
                      work_date: "2026-03-10",
                      total_hours: 7,
                      voice_ref_url: "2026/03/voice4.ogg",
                      raw_transcript: "test",
                      status: "pending",
                      created_at: "2026-03-10T15:00:00Z",
                      profiles: { full_name: "סיגל" },
                      areas: { name: "לימון" },
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      };
    });

    const mockCreateSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/signed" },
      error: null,
    });
    mockSupabase.storage.from.mockReturnValue({
      createSignedUrl: mockCreateSignedUrl,
    });

    const result = await getPendingRecords();

    expect(mockSupabase.storage.from).toHaveBeenCalledWith("voice-recordings");
    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      "2026/03/voice4.ogg",
      3600
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].voice_signed_url).toBe(
        "https://storage.example.com/signed"
      );
    }
  });

  it("returns voice_signed_url null for records without voice_ref_url", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return mockAdminRoleCheck();
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "rec-5",
                      profile_id: "worker-3",
                      area_id: "area-3",
                      work_date: "2026-03-10",
                      total_hours: 4,
                      voice_ref_url: null,
                      raw_transcript: "manual entry",
                      status: "pending",
                      created_at: "2026-03-10T16:00:00Z",
                      profiles: { full_name: "דני" },
                      areas: { name: "מנגו" },
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      };
    });

    const result = await getPendingRecords();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].voice_signed_url).toBeNull();
    }
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("returns error when attendance_logs query fails", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return mockAdminRoleCheck();
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () =>
                Promise.resolve({
                  data: null,
                  error: { message: "relation does not exist" },
                }),
            }),
          }),
        }),
      };
    });

    const result = await getPendingRecords();

    expect(result).toEqual({
      success: false,
      error: "relation does not exist",
    });
  });

  it("extracts path from full HTTP voice_ref_url and generates fresh signed URL", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return mockAdminRoleCheck();
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "rec-6",
                      profile_id: "worker-1",
                      area_id: "area-1",
                      work_date: "2026-03-10",
                      total_hours: 7,
                      voice_ref_url:
                        "https://abc123.supabase.co/storage/v1/object/sign/voice-recordings/2026/03/voice6.ogg?token=eyJhbGciOi",
                      raw_transcript: "test http url extraction",
                      status: "pending",
                      created_at: "2026-03-10T17:00:00Z",
                      profiles: { full_name: "עידן" },
                      areas: { name: "תפוזים" },
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      };
    });

    const mockCreateSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/fresh-signed" },
      error: null,
    });
    mockSupabase.storage.from.mockReturnValue({
      createSignedUrl: mockCreateSignedUrl,
    });

    const result = await getPendingRecords();

    expect(mockSupabase.storage.from).toHaveBeenCalledWith("voice-recordings");
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("2026/03/voice6.ogg", 3600);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].voice_signed_url).toBe(
        "https://storage.example.com/fresh-signed"
      );
    }
  });

  it("returns voice_signed_url null for malformed voice_ref_url", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return mockAdminRoleCheck();
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "rec-7",
                      profile_id: "worker-1",
                      area_id: "area-1",
                      work_date: "2026-03-10",
                      total_hours: 5,
                      voice_ref_url:
                        "https://example.com/no-voice-recordings-in-path",
                      raw_transcript: "test malformed url",
                      status: "pending",
                      created_at: "2026-03-10T18:00:00Z",
                      profiles: { full_name: "עידן" },
                      areas: { name: "תפוזים" },
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      };
    });

    const result = await getPendingRecords();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].voice_signed_url).toBeNull();
    }
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("returns voice_signed_url null when createSignedUrl returns an error", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return mockAdminRoleCheck();
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "rec-8",
                      profile_id: "worker-1",
                      area_id: "area-1",
                      work_date: "2026-03-10",
                      total_hours: 6,
                      voice_ref_url: "2026/03/voice-fail.ogg",
                      raw_transcript: "test signed url error",
                      status: "pending",
                      created_at: "2026-03-10T19:00:00Z",
                      profiles: { full_name: "עידן" },
                      areas: { name: "תפוזים" },
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      };
    });

    const mockCreateSignedUrl = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Bucket not found" },
    });
    mockSupabase.storage.from.mockReturnValue({
      createSignedUrl: mockCreateSignedUrl,
    });

    const result = await getPendingRecords();

    expect(mockSupabase.storage.from).toHaveBeenCalledWith("voice-recordings");
    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      "2026/03/voice-fail.ogg",
      3600
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].voice_signed_url).toBeNull();
    }
  });
});

describe("resolveWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await resolveWorker("rec-1", "worker-1");

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("returns error when caller is not admin/owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role: "worker" }, error: null }),
        }),
      }),
    }));

    const result = await resolveWorker("rec-1", "worker-1");

    expect(result).toEqual({ success: false, error: "אין הרשאה" });
  });

  it("returns error when record is not found", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    });

    const result = await resolveWorker("rec-nonexistent", "worker-1");

    expect(result).toEqual({ success: false, error: "רשומה לא נמצאה" });
  });

  it("updates profile_id and calls logAudit with resolve action", async () => {
    mockAuthenticatedAdmin();
    const mockUpdate = vi.fn().mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      if (callIndex === 2) {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "rec-1",
                    profile_id: null,
                    area_id: "area-1",
                    status: "pending",
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return { update: mockUpdate };
    });

    const result = await resolveWorker("rec-1", "worker-1");

    expect(result).toEqual({ success: true, data: { id: "rec-1" } });
    expect(mockUpdate).toHaveBeenCalledWith({ profile_id: "worker-1" });
    expect(mockLogAudit).toHaveBeenCalledWith({
      actorId: "admin-1",
      tableName: "attendance_logs",
      recordId: "rec-1",
      action: "resolve",
      before: { profile_id: null },
      after: { profile_id: "worker-1" },
    });
  });
});

describe("resolveArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await resolveArea("rec-1", "area-1");

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("returns error when caller is not admin/owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role: "worker" }, error: null }),
        }),
      }),
    }));

    const result = await resolveArea("rec-1", "area-1");

    expect(result).toEqual({ success: false, error: "אין הרשאה" });
  });

  it("returns error when record is not found", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    });

    const result = await resolveArea("rec-nonexistent", "area-1");

    expect(result).toEqual({ success: false, error: "רשומה לא נמצאה" });
  });

  it("updates area_id and calls logAudit with resolve action", async () => {
    mockAuthenticatedAdmin();
    const mockUpdate = vi.fn().mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      if (callIndex === 2) {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "rec-1",
                    profile_id: "worker-1",
                    area_id: null,
                    status: "pending",
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return { update: mockUpdate };
    });

    const result = await resolveArea("rec-1", "area-1");

    expect(result).toEqual({ success: true, data: { id: "rec-1" } });
    expect(mockUpdate).toHaveBeenCalledWith({ area_id: "area-1" });
    expect(mockLogAudit).toHaveBeenCalledWith({
      actorId: "admin-1",
      tableName: "attendance_logs",
      recordId: "rec-1",
      action: "resolve",
      before: { area_id: null },
      after: { area_id: "area-1" },
    });
  });
});

describe("getActiveWorkers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await getActiveWorkers();

    expect(result).toEqual({ success: false, error: "לא מחובר" });
  });

  it("returns active workers with id and full_name", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    { id: "w-1", full_name: "עידן" },
                    { id: "w-2", full_name: "דני" },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      };
    });

    const result = await getActiveWorkers();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ id: "w-1", full_name: "עידן" });
    }
  });

  it("allows manager role to get active workers", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "manager-1" } },
    });
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockRoleCheck("manager");
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      };
    });

    const result = await getActiveWorkers();

    expect(result.success).toBe(true);
  });
});

describe("getActiveAreas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await getActiveAreas();

    expect(result).toEqual({ success: false, error: "לא מחובר" });
  });

  it("returns active areas with id and name", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return {
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  { id: "a-1", name: "תפוזים" },
                  { id: "a-2", name: "אבוקדו" },
                ],
                error: null,
              }),
          }),
        }),
      };
    });

    const result = await getActiveAreas();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ id: "a-1", name: "תפוזים" });
    }
  });

  it("allows manager role to get active areas", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "manager-1" } },
    });
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockRoleCheck("manager");
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };
    });

    const result = await getActiveAreas();

    expect(result.success).toBe(true);
  });
});

describe("createWorkerAndResolve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await createWorkerAndResolve("rec-1", {
      full_name: "חדש",
      language_pref: "he",
    });

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("creates worker profile, resolves record, and calls logAudit twice", async () => {
    mockAuthenticatedAdmin();

    // Mock supabase.from calls: role check, attendance_logs fetch, attendance_logs update
    let callIndex = 0;
    const mockUpdate = vi.fn().mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      if (callIndex === 2) {
        // Fetch attendance record before state
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "rec-1",
                    profile_id: null,
                    area_id: "area-1",
                    status: "pending",
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      // attendance_logs update
      return { update: mockUpdate };
    });

    // Mock admin client: createUser + profile insert
    mockAdminClient.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: "new-user-id" } },
      error: null,
    });
    mockAdminClient.from.mockReturnValue({
      insert: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: "new-user-id",
                full_name: "חדש",
                role: "worker",
                language_pref: "he",
                hourly_rate: null,
                is_active: true,
              },
              error: null,
            }),
        }),
      }),
    });

    const result = await createWorkerAndResolve("rec-1", {
      full_name: "חדש",
      language_pref: "he",
    });

    expect(result).toEqual({ success: true, data: { id: "rec-1" } });
    expect(mockAdminClient.auth.admin.createUser).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({ profile_id: "new-user-id" });
    expect(mockLogAudit).toHaveBeenCalledTimes(2);
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        tableName: "profiles",
        action: "create",
        recordId: "new-user-id",
      })
    );
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        tableName: "attendance_logs",
        action: "resolve",
        recordId: "rec-1",
      })
    );
  });

  it("returns validation error for invalid input", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return {};
    });

    const result = await createWorkerAndResolve("rec-1", {
      full_name: "",
      language_pref: "he",
    });

    expect(result.success).toBe(false);
  });
});

describe("approveRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await approveRecord("rec-1");

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("returns error when caller is not admin/owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role: "worker" }, error: null }),
        }),
      }),
    }));

    const result = await approveRecord("rec-1");

    expect(result).toEqual({ success: false, error: "אין הרשאה" });
  });

  it("returns error when profile_id is null", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: "rec-1",
                  profile_id: null,
                  area_id: "area-1",
                  status: "pending",
                  total_hours: 8,
                },
                error: null,
              }),
          }),
        }),
      };
    });

    const result = await approveRecord("rec-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("לא ניתן לאשר");
  });

  it("returns error when area_id is null", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: "rec-1",
                  profile_id: "worker-1",
                  area_id: null,
                  status: "pending",
                  total_hours: 8,
                },
                error: null,
              }),
          }),
        }),
      };
    });

    const result = await approveRecord("rec-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("לא ניתן לאשר");
  });

  it("approves fully-resolved record and calls logAudit with action: approve", async () => {
    mockAuthenticatedAdmin();
    const mockUpdate = vi.fn().mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      if (callIndex === 2) {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "rec-1",
                    profile_id: "worker-1",
                    area_id: "area-1",
                    status: "pending",
                    total_hours: 8,
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return { update: mockUpdate };
    });

    const result = await approveRecord("rec-1");

    expect(result).toEqual({ success: true, data: { id: "rec-1" } });
    expect(mockUpdate).toHaveBeenCalledWith({ status: "approved" });
    expect(mockLogAudit).toHaveBeenCalledWith({
      actorId: "admin-1",
      tableName: "attendance_logs",
      recordId: "rec-1",
      action: "approve",
      before: { status: "pending" },
      after: { status: "approved" },
    });
  });

  it("returns error when logAudit throws", async () => {
    mockAuthenticatedAdmin();
    mockLogAudit.mockRejectedValueOnce(new Error("DB error"));
    const mockUpdate = vi.fn().mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      if (callIndex === 2) {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "rec-1",
                    profile_id: "worker-1",
                    area_id: "area-1",
                    status: "pending",
                    total_hours: 8,
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return { update: mockUpdate };
    });

    const result = await approveRecord("rec-1");

    expect(result).toEqual({
      success: false,
      error: "הפעולה בוצעה אך תיעוד הביקורת נכשל",
    });
  });
});

describe("rejectRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await rejectRecord("rec-1");

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("updates status to rejected and calls logAudit with action: reject", async () => {
    mockAuthenticatedAdmin();
    const mockUpdate = vi.fn().mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      if (callIndex === 2) {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "rec-1",
                    profile_id: "worker-1",
                    area_id: "area-1",
                    status: "pending",
                    total_hours: 8,
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return { update: mockUpdate };
    });

    const result = await rejectRecord("rec-1");

    expect(result).toEqual({ success: true, data: { id: "rec-1" } });
    expect(mockUpdate).toHaveBeenCalledWith({ status: "rejected" });
    expect(mockLogAudit).toHaveBeenCalledWith({
      actorId: "admin-1",
      tableName: "attendance_logs",
      recordId: "rec-1",
      action: "reject",
      before: { status: "pending" },
      after: { status: "rejected" },
    });
  });
});

describe("editRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await editRecord("rec-1", { total_hours: 9 });

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("returns error when no fields provided", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return {};
    });

    const result = await editRecord("rec-1", {});

    expect(result).toEqual({ success: false, error: "אין שדות לעדכון" });
  });

  it("updates total_hours and calls logAudit with before/after diff", async () => {
    mockAuthenticatedAdmin();
    const mockUpdate = vi.fn().mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      if (callIndex === 2) {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "rec-1",
                    total_hours: 8,
                    area_id: "area-1",
                    status: "pending",
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return { update: mockUpdate };
    });

    const result = await editRecord("rec-1", { total_hours: 10 });

    expect(result).toEqual({ success: true, data: { id: "rec-1" } });
    expect(mockUpdate).toHaveBeenCalledWith({ total_hours: 10 });
    expect(mockLogAudit).toHaveBeenCalledWith({
      actorId: "admin-1",
      tableName: "attendance_logs",
      recordId: "rec-1",
      action: "edit",
      before: { total_hours: 8 },
      after: { total_hours: 10 },
    });
  });

  it("updates area_id and calls logAudit with action: edit", async () => {
    mockAuthenticatedAdmin();
    const mockUpdate = vi.fn().mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      if (callIndex === 2) {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "rec-1",
                    total_hours: 8,
                    area_id: "area-1",
                    status: "pending",
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return { update: mockUpdate };
    });

    const result = await editRecord("rec-1", { area_id: "area-2" });

    expect(result).toEqual({ success: true, data: { id: "rec-1" } });
    expect(mockUpdate).toHaveBeenCalledWith({ area_id: "area-2" });
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "edit",
        before: { area_id: "area-1" },
        after: { area_id: "area-2" },
      })
    );
  });

  it("returns error when logAudit throws", async () => {
    mockAuthenticatedAdmin();
    mockLogAudit.mockRejectedValueOnce(new Error("DB error"));
    const mockUpdate = vi.fn().mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      if (callIndex === 2) {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "rec-1",
                    total_hours: 8,
                    area_id: "area-1",
                    status: "pending",
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return { update: mockUpdate };
    });

    const result = await editRecord("rec-1", { total_hours: 9 });

    expect(result).toEqual({
      success: false,
      error: "הפעולה בוצעה אך תיעוד הביקורת נכשל",
    });
  });
});

describe("getDailyAttendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Fluent query builder for attendance_logs queries.
  // select→in→(eq|gte+lte)→(eq)?→(eq)?→order→order
  // First order() returns builder; second order() resolves the Promise.
  function makeAttendanceQueryBuilder(result: {
    data: unknown[] | null;
    error: { message: string } | null;
  }) {
    let orderCallCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => {
        orderCallCount++;
        return orderCallCount >= 2 ? Promise.resolve(result) : builder;
      }),
    };
    return builder;
  }

  it("returns error when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await getDailyAttendance();

    expect(result).toEqual({ success: false, error: "לא מחובר" });
  });

  it("returns error when caller is worker role", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabase.from.mockImplementation(() => mockRoleCheck("worker"));

    const result = await getDailyAttendance();

    expect(result).toEqual({ success: false, error: "אין הרשאות צפייה" });
  });

  it("returns records when caller is manager", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockRoleCheck("manager");
      return makeAttendanceQueryBuilder({
        data: [
          {
            id: "rec-1",
            work_date: "2026-03-11",
            total_hours: 8.5,
            status: "approved",
            source: "bot",
            profiles: { full_name: "עידן" },
            areas: { name: "תפוזים" },
          },
        ],
        error: null,
      });
    });

    const result = await getDailyAttendance();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].worker_name).toBe("עידן");
      expect(result.data[0].area_name).toBe("תפוזים");
      expect(result.data[0].total_hours).toBe(8.5);
      expect(result.data[0].status).toBe("approved");
    }
  });

  it("returns only approved/imported records (not pending/rejected)", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    let capturedBuilder: ReturnType<typeof makeAttendanceQueryBuilder>;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockRoleCheck("owner");
      capturedBuilder = makeAttendanceQueryBuilder({
        data: [
          {
            id: "rec-1",
            work_date: "2026-03-11",
            total_hours: 8,
            status: "approved",
            source: "bot",
            profiles: { full_name: "עידן" },
            areas: { name: "תפוזים" },
          },
        ],
        error: null,
      });
      return capturedBuilder;
    });

    const result = await getDailyAttendance();

    expect(result.success).toBe(true);
    expect(capturedBuilder!.in).toHaveBeenCalledWith("status", [
      "approved",
      "imported",
    ]);
  });

  it("returns records for today by default", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    let capturedBuilder: ReturnType<typeof makeAttendanceQueryBuilder>;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockRoleCheck("admin");
      capturedBuilder = makeAttendanceQueryBuilder({ data: [], error: null });
      return capturedBuilder;
    });

    await getDailyAttendance();

    expect(capturedBuilder!.eq).toHaveBeenCalledWith(
      "work_date",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    );
  });

  it("accepts fromDate/toDate params (same date uses eq)", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    let capturedBuilder: ReturnType<typeof makeAttendanceQueryBuilder>;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockRoleCheck("admin");
      capturedBuilder = makeAttendanceQueryBuilder({ data: [], error: null });
      return capturedBuilder;
    });

    await getDailyAttendance({ fromDate: "2026-01-15", toDate: "2026-01-15" });

    expect(capturedBuilder!.eq).toHaveBeenCalledWith("work_date", "2026-01-15");
  });

  it("returns error when Supabase query fails", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockRoleCheck("owner");
      return makeAttendanceQueryBuilder({
        data: null,
        error: { message: "connection error" },
      });
    });

    const result = await getDailyAttendance();

    expect(result).toEqual({ success: false, error: "connection error" });
  });

  it("handles null area_name in records", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockRoleCheck("owner");
      return makeAttendanceQueryBuilder({
        data: [
          {
            id: "rec-1",
            work_date: "2026-03-11",
            total_hours: 6,
            status: "approved",
            source: "bot",
            profiles: { full_name: "עידן" },
            areas: null,
          },
        ],
        error: null,
      });
    });

    const result = await getDailyAttendance();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].area_name).toBeNull();
      expect(result.data[0].worker_name).toBe("עידן");
    }
  });

  it("returns empty array when no records exist for the day", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockRoleCheck("admin");
      return makeAttendanceQueryBuilder({ data: [], error: null });
    });

    const result = await getDailyAttendance();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  // --- Task 7 new tests: filter params ---

  it("7.1 same fromDate/toDate range uses eq (single-date behaviour)", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    let capturedBuilder: ReturnType<typeof makeAttendanceQueryBuilder>;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockRoleCheck("admin");
      capturedBuilder = makeAttendanceQueryBuilder({ data: [], error: null });
      return capturedBuilder;
    });

    await getDailyAttendance({
      fromDate: "2026-01-07",
      toDate: "2026-01-07",
    });

    expect(capturedBuilder!.eq).toHaveBeenCalledWith("work_date", "2026-01-07");
    expect(capturedBuilder!.gte).not.toHaveBeenCalled();
  });

  it("7.2 date range uses gte/lte", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    let capturedBuilder: ReturnType<typeof makeAttendanceQueryBuilder>;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockRoleCheck("admin");
      capturedBuilder = makeAttendanceQueryBuilder({ data: [], error: null });
      return capturedBuilder;
    });

    await getDailyAttendance({
      fromDate: "2026-01-01",
      toDate: "2026-01-07",
    });

    expect(capturedBuilder!.gte).toHaveBeenCalledWith("work_date", "2026-01-01");
    expect(capturedBuilder!.lte).toHaveBeenCalledWith("work_date", "2026-01-07");
    expect(capturedBuilder!.eq).not.toHaveBeenCalledWith(
      "work_date",
      expect.anything()
    );
  });

  it("7.3 workerId param adds eq profile_id filter", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    let capturedBuilder: ReturnType<typeof makeAttendanceQueryBuilder>;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockRoleCheck("admin");
      capturedBuilder = makeAttendanceQueryBuilder({ data: [], error: null });
      return capturedBuilder;
    });

    await getDailyAttendance({ workerId: "worker-uuid-123" });

    expect(capturedBuilder!.eq).toHaveBeenCalledWith(
      "profile_id",
      "worker-uuid-123"
    );
  });

  it("7.4 areaId param adds eq area_id filter", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    let capturedBuilder: ReturnType<typeof makeAttendanceQueryBuilder>;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockRoleCheck("admin");
      capturedBuilder = makeAttendanceQueryBuilder({ data: [], error: null });
      return capturedBuilder;
    });

    await getDailyAttendance({ areaId: "area-uuid-456" });

    expect(capturedBuilder!.eq).toHaveBeenCalledWith("area_id", "area-uuid-456");
  });

  it("7.5 invalid fromDate returns תאריך לא תקין error", async () => {
    mockAuthenticatedAdmin();
    mockSupabase.from.mockImplementation(() => mockRoleCheck("admin"));

    const result = await getDailyAttendance({ fromDate: "not-a-date" });

    expect(result).toEqual({ success: false, error: "תאריך לא תקין" });
  });

  it("7.6 date range > 31 days returns range cap error", async () => {
    mockAuthenticatedAdmin();
    mockSupabase.from.mockImplementation(() => mockRoleCheck("admin"));

    const result = await getDailyAttendance({
      fromDate: "2026-01-01",
      toDate: "2026-03-15",
    });

    expect(result).toEqual({
      success: false,
      error: "טווח תאריכים לא יכול לעלות על 31 יום",
    });
  });

  it("7.7 inverted date range (fromDate > toDate) returns validation error", async () => {
    mockAuthenticatedAdmin();
    mockSupabase.from.mockImplementation(() => mockRoleCheck("admin"));

    const result = await getDailyAttendance({
      fromDate: "2026-01-07",
      toDate: "2026-01-01",
    });

    expect(result).toEqual({
      success: false,
      error: "תאריך התחלה לא יכול להיות אחרי תאריך הסיום",
    });
  });
});

describe("verifyDashboardCaller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows owner role", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabase.from.mockImplementation(() => mockRoleCheck("owner"));

    const result = await verifyDashboardCaller(mockSupabase as never);

    expect(result.user).not.toBeNull();
    expect(result.error).toBeNull();
  });

  it("allows admin role", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabase.from.mockImplementation(() => mockRoleCheck("admin"));

    const result = await verifyDashboardCaller(mockSupabase as never);

    expect(result.user).not.toBeNull();
    expect(result.error).toBeNull();
  });

  it("allows manager role", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabase.from.mockImplementation(() => mockRoleCheck("manager"));

    const result = await verifyDashboardCaller(mockSupabase as never);

    expect(result.user).not.toBeNull();
    expect(result.error).toBeNull();
  });

  it("denies worker role", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabase.from.mockImplementation(() => mockRoleCheck("worker"));

    const result = await verifyDashboardCaller(mockSupabase as never);

    expect(result.user).toBeNull();
    expect(result.error).toBe("אין הרשאות צפייה");
  });
});

describe("getAnomalies", () => {
  // Fluent query builder that is also thenable (awaitable via Promise.all).
  // All chain methods return `this`; awaiting the builder resolves `result`.
  function makeAnomalyBuilder(result: { data: unknown[] | null; error: { message: string } | null }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (
        resolve: (v: typeof result) => unknown,
        reject?: (e: unknown) => unknown
      ) => Promise.resolve(result).then(resolve, reject),
    };
    return builder;
  }

  function setupAnomalyMocks(
    excessResult: { data: unknown[] | null; error: { message: string } | null },
    staleResult: { data: unknown[] | null; error: { message: string } | null },
    callerRole = "admin"
  ) {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const excessBuilder = makeAnomalyBuilder(excessResult);
    const staleBuilder = makeAnomalyBuilder(staleResult);
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockRoleCheck(callerRole);
      if (callIndex === 2) return excessBuilder;
      return staleBuilder;
    });

    return { excessBuilder, staleBuilder };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("5.1 — no matching records → returns empty arrays", async () => {
    setupAnomalyMocks({ data: [], error: null }, { data: [], error: null });

    const result = await getAnomalies();

    expect(result).toEqual({
      success: true,
      data: { excessiveHours: [], stalePending: [] },
    });
  });

  it("5.2 — approved record with total_hours=13 → returned in excessiveHours", async () => {
    const row = {
      id: "rec-1",
      work_date: "2026-03-11",
      total_hours: 13,
      profiles: { full_name: "Ali" },
      areas: { name: "North Field" },
    };
    setupAnomalyMocks({ data: [row], error: null }, { data: [], error: null });

    const result = await getAnomalies();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.excessiveHours).toHaveLength(1);
    expect(result.data.excessiveHours[0]).toMatchObject({
      id: "rec-1",
      worker_name: "Ali",
      area_name: "North Field",
      work_date: "2026-03-11",
      total_hours: 13,
    });
    expect(result.data.stalePending).toHaveLength(0);
  });

  it("5.3 — threshold is strictly gt(12), not gte", async () => {
    const { excessBuilder } = setupAnomalyMocks(
      { data: [], error: null },
      { data: [], error: null }
    );
    await getAnomalies();
    // Must use .gt(), not .gte() — threshold is exclusive (> 12)
    expect(excessBuilder.gt).toHaveBeenCalledWith("total_hours", 12);
  });

  it("5.4 — pending record with null profile/area → returned in stalePending with null names", async () => {
    const row = {
      id: "rec-2",
      work_date: "2026-03-10",
      total_hours: null,
      profiles: null,
      areas: null,
    };
    setupAnomalyMocks({ data: [], error: null }, { data: [row], error: null });

    const result = await getAnomalies();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.stalePending).toHaveLength(1);
    expect(result.data.stalePending[0]).toMatchObject({
      id: "rec-2",
      worker_name: null,
      area_name: null,
      work_date: "2026-03-10",
      total_hours: null,
    });
  });

  it("5.5 — stale query uses .lt(created_at, iso-threshold)", async () => {
    const { staleBuilder } = setupAnomalyMocks(
      { data: [], error: null },
      { data: [], error: null }
    );
    await getAnomalies();
    // Must use .lt() (strictly less than), with an ISO datetime string
    expect(staleBuilder.lt).toHaveBeenCalledWith(
      "created_at",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
    );
  });

  it("5.6 — date range → excess query uses gte/lte (not eq)", async () => {
    const { excessBuilder } = setupAnomalyMocks(
      { data: [], error: null },
      { data: [], error: null }
    );
    await getAnomalies({ fromDate: "2026-01-01", toDate: "2026-01-07" });
    expect(excessBuilder.gte).toHaveBeenCalledWith("work_date", "2026-01-01");
    expect(excessBuilder.lte).toHaveBeenCalledWith("work_date", "2026-01-07");
    expect(excessBuilder.eq).not.toHaveBeenCalledWith("work_date", expect.anything());
  });

  it("5.7 — single day → excess query uses .eq (not gte/lte)", async () => {
    const { excessBuilder } = setupAnomalyMocks(
      { data: [], error: null },
      { data: [], error: null }
    );
    await getAnomalies({ fromDate: "2026-01-01", toDate: "2026-01-01" });
    expect(excessBuilder.eq).toHaveBeenCalledWith("work_date", "2026-01-01");
    expect(excessBuilder.gte).not.toHaveBeenCalled();
    expect(excessBuilder.lte).not.toHaveBeenCalled();
  });

  it("5.8 — invalid date → returns validation error", async () => {
    // Auth mock not needed — validation happens before DB call
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabase.from.mockImplementation(() => mockRoleCheck("admin"));

    const result = await getAnomalies({ fromDate: "bad-date" });

    expect(result).toEqual({ success: false, error: "תאריך לא תקין" });
  });

  it("5.9 — manager role caller → succeeds (not blocked by verifyDashboardCaller)", async () => {
    setupAnomalyMocks({ data: [], error: null }, { data: [], error: null }, "manager");

    const result = await getAnomalies();

    expect(result.success).toBe(true);
  });

  it("5.10 — stale threshold is approximately Date.now() - 24h", async () => {
    const { staleBuilder } = setupAnomalyMocks(
      { data: [], error: null },
      { data: [], error: null }
    );
    const before = Date.now();
    await getAnomalies();
    const after = Date.now();

    expect(staleBuilder.lt).toHaveBeenCalledOnce();
    const [field, isoValue] = staleBuilder.lt.mock.calls[0] as [string, string];
    expect(field).toBe("created_at");
    const usedThreshold = new Date(isoValue).getTime();
    const expectedThreshold = before - 24 * 60 * 60 * 1000;
    // Allow ±5 seconds tolerance
    expect(usedThreshold).toBeGreaterThanOrEqual(expectedThreshold - 5000);
    expect(usedThreshold).toBeLessThanOrEqual(after - 24 * 60 * 60 * 1000 + 5000);
  });

  it("5.11 — excess query error → returns { success: false, error }", async () => {
    setupAnomalyMocks(
      { data: null, error: { message: "db error on excess" } },
      { data: [], error: null }
    );

    const result = await getAnomalies();

    expect(result).toEqual({ success: false, error: "db error on excess" });
  });

  it("5.12 — stale query error → returns { success: false, error }", async () => {
    setupAnomalyMocks(
      { data: [], error: null },
      { data: null, error: { message: "db error on stale" } }
    );

    const result = await getAnomalies();

    expect(result).toEqual({ success: false, error: "db error on stale" });
  });

  it("5.13 — inverted date range → returns validation error", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabase.from.mockImplementation(() => mockRoleCheck("admin"));

    const result = await getAnomalies({ fromDate: "2026-03-11", toDate: "2026-01-01" });

    expect(result).toEqual({
      success: false,
      error: "תאריך התחלה לא יכול להיות אחרי תאריך הסיום",
    });
  });
});
