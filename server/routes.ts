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
import { insertQuickFilterSchema, quickFilterConfigSchema, type ActivityLogFilters } from "@shared/schema";
import { notifyLeadAssigned, notifyLeadUpdated, notifyWebhookReceived, notifyUserJoined } from "./push-service";
import { triggerOutgoingWebhooks, getChangedFields, flattenLeadFields } from "./webhook-trigger";
import { 
  logLeadCreated, 
  logLeadUpdated, 
  logLeadDeleted, 
  logLeadRestored,
  logActivity,
  computeFieldChanges,
  logBulkImport,
  logBulkExport,
  logBulkTransfer,
  logBulkDelete,
  logColumnCreated,
  logColumnUpdated,
  logColumnDeleted,
  logSheetCreated,
  logSheetDeleted,
  logUserInvited,
  logApiKeyCreated,
  logApiKeyRevoked,
  logAttendanceEntry,
  logAttendanceExit,
  logForceExitRequested,
  logUserLogin,
} from "./activityLogger";

const HMAC_SECRET = process.env.HMAC_SECRET || "dabluz-webhook-secret-change-in-production";

// Helper function to parse dates in multiple formats (ISO and dd/MM/yy)
function parseDateFlexible(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try ISO format first (YYYY-MM-DD or full ISO string)
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try dd/MM/yy format (used in existing report configs)
  const ddMMyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (ddMMyyMatch) {
    const [, day, month, year] = ddMMyyMatch;
    let fullYear = parseInt(year);
    
    // Convert 2-digit year to 4-digit (assume 20xx for yy < 50, else 19xx)
    if (fullYear < 100) {
      fullYear = fullYear < 50 ? 2000 + fullYear : 1900 + fullYear;
    }
    
    // Month is 0-indexed in JavaScript Date
    date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null; // Could not parse
}

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

// Rate limiters - disable trust proxy validation for Replit deployment
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many login attempts, please try again later",
  validate: { trustProxy: false },
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: "Too many webhook requests",
  validate: { trustProxy: false },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: "Too many signup attempts, please try again later",
  validate: { trustProxy: false },
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      credentials: true,
    },
  });

  // Bootstrap: Ensure Super Admin account exists on startup
  const SUPER_ADMIN_EMAIL_BOOTSTRAP = "adminleadani@leadani.com";
  const SUPER_ADMIN_PASSWORD = "thleadani";
  const SUPER_ADMIN_NAME = "Super Admin";
  
  try {
    const existingAdmin = await storage.getUserByEmail(SUPER_ADMIN_EMAIL_BOOTSTRAP);
    if (!existingAdmin) {
      console.log("Creating Super Admin account...");
      const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
      await storage.createUser({
        email: SUPER_ADMIN_EMAIL_BOOTSTRAP,
        name: SUPER_ADMIN_NAME,
        password_hash: passwordHash,
        role: "super_admin",
        company_id: undefined, // No company association for Super Admin
      });
      console.log("Super Admin account created successfully");
    } else if (existingAdmin.role !== "super_admin") {
      // Fix role if incorrect
      console.log("Fixing Super Admin account role...");
      await storage.updateUser(existingAdmin.id, { role: "super_admin" });
      console.log("Super Admin account role fixed");
    } else {
      console.log("Super Admin account already exists with correct role");
    }
  } catch (error) {
    console.error("Failed to bootstrap Super Admin account:", error);
  }

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

      // Enhanced match-and-update logic based on webhook configuration
      const matchMode = webhook.match_mode || "create_only";
      const matchField = webhook.match_field || "mobile_no";
      const matchValue = leadData[matchField];
      const noMatchAction = webhook.no_match_action || "create_lead";
      const updateFieldMappings = webhook.update_field_mappings || [];
      const sourceLabel = webhook.source_label || "Webhook";
      const today = new Date().toISOString().split('T')[0];
      
      let lead: Lead;
      let existingLead: Lead | undefined = undefined;
      let isDuplicate = false;
      let isTransferred = false;
      let isUpdateAdded = false;
      let previousOwnerName = "";
      let oldSheetId: string | null = null;

      // Helper function to create a new lead
      const createNewLead = async () => {
        return await storage.createLead({
          sheet_id: targetSheetId,
          owner_user_id: webhook.created_by_user_id,
          custom_fields: {
            name: leadData.name || "",
            mobile_no: leadData.mobile_no || "",
            whatsapp: leadData.whatsapp || leadData.mobile_no || "",
            lang: leadData.lang || "",
            occupation: leadData.occupation || "",
            qualification: leadData.qualification || "",
            lead_date: leadData.lead_date || today,
            lead_time: leadData.lead_time || new Date().toTimeString().split(' ')[0].substring(0, 5),
            lead_status: leadData.lead_status || "New",
            visit_status: leadData.visit_status || "Not Visited",
            ...leadData,
          },
          meta: leadData.meta || {},
        });
      };

      // Step 1: Check for existing lead if not create_only mode
      if (matchMode !== "create_only" && matchValue) {
        existingLead = await storage.findLeadByField(webhook.company_id, matchField, String(matchValue));
      }

      if (existingLead) {
        isDuplicate = true;
        
        // Restore if soft-deleted
        if (existingLead.deleted_at) {
          await storage.restoreLead(existingLead.id);
          await storage.createLeadUpdate({
            lead_id: existingLead.id,
            update_via: "webhook",
            update_on: today,
            remark: `Restored due to new lead receipt via ${sourceLabel}`,
            created_by_user_id: webhook.created_by_user_id,
          });
        }

        // Step 2: Handle based on match_mode
        if (matchMode === "match_and_update" || matchMode === "match_or_create") {
          // Update lead fields based on field mappings or merge all data
          const mergedCustomFields = { ...existingLead.custom_fields };
          
          if (updateFieldMappings.length > 0) {
            // Use specific field mappings for updates
            for (const mapping of updateFieldMappings) {
              const sourceValue = getNestedValue(incomingData, mapping.source_field);
              if (sourceValue !== undefined && sourceValue !== null && sourceValue !== "") {
                mergedCustomFields[mapping.target_column] = sourceValue;
              }
            }
          } else {
            // Merge all incoming fields (default behavior)
            for (const [key, value] of Object.entries(leadData)) {
              if (value !== undefined && value !== null && value !== "") {
                mergedCustomFields[key] = value;
              }
            }
          }
          
          // Always update lead_date to today
          mergedCustomFields.lead_date = today;
          
          const updated = await storage.updateLead(existingLead.id, {
            custom_fields: mergedCustomFields,
            deleted_at: null,
          });
          
          if (!updated) {
            errorMessage = "Failed to update existing lead";
            return res.status(500).json({ error: errorMessage });
          }
          
          lead = updated;
          
          // Create update log
          await storage.createLeadUpdate({
            lead_id: existingLead.id,
            update_via: "webhook",
            update_on: today,
            remark: `Lead updated via ${sourceLabel}`,
            created_by_user_id: webhook.created_by_user_id,
          });
          
        } else if (matchMode === "match_and_add_update") {
          // Just add a Lead Update without modifying the lead fields
          lead = existingLead;
          isUpdateAdded = true;
          
          // Build update remark from incoming data
          const updateParts: string[] = [];
          if (updateFieldMappings.length > 0) {
            for (const mapping of updateFieldMappings) {
              const sourceValue = getNestedValue(incomingData, mapping.source_field);
              if (sourceValue !== undefined && sourceValue !== null && sourceValue !== "") {
                updateParts.push(`${mapping.target_column}: ${sourceValue}`);
              }
            }
          } else {
            // Include all mapped fields in the update
            for (const [key, value] of Object.entries(leadData)) {
              if (value !== undefined && value !== null && value !== "" && key !== matchField) {
                updateParts.push(`${key}: ${value}`);
              }
            }
          }
          
          const updateRemark = updateParts.length > 0 
            ? `${sourceLabel} update: ${updateParts.join(", ")}` 
            : `New activity from ${sourceLabel}`;
          
          await storage.createLeadUpdate({
            lead_id: existingLead.id,
            update_via: "webhook",
            update_on: today,
            remark: updateRemark,
            created_by_user_id: webhook.created_by_user_id,
          });
        } else {
          // Fallback for any other mode with existing lead
          lead = existingLead;
        }
        
        // Check if lead needs to be transferred to different sheet
        if (existingLead.sheet_id !== targetSheetId) {
          oldSheetId = existingLead.sheet_id;
          
          const previousOwner = await storage.getUser(existingLead.owner_user_id);
          previousOwnerName = previousOwner?.name || "Unknown";
          
          await storage.updateLead(existingLead.id, {
            sheet_id: targetSheetId,
            owner_user_id: webhook.created_by_user_id,
          });
          
          isTransferred = true;
          
          await storage.createLeadUpdate({
            lead_id: existingLead.id,
            update_via: "transfer",
            update_on: today,
            remark: `Repeat Lead: Transferred from ${previousOwnerName} to ${webhookCreator.name}`,
            created_by_user_id: webhook.created_by_user_id,
          });
          
          const transferredLead = await storage.getLead(existingLead.id);
          if (transferredLead) {
            lead = transferredLead;
          }
        }
        
        createdLeadId = existingLead.id;
        
      } else {
        // No matching lead found - handle based on no_match_action
        if (matchMode === "create_only" || noMatchAction === "create_lead") {
          // Create new lead
          lead = await createNewLead();
          createdLeadId = lead.id;
        } else if (noMatchAction === "ignore") {
          // Silently ignore - return success without creating anything
          requestStatus = "success";
          await storage.createWebhookRequest({
            webhook_id: webhook.id,
            status: "success",
            payload: req.body,
            headers: req.headers as any,
            error_message: null,
            lead_id: null,
            allocated_sheet_id: null,
          });
          alreadyLogged = true;
          
          return res.status(200).json({
            success: true,
            message: `No matching lead found for ${matchField}=${matchValue}. Ignored as configured.`,
            matched: false,
            action: "ignored"
          });
        } else if (noMatchAction === "log_only") {
          // Log the request but don't create a lead
          requestStatus = "success";
          await storage.createWebhookRequest({
            webhook_id: webhook.id,
            status: "success",
            payload: req.body,
            headers: req.headers as any,
            error_message: `No match found for ${matchField}=${matchValue}`,
            lead_id: null,
            allocated_sheet_id: targetSheetId,
          });
          alreadyLogged = true;
          
          return res.status(200).json({
            success: true,
            message: `No matching lead found for ${matchField}=${matchValue}. Logged for review.`,
            matched: false,
            action: "logged"
          });
        } else {
          // Default: create new lead
          lead = await createNewLead();
          createdLeadId = lead.id;
        }
      }

      // Update webhook's last allocated sheet for round-robin
      await storage.updateCompanyWebhook(webhook.id, {
        last_allocated_sheet_id: targetSheetId,
      });

      // Emit real-time events for frontend sync
      const io = app.get("io") as SocketIOServer;
      if (isDuplicate) {
        if (isTransferred) {
          // Lead was transferred - emit delete from old sheet and create in new sheet
          if (oldSheetId) {
            io.to(`sheet:${oldSheetId}`).emit("lead_deleted", { id: lead.id });
          }
          io.to(`sheet:${targetSheetId}`).emit("lead_created", lead);
        } else {
          // Lead was updated in same sheet
          io.to(`sheet:${targetSheetId}`).emit("lead_updated", lead);
        }
      } else {
        // New lead created
        io.to(`sheet:${targetSheetId}`).emit("lead_created", lead);
      }

      requestStatus = "success";
      
      // Send webhook received notification
      const sheet = await storage.getSheet(targetSheetId);
      const leadName = lead.custom_fields?.name || lead.custom_fields?.full_name || "New Lead";
      notifyWebhookReceived(
        webhook.company_id,
        leadName,
        sheet?.name || "Sheet",
        targetSheetId,
        lead.id
      ).catch(err => {
        console.error("Failed to send webhook notification:", err);
      });
      
      // Build response message based on what happened
      let message = "Lead created successfully";
      let action = "created";
      
      if (isDuplicate) {
        if (isUpdateAdded) {
          action = "update_added";
          message = isTransferred 
            ? `Update added to existing lead and transferred to ${webhookCreator.name}`
            : "Update added to existing lead";
        } else if (isTransferred) {
          action = "updated_and_transferred";
          message = `Lead updated and transferred to ${webhookCreator.name}`;
        } else {
          action = "updated";
          message = "Lead updated successfully";
        }
      }
      
      res.status(201).json({ 
        success: true, 
        lead_id: lead.id,
        sheet_id: targetSheetId,
        is_duplicate: isDuplicate,
        is_transferred: isTransferred,
        is_update_added: isUpdateAdded,
        action,
        message
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
  // COMPANY SETTINGS
  // ============================================================================
  // Get company settings (available to all authenticated users in company)
  app.get("/api/company/settings", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: "No company context" });
      }
      const company = await storage.getCompany(req.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json({ settings: company.settings || {} });
    } catch (error: any) {
      console.error("Get company settings error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get company settings (alias for admin panel - company admin only)
  app.get("/api/admin/company/settings", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: "No company context" });
      }
      const company = await storage.getCompany(req.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json({ settings: company.settings || {} });
    } catch (error: any) {
      console.error("Get company settings error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update company settings
  app.patch("/api/admin/company/settings", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: "No company context" });
      }
      
      const company = await storage.getCompany(req.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const incomingSettings = req.body.settings;
      if (!incomingSettings || typeof incomingSettings !== 'object') {
        return res.status(400).json({ error: "Settings must be an object" });
      }

      // Validate mobile_card_columns if present
      if (incomingSettings.mobile_card_columns !== undefined) {
        if (!Array.isArray(incomingSettings.mobile_card_columns)) {
          return res.status(400).json({ error: "mobile_card_columns must be an array" });
        }
        if (!incomingSettings.mobile_card_columns.every((key: any) => typeof key === 'string')) {
          return res.status(400).json({ error: "mobile_card_columns must be an array of strings" });
        }
        // Validate that columns exist for this company
        const companyColumns = await storage.getCompanyColumns(req.companyId);
        const validColumnKeys = new Set(companyColumns.map(c => c.column_key));
        const invalidKeys = incomingSettings.mobile_card_columns.filter((key: string) => !validColumnKeys.has(key));
        if (invalidKeys.length > 0) {
          return res.status(400).json({ error: `Invalid column keys: ${invalidKeys.join(', ')}` });
        }
      }

      // Merge new settings with existing settings (only allow known fields)
      const allowedFields = ['mobile_card_columns'];
      const sanitizedSettings: Record<string, any> = {};
      for (const field of allowedFields) {
        if (incomingSettings[field] !== undefined) {
          sanitizedSettings[field] = incomingSettings[field];
        }
      }

      const updatedSettings = {
        ...company.settings,
        ...sanitizedSettings,
      };

      const updated = await storage.updateCompany(req.companyId, { settings: updatedSettings });

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId,
        action: "update",
        model: "company_settings",
        model_id: req.companyId,
        payload: sanitizedSettings,
      });

      res.json({ settings: updated?.settings || {} });
    } catch (error: any) {
      console.error("Update company settings error:", error);
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

  app.post("/api/admin/company/users/:userId/reset-password", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const { password } = req.body;

      // Validate password
      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Verify user belongs to company
      const userToUpdate = await storage.getUser(userId);
      if (!userToUpdate) {
        return res.status(404).json({ error: "User not found" });
      }

      // Company admins can only reset passwords for users in their own company
      if (req.userRole === "company_admin" && userToUpdate.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot reset password for users from other companies" });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update password
      await storage.updateUserPassword(userId, passwordHash);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId!,
        action: "update",
        model: "user",
        model_id: userId,
        payload: { action: "password_reset", email: userToUpdate.email },
      });

      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
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

      // Activity log for webhook creation
      const user = await storage.getUser(req.userId!);
      if (user) {
        await logActivity({
          actor: { user, source: "ui" },
          companyId: req.companyId,
          sheetId: null,
          sheetName: null,
          action: "webhook_created",
          targetType: "webhook",
          targetId: webhook.id,
          targetName: name,
          extra: { token_preview: `${token.substring(0, 8)}...` },
        }).catch(err => console.error("Activity log error:", err));
      }

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

      const { name, is_active, field_mappings, allocation_rules, match_mode, match_field, update_field_mappings, no_match_action } = req.body;

      // Update webhook basic info
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (is_active !== undefined) updates.is_active = is_active;
      if (match_mode !== undefined) updates.match_mode = match_mode;
      if (match_field !== undefined) updates.match_field = match_field;
      if (update_field_mappings !== undefined) updates.update_field_mappings = update_field_mappings;
      if (no_match_action !== undefined) updates.no_match_action = no_match_action;

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
        const VALUE_LESS_OPERATORS = ['is_empty', 'is_not_empty'];
        const BETWEEN_OPERATORS = ['between', 'date_between'];
        
        // Helper to check if rule has valid conditions (new format or legacy)
        const hasValidConditions = (rule: any): boolean => {
          if (rule.conditions && Array.isArray(rule.conditions) && rule.conditions.length > 0) {
            return rule.conditions.every((c: any) => {
              if (!c.field || !c.operator) return false;
              if (VALUE_LESS_OPERATORS.includes(c.operator)) return true;
              if (BETWEEN_OPERATORS.includes(c.operator)) return !!(c.value && c.value2);
              return !!c.value;
            });
          }
          if (rule.condition_field && rule.condition_operator) {
            if (VALUE_LESS_OPERATORS.includes(rule.condition_operator)) return true;
            return !!rule.condition_value;
          }
          return false;
        };
        
        // Helper to get condition group key
        const getConditionGroupKey = (rule: any): { key: string; label: string } => {
          if (rule.is_default) {
            return { key: 'default', label: 'Default/Fallback Rules' };
          }
          if (rule.conditions && Array.isArray(rule.conditions) && rule.conditions.length > 0) {
            const parts = rule.conditions.map((c: any) => {
              const baseKey = `${c.field}|${c.operator}|${c.value || ''}`;
              return BETWEEN_OPERATORS.includes(c.operator) && c.value2 
                ? `${baseKey}|${c.value2}` 
                : baseKey;
            });
            const label = rule.conditions.map((c: any) => {
              if (VALUE_LESS_OPERATORS.includes(c.operator)) {
                return `${c.field} ${c.operator}`;
              }
              if (BETWEEN_OPERATORS.includes(c.operator) && c.value2) {
                return `${c.field} ${c.operator} "${c.value}" and "${c.value2}"`;
              }
              return `${c.field} ${c.operator} "${c.value}"`;
            }).join(` ${(rule.logical_operator || 'and').toUpperCase()} `);
            return { key: parts.join('::') + '::' + (rule.logical_operator || 'and'), label };
          }
          const condLabel = VALUE_LESS_OPERATORS.includes(rule.condition_operator || '')
            ? `${rule.condition_field} ${rule.condition_operator}`
            : `${rule.condition_field} ${rule.condition_operator} "${rule.condition_value}"`;
          return {
            key: `${rule.condition_field}|${rule.condition_operator}|${rule.condition_value || ''}`,
            label: condLabel
          };
        };

        // Filter out invalid rules
        const validRules = allocation_rules.filter((r: any) => {
          if (!r.sheet_id || r.percentage <= 0) return false;
          if (!r.is_default && !hasValidConditions(r)) return false;
          return true;
        });

        if (validRules.length === 0) {
          return res.status(400).json({ error: "At least one complete allocation rule is required" });
        }

        // Group rules by condition and validate each group totals 100%
        const groups: Record<string, { total: number, label: string }> = {};
        
        validRules.forEach((rule: any) => {
          const { key, label } = getConditionGroupKey(rule);
          if (!groups[key]) {
            groups[key] = { total: 0, label };
          }
          groups[key].total += rule.percentage || 0;
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
        
        // Create new validated rules with support for multi-condition format
        for (const rule of validRules) {
          await storage.createWebhookAllocationRule({
            webhook_id: req.params.id,
            sheet_id: rule.sheet_id,
            percentage: rule.percentage,
            condition_field: rule.condition_field || null,
            condition_operator: rule.condition_operator || null,
            condition_value: rule.condition_value || null,
            conditions: rule.conditions || null,
            logical_operator: rule.logical_operator || 'and',
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

      // Activity log for webhook update
      const user = await storage.getUser(req.userId!);
      if (user) {
        await logActivity({
          actor: { user, source: "ui" },
          companyId: req.companyId!,
          sheetId: null,
          sheetName: null,
          action: "webhook_updated",
          targetType: "webhook",
          targetId: req.params.id,
          targetName: webhook.name,
          extra: { is_active, has_mappings: !!field_mappings, has_rules: !!allocation_rules },
        }).catch(err => console.error("Activity log error:", err));
      }

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

      // Activity log for webhook deletion (before deletion to capture name)
      const user = await storage.getUser(req.userId!);
      if (user) {
        await logActivity({
          actor: { user, source: "ui" },
          companyId: req.companyId!,
          sheetId: null,
          sheetName: null,
          action: "webhook_deleted",
          targetType: "webhook",
          targetId: req.params.id,
          targetName: webhook.name,
          extra: {},
        }).catch(err => console.error("Activity log error:", err));
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
  // OUTGOING WEBHOOKS (Send data out when events happen)
  // ============================================================================

  // Get all outgoing webhooks for the company
  app.get("/api/admin/company/outgoing-webhooks", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: "Must belong to a company" });
      }

      const webhooks = await storage.getOutgoingWebhooksByCompanyId(req.companyId);
      res.json(webhooks);
    } catch (error: any) {
      console.error("Get outgoing webhooks error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get a specific outgoing webhook
  app.get("/api/admin/company/outgoing-webhooks/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const webhook = await storage.getOutgoingWebhook(req.params.id);
      
      if (!webhook) {
        return res.status(404).json({ error: "Outgoing webhook not found" });
      }

      // Company admins can only view webhooks from their company
      if (webhook.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot view webhooks from other companies" });
      }

      res.json(webhook);
    } catch (error: any) {
      console.error("Get outgoing webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new outgoing webhook
  app.post("/api/admin/company/outgoing-webhooks", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: "Must belong to a company" });
      }

      const { 
        name, 
        url, 
        events, 
        field_conditions, 
        sheet_ids, 
        selected_fields, 
        headers, 
        is_active 
      } = req.body;

      if (!name || !url) {
        return res.status(400).json({ error: "Name and URL are required" });
      }

      if (!events || !Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: "At least one event is required" });
      }

      // Generate secret for signing payloads
      const crypto = await import("crypto");
      const secret = crypto.randomBytes(32).toString("hex");

      const webhook = await storage.createOutgoingWebhook({
        company_id: req.companyId,
        name,
        url,
        secret,
        events: events || [],
        field_conditions: field_conditions || [],
        sheet_ids: sheet_ids || [],
        selected_fields: selected_fields || [],
        headers: headers || {},
        is_active: is_active ?? true,
        retry_count: 3,
        created_by_user_id: req.userId!,
      });

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId,
        action: "outgoing_webhook_created",
        model: "OutgoingWebhook",
        model_id: webhook.id,
        payload: { name, url, events },
      });

      // Activity log for outgoing webhook creation
      const user = await storage.getUser(req.userId!);
      if (user) {
        await logActivity({
          actor: { user, source: "ui" },
          companyId: req.companyId,
          sheetId: null,
          sheetName: null,
          action: "outgoing_webhook_created",
          targetType: "outgoing_webhook",
          targetId: webhook.id,
          targetName: name,
          extra: { events: events.join(", "), url_preview: url.substring(0, 50) },
        }).catch(err => console.error("Activity log error:", err));
      }

      res.status(201).json(webhook);
    } catch (error: any) {
      console.error("Create outgoing webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update an outgoing webhook
  app.put("/api/admin/company/outgoing-webhooks/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const webhook = await storage.getOutgoingWebhook(req.params.id);
      
      if (!webhook) {
        return res.status(404).json({ error: "Outgoing webhook not found" });
      }

      // Company admins can only update webhooks from their company
      if (webhook.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot update webhooks from other companies" });
      }

      const { 
        name, 
        url, 
        events, 
        field_conditions, 
        sheet_ids, 
        selected_fields, 
        headers, 
        is_active 
      } = req.body;

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (url !== undefined) updates.url = url;
      if (events !== undefined) updates.events = events;
      if (field_conditions !== undefined) updates.field_conditions = field_conditions;
      if (sheet_ids !== undefined) updates.sheet_ids = sheet_ids;
      if (selected_fields !== undefined) updates.selected_fields = selected_fields;
      if (headers !== undefined) updates.headers = headers;
      if (is_active !== undefined) updates.is_active = is_active;

      const updatedWebhook = await storage.updateOutgoingWebhook(req.params.id, updates);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId!,
        action: "outgoing_webhook_updated",
        model: "OutgoingWebhook",
        model_id: req.params.id,
        payload: { name: updatedWebhook?.name, changes: Object.keys(updates) },
      });

      // Activity log for outgoing webhook update
      const user = await storage.getUser(req.userId!);
      if (user) {
        await logActivity({
          actor: { user, source: "ui" },
          companyId: req.companyId!,
          sheetId: null,
          sheetName: null,
          action: "outgoing_webhook_updated",
          targetType: "outgoing_webhook",
          targetId: req.params.id,
          targetName: webhook.name,
          extra: { changes: Object.keys(updates).join(", ") },
        }).catch(err => console.error("Activity log error:", err));
      }

      res.json(updatedWebhook);
    } catch (error: any) {
      console.error("Update outgoing webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete an outgoing webhook
  app.delete("/api/admin/company/outgoing-webhooks/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const webhook = await storage.getOutgoingWebhook(req.params.id);
      
      if (!webhook) {
        return res.status(404).json({ error: "Outgoing webhook not found" });
      }

      // Company admins can only delete webhooks from their company
      if (webhook.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot delete webhooks from other companies" });
      }

      // Activity log for outgoing webhook deletion (before deletion)
      const user = await storage.getUser(req.userId!);
      if (user) {
        await logActivity({
          actor: { user, source: "ui" },
          companyId: req.companyId!,
          sheetId: null,
          sheetName: null,
          action: "outgoing_webhook_deleted",
          targetType: "outgoing_webhook",
          targetId: req.params.id,
          targetName: webhook.name,
          extra: {},
        }).catch(err => console.error("Activity log error:", err));
      }

      await storage.deleteOutgoingWebhook(req.params.id);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId!,
        action: "outgoing_webhook_deleted",
        model: "OutgoingWebhook",
        model_id: req.params.id,
        payload: { name: webhook.name },
      });

      res.json({ message: "Outgoing webhook deleted" });
    } catch (error: any) {
      console.error("Delete outgoing webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get outgoing webhook logs
  app.get("/api/admin/company/outgoing-webhooks/:id/logs", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const webhook = await storage.getOutgoingWebhook(req.params.id);
      
      if (!webhook) {
        return res.status(404).json({ error: "Outgoing webhook not found" });
      }

      // Company admins can only view webhooks from their company
      if (webhook.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot view webhooks from other companies" });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getOutgoingWebhookLogs(req.params.id, limit);
      res.json(logs);
    } catch (error: any) {
      console.error("Get outgoing webhook logs error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all outgoing webhook logs for the company
  app.get("/api/admin/company/outgoing-webhook-logs", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: "Must belong to a company" });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getOutgoingWebhookLogsByCompanyId(req.companyId, limit);
      res.json(logs);
    } catch (error: any) {
      console.error("Get outgoing webhook logs error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Test an outgoing webhook (send a test payload)
  app.post("/api/admin/company/outgoing-webhooks/:id/test", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const webhook = await storage.getOutgoingWebhook(req.params.id);
      
      if (!webhook) {
        return res.status(404).json({ error: "Outgoing webhook not found" });
      }

      // Company admins can only test webhooks from their company
      if (webhook.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot test webhooks from other companies" });
      }

      // Build test payload
      const testPayload = {
        event: "test",
        timestamp: new Date().toISOString(),
        webhook_id: webhook.id,
        webhook_name: webhook.name,
        test: true,
        data: {
          message: "This is a test webhook from LeadAni LFS",
          lead: {
            id: "test-lead-id",
            full_name: "Test Lead",
            mobile_no: "9876543210",
            status: "New",
          }
        }
      };

      // Sign the payload
      const crypto = await import("crypto");
      const payloadString = JSON.stringify(testPayload);
      const signature = webhook.secret 
        ? crypto.createHmac("sha256", webhook.secret).update(payloadString).digest("hex")
        : null;

      // Send the request
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((webhook.headers as Record<string, string>) || {}),
      };
      if (signature) {
        headers["X-LeadAni-Signature"] = signature;
      }

      let responseStatus = 0;
      let responseBody = "";
      let status: "success" | "failed" = "failed";
      let errorMessage: string | null = null;

      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers,
          body: payloadString,
        });
        
        responseStatus = response.status;
        responseBody = await response.text();
        status = response.ok ? "success" : "failed";
        if (!response.ok) {
          errorMessage = `HTTP ${response.status}: ${responseBody.substring(0, 500)}`;
        }
      } catch (fetchError: any) {
        errorMessage = fetchError.message;
        responseBody = fetchError.message;
      }

      // Log the test
      await storage.createOutgoingWebhookLog({
        webhook_id: webhook.id,
        event_type: "test",
        lead_id: null,
        payload_sent: testPayload,
        response_status: responseStatus,
        response_body: responseBody.substring(0, 5000),
        status,
        error_message: errorMessage,
        retry_attempt: 0,
      });

      res.json({
        success: status === "success",
        response_status: responseStatus,
        response_body: responseBody.substring(0, 1000),
        error: errorMessage,
      });
    } catch (error: any) {
      console.error("Test outgoing webhook error:", error);
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

      // Activity log for sheet creation
      const user = await storage.getUser(req.userId!);
      if (user && req.companyId) {
        await logActivity({
          actor: { user, source: "ui" },
          companyId: req.companyId,
          sheetId: sheet.id,
          sheetName: name,
          action: "sheet_created",
          targetType: "sheet",
          targetId: sheet.id,
          targetName: name,
          extra: { is_personal, visibility },
        }).catch(err => console.error("Activity log error:", err));
      }

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

      // Activity log for sheet update
      const user = await storage.getUser(req.userId!);
      if (user) {
        await logActivity({
          actor: { user, source: "ui" },
          companyId: sheet.company_id,
          sheetId: req.params.id,
          sheetName: sheet.name,
          action: "sheet_updated",
          targetType: "sheet",
          targetId: req.params.id,
          targetName: sheet.name,
          extra: { changes: Object.keys(updates).join(", ") },
        }).catch(err => console.error("Activity log error:", err));
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Update sheet error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/sheets/:id", authMiddleware, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      const { password } = req.body;

      // Verify password is provided
      if (!password) {
        return res.status(400).json({ error: "Password is required to delete a sheet" });
      }

      // Get the current user to verify password
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Incorrect password" });
      }

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

      // Activity log for sheet deletion (before deletion to capture name)
      if (user) {
        await logActivity({
          actor: { user, source: "ui" },
          companyId: sheet.company_id,
          sheetId: req.params.id,
          sheetName: sheet.name,
          action: "sheet_deleted",
          targetType: "sheet",
          targetId: req.params.id,
          targetName: sheet.name,
          extra: {},
        }).catch(err => console.error("Activity log error:", err));
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

  // GET /api/sheets/:sheetId/column-preferences - Get user's column width preferences for a sheet
  app.get("/api/sheets/:sheetId/column-preferences", authMiddleware, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      const preferences = await storage.getUserColumnPreferences(req.userId!, req.params.sheetId);
      
      // Convert to a more convenient format for the frontend
      const preferencesMap: Record<string, number> = {};
      preferences.forEach(pref => {
        preferencesMap[pref.column_key] = pref.width;
      });
      
      res.json(preferencesMap);
    } catch (error: any) {
      console.error("Get column preferences error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/sheets/:sheetId/column-preferences - Save user's column width preferences for a sheet
  app.post("/api/sheets/:sheetId/column-preferences", authMiddleware, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      const { preferences } = req.body;
      
      // Validate preferences format
      if (!preferences || typeof preferences !== 'object') {
        return res.status(400).json({ error: "preferences must be an object" });
      }
      
      // Convert from { column_key: width } to array format with validation
      const preferencesArray = Object.entries(preferences)
        .map(([column_key, width]) => {
          const numWidth = Number(width);
          // Validate width is a finite number >= 60
          if (!isFinite(numWidth) || numWidth < 60) {
            throw new Error(`Invalid width for column ${column_key}: must be a finite number >= 60`);
          }
          return {
            column_key,
            width: numWidth
          };
        });
      
      await storage.saveUserColumnPreferences(req.userId!, req.params.sheetId, preferencesArray);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Save column preferences error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================================
  // USER SHEET VIEW (Personal Column Order & Visibility)
  // ============================================================================
  
  // GET /api/sheets/:sheetId/view - Get user's personal view settings for a sheet
  app.get("/api/sheets/:sheetId/view", authMiddleware, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      const view = await storage.getUserSheetView(req.userId!, req.params.sheetId);
      res.json(view || { column_order: [], hidden_columns: [] });
    } catch (error: any) {
      console.error("Get user sheet view error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /api/sheets/:sheetId/view - Save user's personal view settings for a sheet
  app.put("/api/sheets/:sheetId/view", authMiddleware, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      const { column_order, hidden_columns } = req.body;
      
      // Validate input
      if (!Array.isArray(column_order)) {
        return res.status(400).json({ error: "column_order must be an array" });
      }
      if (!Array.isArray(hidden_columns)) {
        return res.status(400).json({ error: "hidden_columns must be an array" });
      }
      
      const view = await storage.upsertUserSheetView(
        req.userId!, 
        req.params.sheetId, 
        column_order, 
        hidden_columns
      );
      
      res.json(view);
    } catch (error: any) {
      console.error("Save user sheet view error:", error);
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

  // Update user role on sheet
  app.patch("/api/admin/sheets/:sheetId/users/:userId", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { sheetId, userId } = req.params;
      const { role } = req.body;
      
      if (!role || !["viewer", "editor"].includes(role)) {
        return res.status(400).json({ error: "Role must be 'viewer' or 'editor'" });
      }
      
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
      const userToUpdate = await storage.getUser(userId);
      if (!userToUpdate) {
        return res.status(404).json({ error: "User not found" });
      }
      if (userToUpdate.company_id !== sheet.company_id) {
        return res.status(403).json({ error: "User must belong to the same company" });
      }
      
      // Get sheet user assignment
      const sheetUser = await storage.getSheetUser(sheetId, userId);
      if (!sheetUser) {
        return res.status(404).json({ error: "User is not assigned to this sheet" });
      }
      
      // Update role
      const updatedSheetUser = await storage.updateSheetUser(sheetUser.id, { role });
      
      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: req.companyId!,
        action: "update",
        model: "sheet_user",
        model_id: sheetUser.id,
        payload: { sheet_id: sheetId, user_id: userId, old_role: sheetUser.role, new_role: role },
      });
      
      res.json(updatedSheetUser);
    } catch (error: any) {
      console.error("Update sheet user role error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // LEADS
  // ============================================================================
  
  // Helper to inject lead.created_at into custom_fields for proper grid display/sorting
  const injectCreatedAtToCustomFields = (lead: any) => {
    return {
      ...lead,
      custom_fields: {
        ...lead.custom_fields,
        created_at: lead.created_at || lead.custom_fields?.created_at,
      },
    };
  };
  
  app.get("/api/sheets/:id/leads", authMiddleware, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      const leads = await storage.getLeadsBySheetId(req.params.id);
      // Inject created_at into custom_fields for each lead
      const enrichedLeads = leads.map(injectCreatedAtToCustomFields);
      res.json(enrichedLeads);
    } catch (error: any) {
      console.error("Get leads error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Paginated multi-sheet leads endpoint
  app.post("/api/leads/query", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { sheetIds, page = 1, limit = 50, sortBy, sortOrder, filters } = req.body;
      
      if (!sheetIds || !Array.isArray(sheetIds) || sheetIds.length === 0) {
        return res.status(400).json({ error: "sheetIds array is required" });
      }
      
      // Verify user has access to all requested sheets
      const accessibleSheetIds: string[] = [];
      for (const sheetId of sheetIds) {
        const hasAccess = await hasSheetAccess(req.userId!, req.userRole!, req.companyId || null, sheetId);
        if (hasAccess) {
          accessibleSheetIds.push(sheetId);
        }
      }
      
      if (accessibleSheetIds.length === 0) {
        return res.status(403).json({ error: "No access to any of the requested sheets" });
      }
      
      const result = await storage.getLeadsBySheetIds({
        sheetIds: accessibleSheetIds,
        page: Math.max(1, parseInt(page) || 1),
        limit: Math.min(100, Math.max(1, parseInt(limit) || 50)),
        sortBy,
        sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
        filters: filters || {},
      });
      
      // Get sheet info for the Sheet Name column
      const sheetMap: Record<string, string> = {};
      for (const sheetId of accessibleSheetIds) {
        const sheet = await storage.getSheet(sheetId);
        if (sheet) {
          sheetMap[sheetId] = sheet.name;
        }
      }
      
      // Inject created_at into custom_fields for each lead
      const enrichedLeads = result.leads.map(injectCreatedAtToCustomFields);
      
      res.json({
        ...result,
        leads: enrichedLeads,
        sheetNames: sheetMap,
        requestedSheetIds: sheetIds,
        accessibleSheetIds,
      });
    } catch (error: any) {
      console.error("Query leads error:", error);
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

      // Activity log for lead creation (awaited for reliability)
      const user = await storage.getUser(req.userId!);
      if (user) {
        await logLeadCreated(
          { user, source: "ui" },
          lead as any,
          sheet as any,
          customColumns as any[]
        ).catch(err => console.error("Activity log error:", err));
      }

      // Realtime update
      const io = app.get("io") as SocketIOServer;
      io.to(`sheet:${req.params.id}`).emit("lead_created", lead);

      // Trigger outgoing webhooks for lead_created event
      triggerOutgoingWebhooks("lead_created", {
        lead,
        sheetId: req.params.id,
        companyId: sheet.company_id,
        userId: req.userId,
      });

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

      // Capture before state for webhook field change tracking
      const beforeFields = flattenLeadFields(lead);

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

      // Activity log for lead update (capture all field-level changes)
      if (updated) {
        const user = await storage.getUser(req.userId!);
        if (user) {
          const customColumns = await storage.getCustomColumns(lead.sheet_id);
          // Track custom_fields changes
          if (req.body.custom_fields) {
            await logLeadUpdated(
              { user, source: "ui" },
              updated as any,
              lead.custom_fields || {},
              updated.custom_fields || {},
              sheet as any,
              customColumns as any[]
            ).catch(err => console.error("Activity log error:", err));
          }
          // Track owner changes
          if (req.body.owner_user_id && req.body.owner_user_id !== lead.owner_user_id) {
            const oldOwner = await storage.getUser(lead.owner_user_id);
            const newOwner = await storage.getUser(req.body.owner_user_id);
            const leadName = updated.custom_fields?.full_name || updated.custom_fields?.name || "Lead";
            await logActivity({
              actor: { user, source: "ui" },
              companyId: sheet.company_id,
              sheetId: lead.sheet_id,
              sheetName: sheet.name,
              action: "lead_transferred",
              targetType: "lead",
              targetId: lead.id,
              targetName: leadName,
              extra: { 
                from_user: oldOwner?.name || "Unknown",
                to_user: newOwner?.name || "Unknown",
              },
            }).catch(err => console.error("Activity log error:", err));
          }
        }
      }

      // Send notification to lead owner if updated by someone else
      if (lead.owner_user_id && lead.owner_user_id !== req.userId) {
        const updater = await storage.getUser(req.userId!);
        const leadName = updated?.custom_fields?.name || updated?.custom_fields?.full_name || "Lead";
        notifyLeadUpdated(
          lead.owner_user_id,
          updater?.name || "Someone",
          leadName,
          lead.sheet_id,
          lead.id,
          req.userId!
        ).catch(err => {
          console.error("Failed to send lead updated notification:", err);
        });
      }

      // Realtime update
      const io = app.get("io") as SocketIOServer;
      io.to(`sheet:${lead.sheet_id}`).emit("lead_updated", updated);

      // Trigger outgoing webhooks for lead_updated and field_changed events
      if (updated) {
        const afterFields = flattenLeadFields(updated);
        const changedFields = getChangedFields(beforeFields, afterFields);
        
        triggerOutgoingWebhooks("lead_updated", {
          lead: updated,
          sheetId: lead.sheet_id,
          companyId: sheet.company_id,
          userId: req.userId,
          beforeFields,
          afterFields,
          changedFields,
        });

        if (changedFields.length > 0) {
          triggerOutgoingWebhooks("field_changed", {
            lead: updated,
            sheetId: lead.sheet_id,
            companyId: sheet.company_id,
            userId: req.userId,
            beforeFields,
            afterFields,
            changedFields,
          });
        }
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Update lead error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update lead thought status (Sure/Maybe/Clear)
  app.patch("/api/leads/:id/thought", authMiddleware, async (req: AuthRequest, res) => {
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
          return res.status(403).json({ error: "Viewers cannot modify lead thoughts" });
        }
      }

      // Validate thought value
      const { thought } = req.body;
      if (thought !== null && thought !== "sure" && thought !== "maybe") {
        return res.status(400).json({ error: "Invalid thought value. Must be 'sure', 'maybe', or null" });
      }

      // Update lead meta with thought (null-safe spread)
      const updatedMeta = { ...(lead.meta ?? {}), thought: thought || undefined };
      if (!thought) {
        delete updatedMeta.thought;
      }
      
      const updated = await storage.updateLead(req.params.id, { meta: updatedMeta });

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: sheet.company_id,
        action: "update",
        model: "lead",
        model_id: req.params.id,
        payload: { thought },
      });

      // Activity log for thought change (awaited for reliability)
      const user = await storage.getUser(req.userId!);
      if (user) {
        const leadName = lead.custom_fields?.full_name || lead.custom_fields?.name || "Lead";
        await logActivity({
          actor: { user, source: "ui" },
          companyId: sheet.company_id,
          sheetId: lead.sheet_id,
          sheetName: sheet.name,
          action: "lead_thought_changed",
          targetType: "lead",
          targetId: lead.id,
          targetName: leadName,
          extra: { thought: thought || "cleared" },
        }).catch(err => console.error("Activity log error:", err));
      }

      // Realtime update
      const io = app.get("io") as SocketIOServer;
      io.to(`sheet:${lead.sheet_id}`).emit("lead_updated", updated);

      res.json(updated);
    } catch (error: any) {
      console.error("Update lead thought error:", error);
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

      // Activity log for lead deletion (awaited for reliability)
      const user = await storage.getUser(req.userId!);
      if (user) {
        await logLeadDeleted({ user, source: "ui" }, lead as any, sheet as any)
          .catch(err => console.error("Activity log error:", err));
      }

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
      
      // Enrich deleted leads with user names and extract contact fields
      const enrichedLeads = await Promise.all(deletedLeads.map(async (lead) => {
        // Get user who deleted the lead
        let deletedByUserName = "Unknown";
        if (lead.deleted_by_user_id) {
          const deletedByUser = await storage.getUser(lead.deleted_by_user_id);
          if (deletedByUser) {
            deletedByUserName = deletedByUser.name;
          }
        }
        
        // Extract contact fields from custom_fields (case-insensitive matching)
        const customFields = lead.custom_fields || {};
        const getFieldValue = (keys: string[]) => {
          for (const key of keys) {
            const matchKey = Object.keys(customFields).find(k => k.toLowerCase() === key.toLowerCase());
            if (matchKey && customFields[matchKey]) {
              return String(customFields[matchKey]);
            }
          }
          return null;
        };
        
        return {
          ...lead,
          sheet_name: sheet.name,
          deleted_by_user_name: deletedByUserName,
          full_name: getFieldValue(['full_name', 'fullname', 'name', 'full name']),
          mobile: getFieldValue(['mob_no', 'mobile', 'phone', 'phone_no', 'mob no', 'phone no', 'mobile_no', 'mobile no']),
          whatsapp: getFieldValue(['whatsapp_no', 'whatsapp', 'whats_app', 'whatsapp no', 'whats app no', 'wa_no']),
        };
      }));
      
      res.json(enrichedLeads);
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

        // Activity log for lead restore (awaited for reliability)
        const user = await storage.getUser(req.userId!);
        if (user) {
          await logLeadRestored({ user, source: "ui" }, lead as any, sheet as any)
            .catch(err => console.error("Activity log error:", err));
        }

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

          // Trigger outgoing webhooks for lead_transferred event
          if (updatedLead) {
            triggerOutgoingWebhooks("lead_transferred", {
              lead: updatedLead,
              sheetId: targetSheetId,
              companyId: targetSheet.company_id,
              userId: req.userId,
            });
          }

          results.push({ leadId, success: true });
        } catch (transferError: any) {
          console.error(`Failed to transfer lead ${leadId}:`, transferError);
          results.push({ leadId, success: false, error: transferError.message || "Transfer operation failed" });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      // Activity log for bulk transfer
      if (successCount > 0 && transferUser) {
        await logActivity({
          actor: { user: transferUser as any, source: "ui" },
          companyId: targetSheet.company_id,
          sheetId: targetSheetId,
          sheetName: targetSheet.name,
          action: "bulk_transfer",
          targetType: "lead",
          targetId: targetSheetId,
          targetName: `${successCount} leads`,
          extra: {
            count: successCount,
            failed_count: failCount,
            target_sheet: targetSheet.name,
          },
        }).catch(err => console.error("Activity log error:", err));
      }

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

      // Activity log for lead update (remarks/NFDT)
      const user = await storage.getUser(req.userId!);
      if (user) {
        const leadName = lead.custom_fields?.full_name || lead.custom_fields?.name || "Lead";
        await logActivity({
          actor: { user, source: "ui" },
          companyId: sheet.company_id,
          sheetId: lead.sheet_id,
          sheetName: sheet.name,
          action: "lead_update_added",
          targetType: "lead_update",
          targetId: lead.id,
          targetName: leadName,
          extra: {
            remark_preview: update.remark?.substring(0, 100),
            nfdt: update.next_followup_date,
          },
        }).catch(err => console.error("Activity log error:", err));
      }

      // Realtime update
      const io = app.get("io") as SocketIOServer;
      io.to(`sheet:${lead.sheet_id}`).emit("lead_updated", lead);

      // Trigger outgoing webhooks for lead_update_added event
      triggerOutgoingWebhooks("lead_update_added", {
        lead,
        sheetId: lead.sheet_id,
        companyId: sheet.company_id,
        userId: req.userId,
        updateText: update.remark || "",
      });

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

      // Activity log for dropdown option creation
      const user = await storage.getUser(req.userId!);
      if (user) {
        await logActivity({
          actor: { user, source: "ui" },
          companyId: sheet.company_id,
          sheetId: req.params.id,
          sheetName: sheet.name,
          action: "dropdown_option_created",
          targetType: "dropdown_option",
          targetId: option.id,
          targetName: req.body.value,
          extra: { column_key: req.params.columnKey },
        }).catch(err => console.error("Activity log error:", err));
      }

      res.status(201).json(option);
    } catch (error: any) {
      console.error("Create dropdown option error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/sheets/:id/dropdowns/:columnKey/:optionId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const sheet = await storage.getSheet(req.params.id);
      
      await storage.deleteDropdownOption(req.params.optionId);

      // Audit log
      await storage.createAuditLog({
        user_id: req.userId!,
        company_id: sheet?.company_id,
        action: "delete",
        model: "dropdown_option",
        model_id: req.params.optionId,
        payload: {},
      });

      // Activity log for dropdown option deletion
      if (sheet) {
        const user = await storage.getUser(req.userId!);
        if (user) {
          await logActivity({
            actor: { user, source: "ui" },
            companyId: sheet.company_id,
            sheetId: req.params.id,
            sheetName: sheet.name,
            action: "dropdown_option_deleted",
            targetType: "dropdown_option",
            targetId: req.params.optionId,
            targetName: `Option in ${req.params.columnKey}`,
            extra: { column_key: req.params.columnKey },
          }).catch(err => console.error("Activity log error:", err));
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete dropdown option error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // CUSTOM COLUMNS (Company-Scoped)
  // ============================================================================
  
  // System columns that must exist for every company
  const SYSTEM_COLUMNS = [
    { name: "Full Name", column_key: "full_name", type: "text" as const, order_index: 0 },
    { name: "Mobile No", column_key: "mobile_no", type: "mobile" as const, order_index: 1 },
    { name: "Created At", column_key: "created_at", type: "datetime" as const, order_index: 2 },
  ];

  // Get company-wide columns (and optionally sheet-specific overrides)
  app.get("/api/company/columns", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId && req.userRole !== "super_admin") {
        return res.status(403).json({ error: "Must belong to a company" });
      }

      const companyId = req.userRole === "super_admin" && req.query.company_id 
        ? req.query.company_id as string
        : req.companyId!;

      let columns = await storage.getCompanyColumns(companyId);
      
      // Ensure all system columns exist for this company
      const existingKeys = new Set(columns.map(c => c.column_key));
      const missingSystemCols = SYSTEM_COLUMNS.filter(s => !existingKeys.has(s.column_key));
      
      if (missingSystemCols.length > 0) {
        // For each missing system column, insert at its correct order_index
        // and shift only the columns that would be displaced
        for (const sysCol of missingSystemCols) {
          // Double-check to avoid race condition duplicates
          const currentColumns = await storage.getCompanyColumns(companyId);
          const alreadyExists = currentColumns.some(c => c.column_key === sysCol.column_key);
          
          if (!alreadyExists) {
            // Shift columns that are at or after the target position
            // Sort in DESCENDING order to avoid transient unique constraint violations
            const columnsToShift = currentColumns
              .filter(c => c.order_index >= sysCol.order_index)
              .sort((a, b) => b.order_index - a.order_index);
            
            for (const col of columnsToShift) {
              await storage.updateCustomColumn(col.id, { 
                order_index: col.order_index + 1 
              });
            }
            
            // Insert the system column at its designated position
            await storage.createCustomColumn({
              company_id: companyId,
              sheet_id: null,
              name: sysCol.name,
              column_key: sysCol.column_key,
              type: sysCol.type,
              config: { required: true, is_system_column: true },
              order_index: sysCol.order_index,
            });
          }
        }
        
        // Refetch with updated order
        columns = await storage.getCompanyColumns(companyId);
      }
      
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

      // Activity log for column creation
      const user = await storage.getUser(req.userId!);
      if (user) {
        const company = await storage.getCompany(companyId);
        await logActivity({
          actor: { user, source: "ui" },
          companyId,
          sheetId: sheet_id || null,
          sheetName: null,
          action: "column_created",
          targetType: "column",
          targetId: column.id,
          targetName: name,
          extra: { column_type: type },
        }).catch(err => console.error("Activity log error:", err));
      }

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

  // System column keys that cannot be deleted or have their core properties modified
  const PROTECTED_SYSTEM_COLUMN_KEYS = ["full_name", "mobile_no", "created_at"];
  
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

      const isSystemColumn = PROTECTED_SYSTEM_COLUMN_KEYS.includes(column.column_key) || 
                             (column.config && (column.config as any).is_system_column);

      // Protect system columns from critical modifications
      if (isSystemColumn) {
        const { type, config } = req.body;
        
        // Block type changes for system columns
        if (type !== undefined && type !== column.type) {
          return res.status(400).json({ 
            error: "Cannot modify system column", 
            message: `The "${column.name}" column type cannot be changed.` 
          });
        }
        
        // Block explicit removal of required or is_system_column flags
        if (config !== undefined) {
          if (config.required === false) {
            return res.status(400).json({ 
              error: "Cannot modify system column", 
              message: `The "${column.name}" column must remain required.` 
            });
          }
          if (config.is_system_column === false) {
            return res.status(400).json({ 
              error: "Cannot modify system column", 
              message: `The "${column.name}" column system status cannot be changed.` 
            });
          }
        }
      }

      const { name, type, config } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (type !== undefined) updates.type = type;
      
      // For config, merge with existing and enforce system column flags
      if (config !== undefined) {
        const existingConfig = column.config || {};
        const mergedConfig = { ...existingConfig, ...config };
        
        // Always re-enforce mandatory flags for system columns
        if (isSystemColumn) {
          mergedConfig.required = true;
          mergedConfig.is_system_column = true;
        }
        
        updates.config = mergedConfig;
      }

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

      // Activity log for column update
      const user = await storage.getUser(req.userId!);
      if (user) {
        await logActivity({
          actor: { user, source: "ui" },
          companyId: column.company_id,
          sheetId: column.sheet_id,
          sheetName: null,
          action: "column_updated",
          targetType: "column",
          targetId: column.id,
          targetName: column.name,
          extra: { changes: Object.keys(updates).join(", ") },
        }).catch(err => console.error("Activity log error:", err));
      }

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

      // Prevent deletion of system columns (Full Name and Mobile No)
      const isSystemColumn = PROTECTED_SYSTEM_COLUMN_KEYS.includes(column.column_key) || 
                             (column.config && (column.config as any).is_system_column);
      if (isSystemColumn) {
        return res.status(400).json({ 
          error: "Cannot delete system columns", 
          message: `The "${column.name}" column is required and cannot be deleted.` 
        });
      }

      // Activity log for column deletion (before deletion to capture name)
      const user = await storage.getUser(req.userId!);
      if (user) {
        await logActivity({
          actor: { user, source: "ui" },
          companyId: column.company_id,
          sheetId: column.sheet_id,
          sheetName: null,
          action: "column_deleted",
          targetType: "column",
          targetId: column.id,
          targetName: column.name,
          extra: { column_key: column.column_key, column_type: column.type },
        }).catch(err => console.error("Activity log error:", err));
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

  // Get dropdown options for a specific column key at company level
  app.get("/api/company/dropdown-options/:columnKey", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId && req.userRole !== "super_admin") {
        return res.status(403).json({ error: "Must belong to a company" });
      }

      const companyId = req.userRole === "super_admin" && req.query.company_id 
        ? req.query.company_id as string
        : req.companyId!;

      // First try to get from dropdown_options table
      let options = await storage.getDropdownOptionsByColumn(companyId, req.params.columnKey);
      
      // If no options in table, check the column's config.dropdown_options
      if (options.length === 0) {
        const columns = await storage.getCompanyColumns(companyId);
        const column = columns.find(c => c.column_key === req.params.columnKey && c.type === "dropdown");
        
        if (column && column.config && Array.isArray((column.config as any).dropdown_options)) {
          const configOptions = (column.config as any).dropdown_options as string[];
          // Convert config options to DropdownOption format
          options = configOptions.map((value, index) => ({
            id: `${column.id}-${index}`,
            company_id: companyId,
            sheet_id: column.sheet_id,
            column_key: req.params.columnKey,
            value: value,
            order_index: index,
            created_at: new Date().toISOString(),
          }));
        }
      }
      
      // Sort by order_index
      options.sort((a, b) => a.order_index - b.order_index);
      
      res.json(options);
    } catch (error: any) {
      console.error("Get company dropdown options error:", error);
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
      let columns = await storage.getCompanyColumns(sheet.company_id);
      
      // Ensure all system columns exist for this company (same logic as /api/company/columns)
      const existingKeys = new Set(columns.map(c => c.column_key));
      const missingSystemCols = SYSTEM_COLUMNS.filter(s => !existingKeys.has(s.column_key));
      
      if (missingSystemCols.length > 0) {
        for (const sysCol of missingSystemCols) {
          const currentColumns = await storage.getCompanyColumns(sheet.company_id);
          const alreadyExists = currentColumns.some(c => c.column_key === sysCol.column_key);
          
          if (!alreadyExists) {
            const columnsToShift = currentColumns
              .filter(c => c.order_index >= sysCol.order_index)
              .sort((a, b) => b.order_index - a.order_index);
            
            for (const col of columnsToShift) {
              await storage.updateCustomColumn(col.id, { 
                order_index: col.order_index + 1 
              });
            }
            
            await storage.createCustomColumn({
              company_id: sheet.company_id,
              sheet_id: null,
              name: sysCol.name,
              column_key: sysCol.column_key,
              type: sysCol.type,
              config: { required: true, is_system_column: true },
              order_index: sysCol.order_index,
            });
          }
        }
        
        columns = await storage.getCompanyColumns(sheet.company_id);
      }
      
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
      
      // Return merged result sorted by order_index
      const mergedColumns = Array.from(columnMap.values()).sort((a, b) => a.order_index - b.order_index);
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
        logical_operator: "and",
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

      // Apply date range filter (from query params or report config)
      let filteredLeads = allLeads;
      const startDateStr = req.query.start_date as string || report.config?.date_range?.start;
      const endDateStr = req.query.end_date as string || report.config?.date_range?.end;
      
      if (startDateStr || endDateStr) {
        // Parse and validate dates (supports ISO and dd/MM/yy formats)
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        
        if (startDateStr) {
          startDate = parseDateFlexible(startDateStr);
          if (!startDate) {
            return res.status(422).json({ 
              error: "Invalid start date format. Use ISO format (YYYY-MM-DD) or dd/MM/yy." 
            });
          }
        }
        
        if (endDateStr) {
          endDate = parseDateFlexible(endDateStr);
          if (!endDate) {
            return res.status(422).json({ 
              error: "Invalid end date format. Use ISO format (YYYY-MM-DD) or dd/MM/yy." 
            });
          }
        }
        
        // Validate start <= end
        if (startDate && endDate && startDate > endDate) {
          return res.status(422).json({ 
            error: "Start date must be before or equal to end date" 
          });
        }
        
        // Filter leads by date range
        filteredLeads = allLeads.filter(lead => {
          const leadDate = new Date(lead.created_at);
          if (startDate && leadDate < startDate) return false;
          if (endDate && leadDate > endDate) return false;
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

  // GET /api/company/reports/:reportId/drilldown - Get leads for a specific data point
  app.get("/api/company/reports/:reportId/drilldown", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const report = await storage.getReport(req.params.reportId);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      // Verify company access
      if (req.userRole === "company_admin" && report.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot access reports from other companies" });
      }

      // Parse filters from query params
      let filters: Record<string, any> = {};
      if (req.query.filters) {
        try {
          filters = JSON.parse(req.query.filters as string);
        } catch (e) {
          return res.status(400).json({ error: "Invalid filters format" });
        }
      }

      // Parse pagination
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

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
        const companyId = req.companyId || report.company_id;
        
        if (filterSheetIds) {
          const companySheets = await storage.getSheetsByCompanyId(companyId);
          const companySheetIds = companySheets.map(s => s.id);
          accessibleSheetIds = filterSheetIds.filter(sheetId => companySheetIds.includes(sheetId));
        } else {
          accessibleSheetIds = Array.isArray(report.sheet_ids) && report.sheet_ids.length > 0
            ? report.sheet_ids
            : (await storage.getSheetsByCompanyId(companyId)).map(s => s.id);
        }
      } else {
        const userSheets = await storage.getSheetsByUserId(req.userId!);
        const userSheetIds = userSheets.map(s => s.id);
        
        if (filterSheetIds) {
          accessibleSheetIds = filterSheetIds.filter(sheetId => userSheetIds.includes(sheetId));
        } else {
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

      // Apply filters
      let filteredLeads = allLeads.filter(lead => {
        for (const [key, value] of Object.entries(filters)) {
          // Check both direct properties and custom_fields
          const leadValue = lead[key as keyof typeof lead] || lead.custom_fields?.[key];
          
          // Handle null/undefined comparisons
          if (value === null || value === "null") {
            if (leadValue !== null && leadValue !== undefined && leadValue !== "") {
              return false;
            }
          } else if (leadValue !== value) {
            return false;
          }
        }
        return true;
      });

      // Apply date range filter if configured
      if (report.config?.date_range) {
        const { start, end } = report.config.date_range;
        filteredLeads = filteredLeads.filter(lead => {
          const leadDate = new Date(lead.created_at);
          if (start && leadDate < new Date(start)) return false;
          if (end && leadDate > new Date(end)) return false;
          return true;
        });
      }

      // Get total count before pagination
      const total = filteredLeads.length;
      const totalPages = Math.ceil(total / limit);

      // Apply pagination
      const paginatedLeads = filteredLeads.slice(offset, offset + limit);

      // Enrich leads with sheet and owner information
      const enrichedLeads = await Promise.all(
        paginatedLeads.map(async (lead) => {
          const sheet = await storage.getSheet(lead.sheet_id);
          const owner = await storage.getUser(lead.owner_user_id);
          
          return {
            ...lead,
            sheet_name: sheet?.name || "Unknown",
            owner_name: owner?.name || "Unknown",
          };
        })
      );

      res.json({
        leads: enrichedLeads,
        total,
        page,
        limit,
        total_pages: totalPages,
      });
    } catch (error: any) {
      console.error("Get report drilldown error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/company/executive-performance - Get executive performance data by dropdown column option
  app.get("/api/company/executive-performance", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Get parameters
      const columnKey = req.query.column_key as string;
      const optionValue = req.query.option_value as string;
      
      if (!columnKey || !optionValue) {
        return res.status(400).json({ 
          error: "Missing required parameters: column_key and option_value" 
        });
      }
      
      // Get company ID
      const companyId = req.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "Company access required" });
      }
      
      // Get accessible sheet IDs for the user
      let sheets: any[] = [];
      if (req.userRole === "company_admin" || req.userRole === "super_admin") {
        sheets = await storage.getSheetsByCompanyId(companyId);
      } else {
        sheets = await storage.getSheetsByUserId(req.userId!);
      }
      
      if (sheets.length === 0) {
        return res.json({
          column_key: columnKey,
          option_value: optionValue,
          sheets: [],
          generated_at: new Date().toISOString(),
        });
      }
      
      // Calculate date boundaries
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Start of current week (Monday)
      const dayOfWeek = now.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - daysFromMonday);
      
      // Last 30 days
      const thirtyDaysAgo = new Date(todayStart);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Aggregate data per sheet
      const sheetData = await Promise.all(
        sheets.map(async (sheet) => {
          // Get all leads for this sheet (excluding soft-deleted)
          const allLeads = await storage.getLeadsBySheetId(sheet.id);
          const activeLeads = allLeads.filter(lead => !lead.deleted_at);
          
          // Filter leads matching the column/option
          const matchingLeads = activeLeads.filter(lead => {
            const fieldValue = lead.custom_fields?.[columnKey];
            if (Array.isArray(fieldValue)) {
              return fieldValue.includes(optionValue);
            }
            return fieldValue === optionValue;
          });
          
          // Count by time period
          let todayCount = 0;
          let weekCount = 0;
          let monthCount = 0;
          
          matchingLeads.forEach(lead => {
            const createdAt = new Date(lead.created_at);
            
            if (createdAt >= todayStart) {
              todayCount++;
            }
            if (createdAt >= weekStart) {
              weekCount++;
            }
            if (createdAt >= thirtyDaysAgo) {
              monthCount++;
            }
          });
          
          return {
            sheet_id: sheet.id,
            sheet_name: sheet.name,
            today: todayCount,
            this_week: weekCount,
            last_30_days: monthCount,
            total: matchingLeads.length,
          };
        })
      );
      
      // Sort by total count descending
      sheetData.sort((a, b) => b.total - a.total);
      
      res.json({
        column_key: columnKey,
        option_value: optionValue,
        sheets: sheetData,
        generated_at: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Get executive performance error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // GET /api/company/executive-performance/drilldown - Get leads for a specific sheet/time period
  app.get("/api/company/executive-performance/drilldown", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const sheetId = req.query.sheet_id as string;
      const columnKey = req.query.column_key as string;
      const optionValue = req.query.option_value as string;
      const timePeriod = req.query.time_period as string; // "today", "this_week", "last_30_days", "total"
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      
      if (!sheetId || !columnKey || !optionValue) {
        return res.status(400).json({ 
          error: "Missing required parameters: sheet_id, column_key, option_value" 
        });
      }
      
      // Check sheet access
      const hasAccess = await hasSheetAccess(req.userId!, req.userRole!, req.companyId || null, sheetId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to this sheet" });
      }
      
      // Get sheet for enrichment
      const sheet = await storage.getSheet(sheetId);
      
      // Calculate date boundaries
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const dayOfWeek = now.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - daysFromMonday);
      
      const thirtyDaysAgo = new Date(todayStart);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Get all leads for this sheet
      const allLeads = await storage.getLeadsBySheetId(sheetId);
      const activeLeads = allLeads.filter(lead => !lead.deleted_at);
      
      // Filter leads matching the column/option
      let matchingLeads = activeLeads.filter(lead => {
        const fieldValue = lead.custom_fields?.[columnKey];
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(optionValue);
        }
        return fieldValue === optionValue;
      });
      
      // Apply time period filter
      if (timePeriod === "today") {
        matchingLeads = matchingLeads.filter(lead => new Date(lead.created_at) >= todayStart);
      } else if (timePeriod === "this_week") {
        matchingLeads = matchingLeads.filter(lead => new Date(lead.created_at) >= weekStart);
      } else if (timePeriod === "last_30_days") {
        matchingLeads = matchingLeads.filter(lead => new Date(lead.created_at) >= thirtyDaysAgo);
      }
      // "total" or undefined: no additional date filter
      
      // Sort by created_at descending
      matchingLeads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Get total count before pagination
      const total = matchingLeads.length;
      const totalPages = Math.ceil(total / limit);
      
      // Apply pagination
      const paginatedLeads = matchingLeads.slice(offset, offset + limit);
      
      // Enrich leads with owner information
      const enrichedLeads = await Promise.all(
        paginatedLeads.map(async (lead) => {
          const owner = await storage.getUser(lead.owner_user_id);
          return {
            ...lead,
            sheet_name: sheet?.name || "Unknown",
            owner_name: owner?.name || "Unknown",
          };
        })
      );
      
      res.json({
        leads: enrichedLeads,
        total,
        page,
        limit,
        total_pages: totalPages,
      });
    } catch (error: any) {
      console.error("Get executive performance drilldown error:", error);
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
      
      const { name, trigger_column_key, operator, trigger_value, required_fields, conditions, logical_operator } = req.body;
      
      // Support new multi-condition format or legacy single condition format
      const hasNewFormat = conditions && Array.isArray(conditions) && conditions.length > 0;
      const hasLegacyFormat = trigger_column_key && operator && trigger_value;
      
      if (!name) {
        return res.status(400).json({ error: "Rule name is required" });
      }
      
      if (!required_fields || !Array.isArray(required_fields) || required_fields.length === 0) {
        return res.status(400).json({ error: "At least one required field must be specified" });
      }
      
      if (!hasNewFormat && !hasLegacyFormat) {
        return res.status(400).json({ error: "At least one condition is required (use either conditions array or trigger_column_key/operator/trigger_value)" });
      }
      
      // Create rule with company_id derived from the sheet
      const rule = await storage.createValidationRule({
        company_id: sheet.company_id,
        sheet_id: sheetId,
        name,
        trigger_column_key: hasLegacyFormat ? trigger_column_key : (conditions?.[0]?.column_key || undefined),
        operator: hasLegacyFormat ? operator : (conditions?.[0]?.operator || undefined),
        trigger_value: hasLegacyFormat ? trigger_value : (conditions?.[0]?.value || undefined),
        required_fields,
        conditions: hasNewFormat ? conditions : undefined,
        logical_operator: (logical_operator || "and") as "and" | "or",
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
  // HIGHLIGHTING RULES (Admin-only, Sheet-scoped)
  // ============================================================================
  
  // GET /api/sheets/:sheetId/highlighting-rules - Fetch highlighting rules for a sheet
  app.get("/api/sheets/:sheetId/highlighting-rules", authMiddleware, requireSheetAccess, async (req: AuthRequest, res) => {
    try {
      const sheetId = req.params.sheetId;
      const rules = await storage.getHighlightingRules(sheetId);
      res.json(rules);
    } catch (error: any) {
      console.error("Get highlighting rules error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // POST /api/company/sheets/:sheetId/highlighting-rules - Create highlighting rule (Admin only)
  app.post("/api/company/sheets/:sheetId/highlighting-rules", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const sheetId = req.params.sheetId;
      
      // Get sheet to validate company ownership
      const sheet = await storage.getSheet(sheetId);
      if (!sheet) {
        return res.status(404).json({ error: "Sheet not found" });
      }
      
      // Validate company admin access
      if (req.userRole === "company_admin" && sheet.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot create rules for sheets in other companies" });
      }
      
      const { name, conditions, logical_operator, row_color, priority, is_active } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Rule name is required" });
      }
      
      if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
        return res.status(400).json({ error: "At least one condition is required" });
      }
      
      if (!row_color) {
        return res.status(400).json({ error: "Row color is required" });
      }
      
      // Get max priority for this sheet
      const existingRules = await storage.getHighlightingRules(sheetId);
      const maxPriority = existingRules.reduce((max, r) => Math.max(max, r.priority), -1);
      
      const rule = await storage.createHighlightingRule({
        company_id: sheet.company_id,
        sheet_id: sheetId,
        name: name.trim(),
        conditions,
        logical_operator: logical_operator || "and",
        row_color,
        priority: priority ?? maxPriority + 1,
        is_active: is_active ?? true,
        created_by_user_id: req.userId!,
      });
      
      // Emit socket event for real-time updates
      io.to(`company:${sheet.company_id}`).emit("highlighting_rules.updated", { sheetId });
      
      res.status(201).json(rule);
    } catch (error: any) {
      console.error("Create highlighting rule error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // PATCH /api/company/highlighting-rules/:ruleId - Update highlighting rule (Admin only)
  app.patch("/api/company/highlighting-rules/:ruleId", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const ruleId = req.params.ruleId;
      
      const existingRule = await storage.getHighlightingRuleById(ruleId);
      if (!existingRule) {
        return res.status(404).json({ error: "Highlighting rule not found" });
      }
      
      // Validate company admin access
      if (req.userRole === "company_admin" && existingRule.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot update rules for other companies" });
      }
      
      const { name, conditions, logical_operator, row_color, priority, is_active } = req.body;
      
      const updates: Partial<typeof existingRule> = {};
      if (name !== undefined) updates.name = name.trim();
      if (conditions !== undefined) updates.conditions = conditions;
      if (logical_operator !== undefined) updates.logical_operator = logical_operator;
      if (row_color !== undefined) updates.row_color = row_color;
      if (priority !== undefined) updates.priority = priority;
      if (is_active !== undefined) updates.is_active = is_active;
      
      const rule = await storage.updateHighlightingRule(ruleId, updates);
      
      // Emit socket event for real-time updates
      io.to(`company:${existingRule.company_id}`).emit("highlighting_rules.updated", { sheetId: existingRule.sheet_id });
      
      res.json(rule);
    } catch (error: any) {
      console.error("Update highlighting rule error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // DELETE /api/company/highlighting-rules/:ruleId - Delete highlighting rule (Admin only)
  app.delete("/api/company/highlighting-rules/:ruleId", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const ruleId = req.params.ruleId;
      
      const existingRule = await storage.getHighlightingRuleById(ruleId);
      if (!existingRule) {
        return res.status(404).json({ error: "Highlighting rule not found" });
      }
      
      // Validate company admin access
      if (req.userRole === "company_admin" && existingRule.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot delete rules for other companies" });
      }
      
      await storage.deleteHighlightingRule(ruleId);
      
      // Emit socket event for real-time updates
      io.to(`company:${existingRule.company_id}`).emit("highlighting_rules.updated", { sheetId: existingRule.sheet_id });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete highlighting rule error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // POST /api/company/sheets/:sheetId/highlighting-rules/reorder - Reorder rules (Admin only)
  app.post("/api/company/sheets/:sheetId/highlighting-rules/reorder", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const sheetId = req.params.sheetId;
      const { ruleIds } = req.body;
      
      if (!ruleIds || !Array.isArray(ruleIds)) {
        return res.status(400).json({ error: "ruleIds array is required" });
      }
      
      // Get sheet to validate company ownership
      const sheet = await storage.getSheet(sheetId);
      if (!sheet) {
        return res.status(404).json({ error: "Sheet not found" });
      }
      
      // Validate company admin access
      if (req.userRole === "company_admin" && sheet.company_id !== req.companyId) {
        return res.status(403).json({ error: "Cannot reorder rules for sheets in other companies" });
      }
      
      await storage.reorderHighlightingRules(sheetId, ruleIds);
      
      // Emit socket event for real-time updates
      io.to(`company:${sheet.company_id}`).emit("highlighting_rules.updated", { sheetId });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Reorder highlighting rules error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GLOBAL HIGHLIGHTING RULES (Apply to All Sheets)
  // ============================================================================
  
  // GET /api/company/global-highlighting-rules - Fetch global highlighting rules (all users can read)
  app.get("/api/company/global-highlighting-rules", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const rules = await storage.getGlobalHighlightingRules(req.companyId!);
      res.json(rules);
    } catch (error: any) {
      console.error("Get global highlighting rules error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // POST /api/company/global-highlighting-rules - Create global highlighting rule (Admin only)
  app.post("/api/company/global-highlighting-rules", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { name, conditions, logical_operator, row_color, priority, is_active } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Rule name is required" });
      }
      
      if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
        return res.status(400).json({ error: "At least one condition is required" });
      }
      
      if (!row_color) {
        return res.status(400).json({ error: "Row color is required" });
      }
      
      // Get max priority for global rules
      const existingRules = await storage.getGlobalHighlightingRules(req.companyId!);
      const maxPriority = existingRules.reduce((max, r) => Math.max(max, r.priority), -1);
      
      const rule = await storage.createHighlightingRule({
        company_id: req.companyId!,
        sheet_id: null, // null means global
        name: name.trim(),
        conditions,
        logical_operator: logical_operator || "and",
        row_color,
        priority: priority ?? maxPriority + 1,
        is_active: is_active ?? true,
        created_by_user_id: req.userId!,
      });
      
      // Emit socket event for real-time updates - global means all sheets
      io.to(`company:${req.companyId}`).emit("highlighting_rules.updated", { sheetId: null, global: true });
      
      res.status(201).json(rule);
    } catch (error: any) {
      console.error("Create global highlighting rule error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // POST /api/company/global-highlighting-rules/reorder - Reorder global rules (Admin only)
  app.post("/api/company/global-highlighting-rules/reorder", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const { ruleIds } = req.body;
      
      if (!ruleIds || !Array.isArray(ruleIds)) {
        return res.status(400).json({ error: "ruleIds array is required" });
      }
      
      await storage.reorderGlobalHighlightingRules(req.companyId!, ruleIds);
      
      // Emit socket event for real-time updates
      io.to(`company:${req.companyId}`).emit("highlighting_rules.updated", { sheetId: null, global: true });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Reorder global highlighting rules error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // GET /api/company/columns - Fetch all unique columns across company sheets (for global rules)
  app.get("/api/company/columns", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const columns = await storage.getCompanyColumns(req.companyId!);
      res.json(columns);
    } catch (error: any) {
      console.error("Get company columns error:", error);
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

      // Activity log for bulk import
      if (imported.length > 0) {
        const user = await storage.getUser(req.userId!);
        if (user) {
          await logActivity({
            actor: { user, source: "ui" },
            companyId: sheet.company_id,
            sheetId: sheetId,
            sheetName: sheet.name,
            action: "bulk_import",
            targetType: "lead",
            targetId: sheetId, // Use sheet ID since this is a bulk operation
            targetName: `${imported.length} leads`,
            extra: {
              count: imported.length,
              errors_count: errors.length,
              warnings_count: warnings.length,
              file_name: req.body.fileName || "upload",
            },
          }).catch(err => console.error("Activity log error:", err));
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
      const sheet = await storage.getSheet(req.params.id);
      
      // Get custom columns for the sheet to know which fields to export
      const columns = await storage.getCustomColumns(req.params.id);
      columns.sort((a, b) => a.order_index - b.order_index);

      // Activity log for export
      if (sheet) {
        const user = await storage.getUser(req.userId!);
        if (user) {
          await logActivity({
            actor: { user, source: "ui" },
            companyId: sheet.company_id,
            sheetId: req.params.id,
            sheetName: sheet.name,
            action: "bulk_export",
            targetType: "lead",
            targetId: req.params.id,
            targetName: `${leads.length} leads`,
            extra: { count: leads.length, format },
          }).catch(err => console.error("Activity log error:", err));
        }
      }

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
  // PUSH NOTIFICATIONS
  // ============================================================================
  
  // Get VAPID public key for client-side subscription
  app.get("/api/push/vapid-public-key", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
      if (!vapidPublicKey) {
        return res.status(500).json({ error: "Push notifications not configured" });
      }
      res.json({ vapidPublicKey });
    } catch (error: any) {
      console.error("Get VAPID public key error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Subscribe to push notifications
  app.post("/api/push/subscribe", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { endpoint, keys, deviceType, userAgent } = req.body;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }

      // Check if subscription already exists
      const existing = await storage.getPushSubscription(req.userId!, endpoint);
      if (existing) {
        return res.json({ success: true, message: "Already subscribed" });
      }

      await storage.createPushSubscription({
        user_id: req.userId!,
        company_id: req.companyId!,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        device_type: deviceType || null,
        user_agent: userAgent || null,
      });

      res.json({ success: true, message: "Subscribed to push notifications" });
    } catch (error: any) {
      console.error("Push subscribe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Unsubscribe from push notifications
  app.post("/api/push/unsubscribe", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint required" });
      }

      await storage.deletePushSubscription(req.userId!, endpoint);
      res.json({ success: true, message: "Unsubscribed from push notifications" });
    } catch (error: any) {
      console.error("Push unsubscribe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's push subscription status
  app.get("/api/push/status", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const subscriptions = await storage.getPushSubscriptionsByUserId(req.userId!);
      res.json({ 
        subscribed: subscriptions.length > 0,
        deviceCount: subscriptions.length
      });
    } catch (error: any) {
      console.error("Push status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // ATTENDANCE SYSTEM
  // ============================================================================

  // Get today's attendance entry for current user
  app.get("/api/attendance/today", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const entry = await storage.getTodayAttendanceEntry(req.userId!);
      res.json(entry || null);
    } catch (error: any) {
      console.error("Get today attendance error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's attendance history
  app.get("/api/attendance/history", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const entries = await storage.getAttendanceEntriesByUserId(req.userId!, start, end);
      res.json(entries);
    } catch (error: any) {
      console.error("Get attendance history error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get company-wide attendance (admin only)
  app.get("/api/attendance/company", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const entries = await storage.getAttendanceEntriesByCompanyId(req.companyId!, start, end);
      
      // Enrich with user names
      const users = await storage.getUsersByCompanyId(req.companyId!);
      const userMap = new Map(users.map(u => [u.id, u]));
      
      const enrichedEntries = entries.map(entry => ({
        ...entry,
        user_name: userMap.get(entry.user_id)?.name || "Unknown",
        user_email: userMap.get(entry.user_id)?.email || "",
      }));
      
      res.json(enrichedEntries);
    } catch (error: any) {
      console.error("Get company attendance error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Record entry (punch in)
  app.post("/api/attendance/entry", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Check if user already has an entry today without exit
      const existingEntry = await storage.getTodayAttendanceEntry(req.userId!);
      if (existingEntry && !existingEntry.exit_time) {
        return res.status(400).json({ error: "You already have an active entry. Please record exit first." });
      }
      
      const { location, selfie_url } = req.body;
      
      const newEntry = await storage.createAttendanceEntry({
        user_id: req.userId!,
        company_id: req.companyId!,
        entry_time: new Date(),
        entry_location: location || null,
        entry_selfie_url: selfie_url || null,
      });
      
      // Emit socket event for real-time updates
      io.to(`company-${req.companyId}`).emit("attendance:entry", {
        userId: req.userId,
        entryId: newEntry.id,
      });
      
      res.json(newEntry);
    } catch (error: any) {
      console.error("Record entry error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Helper function to validate exit rules
  async function validateExitRules(userId: string, companyId: string): Promise<{ valid: boolean; blockingReasons: string[] }> {
    const rules = await storage.getAttendanceRulesByCompanyId(companyId);
    const enabledRules = rules.filter(r => r.is_enabled);
    const blockingReasons: string[] = [];
    
    for (const rule of enabledRules) {
      if (rule.rule_type === "min_leads") {
        // Check if user has added enough leads today
        const config = rule.config as { min_count?: number };
        const minCount = config.min_count || 1;
        
        // Get user's sheets and count leads added today
        const sheets = await storage.getSheetsByUserId(userId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let totalLeadsToday = 0;
        for (const sheet of sheets) {
          const leads = await storage.getLeadsBySheetId(sheet.id);
          const leadsToday = leads.filter((l: any) => {
            const createdAt = new Date(l.created_at);
            return createdAt >= today && l.owner_user_id === userId;
          });
          totalLeadsToday += leadsToday.length;
        }
        
        if (totalLeadsToday < minCount) {
          blockingReasons.push(`Minimum ${minCount} leads required (you have ${totalLeadsToday})`);
        }
      } else if (rule.rule_type === "min_hours") {
        const config = rule.config as { min_hours?: number };
        const minHours = config.min_hours || 8;
        
        const todayEntry = await storage.getTodayAttendanceEntry(userId);
        if (todayEntry) {
          const entryTime = new Date(todayEntry.entry_time);
          const now = new Date();
          const hoursWorked = (now.getTime() - entryTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursWorked < minHours) {
            blockingReasons.push(`Minimum ${minHours} hours required (you have ${hoursWorked.toFixed(1)})`);
          }
        }
      } else if (rule.rule_type === "min_updates") {
        // Check if user has made enough lead updates today
        const config = rule.config as { min_count?: number };
        const minCount = config.min_count || 1;
        
        const sheets = await storage.getSheetsByUserId(userId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let totalUpdatesToday = 0;
        for (const sheet of sheets) {
          const leads = await storage.getLeadsBySheetId(sheet.id);
          for (const lead of leads) {
            const updates = await storage.getLeadUpdates(lead.id);
            const updatesToday = updates.filter((u: any) => {
              const updatedAt = new Date(u.updated_at);
              return updatedAt >= today && u.updated_by_user_id === userId;
            });
            totalUpdatesToday += updatesToday.length;
          }
        }
        
        if (totalUpdatesToday < minCount) {
          blockingReasons.push(`Minimum ${minCount} lead updates required (you have ${totalUpdatesToday})`);
        }
      } else if (rule.rule_type === "nfdt_not_empty") {
        // Check if all user's leads have NFDT filled
        // config.column_key specifies which column to check (defaults to detecting NFDT column)
        const config = rule.config as { column_key?: string };
        const sheets = await storage.getSheetsByUserId(userId);
        
        let leadsWithEmptyNFDT = 0;
        for (const sheet of sheets) {
          const columns = await storage.getCustomColumns(sheet.id);
          // Find NFDT column - match patterns: nfdt, next_follow, followup_date
          const nfdtColumn = config.column_key 
            ? columns.find(c => c.column_key === config.column_key)
            : columns.find(c => 
                /nfdt|next_follow|followup_date/i.test(c.column_key) ||
                /nfdt|next follow/i.test(c.name)
              );
          
          if (nfdtColumn) {
            const leads = await storage.getLeadsBySheetId(sheet.id);
            const userLeads = leads.filter((l: any) => l.owner_user_id === userId);
            for (const lead of userLeads) {
              const customFields = lead.custom_fields || {};
              const nfdtValue = customFields[nfdtColumn.column_key];
              if (!nfdtValue || nfdtValue === "") {
                leadsWithEmptyNFDT++;
              }
            }
          }
        }
        
        if (leadsWithEmptyNFDT > 0) {
          blockingReasons.push(`${leadsWithEmptyNFDT} lead(s) have empty NFDT (Next Follow-up Date)`);
        }
      } else if (rule.rule_type === "nfdt_not_past") {
        // Check if all user's leads have NFDT not in the past
        const config = rule.config as { column_key?: string };
        const sheets = await storage.getSheetsByUserId(userId);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        let leadsWithPastNFDT = 0;
        for (const sheet of sheets) {
          const columns = await storage.getCustomColumns(sheet.id);
          const nfdtColumn = config.column_key 
            ? columns.find(c => c.column_key === config.column_key)
            : columns.find(c => 
                /nfdt|next_follow|followup_date/i.test(c.column_key) ||
                /nfdt|next follow/i.test(c.name)
              );
          
          if (nfdtColumn) {
            const leads = await storage.getLeadsBySheetId(sheet.id);
            const userLeads = leads.filter((l: any) => l.owner_user_id === userId);
            for (const lead of userLeads) {
              const customFields = lead.custom_fields || {};
              const nfdtValue = customFields[nfdtColumn.column_key];
              if (nfdtValue) {
                const nfdtDate = new Date(nfdtValue);
                if (nfdtDate < now) {
                  leadsWithPastNFDT++;
                }
              }
            }
          }
        }
        
        if (leadsWithPastNFDT > 0) {
          blockingReasons.push(`${leadsWithPastNFDT} lead(s) have past NFDT dates that need updating`);
        }
      } else if (rule.rule_type === "tomorrow_visits_updated") {
        // Check if leads with tomorrow's visit/NFDT have been updated today
        const config = rule.config as { column_key?: string };
        const sheets = await storage.getSheetsByUserId(userId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
        
        let tomorrowLeadsNotUpdated = 0;
        for (const sheet of sheets) {
          const columns = await storage.getCustomColumns(sheet.id);
          const nfdtColumn = config.column_key 
            ? columns.find(c => c.column_key === config.column_key)
            : columns.find(c => 
                /nfdt|next_follow|followup_date|visit/i.test(c.column_key) ||
                /nfdt|next follow|visit/i.test(c.name)
              );
          
          if (nfdtColumn) {
            const leads = await storage.getLeadsBySheetId(sheet.id);
            const userLeads = leads.filter((l: any) => l.owner_user_id === userId);
            for (const lead of userLeads) {
              const customFields = lead.custom_fields || {};
              const nfdtValue = customFields[nfdtColumn.column_key];
              if (nfdtValue) {
                const nfdtDate = new Date(nfdtValue);
                // Check if NFDT is tomorrow
                if (nfdtDate >= tomorrow && nfdtDate < dayAfterTomorrow) {
                  // Check if lead was updated today
                  const updates = await storage.getLeadUpdates(lead.id);
                  const updatedToday = updates.some((u: any) => {
                    const updatedAt = new Date(u.updated_at);
                    return updatedAt >= today;
                  });
                  if (!updatedToday) {
                    tomorrowLeadsNotUpdated++;
                  }
                }
              }
            }
          }
        }
        
        if (tomorrowLeadsNotUpdated > 0) {
          blockingReasons.push(`${tomorrowLeadsNotUpdated} lead(s) scheduled for tomorrow need to be updated today`);
        }
      } else if (rule.rule_type === "today_leads_updated") {
        // Check if all leads assigned/created today have been updated
        const sheets = await storage.getSheetsByUserId(userId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let todayLeadsNotUpdated = 0;
        for (const sheet of sheets) {
          const leads = await storage.getLeadsBySheetId(sheet.id);
          const userLeads = leads.filter((l: any) => l.owner_user_id === userId);
          
          for (const lead of userLeads) {
            const createdAt = new Date(lead.created_at);
            // Check if lead was created/assigned today
            if (createdAt >= today) {
              // Check if lead has any updates today
              const updates = await storage.getLeadUpdates(lead.id);
              const hasUpdateToday = updates.some((u: any) => {
                const updatedAt = new Date(u.updated_at);
                return updatedAt >= today;
              });
              if (!hasUpdateToday) {
                todayLeadsNotUpdated++;
              }
            }
          }
        }
        
        if (todayLeadsNotUpdated > 0) {
          blockingReasons.push(`${todayLeadsNotUpdated} lead(s) received today need to be updated before exit`);
        }
      }
    }
    
    return {
      valid: blockingReasons.length === 0,
      blockingReasons,
    };
  }

  // Record normal exit (punch out)
  app.post("/api/attendance/exit", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const todayEntry = await storage.getTodayAttendanceEntry(req.userId!);
      if (!todayEntry) {
        return res.status(400).json({ error: "No entry found for today" });
      }
      if (todayEntry.exit_time) {
        return res.status(400).json({ error: "Exit already recorded for today" });
      }
      
      // Validate exit rules
      const validation = await validateExitRules(req.userId!, req.companyId!);
      
      if (!validation.valid) {
        return res.status(400).json({ 
          error: "Exit blocked",
          blocking_reasons: validation.blockingReasons,
          requires_force_exit: true,
        });
      }
      
      // Normal exit
      const updated = await storage.updateAttendanceEntry(todayEntry.id, {
        exit_time: new Date() as any,
        exit_type: "normal",
      });
      
      // Emit socket event
      io.to(`company-${req.companyId}`).emit("attendance:exit", {
        userId: req.userId,
        entryId: todayEntry.id,
        exitType: "normal",
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("Record exit error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Record forced exit (when rules not met)
  app.post("/api/attendance/force-exit", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const todayEntry = await storage.getTodayAttendanceEntry(req.userId!);
      if (!todayEntry) {
        return res.status(400).json({ error: "No entry found for today" });
      }
      if (todayEntry.exit_time) {
        return res.status(400).json({ error: "Exit already recorded for today" });
      }
      
      const { reason } = req.body;
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ error: "Reason is required for force exit" });
      }
      
      // Get blocking reasons for record-keeping
      const validation = await validateExitRules(req.userId!, req.companyId!);
      
      const updated = await storage.updateAttendanceEntry(todayEntry.id, {
        exit_time: new Date() as any,
        exit_type: "forced",
        force_exit_reason: reason,
        force_exit_blocking_reasons: validation.blockingReasons,
        review_status: "pending",
      });
      
      // Emit socket event
      io.to(`company-${req.companyId}`).emit("attendance:force-exit", {
        userId: req.userId,
        entryId: todayEntry.id,
        reason,
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("Force exit error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get pending force exit reviews (admin only)
  app.get("/api/attendance/pending-reviews", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const pendingReviews = await storage.getPendingForceExitsByCompanyId(req.companyId!);
      
      // Enrich with user names
      const users = await storage.getUsersByCompanyId(req.companyId!);
      const userMap = new Map(users.map(u => [u.id, u]));
      
      const enrichedReviews = pendingReviews.map(entry => ({
        ...entry,
        user_name: userMap.get(entry.user_id)?.name || "Unknown",
        user_email: userMap.get(entry.user_id)?.email || "",
      }));
      
      res.json(enrichedReviews);
    } catch (error: any) {
      console.error("Get pending reviews error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Review force exit (admin only)
  app.post("/api/attendance/:entryId/review", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { entryId } = req.params;
      const { status, notes } = req.body;
      
      if (!status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
      }
      
      const entry = await storage.getAttendanceEntry(entryId);
      if (!entry) {
        return res.status(404).json({ error: "Attendance entry not found" });
      }
      if (entry.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (entry.review_status !== "pending") {
        return res.status(400).json({ error: "This entry has already been reviewed" });
      }
      
      const updated = await storage.updateAttendanceEntry(entryId, {
        review_status: status,
        reviewed_by_user_id: req.userId,
        reviewed_at: new Date() as any,
        review_notes: notes || null,
      });
      
      // Emit socket event
      io.to(`company-${req.companyId}`).emit("attendance:reviewed", {
        entryId,
        status,
        reviewedBy: req.userId,
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("Review force exit error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Clear attendance entry or reset exit (admin only)
  app.post("/api/attendance/:entryId/clear", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { entryId } = req.params;
      const { action } = req.body; // "delete" = remove entire entry, "clear_exit" = just clear exit time
      
      const entry = await storage.getAttendanceEntry(entryId);
      if (!entry) {
        return res.status(404).json({ error: "Attendance entry not found" });
      }
      if (entry.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (action === "delete") {
        // Delete the entire attendance entry
        await storage.deleteAttendanceEntry(entryId);
        
        // Emit socket event
        io.to(`company-${req.companyId}`).emit("attendance:cleared", {
          entryId,
          action: "delete",
          clearedBy: req.userId,
        });
        
        res.json({ success: true, message: "Attendance entry deleted" });
      } else if (action === "clear_exit") {
        // Just clear the exit time so user can exit again
        const updated = await storage.updateAttendanceEntry(entryId, {
          exit_time: null as any,
          exit_type: null,
          force_exit_reason: null,
          force_exit_blocking_reasons: null,
          review_status: null,
          reviewed_by_user_id: null,
          reviewed_at: null as any,
          review_notes: null,
        });
        
        // Emit socket event
        io.to(`company-${req.companyId}`).emit("attendance:cleared", {
          entryId,
          action: "clear_exit",
          clearedBy: req.userId,
        });
        
        res.json(updated);
      } else {
        return res.status(400).json({ error: "Action must be 'delete' or 'clear_exit'" });
      }
    } catch (error: any) {
      console.error("Clear attendance error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Get today's attendance for all company users
  app.get("/api/attendance/today/all", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const entries = await storage.getAttendanceEntriesByCompanyId(req.companyId!, today, tomorrow);
      
      // Enrich with user names
      const users = await storage.getUsersByCompanyId(req.companyId!);
      const userMap = new Map(users.map(u => [u.id, u]));
      
      const enrichedEntries = entries.map(entry => ({
        ...entry,
        user_name: userMap.get(entry.user_id)?.name || "Unknown",
        user_email: userMap.get(entry.user_id)?.email || "",
      }));
      
      res.json(enrichedEntries);
    } catch (error: any) {
      console.error("Get today's company attendance error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // ATTENDANCE RULES (Admin only)
  // ============================================================================

  // Get company attendance rules
  app.get("/api/attendance/rules", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const rules = await storage.getAttendanceRulesByCompanyId(req.companyId!);
      res.json(rules);
    } catch (error: any) {
      console.error("Get attendance rules error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create attendance rule
  app.post("/api/attendance/rules", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { rule_type, name, description, is_enabled, config } = req.body;
      
      if (!rule_type || !name) {
        return res.status(400).json({ error: "Rule type and name are required" });
      }
      
      const validTypes = [
        "min_leads",           // Minimum leads added today
        "min_hours",           // Minimum hours worked
        "min_updates",         // Minimum lead updates today
        "nfdt_not_empty",      // All user's leads must have NFDT filled
        "nfdt_not_past",       // All user's leads must have NFDT not in the past
        "tomorrow_visits_updated", // Leads with tomorrow's visit date must be updated today
        "today_leads_updated", // All leads assigned today must have an update today
      ];
      if (!validTypes.includes(rule_type)) {
        return res.status(400).json({ error: "Invalid rule type" });
      }
      
      const rule = await storage.createAttendanceRule({
        company_id: req.companyId!,
        rule_type,
        name,
        description: description || null,
        is_enabled: is_enabled ?? true,
        config: config || {},
      });
      
      res.json(rule);
    } catch (error: any) {
      console.error("Create attendance rule error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update attendance rule
  app.patch("/api/attendance/rules/:ruleId", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { ruleId } = req.params;
      const { name, description, is_enabled, config } = req.body;
      
      const existing = await storage.getAttendanceRule(ruleId);
      if (!existing) {
        return res.status(404).json({ error: "Rule not found" });
      }
      if (existing.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (is_enabled !== undefined) updates.is_enabled = is_enabled;
      if (config !== undefined) updates.config = config;
      
      const updated = await storage.updateAttendanceRule(ruleId, updates);
      res.json(updated);
    } catch (error: any) {
      console.error("Update attendance rule error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete attendance rule
  app.delete("/api/attendance/rules/:ruleId", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { ruleId } = req.params;
      
      const existing = await storage.getAttendanceRule(ruleId);
      if (!existing) {
        return res.status(404).json({ error: "Rule not found" });
      }
      if (existing.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteAttendanceRule(ruleId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete attendance rule error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // TASKS SYSTEM
  // ============================================================================

  // Get all tasks for the company (with filters)
  app.get("/api/tasks", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { status, assignedTo, includeCompleted } = req.query;
      const isAdmin = req.userRole === "company_admin" || req.userRole === "super_admin";
      
      const options: any = {
        includeCompleted: includeCompleted === "true",
      };
      
      if (status) {
        options.status = (status as string).split(",");
      }
      
      // Non-admins can only see their own tasks
      if (!isAdmin) {
        options.assignedTo = req.userId;
      } else if (assignedTo) {
        options.assignedTo = assignedTo as string;
      }
      
      const tasks = await storage.getTasksByCompanyId(req.companyId!, options);
      
      // Enrich with user names
      const users = await storage.getUsersByCompanyId(req.companyId!);
      const userMap = new Map(users.map(u => [u.id, u]));
      
      const enrichedTasks = tasks.map(task => ({
        ...task,
        assigned_to_name: userMap.get(task.assigned_to_user_id)?.name || "Unknown",
        created_by_name: userMap.get(task.created_by_user_id)?.name || "Unknown",
      }));
      
      res.json(enrichedTasks);
    } catch (error: any) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get task counts for sidebar badge
  app.get("/api/tasks/counts", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const isAdmin = req.userRole === "company_admin" || req.userRole === "super_admin";
      
      let tasks;
      if (isAdmin) {
        tasks = await storage.getTasksByCompanyId(req.companyId!, { includeCompleted: false });
      } else {
        tasks = await storage.getTasksByUserId(req.userId!, { includeCompleted: false });
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      let pending = 0;
      let ongoing = 0;
      let overdue = 0;
      let dueToday = 0;
      
      tasks.forEach(task => {
        if (task.status === "pending") pending++;
        if (task.status === "ongoing") ongoing++;
        
        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          if (dueDate < today) overdue++;
          else if (dueDate >= today && dueDate < tomorrow) dueToday++;
        }
      });
      
      res.json({ pending, ongoing, overdue, dueToday, total: pending + ongoing });
    } catch (error: any) {
      console.error("Get task counts error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get single task
  app.get("/api/tasks/:taskId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { taskId } = req.params;
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (task.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Non-admins can only see their own tasks
      const isAdmin = req.userRole === "company_admin" || req.userRole === "super_admin";
      if (!isAdmin && task.assigned_to_user_id !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Enrich with linked leads
      const taskLeads = await storage.getTaskLeads(taskId);
      const linkedLeads = [];
      for (const tl of taskLeads) {
        const lead = await storage.getLead(tl.lead_id);
        if (lead) {
          linkedLeads.push({
            id: lead.id,
            full_name: lead.full_name,
            mobile_no: lead.mobile_no,
          });
        }
      }
      
      // Get user names
      const users = await storage.getUsersByCompanyId(req.companyId!);
      const userMap = new Map(users.map(u => [u.id, u]));
      
      res.json({
        ...task,
        assigned_to_name: userMap.get(task.assigned_to_user_id)?.name || "Unknown",
        created_by_name: userMap.get(task.created_by_user_id)?.name || "Unknown",
        linked_leads: linkedLeads,
      });
    } catch (error: any) {
      console.error("Get task error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create task (admins can assign to anyone, users can only create for themselves)
  app.post("/api/tasks", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { title, description, priority, start_date, due_date, assigned_to_user_id, admin_remarks, lead_ids } = req.body;
      
      if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: "Title is required" });
      }
      
      const isAdmin = req.userRole === "company_admin" || req.userRole === "super_admin";
      
      // Determine assigned user
      let assignedTo = req.userId!;
      if (isAdmin && assigned_to_user_id) {
        // Verify the user belongs to the same company
        const assignedUser = await storage.getUser(assigned_to_user_id);
        if (!assignedUser || assignedUser.company_id !== req.companyId) {
          return res.status(400).json({ error: "Invalid user" });
        }
        assignedTo = assigned_to_user_id;
      }
      
      // Validate priority
      const validPriorities = ['low', 'medium', 'high'];
      const taskPriority = validPriorities.includes(priority) ? priority : 'medium';
      
      const task = await storage.createTask({
        company_id: req.companyId!,
        title: title.trim(),
        description: description?.trim() || null,
        priority: taskPriority,
        start_date: start_date || null,
        due_date: due_date || null,
        status: "pending",
        user_remarks: null,
        admin_remarks: isAdmin ? (admin_remarks?.trim() || null) : null,
        assigned_to_user_id: assignedTo,
        created_by_user_id: req.userId!,
      });
      
      // Create initial task update
      await storage.createTaskUpdate({
        task_id: task.id,
        user_id: req.userId!,
        update_type: "created",
        old_value: null,
        new_value: { title: task.title, assigned_to: assignedTo },
        description: `Task created by ${req.userRole === "company_admin" ? "admin" : "user"}`,
      });
      
      // Link leads if provided
      if (lead_ids && Array.isArray(lead_ids) && lead_ids.length > 0) {
        for (const leadId of lead_ids) {
          const lead = await storage.getLead(leadId);
          if (lead) {
            await storage.addTaskLead({ task_id: task.id, lead_id: leadId });
            await storage.createTaskUpdate({
              task_id: task.id,
              user_id: req.userId!,
              update_type: "lead_linked",
              old_value: null,
              new_value: { lead_id: leadId, lead_name: lead.full_name },
              description: `Linked lead: ${lead.full_name}`,
            });
          }
        }
      }
      
      // Emit socket event
      io.to(`company-${req.companyId}`).emit("task:created", {
        taskId: task.id,
        assignedTo,
        createdBy: req.userId,
      });
      
      res.status(201).json(task);
    } catch (error: any) {
      console.error("Create task error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update task (admins can update anything, users can update status and user_remarks on their tasks)
  app.patch("/api/tasks/:taskId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { taskId } = req.params;
      const { title, description, priority, start_date, due_date, status, user_remarks, admin_remarks, assigned_to_user_id } = req.body;
      
      const existing = await storage.getTask(taskId);
      if (!existing) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (existing.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const isAdmin = req.userRole === "company_admin" || req.userRole === "super_admin";
      
      // Non-admins can only update their own tasks and only status/user_remarks
      if (!isAdmin) {
        if (existing.assigned_to_user_id !== req.userId) {
          return res.status(403).json({ error: "Access denied" });
        }
        // Users can only update status and user_remarks
        if (title !== undefined || description !== undefined || priority !== undefined || start_date !== undefined || 
            due_date !== undefined || admin_remarks !== undefined || assigned_to_user_id !== undefined) {
          return res.status(403).json({ error: "You can only update status and user remarks" });
        }
      }
      
      const updates: any = {};
      const changes: string[] = [];
      
      if (title !== undefined && title !== existing.title) {
        updates.title = title.trim();
        changes.push(`Title changed from "${existing.title}" to "${updates.title}"`);
      }
      if (description !== undefined && description !== existing.description) {
        updates.description = description?.trim() || null;
        changes.push("Description updated");
      }
      if (priority !== undefined && priority !== existing.priority) {
        const validPriorities = ['low', 'medium', 'high'];
        if (validPriorities.includes(priority)) {
          updates.priority = priority;
          changes.push(`Priority changed from "${existing.priority}" to "${priority}"`);
        }
      }
      if (start_date !== undefined && start_date !== existing.start_date) {
        updates.start_date = start_date || null;
        changes.push(`Start date changed`);
      }
      if (due_date !== undefined && due_date !== existing.due_date) {
        updates.due_date = due_date || null;
        changes.push(`Due date changed`);
      }
      if (status !== undefined && status !== existing.status) {
        updates.status = status;
        changes.push(`Status changed from "${existing.status}" to "${status}"`);
        
        // Create specific status change update
        await storage.createTaskUpdate({
          task_id: taskId,
          user_id: req.userId!,
          update_type: "status_change",
          old_value: { status: existing.status },
          new_value: { status },
          description: `Status changed from "${existing.status}" to "${status}"`,
        });
      }
      if (user_remarks !== undefined && user_remarks !== existing.user_remarks) {
        updates.user_remarks = user_remarks?.trim() || null;
        changes.push("User remarks updated");
        
        await storage.createTaskUpdate({
          task_id: taskId,
          user_id: req.userId!,
          update_type: "remarks_change",
          old_value: { user_remarks: existing.user_remarks },
          new_value: { user_remarks: updates.user_remarks },
          description: "User remarks updated",
        });
      }
      if (admin_remarks !== undefined && admin_remarks !== existing.admin_remarks && isAdmin) {
        updates.admin_remarks = admin_remarks?.trim() || null;
        changes.push("Admin remarks updated");
        
        await storage.createTaskUpdate({
          task_id: taskId,
          user_id: req.userId!,
          update_type: "remarks_change",
          old_value: { admin_remarks: existing.admin_remarks },
          new_value: { admin_remarks: updates.admin_remarks },
          description: "Admin remarks updated",
        });
      }
      if (assigned_to_user_id !== undefined && assigned_to_user_id !== existing.assigned_to_user_id && isAdmin) {
        const assignedUser = await storage.getUser(assigned_to_user_id);
        if (!assignedUser || assignedUser.company_id !== req.companyId) {
          return res.status(400).json({ error: "Invalid user" });
        }
        updates.assigned_to_user_id = assigned_to_user_id;
        changes.push(`Assigned user changed`);
        
        await storage.createTaskUpdate({
          task_id: taskId,
          user_id: req.userId!,
          update_type: "details_change",
          old_value: { assigned_to_user_id: existing.assigned_to_user_id },
          new_value: { assigned_to_user_id },
          description: `Task reassigned to ${assignedUser.name}`,
        });
      }
      
      if (Object.keys(updates).length === 0) {
        return res.json(existing);
      }
      
      // Create general details change update if there were non-specific changes
      const nonSpecificChanges = changes.filter(c => 
        !c.includes("Status") && !c.includes("remarks") && !c.includes("Assigned")
      );
      if (nonSpecificChanges.length > 0) {
        await storage.createTaskUpdate({
          task_id: taskId,
          user_id: req.userId!,
          update_type: "details_change",
          old_value: null,
          new_value: updates,
          description: nonSpecificChanges.join(", "),
        });
      }
      
      const updated = await storage.updateTask(taskId, updates);
      
      // Emit socket event
      io.to(`company-${req.companyId}`).emit("task:updated", {
        taskId,
        updates,
        updatedBy: req.userId,
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update task error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete task (admins can delete any, users can only delete tasks they created)
  app.delete("/api/tasks/:taskId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { taskId } = req.params;
      
      const existing = await storage.getTask(taskId);
      if (!existing) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (existing.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const isAdmin = req.userRole === "company_admin" || req.userRole === "super_admin";
      
      // Users can only delete tasks they created themselves
      if (!isAdmin && existing.created_by_user_id !== req.userId) {
        return res.status(403).json({ error: "You can only delete tasks you created" });
      }
      
      // Remove all linked leads first
      await storage.removeAllTaskLeads(taskId);
      
      await storage.deleteTask(taskId);
      
      // Emit socket event
      io.to(`company-${req.companyId}`).emit("task:deleted", {
        taskId,
        deletedBy: req.userId,
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get task updates (activity history)
  app.get("/api/tasks/:taskId/updates", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { taskId } = req.params;
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (task.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const isAdmin = req.userRole === "company_admin" || req.userRole === "super_admin";
      if (!isAdmin && task.assigned_to_user_id !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updates = await storage.getTaskUpdates(taskId);
      
      // Enrich with user names
      const users = await storage.getUsersByCompanyId(req.companyId!);
      const userMap = new Map(users.map(u => [u.id, u]));
      
      const enrichedUpdates = updates.map(update => ({
        ...update,
        user_name: userMap.get(update.user_id)?.name || "Unknown",
      }));
      
      res.json(enrichedUpdates);
    } catch (error: any) {
      console.error("Get task updates error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add task update/comment (both admins and assigned users can add comments)
  app.post("/api/tasks/:taskId/updates", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { taskId } = req.params;
      const { comment } = req.body;
      
      if (!comment || comment.trim().length === 0) {
        return res.status(400).json({ error: "Comment is required" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (task.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const isAdmin = req.userRole === "company_admin" || req.userRole === "super_admin";
      // Only admins or the assigned user can add comments
      if (!isAdmin && task.assigned_to_user_id !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const update = await storage.createTaskUpdate({
        task_id: taskId,
        user_id: req.userId!,
        update_type: "comment",
        old_value: null,
        new_value: { comment: comment.trim() },
        description: comment.trim(),
      });
      
      // Get user name for response
      const user = await storage.getUser(req.userId!);
      
      // Emit socket event for real-time update
      io.to(`company-${req.companyId}`).emit("task:update-added", {
        taskId,
        updateId: update.id,
        userId: req.userId,
      });
      
      res.status(201).json({
        ...update,
        user_name: user?.name || "Unknown",
      });
    } catch (error: any) {
      console.error("Add task update error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Link leads to task
  app.post("/api/tasks/:taskId/leads", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { taskId } = req.params;
      const { lead_ids } = req.body;
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (task.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
        return res.status(400).json({ error: "lead_ids array is required" });
      }
      
      const linked = [];
      for (const leadId of lead_ids) {
        const lead = await storage.getLead(leadId);
        if (lead) {
          await storage.addTaskLead({ task_id: taskId, lead_id: leadId });
          await storage.createTaskUpdate({
            task_id: taskId,
            user_id: req.userId!,
            update_type: "lead_linked",
            old_value: null,
            new_value: { lead_id: leadId, lead_name: lead.full_name },
            description: `Linked lead: ${lead.full_name}`,
          });
          linked.push({ id: leadId, full_name: lead.full_name });
        }
      }
      
      res.json({ linked });
    } catch (error: any) {
      console.error("Link leads to task error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Unlink lead from task
  app.delete("/api/tasks/:taskId/leads/:leadId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { taskId, leadId } = req.params;
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (task.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const lead = await storage.getLead(leadId);
      
      await storage.removeTaskLead(taskId, leadId);
      
      await storage.createTaskUpdate({
        task_id: taskId,
        user_id: req.userId!,
        update_type: "lead_unlinked",
        old_value: { lead_id: leadId, lead_name: lead?.full_name },
        new_value: null,
        description: `Unlinked lead: ${lead?.full_name || leadId}`,
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Unlink lead from task error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get task linked leads
  app.get("/api/tasks/:taskId/leads", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { taskId } = req.params;
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (task.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const taskLeads = await storage.getTaskLeads(taskId);
      const leads = [];
      for (const tl of taskLeads) {
        const lead = await storage.getLead(tl.lead_id);
        if (lead) {
          leads.push({
            id: lead.id,
            full_name: lead.full_name,
            mobile_no: lead.mobile_no,
            sheet_id: lead.sheet_id,
          });
        }
      }
      
      res.json(leads);
    } catch (error: any) {
      console.error("Get task leads error:", error);
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
  // SUPER ADMIN PANEL
  // ============================================================================
  const SUPER_ADMIN_EMAIL = "adminleadani@leadani.com";
  
  // Middleware to check if user is the super admin by email
  const requireSuperAdminByEmail = async (req: AuthRequest, res: any, next: any) => {
    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const user = await storage.getUser(req.userId);
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ error: "Access denied. Super admin only." });
    }
    (req as any).superAdminUser = user;
    next();
  };

  // Super Admin Stats
  app.get("/api/super-admin/stats", authMiddleware, requireSuperAdminByEmail, async (req: AuthRequest, res) => {
    try {
      const companies = await storage.getAllCompanies();
      const users = await storage.getAllUsers();
      const sheets = await storage.getAllSheets();
      
      // Count leads from all sheets
      let totalLeads = 0;
      for (const sheet of sheets) {
        const sheetLeads = await storage.getLeadsBySheetId(sheet.id);
        totalLeads += sheetLeads.length;
      }
      
      // Count tasks from all companies
      let totalTasks = 0;
      for (const company of companies) {
        const companyTasks = await storage.getTasksByCompanyId(company.id, { includeCompleted: true });
        totalTasks += companyTasks.length;
      }
      
      // Calculate recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSignups = users.filter(u => new Date(u.created_at) >= sevenDaysAgo).length;
      
      // Get webhook errors in last 24 hours
      const webhookLogs = await storage.getWebhookLogs();
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      const webhookErrors = webhookLogs.filter(
        log => new Date(log.created_at) >= twentyFourHoursAgo && log.status === "error"
      ).length;
      
      res.json({
        totalCompanies: companies.length,
        totalUsers: users.length,
        activeUsers: users.filter(u => u.last_login).length,
        totalLeads,
        totalTasks,
        totalSheets: sheets.length,
        recentSignups,
        webhookErrors,
      });
    } catch (error: any) {
      console.error("Super admin stats error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Super Admin Companies List
  app.get("/api/super-admin/companies", authMiddleware, requireSuperAdminByEmail, async (req: AuthRequest, res) => {
    try {
      const companies = await storage.getAllCompanies();
      const users = await storage.getAllUsers();
      const sheets = await storage.getAllSheets();
      
      const companiesWithStats = await Promise.all(companies.map(async company => {
        // Count leads for this company
        const companySheets = sheets.filter(s => s.company_id === company.id);
        let leadCount = 0;
        for (const sheet of companySheets) {
          const sheetLeads = await storage.getLeadsBySheetId(sheet.id);
          leadCount += sheetLeads.length;
        }
        
        return {
          id: company.id,
          name: company.name,
          is_active: company.status === "active",
          created_at: company.created_at,
          userCount: users.filter(u => u.company_id === company.id).length,
          leadCount,
          sheetCount: companySheets.length,
        };
      }));
      
      res.json(companiesWithStats);
    } catch (error: any) {
      console.error("Super admin companies error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Super Admin Users List
  app.get("/api/super-admin/users", authMiddleware, requireSuperAdminByEmail, async (req: AuthRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      const companies = await storage.getAllCompanies();
      
      const usersWithCompany = users.map(user => {
        const company = user.company_id ? companies.find(c => c.id === user.company_id) : null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: user.is_active ?? true,
          created_at: user.created_at,
          company_id: user.company_id,
          company_name: company?.name || null,
        };
      });
      
      res.json(usersWithCompany);
    } catch (error: any) {
      console.error("Super admin users error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Super Admin Activity Logs
  app.get("/api/super-admin/activity", authMiddleware, requireSuperAdminByEmail, async (req: AuthRequest, res) => {
    try {
      const companies = await storage.getAllCompanies();
      const users = await storage.getAllUsers();
      
      // Get all audit logs
      const allAuditLogs = await storage.getAuditLogs();
      
      // Take recent 100
      const recentLogs = allAuditLogs.slice(0, 100);
      
      const logsWithDetails = recentLogs.map(log => {
        const user = users.find(u => u.id === log.user_id);
        const company = companies.find(c => c.id === log.company_id);
        return {
          id: log.id,
          user_id: log.user_id,
          user_name: user?.name || "Unknown",
          user_email: user?.email || "",
          company_name: company?.name || null,
          action: log.action,
          entity_type: log.model,
          entity_id: log.model_id,
          details: log.changes,
          created_at: log.created_at,
        };
      });
      
      res.json(logsWithDetails);
    } catch (error: any) {
      console.error("Super admin activity error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Super Admin Webhook Logs
  app.get("/api/super-admin/webhook-logs", authMiddleware, requireSuperAdminByEmail, async (req: AuthRequest, res) => {
    try {
      const companies = await storage.getAllCompanies();
      const allWebhookLogs: any[] = [];
      
      for (const company of companies) {
        const companyLogs = await storage.getWebhookLogsByCompany(company.id);
        allWebhookLogs.push(...companyLogs.map(log => ({
          ...log,
          company_name: company.name,
        })));
      }
      
      // Sort by date and take recent 100
      allWebhookLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      res.json(allWebhookLogs.slice(0, 100));
    } catch (error: any) {
      console.error("Super admin webhook logs error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle User Status
  app.patch("/api/super-admin/users/:userId/status", authMiddleware, requireSuperAdminByEmail, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const { is_active } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't allow modifying super admin
      if (user.email === SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ error: "Cannot modify super admin account" });
      }
      
      await storage.updateUser(userId, { is_active });
      
      res.json({ success: true, message: `User ${is_active ? 'activated' : 'suspended'}` });
    } catch (error: any) {
      console.error("Toggle user status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reset User Password (Super Admin)
  app.post("/api/super-admin/users/:userId/reset-password", authMiddleware, requireSuperAdminByEmail, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const superAdminUser = (req as any).superAdminUser;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't allow resetting super admin password through this endpoint
      if (user.email === SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ error: "Cannot reset super admin password through this endpoint" });
      }
      
      // Generate a temporary password
      const temporaryPassword = crypto.randomBytes(8).toString("hex").slice(0, 12);
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);
      
      await storage.updateUser(userId, { password_hash: passwordHash });
      
      // Create audit log
      if (user.company_id) {
        await storage.createAuditLog({
          company_id: user.company_id,
          user_id: superAdminUser.id,
          action: "reset_password",
          model: "user",
          model_id: userId,
          payload: {
            target_user: user.email,
            reset_by: superAdminUser.email,
          },
        });
      }
      
      res.json({ 
        success: true, 
        temporaryPassword,
        message: "Password has been reset" 
      });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete User (Super Admin)
  app.delete("/api/super-admin/users/:userId", authMiddleware, requireSuperAdminByEmail, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const superAdminUser = (req as any).superAdminUser;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't allow deleting super admin
      if (user.email === SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ error: "Cannot delete super admin account" });
      }
      
      // Create audit log before deletion
      if (user.company_id) {
        await storage.createAuditLog({
          company_id: user.company_id,
          user_id: superAdminUser.id,
          action: "delete",
          model: "user",
          model_id: userId,
          payload: {
            deleted_user: user.email,
            deleted_user_name: user.name,
            deleted_by: superAdminUser.email,
          },
        });
      }
      
      await storage.deleteUser(userId);
      
      res.json({ success: true, message: "User has been deleted" });
    } catch (error: any) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle Company Status
  app.patch("/api/super-admin/companies/:companyId/status", authMiddleware, requireSuperAdminByEmail, async (req: AuthRequest, res) => {
    try {
      const { companyId } = req.params;
      const { is_active } = req.body;
      
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      await storage.updateCompany(companyId, { 
        status: is_active ? "active" : "suspended" 
      });
      
      res.json({ success: true, message: `Company ${is_active ? 'enabled' : 'disabled'}` });
    } catch (error: any) {
      console.error("Toggle company status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // API KEY MANAGEMENT (Super Admin)
  // ============================================================================

  // List all API keys
  app.get("/api/super-admin/api-keys", authMiddleware, requireSuperAdminByEmail, async (req: AuthRequest, res) => {
    try {
      const apiKeys = await storage.getAllApiKeys();
      
      // Enrich with company names
      const enrichedKeys = await Promise.all(apiKeys.map(async (key) => {
        const company = await storage.getCompany(key.company_id);
        const creator = await storage.getUser(key.created_by);
        return {
          ...key,
          company_name: company?.name || "Unknown",
          created_by_name: creator?.name || "Unknown",
          key_preview: `${key.key_prefix}...`, // Only show prefix
        };
      }));
      
      res.json(enrichedKeys);
    } catch (error: any) {
      console.error("Get API keys error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate new API key
  app.post("/api/super-admin/api-keys", authMiddleware, requireSuperAdminByEmail, async (req: AuthRequest, res) => {
    try {
      const { name, company_id } = req.body;
      const superAdminUser = (req as any).superAdminUser;
      
      if (!name || !company_id) {
        return res.status(400).json({ error: "Name and company_id are required" });
      }
      
      // Verify company exists
      const company = await storage.getCompany(company_id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      // Generate a secure API key
      const keyPrefix = "lfs_live_";
      const keyBody = crypto.randomBytes(24).toString("base64url"); // 32 chars
      const fullKey = `${keyPrefix}${keyBody}`;
      
      // Hash the key for storage
      const keyHash = await bcrypt.hash(fullKey, 10);
      
      // Create the API key record
      const apiKey = await storage.createApiKey({
        key_prefix: keyPrefix,
        key_hash: keyHash,
        name,
        company_id,
        created_by: superAdminUser.id,
        is_active: true,
      });
      
      // Activity log for API key creation
      await logActivity({
        actor: { user: superAdminUser, source: "ui" },
        companyId: company_id,
        sheetId: null,
        sheetName: null,
        action: "api_key_created",
        targetType: "api_key",
        targetId: apiKey.id,
        targetName: name,
        extra: { company_name: company.name },
      }).catch(err => console.error("Activity log error:", err));
      
      // Return the full key ONLY ONCE
      res.json({
        ...apiKey,
        full_key: fullKey, // This is the only time the full key is returned
        company_name: company.name,
        message: "API key created. Copy the key now - it won't be shown again!",
      });
    } catch (error: any) {
      console.error("Create API key error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Revoke API key
  app.delete("/api/super-admin/api-keys/:keyId", authMiddleware, requireSuperAdminByEmail, async (req: AuthRequest, res) => {
    try {
      const { keyId } = req.params;
      const superAdminUser = (req as any).superAdminUser;
      
      const apiKey = await storage.getApiKey(keyId);
      if (!apiKey) {
        return res.status(404).json({ error: "API key not found" });
      }
      
      if (!apiKey.is_active) {
        return res.status(400).json({ error: "API key is already revoked" });
      }
      
      // Activity log for API key revocation (before revocation)
      await logActivity({
        actor: { user: superAdminUser, source: "ui" },
        companyId: apiKey.company_id,
        sheetId: null,
        sheetName: null,
        action: "api_key_revoked",
        targetType: "api_key",
        targetId: keyId,
        targetName: apiKey.name,
        extra: {},
      }).catch(err => console.error("Activity log error:", err));
      
      await storage.revokeApiKey(keyId);
      
      res.json({ success: true, message: "API key revoked successfully" });
    } catch (error: any) {
      console.error("Revoke API key error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Impersonate User
  // Store for short-lived impersonation codes (code -> { token, user, company, expires })
  const impersonationCodes = new Map<string, { token: string; user: any; company: any; expires: number }>();
  
  // Clean up expired codes periodically
  setInterval(() => {
    const now = Date.now();
    for (const [code, data] of impersonationCodes) {
      if (data.expires < now) {
        impersonationCodes.delete(code);
      }
    }
  }, 60000); // Clean up every minute

  app.post("/api/super-admin/impersonate/:userId", authMiddleware, requireSuperAdminByEmail, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const superAdminUser = (req as any).superAdminUser;
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't allow impersonating super admin
      if (targetUser.email === SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ error: "Cannot impersonate super admin" });
      }
      
      // Get the user's company
      const company = targetUser.company_id ? await storage.getCompany(targetUser.company_id) : null;
      
      // Create audit log for impersonation
      if (targetUser.company_id) {
        await storage.createAuditLog({
          company_id: targetUser.company_id,
          user_id: superAdminUser.id,
          action: "impersonate",
          model: "user",
          model_id: userId,
          payload: {
            impersonated_user: targetUser.email,
            impersonated_by: superAdminUser.email,
          },
        });
      }
      
      // Generate token for the impersonated user
      const token = generateToken(targetUser.id, targetUser.role, targetUser.company_id);
      
      const { password_hash, ...userWithoutPassword } = targetUser;
      
      // Generate a short-lived code instead of returning the token directly
      const code = crypto.randomBytes(32).toString("hex");
      impersonationCodes.set(code, {
        token,
        user: userWithoutPassword,
        company,
        expires: Date.now() + 60000, // 1 minute expiration
      });
      
      res.json({
        code,
        user: userWithoutPassword,
      });
    } catch (error: any) {
      console.error("Impersonate user error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Endpoint to redeem impersonation code for token
  app.post("/api/impersonate/redeem", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Invalid code" });
      }
      
      const data = impersonationCodes.get(code);
      
      if (!data) {
        return res.status(404).json({ error: "Invalid or expired code" });
      }
      
      if (data.expires < Date.now()) {
        impersonationCodes.delete(code);
        return res.status(404).json({ error: "Code expired" });
      }
      
      // Delete the code after use (one-time use)
      impersonationCodes.delete(code);
      
      res.json({
        token: data.token,
        user: data.user,
        company: data.company,
      });
    } catch (error: any) {
      console.error("Redeem impersonation code error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // MOBILE CALL INTEGRATION APIs
  // ============================================================================
  
  // Helper: Normalize phone number for consistent matching
  function normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    // Take last 10 digits for mobile number (removes country code)
    return digits.length > 10 ? digits.slice(-10) : digits;
  }
  
  // Helper: Extract phone numbers from lead custom_fields
  function extractPhoneNumbers(customFields: Record<string, any>): Array<{phone: string; type: string; isPrimary: boolean}> {
    const phoneFields = ['mobile_no', 'whatsapp_no', 'alternate_mobile', 'phone', 'mobile'];
    const phoneNumbers: Array<{phone: string; type: string; isPrimary: boolean}> = [];
    
    for (const field of phoneFields) {
      const value = customFields[field];
      if (value && String(value).trim()) {
        const normalized = normalizePhoneNumber(String(value));
        if (normalized.length >= 7) { // Valid phone number length
          phoneNumbers.push({
            phone: normalized,
            type: field,
            isPrimary: field === 'mobile_no', // Primary phone is mobile_no
          });
        }
      }
    }
    
    return phoneNumbers;
  }
  
  // GET /api/mobile/call-lookup - Lookup leads by phone number (Truecaller-style)
  app.get("/api/mobile/call-lookup", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { phone } = req.query;
      
      if (!phone || typeof phone !== 'string') {
        return res.status(400).json({ error: "Phone number is required" });
      }
      
      if (!req.companyId) {
        return res.status(403).json({ error: "Company context required" });
      }
      
      const results = await storage.lookupLeadsByPhone(req.companyId, phone);
      
      res.json({
        matches: results,
        matched_count: results.length,
        phone_normalized: normalizePhoneNumber(phone),
      });
    } catch (error: any) {
      console.error("Mobile call lookup error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // POST /api/mobile/call-sessions - Log a call session
  app.post("/api/mobile/call-sessions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { 
        phone_number, 
        direction, // 'incoming' or 'outgoing'
        lead_id, // optional - if already matched
        started_at,
        ended_at,
        duration_seconds,
        status, // 'completed', 'missed', 'declined', 'no_answer'
        notes,
      } = req.body;
      
      if (!req.companyId || !req.userId) {
        return res.status(403).json({ error: "Company context required" });
      }
      
      if (!phone_number || !direction) {
        return res.status(400).json({ error: "phone_number and direction are required" });
      }
      
      const normalizedPhone = normalizePhoneNumber(phone_number);
      
      // Auto-match lead if not provided
      let matchedLeadId = lead_id;
      let matchedSheetId: string | null = null;
      
      if (!matchedLeadId) {
        const matches = await storage.lookupLeadsByPhone(req.companyId, phone_number);
        if (matches.length === 1) {
          // Auto-match single result
          matchedLeadId = matches[0].lead_id;
          matchedSheetId = matches[0].sheet_id;
        }
        // Multiple matches: leave lead_id null, client shows selection dialog
      } else {
        // Get the sheet_id from provided lead
        const lead = await storage.getLead(matchedLeadId);
        matchedSheetId = lead?.sheet_id || null;
      }
      
      // Determine caller/callee based on direction
      const isOutgoing = direction === 'outgoing';
      const callerNum = isOutgoing ? 'user' : normalizedPhone;
      const calleeNum = isOutgoing ? normalizedPhone : 'user';
      
      // Create call session
      const callSession = await storage.createCallSession({
        company_id: req.companyId,
        user_id: req.userId,
        lead_id: matchedLeadId || null,
        sheet_id: matchedSheetId,
        direction,
        caller_number: callerNum,
        callee_number: calleeNum,
        started_at: started_at ? new Date(started_at) : new Date(),
        ended_at: ended_at ? new Date(ended_at) : null,
        duration_seconds: duration_seconds || null,
        status: status || 'completed',
        notes: notes ? { text: notes } : null,
        recording_url: null,
      });
      
      // If matched to a lead, create a lead_update entry for timeline visibility
      if (matchedLeadId) {
        const durationText = duration_seconds 
          ? `${Math.floor(duration_seconds / 60)}m ${duration_seconds % 60}s` 
          : 'Unknown duration';
        
        const callDescription = `${direction === 'incoming' ? 'Received' : 'Made'} call - ${status || 'completed'} (${durationText})`;
        
        await storage.createLeadUpdate({
          lead_id: matchedLeadId,
          update_via: 'call',
          update_on: new Date().toISOString(),
          remark: notes ? `${callDescription}: ${notes}` : callDescription,
          created_by_user_id: req.userId,
        });
      }
      
      res.status(201).json(callSession);
    } catch (error: any) {
      console.error("Create call session error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // POST /api/mobile/call-sessions/:id/recording - Upload call recording
  app.post("/api/mobile/call-sessions/:id/recording", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { recording_data, filename } = req.body; // Base64 encoded audio
      
      if (!req.companyId) {
        return res.status(403).json({ error: "Company context required" });
      }
      
      const callSession = await storage.getCallSession(id);
      if (!callSession) {
        return res.status(404).json({ error: "Call session not found" });
      }
      
      if (callSession.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (!recording_data) {
        return res.status(400).json({ error: "Recording data is required" });
      }
      
      // Upload to Replit Object Storage
      const { ObjectStorage } = await import('./objectStorage');
      const objectStorage = new ObjectStorage();
      
      const recordingFilename = filename || `call_${id}_${Date.now()}.wav`;
      const recordingPath = `call_recordings/${req.companyId}/${recordingFilename}`;
      
      // Convert base64 to buffer and upload
      const buffer = Buffer.from(recording_data, 'base64');
      await objectStorage.upload(recordingPath, buffer);
      
      // Get the public URL
      const recordingUrl = await objectStorage.getPublicUrl(recordingPath);
      
      // Update call session with recording URL
      const updatedSession = await storage.updateCallSession(id, { recording_url: recordingUrl });
      
      res.json({
        call_session: updatedSession,
        recording_url: recordingUrl,
      });
    } catch (error: any) {
      console.error("Upload call recording error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // PATCH /api/mobile/call-sessions/:id - Update call session (notes, re-link lead)
  app.patch("/api/mobile/call-sessions/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { notes, lead_id, status } = req.body;
      
      if (!req.companyId) {
        return res.status(403).json({ error: "Company context required" });
      }
      
      const callSession = await storage.getCallSession(id);
      if (!callSession) {
        return res.status(404).json({ error: "Call session not found" });
      }
      
      if (callSession.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updates: Record<string, any> = {};
      
      if (notes !== undefined) updates.notes = notes;
      if (status !== undefined) updates.status = status;
      
      // Handle re-linking to a different lead
      if (lead_id !== undefined) {
        const oldLeadId = callSession.lead_id;
        
        if (lead_id) {
          const newLead = await storage.getLead(lead_id);
          if (!newLead) {
            return res.status(404).json({ error: "Lead not found" });
          }
          updates.lead_id = lead_id;
          updates.sheet_id = newLead.sheet_id;
        } else {
          updates.lead_id = null;
          updates.sheet_id = null;
        }
        
        // Create lead_update entry if linking to new lead
        if (lead_id && lead_id !== oldLeadId) {
          const durationText = callSession.duration_seconds 
            ? `${Math.floor(callSession.duration_seconds / 60)}m ${callSession.duration_seconds % 60}s` 
            : 'Unknown duration';
          
          const callDescription = `${callSession.direction === 'incoming' ? 'Received' : 'Made'} call - ${callSession.status || 'completed'} (${durationText})`;
          
          await storage.createLeadUpdate({
            lead_id: lead_id,
            update_via: 'call',
            update_on: new Date().toISOString(),
            remark: notes ? `${callDescription}: ${notes}` : callDescription,
            created_by_user_id: req.userId,
          });
        }
      }
      
      const updatedSession = await storage.updateCallSession(id, updates);
      res.json(updatedSession);
    } catch (error: any) {
      console.error("Update call session error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // GET /api/mobile/call-sessions - Get call sessions (by lead or user's calls)
  app.get("/api/mobile/call-sessions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { lead_id, limit } = req.query;
      
      if (!req.companyId || !req.userId) {
        return res.status(403).json({ error: "Company context required" });
      }
      
      const limitNum = Math.min(parseInt(String(limit)) || 50, 100);
      
      let sessions;
      if (lead_id && typeof lead_id === 'string') {
        // Get calls for specific lead
        sessions = await storage.getCallSessionsByLeadId(lead_id, limitNum);
      } else {
        // Get user's recent calls
        sessions = await storage.getCallSessionsByUserId(req.userId, limitNum);
      }
      
      // Filter by company (in case of unauthorized access attempt)
      const filtered = sessions.filter(s => s.company_id === req.companyId);
      
      res.json({
        call_sessions: filtered,
        count: filtered.length,
      });
    } catch (error: any) {
      console.error("Get call sessions error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // GET /api/mobile/call-sessions/:id - Get single call session
  app.get("/api/mobile/call-sessions/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      
      if (!req.companyId) {
        return res.status(403).json({ error: "Company context required" });
      }
      
      const session = await storage.getCallSession(id);
      if (!session) {
        return res.status(404).json({ error: "Call session not found" });
      }
      
      if (session.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(session);
    } catch (error: any) {
      console.error("Get call session error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // PATCH /api/mobile/leads/:id - Quick lead update from mobile app
  app.patch("/api/mobile/leads/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { custom_fields, update_note } = req.body;
      
      if (!req.companyId || !req.userId) {
        return res.status(403).json({ error: "Company context required" });
      }
      
      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      // Verify lead belongs to user's company via sheet
      const sheet = await storage.getSheet(lead.sheet_id);
      if (!sheet || sheet.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Merge custom_fields
      const oldCustomFields = { ...lead.custom_fields };
      const newCustomFields = { ...lead.custom_fields, ...custom_fields };
      
      // Update lead
      const updatedLead = await storage.updateLead(id, { custom_fields: newCustomFields });
      
      // Create lead_update entries for changed fields
      const changedFieldDescriptions: string[] = [];
      for (const [key, newValue] of Object.entries(custom_fields)) {
        const oldValue = oldCustomFields[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changedFieldDescriptions.push(`${key}: ${oldValue || '(empty)'} → ${newValue || '(empty)'}`);
        }
      }
      
      // Create a single lead_update for all changed fields
      if (changedFieldDescriptions.length > 0) {
        await storage.createLeadUpdate({
          lead_id: id,
          update_via: 'call', // Using 'call' as mobile updates are typically from call app
          update_on: new Date().toISOString(),
          remark: update_note || `Mobile update: ${changedFieldDescriptions.join(', ')}`,
          created_by_user_id: req.userId,
        });
      }
      
      // Sync phone index if phone fields changed
      const phoneFields = ['mobile_no', 'whatsapp_no', 'alternate_mobile', 'phone', 'mobile'];
      const phoneFieldsChanged = phoneFields.some(f => custom_fields[f] !== undefined);
      if (phoneFieldsChanged && updatedLead) {
        const phoneNumbers = extractPhoneNumbers(updatedLead.custom_fields);
        await storage.syncLeadPhoneIndex(id, lead.sheet_id, req.companyId, phoneNumbers);
      }
      
      // Trigger outgoing webhooks for mobile update - simplified call signature
      if (updatedLead) {
        const oldFlatFields = flattenLeadFields(lead);
        const newFlatFields = flattenLeadFields(updatedLead);
        const changedFields = getChangedFields(oldFlatFields, newFlatFields);
        
        if (changedFields.length > 0) {
          // Note: triggerOutgoingWebhooks signature may vary - check implementation
          try {
            await triggerOutgoingWebhooks(
              req.companyId,
              'on_lead_update'
            );
          } catch (webhookError) {
            console.error("Outgoing webhook error (non-fatal):", webhookError);
          }
        }
      }
      
      res.json(updatedLead);
    } catch (error: any) {
      console.error("Mobile lead update error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // POST /api/mobile/leads/:id/quick-update - Add a quick note/update to lead timeline
  app.post("/api/mobile/leads/:id/quick-update", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { note, update_type } = req.body;
      
      if (!req.companyId || !req.userId) {
        return res.status(403).json({ error: "Company context required" });
      }
      
      if (!note) {
        return res.status(400).json({ error: "Note is required" });
      }
      
      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      // Verify lead belongs to user's company via sheet
      const sheet = await storage.getSheet(lead.sheet_id);
      if (!sheet || sheet.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Create lead update entry
      const leadUpdate = await storage.createLeadUpdate({
        lead_id: id,
        update_via: 'call', // Mobile app updates
        update_on: new Date().toISOString(),
        remark: note,
        created_by_user_id: req.userId,
      });
      
      res.status(201).json(leadUpdate);
    } catch (error: any) {
      console.error("Mobile quick update error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // GET /api/mobile/leads/:id - Get lead details with updates (for mobile view)
  app.get("/api/mobile/leads/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      
      if (!req.companyId) {
        return res.status(403).json({ error: "Company context required" });
      }
      
      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      // Verify lead belongs to user's company via sheet
      const sheet = await storage.getSheet(lead.sheet_id);
      if (!sheet || sheet.company_id !== req.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get lead updates
      const leadUpdates = await storage.getLeadUpdates(id);
      
      // Get call sessions for this lead
      const callSessions = await storage.getCallSessionsByLeadId(id, 20);
      
      // Get owner info
      const owner = await storage.getUser(lead.owner_user_id);
      
      res.json({
        lead,
        sheet_name: sheet.name,
        owner_name: owner?.name || "Unknown",
        lead_updates: leadUpdates,
        call_sessions: callSessions,
      });
    } catch (error: any) {
      console.error("Get mobile lead error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // POST /api/mobile/sync-phone-index - Rebuild phone index for company (admin only)
  app.post("/api/mobile/sync-phone-index", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: "Company context required" });
      }
      
      // Get all sheets for the company
      const sheets = await storage.getSheetsByCompanyId(req.companyId);
      let processedLeads = 0;
      let indexedPhones = 0;
      
      for (const sheet of sheets) {
        const leads = await storage.getLeadsBySheetId(sheet.id);
        
        for (const lead of leads) {
          if (!lead.deleted_at) {
            const phoneNumbers = extractPhoneNumbers(lead.custom_fields);
            await storage.syncLeadPhoneIndex(lead.id, sheet.id, req.companyId, phoneNumbers);
            processedLeads++;
            indexedPhones += phoneNumbers.length;
          }
        }
      }
      
      res.json({
        success: true,
        message: `Rebuilt phone index: ${processedLeads} leads processed, ${indexedPhones} phone numbers indexed`,
        processed_leads: processedLeads,
        indexed_phones: indexedPhones,
      });
    } catch (error: any) {
      console.error("Sync phone index error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // ACTIVITY LOGS
  // ============================================================================
  
  // Get activity logs for the current user (their own actions only)
  app.get("/api/activity-logs/my", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: "Company context required" });
      }
      
      const { sheet_id, action, date_from, date_to, page, limit } = req.query;
      
      const filters: ActivityLogFilters = {
        company_id: req.companyId,
        user_id: req.userId!, // Only their own actions
        sheet_id: sheet_id as string | undefined,
        action: action as any,
        date_from: date_from as string | undefined,
        date_to: date_to as string | undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
      };
      
      const result = await storage.getActivityLogs(filters);
      res.json(result);
    } catch (error: any) {
      console.error("Get my activity logs error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get activity logs for company (admin only - can filter by user/sheet)
  app.get("/api/activity-logs/company", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: "Company context required" });
      }
      
      const { sheet_id, user_id, action, date_from, date_to, page, limit } = req.query;
      
      const filters: ActivityLogFilters = {
        company_id: req.companyId,
        user_id: user_id as string | undefined,
        sheet_id: sheet_id as string | undefined,
        action: action as any,
        date_from: date_from as string | undefined,
        date_to: date_to as string | undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
      };
      
      const result = await storage.getActivityLogs(filters);
      res.json(result);
    } catch (error: any) {
      console.error("Get company activity logs error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get activity log stats for company (admin only)
  app.get("/api/activity-logs/company/stats", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: "Company context required" });
      }
      
      const { sheet_id, date_from, date_to } = req.query;
      
      const stats = await storage.getActivityLogStats(
        req.companyId,
        sheet_id as string | undefined,
        date_from as string | undefined,
        date_to as string | undefined
      );
      
      res.json(stats);
    } catch (error: any) {
      console.error("Get activity log stats error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Super Admin: Get activity logs across all companies
  app.get("/api/admin/activity-logs", authMiddleware, requireSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const { company_id, sheet_id, user_id, action, date_from, date_to, page, limit } = req.query;
      
      // Require company_id for super admin to avoid massive queries
      if (!company_id) {
        return res.status(400).json({ error: "company_id is required for super admin queries" });
      }
      
      const filters: ActivityLogFilters = {
        company_id: company_id as string,
        user_id: user_id as string | undefined,
        sheet_id: sheet_id as string | undefined,
        action: action as any,
        date_from: date_from as string | undefined,
        date_to: date_to as string | undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
      };
      
      const result = await storage.getActivityLogs(filters);
      res.json(result);
    } catch (error: any) {
      console.error("Get all activity logs error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Super Admin: Get activity log stats for any company
  app.get("/api/admin/activity-logs/stats", authMiddleware, requireSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const { company_id, sheet_id, date_from, date_to } = req.query;
      
      if (!company_id) {
        return res.status(400).json({ error: "company_id is required" });
      }
      
      const stats = await storage.getActivityLogStats(
        company_id as string,
        sheet_id as string | undefined,
        date_from as string | undefined,
        date_to as string | undefined
      );
      
      res.json(stats);
    } catch (error: any) {
      console.error("Get activity log stats error:", error);
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

  // ============================================================================
  // SCHEDULED CLEANUP - 45-Day Selfie URL Retention
  // ============================================================================
  // Run initial selfie cleanup on startup
  (async () => {
    try {
      console.log('[Cleanup] Running initial cleanup of selfie URLs older than 45 days...');
      const count = await storage.cleanupOldSelfieUrls(45);
      console.log(`[Cleanup] Initial selfie cleanup completed: ${count} selfie URLs cleared`);
    } catch (error) {
      console.error('[Cleanup] Failed to run initial selfie cleanup:', error);
    }
  })();

  // Schedule daily selfie cleanup
  setInterval(async () => {
    try {
      console.log('[Cleanup] Running scheduled cleanup of selfie URLs older than 45 days...');
      const count = await storage.cleanupOldSelfieUrls(45);
      console.log(`[Cleanup] Scheduled selfie cleanup completed: ${count} selfie URLs cleared`);
    } catch (error) {
      console.error('[Cleanup] Failed to run scheduled selfie cleanup:', error);
    }
  }, cleanupInterval);

  return httpServer;
}
