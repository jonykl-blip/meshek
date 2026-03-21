import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const {
  getClients,
  getAllClients,
  createClientAction,
  updateClient,
  archiveClient,
  addClientAlias,
  removeClientAlias,
  resolveClient,
} = await import("./clients");

function setupMockChain(results: { data: unknown; error: unknown }[]) {
  let callIndex = 0;
  mockSupabase.from.mockImplementation(() => {
    const result = results[callIndex] ?? { data: null, error: null };
    callIndex++;
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      insert: () => builder,
      update: () => builder,
      delete: () => builder,
      order: () => builder,
      single: () => Promise.resolve(result),
      maybeSingle: () => Promise.resolve(result),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject),
    };
    return builder;
  });
}

function mockAuthenticatedAdmin() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "admin-1" } },
  });
}

describe("getClients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active clients with aliases", async () => {
    const clients = [
      {
        id: "c1",
        name: "משק פילצביץ׳",
        name_en: "Piltzavitch Farm",
        is_own_farm: true,
        phone: null,
        notes: null,
        rate_per_dunam: null,
        rate_per_hour: null,
        is_active: true,
        created_at: "2026-01-01",
        client_aliases: [{ id: "a1", alias: "המשק" }],
      },
      {
        id: "c2",
        name: "לקוח חיצוני",
        name_en: null,
        is_own_farm: false,
        phone: "050-1234567",
        notes: null,
        rate_per_dunam: 50,
        rate_per_hour: null,
        is_active: true,
        created_at: "2026-02-01",
        client_aliases: [],
      },
    ];

    setupMockChain([{ data: clients, error: null }]);

    const result = await getClients();

    expect(result).toEqual(clients);
    expect(mockSupabase.from).toHaveBeenCalledWith("clients");
  });
});

describe("getAllClients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all clients including inactive", async () => {
    const clients = [
      {
        id: "c1",
        name: "משק פילצביץ׳",
        name_en: null,
        is_own_farm: true,
        phone: null,
        notes: null,
        rate_per_dunam: null,
        rate_per_hour: null,
        is_active: true,
        created_at: "2026-01-01",
        client_aliases: [],
      },
      {
        id: "c3",
        name: "לקוח ישן",
        name_en: null,
        is_own_farm: false,
        phone: null,
        notes: null,
        rate_per_dunam: null,
        rate_per_hour: null,
        is_active: false,
        created_at: "2026-01-15",
        client_aliases: [],
      },
    ];

    setupMockChain([{ data: clients, error: null }]);

    const result = await getAllClients();

    expect(result).toEqual(clients);
    expect(mockSupabase.from).toHaveBeenCalledWith("clients");
  });
});

describe("createClientAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates client with audit log", async () => {
    const newClient = {
      id: "c-new",
      name: "לקוח חדש",
      name_en: null,
      is_own_farm: false,
      phone: null,
      notes: null,
      rate_per_dunam: null,
      rate_per_hour: null,
      is_active: true,
      created_at: "2026-03-21",
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: newClient, error: null },
    ]);

    const result = await createClientAction({ name: "לקוח חדש" });

    expect(result).toEqual({
      success: true,
      data: { ...newClient, client_aliases: [] },
    });
  });

  it("returns error for unauthenticated user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await createClientAction({ name: "לקוח חדש" });

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("returns validation error for empty name", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([{ data: { role: "admin" }, error: null }]);

    const result = await createClientAction({ name: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("שם הלקוח");
    }
  });
});

describe("updateClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates client with audit log", async () => {
    const beforeClient = {
      id: "c2",
      name: "לקוח ישן",
      name_en: null,
      is_own_farm: false,
      phone: null,
      notes: null,
      rate_per_dunam: null,
      rate_per_hour: null,
      is_active: true,
    };
    const updatedRow = {
      ...beforeClient,
      name: "לקוח מעודכן",
      created_at: "2026-02-01",
    };
    const fullClient = {
      ...updatedRow,
      client_aliases: [{ id: "a1", alias: "כינוי" }],
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: beforeClient, error: null },
      { data: updatedRow, error: null },
      { data: [fullClient], error: null },
    ]);

    const result = await updateClient("c2", { name: "לקוח מעודכן" });

    expect(result).toEqual({ success: true, data: fullClient });
  });

  it("blocks editing own-farm client (is_own_farm=true)", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      {
        data: {
          id: "00000000-0000-4000-a000-000000000001",
          name: "משק פילצביץ׳",
          is_own_farm: true,
          is_active: true,
        },
        error: null,
      },
    ]);

    const result = await updateClient("00000000-0000-4000-a000-000000000001", {
      name: "שם חדש",
    });

    expect(result).toEqual({
      success: false,
      error: "לא ניתן לערוך את לקוח המשק",
    });
  });

  it("returns error when client not found", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: null, error: null },
    ]);

    const result = await updateClient("missing-id", { name: "test" });

    expect(result).toEqual({ success: false, error: "לקוח לא נמצא" });
  });
});

describe("archiveClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("archives client with audit log", async () => {
    const beforeClient = {
      id: "c2",
      name: "לקוח לגניזה",
      is_own_farm: false,
      is_active: true,
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: beforeClient, error: null },
      { data: null, error: null },
    ]);

    const result = await archiveClient("c2");

    expect(result).toEqual({ success: true, data: { id: "c2" } });
  });

  it("blocks archiving own-farm client", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      {
        data: {
          id: "00000000-0000-4000-a000-000000000001",
          name: "משק פילצביץ׳",
          is_own_farm: true,
          is_active: true,
        },
        error: null,
      },
    ]);

    const result = await archiveClient("00000000-0000-4000-a000-000000000001");

    expect(result).toEqual({
      success: false,
      error: "לא ניתן למחוק את לקוח המשק",
    });
  });

  it("returns error if already archived", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      {
        data: {
          id: "c2",
          name: "לקוח ישן",
          is_own_farm: false,
          is_active: false,
        },
        error: null,
      },
    ]);

    const result = await archiveClient("c2");

    expect(result).toEqual({ success: false, error: "הלקוח כבר גונז" });
  });
});

describe("addClientAlias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds alias with audit log", async () => {
    const newAlias = { id: "ca-1", client_id: "c2", alias: "הלקוח הגדול" };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: newAlias, error: null },
    ]);

    const result = await addClientAlias("c2", "הלקוח הגדול");

    expect(result).toEqual({ success: true, data: newAlias });
  });

  it("returns validation error for empty alias", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([{ data: { role: "admin" }, error: null }]);

    const result = await addClientAlias("c2", "");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("כינוי");
    }
  });
});

describe("removeClientAlias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes alias with audit log", async () => {
    const beforeAlias = { id: "ca-1", client_id: "c2", alias: "הלקוח הגדול" };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: beforeAlias, error: null },
      { data: null, error: null },
    ]);

    const result = await removeClientAlias("ca-1");

    expect(result).toEqual({ success: true, data: { id: "ca-1" } });
  });

  it("returns error when alias not found", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: null, error: null },
    ]);

    const result = await removeClientAlias("missing-id");

    expect(result).toEqual({ success: false, error: "כינוי לא נמצא" });
  });
});

describe("resolveClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears pending_client_name with audit log", async () => {
    const beforeLog = {
      id: "log-1",
      pending_client_name: "לקוח לא מזוהה",
      area_id: null,
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: beforeLog, error: null },
      { data: null, error: null },
    ]);

    const result = await resolveClient("log-1", "c2");

    expect(result).toEqual({ success: true, data: { id: "log-1" } });
  });

  it("returns error when record not found", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: null, error: null },
    ]);

    const result = await resolveClient("missing-id", "c2");

    expect(result).toEqual({ success: false, error: "רשומה לא נמצאה" });
  });
});
