import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { authMiddleware, adminMiddleware, generateToken, type AuthRequest } from "./middleware/auth";
import rateLimit from "express-rate-limit";
import * as XLSX from "xlsx";
import crypto from "crypto";
import { seedData } from "./seed";

const HMAC_SECRET = process.env.HMAC_SECRET || "dabluz-webhook-secret-change-in-production";

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many login attempts, please try again later",
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: "Too many webhook requests",
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      credentials: true,
    },
  });

  // Socket.io connection handling
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join_sheet", (sheetId: string) => {
      socket.join(`sheet:${sheetId}`);
      console.log(`Socket ${socket.id} joined sheet:${sheetId}`);
    });

    socket.on("leave_sheet", (sheetId: string) => {
      socket.leave(`sheet:${sheetId}`);
      console.log(`Socket ${socket.id} left sheet:${sheetId}`);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  // Make io accessible in routes
  app.set("io", io);

  // Seed data on startup (only in development)
  if (process.env.NODE_ENV !== "production") {
    const users = await storage.getAllUsers();
    if (users.length === 0) {
      await seedData();
    }
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        name,
        email,
        password_hash: passwordHash,
        role: role || "user",
      });

      // Generate token
      const token = generateToken(user.id, user.role);

      // Audit log
      await storage.createAuditLog({
        user_id: user.id,
        action: "register",
        model: "user",
        model_id: user.id,
        payload: { email },
      });

      const { password_hash: _, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword, token });
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate token
      const token = generateToken(user.id, user.role);

      // Audit log
      await storage.createAuditLog({
        user_id: user.id,
        action: "login",
        model: "user",
        model_id: user.id,
        payload: {},
      });

      const { password_hash: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { password_hash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Get me error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // SHEETS
  // ============================================================================
  app.get("/api/sheets", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Admin users can see all sheets, regular users only see their own
      const sheets = req.userRole === "admin"
        ? await storage.getAllSheets()
        : await storage.getSheetsByUserId(req.userId!);
      res.json(sheets);
    } catch (error: any) {
      console.error("Get sheets error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sheets", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { name, settings } = req.body;

      const sheet = await storage.createSheet({
        name,
        owner_id: req.userId!,
        settings: settings || {},
      });

      // Auto-add creator as owner
      await storage.createSheetUser({
        sheet_id: sheet.id,
        user_id: req.userId!,
        role: "owner",
      });

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        action: "create",
        model: "sheet",
        model_id: sheet.id,
        payload: { name },
      });

      res.status(201).json(sheet);
    } catch (error: any) {
      console.error("Create sheet error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sheets/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const sheet = await storage.getSheet(req.params.id);
      if (!sheet) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      // Check permission
      const sheetUser = await storage.getSheetUser(req.params.id, req.userId!);
      if (!sheetUser && req.userRole !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(sheet);
    } catch (error: any) {
      console.error("Get sheet error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/sheets/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { name, settings } = req.body;

      // Check permission
      const sheetUser = await storage.getSheetUser(req.params.id, req.userId!);
      if (sheetUser?.role !== "owner" && req.userRole !== "admin") {
        return res.status(403).json({ error: "Only owners can update sheet" });
      }

      const updated = await storage.updateSheet(req.params.id, { name, settings });
      if (!updated) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        action: "update",
        model: "sheet",
        model_id: req.params.id,
        payload: { name, settings },
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Update sheet error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/sheets/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Check permission
      const sheetUser = await storage.getSheetUser(req.params.id, req.userId!);
      if (sheetUser?.role !== "owner" && req.userRole !== "admin") {
        return res.status(403).json({ error: "Only owners can delete sheet" });
      }

      const deleted = await storage.deleteSheet(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        action: "delete",
        model: "sheet",
        model_id: req.params.id,
        payload: {},
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete sheet error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // LEADS
  // ============================================================================
  app.get("/api/sheets/:id/leads", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Admin bypasses permission check
      if (req.userRole !== "admin") {
        const sheetUser = await storage.getSheetUser(req.params.id, req.userId!);
        if (!sheetUser) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const leads = await storage.getLeadsBySheetId(req.params.id);
      res.json(leads);
    } catch (error: any) {
      console.error("Get leads error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sheets/:id/leads", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Admin bypasses permission check
      if (req.userRole !== "admin") {
        const sheetUser = await storage.getSheetUser(req.params.id, req.userId!);
        if (!sheetUser || sheetUser.role === "viewer") {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const lead = await storage.createLead({
        ...req.body,
        sheet_id: req.params.id,
        owner_user_id: req.userId,
      });

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        action: "create",
        model: "lead",
        model_id: lead.id,
        payload: req.body,
      });

      // Realtime update
      const io = app.get("io") as SocketIOServer;
      io.to(`sheet:${req.params.id}`).emit("lead_created", lead);

      res.status(201).json(lead);
    } catch (error: any) {
      console.error("Create lead error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/leads/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Admin bypasses permission check
      if (req.userRole !== "admin") {
        const sheetUser = await storage.getSheetUser(lead.sheet_id, req.userId!);
        if (!sheetUser) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      res.json(lead);
    } catch (error: any) {
      console.error("Get lead error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/leads/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Admin bypasses permission check
      if (req.userRole !== "admin") {
        const sheetUser = await storage.getSheetUser(lead.sheet_id, req.userId!);
        if (!sheetUser || sheetUser.role === "viewer") {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const updated = await storage.updateLead(req.params.id, req.body);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        action: "update",
        model: "lead",
        model_id: req.params.id,
        payload: req.body,
      });

      // Realtime update
      const io = app.get("io") as SocketIOServer;
      io.to(`sheet:${lead.sheet_id}`).emit("lead_updated", updated);

      res.json(updated);
    } catch (error: any) {
      console.error("Update lead error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/leads/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Admin bypasses permission check
      if (req.userRole !== "admin") {
        const sheetUser = await storage.getSheetUser(lead.sheet_id, req.userId!);
        if (!sheetUser || sheetUser.role === "viewer") {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      await storage.deleteLead(req.params.id);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        action: "delete",
        model: "lead",
        model_id: req.params.id,
        payload: {},
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete lead error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // DROPDOWN OPTIONS
  // ============================================================================
  app.get("/api/sheets/:id/dropdowns", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const options = await storage.getDropdownOptions(req.params.id);
      res.json(options);
    } catch (error: any) {
      console.error("Get dropdown options error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sheets/:id/dropdowns/:columnKey", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const options = await storage.getDropdownOptionsByColumn(req.params.id, req.params.columnKey);
      res.json(options);
    } catch (error: any) {
      console.error("Get dropdown options error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sheets/:id/dropdowns/:columnKey", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const option = await storage.createDropdownOption({
        sheet_id: req.params.id,
        column_key: req.params.columnKey,
        value: req.body.value,
        order_index: req.body.order_index,
      });

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        action: "create",
        model: "dropdown_option",
        model_id: option.id,
        payload: req.body,
      });

      res.status(201).json(option);
    } catch (error: any) {
      console.error("Create dropdown option error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/sheets/:id/dropdowns/:columnKey/:optionId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      await storage.deleteDropdownOption(req.params.optionId);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        action: "delete",
        model: "dropdown_option",
        model_id: req.params.optionId,
        payload: {},
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete dropdown option error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // CUSTOM COLUMNS
  // ============================================================================
  app.get("/api/sheets/:id/columns", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const columns = await storage.getCustomColumns(req.params.id);
      res.json(columns);
    } catch (error: any) {
      console.error("Get columns error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sheets/:id/columns", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const column = await storage.createCustomColumn({
        sheet_id: req.params.id,
        name: req.body.name,
        type: req.body.type,
        config: req.body.config || {},
      });

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        action: "create",
        model: "custom_column",
        model_id: column.id,
        payload: req.body,
      });

      res.status(201).json(column);
    } catch (error: any) {
      console.error("Create column error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/sheets/:id/columns/:columnId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      await storage.deleteCustomColumn(req.params.columnId);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        action: "delete",
        model: "custom_column",
        model_id: req.params.columnId,
        payload: {},
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete column error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // WEBHOOKS
  // ============================================================================
  app.post("/api/webhooks/leads", webhookLimiter, async (req, res) => {
    const headers = req.headers as Record<string, any>;
    let leadId: string | null = null;

    try {
      // Verify API key or HMAC signature
      const apiKey = headers["x-api-key"];
      if (!apiKey || apiKey !== HMAC_SECRET) {
        await storage.createWebhookLog({
          sheet_id: req.body.sheet_id || null,
          payload: req.body,
          headers,
          status: "error",
          error_message: "Invalid API key",
          lead_id: null,
        });
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { sheet_id, ...leadData } = req.body;

      if (!sheet_id) {
        await storage.createWebhookLog({
          sheet_id: null,
          payload: req.body,
          headers,
          status: "error",
          error_message: "sheet_id required",
          lead_id: null,
        });
        return res.status(400).json({ error: "sheet_id required" });
      }

      // Create lead
      const lead = await storage.createLead({
        ...leadData,
        sheet_id,
        custom_fields: {},
        meta: leadData.meta || {},
      });

      leadId = lead.id;

      // Realtime notification
      const io = app.get("io") as SocketIOServer;
      io.to(`sheet:${sheet_id}`).emit("lead_created", lead);

      // Log success
      await storage.createWebhookLog({
        sheet_id,
        payload: req.body,
        headers,
        status: "success",
        error_message: null,
        lead_id: lead.id,
      });

      res.status(201).json({ lead_id: lead.id, message: "Lead created successfully" });
    } catch (error: any) {
      console.error("Webhook error:", error);
      await storage.createWebhookLog({
        sheet_id: req.body.sheet_id || null,
        payload: req.body,
        headers,
        status: "error",
        error_message: error.message,
        lead_id: leadId,
      });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/webhook/logs", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const logs = await storage.getWebhookLogs();
      res.json(logs);
    } catch (error: any) {
      console.error("Get webhook logs error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // REPORTS
  // ============================================================================
  app.get("/api/sheets/:id/reports", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const leads = await storage.getLeadsBySheetId(req.params.id);

      // Calculate metrics
      const leadsByStatus: Record<string, number> = {};
      const leadsByExecutive: Record<string, number> = {};
      const dailyTrends: { date: string; count: number }[] = [];
      let visitsScheduled = 0;
      let nfdtCount = 0;
      let convertedCount = 0;

      const dateMap: Record<string, number> = {};

      for (const lead of leads) {
        // By status
        if (lead.lead_status) {
          leadsByStatus[lead.lead_status] = (leadsByStatus[lead.lead_status] || 0) + 1;
        }

        // By executive
        if (lead.executive) {
          leadsByExecutive[lead.executive] = (leadsByExecutive[lead.executive] || 0) + 1;
        }

        // Daily trends
        if (lead.lead_date) {
          dateMap[lead.lead_date] = (dateMap[lead.lead_date] || 0) + 1;
        }

        // Visits scheduled
        if (lead.visit_status === "Scheduled") {
          visitsScheduled++;
        }

        // NFDT
        if (lead.nfdt) {
          nfdtCount++;
        }

        // Converted
        if (lead.lead_status === "Converted") {
          convertedCount++;
        }
      }

      // Daily trends array
      Object.entries(dateMap).forEach(([date, count]) => {
        dailyTrends.push({ date, count });
      });
      dailyTrends.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const conversionRate = leads.length > 0 ? (convertedCount / leads.length) * 100 : 0;

      res.json({
        total_leads: leads.length,
        leads_by_status: leadsByStatus,
        leads_by_executive: leadsByExecutive,
        daily_trends: dailyTrends,
        conversion_rate: conversionRate,
        visits_scheduled: visitsScheduled,
        nfdt_count: nfdtCount,
      });
    } catch (error: any) {
      console.error("Get reports error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/global", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const allSheets = await storage.getAllSheets();
      const allUsers = await storage.getAllUsers();
      const auditLogs = await storage.getAuditLogs();

      const leadsBySheet: { sheet_id: string; sheet_name: string; count: number }[] = [];
      let totalLeads = 0;

      for (const sheet of allSheets) {
        const leads = await storage.getLeadsBySheetId(sheet.id);
        totalLeads += leads.length;
        leadsBySheet.push({
          sheet_id: sheet.id,
          sheet_name: sheet.name,
          count: leads.length,
        });
      }

      res.json({
        total_sheets: allSheets.length,
        total_leads: totalLeads,
        total_users: allUsers.length,
        leads_by_sheet: leadsBySheet,
        recent_activity: auditLogs.slice(0, 20),
      });
    } catch (error: any) {
      console.error("Get global reports error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================
  app.get("/api/audit", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error: any) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/leads/:id/audit", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const logs = await storage.getAuditLogsByModel("lead", req.params.id);
      res.json(logs);
    } catch (error: any) {
      console.error("Get lead audit logs error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // EXPORT
  // ============================================================================
  app.get("/api/sheets/:id/export", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const format = req.query.format as string || "csv";
      const leads = await storage.getLeadsBySheetId(req.params.id);

      const data = leads.map((lead) => ({
        "Lead Date": lead.lead_date,
        "Time": lead.lead_time,
        "Executive": lead.executive,
        "Lang": lead.lang,
        "Address": lead.address,
        "Name": lead.name,
        "Mobile No": lead.mobile_no,
        "WhatsApp": lead.whatsapp,
        "Occupation": lead.occupation,
        "Qualification": lead.qualification,
        "Age": lead.age,
        "Exam End": lead.exam_end,
        "Exam Mark": lead.exam_mark,
        "Lead Status": lead.lead_status,
        "Visit Status": lead.visit_status,
        "Visit Date": lead.visit_date,
        "NFDT": lead.nfdt,
        "Call 1": lead.call_1,
        "Feedback 1": lead.feedback_1,
      }));

      if (format === "xlsx") {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        
        res.setHeader("Content-Disposition", `attachment; filename=leads-${req.params.id}.xlsx`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buffer);
      } else {
        // CSV
        const worksheet = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        
        res.setHeader("Content-Disposition", `attachment; filename=leads-${req.params.id}.csv`);
        res.setHeader("Content-Type", "text/csv");
        res.send(csv);
      }
    } catch (error: any) {
      console.error("Export error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // ADMIN
  // ============================================================================
  app.get("/api/admin/users", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password_hash, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      console.error("Get users error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
