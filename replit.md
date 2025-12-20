# Leadani LFS

## Overview

Leadani LFS is a multi-tenant, spreadsheet-like lead management system designed to enhance lead management efficiency and collaboration for businesses. It provides an intuitive Excel-like grid interface, customizable workspaces, dynamic column management, and automated lead creation via webhooks. Key capabilities include comprehensive reporting, chronological lead update tracking, robust three-tier role-based access control, data isolation per company, and audit logging. The system supports self-service company signup, an attendance system, and is fully mobile-responsive, aiming to be a powerful and user-friendly CRM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

The project is a monorepo comprising a React/Vite frontend, a Node.js/Express backend, and shared TypeScript types/schemas.

### Frontend Architecture

The frontend utilizes React with Vite, Wouter for routing, `@tanstack/react-query` for server state management, and Shadcn UI (Radix UI + Tailwind CSS) for themed, mobile-responsive components. Real-time updates are facilitated by Socket.io.

### Backend Architecture

The backend is an Express.js application offering RESTful APIs. It employs JWT for authentication, bcrypt for hashing, and Drizzle ORM with PostgreSQL for data persistence. Socket.io enables real-time bidirectional communication and UI synchronization.

### Data Model

Core entities include Users, Companies, Sheets, Leads (with fixed and custom JSON fields), LeadUpdates, DropdownOptions, CustomColumns, Audit logs, and WebhookLogs. All tables use UUIDs, and leads support soft deletion.

### UI/UX Decisions

The system features a customizable grid interface with dynamic column management, conditional validation, and "Next Follow-up Date Time" (NFDT) highlighting. It includes a robust highlighting rules engine for conditional row highlighting based on multi-condition logic. The design is mobile-first, offering specific layouts, configurable mobile lead cards, and mobile sorting/filtering.

**Editing Row Persistence**: When a user starts editing a row (indicated by blue border highlight), that row remains visible even if the edited values would cause it to be filtered out. For example, if filtering by "Lead Status = Talked" and the user changes a lead's status to "Visit Scheduled", the row stays visible until the user clicks another row or the sheet reloads. This is achieved through a cached lead mechanism that re-injects the editing row into filtered results.

### Key Features

*   **Lead Management**: Includes chronological lead update tracking, Excel/CSV import/export, bulk lead transfer, soft-delete, and duplicate lead prevention across all entry points (Add Lead, Bulk Import, Webhooks, Push to CRM).
*   **Real-time Synchronization**: Socket.io ensures real-time data updates across clients.
*   **Role-Based Access Control**: A three-tier system (Super Admin, Company Admin, User) with sheet-level permissions.
*   **Company Timezone Configuration**: Each company can configure its timezone for consistent date/time display and processing across the application.
*   **Webhooks**: Integration for external systems to create leads with configurable field mapping, conditional allocation logic, multi-sheet allocation with weighted round-robin distribution, and update-only flows.
*   **Self-Service Onboarding**: Multi-step flow for company registration and user invitations.
*   **Attendance System**: Mobile-first PWA for daily entry/exit tracking with configurable rules.
*   **Target Management System (TMS)**: Comprehensive performance tracking with multi-goal targets, flexible assignment, leaderboard rankings, and user progress views.
*   **User Row Filters**: Per-user row filtering that persists to the database, allowing creation of named filters with multiple conditions.
*   **Google Sheets Backup System**: Automatic hourly backup of lead data to Google Sheets, with per-sheet configuration and sync logs.
*   **Point-in-Time Sheet Recovery (Snapshots)**: SuperAdmin-only system with automatic hourly snapshots, smart change detection, compressed JSONB storage, and a recovery UI with restore preview.
*   **Data Management (Admin Console)**: Company Admin tools for bulk operations like clearing past data and bulk transferring leads with weighted distribution.
*   **Visit Schedules**: Calendar-based view for tracking scheduled site visits. Features include:
    - Configurable date column and status column linking (via Site Visit Settings)
    - Customizable card display columns (card_columns) with drag-drop reordering
    - Default fallback columns: `['requirement', 'project_location']` when not configured
    - Always-visible card elements: Lead name/phone, sheet badge, visit type badge, Next Follow-up (if present), Last Update with follow-up miss warning (red highlight if no update day before visit)
    - getFieldValue helper resolves enriched fields (lead_status, owner_name, sheet_name, next_followup_date) before falling back to custom_fields
*   **Visited Calendar**: Calendar-based view for tracking completed site visits (separate from Visit Schedules). Features include:
    - Independent configuration via Site Visited Settings (site_visited_config)
    - Customizable card display columns with drag-drop reordering
    - Default fallback columns: `['requirement', 'project_location', 'visit_type']` when not configured
    - Always-visible card elements: Lead name/phone, sheet badge, status badge, Next Follow-up (if present), Last Update section
    - Backend enrichment reads lead_status/next_followup_date from custom_fields
*   **Hot Leads**: Company-wide feature to identify and prioritize high-value leads based on configurable conditions, displayed in a unified view with real-time updates and a sidebar badge.
*   **Custom Views**: Configurable sidebar menu items that display filtered leads based on group-based conditions. Supports AND logic within condition groups and OR logic between groups (e.g., "(A AND B) OR C OR D"). Features include customizable icons from lucide-react, icon colors, optional badge counts showing matching lead counts, sheet scope selection (All Sheets or Selected Sheets), and a dedicated view page with SpreadsheetGrid integration.
*   **Validation Rules**: Configurable rules that prompt users to update related fields when specific conditions are met during lead editing. Supports multi-condition logic with AND/OR operators, a beautiful mobile-responsive dialog for field updates, and server-side enforcement for imports/webhooks/API calls.
*   **Add Lead Form Configuration**: Company Admins can configure which fields appear when adding a new lead, mark them as Required or Optional, and reorder them via drag-drop. Full Name and Mobile No are always required and cannot be removed. Falls back to showing all columns if not configured.
*   **Auto-Fill Rules**: Company Admins can configure rules that automatically populate target fields when trigger conditions are met. For example, when "Lead Status" changes to "Visit Scheduled", automatically set "Visit Status" to "Scheduled". Rules support priority ordering (higher priority rules apply first), enable/disable toggles, and work across all lead editing contexts (Add Lead dialog, Lead Update dialog, and spreadsheet grid inline editing). Uses `useAutoFillRules` hook for consistent client-side rule evaluation.
*   **Watchlist**: Personal lead watchlist for users to track important leads that need attention. Leads can be added/removed via eye icon toggle. Watchlist page displays all tracked leads sorted by next follow-up date with real-time updates via Socket.io.
*   **PowerScore**: Gamified leaderboard system with animated score counters, period-based views (Today/Yesterday/This Week/This Month/All Time), and personal stats comparison. Features include:
    - Config-driven scoring rules (action_type, points, daily_cap, requires_approval) with 3-step wizard UI
    - Scoring engine (`server/powerscore-service.ts`) that awards points for: login, lead_update, dropdown_change
    - Daily cap enforcement counting both approved transactions and pending approvals
    - Idempotency guards preventing duplicate pending approvals per rule per day
    - Admin approval workflow for high-value actions (Visit/Converted)
    - Milestone bonuses with badge rewards
    - Login bonuses with streak tracking (once per day per user)
    - Admin appreciation system with custom messages
    - Stock-ticker animated counters using framer-motion
    - ChampionCard (#1), PodiumCard (#2-3), ContenderGrid (#4+) component hierarchy
    - Personal stats with today vs yesterday and week vs week percentage comparisons
    - Backfill script (`server/powerscore-backfill.ts`) to retroactively award points from historical lead updates. Usage: `npx tsx server/powerscore-backfill.ts <company_id>`. Detects existing backfill data and prevents duplicate runs (use `--force` to override).
*   **PowerFlow (Pipeline Analytics)**: Visual funnel analytics showing lead progression through configurable pipeline stages. Features include:
    - Company-configurable pipeline stages stored in `powerflow_configs` table (column_key, column_values, display order, colors)
    - Automatic stage counting using existing `activity_logs` data (zero new data collection required)
    - Conversion rate calculations between consecutive stages
    - Period-based filtering (today, yesterday, this_week, this_month, last_month, last_30_days)
    - Sheet-level access control respecting user permissions
    - **Backward Simulation Calculator**: Input target conversions (e.g., "I want 10 conversions") and calculate required leads/visits/schedules based on historical conversion rates
    - Timezone-aware date boundaries using `toZonedTime`/`fromZonedTime` with date-fns for accurate analytics across all company timezones

### Security

JWT-based authentication with role and sheet-level permissions, HMAC signature validation for webhooks, Express Rate Limit, password-protected sheet deletion, and comprehensive audit trails, including user deletion with audit preservation.

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