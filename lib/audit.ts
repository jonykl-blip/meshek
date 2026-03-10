import { createClient } from "@/lib/supabase/server";

export type AuditAction =
  | "approve"
  | "edit"
  | "reject"
  | "resolve"
  | "assign"
  | "reassign"
  | "create"
  | "archive";

export interface LogAuditParams {
  actorId: string;
  tableName: string;
  recordId: string;
  action: AuditAction;
  before: unknown;
  after: unknown;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("audit_log").insert({
    actor_id: params.actorId,
    table_name: params.tableName,
    record_id: params.recordId,
    action: params.action,
    before_json: params.before,
    after_json: params.after,
  });

  if (error) {
    console.error("[logAudit] Failed to write audit log:", error);
    throw new Error(`Audit log write failed: ${error.message}`);
  }
}
