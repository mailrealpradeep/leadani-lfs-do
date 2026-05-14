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

function parseCooldown(v: unknown): number | null {
  if (v == null || v === "" || v === "off") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n)) return null;
  return ALLOWED_COOLDOWNS.has(n) ? n : null;
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
    } catch (error: any) {
      console.error("[Broadcast] options error:", error);
      res.status(500).json({ error: error.message });
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
    } catch (error: any) {
      console.error("[Broadcast] preview error:", error);
      res.status(500).json({ error: error.message });
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
      const cooldown = parseCooldown(req.body?.cooldown_hours);

      let messageText: string | null = null;
      let approvedName: string | null = null;
      let approvedLang: string | null = null;
      let approvedVars: string[] = [];

      if (messageType === "text") {
        messageText = String(req.body?.message_text || "").trim();
        if (!messageText) return res.status(400).json({ error: "message_text is required" });
        if (messageText.length > 4096) return res.status(400).json({ error: "message_text too long (max 4096 chars)" });
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
    } catch (error: any) {
      console.error("[Broadcast] send error:", error);
      res.status(500).json({ error: error.message });
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Recent history.
  app.get("/api/saila/broadcast", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });
      const limit = Math.min(parseInt(String(req.query.limit || "20"), 10) || 20, 100);
      const rows = await listBroadcasts(companyId, limit);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
