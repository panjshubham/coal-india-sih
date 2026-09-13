import { supabase } from '../supabase';

/**
 * Computes a SHA-256 cryptographic hash of the input payload using Web Crypto API.
 */
export async function computeHash(data: any): Promise<string> {
  const encoder = new TextEncoder();
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataString));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Appends a tamper-evident, cryptographically linked record to the audit_ledger table.
 */
export async function logAuditEvent({
  tableName,
  recordId,
  action,
  userId,
  payload,
}: {
  tableName: string;
  recordId: number;
  action: string;
  userId?: string | null;
  payload?: any;
}) {
  try {
    // 1. Fetch the hash of the preceding block to construct the hash chain
    const { data: lastAudit } = await supabase
      .from('audit_ledger')
      .select('data_hash')
      .eq('table_name', tableName)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevHash = lastAudit?.data_hash || 'GENESIS_0x0000000000000000';

    // 2. Compute the cryptographic hash for the new transaction block
    const newHash = await computeHash({
      tableName,
      recordId,
      action,
      userId: userId || 'system',
      prevHash,
      payload: payload || {},
      timestamp: new Date().toISOString()
    });

    // 3. Append to the immutable audit_ledger
    const { data, error } = await supabase.from('audit_ledger').insert({
      table_name: tableName,
      record_id: recordId,
      action,
      user_id: userId || null,
      data_hash: newHash,
      prev_hash: prevHash,
      new_values: payload ? payload : null
    }).select().single();

    if (error) {
      console.warn('[auditLedger] Notice:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('[auditLedger] Exception during audit append:', err);
    return null;
  }
}
