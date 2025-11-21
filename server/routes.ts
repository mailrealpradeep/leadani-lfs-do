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
      const { name, email, password, role, company_id } = req.body;

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Validate role and company_id combination
      const userRole = role || "user";
      if (userRole === "super_admin" && company_id) {
        return res.status(400).json({ error: "Super admins cannot belong to a company" });
      }
      if ((userRole === "company_admin" || userRole === "user") && !company_id) {
        return res.status(400).json({ error: "Company admins and users must belong to a company" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        name,
        email,
        password_hash: passwordHash,
        role: userRole,
        company_id: company_id || null,
      } as any);

      // Generate token with company context
      const token = generateToken(user.id, user.role, user.company_id);

      // Get company info if user belongs to one
      let company = null;
      if (user.company_id) {
        company = await storage.getCompany(user.company_id);
      }

      // Audit log
      await storage.createAuditLog({
        user_id: user.id,
        company_id: user.company_id,
        action: "register",
        model: "user",
        model_id: user.id,
        payload: { email, role: userRole },
      });

      const { password_hash: _, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword, company, token });
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

      // Update last login timestamp
      await storage.updateUser(user.id, { 
        last_login: new Date().toISOString() 
      });

      // Generate token with company context
      const token = generateToken(user.id, user.role, user.company_id);

      // Get company info if user belongs to one
      let company = null;
      if (user.company_id) {
        company = await storage.getCompany(user.company_id);
      }

      // Audit log
      await storage.createAuditLog({
        user_id: user.id,
        company_id: user.company_id,
        action: "login",
        model: "user",
        model_id: user.id,
        payload: {},
      });

      const { password_hash: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, company, token });
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

      // Get company info if user belongs to one
      let company = null;
      if (user.company_id) {
        company = await storage.getCompany(user.company_id);
      }

      const { password_hash: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, company });
    } catch (error: any) {
      console.error("Get me error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // COMPANY MANAGEMENT (Super Admin Only)
  // ============================================================================
  app.get("/api/admin/companies", authMiddleware, requireSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error: any) {
      console.error("Get companies error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/companies/:id", authMiddleware, requireSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      // Get company stats (user count, sheet count, etc.)
      const users = await storage.getUsersByCompanyId(company.id);
      const sheets = await storage.getSheetsByCompanyId(company.id);
      
      res.json({ 
        ...company, 
        stats: {
          user_count: users.length,
          sheet_count: sheets.length,
        }
      });
    } catch (error: any) {
      console.error("Get company error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/companies", authMiddleware, requireSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const { name, slug, settings, status } = req.body;

      // Check if slug is unique
      const existing = await storage.getCompanyBySlug(slug);
      if (existing) {
        return res.status(400).json({ error: "Company slug already exists" });
      }

      const company = await storage.createCompany({
        name,
        slug,
        settings: settings || {},
        status: status || "active",
      });

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: null,
        action: "create",
        model: "company",
        model_id: company.id,
        payload: { name, slug },
      });

      res.status(201).json(company);
    } catch (error: any) {
      console.error("Create company error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/companies/:id", authMiddleware, requireSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const { name, slug, settings, status } = req.body;

      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // If slug is being changed, check uniqueness
      if (slug && slug !== company.slug) {
        const existing = await storage.getCompanyBySlug(slug);
        if (existing) {
          return res.status(400).json({ error: "Company slug already exists" });
        }
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (slug !== undefined) updates.slug = slug;
      if (settings !== undefined) updates.settings = settings;
      if (status !== undefined) updates.status = status;

      const updated = await storage.updateCompany(req.params.id, updates);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: null,
        action: "update",
        model: "company",
        model_id: req.params.id,
        payload: updates,
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Update company error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/companies/:id", authMiddleware, requireSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Soft delete by setting status to inactive
      const updated = await storage.updateCompany(req.params.id, { status: "inactive" });

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: null,
        action: "delete",
        model: "company",
        model_id: req.params.id,
        payload: {},
      });

      res.json({ message: "Company deactivated", company: updated });
    } catch (error: any) {
      console.error("Delete company error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // USER MANAGEMENT (Company Admin)
  // ============================================================================
  app.get("/api/company/users", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      // Company admins can only see users in their company
      if (req.userRole === "company_admin") {
        if (!req.companyId) {
          return res.status(403).json({ error: "No company context" });
        }
        const users = await storage.getUsersByCompanyId(req.companyId);
        const usersWithoutPasswords = users.map(u => {
          const { password_hash, ...rest } = u;
          return rest;
        });
        res.json(usersWithoutPasswords);
      } else if (req.userRole === "super_admin") {
        // Super admins can see all users
        const users = await storage.getAllUsers();
        const usersWithoutPasswords = users.map(u => {
          const { password_hash, ...rest } = u;
          return rest;
        });
        res.json(usersWithoutPasswords);
      } else {
        return res.status(403).json({ error: "Access denied" });
      }
    } catch (error: any) {
      console.error("Get users error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/company/users", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { name, email, password, role } = req.body;

      // Company admins can only create users in their own company
      const companyId = req.userRole === "super_admin" 
        ? req.body.company_id 
        : req.companyId;

      if (!companyId) {
        return res.status(400).json({ error: "Company ID required" });
      }

      // Company admins cannot create super admins
      if (role === "super_admin" && req.userRole !== "super_admin") {
        return res.status(403).json({ error: "Cannot create super admin users" });
      }

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
        company_id: companyId,
        invited_by: req.userId,
      } as any);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: companyId,
        action: "create",
        model: "user",
        model_id: user.id,
        payload: { email, role },
      });

      const { password_hash: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      console.error("Create user error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/company/users/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { name, role } = req.body;

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Company admins can only update users in their own company
      if (req.userRole === "company_admin" && user.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot update users from other companies" });
      }

      // Company admins cannot modify super admins
      if (user.role === "super_admin" && req.userRole !== "super_admin") {
        return res.status(403).json({ error: "Cannot modify super admin users" });
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (role !== undefined) {
        // Company admins cannot promote to super admin
        if (role === "super_admin" && req.userRole !== "super_admin") {
          return res.status(403).json({ error: "Cannot promote to super admin" });
        }
        updates.role = role;
      }

      const updated = await storage.updateUser(req.params.id, updates);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: user.company_id,
        action: "update",
        model: "user",
        model_id: req.params.id,
        payload: updates,
      });

      const { password_hash: _, ...userWithoutPassword } = updated!;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Update user error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/company/users/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Company admins can only delete users in their own company
      if (req.userRole === "company_admin" && user.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot delete users from other companies" });
      }

      // Company admins cannot delete super admins
      if (user.role === "super_admin" && req.userRole !== "super_admin") {
        return res.status(403).json({ error: "Cannot delete super admin users" });
      }

      // Cannot delete yourself
      if (user.id === req.userId) {
        return res.status(400).json({ error: "Cannot delete yourself" });
      }

      await storage.deleteUser(req.params.id);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: user.company_id,
        action: "delete",
        model: "user",
        model_id: req.params.id,
        payload: {},
      });

      res.json({ message: "User deleted" });
    } catch (error: any) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // SHEETS
  // ============================================================================
  app.get("/api/sheets", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Super admins can see all sheets
      // Company admins/users see sheets accessible to them via getSheetsByUserId
      const sheets = req.userRole === "super_admin"
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
      const { name, settings, is_personal, visibility } = req.body;

      // Users must belong to a company to create sheets
      if (!req.companyId && req.userRole !== "super_admin") {
        return res.status(403).json({ error: "Must belong to a company to create sheets" });
      }

      const sheet = await storage.createSheet({
        name,
        owner_id: req.userId!,
        company_id: req.companyId || "",
        is_personal: is_personal ?? false,
        visibility: visibility || (is_personal ? "personal" : "company"),
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
        company_id: req.companyId,
        action: "create",
        model: "sheet",
        model_id: sheet.id,
        payload: { name, is_personal, visibility },
      });

      res.status(201).json(sheet);
    } catch (error: any) {
      console.error("Create sheet error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sheets/:id", authMiddleware, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      const sheet = await storage.getSheet(req.params.id);
      if (!sheet || sheet.deleted_at) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      res.json(sheet);
    } catch (error: any) {
      console.error("Get sheet error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/sheets/:id", authMiddleware, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      const { name, settings, visibility } = req.body;

      const sheet = await storage.getSheet(req.params.id);
      if (!sheet || sheet.deleted_at) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      // Only owner or company admins can update sheets
      const sheetUser = await storage.getSheetUser(req.params.id, req.userId!);
      const isOwner = sheetUser?.role === "owner" || sheet.owner_id === req.userId;
      const canEdit = isOwner || req.userRole === "company_admin" || req.userRole === "super_admin";

      if (!canEdit) {
        return res.status(403).json({ error: "Only owners and admins can update sheets" });
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (settings !== undefined) updates.settings = settings;
      if (visibility !== undefined) {
        // Only owner can change visibility
        if (!isOwner && req.userRole !== "super_admin") {
          return res.status(403).json({ error: "Only owners can change visibility" });
        }
        updates.visibility = visibility;
      }

      const updated = await storage.updateSheet(req.params.id, updates);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: sheet.company_id,
        action: "update",
        model: "sheet",
        model_id: req.params.id,
        payload: updates,
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Update sheet error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/sheets/:id", authMiddleware, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      const sheet = await storage.getSheet(req.params.id);
      if (!sheet || sheet.deleted_at) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      // Permission logic:
      // - Super admins can delete any sheet
      // - Owners can delete their own sheets
      // - Company admins can delete non-personal sheets in their company
      const sheetUser = await storage.getSheetUser(req.params.id, req.userId!);
      const isOwner = sheetUser?.role === "owner" || sheet.owner_id === req.userId;
      const isCompanyAdmin = req.userRole === "company_admin" && sheet.company_id === req.companyId;
      const isSuperAdmin = req.userRole === "super_admin";
      
      // Personal sheets can only be deleted by owner or super admin
      if (sheet.is_personal) {
        if (!isOwner && !isSuperAdmin) {
          return res.status(403).json({ error: "Only owners can delete personal sheets" });
        }
      } else {
        // Company sheets can be deleted by owner, company admin, or super admin
        if (!isOwner && !isCompanyAdmin && !isSuperAdmin) {
          return res.status(403).json({ error: "Insufficient permissions to delete this sheet" });
        }
      }

      // Soft delete
      await storage.softDeleteSheet(req.params.id);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: sheet.company_id,
        action: "delete",
        model: "sheet",
        model_id: req.params.id,
        payload: {},
      });

      res.json({ success: true, message: "Sheet deleted" });
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
  // LEAD UPDATES
  // ============================================================================
  app.get("/api/leads/:id/updates", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const updates = await storage.getLeadUpdates(req.params.id);
      res.json(updates);
    } catch (error: any) {
      console.error("Get lead updates error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/leads/:id/updates", authMiddleware, async (req: AuthRequest, res) => {
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

      const { insertLeadUpdateSchema } = await import("@shared/schema");
      const parsed = insertLeadUpdateSchema.parse({
        lead_id: req.params.id,
        ...req.body,
      });

      const update = await storage.createLeadUpdate(parsed);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        action: "create",
        model: "lead_update",
        model_id: update.id,
        payload: req.body,
      });

      // Realtime update
      const io = app.get("io") as SocketIOServer;
      io.to(`sheet:${lead.sheet_id}`).emit("lead_updated", lead);

      res.status(201).json(update);
    } catch (error: any) {
      console.error("Create lead update error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/lead-updates/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const update = await storage.updateLeadUpdate(req.params.id, req.body);
      if (!update) {
        return res.status(404).json({ error: "Update not found" });
      }

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        action: "update",
        model: "lead_update",
        model_id: req.params.id,
        payload: req.body,
      });

      res.json(update);
    } catch (error: any) {
      console.error("Update lead update error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/lead-updates/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      await storage.deleteLeadUpdate(req.params.id);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        action: "delete",
        model: "lead_update",
        model_id: req.params.id,
        payload: {},
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete lead update error:", error);
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
  // IMPORT
  // ============================================================================
  app.post("/api/sheets/:id/import/preview", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const sheetId = req.params.id;
      const { fileData, fileName } = req.body;

      if (!fileData) {
        return res.status(400).json({ error: "File data required" });
      }

      // Check sheet access
      const sheet = await storage.getSheet(sheetId);
      if (!sheet) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      // Check permissions (unless admin)
      const user = await storage.getUser(req.userId);
      if (user?.role !== "admin") {
        const sheetUser = await storage.getSheetUser(sheetId, req.userId);
        if (!sheetUser || sheetUser.role === "viewer") {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
      }

      // Limit payload size (10MB base64 = ~7.5MB file)
      if (fileData.length > 10 * 1024 * 1024) {
        return res.status(413).json({ error: "File too large (max 10MB)" });
      }

      const buffer = Buffer.from(fileData, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: null, raw: false });

      if (rows.length === 0) {
        return res.status(400).json({ error: "File is empty" });
      }

      if (rows.length > 10000) {
        return res.status(413).json({ error: "File too large (max 10,000 rows)" });
      }

      const headers = Object.keys(rows[0] as any);
      
      const fieldMap: Record<string, string> = {};
      const normalizeHeader = (h: string) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
      
      const mappings: Record<string, string> = {
        leaddate: "lead_date",
        date: "lead_date",
        time: "lead_time",
        leadtime: "lead_time",
        executive: "executive",
        lang: "lang",
        language: "lang",
        address: "address",
        name: "name",
        mobileno: "mobile_no",
        mobile: "mobile_no",
        phone: "mobile_no",
        whatsapp: "whatsapp",
        occupation: "occupation",
        qualification: "qualification",
        age: "age",
        examend: "exam_end",
        exammark: "exam_mark",
        marks: "exam_mark",
        leadstatus: "lead_status",
        leadsstatus: "lead_status",
        status: "lead_status",
        visitstatus: "visit_status",
        visitdate: "visit_date",
        nfdt: "nfdt",
        call1: "call_1",
        feedback1: "feedback_1",
        feedback: "feedback_1",
      };

      const seenFields = new Set<string>();
      headers.forEach((header) => {
        const normalized = normalizeHeader(header);
        const mappedField = mappings[normalized];
        if (mappedField && !seenFields.has(mappedField)) {
          fieldMap[header] = mappedField;
          seenFields.add(mappedField);
        }
      });

      const preview = rows.slice(0, 10);

      res.json({
        headers,
        fieldMap,
        preview,
        totalRows: rows.length,
        fileName: fileName || "upload.xlsx",
      });
    } catch (error: any) {
      console.error("Import preview error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sheets/:id/import/execute", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { fileData, fieldMap, unmappedHeaders = [] } = req.body;
      const sheetId = req.params.id;

      if (!fileData || !fieldMap) {
        return res.status(400).json({ error: "File data and field map required" });
      }

      // Check sheet access
      const sheet = await storage.getSheet(sheetId);
      if (!sheet) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      // Check permissions (unless admin)
      const user = await storage.getUser(req.userId);
      if (user?.role !== "admin") {
        const sheetUser = await storage.getSheetUser(sheetId, req.userId);
        if (!sheetUser || sheetUser.role === "viewer") {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
      }

      // Limit payload size
      if (fileData.length > 10 * 1024 * 1024) {
        return res.status(413).json({ error: "File too large (max 10MB)" });
      }

      const buffer = Buffer.from(fileData, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: null, raw: false }) as any[];

      if (rows.length > 10000) {
        return res.status(413).json({ error: "File too large (max 10,000 rows)" });
      }

      // Auto-create custom columns for unmapped headers
      const existingColumns = await storage.getCustomColumns(sheetId);
      const existingColumnNames = new Set(existingColumns.map(c => c.name.toLowerCase()));
      const createdColumns: string[] = [];

      for (const header of unmappedHeaders) {
        if (header && header.trim() && !existingColumnNames.has(header.toLowerCase())) {
          try {
            await storage.createCustomColumn({
              sheet_id: sheetId,
              name: header,
              type: "text",
              options: null,
            });
            createdColumns.push(header);
            existingColumnNames.add(header.toLowerCase());
          } catch (err) {
            console.warn(`Could not create column ${header}:`, err);
          }
        }
      }

      const imported: any[] = [];
      const errors: any[] = [];
      const io = app.get("io") as SocketIOServer;

      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i];
          const leadData: any = { 
            sheet_id: sheetId, 
            owner_user_id: req.userId,
            custom_fields: {},
            meta: {},
          };

          // Process mapped fields
          Object.entries(fieldMap).forEach(([excelHeader, crmField]) => {
            if (crmField && row[excelHeader] !== undefined && row[excelHeader] !== null) {
              let value = row[excelHeader];
              
              if (crmField === "age") {
                const parsed = parseInt(String(value), 10);
                leadData.age = isNaN(parsed) ? null : parsed;
              } else if (crmField === "lead_date" || crmField === "visit_date" || crmField === "exam_end" || crmField === "nfdt") {
                if (typeof value === "number") {
                  try {
                    const date = XLSX.SSF.parse_date_code(value);
                    leadData[crmField] = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
                  } catch {
                    leadData[crmField] = String(value);
                  }
                } else if (typeof value === "string") {
                  // Extract date part from datetime string (e.g., "2025-09-24 17:57:05" -> "2025-09-24")
                  const dateOnly = value.trim().split(' ')[0];
                  leadData[crmField] = dateOnly || value;
                } else {
                  leadData[crmField] = value;
                }
              } else {
                leadData[crmField] = String(value).trim() || null;
              }
            }
          });

          // Process unmapped headers as custom fields
          for (const header of unmappedHeaders) {
            if (header && row[header] !== undefined && row[header] !== null) {
              let value = row[header];
              if (typeof value === "string") {
                value = value.trim() || null;
              } else if (typeof value === "number") {
                // Check if it's an Excel date
                if (value > 1 && value < 60000) {
                  try {
                    const date = XLSX.SSF.parse_date_code(value);
                    value = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
                  } catch {
                    value = String(value);
                  }
                } else {
                  value = String(value);
                }
              }
              leadData.custom_fields[header] = value;
            }
          }

          // Validate: require at least name OR mobile number
          if (!leadData.name && !leadData.mobile_no) {
            throw new Error("Row must have either Name or Mobile Number");
          }

          // Ensure no undefined values
          Object.keys(leadData).forEach(key => {
            if (leadData[key] === undefined) {
              leadData[key] = null;
            }
          });

          const lead = await storage.createLead(leadData);
          imported.push(lead);

          await storage.createAuditLog({
            user_id: req.userId,
            action: "import",
            model: "lead",
            model_id: lead.id,
            payload: { source: "excel_import", row: i + 1, fileName: req.body.fileName || "upload" },
          });

          io.to(`sheet:${sheetId}`).emit("lead_created", lead);
        } catch (error: any) {
          errors.push({ row: i + 1, error: error.message });
        }
      }

      res.json({
        imported: imported.length,
        errors: errors.length,
        errorDetails: errors.slice(0, 10),
        createdColumns,
      });
    } catch (error: any) {
      console.error("Import execute error:", error);
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
