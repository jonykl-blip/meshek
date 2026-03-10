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
} = await import("./attendance");

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

  it("passes through HTTP voice_ref_url without generating signed URL", async () => {
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
                        "https://supabase.storage.com/already-signed-url",
                      raw_transcript: "test http passthrough",
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

    const result = await getPendingRecords();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].voice_signed_url).toBe(
        "https://supabase.storage.com/already-signed-url"
      );
    }
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
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

    expect(result).toEqual({ success: false, error: "לא מאומת" });
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
});

describe("getActiveAreas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await getActiveAreas();

    expect(result).toEqual({ success: false, error: "לא מאומת" });
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
