import { supabase } from "@/integrations/supabase/client";

export type AuditAction = 
  | 'view_all_profiles'
  | 'view_all_dreams'
  | 'view_all_dream_shares'
  | 'view_all_professional_comments'
  | 'view_user_profile'
  | 'view_user_dreams'
  | 'admin_action'
  | 'super_admin_access';

export type AuditTableName = 
  | 'profiles'
  | 'dreams'
  | 'dream_shares'
  | 'professional_comments'
  | 'professional_profiles'
  | 'user_roles';

interface AuditLogParams {
  action: AuditAction;
  tableName: AuditTableName;
  recordId?: string;
  targetUserId?: string;
  details?: Record<string, unknown>;
}

/**
 * Logs an audit event to track sensitive data access
 * Primarily used for super admin and admin access to user data
 */
export async function logAuditEvent({
  action,
  tableName,
  recordId,
  targetUserId,
  details
}: AuditLogParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_audit_event', {
      p_action: action,
      p_table_name: tableName,
      p_record_id: recordId || null,
      p_target_user_id: targetUserId || null,
      p_details: details ? JSON.stringify(details) : null
    });

    if (error) {
      console.error('Failed to log audit event:', error);
      return null;
    }

    return data as string;
  } catch (err) {
    console.error('Audit logging error:', err);
    return null;
  }
}

/**
 * Hook-friendly wrapper for logging super admin access
 */
export async function logSuperAdminAccess(
  tableName: AuditTableName,
  action: string,
  targetUserId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    action: 'super_admin_access',
    tableName,
    targetUserId,
    details: {
      specificAction: action,
      ...details
    }
  });
}
