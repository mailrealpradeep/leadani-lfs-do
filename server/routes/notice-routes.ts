import express, { type Express } from "express";
import { authMiddleware, requireCompanyAdmin, type AuthRequest } from "../middleware/auth";
import { storage } from "../storage";
import { ObjectStorage } from "../objectStorage";

const objectStorage = new ObjectStorage();

export function registerNoticeRoutes(app: Express): void {
  // GET /api/notice — fetch metadata for the company's current notice (all authenticated users)
  app.get("/api/notice", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId!;
      const notice = await storage.getCompanyNotice(companyId);
      if (!notice) return res.status(404).json({ error: "No notice uploaded" });
      res.json({
        id: notice.id,
        original_filename: notice.original_filename,
        uploaded_by: notice.uploaded_by,
        uploaded_at: notice.uploaded_at,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/notice/file — stream the PDF bytes (all authenticated users)
  app.get("/api/notice/file", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId!;
      const notice = await storage.getCompanyNotice(companyId);
      if (!notice) return res.status(404).json({ error: "No notice uploaded" });

      const fileBuffer = await objectStorage.download(notice.file_path);
      if (!fileBuffer) return res.status(404).json({ error: "File not found" });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(notice.original_filename)}"`
      );
      res.setHeader("Cache-Control", "private, max-age=300");
      res.send(fileBuffer);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/notice — upload / replace the company's notice PDF (company admin only)
  // Accepts JSON body: { filename: string, data: string (base64) }
  // Uses a higher body-size limit (30mb) to accommodate up to 20MB PDFs after base64 encoding
  app.post(
    "/api/notice",
    express.json({ limit: "30mb" }),
    authMiddleware,
    requireCompanyAdmin,
    async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId!;
      const userId = req.userId!;
      const { filename, data } = req.body as { filename?: string; data?: string };

      if (!filename || !data) {
        return res.status(400).json({ error: "filename and data (base64) are required" });
      }

      // Validate filename extension
      const ext = filename.toLowerCase().split(".").pop();
      if (ext !== "pdf") {
        return res.status(400).json({ error: "Only PDF files are accepted" });
      }

      // Decode base64
      const buffer = Buffer.from(data, "base64");
      if (buffer.length > 20 * 1024 * 1024) {
        // 20 MB limit
        return res.status(400).json({ error: "File too large (max 20 MB)" });
      }

      // Validate PDF magic bytes: must start with %PDF (0x25 0x50 0x44 0x46)
      if (
        buffer.length < 4 ||
        buffer[0] !== 0x25 ||
        buffer[1] !== 0x50 ||
        buffer[2] !== 0x44 ||
        buffer[3] !== 0x46
      ) {
        return res.status(400).json({ error: "File does not appear to be a valid PDF" });
      }

      // Delete old file if it exists
      const existing = await storage.getCompanyNotice(companyId);
      if (existing) {
        await objectStorage.delete(existing.file_path).catch(() => {});
      }

      // Store new file under notices/{companyId}.pdf
      const filePath = `notices/${companyId}.pdf`;
      await objectStorage.upload(filePath, buffer);

      // Upsert the metadata row
      const notice = await storage.upsertCompanyNotice({
        company_id: companyId,
        file_path: filePath,
        original_filename: filename,
        uploaded_by: userId,
      });

      res.json({
        id: notice.id,
        original_filename: notice.original_filename,
        uploaded_by: notice.uploaded_by,
        uploaded_at: notice.uploaded_at,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE /api/notice — remove the company's notice (company admin only)
  app.delete("/api/notice", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId!;
      const existing = await storage.getCompanyNotice(companyId);
      if (!existing) return res.status(404).json({ error: "No notice to delete" });

      await objectStorage.delete(existing.file_path).catch(() => {});
      await storage.deleteCompanyNotice(companyId);

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
