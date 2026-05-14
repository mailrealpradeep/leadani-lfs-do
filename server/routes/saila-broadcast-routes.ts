import type { Express } from "express";
import { authMiddleware, requireCompanyAdmin, type AuthRequest } from "../middleware/auth";
import { storage } from "../storage";
import {
  resolveBroadcastRecipients,
  createBroadcast,
  getBroadcast,
  listBroadcasts,
} from "../saila-broadcast-storage";
import { startBroadcastRun } from "../saila-broadcast-engine";

const ALLOWED_COOLDOWNS = new Set([24, 48, 72, 168]);
const ALLOWED_MEDIA_TYPES = new Set(["image", "document", "video"]);

function parseMedia(body: Record<string, unknown> | null | undefined): { type: string | null; url: string | null; caption: string | null; error?: string } {
  const rawType = body?.media_type;
  if (!rawType || rawType === "none") return { type: null, url: null, caption: null };
  const type = String(rawType).toLowerCase();
  if (!ALLOWED_MEDIA_TYPES.has(type)) return { type: null, url: null, caption: null, error: "media_type must be image, document, or video" };
  const url = String(body?.media_url || "").trim();
  if (!url) return { type: null, url: null, caption: null, error: "media_url is required when media_type is set" };
  if (!/^https?:\/\//i.test(url)) return { type: null, url: null, caption: null, error: "media_url must be an absolute http(s) URL" };
  const caption = body?.media_caption ? String(body.media_caption).trim() : null;
  return { type, url, caption: caption || null };
}

// Returns { value } on success or { error } when the input is non-null
// but invalid. null/empty/'off' all mean "no cooldown" and pass.
function parseCooldownStrict(v: unknown): { value: number | null; error?: string } {
  if (v == null || v === "" || v === "off") return { value: null };
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n) || !ALLOWED_COOLDOWNS.has(n)) {
    return { value: null, error: "cooldown_hours must be one of off, 24, 48, 72, 168" };
  }
  return { value: n };
}

// Loose variant for the preview endpoint where bad input shouldn't block UX —
// it just falls back to "off" so the operator sees the unfiltered count.
function parseCooldown(v: unknown): number | null {
  return parseCooldownStrict(v).value;
}

export function registerSailaBroadcastRoutes(app: Express): void {
  // Connected business numbers + per-number session-open count.
  app.get("/api/saila/broadcast/options", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });

      const phoneSettings = await storage.getSailaPhoneSettings(companyId);
      const connected = phoneSettings.filter((p) => p.access_token && p.waba_phone_number_id);

      const options = await Promise.all(
        connected.map(async (p) => {
          const r = await resolveBroadcastRecipients(companyId, p.display_phone_number, null);
          return {
            display_phone_number: p.display_phone_number,
            executive_name: p.executive_name,
            session_open_count: r.sessionOpenCount,
          };
        })
      );

      res.json({ options });
    } catch (error: unknown) {
      console.error("[Broadcast] options error:", error);
      res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Live preview — recipient counts + sample names for a given send-from + cooldown.
  app.post("/api/saila/broadcast/preview", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });

      const sendFromPhone = String(req.body?.send_from_phone || "").trim();
      if (!sendFromPhone) return res.status(400).json({ error: "send_from_phone is required" });
      const cooldown = parseCooldown(req.body?.cooldown_hours);

      const r = await resolveBroadcastRecipients(companyId, sendFromPhone, cooldown);
      const sampleNames = r.recipients.slice(0, 8).map((x) => x.display_name);
      res.json({
        session_open_count: r.sessionOpenCount,
        suppressed_count: r.suppressedCount,
        will_receive_count: r.recipients.length,
        sample_names: sampleNames,
        cooldown_hours: cooldown,
      });
    } catch (error: unknown) {
      console.error("[Broadcast] preview error:", error);
      res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Kick off a broadcast (background run).
  app.post("/api/saila/broadcast/send", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });

      const sendFromPhone = String(req.body?.send_from_phone || "").trim();
      if (!sendFromPhone) return res.status(400).json({ error: "send_from_phone is required" });

      const messageType = req.body?.message_type === "template" ? "template" : "text";
      const cooldownParsed = parseCooldownStrict(req.body?.cooldown_hours);
      if (cooldownParsed.error) return res.status(400).json({ error: cooldownParsed.error });
      const cooldown = cooldownParsed.value;

      let messageText: string | null = null;
      let approvedName: string | null = null;
      let approvedLang: string | null = null;
      let approvedVars: string[] = [];

      const media = parseMedia(req.body);
      if (media.error) return res.status(400).json({ error: media.error });

      if (messageType === "text") {
        messageText = String(req.body?.message_text || "").trim();
        // Text broadcasts: either text body OR media is required (caption can stand in for text).
        if (!messageText && !media.url) return res.status(400).json({ error: "message_text or media is required" });
        if (messageText.length > 4096) return res.status(400).json({ error: "message_text too long (max 4096 chars)" });
        if (!messageText) messageText = null; // allow media-only sends
      } else {
        approvedName = String(req.body?.approved_template_name || "").trim();
        if (!approvedName) return res.status(400).json({ error: "approved_template_name is required" });
        approvedLang = String(req.body?.approved_template_language || "en_US").trim() || "en_US";
        const rawVars: unknown = req.body?.approved_template_variables;
        approvedVars = Array.isArray(rawVars) ? rawVars.map((v) => String(v ?? "")) : [];
      }

      // Verify the chosen sender number is connected.
      const phoneSetting = await storage.getSailaPhoneSettingByNumber(companyId, sendFromPhone);
      if (!phoneSetting || !phoneSetting.access_token || !phoneSetting.waba_phone_number_id) {
        return res.status(400).json({ error: "Selected sender number is not connected to WhatsApp Business" });
      }

      // Server-side recipient resolve so the count we persist is authoritative.
      const resolved = await resolveBroadcastRecipients(companyId, sendFromPhone, cooldown);
      if (resolved.recipients.length === 0) {
        return res.status(400).json({
          error: resolved.suppressedCount > 0
            ? `No eligible recipients (${resolved.suppressedCount} suppressed by cooldown)`
            : "No session-open recipients on this number",
        });
      }

      const broadcast = await createBroadcast({
        company_id: companyId,
        sent_by_user_id: req.userId!,
        send_from_phone: sendFromPhone,
        message_type: messageType,
        message_text: messageText,
        approved_template_name: approvedName,
        approved_template_language: approvedLang,
        approved_template_variables: approvedVars,
        media_type: media.type,
        media_url: media.url,
        media_caption: media.caption,
        cooldown_hours: cooldown,
        total_recipients: resolved.recipients.length,
        suppressed_count: resolved.suppressedCount,
      });

      // Audit log so admins can trace who fired what.
      try {
        await storage.createAuditLog({
          user_id: req.userId!,
          company_id: companyId,
          action: "send_broadcast",
          model: "saila_broadcast",
          model_id: broadcast.id,
          payload: {
            send_from_phone: sendFromPhone,
            message_type: messageType,
            cooldown_hours: cooldown,
            total_recipients: resolved.recipients.length,
            suppressed_count: resolved.suppressedCount,
          },
        });
      } catch (auditErr) {
        console.error("[Broadcast] audit log failed:", auditErr);
      }

      startBroadcastRun(broadcast.id);

      res.json({
        broadcast_id: broadcast.id,
        total_recipients: broadcast.total_recipients,
        suppressed_count: broadcast.suppressed_count,
      });
    } catch (error: unknown) {
      console.error("[Broadcast] send error:", error);
      res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Status (for polling).
  app.get("/api/saila/broadcast/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });
      const b = await getBroadcast(req.params.id);
      if (!b || b.company_id !== companyId) return res.status(404).json({ error: "Not found" });
      res.json(b);
    } catch (error: unknown) {
      res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Recent history.
  app.get("/api/saila/broadcast", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });
      const limit = Math.min(parseInt(String(req.query.limit || "20"), 10) || 20, 100);
      const rows = await listBroadcasts(companyId, limit);

      // Enrich each row with the sender's display name so the history table can
      // show "fired by" without an N+1 from the client. Cache by user id.
      const userCache = new Map<string, string>();
      const enriched = await Promise.all(rows.map(async (b) => {
        let senderName: string | null = null;
        if (b.sent_by_user_id) {
          if (userCache.has(b.sent_by_user_id)) {
            senderName = userCache.get(b.sent_by_user_id)!;
          } else {
            try {
              const u = await storage.getUser(b.sent_by_user_id);
              senderName = u?.name || u?.email || null;
              if (senderName) userCache.set(b.sent_by_user_id, senderName);
            } catch { /* ignore */ }
          }
        }
        return { ...b, sender_name: senderName };
      }));
      res.json(enriched);
    } catch (error: unknown) {
      res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
    }
  });
}
