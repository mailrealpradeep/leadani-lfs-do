# Dabluz CRM

## Overview

Dabluz CRM is a multi-tenant, spreadsheet-like CRM designed for lead management and collaboration across multiple companies. It features an Excel-like grid interface, customizable workspaces, dynamic column management, webhook integration for automated lead creation, comprehensive reporting, and chronological lead update tracking. The system includes three-tier role-based access control (Super Admin, Company Admin, Regular User), data isolation per company, audit logging, data export/import, and a mobile-responsive design. A self-service signup flow allows companies to register independently, with the first user becoming a company admin who can then invite staff via time-limited codes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

The application utilizes a monorepo structure comprising `client/` (React frontend), `server/` (Node.js Express backend), and `shared/` (TypeScript types and schemas), supporting distinct development and production environments.

### Frontend Architecture

Built with React and Vite, the frontend uses Wouter for routing, `@tanstack/react-query` for server state, and local/context state for UI. Shadcn UI, based on Radix UI and Tailwind CSS, provides themed components. Real-time updates are managed via Socket.io. The design is fully mobile-responsive, adapting layouts and interactions for various screen sizes, with specific considerations for touch targets and mobile dialogs. Desktop views leverage CSS Grid for sticky headers and efficient horizontal scrolling.

### Backend Architecture

The backend is an Express.js application offering RESTful API endpoints. Authentication is JWT-based with bcrypt for password hashing, token-based sessions, and rate limiting. Data is persisted in PostgreSQL using Drizzle ORM with a flexible `IStorage` interface. Socket.io facilitates real-time bidirectional communication, broadcasting CRUD events.

### Data Model

Core entities include Users, Companies, Invites, Sheets, SheetUsers, Leads (with fixed and custom fields), LeadUpdates (chronological tracking), DropdownOptions, CustomColumns, Audit logs, and WebhookLogs. The schema is defined in `shared/schema.ts` using Drizzle ORM for PostgreSQL. All tables use `varchar` UUID primary keys, and lead custom fields are stored as JSON. Invites are single-use, time-limited codes for staff onboarding.

### API Architecture

RESTful endpoints manage authentication, self-service signup, invite management, sheet operations (CRUD for leads, columns, dropdowns, reports), lead updates, admin functions, audit logs, and webhooks for external lead creation. Public endpoints (`/api/public/*`) handle unauthenticated company signup and invite acceptance with rate limiting, while admin endpoints (`/api/admin/*`) manage invite creation. The request flow involves JWT validation, route handling, storage interaction, and Socket.io broadcasts. Centralized error handling is implemented.

### Security

Security features include JWT-based authentication and authorization with role-based and sheet-level permissions, HMAC signature validation for webhooks, Express Rate Limit for endpoint protection (especially on public signup/invite endpoints), and a comprehensive audit trail for all CRUD operations. Authentication synchronizes token state across localStorage, AuthProvider, and React Query cache.

### Real-time Synchronization

Socket.io enables real-time synchronization by allowing clients to join sheet-specific rooms. The server emits events (e.g., `lead_created`, `lead_updated`) that trigger client-side React Query cache invalidation and refetching, supported by optimistic updates for immediate UI feedback.

### Lead Update Tracking

The system provides chronological tracking of lead updates, recording method (WhatsApp/Phone Call), date, and remarks, with user attribution. UI components for recording and viewing updates are integrated into both desktop and mobile views, with real-time synchronization via Socket.io. Only admin users can delete lead updates.

### Data Export/Import

The application supports exporting lead data to Excel (XLSX) and CSV formats. The import system handles bulk lead import from Excel/CSV with intelligent column mapping, field-level validation, pre-validation for required columns, and dropdown field validation. Date fields support multiple formats (ISO, DD/MM/YYYY, DD-MM-YYYY, DD-Mon-YYYY, Excel serial dates). Bulk lead update history can be imported via a special "_lead_updates" column, with strict method and date validation, 2-digit year normalization, and comprehensive error reporting.

### Design System

Styling uses Tailwind CSS with custom design tokens, supporting light/dark themes. Shadcn UI provides accessible, customizable components following a compound pattern. The design prioritizes a mobile-first approach with responsive layouts.

### Self-Service Signup System

The system provides a complete self-service onboarding flow:
1.  **Landing Page**: Public "Get Started" call-to-action.
2.  **Company Signup**: Transactional creation of new company and admin user.
3.  **Onboarding**: Post-signup setup for company admin.
4.  **Invite Management**: Admins create time-limited (7-day) invite codes for staff.
5.  **Invite Acceptance**: Public page for invitees to create accounts.
6.  **Staff Onboarding**: New staff are automatically associated with the company and gain sheet access.
Authentication flows (signup, invite acceptance) use the `authenticate()` helper for token synchronization. Client-side form normalization prevents validation errors.

### Dashboard Architecture

The dashboard features a full-width spreadsheet interface with controls consolidated in a sidebar. `DashboardContext` manages central state for `selectedSheetId`, `searchQuery`, `categoryFilter`, and action handlers. The sidebar offers sheet selection, lead actions, filtering, search, and export options. The `SpreadsheetGrid` dynamically displays filtered data with sticky headers and horizontal scrolling.

### Sheet Management

Company and super admins can create personal and company-wide sheets, while regular users are limited to personal sheets. Deletion of sheets is soft (sets `deleted_at`) and cascade deletes related data. Permissions for sheet deletion are role-based (owner/admin/super admin). Lead deletion is restricted to company admins and super admins to protect critical data. All deletions are audit logged and synchronized in real-time via Socket.io.

### Webhook Integration System

A comprehensive webhook system allows external systems to automatically create leads in the CRM via HTTP POST requests, eliminating manual data entry.

**Database Schema:** Stores webhook configurations (`company_webhooks`), field mappings (`webhook_field_mappings`), allocation rules (`webhook_allocation_rules`), and request logs (`webhook_requests`).

**API Endpoints:**
*Admin Endpoints* (`/api/admin/company/webhooks*`): CRUD operations for webhooks, management of mappings and rules, and access to request logs (company_admin role required).
*Public Endpoint* (`POST /api/public/webhooks/:token`): Ingests webhook data, validates token, applies field mappings, uses percentage-based round-robin allocation, creates leads, and logs requests. It is rate-limited.

**Field Mapping:** Transforms incoming JSON payloads to CRM lead structures, mapping to fixed and custom fields, and preserving unmapped fields in the `meta` JSON column.

**Allocation Logic:** Supports conditional two-tier allocation:
- **Tier 1 (Team/Condition-based)**: Routes leads to sheet groups based on webhook field values (e.g., language="Telugu" → Telugu executives' sheets)
- **Tier 2 (Executive/Percentage-based)**: Within matching sheets, distributes using percentage-based round-robin
- **Operators**: Supports "equals", "contains", and "starts_with" for flexible matching
- **Fallback**: Default rules handle unmatched leads when no conditions apply
- **Validation**: 
  - Frontend and backend validation ensure each condition group totals exactly 100%
  - Incomplete non-default rules (missing condition fields) are rejected
  - UI displays per-condition breakdowns with visual feedback (green checkmarks for valid, red alerts for invalid)
  - Clear error messages show unallocated/over-allocated percentages per group

**Lead Attribution:** Webhook-created leads are attributed to the webhook's `created_by_user_id` for proper permissions and audit trails.

**UI Features:** Webhook management page for admins to create/delete, toggle active status, configure field mappings and allocation rules, and view request logs. Includes real-time validation.

**Security:** Webhook tokens are uniquely generated and hashed. The public endpoint is rate-limited, and comprehensive logging is in place. Express trust proxy is enabled in `server/app.ts` to ensure rate limiting works correctly behind Replit's proxy.

**Recent Updates (November 22, 2025):**
- Added per-condition percentage validation with visual breakdown in UI (green ✓ for valid groups, red ✗ for invalid, yellow ⚠ for incomplete)
- Fixed Express rate-limit X-Forwarded-For header issue by enabling `app.set('trust proxy', true)`
- Backend validation mirrors frontend to prevent API bypasses
- **RESOLVED:** Fixed webhook conditional allocation bug where default rules were incorrectly matching alongside conditional rules, causing "200% allocation" errors. Default rules now only activate as fallback when no conditional rules match, ensuring proper two-tier allocation (conditional → default fallback).

## External Dependencies

### Required Services

-   **Database**: PostgreSQL (Neon-backed) via `DATABASE_URL` environment variable, with tables defined by Drizzle ORM.

### Third-Party Libraries

-   **Frontend**: React Query, Socket.io Client, Wouter, Radix UI, Tailwind CSS, date-fns, XLSX.
-   **Backend**: Express, Socket.io, bcryptjs, jsonwebtoken, Express Rate Limit, XLSX.
-   **Development**: Vite, TypeScript, Drizzle Kit.

### Environment Variables

-   `DATABASE_URL` (for PostgreSQL)
-   `JWT_SECRET`
-   `HMAC_SECRET`
-   `NODE_ENV`
-   `PORT`
-   `FRONTEND_URL`

### Integration Points

-   **Self-Service Signup**: `POST /api/public/signup` for company and admin user creation.
-   **Invite System**: `GET /api/public/invites/:code` and `POST /api/public/invites/:code/accept` for staff onboarding.
-   **Webhook API**: External systems integrate via `POST /api/public/webhooks/:token` with HMAC signature.
-   **Export Functionality**: Exports lead data to Excel or CSV.
-   **Import Functionality**: Bulk import from Excel/CSV with intelligent column mapping.