import type { Express } from "express";
import { authMiddleware, requireCompanyAdmin, type AuthRequest } from "../middleware/auth";
import { storage } from "../storage";
import { sendWhatsAppMessage } from "../saila-engine";
import { format } from "date-fns";
import { getCompanyTimezone, getTodayDateString } from "../timezone-utils";

export function registerSailaRoutes(app: Express): void {
  app.get("/api/saila/config", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });
      const config = await storage.getSailaConfig(companyId);
      res.json(config || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/saila/config", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });
      const config = await storage.upsertSailaConfig(companyId, req.body);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/saila/phone-settings", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });
      const settings = await storage.getSailaPhoneSettings(companyId);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/saila/phone-settings", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });
      const { display_phone_number, ...data } = req.body;
      if (!display_phone_number) return res.status(400).json({ error: "Phone number required" });
      const setting = await storage.upsertSailaPhoneSetting(companyId, display_phone_number, data);
      res.json(setting);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/saila/templates", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });
      const templates = await storage.getSailaTemplates(companyId);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/saila/templates", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });
      if (!req.body.name) return res.status(400).json({ error: "Template name is required" });
      const template = await storage.createSailaTemplate({ ...req.body, company_id: companyId });
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/saila/templates/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const existing = await storage.getSailaTemplate(req.params.id);
      if (!existing || existing.company_id !== req.companyId) {
        return res.status(404).json({ error: "Template not found" });
      }
      const template = await storage.updateSailaTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/saila/templates/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const existing = await storage.getSailaTemplate(req.params.id);
      if (!existing || existing.company_id !== req.companyId) {
        return res.status(404).json({ error: "Template not found" });
      }
      await storage.deleteSailaTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/saila/templates/:id/messages", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const template = await storage.getSailaTemplate(req.params.id);
      if (!template || template.company_id !== req.companyId) {
        return res.status(404).json({ error: "Template not found" });
      }
      const messages = await storage.getSailaTemplateMessages(req.params.id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/saila/templates/:id/messages", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const template = await storage.getSailaTemplate(req.params.id);
      if (!template || template.company_id !== req.companyId) {
        return res.status(404).json({ error: "Template not found" });
      }
      const { messages } = req.body;
      if (Array.isArray(messages)) {
        await storage.deleteAllSailaTemplateMessages(req.params.id);
        const created = [];
        for (const msg of messages) {
          const result = await storage.createSailaTemplateMessage({
            template_id: req.params.id,
            direction: msg.direction,
            message_text: msg.message_text,
            order_index: msg.order_index || 0,
          });
          created.push(result);
        }
        res.json(created);
      } else {
        const msg = await storage.createSailaTemplateMessage({
          template_id: req.params.id,
          ...req.body,
        });
        res.json(msg);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/saila/keywords", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });
      const keywords = await storage.getSailaKeywords(companyId);
      res.json(keywords);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/saila/keywords", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });
      if (!req.body.keyword) return res.status(400).json({ error: "Keyword is required" });
      if (!req.body.response_text) return res.status(400).json({ error: "Response text is required" });
      const keyword = await storage.createSailaKeyword({ ...req.body, company_id: companyId });
      res.json(keyword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/saila/keywords/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const existing = await storage.getSailaKeyword(req.params.id);
      if (!existing || existing.company_id !== req.companyId) {
        return res.status(404).json({ error: "Keyword not found" });
      }
      const keyword = await storage.updateSailaKeyword(req.params.id, req.body);
      res.json(keyword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/saila/keywords/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const existing = await storage.getSailaKeyword(req.params.id);
      if (!existing || existing.company_id !== req.companyId) {
        return res.status(404).json({ error: "Keyword not found" });
      }
      await storage.deleteSailaKeyword(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/saila/media", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });
      const media = await storage.getSailaMedia(companyId);
      res.json(media);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/saila/media", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });
      if (!req.body.media_type) return res.status(400).json({ error: "Media type is required" });
      if (!req.body.url) return res.status(400).json({ error: "URL is required" });
      const media = await storage.createSailaMedia({ ...req.body, company_id: companyId });
      res.json(media);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/saila/media/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const existing = await storage.getSailaMediaItem(req.params.id);
      if (!existing || existing.company_id !== req.companyId) {
        return res.status(404).json({ error: "Media not found" });
      }
      const media = await storage.updateSailaMedia(req.params.id, req.body);
      res.json(media);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/saila/media/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const existing = await storage.getSailaMediaItem(req.params.id);
      if (!existing || existing.company_id !== req.companyId) {
        return res.status(404).json({ error: "Media not found" });
      }
      await storage.deleteSailaMedia(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/saila/conversations", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });
      const { limit, offset, status } = req.query;
      const result = await storage.getSailaConversations(companyId, {
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
        status: status as string,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/saila/conversations/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const conversation = await storage.getSailaConversation(req.params.id);
      if (!conversation || conversation.company_id !== req.companyId) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/saila/conversations/:id/messages", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const conversation = await storage.getSailaConversation(req.params.id);
      if (!conversation || conversation.company_id !== req.companyId) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await storage.getSailaConversationMessages(req.params.id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/saila/bookings", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });
      const { limit, offset, status } = req.query;
      const result = await storage.getSailaBookings(companyId, {
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
        status: status as string,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/saila/bookings/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const existing = await storage.getSailaBooking(req.params.id);
      if (!existing || existing.company_id !== req.companyId) {
        return res.status(404).json({ error: "Booking not found" });
      }
      const booking = await storage.updateSailaBooking(req.params.id, req.body);
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/saila/activity-logs", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });

      const status = req.query.status as string | undefined;
      const executive_phone = req.query.executive_phone as string | undefined;
      const limit = parseInt(req.query.limit as string || "100");
      const offset = parseInt(req.query.offset as string || "0");

      const result = await storage.getSailaActivityLogs(companyId, {
        limit,
        offset,
        status: status || undefined,
        executive_phone: executive_phone || undefined,
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/saila/test-send", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      if (!companyId) return res.status(400).json({ error: "No company" });

      const { toPhone, fromPhone } = req.body;
      if (!toPhone) return res.status(400).json({ error: "toPhone is required" });
      if (!fromPhone) return res.status(400).json({ error: "fromPhone (business channel number) is required" });

      const config = await storage.getSailaConfig(companyId);
      if (!config) return res.status(404).json({ error: "Saila not configured for this company" });

      const phoneSettings = await storage.getSailaPhoneSettings(companyId);
      const phoneSetting = phoneSettings.find(s => s.display_phone_number === fromPhone);
      if (!phoneSetting) return res.status(404).json({ error: `No phone setting found for ${fromPhone}` });

      const result = await sendWhatsAppMessage(
        config,
        phoneSetting,
        toPhone,
        "This is a test message from Saila.AI to verify your Wauper connection is working correctly."
      );

      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(400).json({ success: false, error: result.error || "Send failed" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/saila/call-commitments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      const userId = req.userId;
      if (!companyId || !userId) return res.status(400).json({ error: "No company" });

      const dateParam = req.query.date as string | undefined;
      const statusParam = req.query.status as string | undefined;
      const executivePhoneParam = req.query.executive_phone as string | undefined;

      const company = await storage.getCompany(companyId);
      const timezone = getCompanyTimezone(company);
      const today = getTodayDateString(timezone);
      const date = dateParam || today;

      const isAdminRole = req.userRole === 'company_admin' || req.userRole === 'super_admin';
      const isMultiSheet = !isAdminRole ? await storage.isMultiSheetUser(userId) : false;
      const isAdmin = isAdminRole || isMultiSheet;

      let executivePhones: string[] | undefined;
      if (isAdmin) {
        if (executivePhoneParam) {
          executivePhones = [executivePhoneParam];
        }
      } else {
        const allocations = await storage.getWhatsAppAllocations(companyId);
        const userAllocations = allocations.filter(a => a.user_id === userId);
        if (userAllocations.length === 0) {
          return res.json([]);
        }
        executivePhones = userAllocations.map(a => a.display_phone_number);
      }

      const commitments = await storage.getSailaCallCommitments(companyId, {
        date,
        status: statusParam,
        executive_phones: executivePhones,
      });

      res.json(commitments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/saila/call-commitments/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      const userId = req.userId;
      if (!companyId || !userId) return res.status(400).json({ error: "No company" });

      const { id } = req.params;
      const { status, notes } = req.body;

      if (!status || !['completed', 'missed', 'no_response'].includes(status)) {
        return res.status(400).json({ error: "status must be completed, missed, or no_response" });
      }

      const existing = await storage.getSailaCallCommitmentById(id);
      if (!existing || existing.company_id !== companyId) {
        return res.status(404).json({ error: "Commitment not found" });
      }

      const isAdminRole = req.userRole === 'company_admin' || req.userRole === 'super_admin';
      const isMultiSheet = !isAdminRole ? await storage.isMultiSheetUser(userId) : false;
      const isAdmin = isAdminRole || isMultiSheet;

      if (!isAdmin) {
        const allocations = await storage.getWhatsAppAllocations(companyId);
        const userPhones = allocations.filter(a => a.user_id === userId).map(a => a.display_phone_number);
        if (!userPhones.includes(existing.executive_phone)) {
          return res.status(403).json({ error: "Not authorized to update this commitment" });
        }
      }

      const updated = await storage.updateSailaCallCommitment(id, { status, notes });
      if (!updated) return res.status(404).json({ error: "Commitment not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/saila/call-commitments/counts", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId;
      const userId = req.userId;
      if (!companyId || !userId) return res.status(400).json({ error: "No company" });

      const dateParam = req.query.date as string | undefined;
      const company = await storage.getCompany(companyId);
      const timezone = getCompanyTimezone(company);
      const today = dateParam || getTodayDateString(timezone);
      const isAdminRole = req.userRole === 'company_admin' || req.userRole === 'super_admin';
      const isMultiSheet = !isAdminRole ? await storage.isMultiSheetUser(userId) : false;
      const isAdmin = isAdminRole || isMultiSheet;

      let executivePhones: string[] | undefined;
      if (!isAdmin) {
        const allocations = await storage.getWhatsAppAllocations(companyId);
        const userAllocations = allocations.filter(a => a.user_id === userId);
        if (userAllocations.length === 0) return res.json({ pending: 0, no_response: 0, completed: 0, missed: 0 });
        executivePhones = userAllocations.map(a => a.display_phone_number);
      }

      const all = await storage.getSailaCallCommitments(companyId, { date: today, executive_phones: executivePhones });
      const counts = { pending: 0, no_response: 0, completed: 0, missed: 0 };
      for (const c of all) {
        if (c.status === 'pending') counts.pending++;
        else if (c.status === 'no_response') counts.no_response++;
        else if (c.status === 'completed') counts.completed++;
        else if (c.status === 'missed') counts.missed++;
      }
      res.json(counts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Fixed Reply Mode ────────────────────────────────────────────────────────

  // GET all per-phone fixed reply configs for the company
  app.get("/api/saila/fixed-reply-config", authMiddleware, requireCompanyAdmin, async (req, res) => {
    try {
      const companyId = (req as AuthRequest).companyId!;
      const configs = await storage.getSailaFixedReplyConfigs(companyId);
      res.json(configs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST upsert a per-phone fixed reply config
  app.post("/api/saila/fixed-reply-config", authMiddleware, requireCompanyAdmin, async (req, res) => {
    try {
      const companyId = (req as AuthRequest).companyId!;
      const { executive_phone, enabled, message_template } = req.body;
      if (!executive_phone) return res.status(400).json({ error: "executive_phone is required" });
      const config = await storage.upsertSailaFixedReplyConfig(companyId, executive_phone, {
        enabled: !!enabled,
        message_template: message_template || "",
      });
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET all greeting slots for the company
  app.get("/api/saila/greeting-slots", authMiddleware, requireCompanyAdmin, async (req, res) => {
    try {
      const companyId = (req as AuthRequest).companyId!;
      res.json(await storage.getSailaGreetingSlots(companyId));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST create a greeting slot
  app.post("/api/saila/greeting-slots", authMiddleware, requireCompanyAdmin, async (req, res) => {
    try {
      const companyId = (req as AuthRequest).companyId!;
      const { hour_start, hour_end, greeting_text } = req.body;
      if (hour_start == null || hour_end == null || !greeting_text) {
        return res.status(400).json({ error: "hour_start, hour_end, and greeting_text are required" });
      }
      const slot = await storage.createSailaGreetingSlot({ company_id: companyId, hour_start: Number(hour_start), hour_end: Number(hour_end), greeting_text });
      res.status(201).json(slot);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE a greeting slot
  app.delete("/api/saila/greeting-slots/:id", authMiddleware, requireCompanyAdmin, async (req, res) => {
    try {
      await storage.deleteSailaGreetingSlot(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET all call time slots for the company
  app.get("/api/saila/call-time-slots", authMiddleware, requireCompanyAdmin, async (req, res) => {
    try {
      const companyId = (req as AuthRequest).companyId!;
      res.json(await storage.getSailaCallTimeSlots(companyId));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST create a call time slot
  app.post("/api/saila/call-time-slots", authMiddleware, requireCompanyAdmin, async (req, res) => {
    try {
      const companyId = (req as AuthRequest).companyId!;
      const { hour_start, hour_end, call_time_label } = req.body;
      if (hour_start == null || hour_end == null || !call_time_label) {
        return res.status(400).json({ error: "hour_start, hour_end, and call_time_label are required" });
      }
      const slot = await storage.createSailaCallTimeSlot({ company_id: companyId, hour_start: Number(hour_start), hour_end: Number(hour_end), call_time_label });
      res.status(201).json(slot);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE a call time slot
  app.delete("/api/saila/call-time-slots/:id", authMiddleware, requireCompanyAdmin, async (req, res) => {
    try {
      await storage.deleteSailaCallTimeSlot(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET incoming messages (admin table)
  app.get("/api/saila/incoming-messages", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId!;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;
      const unique = req.query.unique === "true";
      const from_date = req.query.from_date as string | undefined;
      const to_date = req.query.to_date as string | undefined;
      const executive_phone = req.query.executive_phone as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await storage.getSailaIncomingMessages(companyId, {
        from_date, to_date, executive_phone, search, limit, offset, unique,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET executive phones for filter dropdown
  app.get("/api/saila/incoming-messages/executives", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId!;
      const { db } = await import("../db");
      const { sql: drizzleSql } = await import("drizzle-orm");
      const result = await db.execute(drizzleSql`
        SELECT DISTINCT conv.executive_phone, conv.executive_name
        FROM saila_conversations conv
        WHERE conv.company_id = ${companyId}
          AND conv.executive_phone IS NOT NULL
        ORDER BY conv.executive_phone
      `);
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
