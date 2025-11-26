// @ts-ignore - web-push doesn't have type definitions
import webpush from 'web-push';
import { storage } from './storage';
import type { PushSubscription, User, Company } from '@shared/schema';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@leadani.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    type?: string;
    leadId?: string;
    sheetId?: string;
  };
}

export type NotificationEventType = 
  | 'lead_assigned'
  | 'nfdt_reminder'
  | 'lead_updated'
  | 'webhook_received'
  | 'user_joined';

export async function getVapidPublicKey(): Promise<string> {
  return VAPID_PUBLIC_KEY;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys not configured, skipping push notification');
    return false;
  }

  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );
    return true;
  } catch (error: any) {
    console.error('Push notification error:', error.message);
    
    if (error.statusCode === 410 || error.statusCode === 404) {
      await storage.deletePushSubscription(subscription.user_id, subscription.endpoint);
      console.log('Removed expired subscription');
    }
    return false;
  }
}

export async function sendNotificationToUser(
  userId: string,
  payload: NotificationPayload
): Promise<number> {
  const subscriptions = await storage.getPushSubscriptionsByUserId(userId);
  let successCount = 0;

  for (const subscription of subscriptions) {
    const success = await sendPushNotification(subscription, payload);
    if (success) successCount++;
  }

  return successCount;
}

export async function sendNotificationToCompanyUsers(
  companyId: string,
  payload: NotificationPayload,
  excludeUserId?: string
): Promise<number> {
  const subscriptions = await storage.getPushSubscriptionsByCompanyId(companyId);
  let successCount = 0;

  for (const subscription of subscriptions) {
    if (excludeUserId && subscription.user_id === excludeUserId) continue;
    
    const success = await sendPushNotification(subscription, payload);
    if (success) successCount++;
  }

  return successCount;
}

export function isNotificationEnabled(
  companySettings: Company['settings'],
  eventType: NotificationEventType
): boolean {
  const notificationSettings = companySettings?.notification_settings;
  if (!notificationSettings) return false;

  switch (eventType) {
    case 'lead_assigned':
      return notificationSettings.lead_assigned === true;
    case 'nfdt_reminder':
      return notificationSettings.nfdt_reminder === true;
    case 'lead_updated':
      return notificationSettings.lead_updated === true;
    case 'webhook_received':
      return notificationSettings.webhook_received === true;
    case 'user_joined':
      return notificationSettings.user_joined === true;
    default:
      return false;
  }
}

export async function notifyLeadAssigned(
  assigneeUserId: string,
  leadName: string,
  sheetName: string,
  sheetId: string,
  leadId: string
): Promise<void> {
  const user = await storage.getUser(assigneeUserId);
  if (!user?.company_id) return;

  const company = await storage.getCompany(user.company_id);
  if (!company || !isNotificationEnabled(company.settings, 'lead_assigned')) return;

  await sendNotificationToUser(assigneeUserId, {
    title: 'New Lead Assigned',
    body: `${leadName} in ${sheetName} has been assigned to you`,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: `lead-assigned-${leadId}`,
    data: {
      type: 'lead_assigned',
      url: `/dashboard?sheet=${sheetId}&lead=${leadId}`,
      leadId,
      sheetId,
    },
  });
}

export async function notifyNFDTReminder(
  userId: string,
  leadName: string,
  nfdtTime: string,
  sheetId: string,
  leadId: string
): Promise<void> {
  const user = await storage.getUser(userId);
  if (!user?.company_id) return;

  const company = await storage.getCompany(user.company_id);
  if (!company || !isNotificationEnabled(company.settings, 'nfdt_reminder')) return;

  await sendNotificationToUser(userId, {
    title: 'Follow-up Reminder',
    body: `Follow up with ${leadName} is due now`,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: `nfdt-${leadId}`,
    data: {
      type: 'nfdt_reminder',
      url: `/dashboard?sheet=${sheetId}&lead=${leadId}`,
      leadId,
      sheetId,
    },
  });
}

export async function notifyLeadUpdated(
  leadOwnerId: string,
  updatedByName: string,
  leadName: string,
  sheetId: string,
  leadId: string,
  updatedByUserId: string
): Promise<void> {
  if (leadOwnerId === updatedByUserId) return;

  const user = await storage.getUser(leadOwnerId);
  if (!user?.company_id) return;

  const company = await storage.getCompany(user.company_id);
  if (!company || !isNotificationEnabled(company.settings, 'lead_updated')) return;

  await sendNotificationToUser(leadOwnerId, {
    title: 'Lead Updated',
    body: `${updatedByName} updated ${leadName}`,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: `lead-updated-${leadId}`,
    data: {
      type: 'lead_updated',
      url: `/dashboard?sheet=${sheetId}&lead=${leadId}`,
      leadId,
      sheetId,
    },
  });
}

export async function notifyWebhookReceived(
  companyId: string,
  leadName: string,
  sheetName: string,
  sheetId: string,
  leadId: string
): Promise<void> {
  const company = await storage.getCompany(companyId);
  if (!company || !isNotificationEnabled(company.settings, 'webhook_received')) return;

  const companyUsers = await storage.getUsersByCompanyId(companyId);
  const admins = companyUsers.filter(u => u.role === 'company_admin');

  for (const admin of admins) {
    await sendNotificationToUser(admin.id, {
      title: 'New Webhook Lead',
      body: `${leadName} received via webhook in ${sheetName}`,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: `webhook-${leadId}`,
      data: {
        type: 'webhook_received',
        url: `/dashboard?sheet=${sheetId}&lead=${leadId}`,
        leadId,
        sheetId,
      },
    });
  }
}

export async function notifyUserJoined(
  companyId: string,
  newUserName: string,
  newUserId: string
): Promise<void> {
  const company = await storage.getCompany(companyId);
  if (!company || !isNotificationEnabled(company.settings, 'user_joined')) return;

  const companyUsers = await storage.getUsersByCompanyId(companyId);
  const admins = companyUsers.filter(u => u.role === 'company_admin' && u.id !== newUserId);

  for (const admin of admins) {
    await sendNotificationToUser(admin.id, {
      title: 'New Team Member',
      body: `${newUserName} has joined your team`,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: `user-joined-${newUserId}`,
      data: {
        type: 'user_joined',
        url: '/admin/users',
      },
    });
  }
}
