import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "../storage";

const JWT_SECRET = process.env.JWT_SECRET || "dabluz-crm-secret-key-change-in-production";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: "super_admin" | "company_admin" | "user";
  companyId?: string | null;
  apiKeyId?: string; // Set when authenticated via API key
}

export interface JWTPayload {
  userId: string;
  role: "super_admin" | "company_admin" | "user";
  companyId: string | null;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.substring(7);

  // Check if it's an API key (starts with lfs_live_)
  if (token.startsWith("lfs_live_")) {
    try {
      // Get all active API keys and check each one
      const allApiKeys = await storage.getAllApiKeys();
      const activeKeys = allApiKeys.filter(k => k.is_active);
      
      let matchedKey = null;
      for (const key of activeKeys) {
        const isValid = await bcrypt.compare(token, key.key_hash);
        if (isValid) {
          matchedKey = key;
          break;
        }
      }
      
      if (!matchedKey) {
        return res.status(401).json({ error: "Invalid API key" });
      }
      
      // Update last used timestamp (fire and forget)
      storage.updateApiKeyLastUsed(matchedKey.id).catch(() => {});
      
      // Get the first admin user of the company for context
      const companyUsers = await storage.getUsersByCompanyId(matchedKey.company_id);
      const adminUser = companyUsers.find(u => u.role === "company_admin") || companyUsers[0];
      
      if (!adminUser) {
        return res.status(401).json({ error: "No users found for API key company" });
      }
      
      // Set request context from company admin
      req.userId = adminUser.id;
      req.userRole = "user"; // API keys act as regular users
      req.companyId = matchedKey.company_id;
      req.apiKeyId = matchedKey.id;
      
      return next();
    } catch (error) {
      console.error("API key validation error:", error);
      return res.status(401).json({ error: "Invalid API key" });
    }
  }

  // Otherwise, treat as JWT token
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // For non-super-admin users, verify the account is still active
    if (decoded.role !== "super_admin") {
      const user = await storage.getUser(decoded.userId);
      if (!user || user.is_active === false) {
        return res.status(401).json({ error: "Your account has been deactivated. Please contact your administrator." });
      }
    }

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.companyId = decoded.companyId;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Require user to be authenticated and belong to a company
export function requireCompany(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.companyId) {
    return res.status(403).json({ error: "Forbidden: Company context required" });
  }
  next();
}

// Require user to be super admin
export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "super_admin") {
    return res.status(403).json({ error: "Forbidden: Super admin access required" });
  }
  next();
}

// Require user to be company admin or super admin
export function requireCompanyAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "super_admin" && req.userRole !== "company_admin") {
    return res.status(403).json({ error: "Forbidden: Company admin access required" });
  }
  next();
}

// Require user to have specific role
export function requireRole(...roles: ("super_admin" | "company_admin" | "user")[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: `Forbidden: One of these roles required: ${roles.join(", ")}` });
    }
    next();
  };
}

// Helper function to check if a user has access to a sheet
export async function hasSheetAccess(
  userId: string,
  userRole: "super_admin" | "company_admin" | "user",
  companyId: string | null,
  sheetId: string
): Promise<boolean> {
  try {
    // Super admins have access to all sheets
    if (userRole === "super_admin") {
      return true;
    }

    const sheet = await storage.getSheet(sheetId);
    if (!sheet || sheet.deleted_at) {
      return false;
    }

    // Personal sheets: Only owner has access (unless there's explicit SheetUser permission)
    if (sheet.is_personal) {
      if (sheet.company_id !== companyId && sheet.owner_id !== userId) {
        return false;
      }
      
      if (sheet.owner_id === userId) {
        return true;
      }
      // Check for explicit permission
      const sheetUsers = await storage.getSheetUsers(sheetId);
      return sheetUsers.some(su => su.user_id === userId);
    }

    // Company sheets with restricted visibility: Check explicit permissions
    if (sheet.visibility === "restricted") {
      if (sheet.company_id !== companyId) {
        return false;
      }
      
      const sheetUsers = await storage.getSheetUsers(sheetId);
      return sheetUsers.some(su => su.user_id === userId);
    }

    // Company sheets with company visibility: All company members have access
    if (sheet.visibility === "company" && sheet.company_id === companyId) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

// Check if user has access to a specific sheet (for company users)
export async function requireSheetAccess(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sheetId = req.params.id || req.params.sheetId || req.body.sheetId;
    if (!sheetId) {
      return res.status(400).json({ error: "Sheet ID required" });
    }

    // Super admins have access to all sheets
    if (req.userRole === "super_admin") {
      return next();
    }

    const sheet = await storage.getSheet(sheetId);
    if (!sheet) {
      return res.status(404).json({ error: "Sheet not found" });
    }

    // Check if sheet is soft-deleted
    if (sheet.deleted_at) {
      return res.status(404).json({ error: "Sheet not found" });
    }

    // Personal sheets: Only owner has access (unless there's explicit SheetUser permission)
    if (sheet.is_personal) {
      // Defense in depth: verify company_id matches (or user is owner)
      if (sheet.company_id !== req.companyId && sheet.owner_id !== req.userId) {
        return res.status(403).json({ error: "Forbidden: No access to this sheet" });
      }
      
      if (sheet.owner_id === req.userId) {
        return next();
      }
      // Check for explicit permission
      const sheetUsers = await storage.getSheetUsers(sheetId);
      const hasPermission = sheetUsers.some(su => su.user_id === req.userId);
      if (hasPermission) {
        return next();
      }
      return res.status(403).json({ error: "Forbidden: This is a personal sheet" });
    }

    // Company sheets with restricted visibility: Check explicit permissions
    if (sheet.visibility === "restricted") {
      // Defense in depth: verify company_id matches
      if (sheet.company_id !== req.companyId) {
        return res.status(403).json({ error: "Forbidden: No access to this sheet" });
      }
      
      const sheetUsers = await storage.getSheetUsers(sheetId);
      const hasPermission = sheetUsers.some(su => su.user_id === req.userId);
      if (hasPermission) {
        return next();
      }
      return res.status(403).json({ error: "Forbidden: No permission for this sheet" });
    }

    // Company sheets with company visibility: All company members have access
    if (sheet.visibility === "company" && sheet.company_id === req.companyId) {
      return next();
    }

    return res.status(403).json({ error: "Forbidden: No access to this sheet" });
  } catch (error) {
    return res.status(500).json({ error: "Error checking sheet access" });
  }
}

// Generate JWT token with company context
export function generateToken(userId: string, role: "super_admin" | "company_admin" | "user", companyId: string | null): string {
  const payload: JWTPayload = { userId, role, companyId };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// Legacy middleware for backwards compatibility (will be removed)
export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "super_admin" && req.userRole !== "company_admin") {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  next();
}
