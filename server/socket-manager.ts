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
