# LeadAni LFS

## Overview

LeadAni LFS is a multi-tenant, spreadsheet-like lead management system designed for efficient lead management and team collaboration. It offers an intuitive Excel-like grid interface, customizable workspaces, dynamic column management, and automated lead creation via webhooks. Key capabilities include comprehensive reporting with drill-down functionality, chronological lead update tracking, robust three-tier role-based access control, data isolation per company, and audit logging. The system supports self-service company signup with admin invitation flows, an attendance system, and is fully mobile-responsive. The business vision is to provide a powerful, user-friendly CRM to enhance lead management efficiency and collaboration for businesses of all sizes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

The project is a monorepo consisting of a React/Vite frontend, a Node.js/Express backend, and shared TypeScript types/schemas.

### Frontend Architecture

The frontend uses React with Vite, Wouter for routing, `@tanstack/react-query` for server state management, and Shadcn UI (Radix UI + Tailwind CSS) for themed, mobile-responsive components. Real-time updates are handled by Socket.io.

### Backend Architecture

The backend is an Express.js application providing RESTful APIs. It uses JWT for authentication, bcrypt for hashing, and Drizzle ORM with PostgreSQL for data persistence. Socket.io enables real-time bidirectional communication and UI synchronization.

### Data Model

Core entities include Users, Companies, Sheets, Leads (with fixed and custom JSON fields), LeadUpdates, DropdownOptions, CustomColumns, Audit logs, and WebhookLogs. All tables use UUIDs, and leads support soft deletion.

### Key Features

*   **Lead Management**: Features include chronological lead update tracking, Excel/CSV import/export with intelligent column mapping, field validation, bulk lead transfer, soft-delete with recovery, and Lead Thought marking (Sure/May Be) with visual highlighting.
*   **Real-time Synchronization**: Socket.io facilitates real-time data updates across clients.
*   **Role-Based Access Control**: Three-tier system (Super Admin, Company Admin, User) with sheet-level permissions and audit logging.
*   **Dynamic UI**: Customizable grid interface with dynamic column management, conditional validation, and "Next Follow-up Date Time" (NFDT) highlighting.
*   **Highlighting Rules Engine**: Conditional row highlighting based on multi-condition rules with AND/OR logic, supporting 12 color variants (yellow, orange, red, green, blue, purple, pink, dark_red, light_green, dark_green, light_blue, dark_blue). Features include sheet-specific rules and global rules (apply to all sheets), with real-time synchronization across clients.
*   **Mobile Experience**: Mobile-first design with specific layouts, configurable mobile lead cards, mobile lead editing, and mobile sort & filter functionalities.
*   **Reporting & Analytics**: Comprehensive Reports section with a dynamic Report Builder, multi-sheet lead selection for admins, and a dedicated Team Performance section with drill-down capabilities.
*   **Webhooks**: Integration for external systems to create leads via HTTP POST requests, including configurable field mapping and conditional allocation logic with multi-condition support (AND/OR logic between conditions).
*   **Self-Service Onboarding**: Multi-step flow for company registration, admin setup, and user invitations.
*   **Attendance System**: Mobile-first PWA for daily entry/exit tracking with configurable exit rules (e.g., minimum leads/hours/updates, NFDT compliance), force exit requests with admin review, and attendance history.
*   **Mandatory System Columns**: Protected "Full Name" and "Mobile No" columns with enforced configurations.
*   **Target Management System (TMS)**: Comprehensive performance tracking with multi-goal targets (count, sum, average, percentage, updates, conversion, compliance), flexible assignment (single/multiple/all users), scope options (sheet-specific/company-wide/multiple sheets), time types (one-time/recurring), leaderboard rankings with time period filters (daily/weekly/monthly/all-time), and user progress views with achievement tracking.
*   **User Row Filters (Hide/Show Rows)**: Per-user row filtering system that persists to database. Users can create named filters with multiple conditions (text, number, date operators) and AND/OR logic. Active filters hide matching rows from view. Accessible via sidebar "Hide/Show Rows" button. Features include filter creation/edit/delete, toggle activation, and active filter count display.
*   **Point-in-Time Sheet Recovery (Snapshots)**: SuperAdmin-only data recovery system with automatic hourly snapshots and 30-day retention. Features include:
    - Smart change detection using SHA-256 hashes to skip unchanged sheets
    - Bulk lead update fetching for scalability (handles 100k leads)
    - Compressed JSONB storage of leads and update history
    - Data Recovery UI in Super Admin Console with hierarchical browsing (Company → Sheet → Date → Time)
    - Restore preview showing impact analysis (leads to restore/remove/update)
    - Full restoration with audit logging and real-time Socket.io notifications
    - Located at: Super Admin Console > Recovery tab

### Security

JWT-based authentication with role and sheet-level permissions, HMAC signature validation for webhooks, Express Rate Limit, password-protected sheet deletion, and comprehensive audit trails.

## External Dependencies

### Required Services

*   **Database**: PostgreSQL (Neon-backed) via Drizzle ORM.

### Third-Party Libraries

*   **Frontend**: React Query, Socket.io Client, Wouter, Radix UI, Tailwind CSS, date-fns, XLSX.
*   **Backend**: Express, Socket.io, bcryptjs, jsonwebtoken, Express Rate Limit, XLSX.

### Integration Points

*   **Authentication & Onboarding**: Public APIs for signup, invites, and invite acceptance.
*   **Webhook API**: Public endpoint for external lead creation.
*   **Data Operations**: Export and Import functionalities for lead data.

## Future Improvements (Saved for Later)

These ideas are documented in the Super Admin Console > Future tab:

### 1. WhatsApp / Instagram Lead Chat Integration
Bidirectional messaging through existing BSP:
- Inbound: Client WhatsApp/IG → BSP Webhook → LFS Lead Chat (match phone to lead)
- Outbound: Team reply in Lead Chat → Outgoing Webhook → BSP → Client WhatsApp/IG
- Estimated effort: 1-2 weeks
- Cost: Uses existing BSP subscription

### 2. AI Coach for Tele Caller
Personalized motivational avatar that speaks to users based on lead performance:
- Generate personalized messages from lead data (e.g., "Ankita, aapki lead to admission ratio kam hai...")
- Use TTS (ElevenLabs/Azure) for Hindi voice generation (~$5-20/month)
- Display animated avatar (Lottie/CSS) with simple movements while audio plays
- Trigger on login, daily briefing, or low performance alerts
- Estimated effort: 2-3 days