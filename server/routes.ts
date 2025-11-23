import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { authMiddleware, adminMiddleware, generateToken, type AuthRequest, requireSuperAdmin, requireCompanyAdmin, requireSheetAccess, hasSheetAccess } from "./middleware/auth";
import rateLimit from "express-rate-limit";
import * as XLSX from "xlsx";
import crypto from "crypto";
import { seedData } from "./seed";
import { validateLeadAgainstRules } from "@shared/validator";
import { insertQuickFilterSchema, quickFilterConfigSchema } from "@shared/schema";

const HMAC_SECRET = process.env.HMAC_SECRET || "dabluz-webhook-secret-change-in-production";

// Helper function to generate mock values for webhook sample payload
function generateMockValue(fieldKey: string, fieldType?: string): string {
  // Generate realistic sample values based on field type and name
  const lowerKey = fieldKey.toLowerCase();
  
  // Date fields
  if (fieldType === 'date' || lowerKey.includes('date')) {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }
  
  // Time fields
  if (lowerKey.includes('time')) {
    return '14:30';
  }
  
  // Number fields
  if (fieldType === 'number' || lowerKey.includes('age') || lowerKey.includes('amount') || lowerKey.includes('price')) {
    return '25';
  }
  
  // Phone/Mobile fields
  if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
    return '9876543210';
  }
  
  // WhatsApp fields
  if (lowerKey.includes('whatsapp') || lowerKey.includes('wa')) {
    return '9876543210';
  }
  
  // Email fields
  if (lowerKey.includes('email') || lowerKey.includes('mail')) {
    return 'john.doe@example.com';
  }
  
  // Name fields
  if (lowerKey.includes('name')) {
    return 'John Doe';
  }
  
  // Status fields
  if (lowerKey.includes('status')) {
    return 'Active';
  }
  
  // Source fields
  if (lowerKey.includes('source')) {
    return 'Website';
  }
  
  // Language fields
  if (lowerKey.includes('lang') || lowerKey.includes('language')) {
    return 'English';
  }
  
  // Occupation fields
  if (lowerKey.includes('occupation') || lowerKey.includes('job')) {
    return 'Software Engineer';
  }
  
  // Qualification/Education fields
  if (lowerKey.includes('qualification') || lowerKey.includes('education') || lowerKey.includes('degree')) {
    return 'Bachelor\'s Degree';
  }
  
  // Location/Address fields
  if (lowerKey.includes('city') || lowerKey.includes('location') || lowerKey.includes('address')) {
    return 'Mumbai';
  }
  
  // Campaign/Marketing fields
  if (lowerKey.includes('campaign') || lowerKey.includes('utm')) {
    return 'Summer2025';
  }
  
  // Default: generic text
  return 'Sample Value';
}

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

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: "Too many signup attempts, please try again later",
});

const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Too many invite attempts, please try again later",
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      credentials: true,
    },
  });

  // Socket.io connection handling with company isolation
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Defensive validation: only allow joining sheets user has access to
    socket.on("join_sheet", async (sheetId: string) => {
      try {
        // Extract and verify JWT token
        const token = socket.handshake.auth.token;
        if (!token) {
          console.warn(`Socket ${socket.id} attempted to join sheet without auth - REJECTED`);
          return;
        }

        // Verify JWT and decode user info
        let decoded: any;
        try {
          const JWT_SECRET = process.env.JWT_SECRET || "dabluz-crm-secret-key-change-in-production";
          decoded = jwt.verify(token, JWT_SECRET) as any;
        } catch (error) {
          console.warn(`Socket ${socket.id} has invalid JWT token - REJECTED`);
          return;
        }

        const userId = decoded.userId;
        const userRole = decoded.role;
        const userCompanyId = decoded.companyId;

        // Verify sheet exists and is not deleted
        const sheet = await storage.getSheet(sheetId);
        if (!sheet || sheet.deleted_at) {
          console.warn(`Socket ${socket.id} attempted to join non-existent sheet ${sheetId} - REJECTED`);
          return;
        }

        // Super admins have access to all sheets
        if (userRole === "super_admin") {
          socket.join(`sheet:${sheetId}`);
          console.log(`Socket ${socket.id} (super admin) joined sheet:${sheetId}`);
          return;
        }

        // Check if user has access to this sheet
        const sheetUser = await storage.getSheetUser(sheetId, userId);
        
        // For personal sheets: verify company_id matches or user is owner
        if (sheet.is_personal) {
          if (sheet.company_id !== userCompanyId && sheet.owner_id !== userId) {
            console.warn(`Socket ${socket.id} attempted to join sheet from different company - REJECTED`);
            return;
          }
          if (sheet.owner_id === userId || sheetUser) {
            socket.join(`sheet:${sheetId}`);
            console.log(`Socket ${socket.id} joined personal sheet:${sheetId}`);
            return;
          }
          console.warn(`Socket ${socket.id} no permission for personal sheet ${sheetId} - REJECTED`);
          return;
        }

        // For restricted company sheets: require explicit permission
        if (sheet.visibility === "restricted") {
          if (sheet.company_id !== userCompanyId) {
            console.warn(`Socket ${socket.id} attempted to join sheet from different company - REJECTED`);
            return;
          }
          if (sheetUser) {
            socket.join(`sheet:${sheetId}`);
            console.log(`Socket ${socket.id} joined restricted sheet:${sheetId}`);
            return;
          }
          console.warn(`Socket ${socket.id} no permission for restricted sheet ${sheetId} - REJECTED`);
          return;
        }

        // For company sheets: all company members have access
        if (sheet.visibility === "company" && sheet.company_id === userCompanyId) {
          socket.join(`sheet:${sheetId}`);
          console.log(`Socket ${socket.id} joined company sheet:${sheetId}`);
          return;
        }

        console.warn(`Socket ${socket.id} no access to sheet ${sheetId} - REJECTED`);
      } catch (error) {
        console.error(`Error joining sheet ${sheetId}:`, error);
      }
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
  // PUBLIC ROUTES (Unauthenticated)
  // ============================================================================
  
  // Company Signup
  app.post("/api/public/signup", signupLimiter, async (req, res) => {
    try {
      const { companySignupSchema } = await import("@shared/schema");
      const validatedData = companySignupSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(validatedData.admin_email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(validatedData.admin_password, 10);

      // Create company with admin user (transactional)
      const { company, admin } = await storage.createCompanyWithAdmin(
        validatedData.company_name,
        validatedData.admin_name,
        validatedData.admin_email,
        passwordHash
      );

      // Generate JWT token
      const token = generateToken(admin.id, admin.role, company.id);

      const { password_hash: _, ...adminWithoutPassword } = admin;
      res.status(201).json({
        message: "Company created successfully",
        company,
        user: adminWithoutPassword,
        token,
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Get Invite by Code (view invite details before accepting)
  app.get("/api/public/invites/:code", inviteLimiter, async (req, res) => {
    try {
      const invite = await storage.getInviteByCode(req.params.code);
      
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      // Check if invite is expired
      if (new Date(invite.expires_at) < new Date()) {
        return res.status(400).json({ error: "Invite has expired" });
      }

      // Check if already accepted
      if (invite.status === "accepted") {
        return res.status(400).json({ error: "Invite has already been used" });
      }

      // Get company info
      const company = await storage.getCompany(invite.company_id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Return invite details (without sensitive info)
      res.json({
        email: invite.email,
        role: invite.role,
        company_name: company.name,
        expires_at: invite.expires_at,
      });
    } catch (error: any) {
      console.error("Get invite error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Accept Invite (create user account and join company)
  app.post("/api/public/invites/:code/accept", inviteLimiter, async (req, res) => {
    try {
      const { acceptInviteSchema } = await import("@shared/schema");
      const validatedData = acceptInviteSchema.parse(req.body);
      
      const invite = await storage.getInviteByCode(req.params.code);
      
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      // Check if invite is expired
      if (new Date(invite.expires_at) < new Date()) {
        await storage.updateInvite(invite.id, { status: "expired" });
        return res.status(400).json({ error: "Invite has expired" });
      }

      // Check if already accepted
      if (invite.status === "accepted") {
        return res.status(400).json({ error: "Invite has already been used" });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(invite.email);
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(validatedData.password, 10);

      // Create user account
      const user = await storage.createUser({
        company_id: invite.company_id,
        name: validatedData.name,
        email: invite.email,
        password_hash: passwordHash,
        role: invite.role,
        invited_by: invite.inviter_id,
      } as any);

      // Mark invite as accepted
      await storage.updateInvite(invite.id, {
        status: "accepted",
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
      });

      // Create audit log
      await storage.createAuditLog({
        user_id: user.id,
        company_id: user.company_id,
        action: "invite_accepted",
        model: "User",
        model_id: user.id,
        payload: { invite_id: invite.id },
      });

      // Generate JWT token
      const token = generateToken(user.id, user.role, user.company_id!);

      // Get company info
      const company = await storage.getCompany(user.company_id!);

      const { password_hash: _, ...userWithoutPassword } = user;
      res.status(201).json({
        message: "Account created successfully",
        user: userWithoutPassword,
        company,
        token,
      });
    } catch (error: any) {
      console.error("Accept invite error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Public Webhook Ingestion Endpoint
  app.post("/api/public/webhooks/:token", webhookLimiter, async (req, res) => {
    let webhook;
    let requestStatus: "success" | "failed" | "pending_configuration" = "failed";
    let errorMessage: string | null = null;
    let createdLeadId: string | null = null;
    let targetSheetId: string | null = null;
    let alreadyLogged = false; // Track if we've already logged this request

    try {
      // Find webhook by token
      webhook = await storage.getCompanyWebhookByToken(req.params.token);
      
      if (!webhook) {
        errorMessage = "Invalid webhook token";
        return res.status(404).json({ error: errorMessage });
      }

      // Check if webhook is active
      if (!webhook.is_active) {
        errorMessage = "Webhook is inactive";
        return res.status(403).json({ error: errorMessage });
      }

      // Get field mappings and allocation rules
      const fieldMappings = await storage.getWebhookFieldMappings(webhook.id);
      const allocationRules = await storage.getWebhookAllocationRules(webhook.id);

      // If no allocation rules configured, accept the data but don't create a lead
      // This allows users to test webhooks and see field names before completing configuration
      if (allocationRules.length === 0) {
        requestStatus = "pending_configuration";
        // Log request before returning so status is properly recorded
        await storage.createWebhookRequest({
          webhook_id: webhook.id,
          status: requestStatus,
          payload: req.body,
          headers: req.headers as any,
          error_message: null,
          lead_id: null,
          allocated_sheet_id: null,
        });
        alreadyLogged = true; // Prevent duplicate logging in finally block
        
        return res.status(200).json({ 
          success: true,
          message: "Webhook data received. Please configure allocation rules in your CRM to start creating leads.",
          status: "pending_configuration"
        });
      }

      // Helper function to extract value from nested object using dot notation
      const getNestedValue = (obj: any, path: string): any => {
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
          if (current && typeof current === 'object' && key in current) {
            current = current[key];
          } else {
            return undefined;
          }
        }
        
        return current;
      };

      // Apply field mappings to transform webhook payload to lead data
      const incomingData = req.body;
      const leadData: any = {};

      // Map webhook fields to sheet column keys (supports dot notation for nested fields)
      for (const mapping of fieldMappings) {
        const value = getNestedValue(incomingData, mapping.webhook_field);
        if (value !== undefined && value !== null) {
          leadData[mapping.sheet_column_key] = value;
        }
      }

      // Helper function to evaluate conditions
      const evaluateCondition = (rule: any, webhookData: any): boolean => {
        // Default rules (no condition fields) are NOT evaluated in the main filter
        // They are only used as fallback when no other rules match
        if (!rule.condition_field || !rule.condition_operator || !rule.condition_value) {
          return false;
        }

        // Extract value from webhook data using dot notation
        const actualValue = getNestedValue(webhookData, rule.condition_field);
        if (actualValue === undefined || actualValue === null) {
          return false;
        }

        // Convert to string for comparison
        const actualStr = String(actualValue).toLowerCase();
        const expectedStr = String(rule.condition_value).toLowerCase();

        // Evaluate based on operator
        switch (rule.condition_operator) {
          case "equals":
            return actualStr === expectedStr;
          case "contains":
            return actualStr.includes(expectedStr);
          case "starts_with":
            return actualStr.startsWith(expectedStr);
          default:
            return false;
        }
      };

      // Filter allocation rules based on conditions
      let applicableRules = allocationRules.filter(rule => evaluateCondition(rule, incomingData));

      // If no rules match conditions, fall back to default rules
      if (applicableRules.length === 0) {
        applicableRules = allocationRules.filter(rule => rule.is_default === true);
      }

      // If still no rules, error out
      if (applicableRules.length === 0) {
        errorMessage = "No allocation rules match the incoming data and no default rules configured";
        return res.status(400).json({ error: errorMessage });
      }

      // Validate percentages sum to 100 for applicable rules
      const totalPercentage = applicableRules.reduce((sum, rule) => sum + rule.percentage, 0);
      if (totalPercentage !== 100) {
        errorMessage = `Matching allocation rules percentages must sum to 100 (current: ${totalPercentage}%)`;
        return res.status(400).json({ error: errorMessage });
      }

      // Determine which sheet to allocate to using round-robin with percentage distribution
      let targetSheetId: string;
      
      // Get the last allocated sheet to continue round-robin
      const lastAllocatedSheetId = webhook.last_allocated_sheet_id;
      
      // Find next sheet in round-robin order within applicable rules
      if (!lastAllocatedSheetId) {
        // First allocation - use the first sheet in the applicable rules
        targetSheetId = applicableRules[0].sheet_id;
      } else {
        // Find current sheet index in applicable rules
        const currentIndex = applicableRules.findIndex(rule => rule.sheet_id === lastAllocatedSheetId);
        
        if (currentIndex === -1) {
          // Last allocated sheet not found in current applicable rules, start from first
          targetSheetId = applicableRules[0].sheet_id;
        } else {
          // Use weighted round-robin: rotate through sheets
          const nextIndex = (currentIndex + 1) % applicableRules.length;
          targetSheetId = applicableRules[nextIndex].sheet_id;
        }
      }

      // Verify target sheet exists and belongs to the company
      const targetSheet = await storage.getSheet(targetSheetId);
      if (!targetSheet) {
        errorMessage = "Target sheet not found";
        return res.status(404).json({ error: errorMessage });
      }

      if (targetSheet.company_id !== webhook.company_id) {
        errorMessage = "Sheet does not belong to webhook company";
        return res.status(403).json({ error: errorMessage });
      }

      // Get webhook creator to use as lead owner
      const webhookCreator = await storage.getUser(webhook.created_by_user_id);
      if (!webhookCreator) {
        errorMessage = "Webhook creator not found";
        return res.status(500).json({ error: errorMessage });
      }

      // Create the lead in the target sheet with all fields in custom_fields
      const lead = await storage.createLead({
        sheet_id: targetSheetId,
        owner_user_id: webhook.created_by_user_id,
        custom_fields: {
          name: leadData.name || "",
          mobile_no: leadData.mobile_no || "",
          whatsapp: leadData.whatsapp || leadData.mobile_no || "",
          lang: leadData.lang || "",
          occupation: leadData.occupation || "",
          qualification: leadData.qualification || "",
          lead_date: leadData.lead_date || new Date().toISOString().split('T')[0],
          lead_time: leadData.lead_time || new Date().toTimeString().split(' ')[0].substring(0, 5),
          lead_status: leadData.lead_status || "New",
          visit_status: leadData.visit_status || "Not Visited",
          ...leadData,
        },
        meta: leadData.meta || {},
      });

      createdLeadId = lead.id;

      // Update webhook's last allocated sheet for round-robin
      await storage.updateCompanyWebhook(webhook.id, {
        last_allocated_sheet_id: targetSheetId,
      });

      requestStatus = "success";
      res.status(201).json({ 
        success: true, 
        lead_id: lead.id,
        sheet_id: targetSheetId,
        message: "Lead created successfully"
      });
    } catch (error: any) {
      console.error("Webhook ingestion error:", error);
      errorMessage = error.message;
      res.status(500).json({ error: errorMessage });
    } finally {
      // Log webhook request regardless of success or failure (unless already logged)
      if (webhook && !alreadyLogged) {
        try {
          await storage.createWebhookRequest({
            webhook_id: webhook.id,
            status: requestStatus,
            payload: req.body,
            headers: req.headers as any,
            error_message: errorMessage,
            lead_id: createdLeadId,
            allocated_sheet_id: createdLeadId ? targetSheetId : null,
          });
        } catch (logError: any) {
          console.error("Failed to log webhook request:", logError);
        }
      }
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

      // Soft delete by setting status to suspended
      const updated = await storage.updateCompany(req.params.id, { status: "suspended" });

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
  app.get("/api/admin/company/users", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      // Company admins can only see users in their company
      if (!req.companyId) {
        return res.status(403).json({ error: "No company context" });
      }
      const users = await storage.getUsersByCompanyId(req.companyId);
      const usersWithoutPasswords = users.map(u => {
        const { password_hash, ...rest } = u;
        return rest;
      });
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      console.error("Get company users error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/company/users", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { name, email, password, role } = req.body;

      // Company admins can only create users in their own company
      if (!req.companyId) {
        return res.status(400).json({ error: "No company context" });
      }

      // Validate role - only user or company_admin allowed
      if (role && role !== "user" && role !== "company_admin") {
        return res.status(403).json({ error: "Invalid role. Only 'user' or 'company_admin' allowed" });
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
        company_id: req.companyId,
        invited_by: req.userId,
      } as any);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId,
        action: "create",
        model: "user",
        model_id: user.id,
        payload: { email, role: user.role },
      });

      const { password_hash: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      console.error("Create company user error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/company/users/:userId", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;

      // Prevent self-deletion
      if (userId === req.userId) {
        return res.status(403).json({ error: "Cannot delete your own account" });
      }

      // Verify user belongs to company
      const userToDelete = await storage.getUser(userId);
      if (!userToDelete) {
        return res.status(404).json({ error: "User not found" });
      }

      // Company admins can only delete users in their own company
      if (req.userRole === "company_admin" && userToDelete.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot delete users from other companies" });
      }

      // Ensure at least one company admin remains
      if (userToDelete.role === "company_admin") {
        const companyAdmins = await storage.getUsersByCompanyId(userToDelete.company_id!);
        const adminCount = companyAdmins.filter(u => u.role === "company_admin").length;
        if (adminCount <= 1) {
          return res.status(403).json({ error: "Cannot delete the last company admin. Promote another user first." });
        }
      }

      // Delete user and cleanup
      await storage.deleteUser(userId);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId!,
        action: "delete",
        model: "user",
        model_id: userId,
        payload: { email: userToDelete.email, role: userToDelete.role },
      });

      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: error.message });
    }
  });

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
  // INVITE MANAGEMENT (Company Admin)
  // ============================================================================
  
  // Create invite
  app.post("/api/admin/company/invites", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { email, role } = req.body;

      if (!req.companyId) {
        return res.status(403).json({ error: "Must belong to a company" });
      }

      // Validate role
      const validRoles = ["user", "company_admin"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      // Check if user already exists with this email
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Check if there's already a pending invite for this email
      const companyInvites = await storage.getInvitesByCompany(req.companyId);
      const pendingInvite = companyInvites.find(
        inv => inv.email === email && inv.status === "pending" && new Date(inv.expires_at) > new Date()
      );
      
      if (pendingInvite) {
        return res.status(400).json({ 
          error: "Active invite already exists for this email",
          invite_code: pendingInvite.code
        });
      }

      // Create invite
      const invite = await storage.createInvite({
        company_id: req.companyId,
        email,
        role,
        inviter_id: req.userId!,
      } as any);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId,
        action: "invite_created",
        model: "Invite",
        model_id: invite.id,
        payload: { email, role, code: invite.code },
      });

      res.status(201).json(invite);
    } catch (error: any) {
      console.error("Create invite error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // List company invites
  app.get("/api/admin/company/invites", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: "Must belong to a company" });
      }

      const invites = await storage.getInvitesByCompany(req.companyId);
      
      // Enrich with inviter info
      const enrichedInvites = await Promise.all(
        invites.map(async (invite) => {
          const inviter = invite.inviter_id ? await storage.getUser(invite.inviter_id) : null;
          const acceptedBy = invite.accepted_by ? await storage.getUser(invite.accepted_by) : null;
          
          return {
            ...invite,
            inviter_name: inviter?.name || null,
            accepted_by_name: acceptedBy?.name || null,
          };
        })
      );

      res.json(enrichedInvites);
    } catch (error: any) {
      console.error("Get invites error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete/Revoke invite
  app.delete("/api/admin/company/invites/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const invite = await storage.getInvite(req.params.id);
      
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      // Company admins can only delete invites from their company
      if (invite.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot delete invites from other companies" });
      }

      await storage.deleteInvite(req.params.id);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId!,
        action: "invite_deleted",
        model: "Invite",
        model_id: req.params.id,
        payload: { email: invite.email },
      });

      res.json({ message: "Invite deleted" });
    } catch (error: any) {
      console.error("Delete invite error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // WEBHOOK MANAGEMENT (Company Admin)
  // ============================================================================
  
  // Get all webhooks for the company
  app.get("/api/admin/company/webhooks", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: "Must belong to a company" });
      }

      const webhooks = await storage.getCompanyWebhooksByCompanyId(req.companyId);
      res.json(webhooks);
    } catch (error: any) {
      console.error("Get webhooks error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate sample webhook payload based on company's custom columns
  // IMPORTANT: This must come BEFORE the /:id route to avoid matching "sample-payload" as an id
  app.get("/api/admin/company/webhooks/sample-payload", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: "Must belong to a company" });
      }

      // Get company's custom columns
      const customColumns = await storage.getCompanyColumns(req.companyId);
      
      // Build sample payload with fixed fields + custom fields
      const samplePayload: Record<string, string> = {};
      
      // Add fixed CRM fields with labels
      const fixedFields = [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'mobile_no', label: 'Mobile Number', type: 'text' },
        { key: 'whatsapp', label: 'WhatsApp', type: 'text' },
        { key: 'lang', label: 'Language', type: 'text' },
        { key: 'occupation', label: 'Occupation', type: 'text' },
        { key: 'qualification', label: 'Qualification', type: 'text' },
        { key: 'lead_date', label: 'Lead Date', type: 'date' },
        { key: 'lead_time', label: 'Lead Time', type: 'text' },
        { key: 'lead_status', label: 'Lead Status', type: 'text' },
        { key: 'visit_status', label: 'Visit Status', type: 'text' },
      ];
      
      fixedFields.forEach(field => {
        samplePayload[field.key] = generateMockValue(field.key, field.type);
      });
      
      // Add custom columns from the company
      const customFieldOptions: Array<{ key: string; label: string }> = [];
      customColumns.forEach(column => {
        // Use the column_key for the field key
        const fieldKey = column.column_key;
        samplePayload[fieldKey] = generateMockValue(fieldKey, column.type);
        customFieldOptions.push({ key: fieldKey, label: column.name });
      });
      
      // Return both sample payload and available field options (fixed + custom)
      res.json({
        samplePayload,
        availableFields: [
          ...fixedFields.map(f => ({ key: f.key, label: f.label })),
          ...customFieldOptions
        ]
      });
    } catch (error: any) {
      console.error("Generate sample payload error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get webhook details with mappings and allocation rules
  app.get("/api/admin/company/webhooks/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const webhook = await storage.getCompanyWebhook(req.params.id);
      
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      // Company admins can only view webhooks from their company
      if (webhook.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot view webhooks from other companies" });
      }

      // Get field mappings and allocation rules
      const fieldMappings = await storage.getWebhookFieldMappings(webhook.id);
      const allocationRules = await storage.getWebhookAllocationRules(webhook.id);

      res.json({
        ...webhook,
        field_mappings: fieldMappings,
        allocation_rules: allocationRules,
      });
    } catch (error: any) {
      console.error("Get webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new webhook
  app.post("/api/admin/company/webhooks", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: "Must belong to a company" });
      }

      const { name, is_active } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      // Generate secure token and secret
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const secret = crypto.randomBytes(32).toString("hex");

      // Create webhook
      const webhook = await storage.createCompanyWebhook({
        company_id: req.companyId,
        name,
        token,
        secret,
        is_active: is_active ?? true,
        last_allocated_sheet_id: null,
        created_by_user_id: req.userId!,
      });

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId,
        action: "webhook_created",
        model: "CompanyWebhook",
        model_id: webhook.id,
        payload: { name, token_preview: `${token.substring(0, 8)}...` },
      });

      res.status(201).json(webhook);
    } catch (error: any) {
      console.error("Create webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update webhook
  app.put("/api/admin/company/webhooks/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const webhook = await storage.getCompanyWebhook(req.params.id);
      
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      // Company admins can only update webhooks from their company
      if (webhook.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot update webhooks from other companies" });
      }

      const { name, is_active, field_mappings, allocation_rules } = req.body;

      // Update webhook basic info
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (is_active !== undefined) updates.is_active = is_active;

      const updatedWebhook = await storage.updateCompanyWebhook(req.params.id, updates);

      // Update field mappings if provided
      if (field_mappings) {
        // Delete existing mappings
        await storage.deleteWebhookFieldMappingsByWebhookId(req.params.id);
        
        // Create new mappings
        for (const mapping of field_mappings) {
          await storage.createWebhookFieldMapping({
            webhook_id: req.params.id,
            webhook_field: mapping.webhook_field,
            sheet_column_key: mapping.sheet_column_key,
          });
        }
      }

      // Update allocation rules if provided
      if (allocation_rules) {
        // Validate allocation rules
        // Filter out invalid rules
        const validRules = allocation_rules.filter((r: any) => {
          // Must have sheet_id and percentage
          if (!r.sheet_id || r.percentage <= 0) return false;
          
          // If not default, must have complete condition
          if (!r.is_default) {
            if (!r.condition_field || !r.condition_operator || !r.condition_value) {
              return false;
            }
          }
          
          return true;
        });

        if (validRules.length === 0) {
          return res.status(400).json({ error: "At least one complete allocation rule is required" });
        }

        // Group rules by condition and validate each group totals 100%
        const groups: Record<string, { total: number, label: string }> = {};
        
        validRules.forEach((rule: any) => {
          let groupKey: string;
          let groupLabel: string;
          
          if (rule.is_default) {
            groupKey = 'default';
            groupLabel = 'Default/Fallback Rules';
          } else {
            groupKey = `${rule.condition_field}|${rule.condition_operator}|${rule.condition_value}`;
            groupLabel = `${rule.condition_field} ${rule.condition_operator} "${rule.condition_value}"`;
          }
          
          if (!groups[groupKey]) {
            groups[groupKey] = { total: 0, label: groupLabel };
          }
          
          groups[groupKey].total += rule.percentage || 0;
        });

        // Check each group totals 100%
        const invalidGroups = Object.entries(groups).filter(([_, group]) => group.total !== 100);
        
        if (invalidGroups.length > 0) {
          const errorMessages = invalidGroups.map(([_, group]) => 
            `${group.label}: ${group.total}% (must be 100%)`
          ).join(', ');
          
          return res.status(400).json({ 
            error: `Each condition group must total exactly 100%. Issues: ${errorMessages}` 
          });
        }

        // Delete existing rules
        await storage.deleteWebhookAllocationRulesByWebhookId(req.params.id);
        
        // Create new validated rules
        for (const rule of validRules) {
          await storage.createWebhookAllocationRule({
            webhook_id: req.params.id,
            sheet_id: rule.sheet_id,
            percentage: rule.percentage,
            condition_field: rule.condition_field || null,
            condition_operator: rule.condition_operator || null,
            condition_value: rule.condition_value || null,
            is_default: rule.is_default || false,
            priority: rule.priority || 0,
          });
        }
      }

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId!,
        action: "webhook_updated",
        model: "CompanyWebhook",
        model_id: req.params.id,
        payload: { name, is_active, has_mappings: !!field_mappings, has_rules: !!allocation_rules },
      });

      res.json(updatedWebhook);
    } catch (error: any) {
      console.error("Update webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete webhook
  app.delete("/api/admin/company/webhooks/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const webhook = await storage.getCompanyWebhook(req.params.id);
      
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      // Company admins can only delete webhooks from their company
      if (webhook.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot delete webhooks from other companies" });
      }

      await storage.deleteCompanyWebhook(req.params.id);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId!,
        action: "webhook_deleted",
        model: "CompanyWebhook",
        model_id: req.params.id,
        payload: { name: webhook.name },
      });

      res.json({ message: "Webhook deleted" });
    } catch (error: any) {
      console.error("Delete webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get webhook requests/logs for a specific webhook
  app.get("/api/admin/company/webhooks/:id/requests", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const webhook = await storage.getCompanyWebhook(req.params.id);
      
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      // Company admins can only view webhooks from their company
      if (webhook.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot view webhooks from other companies" });
      }

      const requests = await storage.getWebhookRequests(req.params.id);
      res.json(requests);
    } catch (error: any) {
      console.error("Get webhook requests error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all webhook requests for the company
  app.get("/api/admin/company/webhook-requests", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: "Must belong to a company" });
      }

      const requests = await storage.getWebhookRequestsByCompanyId(req.companyId);
      res.json(requests);
    } catch (error: any) {
      console.error("Get webhook requests error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // SHEETS
  // ============================================================================
  app.get("/api/sheets", authMiddleware, async (req: AuthRequest, res) => {
    try {
      let sheets;
      
      if (req.userRole === "super_admin") {
        // Super admins can see all sheets
        sheets = await storage.getAllSheets();
      } else if (req.userRole === "company_admin") {
        // Company admins see all sheets in their company
        sheets = await storage.getSheetsByCompanyId(req.companyId!);
      } else {
        // Regular users see only sheets they have access to
        sheets = await storage.getSheetsByUserId(req.userId!);
      }
      
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
  // SHEET USER ASSIGNMENT (Company Admin)
  // ============================================================================
  app.get("/api/admin/sheets/:sheetId/users", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { sheetId } = req.params;
      
      // Verify sheet exists and belongs to company
      const sheet = await storage.getSheet(sheetId);
      if (!sheet || sheet.deleted_at) {
        return res.status(404).json({ error: "Sheet not found" });
      }
      
      // Company admins can only manage sheets in their own company
      if (req.userRole === "company_admin" && sheet.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot access sheets from other companies" });
      }
      
      // Get assigned users
      const sheetUsers = await storage.getSheetUsers(sheetId);
      
      // Get full user details
      const usersWithDetails = await Promise.all(
        sheetUsers.map(async (su) => {
          const user = await storage.getUser(su.user_id);
          return {
            ...su,
            user_name: user?.name,
            user_email: user?.email,
          };
        })
      );
      
      res.json(usersWithDetails);
    } catch (error: any) {
      console.error("Get sheet users error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/sheets/:sheetId/users", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { sheetId } = req.params;
      const { user_id, role } = req.body;
      
      // Verify sheet exists and belongs to company
      const sheet = await storage.getSheet(sheetId);
      if (!sheet || sheet.deleted_at) {
        return res.status(404).json({ error: "Sheet not found" });
      }
      
      // Company admins can only manage sheets in their own company
      if (req.userRole === "company_admin" && sheet.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot access sheets from other companies" });
      }
      
      // Verify user exists and belongs to same company
      const userToAssign = await storage.getUser(user_id);
      if (!userToAssign) {
        return res.status(404).json({ error: "User not found" });
      }
      if (userToAssign.company_id !== sheet.company_id) {
        return res.status(403).json({ error: "User must belong to the same company" });
      }
      
      // Check if user is already assigned
      const existing = await storage.getSheetUser(sheetId, user_id);
      if (existing) {
        return res.status(400).json({ error: "User is already assigned to this sheet" });
      }
      
      // Create assignment
      const sheetUser = await storage.createSheetUser({
        sheet_id: sheetId,
        user_id,
        role: role || "editor",
      });
      
      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId!,
        action: "create",
        model: "sheet_user",
        model_id: sheetUser.id,
        payload: { sheet_id: sheetId, assigned_user_id: user_id, role: sheetUser.role },
      });
      
      res.status(201).json(sheetUser);
    } catch (error: any) {
      console.error("Assign user to sheet error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/sheets/:sheetId/users/:userId", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { sheetId, userId } = req.params;
      
      // Verify sheet exists and belongs to company
      const sheet = await storage.getSheet(sheetId);
      if (!sheet || sheet.deleted_at) {
        return res.status(404).json({ error: "Sheet not found" });
      }
      
      // Company admins can only manage sheets in their own company
      if (req.userRole === "company_admin" && sheet.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot access sheets from other companies" });
      }
      
      // Verify user exists and belongs to same company
      const userToUnassign = await storage.getUser(userId);
      if (!userToUnassign) {
        return res.status(404).json({ error: "User not found" });
      }
      if (userToUnassign.company_id !== sheet.company_id) {
        return res.status(403).json({ error: "User must belong to the same company" });
      }
      
      // Get sheet user assignment
      const sheetUser = await storage.getSheetUser(sheetId, userId);
      if (!sheetUser) {
        return res.status(404).json({ error: "User is not assigned to this sheet" });
      }
      
      // Prevent removing the sheet owner
      if (sheet.owner_id === userId) {
        return res.status(403).json({ error: "Cannot remove the sheet owner" });
      }
      
      // Delete assignment
      await storage.deleteSheetUser(sheetUser.id);
      
      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId!,
        action: "delete",
        model: "sheet_user",
        model_id: sheetUser.id,
        payload: { sheet_id: sheetId, unassigned_user_id: userId },
      });
      
      res.json({ message: "User unassigned successfully" });
    } catch (error: any) {
      console.error("Unassign user from sheet error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // LEADS
  // ============================================================================
  app.get("/api/sheets/:id/leads", authMiddleware, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      const leads = await storage.getLeadsBySheetId(req.params.id);
      res.json(leads);
    } catch (error: any) {
      console.error("Get leads error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sheets/:id/leads", authMiddleware, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      // Get sheet to access company_id
      const sheet = await storage.getSheet(req.params.id);
      if (!sheet || sheet.deleted_at) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      // Check if user has edit permission (not just view)
      if (req.userRole !== "super_admin" && req.userRole !== "company_admin") {
        const sheetUser = await storage.getSheetUser(req.params.id, req.userId!);
        if (sheetUser && sheetUser.role === "viewer") {
          return res.status(403).json({ error: "Viewers cannot create leads" });
        }
      }

      // Remove owner_user_id from req.body to prevent client spoofing
      const { owner_user_id, ...leadData } = req.body;
      
      // Validate required custom fields
      const customColumns = await storage.getCustomColumns(req.params.id);
      const requiredColumns = customColumns.filter(col => col.config.required);
      const missingFields = requiredColumns.filter(col => {
        const value = leadData.custom_fields?.[col.column_key];
        // Check for null/undefined (nullish), but allow false, 0
        if (value === null || value === undefined) return true;
        // For text fields, check if they're just whitespace
        if (col.type === "text" && typeof value === "string" && value.trim() === "") return true;
        return false;
      });
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: "Missing required fields",
          missingFields: missingFields.map(col => col.name)
        });
      }
      
      // Validate boolean field types
      const booleanColumns = customColumns.filter(col => col.type === "boolean");
      const invalidBooleanFields = booleanColumns.filter(col => {
        const value = leadData.custom_fields?.[col.column_key];
        if (value === null || value === undefined) return false; // Allow nullish for optional fields
        return typeof value !== "boolean";
      });
      
      if (invalidBooleanFields.length > 0) {
        return res.status(400).json({
          error: "Invalid boolean field values",
          invalidFields: invalidBooleanFields.map(col => col.name)
        });
      }
      
      // Validate dropdown field values are in defined options
      const dropdownColumns = customColumns.filter(col => col.type === "dropdown" && col.config.dropdown_options);
      const invalidDropdownFields = dropdownColumns.filter(col => {
        const value = leadData.custom_fields?.[col.column_key];
        if (value === null || value === undefined) return false; // Allow nullish for optional fields
        const options = col.config.dropdown_options || [];
        return !options.includes(value);
      });
      
      if (invalidDropdownFields.length > 0) {
        return res.status(400).json({
          error: "Invalid dropdown values",
          invalidFields: invalidDropdownFields.map(col => `${col.name} (value not in options)`)
        });
      }
      
      // Validate mobile number fields (10 digits)
      const { validateMobileNumber } = await import("@shared/validator");
      const mobileColumns = customColumns.filter(col => col.type === "mobile");
      const invalidMobileFields: { name: string; error: string }[] = [];
      
      for (const col of mobileColumns) {
        const value = leadData.custom_fields?.[col.column_key];
        if (value !== null && value !== undefined && value !== '') {
          const validationResult = validateMobileNumber(value);
          if (!validationResult.isValid) {
            invalidMobileFields.push({ name: col.name, error: validationResult.error || "Invalid" });
          }
        }
      }
      
      if (invalidMobileFields.length > 0) {
        return res.status(400).json({
          error: "Invalid mobile number format",
          invalidFields: invalidMobileFields.map(f => `${f.name}: ${f.error}`)
        });
      }
      
      const lead = await storage.createLead({
        ...leadData,
        sheet_id: req.params.id,
        owner_user_id: req.userId!, // Force to authenticated user
      });

      // Audit log with company_id
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: sheet.company_id,
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

      // Check if user has access to the lead's sheet
      const hasAccess = await hasSheetAccess(req.userId!, req.userRole!, req.companyId || null, lead.sheet_id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
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

      // Get sheet to access company_id
      const sheet = await storage.getSheet(lead.sheet_id);
      if (!sheet) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      // Check if user has access to the lead's sheet
      const hasAccess = await hasSheetAccess(req.userId!, req.userRole!, req.companyId || null, lead.sheet_id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if user has edit permission (not just view)
      if (req.userRole !== "super_admin" && req.userRole !== "company_admin") {
        const sheetUser = await storage.getSheetUser(lead.sheet_id, req.userId!);
        if (sheetUser && sheetUser.role === "viewer") {
          return res.status(403).json({ error: "Viewers cannot edit leads" });
        }
      }

      // Validate mobile number fields if present in update (10 digits)
      if (req.body.custom_fields) {
        const { validateMobileNumber } = await import("@shared/validator");
        const customColumns = await storage.getCustomColumns(lead.sheet_id);
        const mobileColumns = customColumns.filter(col => col.type === "mobile");
        const invalidMobileFields: { name: string; error: string }[] = [];
        
        for (const col of mobileColumns) {
          const value = req.body.custom_fields[col.column_key];
          if (value !== null && value !== undefined && value !== '') {
            const validationResult = validateMobileNumber(value);
            if (!validationResult.isValid) {
              invalidMobileFields.push({ name: col.name, error: validationResult.error || "Invalid" });
            }
          }
        }
        
        if (invalidMobileFields.length > 0) {
          return res.status(400).json({
            error: "Invalid mobile number format",
            invalidFields: invalidMobileFields.map(f => `${f.name}: ${f.error}`)
          });
        }
      }

      const updated = await storage.updateLead(req.params.id, req.body);

      // Audit log with company_id
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: sheet.company_id,
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

      // Get sheet to access company_id
      const sheet = await storage.getSheet(lead.sheet_id);
      if (!sheet) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      // Check if user has access to the lead's sheet
      const hasAccess = await hasSheetAccess(req.userId!, req.userRole!, req.companyId || null, lead.sheet_id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Only company admins and super admins can delete leads
      if (req.userRole !== "super_admin" && req.userRole !== "company_admin") {
        return res.status(403).json({ error: "Only admin users can delete leads" });
      }

      await storage.deleteLead(req.params.id, req.userId!);

      // Audit log with company_id
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: sheet.company_id,
        action: "delete",
        model: "lead",
        model_id: req.params.id,
        payload: {},
      });

      // Emit socket event for real-time updates
      const io = app.get("io") as SocketIOServer;
      io.to(`sheet_${lead.sheet_id}`).emit("lead_deleted", { leadId: req.params.id, sheetId: lead.sheet_id });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete lead error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get deleted leads for a sheet
  app.get("/api/sheets/:id/deleted-leads", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const sheet = await storage.getSheet(req.params.id);
      if (!sheet || sheet.deleted_at) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      // Check if user has access to this sheet
      const hasAccess = await hasSheetAccess(req.userId!, req.userRole!, req.companyId || null, req.params.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Only admin users can view deleted leads
      if (req.userRole !== "super_admin" && req.userRole !== "company_admin") {
        return res.status(403).json({ error: "Only admin users can view deleted leads" });
      }

      const deletedLeads = await storage.getDeletedLeadsBySheetId(req.params.id);
      res.json(deletedLeads);
    } catch (error: any) {
      console.error("Get deleted leads error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Restore deleted leads
  app.post("/api/leads/restore", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { leadIds } = req.body;

      if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({ error: "Lead IDs are required" });
      }

      // Only admin users can restore leads
      if (req.userRole !== "super_admin" && req.userRole !== "company_admin") {
        return res.status(403).json({ error: "Only admin users can restore leads" });
      }

      const io = app.get("io") as SocketIOServer;
      const results = [];

      for (const leadId of leadIds) {
        const lead = await storage.getLead(leadId);
        if (!lead) {
          results.push({ leadId, success: false, error: "Lead not found" });
          continue;
        }

        // Get sheet to access company_id
        const sheet = await storage.getSheet(lead.sheet_id);
        if (!sheet) {
          results.push({ leadId, success: false, error: "Sheet not found" });
          continue;
        }

        // Check if user has access to the lead's sheet
        const hasAccess = await hasSheetAccess(req.userId!, req.userRole!, req.companyId || null, lead.sheet_id);
        if (!hasAccess) {
          results.push({ leadId, success: false, error: "Access denied" });
          continue;
        }

        // Restore the lead
        await storage.restoreLead(leadId);

        // Audit log
        await storage.createAuditLog({
          user_id: req.userId!,
          company_id: sheet.company_id,
          action: "restore",
          model: "lead",
          model_id: leadId,
          payload: {},
        });

        // Emit socket event
        io.to(`sheet_${lead.sheet_id}`).emit("lead_restored", { leadId, sheetId: lead.sheet_id });

        results.push({ leadId, success: true });
      }

      res.json({ results });
    } catch (error: any) {
      console.error("Restore leads error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Transfer leads to another sheet
  app.post("/api/leads/transfer", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { leadIds, targetSheetId } = req.body;

      if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({ error: "Lead IDs are required" });
      }

      if (!targetSheetId) {
        return res.status(400).json({ error: "Target sheet ID is required" });
      }

      // Get target sheet
      const targetSheet = await storage.getSheet(targetSheetId);
      if (!targetSheet || targetSheet.deleted_at) {
        return res.status(404).json({ error: "Target sheet not found" });
      }

      // Check if user has access to target sheet and can edit
      const hasTargetAccess = await hasSheetAccess(req.userId!, req.userRole!, req.companyId || null, targetSheetId);
      if (!hasTargetAccess) {
        return res.status(403).json({ error: "Access denied to target sheet" });
      }

      // Check if user has edit permission on target sheet
      if (req.userRole !== "super_admin" && req.userRole !== "company_admin") {
        const targetSheetUser = await storage.getSheetUser(targetSheetId, req.userId!);
        if (targetSheetUser && targetSheetUser.role === "viewer") {
          return res.status(403).json({ error: "Cannot transfer to sheet where you only have viewer access" });
        }
      }

      // Get the user who is performing the transfer
      const transferUser = await storage.getUser(req.userId!);
      const transferUserName = transferUser?.name || "Unknown User";

      // Process each lead
      const results = [];
      const io = app.get("io") as SocketIOServer;

      for (const leadId of leadIds) {
        const lead = await storage.getLead(leadId);
        if (!lead) {
          results.push({ leadId, success: false, error: "Lead not found" });
          continue;
        }

        const sourceSheet = await storage.getSheet(lead.sheet_id);
        if (!sourceSheet) {
          results.push({ leadId, success: false, error: "Source sheet not found" });
          continue;
        }

        // Check if user has access to source sheet
        const hasSourceAccess = await hasSheetAccess(req.userId!, req.userRole!, req.companyId || null, lead.sheet_id);
        if (!hasSourceAccess) {
          results.push({ leadId, success: false, error: "Access denied to source sheet" });
          continue;
        }

        // Check if user has edit permission on source sheet
        if (req.userRole !== "super_admin" && req.userRole !== "company_admin") {
          const sourceSheetUser = await storage.getSheetUser(lead.sheet_id, req.userId!);
          if (sourceSheetUser && sourceSheetUser.role === "viewer") {
            results.push({ leadId, success: false, error: "Cannot transfer from sheet where you only have viewer access" });
            continue;
          }
        }

        // Verify both sheets belong to the same company
        if (sourceSheet.company_id !== targetSheet.company_id) {
          results.push({ leadId, success: false, error: "Cannot transfer leads between different companies" });
          continue;
        }

        // Perform the actual transfer operations
        try {
          const oldSheetId = lead.sheet_id;

          // Update lead's sheet_id
          await storage.updateLead(leadId, { sheet_id: targetSheetId });

          // Create audit log
          await storage.createAuditLog({
            user_id: req.userId!,
            company_id: targetSheet.company_id,
            action: "transfer",
            model: "lead",
            model_id: leadId,
            payload: { from_sheet_id: oldSheetId, to_sheet_id: targetSheetId },
          });

          // Create lead update record for transfer (only after successful transfer)
          const today = new Date().toISOString().split('T')[0];
          await storage.createLeadUpdate({
            lead_id: leadId,
            update_via: "transfer",
            update_on: today,
            remark: `Transfer from "${sourceSheet.name}" to "${targetSheet.name}" by ${transferUserName}`,
            created_by_user_id: req.userId!,
          });

          // Emit realtime events to both sheets
          io.to(`sheet:${oldSheetId}`).emit("lead_deleted", { id: leadId });
          
          const updatedLead = await storage.getLead(leadId);
          io.to(`sheet:${targetSheetId}`).emit("lead_created", updatedLead);

          results.push({ leadId, success: true });
        } catch (transferError: any) {
          console.error(`Failed to transfer lead ${leadId}:`, transferError);
          results.push({ leadId, success: false, error: transferError.message || "Transfer operation failed" });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      res.json({ 
        success: true, 
        message: `Transferred ${successCount} lead(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
        results 
      });
    } catch (error: any) {
      console.error("Transfer leads error:", error);
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

      // Get sheet to access company_id
      const sheet = await storage.getSheet(lead.sheet_id);
      if (!sheet) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      // Check if user has access to the lead's sheet
      const hasAccess = await hasSheetAccess(req.userId!, req.userRole!, req.companyId || null, lead.sheet_id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if user has edit permission (not just view)
      if (req.userRole !== "super_admin" && req.userRole !== "company_admin") {
        const sheetUser = await storage.getSheetUser(lead.sheet_id, req.userId!);
        if (sheetUser && sheetUser.role === "viewer") {
          return res.status(403).json({ error: "Viewers cannot add lead updates" });
        }
      }

      const { insertLeadUpdateSchema } = await import("@shared/schema");
      const parsed = insertLeadUpdateSchema.parse({
        lead_id: req.params.id,
        ...req.body,
        created_by_user_id: req.userId,
      });

      const update = await storage.createLeadUpdate(parsed);

      // Audit log with company_id
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: sheet.company_id,
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

      // Get lead to access company_id
      const lead = await storage.getLead(update.lead_id);
      if (lead) {
        const sheet = await storage.getSheet(lead.sheet_id);
        if (sheet) {
          // Audit log with company_id
          await storage.createAuditLog({
            user_id: req.userId!,
            company_id: sheet.company_id,
            action: "update",
            model: "lead_update",
            model_id: req.params.id,
            payload: req.body,
          });
        }
      }

      res.json(update);
    } catch (error: any) {
      console.error("Update lead update error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/lead-updates/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Only company admins and super admins can delete lead updates
      if (req.userRole !== "super_admin" && req.userRole !== "company_admin") {
        return res.status(403).json({ error: "Only admin users can delete lead updates" });
      }

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
      // Fetch sheet to get company_id
      const sheet = await storage.getSheet(req.params.id);
      if (!sheet) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      const option = await storage.createDropdownOption({
        company_id: sheet.company_id,
        sheet_id: req.params.id,
        column_key: req.params.columnKey,
        value: req.body.value,
        order_index: req.body.order_index,
      });

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: sheet.company_id,
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
  // CUSTOM COLUMNS (Company-Scoped)
  // ============================================================================
  // Get company-wide columns (and optionally sheet-specific overrides)
  app.get("/api/company/columns", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId && req.userRole !== "super_admin") {
        return res.status(403).json({ error: "Must belong to a company" });
      }

      const companyId = req.userRole === "super_admin" && req.query.company_id 
        ? req.query.company_id as string
        : req.companyId!;

      const columns = await storage.getCompanyColumns(companyId);
      res.json(columns);
    } catch (error: any) {
      console.error("Get company columns error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create company-wide column (Company Admin only)
  app.post("/api/company/columns", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { name, type, config, sheet_id } = req.body;
      let { column_key } = req.body;

      // Auto-generate column_key from name if not provided
      if (!column_key) {
        column_key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      }

      // Determine company_id: super admins can specify it, company admins use their own
      let companyId: string;
      if (req.userRole === "super_admin") {
        if (!req.body.company_id) {
          return res.status(400).json({ error: "Super admins must provide company_id" });
        }
        companyId = req.body.company_id;
      } else {
        if (!req.companyId) {
          return res.status(403).json({ error: "Must belong to a company" });
        }
        companyId = req.companyId;
      }

      // Validate dropdown types have options in config
      if (type === "dropdown") {
        if (!config || !Array.isArray(config.dropdown_options) || config.dropdown_options.length === 0) {
          return res.status(400).json({ error: "Dropdown columns must have dropdown_options array in config" });
        }
      }

      // Check for duplicate column_key within company (company-wide columns only)
      const existingColumns = await storage.getCompanyColumns(companyId);
      let finalColumnKey = column_key;
      const duplicate = existingColumns.find(c => 
        c.column_key === finalColumnKey && 
        c.sheet_id === null &&
        c.company_id === companyId
      );
      
      // If duplicate found, append a number to make it unique
      if (duplicate) {
        let counter = 1;
        while (existingColumns.find(c => 
          c.column_key === `${column_key}_${counter}` && 
          c.sheet_id === null &&
          c.company_id === companyId
        )) {
          counter++;
        }
        finalColumnKey = `${column_key}_${counter}`;
      }

      const column = await storage.createCustomColumn({
        company_id: companyId,
        sheet_id: sheet_id || null,
        name,
        column_key: finalColumnKey,
        type,
        config: config || {},
        order_index: req.body.order_index || 0,
      });

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: companyId,
        action: "create",
        model: "custom_column",
        model_id: column.id,
        payload: { name, column_key, type },
      });

      res.status(201).json(column);
    } catch (error: any) {
      console.error("Create company column error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reorder company columns (Company Admin only) - MUST come before /:columnId route!
  app.patch("/api/company/columns/reorder", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { columnOrders } = req.body; // Array of { id: string, order_index: number }
      
      console.log("[Reorder] Received request:", { 
        columnCount: columnOrders?.length, 
        companyId: req.companyId,
        columnIds: columnOrders?.map((c: any) => c.id) 
      });
      
      if (!Array.isArray(columnOrders) || columnOrders.length === 0) {
        return res.status(400).json({ error: "Invalid column orders" });
      }

      // Validate all columns belong to the company
      const validColumns = [];
      for (const item of columnOrders) {
        if (!item.id || typeof item.order_index !== 'number') {
          console.warn("[Reorder] Invalid item format:", item);
          continue;
        }

        const column = await storage.getCustomColumnById(item.id);
        if (!column) {
          console.error("[Reorder] Column not found:", item.id);
          return res.status(404).json({ error: `Column not found` });
        }
        if (req.userRole === "company_admin" && column.company_id !== req.companyId) {
          console.error("[Reorder] Company mismatch:", { columnId: item.id, columnCompany: column.company_id, userCompany: req.companyId });
          return res.status(403).json({ error: "Cannot reorder columns from other companies" });
        }
        validColumns.push(item);
      }

      if (validColumns.length === 0) {
        return res.status(400).json({ error: "No valid columns to reorder" });
      }

      // Update order_index for each column
      for (const item of validColumns) {
        await storage.updateCustomColumn(item.id, { order_index: item.order_index });
      }

      console.log("[Reorder] Successfully reordered", validColumns.length, "columns");

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId!,
        action: "update",
        model: "custom_column",
        model_id: "bulk_reorder",
        payload: { column_count: validColumns.length },
      });

      res.json({ success: true, message: "Columns reordered successfully" });
    } catch (error: any) {
      console.error("Reorder company columns error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update company column (Company Admin only)
  app.patch("/api/company/columns/:columnId", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const column = await storage.getCustomColumnById(req.params.columnId);
      if (!column) {
        return res.status(404).json({ error: "Column not found" });
      }

      // Company admins can only update columns in their company
      if (req.userRole === "company_admin" && column.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot update columns from other companies" });
      }

      const { name, type, config } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (type !== undefined) updates.type = type;
      if (config !== undefined) updates.config = config;

      const updated = await storage.updateCustomColumn(req.params.columnId, updates);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: column.company_id,
        action: "update",
        model: "custom_column",
        model_id: req.params.columnId,
        payload: updates,
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Update company column error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete company column (Company Admin only)
  app.delete("/api/company/columns/:columnId", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const column = await storage.getCustomColumnById(req.params.columnId);
      if (!column) {
        return res.status(404).json({ error: "Column not found" });
      }

      // Company admins can only delete columns in their company
      if (req.userRole === "company_admin" && column.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot delete columns from other companies" });
      }

      await storage.deleteCustomColumn(req.params.columnId);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: column.company_id,
        action: "delete",
        model: "custom_column",
        model_id: req.params.columnId,
        payload: {},
      });

      res.json({ success: true, message: "Column deleted" });
    } catch (error: any) {
      console.error("Delete company column error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Legacy endpoint for getting columns for a sheet (reads from company columns)
  app.get("/api/sheets/:id/columns", authMiddleware, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      const sheet = await storage.getSheet(req.params.id);
      if (!sheet || sheet.deleted_at) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      // Get company columns for this sheet's company
      const columns = await storage.getCompanyColumns(sheet.company_id);
      
      // Separate company-wide columns and sheet-specific overrides
      const companyColumns = columns.filter(c => c.sheet_id === null);
      const sheetOverrides = columns.filter(c => c.sheet_id === req.params.id);
      
      // De-duplicate by column_key: sheet overrides replace company defaults
      const columnMap = new Map();
      
      // Add company columns first
      companyColumns.forEach(col => {
        columnMap.set(col.column_key, col);
      });
      
      // Override with sheet-specific columns (these take precedence)
      sheetOverrides.forEach(col => {
        columnMap.set(col.column_key, col);
      });
      
      // Return merged result
      const mergedColumns = Array.from(columnMap.values());
      res.json(mergedColumns);
    } catch (error: any) {
      console.error("Get sheet columns error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // VALIDATION RULES (Company-scoped Conditional Validations)
  // ============================================================================
  // Get validation rules for company (and optionally sheet-specific)
  app.get("/api/company/validation-rules", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId && req.userRole !== "super_admin") {
        return res.status(403).json({ error: "Must belong to a company" });
      }

      const companyId = req.userRole === "super_admin" && req.query.company_id 
        ? req.query.company_id as string
        : req.companyId!;

      const sheetId = req.query.sheet_id as string | undefined;
      const rules = await storage.getValidationRules(companyId, sheetId);
      res.json(rules);
    } catch (error: any) {
      console.error("Get validation rules error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create validation rule (Company Admin only)
  app.post("/api/company/validation-rules", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { name, trigger_column_key, operator, trigger_value, required_fields, sheet_id } = req.body;

      // Determine company_id
      let companyId: string;
      if (req.userRole === "super_admin") {
        if (!req.body.company_id) {
          return res.status(400).json({ error: "Super admins must provide company_id" });
        }
        companyId = req.body.company_id;
      } else {
        if (!req.companyId) {
          return res.status(403).json({ error: "Must belong to a company" });
        }
        companyId = req.companyId;
      }

      // Validate required fields
      if (!name || !trigger_column_key || !operator || !trigger_value || !required_fields || !Array.isArray(required_fields) || required_fields.length === 0) {
        return res.status(400).json({ error: "Missing required fields: name, trigger_column_key, operator, trigger_value, required_fields" });
      }

      const rule = await storage.createValidationRule({
        company_id: companyId,
        sheet_id: sheet_id || null,
        name,
        trigger_column_key,
        operator,
        trigger_value,
        required_fields,
      });

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: companyId,
        action: "create",
        model: "validation_rule",
        model_id: rule.id,
        payload: { name, trigger_column_key, operator },
      });

      res.status(201).json(rule);
    } catch (error: any) {
      console.error("Create validation rule error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update validation rule (Company Admin only)
  app.patch("/api/company/validation-rules/:ruleId", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const rule = await storage.getValidationRuleById(req.params.ruleId);
      if (!rule) {
        return res.status(404).json({ error: "Validation rule not found" });
      }

      // Company admins can only update rules in their company
      if (req.userRole === "company_admin" && rule.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot update rules from other companies" });
      }

      const { name, trigger_column_key, operator, trigger_value, required_fields } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (trigger_column_key !== undefined) updates.trigger_column_key = trigger_column_key;
      if (operator !== undefined) updates.operator = operator;
      if (trigger_value !== undefined) updates.trigger_value = trigger_value;
      if (required_fields !== undefined) updates.required_fields = required_fields;

      const updated = await storage.updateValidationRule(req.params.ruleId, updates);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: rule.company_id,
        action: "update",
        model: "validation_rule",
        model_id: req.params.ruleId,
        payload: updates,
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Update validation rule error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete validation rule (Company Admin only)
  app.delete("/api/company/validation-rules/:ruleId", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const rule = await storage.getValidationRuleById(req.params.ruleId);
      if (!rule) {
        return res.status(404).json({ error: "Validation rule not found" });
      }

      // Company admins can only delete rules in their company
      if (req.userRole === "company_admin" && rule.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot delete rules from other companies" });
      }

      await storage.deleteValidationRule(req.params.ruleId);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: rule.company_id,
        action: "delete",
        model: "validation_rule",
        model_id: req.params.ruleId,
        payload: {},
      });

      res.json({ success: true, message: "Validation rule deleted" });
    } catch (error: any) {
      console.error("Delete validation rule error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // QUICK FILTERS (Company-wide Quick Filters)
  // ============================================================================
  
  // Get all quick filters for a company
  app.get("/api/company/quick-filters", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId && req.userRole !== "super_admin") {
        return res.status(403).json({ error: "Must belong to a company" });
      }

      const companyId = req.userRole === "super_admin" && req.query.company_id 
        ? req.query.company_id as string
        : req.companyId!;

      const filters = await storage.getQuickFilters(companyId);
      res.json(filters);
    } catch (error: any) {
      console.error("Get quick filters error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create quick filter (Company Admin only)
  app.post("/api/company/quick-filters", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      // Determine company_id first
      let companyId: string;
      if (req.userRole === "super_admin") {
        if (!req.body.company_id) {
          return res.status(400).json({ error: "Super admins must provide company_id" });
        }
        companyId = req.body.company_id;
      } else {
        if (!req.companyId) {
          return res.status(403).json({ error: "Must belong to a company" });
        }
        companyId = req.companyId;
      }

      // Sanitize payload: remove server-side fields before validation to avoid strict schema rejection
      const { company_id, created_by_user_id, ...sanitizedBody } = req.body;

      // Validate only the client-provided fields
      const validation = insertQuickFilterSchema.omit({ company_id: true, created_by_user_id: true }).safeParse(sanitizedBody);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validation.error.errors 
        });
      }

      // Explicitly build the filter object with only trusted values
      // Do NOT spread validation.data as it might contain client-supplied company_id
      const filter = await storage.createQuickFilter({
        name: validation.data.name,
        icon: validation.data.icon || null,
        color: validation.data.color || null,
        filter_config: validation.data.filter_config,
        order_index: validation.data.order_index,
        company_id: companyId, // Only use server-determined company_id
        created_by_user_id: req.userId!, // Only use authenticated user_id
      });

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: companyId,
        action: "create",
        model: "quick_filter",
        model_id: filter.id,
        payload: { name: filter.name },
      });

      res.status(201).json(filter);
    } catch (error: any) {
      console.error("Create quick filter error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update quick filter (Company Admin only)
  app.patch("/api/company/quick-filters/:filterId", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const filter = await storage.getQuickFilterById(req.params.filterId);
      if (!filter) {
        return res.status(404).json({ error: "Quick filter not found" });
      }

      // Company admins can only update filters in their company
      if (req.userRole === "company_admin" && filter.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot update filters from other companies" });
      }

      const { name, icon, color, filter_config, order_index } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (icon !== undefined) updates.icon = icon;
      if (color !== undefined) updates.color = color;
      if (filter_config !== undefined) {
        // Validate filter_config against schema
        const configValidation = quickFilterConfigSchema.safeParse(filter_config);
        if (!configValidation.success) {
          return res.status(400).json({ 
            error: "Invalid filter configuration", 
            details: configValidation.error.errors 
          });
        }
        updates.filter_config = filter_config;
      }
      if (order_index !== undefined) updates.order_index = order_index;

      const updated = await storage.updateQuickFilter(req.params.filterId, updates);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: filter.company_id,
        action: "update",
        model: "quick_filter",
        model_id: req.params.filterId,
        payload: updates,
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Update quick filter error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete quick filter (Company Admin only)
  app.delete("/api/company/quick-filters/:filterId", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const filter = await storage.getQuickFilterById(req.params.filterId);
      if (!filter) {
        return res.status(404).json({ error: "Quick filter not found" });
      }

      // Company admins can only delete filters in their company
      if (req.userRole === "company_admin" && filter.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot delete filters from other companies" });
      }

      await storage.deleteQuickFilter(req.params.filterId);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: filter.company_id,
        action: "delete",
        model: "quick_filter",
        model_id: req.params.filterId,
        payload: {},
      });

      res.json({ success: true, message: "Quick filter deleted" });
    } catch (error: any) {
      console.error("Delete quick filter error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reorder quick filters (Company Admin only)
  app.patch("/api/company/quick-filters/reorder", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { filter_orders } = req.body;
      
      if (!Array.isArray(filter_orders)) {
        return res.status(400).json({ error: "filter_orders must be an array" });
      }

      const companyId = req.userRole === "super_admin" && req.body.company_id
        ? req.body.company_id
        : req.companyId!;

      // Validate all filters belong to the company
      for (const item of filter_orders) {
        const filter = await storage.getQuickFilterById(item.id);
        if (!filter || filter.company_id !== companyId) {
          return res.status(403).json({ error: "Invalid filter ID or access denied" });
        }
      }

      // Update order_index for each filter
      await Promise.all(
        filter_orders.map((item: { id: string; order_index: number }) =>
          storage.updateQuickFilter(item.id, { order_index: item.order_index })
        )
      );

      res.json({ success: true, message: "Quick filters reordered" });
    } catch (error: any) {
      console.error("Reorder quick filters error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // REPORTS
  // ============================================================================
  
  // GET /api/company/reports - Get all reports (filtered by permissions)
  app.get("/api/company/reports", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId && req.userRole !== "super_admin") {
        return res.status(403).json({ error: "Must belong to a company" });
      }

      const companyId = req.userRole === "super_admin" && req.query.company_id 
        ? req.query.company_id as string
        : req.companyId!;

      // Get all reports for the company
      let reports = await storage.getReportsByCompanyId(companyId);

      // For non-admin users, filter reports to only show those for sheets they have access to
      if (req.userRole === "user") {
        const userSheets = await storage.getSheetsByUserId(req.userId!);
        const userSheetIds = userSheets.map(s => s.id);
        
        reports = reports.filter(report => {
          const reportSheetIds = Array.isArray(report.sheet_ids) ? report.sheet_ids : [];
          return reportSheetIds.some(sheetId => userSheetIds.includes(sheetId));
        });
      }

      res.json(reports);
    } catch (error: any) {
      console.error("Get reports error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/company/reports/:reportId - Get a specific report
  app.get("/api/company/reports/:reportId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const report = await storage.getReport(req.params.reportId);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      // Verify company access
      if (req.userRole === "company_admin" && report.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot access reports from other companies" });
      }

      // For regular users, verify they have access to at least one sheet in the report
      if (req.userRole === "user") {
        const userSheets = await storage.getSheetsByUserId(req.userId!);
        const userSheetIds = userSheets.map(s => s.id);
        const reportSheetIds = Array.isArray(report.sheet_ids) ? report.sheet_ids : [];
        
        const hasAccess = reportSheetIds.some(sheetId => userSheetIds.includes(sheetId));
        if (!hasAccess) {
          return res.status(403).json({ error: "No access to sheets in this report" });
        }
      }

      res.json(report);
    } catch (error: any) {
      console.error("Get report error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/company/reports - Create a new report
  app.post("/api/company/reports", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      // Determine company_id
      let companyId: string;
      if (req.userRole === "super_admin") {
        if (!req.body.company_id) {
          return res.status(400).json({ error: "Super admins must provide company_id" });
        }
        companyId = req.body.company_id;
      } else {
        if (!req.companyId) {
          return res.status(403).json({ error: "Must belong to a company" });
        }
        companyId = req.companyId;
      }

      const { name, description, report_type, sheet_ids, config } = req.body;

      // Validate required fields
      if (!name || !report_type || !Array.isArray(sheet_ids) || sheet_ids.length === 0) {
        return res.status(400).json({ error: "Missing required fields: name, report_type, sheet_ids" });
      }

      // Additional validation for custom reports
      if (report_type === "custom") {
        if (!config || !config.x_axis || !config.y_axis) {
          return res.status(400).json({ 
            error: "Custom reports require x_axis and y_axis in config" 
          });
        }
        
        if ((config.y_axis === "sum" || config.y_axis === "avg") && !config.y_axis_field) {
          return res.status(400).json({ 
            error: "y_axis_field is required when using sum or avg aggregation" 
          });
        }

        if (!["count", "sum", "avg"].includes(config.y_axis)) {
          return res.status(400).json({ 
            error: "y_axis must be one of: count, sum, avg" 
          });
        }

        if (!["bar", "line", "pie"].includes(config.chart_type || "bar")) {
          return res.status(400).json({ 
            error: "chart_type must be one of: bar, line, pie" 
          });
        }
      }

      // Additional validation for pivot table reports
      if (report_type === "pivot_table") {
        if (!config || !Array.isArray(config.row_fields) || config.row_fields.length === 0) {
          return res.status(400).json({ 
            error: "Pivot table reports require at least one row field in config" 
          });
        }

        if ((config.aggregation === "sum" || config.aggregation === "avg") && !config.value_field) {
          return res.status(400).json({ 
            error: "value_field is required when using sum or avg aggregation" 
          });
        }

        if (!["count", "sum", "avg"].includes(config.aggregation || "count")) {
          return res.status(400).json({ 
            error: "aggregation must be one of: count, sum, avg" 
          });
        }
      }

      // Verify all sheets belong to the company AND user has access
      for (const sheetId of sheet_ids) {
        const sheet = await storage.getSheet(sheetId);
        if (!sheet) {
          return res.status(404).json({ error: "Sheet not found" });
        }
        
        // Verify sheet belongs to the same company
        if (sheet.company_id !== companyId) {
          return res.status(403).json({ error: "Cannot create reports for sheets in other companies" });
        }
        
        // For regular users, verify they have access to the sheet
        if (req.userRole === "user") {
          const hasAccess = await storage.getSheetUser(sheetId, req.userId!);
          if (!hasAccess) {
            return res.status(403).json({ error: "No access to one or more selected sheets" });
          }
        }
      }

      const report = await storage.createReport({
        company_id: companyId,
        name,
        description: description || null,
        report_type,
        sheet_ids,
        config: config || {},
        created_by_user_id: req.userId!,
      });

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: companyId,
        action: "create",
        model: "report",
        model_id: report.id,
        payload: { name, report_type },
      });

      res.status(201).json(report);
    } catch (error: any) {
      console.error("Create report error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/company/reports/:reportId - Update a report
  app.patch("/api/company/reports/:reportId", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const report = await storage.getReport(req.params.reportId);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      // Company admins can only update reports in their company
      if (req.userRole === "company_admin" && report.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot update reports from other companies" });
      }

      const { name, description, report_type, sheet_ids, config } = req.body;
      const updates: any = {};
      
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (report_type !== undefined) updates.report_type = report_type;
      if (config !== undefined) updates.config = config;
      
      // If updating sheet_ids, verify all sheets belong to the company
      if (sheet_ids !== undefined) {
        if (!Array.isArray(sheet_ids) || sheet_ids.length === 0) {
          return res.status(400).json({ error: "sheet_ids must be a non-empty array" });
        }
        
        for (const sheetId of sheet_ids) {
          const sheet = await storage.getSheet(sheetId);
          if (!sheet || sheet.company_id !== report.company_id) {
            return res.status(403).json({ error: "Invalid sheet ID or access denied" });
          }
        }
        updates.sheet_ids = sheet_ids;
      }

      const updated = await storage.updateReport(req.params.reportId, updates);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: report.company_id,
        action: "update",
        model: "report",
        model_id: req.params.reportId,
        payload: updates,
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Update report error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /api/company/reports/:reportId - Delete a report
  app.delete("/api/company/reports/:reportId", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const report = await storage.getReport(req.params.reportId);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      // Company admins can only delete reports in their company
      if (req.userRole === "company_admin" && report.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot delete reports from other companies" });
      }

      await storage.deleteReport(req.params.reportId);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: report.company_id,
        action: "delete",
        model: "report",
        model_id: req.params.reportId,
        payload: {},
      });

      res.json({ success: true, message: "Report deleted" });
    } catch (error: any) {
      console.error("Delete report error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/company/reports/:reportId/data - Get report data (calculations and aggregations)
  app.get("/api/company/reports/:reportId/data", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const report = await storage.getReport(req.params.reportId);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      // Verify company access
      if (req.userRole === "company_admin" && report.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot access reports from other companies" });
      }

      // Get filter sheet IDs from query parameters (if provided)
      let filterSheetIds: string[] | null = null;
      if (req.query.sheet_ids) {
        const rawSheetIds = req.query.sheet_ids;
        if (Array.isArray(rawSheetIds)) {
          filterSheetIds = rawSheetIds.filter((id): id is string => typeof id === 'string');
        } else if (typeof rawSheetIds === 'string') {
          filterSheetIds = [rawSheetIds];
        }
      }

      // Get accessible sheet IDs for the user
      let accessibleSheetIds: string[] = [];
      if (req.userRole === "company_admin" || req.userRole === "super_admin") {
        // Admins can access all sheets (or filter by specific sheets if provided)
        // Super admins don't have companyId, so use report's company_id
        const companyId = req.companyId || report.company_id;
        
        if (filterSheetIds) {
          // Get all company sheets
          const companySheets = await storage.getSheetsByCompanyId(companyId);
          const companySheetIds = companySheets.map(s => s.id);
          // Only include requested sheets that exist in the company
          accessibleSheetIds = filterSheetIds.filter(sheetId => companySheetIds.includes(sheetId));
        } else {
          // No filter - use report's configured sheets or all company sheets
          accessibleSheetIds = Array.isArray(report.sheet_ids) && report.sheet_ids.length > 0
            ? report.sheet_ids
            : (await storage.getSheetsByCompanyId(companyId)).map(s => s.id);
        }
      } else {
        // Regular users can only access sheets they have permissions for
        const userSheets = await storage.getSheetsByUserId(req.userId!);
        const userSheetIds = userSheets.map(s => s.id);
        
        if (filterSheetIds) {
          // Filter to only include requested sheets that the user has access to
          accessibleSheetIds = filterSheetIds.filter(sheetId => userSheetIds.includes(sheetId));
        } else {
          // No filter - use report's configured sheets intersected with user's sheets
          const reportSheetIds = Array.isArray(report.sheet_ids) ? report.sheet_ids : [];
          accessibleSheetIds = reportSheetIds.filter(sheetId => userSheetIds.includes(sheetId));
        }
        
        if (accessibleSheetIds.length === 0) {
          return res.status(403).json({ error: "No access to sheets in this report" });
        }
      }

      // Fetch all leads from accessible sheets (excluding soft-deleted)
      const allLeads = (await Promise.all(
        accessibleSheetIds.map(sheetId => storage.getLeadsBySheetId(sheetId))
      )).flat().filter(lead => !lead.deleted_at);

      // Apply date range filter if configured
      let filteredLeads = allLeads;
      if (report.config?.date_range) {
        const { start, end } = report.config.date_range;
        filteredLeads = allLeads.filter(lead => {
          const leadDate = new Date(lead.created_at);
          if (start && leadDate < new Date(start)) return false;
          if (end && leadDate > new Date(end)) return false;
          return true;
        });
      }

      // Generate data based on report type
      let data: any;
      switch (report.report_type) {
        case "lead_status_distribution":
          data = generateLeadStatusDistribution(filteredLeads);
          break;
        case "leads_over_time":
          data = generateLeadsOverTime(filteredLeads, report.config);
          break;
        case "lead_source_analysis":
          data = generateLeadSourceAnalysis(filteredLeads, report.config);
          break;
        case "conversion_rate":
          data = generateConversionRate(filteredLeads);
          break;
        case "user_performance":
          data = await generateUserPerformance(filteredLeads, storage);
          break;
        case "lead_age_distribution":
          data = generateLeadAgeDistribution(filteredLeads);
          break;
        case "custom_field_analysis":
          data = generateCustomFieldAnalysis(filteredLeads, report.config);
          break;
        case "custom":
          data = generateDynamicReport(filteredLeads, report.config);
          break;
        case "pivot_table":
          data = generatePivotTable(filteredLeads, report.config);
          break;
        default:
          return res.status(400).json({ error: "Unknown report type" });
      }

      res.json({
        report,
        data,
        total_leads: filteredLeads.length,
        generated_at: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Get report data error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Helper functions for report data generation
  function generateLeadStatusDistribution(leads: any[]) {
    const statusCounts: Record<string, number> = {};
    leads.forEach(lead => {
      const status = lead.lead_status || "Unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }

  function generateLeadsOverTime(leads: any[], config: any) {
    const groupBy = config?.group_by || "day"; // day, week, month
    const dateCounts: Record<string, number> = {};
    
    leads.forEach(lead => {
      const date = new Date(lead.created_at);
      let key: string;
      
      if (groupBy === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === "week") {
        const weekNum = Math.ceil((date.getDate()) / 7);
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-W${weekNum}`;
      } else {
        key = date.toISOString().split('T')[0];
      }
      
      dateCounts[key] = (dateCounts[key] || 0) + 1;
    });
    
    return Object.entries(dateCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
  }

  function generateLeadSourceAnalysis(leads: any[], config: any) {
    const field = config?.group_by || "language";
    const sourceCounts: Record<string, number> = {};
    
    leads.forEach(lead => {
      const value = lead[field] || lead.custom_fields?.[field] || "Unknown";
      sourceCounts[value] = (sourceCounts[value] || 0) + 1;
    });
    
    return Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }

  function generateConversionRate(leads: any[]) {
    const statuses = ["New", "Contacted", "Qualified", "Converted"];
    const statusCounts: Record<string, number> = {};
    
    leads.forEach(lead => {
      const status = lead.lead_status || "Unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return statuses.map(status => ({
      stage: status,
      count: statusCounts[status] || 0,
    }));
  }

  async function generateUserPerformance(leads: any[], storage: any) {
    const userCounts: Record<string, { created: number; updated: number; name: string }> = {};
    
    for (const lead of leads) {
      if (lead.created_by_user_id) {
        if (!userCounts[lead.created_by_user_id]) {
          const user = await storage.getUser(lead.created_by_user_id);
          userCounts[lead.created_by_user_id] = { 
            created: 0, 
            updated: 0, 
            name: user?.name || "Unknown" 
          };
        }
        userCounts[lead.created_by_user_id].created++;
      }
      
      if (lead.updated_by_user_id && lead.updated_by_user_id !== lead.created_by_user_id) {
        if (!userCounts[lead.updated_by_user_id]) {
          const user = await storage.getUser(lead.updated_by_user_id);
          userCounts[lead.updated_by_user_id] = { 
            created: 0, 
            updated: 0, 
            name: user?.name || "Unknown" 
          };
        }
        userCounts[lead.updated_by_user_id].updated++;
      }
    }
    
    return Object.entries(userCounts).map(([userId, data]) => ({
      user: data.name,
      created: data.created,
      updated: data.updated,
      total: data.created + data.updated,
    }));
  }

  function generateLeadAgeDistribution(leads: any[]) {
    const now = new Date();
    const ageBuckets = {
      "0-7 days": 0,
      "8-14 days": 0,
      "15-30 days": 0,
      "31-60 days": 0,
      "61-90 days": 0,
      "90+ days": 0,
    };
    
    leads.forEach(lead => {
      const createdDate = new Date(lead.created_at);
      const ageInDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (ageInDays <= 7) ageBuckets["0-7 days"]++;
      else if (ageInDays <= 14) ageBuckets["8-14 days"]++;
      else if (ageInDays <= 30) ageBuckets["15-30 days"]++;
      else if (ageInDays <= 60) ageBuckets["31-60 days"]++;
      else if (ageInDays <= 90) ageBuckets["61-90 days"]++;
      else ageBuckets["90+ days"]++;
    });
    
    return Object.entries(ageBuckets).map(([range, count]) => ({ range, count }));
  }

  function generateCustomFieldAnalysis(leads: any[], config: any) {
    const field = config?.metrics?.[0] || "occupation";
    const fieldCounts: Record<string, number> = {};
    
    leads.forEach(lead => {
      const value = lead[field] || lead.custom_fields?.[field] || "Unknown";
      fieldCounts[value] = (fieldCounts[value] || 0) + 1;
    });
    
    return Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Top 10
      .map(([name, value]) => ({ name, value }));
  }

  // Dynamic report generation based on X and Y axis configuration
  function generateDynamicReport(leads: any[], config: any) {
    const xAxis = config?.x_axis || "lead_status"; // Column to group by
    const yAxis = config?.y_axis || "count"; // Aggregation type: count, sum, avg
    const yAxisField = config?.y_axis_field; // Field to aggregate (for sum/avg)
    
    const grouped: Record<string, any[]> = {};
    
    // Group leads by X-axis value
    leads.forEach(lead => {
      let xValue = lead[xAxis] || lead.custom_fields?.[xAxis] || "Unknown";
      
      // Handle date fields
      if (xValue && typeof xValue === 'string' && xValue.match(/^\d{4}-\d{2}-\d{2}/)) {
        xValue = xValue.split('T')[0]; // Format dates consistently
      }
      
      if (!grouped[xValue]) {
        grouped[xValue] = [];
      }
      grouped[xValue].push(lead);
    });
    
    // Calculate Y-axis values based on aggregation type
    const result = Object.entries(grouped).map(([name, groupLeads]) => {
      let value: number;
      
      switch (yAxis) {
        case "count":
          value = groupLeads.length;
          break;
        case "sum":
          if (!yAxisField) {
            value = groupLeads.length;
          } else {
            value = groupLeads.reduce((sum, lead) => {
              const fieldValue = parseFloat(lead[yAxisField] || lead.custom_fields?.[yAxisField] || 0);
              return sum + (isNaN(fieldValue) ? 0 : fieldValue);
            }, 0);
          }
          break;
        case "avg":
          if (!yAxisField) {
            value = groupLeads.length;
          } else {
            const sum = groupLeads.reduce((sum, lead) => {
              const fieldValue = parseFloat(lead[yAxisField] || lead.custom_fields?.[yAxisField] || 0);
              return sum + (isNaN(fieldValue) ? 0 : fieldValue);
            }, 0);
            value = groupLeads.length > 0 ? sum / groupLeads.length : 0;
          }
          break;
        default:
          value = groupLeads.length;
      }
      
      return { name, value: Math.round(value * 100) / 100 }; // Round to 2 decimals
    });
    
    return result.sort((a, b) => b.value - a.value);
  }

  // Generate pivot table with multi-dimensional grouping
  function generatePivotTable(leads: any[], config: any) {
    const rowFields = config?.row_fields || []; // Array of columns for row grouping
    const columnField = config?.column_field; // Optional column pivot field
    const valueField = config?.value_field; // Field to aggregate
    const aggregation = config?.aggregation || "count"; // count, sum, avg

    if (rowFields.length === 0) {
      return { rows: [], columns: [], data: [] };
    }

    // Helper function to get field value from lead
    const getFieldValue = (lead: any, field: string) => {
      return lead[field] || lead.custom_fields?.[field] || "Unknown";
    };

    // Helper function to calculate aggregation
    const calculateAggregation = (leadsSubset: any[]) => {
      if (aggregation === "count") {
        return leadsSubset.length;
      }
      
      if (!valueField) return leadsSubset.length;
      
      const values = leadsSubset.map(l => parseFloat(getFieldValue(l, valueField) || 0)).filter(v => !isNaN(v));
      
      if (aggregation === "sum") {
        return values.reduce((sum, v) => sum + v, 0);
      }
      
      if (aggregation === "avg") {
        return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
      }
      
      return leadsSubset.length;
    };

    // Build row hierarchy
    const buildRowHierarchy = (leadsSubset: any[], fieldIndex: number): any => {
      if (fieldIndex >= rowFields.length) {
        return leadsSubset;
      }

      const field = rowFields[fieldIndex];
      const grouped: Record<string, any[]> = {};

      leadsSubset.forEach(lead => {
        const value = getFieldValue(lead, field);
        if (!grouped[value]) grouped[value] = [];
        grouped[value].push(lead);
      });

      const result: any = {};
      Object.entries(grouped).forEach(([key, groupLeads]) => {
        result[key] = buildRowHierarchy(groupLeads, fieldIndex + 1);
      });

      return result;
    };

    // If no column field, create simple row-grouped table
    if (!columnField) {
      const hierarchy = buildRowHierarchy(leads, 0);
      
      const flattenRows = (node: any, parentKeys: string[] = []): any[] => {
        if (Array.isArray(node)) {
          return [{
            keys: parentKeys,
            value: calculateAggregation(node),
            count: node.length
          }];
        }

        const rows: any[] = [];
        Object.entries(node).forEach(([key, child]) => {
          rows.push(...flattenRows(child, [...parentKeys, key]));
        });
        return rows;
      };

      const flatRows = flattenRows(hierarchy);
      
      return {
        type: "simple",
        rowFields,
        aggregation,
        valueField,
        rows: flatRows
      };
    }

    // With column field - create full pivot table
    const columnValues = new Set<string>();
    leads.forEach(lead => {
      columnValues.add(getFieldValue(lead, columnField));
    });

    const columns = Array.from(columnValues).sort();
    const hierarchy = buildRowHierarchy(leads, 0);

    const flattenRowsWithColumns = (node: any, parentKeys: string[] = []): any[] => {
      if (Array.isArray(node)) {
        const row: any = { keys: parentKeys };
        
        columns.forEach(col => {
          const filtered = node.filter(l => getFieldValue(l, columnField) === col);
          row[col] = calculateAggregation(filtered);
        });
        
        row.total = calculateAggregation(node);
        return [row];
      }

      const rows: any[] = [];
      Object.entries(node).forEach(([key, child]) => {
        rows.push(...flattenRowsWithColumns(child, [...parentKeys, key]));
      });
      return rows;
    };

    const dataRows = flattenRowsWithColumns(hierarchy);

    return {
      type: "pivot",
      rowFields,
      columnField,
      columns,
      aggregation,
      valueField,
      rows: dataRows
    };
  }

  // Sheet-scoped validation rules endpoints (for frontend integration)
  // GET /api/sheets/:sheetId/validation-rules - Fetch rules for a sheet (company-wide + sheet-specific)
  app.get("/api/sheets/:sheetId/validation-rules", authMiddleware, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      const sheetId = req.params.sheetId;
      
      // Get sheet to derive company_id
      const sheet = await storage.getSheet(sheetId);
      if (!sheet) {
        return res.status(404).json({ error: "Sheet not found" });
      }
      
      // Get validation rules for this sheet (both company-wide and sheet-specific)
      const rules = await storage.getValidationRules(sheet.company_id, sheetId);
      res.json(rules);
    } catch (error: any) {
      console.error("Get sheet validation rules error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/sheets/:sheetId/validation-rules - Create rule for a sheet (Company Admin only)
  app.post("/api/sheets/:sheetId/validation-rules", authMiddleware, requireCompanyAdmin, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      const sheetId = req.params.sheetId;
      
      // Sheet access already verified by requireSheetAccess middleware
      // Get sheet to derive and validate company_id
      const sheet = await storage.getSheet(sheetId);
      if (!sheet) {
        return res.status(404).json({ error: "Sheet not found" });
      }
      
      // Explicit company_id validation to prevent cross-company injection
      // Company admins can only create rules for sheets in their company
      if (req.userRole === "company_admin") {
        if (!req.companyId) {
          return res.status(403).json({ error: "Company admin must belong to a company" });
        }
        if (sheet.company_id !== req.companyId) {
          return res.status(403).json({ error: "Cannot create rules for sheets in other companies" });
        }
      }
      // Super admins can create rules for any sheet, but we validate the sheet exists and is consistent
      else if (req.userRole === "super_admin") {
        if (!sheet.company_id) {
          return res.status(400).json({ error: "Sheet must belong to a company" });
        }
      }
      
      const { name, trigger_column_key, operator, trigger_value, required_fields } = req.body;
      
      // Validate required fields
      if (!name || !trigger_column_key || !operator || !trigger_value || !required_fields || !Array.isArray(required_fields) || required_fields.length === 0) {
        return res.status(400).json({ error: "Missing required fields: name, trigger_column_key, operator, trigger_value, required_fields" });
      }
      
      // Create rule with company_id derived from the sheet
      const rule = await storage.createValidationRule({
        company_id: sheet.company_id, // Derived from sheet, not from request
        sheet_id: sheetId,
        name,
        trigger_column_key,
        operator,
        trigger_value,
        required_fields,
      });
      
      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: sheet.company_id,
        action: "create",
        model: "validation_rule",
        model_id: rule.id,
        payload: { name, trigger_column_key, operator, sheet_id: sheetId },
      });
      
      res.status(201).json(rule);
    } catch (error: any) {
      console.error("Create sheet validation rule error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // WEBHOOKS
  // ============================================================================
  app.post("/api/webhooks/leads", webhookLimiter, async (req, res) => {
    const headers = req.headers as Record<string, any>;
    let leadId: string | null = null;
    let companyId: string = "";

    try {
      // Verify API key or HMAC signature
      const apiKey = headers["x-api-key"];
      
      // Try to get company_id early for logging
      if (req.body.sheet_id) {
        const sheet = await storage.getSheet(req.body.sheet_id);
        if (sheet) {
          companyId = sheet.company_id;
        }
      }
      
      if (!apiKey || apiKey !== HMAC_SECRET) {
        await storage.createWebhookLog({
          company_id: companyId || "",
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
          company_id: "",
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
        company_id: companyId,
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
        company_id: companyId || "",
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
      const allLogs = await storage.getWebhookLogs();
      
      // Super admins see all logs
      if (req.userRole === "super_admin") {
        res.json(allLogs);
      } else if (req.companyId) {
        // Company users see only their company's logs
        const companyLogs = allLogs.filter(log => log.company_id === req.companyId);
        res.json(companyLogs);
      } else {
        // Users without company context see no logs
        res.json([]);
      }
    } catch (error: any) {
      console.error("Get webhook logs error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // REPORTS
  // ============================================================================
  app.get("/api/sheets/:id/reports", authMiddleware, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      const leads = await storage.getLeadsBySheetId(req.params.id);

      // Calculate metrics based on custom_fields
      const leadsByStatus: Record<string, number> = {};
      const leadsByExecutive: Record<string, number> = {};
      const dailyTrends: { date: string; count: number }[] = [];
      const dateMap: Record<string, number> = {};

      for (const lead of leads) {
        // By status (check common field names: status, lead_status)
        const status = lead.custom_fields?.status || lead.custom_fields?.lead_status;
        if (status) {
          leadsByStatus[status] = (leadsByStatus[status] || 0) + 1;
        }

        // By executive (check common field names: executive, owner, assigned_to)
        const executive = lead.custom_fields?.executive || lead.custom_fields?.owner || lead.custom_fields?.assigned_to;
        if (executive) {
          leadsByExecutive[executive] = (leadsByExecutive[executive] || 0) + 1;
        }

        // Daily trends based on created_at
        const date = lead.created_at.split('T')[0];
        dateMap[date] = (dateMap[date] || 0) + 1;
      }

      // Daily trends array
      Object.entries(dateMap).forEach(([date, count]) => {
        dailyTrends.push({ date, count });
      });
      dailyTrends.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json({
        total_leads: leads.length,
        leads_by_status: leadsByStatus,
        leads_by_executive: leadsByExecutive,
        daily_trends: dailyTrends,
        conversion_rate: 0, // Removed fixed conversion rate since "Converted" status is now custom
        visits_scheduled: 0, // Removed fixed visits_scheduled since fields are custom
        nfdt_count: 0, // Removed fixed nfdt_count since fields are custom
      });
    } catch (error: any) {
      console.error("Get reports error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/global", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      // Super admins see all data, company admins see only their company's data
      let allSheets, allUsers, auditLogs;
      
      if (req.userRole === "super_admin") {
        allSheets = await storage.getAllSheets();
        allUsers = await storage.getAllUsers();
        auditLogs = await storage.getAuditLogs();
      } else {
        // Company admin sees only their company's data
        allSheets = await storage.getSheetsByCompanyId(req.companyId!);
        allUsers = await storage.getUsersByCompanyId(req.companyId!);
        const allLogs = await storage.getAuditLogs();
        auditLogs = allLogs.filter(log => log.company_id === req.companyId);
      }

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

      // For super admins, include per-company statistics
      let companiesStats = [];
      if (req.userRole === "super_admin") {
        const allCompanies = await storage.getAllCompanies();
        
        for (const company of allCompanies) {
          const companyUsers = allUsers.filter(u => u.company_id === company.id);
          const companySheets = allSheets.filter(s => s.company_id === company.id);
          let companyLeadCount = 0;
          
          for (const sheet of companySheets) {
            const leads = await storage.getLeadsBySheetId(sheet.id);
            companyLeadCount += leads.length;
          }
          
          companiesStats.push({
            company_id: company.id,
            company_name: company.name,
            user_count: companyUsers.length,
            sheet_count: companySheets.length,
            lead_count: companyLeadCount,
          });
        }
      }

      res.json({
        total_sheets: allSheets.length,
        total_leads: totalLeads,
        total_users: allUsers.length,
        leads_by_sheet: leadsBySheet,
        recent_activity: auditLogs.slice(0, 20),
        companies: companiesStats, // Only populated for super admins
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
      // Super admins see all logs, company users see only their company's logs
      if (req.userRole === "super_admin") {
        const logs = await storage.getAuditLogs();
        res.json(logs);
      } else if (req.companyId) {
        const allLogs = await storage.getAuditLogs();
        const companyLogs = allLogs.filter(log => log.company_id === req.companyId);
        res.json(companyLogs);
      } else {
        res.json([]);
      }
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

      // Check permissions (unless super admin)
      const user = await storage.getUser(req.userId!);
      if (user?.role !== "super_admin") {
        const sheetUser = await storage.getSheetUser(sheetId, req.userId!);
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
      
      // Get sheet's custom columns (company-wide + sheet-specific)
      const sheetColumns = await storage.getCustomColumns(sheetId);
      
      const fieldMap: Record<string, string> = {};
      const normalizeHeader = (h: string) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
      
      // Build mappings from sheet's custom columns
      const mappings: Record<string, string> = {};
      sheetColumns.forEach(col => {
        const normalized = normalizeHeader(col.name);
        const keyNormalized = normalizeHeader(col.column_key);
        mappings[normalized] = col.column_key;
        mappings[keyNormalized] = col.column_key;
      });

      const seenFields = new Set<string>();
      headers.forEach((header) => {
        const normalized = normalizeHeader(header);
        
        // Check for special "Lead Updates" column
        if (normalized === "leadupdates" || normalized === "updates" || normalized === "updatehistory") {
          fieldMap[header] = "_lead_updates";
        } else {
          const mappedField = mappings[normalized];
          if (mappedField && !seenFields.has(mappedField)) {
            fieldMap[header] = mappedField;
            seenFields.add(mappedField);
          }
        }
      });

      const preview = rows.slice(0, 10);

      res.json({
        headers,
        fieldMap,
        preview,
        totalRows: rows.length,
        fileName: fileName || "upload.xlsx",
        companyColumns: sheetColumns, // Send sheet's columns to frontend for dropdown
      });
    } catch (error: any) {
      console.error("Import preview error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sheets/:id/import/execute", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { fileData, fieldMap } = req.body;
      const sheetId = req.params.id;

      if (!fileData || !fieldMap) {
        return res.status(400).json({ error: "File data and field map required" });
      }
      
      // Parse Excel headers to know what was in the file
      const buffer = Buffer.from(fileData, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: null, raw: false }) as any[];
      const allHeaders = rows.length > 0 ? Object.keys(rows[0]) : [];
      
      // Compute skipped headers: headers that are "_skip", empty, or missing from fieldMap
      const skippedHeaders = allHeaders.filter(header => 
        !fieldMap[header] || fieldMap[header] === "_skip" || fieldMap[header] === ""
      );

      // SECURITY: Check sheet access and company ownership
      const sheet = await storage.getSheet(sheetId);
      if (!sheet) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      // Verify user has access to this sheet
      const hasAccess = await hasSheetAccess(req.userId!, req.userRole!, req.companyId || null, sheetId);
      if (!hasAccess) {
        return res.status(403).json({ error: "You do not have access to this sheet" });
      }

      // SECURITY: Import requires explicit edit permissions (not just implicit company access)
      // Define permission matrix:
      // - Super admins: Always allowed
      // - Company admins: Always allowed for their company's sheets
      // - Sheet owners: Always allowed for their own sheets
      // - Regular users: Must have explicit sheetUser with editor or admin role
      
      const user = await storage.getUser(req.userId!);
      
      // Super admins can import to any sheet
      if (user?.role === "super_admin") {
        // Allowed - proceed
      }
      // Company admins can import to any sheet in their company
      else if (user?.role === "company_admin" && sheet.company_id === req.companyId) {
        // Allowed - proceed
      }
      // Sheet owners can import to their own sheets
      else if (sheet.owner_id === req.userId!) {
        // Allowed - proceed
      }
      // All other users must have explicit sheetUser permission with editor or admin role
      else {
        const sheetUser = await storage.getSheetUser(sheetId, req.userId!);
        if (!sheetUser) {
          return res.status(403).json({ 
            error: "Import requires explicit editor or admin permission on this sheet. Contact the sheet owner to request access." 
          });
        }
        if (sheetUser.role === "viewer") {
          return res.status(403).json({ 
            error: "Viewers cannot import leads. Contact the sheet owner to upgrade your permission to editor or admin." 
          });
        }
        // Has sheetUser with editor or admin role - allowed
      }

      // Limit payload size
      if (fileData.length > 10 * 1024 * 1024) {
        return res.status(413).json({ error: "File too large (max 10MB)" });
      }

      // (Excel already parsed above for header extraction)
      if (rows.length > 10000) {
        return res.status(413).json({ error: "File too large (max 10,000 rows)" });
      }

      // SECURITY: Rebuild column map from storage to prevent tampering with fieldMap
      // This ensures the user can only write to columns actually available in this sheet
      const sheetColumns = await storage.getCustomColumns(sheetId);
      const columnMap = new Map(sheetColumns.map(c => [c.column_key, c]));
      
      // Fetch validation rules for non-blocking validation during import
      const validationRules = await storage.getValidationRules(sheet.company_id, sheetId);
      
      // Validate fieldMap entries - only process columns that exist in this sheet
      // Filter out empty, skip, and invalid mappings
      // Allow special "_lead_updates" field for bulk update history import
      const validatedFieldMap: Record<string, string> = {};
      Object.entries(fieldMap).forEach(([header, columnKey]) => {
        const key = String(columnKey || "").trim();
        if (key && key !== "_skip") {
          if (key === "_lead_updates" || columnMap.has(key)) {
            validatedFieldMap[header] = key;
          }
        }
      });

      // VALIDATION: Check that all required columns are mapped
      const mappedColumnKeys = new Set(Object.values(validatedFieldMap));
      const requiredColumns = sheetColumns.filter(col => col.config.required);
      const unmappedRequired = requiredColumns.filter(col => !mappedColumnKeys.has(col.column_key));
      
      if (unmappedRequired.length > 0) {
        return res.status(400).json({ 
          error: `Required columns must be mapped: ${unmappedRequired.map(c => c.name).join(", ")}. Please map these columns in the import dialog.`,
          unmappedRequired: unmappedRequired.map(c => ({ column_key: c.column_key, name: c.name }))
        });
      }

      // Helper function to parse lead updates from multi-line text
      const parseLeadUpdates = (text: string): Array<{method: string, date: string, remark: string}> => {
        if (!text || typeof text !== 'string') return [];
        
        const updates: Array<{method: string, date: string, remark: string}> = [];
        // Split by newlines and trim each line, but PRESERVE empty lines for proper 3-line grouping
        const lines = text.split('\n').map(l => l.trim());
        
        let i = 0;
        while (i < lines.length) {
          // Each update block needs exactly 3 lines: Method, Date, Remark
          // Stop when we can't form a complete 3-line block
          if (i + 2 >= lines.length) {
            if (i < lines.length) {
              // Incomplete block - emit validation error
              throw new Error(`Incomplete update block at position ${i + 1}: Expected 3 lines (Method, Date, Remark) but found ${lines.length - i}`);
            }
            break;
          }
          
          const rawMethod = lines[i];
          const dateStr = lines[i + 1];
          const remark = lines[i + 2]; // Can be empty string (blank remark is allowed)
          
          // Validate method is not empty (remark can be empty, but method and date cannot)
          if (!rawMethod.trim()) {
            throw new Error(`Update block at position ${i + 1}: Method line cannot be empty`);
          }
          
          // Normalize method with strict validation - only accept known method tokens
          const methodLower = rawMethod.toLowerCase().trim();
          let method: 'call' | 'whatsapp';
          if (methodLower === 'wa' || methodLower === 'whatsapp') {
            method = 'whatsapp';
          } else if (methodLower === 'call' || methodLower === 'phone' || methodLower === 'phone call') {
            method = 'call';
          } else {
            throw new Error(`Update block at position ${i + 1}: Invalid method "${rawMethod}". Must be one of: Call, WA, WhatsApp, Phone`);
          }
          
          // Validate date is not empty
          if (!dateStr.trim()) {
            throw new Error(`Update block at position ${i + 1}: Date line cannot be empty`);
          }
          
          // Parse and normalize date - support multiple formats:
          // DD/MM/YYYY variants: 23/11/2025, 26/10/25, 23-11-2025, 23.11.2025
          // YYYY-MM-DD variants: 2025-11-23 (ISO format)
          const dateNormalized = dateStr.trim().replace(/[.\s]/g, '/'); // Normalize dots/spaces to /
          let dateParts: string[];
          let isISOFormat = false;
          
          // Check if it's YYYY-MM-DD format (ISO) by looking at separator and first part length
          if (dateStr.includes('-')) {
            dateParts = dateStr.trim().split('-');
            if (dateParts.length === 3 && dateParts[0].length === 4) {
              isISOFormat = true;
            } else {
              // DD-MM-YYYY format
              dateParts = dateNormalized.split('/');
            }
          } else {
            dateParts = dateNormalized.split('/');
          }
          
          let formattedDate = '';
          if (dateParts.length === 3) {
            let dayNum: number, monthNum: number, yearStr: string;
            
            if (isISOFormat) {
              // YYYY-MM-DD format
              yearStr = dateParts[0];
              monthNum = parseInt(dateParts[1], 10);
              dayNum = parseInt(dateParts[2], 10);
            } else {
              // DD/MM/YYYY format
              dayNum = parseInt(dateParts[0], 10);
              monthNum = parseInt(dateParts[1], 10);
              yearStr = dateParts[2];
            }
            
            // Validate day/month are numbers
            if (isNaN(dayNum) || isNaN(monthNum)) {
              throw new Error(`Invalid date "${dateStr}": day and month must be numbers`);
            }
            
            // Validate day/month bounds (strict validation to prevent auto-rollover)
            if (monthNum < 1 || monthNum > 12) {
              throw new Error(`Invalid date "${dateStr}": month must be between 1 and 12, got ${monthNum}`);
            }
            if (dayNum < 1 || dayNum > 31) {
              throw new Error(`Invalid date "${dateStr}": day must be between 1 and 31, got ${dayNum}`);
            }
            
            // Handle 2-digit years (e.g., "25" -> "2025") - only for DD/MM/YY format
            let year = yearStr;
            if (!isISOFormat && year.length === 2) {
              const yearNum = parseInt(year, 10);
              if (isNaN(yearNum)) {
                throw new Error(`Invalid date "${dateStr}": year must be a number`);
              }
              // Assume years 00-49 are 2000-2049, 50-99 are 1950-1999
              year = yearNum < 50 ? '20' + year : '19' + year;
            } else if (year.length !== 4) {
              throw new Error(`Invalid date format "${dateStr}": year must be 4 digits (or 2 digits for DD/MM/YY format)`);
            }
            
            const day = String(dayNum).padStart(2, '0');
            const month = String(monthNum).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}`;
            
            // Additional validation: check the date is actually valid (e.g., not Feb 30)
            const testDate = new Date(formattedDate);
            const reconstructed = `${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, '0')}-${String(testDate.getDate()).padStart(2, '0')}`;
            if (testDate.toString() === 'Invalid Date' || reconstructed !== formattedDate) {
              throw new Error(`Invalid date "${dateStr}": not a valid calendar date (e.g., Feb 30, Feb 31 don't exist)`);
            }
          } else {
            throw new Error(`Invalid date format "${dateStr}": expected DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, or YYYY-MM-DD`);
          }
          
          updates.push({ method, date: formattedDate, remark });
          i += 3;
        }
        
        return updates;
      };

      const imported: any[] = [];
      const errors: any[] = [];
      const warnings: any[] = [];
      const io = app.get("io") as SocketIOServer;

      for (let i = 0; i < rows.length; i++) {
        const rowWarnings: string[] = [];
        try {
          const row = rows[i];
          const leadData: any = { 
            sheet_id: sheetId, 
            owner_user_id: req.userId,
            custom_fields: {},
            meta: {},
          };
          const coercionIssues: string[] = []; // Track which fields had coercion issues
          let leadUpdatesText: string | null = null;

          // Process mapped fields (all are custom columns now, plus special _lead_updates)
          Object.entries(validatedFieldMap).forEach(([excelHeader, columnKey]) => {
            const key = columnKey as string;
            
            // Handle special _lead_updates field
            if (key === "_lead_updates") {
              leadUpdatesText = row[excelHeader] ? String(row[excelHeader]) : null;
              return;
            }
            if (row[excelHeader] !== undefined && row[excelHeader] !== null) {
              let value = row[excelHeader];
              const column = columnMap.get(key)!; // Safe to use ! since validatedFieldMap only has valid keys
              
              const originalValue = value;
              
              // Handle type conversions based on column type
              if (column.type === "number") {
                const parsed = parseFloat(String(value));
                if (isNaN(parsed)) {
                  value = null;
                  if (String(originalValue).trim() !== "") {
                    const msg = `Field "${column.name}": invalid number "${originalValue}" converted to empty`;
                    rowWarnings.push(msg);
                    if (column.config.required) {
                      coercionIssues.push(column.name); // Track for better error message
                    }
                  }
                } else {
                  value = parsed;
                }
              } else if (column.type === "date") {
                let validDate = false;
                if (typeof value === "number") {
                  try {
                    const date = XLSX.SSF.parse_date_code(value);
                    value = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
                    validDate = true;
                  } catch {
                    value = null;
                    const msg = `Field "${column.name}": invalid date code "${originalValue}" converted to empty`;
                    rowWarnings.push(msg);
                    if (column.config.required) {
                      coercionIssues.push(column.name);
                    }
                  }
                } else if (typeof value === "string") {
                  const dateOnly = value.trim().split(' ')[0];
                  
                  // Check for ISO format YYYY-MM-DD
                  if (dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
                    value = dateOnly;
                    validDate = true;
                  }
                  // Check for DD-Mon-YYYY format (e.g., "14-May-2026")
                  else if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(dateOnly)) {
                    const monthMap: Record<string, string> = {
                      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
                      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
                    };
                    const parts = dateOnly.split('-');
                    const day = parts[0].padStart(2, '0');
                    const monthAbbr = parts[1].toLowerCase();
                    const year = parts[2];
                    
                    if (monthMap[monthAbbr]) {
                      value = `${year}-${monthMap[monthAbbr]}-${day}`;
                      validDate = true;
                    }
                  }
                  // Check for DD/MM/YYYY or DD-MM-YYYY formats
                  else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(dateOnly)) {
                    const separator = dateOnly.includes('/') ? '/' : '-';
                    const parts = dateOnly.split(separator);
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2];
                    value = `${year}-${month}-${day}`;
                    validDate = true;
                  }
                  
                  if (!validDate) {
                    value = null;
                    if (String(originalValue).trim() !== "") {
                      const msg = `Field "${column.name}": invalid date "${originalValue}" converted to empty`;
                      rowWarnings.push(msg);
                      if (column.config.required) {
                        coercionIssues.push(column.name);
                      }
                    }
                  }
                } else {
                  value = null;
                  const msg = `Field "${column.name}": invalid date type converted to empty`;
                  rowWarnings.push(msg);
                  if (column.config.required) {
                    coercionIssues.push(column.name);
                  }
                }
              } else if (column.type === "boolean") {
                value = ["yes", "true", "1", "y"].includes(String(value).toLowerCase());
              } else if (column.type === "dropdown") {
                // Validate dropdown value against CRM options
                const options = column.config.dropdown_options || [];
                const stringValue = String(value).trim();
                if (options.includes(stringValue)) {
                  value = stringValue;
                } else {
                  value = null;
                  if (stringValue !== "") {
                    if (column.config.required) {
                      throw new Error(`Field "${column.name}": value "${stringValue}" does not match CRM dropdown options. Valid options are: ${options.join(", ")}. This field is required and cannot be empty.`);
                    } else {
                      rowWarnings.push(`Field "${column.name}": value "${stringValue}" does not match CRM dropdown options. Valid options are: ${options.join(", ")}. Value converted to empty.`);
                    }
                  }
                }
              } else {
                value = String(value).trim() || null;
              }
              
              leadData.custom_fields[key] = value;
            }
          });

          // Validate required custom fields (only for this sheet's columns)
          const missingRequired = sheetColumns
            .filter(col => col.config.required)
            .filter(col => {
              const value = leadData.custom_fields[col.column_key];
              return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
            });
            
          if (missingRequired.length > 0) {
            const fieldNames = missingRequired.map(c => c.name);
            // Build more specific error message if coercion caused the missing value
            const coercedFields = fieldNames.filter(name => coercionIssues.includes(name));
            if (coercedFields.length > 0) {
              throw new Error(`Required fields have invalid values (see warnings): ${coercedFields.join(", ")}${coercedFields.length < fieldNames.length ? '; Also missing: ' + fieldNames.filter(n => !coercedFields.includes(n)).join(", ") : ''}`);
            } else {
              throw new Error(`Missing required fields: ${fieldNames.join(", ")}`);
            }
          }

          // Ensure at least one custom field is provided
          if (Object.keys(leadData.custom_fields).length === 0) {
            throw new Error("Row must have at least one mapped field with data");
          }

          // Ensure no undefined values in custom_fields
          Object.keys(leadData.custom_fields).forEach(key => {
            if (leadData.custom_fields[key] === undefined) {
              leadData.custom_fields[key] = null;
            }
          });

          const lead = await storage.createLead(leadData);
          imported.push(lead);

          // Create lead updates if provided
          if (leadUpdatesText) {
            try {
              const parsedUpdates = parseLeadUpdates(leadUpdatesText);
              for (const update of parsedUpdates) {
                await storage.createLeadUpdate({
                  lead_id: lead.id,
                  update_via: update.method as 'call' | 'whatsapp',
                  update_on: update.date,
                  remark: update.remark,
                });
              }
              
              if (parsedUpdates.length > 0) {
                rowWarnings.push(`Imported ${parsedUpdates.length} lead update(s)`);
              }
            } catch (updateError: any) {
              rowWarnings.push(`Failed to parse lead updates: ${updateError.message}`);
            }
          }

          // Validate lead against validation rules (non-blocking)
          if (validationRules.length > 0) {
            const validationResult = validateLeadAgainstRules(lead, validationRules);
            if (!validationResult.isValid) {
              const missingFieldsList = validationResult.missingFields.join(", ");
              rowWarnings.push(`Validation warning: Missing required fields (${validationResult.triggeredBy}): ${missingFieldsList}`);
            }
          }

          // Track warnings ONLY for successfully imported rows (not for failed rows)
          if (rowWarnings.length > 0) {
            warnings.push({ row: i + 1, warnings: rowWarnings });
          }

          await storage.createAuditLog({
            user_id: req.userId!,
            company_id: sheet.company_id,
            action: "import",
            model: "lead",
            model_id: lead.id,
            payload: { source: "excel_import", row: i + 1, fileName: req.body.fileName || "upload" },
          });

          io.to(`sheet:${sheetId}`).emit("lead_created", lead);
        } catch (error: any) {
          // For failed rows, include warnings in the error object (not in global warnings array)
          errors.push({ 
            row: i + 1, 
            error: error.message, 
            warnings: rowWarnings.length > 0 ? rowWarnings : undefined
          });
        }
      }

      res.json({
        imported: imported.length,
        errors: errors.length,
        warnings: warnings.length,
        errorDetails: errors.slice(0, 50), // Increased from 10 to 50
        warningDetails: warnings.slice(0, 50),
        skippedHeaders, // Headers explicitly mapped to "_skip"
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
      
      // Get custom columns for the sheet to know which fields to export
      const columns = await storage.getCustomColumns(req.params.id);
      columns.sort((a, b) => a.order_index - b.order_index);

      // Map leads to export format using custom columns
      const data = leads.map((lead) => {
        const row: Record<string, any> = {
          ID: lead.id,
          "Created At": lead.created_at,
        };
        
        // Add custom field values based on defined columns
        for (const column of columns) {
          row[column.name] = lead.custom_fields[column.column_key] ?? "";
        }
        
        return row;
      });

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

  // ============================================================================
  // SCHEDULED CLEANUP - 30-Day Lead Retention
  // ============================================================================
  // Run initial cleanup on startup
  (async () => {
    try {
      console.log('[Cleanup] Running initial cleanup of deleted leads older than 30 days...');
      const count = await storage.cleanupOldDeletedLeads();
      console.log(`[Cleanup] Initial cleanup completed: ${count} leads permanently removed`);
    } catch (error) {
      console.error('[Cleanup] Failed to run initial lead cleanup:', error);
    }
  })();

  // Schedule daily cleanup (every 24 hours)
  const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  setInterval(async () => {
    try {
      console.log('[Cleanup] Running scheduled cleanup of deleted leads older than 30 days...');
      const count = await storage.cleanupOldDeletedLeads();
      console.log(`[Cleanup] Scheduled cleanup completed: ${count} leads permanently removed`);
    } catch (error) {
      console.error('[Cleanup] Failed to run scheduled lead cleanup:', error);
    }
  }, cleanupInterval);

  return httpServer;
}
