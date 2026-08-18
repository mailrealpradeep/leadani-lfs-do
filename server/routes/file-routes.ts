import { type Express, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { ObjectStorage } from "../objectStorage";
import { JWT_SECRET } from "../config";

const objectStorage = new ObjectStorage();

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".webm": "audio/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function contentTypeFor(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPES[ext] || "application/octet-stream";
}

function isUnsafePath(filePath: string): boolean {
  return (
    !filePath ||
    filePath.includes("..") ||
    filePath.includes("\\") ||
    filePath.includes("\0") ||
    filePath.startsWith("/")
  );
}

// A caller may access a file if they are super_admin, or if their company id
// appears as a path segment (covers call_recordings/{companyId}/… and
// notices/{companyId}.pdf).
function canAccess(filePath: string, role: string | undefined, companyId: string | null | undefined): boolean {
  if (role === "super_admin") return true;
  if (!companyId) return false;
  return filePath.split("/").some(
    (segment) => segment === companyId || segment === `${companyId}.pdf`,
  );
}

export function registerFileRoutes(app: Express): void {
  // GET /api/files/view-token?path=… — mint a short-lived token for use in
  // <audio>/<embed> src attributes, which cannot send Authorization headers.
  app.get("/api/files/view-token", authMiddleware, async (req: AuthRequest, res: Response) => {
    const filePath = req.query.path as string;
    if (!filePath || isUnsafePath(filePath)) {
      return res.status(400).json({ error: "Invalid path" });
    }
    if (!canAccess(filePath, req.userRole, req.companyId)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const token = jwt.sign({ purpose: "file-view", path: filePath }, JWT_SECRET, {
      expiresIn: "5m",
    });
    res.json({ token });
  });

  // GET /api/files/<path> — serve a stored file. Auth: Bearer JWT, or a
  // short-lived ?t= token minted above (path-bound).
  app.get("/api/files/*", async (req: Request, res: Response) => {
    try {
      const filePath = (req.params as Record<string, string>)[0];
      if (isUnsafePath(filePath)) {
        return res.status(400).json({ error: "Invalid path" });
      }

      const viewToken = req.query.t as string | undefined;
      if (viewToken) {
        let payload: any;
        try {
          payload = jwt.verify(viewToken, JWT_SECRET);
        } catch {
          return res.status(401).json({ error: "Invalid or expired token" });
        }
        if (payload.purpose !== "file-view" || payload.path !== filePath) {
          return res.status(401).json({ error: "Invalid token" });
        }
      } else {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
          return res.status(401).json({ error: "Authentication required" });
        }
        let decoded: any;
        try {
          decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
        } catch {
          return res.status(401).json({ error: "Invalid or expired token" });
        }
        if (!canAccess(filePath, decoded.role, decoded.companyId)) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const data = await objectStorage.download(filePath);
      if (!data) {
        return res.status(404).json({ error: "File not found" });
      }

      res.setHeader("Content-Type", contentTypeFor(filePath));
      res.setHeader("Content-Length", data.length);
      res.setHeader("Cache-Control", "private, max-age=300");
      res.send(data);
    } catch (error: any) {
      console.error("File serve error:", error);
      res.status(500).json({ error: "Failed to serve file" });
    }
  });
}
