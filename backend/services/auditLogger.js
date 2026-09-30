/**
 * Dasari Darbar Audit Logging Service
 * Records audit logs into admin_audit_logs (Supabase + local store fallback).
 * Never logs passwords or sensitive credentials.
 */

import crypto from 'crypto';
import { supabase, readLocalStore, writeLocalStore } from './supabaseClient.js';

export async function logAuditEvent({
  actionType,
  actorId = 'system',
  targetRecordType = null,
  targetRecordId = null,
  details = {},
  ipAddress = null
}) {
  const logEntry = {
    id: crypto.randomUUID(),
    action_type: actionType,
    actor_id: String(actorId),
    target_record_type: targetRecordType,
    target_record_id: targetRecordId ? String(targetRecordId) : null,
    details: details || {},
    ip_address: ipAddress || '127.0.0.1',
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      await supabase.from('admin_audit_logs').insert([logEntry]);
    } catch (e) {
      console.warn('Supabase admin_audit_logs fallback to local store:', e.message);
    }
  }

  const store = readLocalStore();
  store.admin_audit_logs.push(logEntry);
  writeLocalStore(store);

  return logEntry;
}
