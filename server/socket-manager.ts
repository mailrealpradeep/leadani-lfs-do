import type { Server as SocketIOServer } from "socket.io";

let ioInstance: SocketIOServer | null = null;

export function setSocketIO(io: SocketIOServer) {
  ioInstance = io;
}

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

export interface PointsCelebrationEvent {
  userId: string;
  userName: string;
  points: number;
  ruleName: string;
  actionType: string;
  showAnimationTo: "user_only" | "all_users" | "admins_only" | "none";
  companyId: string;
  timestamp: number;
}

export interface AIRatingUpdateEvent {
  leadId: string;
  sheetId: string;
  companyId: string;
  rating: string;
  score: number | null;
  summary: string | null;
  details: any;
  updatedAt: Date | null;
}

export function emitAIRatingUpdate(event: AIRatingUpdateEvent) {
  const io = getSocketIO();
  if (!io) return;

  // Emit to all users viewing this sheet
  io.to(`sheet:${event.sheetId}`).emit("ai_rating_updated", {
    leadId: event.leadId,
    rating: event.rating,
    score: event.score,
    summary: event.summary,
    details: event.details,
    updatedAt: event.updatedAt,
  });
}

export function emitPointsCelebration(event: PointsCelebrationEvent) {
  const io = getSocketIO();
  if (!io || event.showAnimationTo === "none") return;

  const payload = {
    userId: event.userId,
    userName: event.userName,
    points: event.points,
    ruleName: event.ruleName,
    timestamp: event.timestamp,
  };

  switch (event.showAnimationTo) {
    case "user_only":
      // Emit only to the specific user
      io.to(`user:${event.userId}`).emit("points_celebration", {
        ...payload,
        isCompanyWide: false,
      });
      break;
    case "all_users":
      // Emit to all users in the company
      io.to(`company:${event.companyId}`).emit("points_celebration", {
        ...payload,
        isCompanyWide: true,
      });
      break;
    case "admins_only":
      // Emit to company admin room
      io.to(`company_admins:${event.companyId}`).emit("points_celebration", {
        ...payload,
        isCompanyWide: false,
      });
      break;
  }
}

export interface AIRatingJobProgressEvent {
  jobId: string;
  companyId: string;
  status: string;
  totalLeads: number;
  processedLeads: number;
  successfulRatings: number;
  failedRatings: number;
  currentBatch: number;
  message: string;
  percentComplete: number;
}

export function emitAIRatingJobProgress(event: AIRatingJobProgressEvent) {
  const io = getSocketIO();
  if (!io) return;

  io.to(`company:${event.companyId}`).emit("ai_rating_job_progress", event);
}
