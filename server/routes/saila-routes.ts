import type { Express } from "express";
import { authMiddleware, requireCompanyAdmin, type AuthRequest } from "../middleware/auth";
import { storage } from "../storage";

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
}
