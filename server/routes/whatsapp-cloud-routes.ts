import type { Express } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { storage } from "../storage";
import { db } from "../db";
import * as dbSchema from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const SUPER_ADMIN_EMAIL = "adminleadani@leadani.com";

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

export function registerWhatsAppCloudRoutes(app: Express): void {
  app.get("/api/super-admin/meta-settings", authMiddleware, requireSuperAdminByEmail, async (req: AuthRequest, res) => {
    try {
      const settings = await db.select().from(dbSchema.meta_platform_settings);
      const result: Record<string, string> = {};
      for (const s of settings) {
        result[s.setting_key] = s.setting_value;
      }
      res.json(result);
    } catch (error: any) {
      console.error("Get meta settings error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/super-admin/meta-settings", authMiddleware, requireSuperAdminByEmail, async (req: AuthRequest, res) => {
    try {
      const superAdminUser = (req as any).superAdminUser;
      const { fb_app_id, fb_app_secret, fb_config_id, webhook_verify_token } = req.body;

      const settings = [
        { key: "fb_app_id", value: fb_app_id || "", description: "Facebook App ID" },
        { key: "fb_app_secret", value: fb_app_secret || "", description: "Facebook App Secret" },
        { key: "fb_config_id", value: fb_config_id || "", description: "Facebook Login Configuration ID" },
        { key: "webhook_verify_token", value: webhook_verify_token || "", description: "Webhook Verify Token for Meta" },
      ];

      for (const s of settings) {
        if (!s.value) continue;
        const existing = await db.select().from(dbSchema.meta_platform_settings).where(eq(dbSchema.meta_platform_settings.setting_key, s.key));
        if (existing.length > 0) {
          await db.update(dbSchema.meta_platform_settings)
            .set({ setting_value: s.value, description: s.description, updated_by: superAdminUser.id, updated_at: new Date() })
            .where(eq(dbSchema.meta_platform_settings.setting_key, s.key));
        } else {
          await db.insert(dbSchema.meta_platform_settings).values({
            setting_key: s.key,
            setting_value: s.value,
            description: s.description,
            updated_by: superAdminUser.id,
          });
        }
      }

      res.json({ success: true, message: "Meta platform settings saved" });
    } catch (error: any) {
      console.error("Save meta settings error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/whatsapp-cloud/config", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user || (user.role !== "company_admin" && user.role !== "super_admin")) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const configs = await db.select().from(dbSchema.whatsapp_cloud_config)
        .where(eq(dbSchema.whatsapp_cloud_config.company_id, user.company_id));

      const enrichedConfigs = await Promise.all(configs.map(async (c) => {
        const connectedUser = c.connected_by ? await storage.getUser(c.connected_by) : null;
        return {
          ...c,
          access_token: c.access_token ? "••••••••" : null,
          connected_by_name: connectedUser?.name || null,
        };
      }));

      res.json(enrichedConfigs);
    } catch (error: any) {
      console.error("Get whatsapp cloud config error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/whatsapp-cloud/meta-app-id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user || (user.role !== "company_admin" && user.role !== "super_admin")) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const settings = await db.select().from(dbSchema.meta_platform_settings)
        .where(eq(dbSchema.meta_platform_settings.setting_key, "fb_app_id"));
      const configId = await db.select().from(dbSchema.meta_platform_settings)
        .where(eq(dbSchema.meta_platform_settings.setting_key, "fb_config_id"));

      res.json({
        fb_app_id: settings[0]?.setting_value || null,
        fb_config_id: configId[0]?.setting_value || null,
      });
    } catch (error: any) {
      console.error("Get meta app id error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/whatsapp-cloud/connect", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user || (user.role !== "company_admin" && user.role !== "super_admin")) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { code, waba_id, phone_number_id } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Authorization code is required" });
      }

      const allSettings = await db.select().from(dbSchema.meta_platform_settings);
      const settingsMap: Record<string, string> = {};
      for (const s of allSettings) {
        settingsMap[s.setting_key] = s.setting_value;
      }

      const fbAppId = settingsMap["fb_app_id"];
      const fbAppSecret = settingsMap["fb_app_secret"];

      if (!fbAppId || !fbAppSecret) {
        return res.status(400).json({ error: "Meta platform not configured. Contact Super Admin." });
      }

      const tokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${fbAppId}&client_secret=${fbAppSecret}&code=${code}`;
      const tokenResponse = await fetch(tokenUrl);
      const tokenData = await tokenResponse.json() as any;

      if (tokenData.error) {
        console.error("Token exchange error:", tokenData.error);
        return res.status(400).json({ error: `Token exchange failed: ${tokenData.error.message}` });
      }

      const accessToken = tokenData.access_token;

      let displayPhone = "";
      let businessName = "";

      if (phone_number_id) {
        try {
          const phoneResponse = await fetch(
            `https://graph.facebook.com/v22.0/${phone_number_id}?fields=display_phone_number,verified_name&access_token=${accessToken}`
          );
          const phoneData = await phoneResponse.json() as any;
          displayPhone = phoneData.display_phone_number || "";
          businessName = phoneData.verified_name || "";
        } catch (e) {
          console.error("Failed to fetch phone details:", e);
        }
      }

      let finalWabaId = waba_id;
      if (!finalWabaId) {
        try {
          const debugUrl = `https://graph.facebook.com/v22.0/debug_token?input_token=${accessToken}&access_token=${fbAppId}|${fbAppSecret}`;
          const debugResponse = await fetch(debugUrl);
          const debugData = await debugResponse.json() as any;
          const granularScopes = debugData.data?.granular_scopes || [];
          const wabaScope = granularScopes.find((s: any) => s.permission === "whatsapp_business_management");
          if (wabaScope?.target_ids?.length > 0) {
            finalWabaId = wabaScope.target_ids[0];
          }
        } catch (e) {
          console.error("Failed to get WABA from debug token:", e);
        }
      }

      const webhookVerifyToken = crypto.randomBytes(16).toString("hex");

      const existing = await db.select().from(dbSchema.whatsapp_cloud_config)
        .where(eq(dbSchema.whatsapp_cloud_config.company_id, user.company_id));

      if (existing.length > 0) {
        await db.update(dbSchema.whatsapp_cloud_config)
          .set({
            waba_id: finalWabaId || null,
            phone_number_id: phone_number_id || null,
            display_phone_number: displayPhone || null,
            business_name: businessName || null,
            access_token: accessToken,
            account_status: "connected",
            webhook_verify_token: webhookVerifyToken,
            connected_at: new Date(),
            connected_by: user.id,
            updated_at: new Date(),
          })
          .where(eq(dbSchema.whatsapp_cloud_config.company_id, user.company_id));
      } else {
        await db.insert(dbSchema.whatsapp_cloud_config).values({
          company_id: user.company_id,
          waba_id: finalWabaId || null,
          phone_number_id: phone_number_id || null,
          display_phone_number: displayPhone || null,
          business_name: businessName || null,
          access_token: accessToken,
          account_status: "connected",
          webhook_verify_token: webhookVerifyToken,
          connected_at: new Date(),
          connected_by: user.id,
        });
      }

      if (finalWabaId) {
        try {
          await fetch(
            `https://graph.facebook.com/v22.0/${finalWabaId}/subscribed_apps`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
        } catch (e) {
          console.error("Failed to subscribe to WABA webhooks:", e);
        }
      }

      res.json({
        success: true,
        message: "WhatsApp Business connected successfully",
        waba_id: finalWabaId,
        phone_number_id,
        display_phone_number: displayPhone,
        business_name: businessName,
        webhook_verify_token: webhookVerifyToken,
      });
    } catch (error: any) {
      console.error("WhatsApp Cloud connect error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/whatsapp-cloud/disconnect", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user || (user.role !== "company_admin" && user.role !== "super_admin")) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await db.update(dbSchema.whatsapp_cloud_config)
        .set({
          account_status: "disconnected",
          access_token: null,
          waba_id: null,
          phone_number_id: null,
          display_phone_number: null,
          business_name: null,
          connected_at: null,
          connected_by: null,
          updated_at: new Date(),
        })
        .where(eq(dbSchema.whatsapp_cloud_config.company_id, user.company_id));

      res.json({ success: true, message: "WhatsApp Business disconnected" });
    } catch (error: any) {
      console.error("WhatsApp Cloud disconnect error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/whatsapp-cloud/webhook", async (req, res) => {
    try {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe") {
        const globalToken = await db.select().from(dbSchema.meta_platform_settings)
          .where(eq(dbSchema.meta_platform_settings.setting_key, "webhook_verify_token"));

        if (globalToken.length > 0 && globalToken[0].setting_value === token) {
          console.log("[WhatsApp Cloud] Webhook verified");
          return res.status(200).send(challenge);
        }

        const companyConfigs = await db.select().from(dbSchema.whatsapp_cloud_config)
          .where(eq(dbSchema.whatsapp_cloud_config.webhook_verify_token, token as string));

        if (companyConfigs.length > 0) {
          console.log("[WhatsApp Cloud] Webhook verified for company:", companyConfigs[0].company_id);
          return res.status(200).send(challenge);
        }

        return res.status(403).json({ error: "Verification failed" });
      }
      res.status(400).json({ error: "Invalid mode" });
    } catch (error: any) {
      console.error("Webhook verify error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/whatsapp-cloud/webhook", async (req, res) => {
    try {
      const signature = req.headers["x-hub-signature-256"] as string;
      if (signature) {
        try {
          const appSecretRow = await db.select().from(dbSchema.meta_platform_settings)
            .where(eq(dbSchema.meta_platform_settings.setting_key, "fb_app_secret"));
          const appSecret = appSecretRow[0]?.setting_value;
          if (appSecret) {
            const rawBody = JSON.stringify(req.body);
            const expectedSig = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
            if (signature !== expectedSig) {
              console.warn("[WhatsApp Cloud] Invalid webhook signature");
              return res.status(401).json({ error: "Invalid signature" });
            }
          }
        } catch (sigError) {
          console.error("[WhatsApp Cloud] Signature verification error:", sigError);
        }
      }

      res.status(200).json({ status: "received" });

      const body = req.body;
      if (!body?.entry) return;

      for (const entry of body.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field !== "messages") continue;

          const value = change.value;
          if (!value?.messages) continue;

          const metadata = value.metadata;
          const phoneNumberId = metadata?.phone_number_id;
          const displayPhoneNumber = metadata?.display_phone_number;

          const configs = await db.select().from(dbSchema.whatsapp_cloud_config)
            .where(eq(dbSchema.whatsapp_cloud_config.phone_number_id, phoneNumberId));

          if (configs.length === 0) {
            console.log(`[WhatsApp Cloud] No company found for phone_number_id: ${phoneNumberId}`);
            continue;
          }

          const config = configs[0];
          const companyId = config.company_id;

          for (const message of value.messages) {
            const senderPhone = message.from;
            const messageType = message.type;
            const messageText = messageType === "text" ? message.text?.body : `[${messageType}]`;

            console.log(`[WhatsApp Cloud] Message from ${senderPhone} to ${displayPhoneNumber} (company: ${companyId}): ${messageText}`);

            try {
              await db.insert(dbSchema.whatsapp_message_logs).values({
                company_id: companyId,
                sender_phone: senderPhone,
                sender_name: value.contacts?.[0]?.profile?.name || null,
                display_phone_number: displayPhoneNumber,
                message_type: messageType,
                message_text: messageText,
                raw_payload: body,
                outcome: "received",
                processed_at: new Date(),
              });
            } catch (logError) {
              console.error("[WhatsApp Cloud] Failed to log message:", logError);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Webhook message error:", error);
    }
  });
}
