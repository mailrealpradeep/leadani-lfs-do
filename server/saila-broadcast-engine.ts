// Saila Broadcast engine — runs a single broadcast end-to-end in the background.
//
// Per recipient, mirrors the per-lead "Send WhatsApp" bookkeeping
// (server/routes.ts:7984+) so audit trails stay uniform:
//   - whatsapp_message_logs row with origin='human' AND broadcast_id=<id>
//   - lead_updates row with update_via='whatsapp_outgoing' (when lead_id known)
//   - pauseActiveSessionsForLead() for 24h on success (when lead_id known)
//
// Throttled at ~5 messages/sec to stay well under Wauper / Meta tier limits.

import crypto from "crypto";
import { storage } from "./storage";
import { sendWhatsAppMessage, sendWhatsAppApprovedTemplate } from "./saila-engine";
import type {
  SailaBroadcast,
  SailaPhoneSetting,
  SailaConfig,
} from "@shared/schema";
import {
  resolveBroadcastRecipients,
  incrementBroadcastCounters,
  updateBroadcast,
  throttleDelayMs,
  claimBroadcastForRun,
} from "./saila-broadcast-storage";

const RATE_PER_SEC = 5;

// In-process guard — avoid double-running the same broadcast from this Node
// instance. Crash recovery handles cross-process cases.
const RUNNING = new Set<string>();

export function isBroadcastRunning(id: string): boolean {
  return RUNNING.has(id);
}

/**
 * Fire-and-forget runner. Caller (the route) creates the broadcast row, then
 * invokes this — the function returns immediately while sends continue in
 * the background.
 */
export function startBroadcastRun(broadcastId: string): void {
  if (RUNNING.has(broadcastId)) return;
  RUNNING.add(broadcastId);
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  runBroadcast(broadcastId).finally(() => RUNNING.delete(broadcastId));
}

async function runBroadcast(broadcastId: string): Promise<void> {
  // Atomic compare-and-set: only the caller that actually transitions
  // pending -> running gets to send. Survives duplicate POST /send hits
  // and multi-process runners.
  const broadcast = await claimBroadcastForRun(broadcastId);
  if (!broadcast) {
    console.warn(`[Broadcast ${broadcastId}] Not claimable (already running/completed/missing) — bailing`);
    return;
  }

  try {
    // Re-resolve recipients server-side at run time. This is the same set
    // that was previewed (within seconds), but we don't trust the client's
    // snapshot.
    const resolved = await resolveBroadcastRecipients(
      broadcast.company_id,
      broadcast.send_from_phone,
      broadcast.cooldown_hours ?? null,
    );

    if (resolved.recipients.length === 0) {
      await updateBroadcast(broadcastId, {
        status: 'completed',
        completed_at: new Date(),
        total_recipients: 0,
        suppressed_count: resolved.suppressedCount,
      });
      console.log(`[Broadcast ${broadcastId}] No recipients — completed empty`);
      return;
    }

    // Refresh totals with the actual run-time count (preview may have drifted).
    await updateBroadcast(broadcastId, {
      total_recipients: resolved.recipients.length,
      suppressed_count: resolved.suppressedCount,
    });

    const phoneSetting = await storage.getSailaPhoneSettingByNumber(
      broadcast.company_id,
      broadcast.send_from_phone,
    );
    if (!phoneSetting || !phoneSetting.access_token || !phoneSetting.waba_phone_number_id) {
      await updateBroadcast(broadcastId, {
        status: 'failed',
        error_message: 'Sender number is not connected to WhatsApp Business',
        completed_at: new Date(),
      });
      console.error(`[Broadcast ${broadcastId}] Sender ${broadcast.send_from_phone} not connected`);
      return;
    }

    const sailaConfig = await storage.getSailaConfig(broadcast.company_id);
    const config: SailaConfig = sailaConfig ?? ({
      company_id: broadcast.company_id,
      wauper_domain: "https://crmapi.wauper.com",
      wauper_api_version: "v1",
    } as SailaConfig);

    const isApproved = broadcast.message_type === 'template';
    const startedAt = Date.now();

    for (let i = 0; i < resolved.recipients.length; i++) {
      const wait = throttleDelayMs({
        index: i,
        ratePerSec: RATE_PER_SEC,
        startedAt,
        now: Date.now(),
      });
      if (wait > 0) await sleep(wait);

      const recipient = resolved.recipients[i];
      try {
        await sendOne(broadcast, phoneSetting, config, recipient.recipient_phone, recipient.lead_id, isApproved);
      } catch (sendErr: any) {
        console.error(`[Broadcast ${broadcastId}] Recipient ${recipient.recipient_phone} unhandled error:`, sendErr?.message || sendErr);
        await incrementBroadcastCounters(broadcastId, { failed: 1 });
      }
    }

    await updateBroadcast(broadcastId, { status: 'completed', completed_at: new Date() });
    console.log(`[Broadcast ${broadcastId}] Completed`);
  } catch (err: any) {
    console.error(`[Broadcast ${broadcastId}] Fatal:`, err?.message || err);
    await updateBroadcast(broadcastId, {
      status: 'failed',
      error_message: err?.message || String(err),
      completed_at: new Date(),
    });
  }
}

async function sendOne(
  broadcast: SailaBroadcast,
  phoneSetting: SailaPhoneSetting,
  config: SailaConfig,
  recipientLast10: string,
  leadId: string | null,
  isApproved: boolean,
): Promise<void> {
  const recipientPhone = recipientLast10; // Wauper accepts last10; cleanPhone strips non-digits
  let sendResult: { success: boolean; messageId?: string; error?: string };
  let renderedText: string;

  if (isApproved) {
    const tplName = String(broadcast.approved_template_name || "").trim();
    const tplLang = String(broadcast.approved_template_language || "en_US").trim() || "en_US";
    const vars = Array.isArray(broadcast.approved_template_variables)
      ? broadcast.approved_template_variables
      : [];
    sendResult = await sendWhatsAppApprovedTemplate(config, phoneSetting, recipientPhone, tplName, tplLang, vars);
    const varsPart = vars.length > 0 ? ` [${vars.join(" | ")}]` : "";
    renderedText = `[Broadcast Approved Template: ${tplName} (${tplLang})]${varsPart}`;
  } else {
    const text = String(broadcast.message_text || "").trim();
    if (!text) {
      await incrementBroadcastCounters(broadcast.id, { failed: 1 });
      return;
    }
    renderedText = text;
    sendResult = await sendWhatsAppMessage(config, phoneSetting, recipientPhone, text);
  }

  // Always log the attempt (sent or failed) — same pattern as per-lead send.
  // If the log write itself fails we DEMOTE the recipient to 'failed' so
  // future cooldown windows are accurate (no orphaned-but-counted-as-sent rows).
  const logId = crypto.randomUUID();
  const log = {
    company_id: broadcast.company_id,
    webhook_request_id: null,
    direction: 'outgoing',
    lead_id: leadId,
    sent_by_user_id: broadcast.sent_by_user_id ?? null,
    sender_phone: recipientLast10,
    sender_name: null,
    sender_wa_id: recipientPhone,
    display_phone_number: broadcast.send_from_phone,
    message_id: sendResult.messageId || `bcast_${logId}`,
    message_text: renderedText,
    message_type: isApproved ? 'template' : 'text',
    outcome: sendResult.success ? 'sent' : 'send_failed',
    outcome_details: {
      direction: 'outgoing',
      broadcast_id: broadcast.id,
      lead_id: leadId,
      sent_by_user_id: broadcast.sent_by_user_id,
      template_type: isApproved ? 'approved' : 'freeform',
      approved_template_name: isApproved ? broadcast.approved_template_name : undefined,
      error: sendResult.success ? undefined : sendResult.error,
    },
    trigger_matched: false,
    processed_at: new Date(),
    origin: 'human',
    broadcast_id: broadcast.id,
  };
  let logWriteFailed = false;
  try {
    // Cast to bypass literal-widening (drizzle-zod-inferred type vs inferred local).
    await storage.createWhatsAppMessageLog(log as any);
  } catch (logErr) {
    logWriteFailed = true;
    console.error(`[Broadcast ${broadcast.id}] Failed to write message log:`, logErr);
  }

  // True success requires both the WhatsApp send AND the message-log write.
  // If we sent but couldn't log, count as failed — otherwise the cooldown
  // filter (which depends on the log row) will silently re-include this
  // contact in the next broadcast.
  const isSuccess = sendResult.success && !logWriteFailed;

  // Mirror to lead_updates when we know the lead — both success AND failure,
  // matching the per-lead send route's behaviour (whatsapp_status='sent' or 'failed').
  if (leadId && broadcast.sent_by_user_id) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      await storage.createLeadUpdate({
        lead_id: leadId,
        update_via: 'whatsapp_outgoing',
        update_on: today,
        remark: `WA Broadcast: ${renderedText}`,
        created_by_user_id: broadcast.sent_by_user_id,
        whatsapp_message_id: sendResult.messageId || null,
        whatsapp_status: isSuccess ? 'sent' : 'failed',
        whatsapp_status_at: new Date(),
        whatsapp_error: isSuccess
          ? null
          : (sendResult.error || (logWriteFailed ? 'Message log write failed' : 'Unknown failure')),
        whatsapp_template: isApproved
          ? {
              name: String(broadcast.approved_template_name || "").trim(),
              language: String(broadcast.approved_template_language || "en_US"),
              variables: Array.isArray(broadcast.approved_template_variables) ? broadcast.approved_template_variables : [],
              body: null,
              call_response: 'broadcast',
              call_response_label: 'Broadcast',
            }
          : null,
        sent_from_phone: broadcast.send_from_phone,
      });
    } catch (huErr) {
      console.error(`[Broadcast ${broadcast.id}] Failed to write lead_update for ${leadId}:`, huErr);
    }
  }

  if (isSuccess && leadId) {
    try {
      const { pauseActiveSessionsForLead } = await import("./saila-intake-storage");
      await pauseActiveSessionsForLead(leadId, new Date(Date.now() + 24 * 60 * 60 * 1000));
    } catch (pauseErr) {
      console.error(`[Broadcast ${broadcast.id}] Failed to pause intake for ${leadId}:`, pauseErr);
    }
  }

  await incrementBroadcastCounters(broadcast.id, isSuccess ? { sent: 1 } : { failed: 1 });
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
