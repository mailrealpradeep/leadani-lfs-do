# Dabluz CRM

## Overview

Dabluz CRM is a production-ready, multi-tenant spreadsheet-like CRM for lead management and collaboration across multiple companies. It offers Excel-like grid interfaces with customizable workspaces, dynamic company-wide column management, webhook integration for automated lead creation, comprehensive reporting, and chronological lead update tracking. Key features include three-tier role-based access control (Super Admin, Company Admin, Regular User), data isolation per company, audit logging, data export/import, and a mobile-responsive design. The system now includes a complete self-service signup flow that enables companies to register independently, with the first user becoming company admin who can then invite staff members via time-limited invite codes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

The application uses a monorepo structure with `client/` (React frontend), `server/` (Node.js Express backend), and `shared/` (TypeScript types and schemas). It supports distinct development and production environments.

### Frontend Architecture

The frontend is built with React and Vite. It uses Wouter for routing, `@tanstack/react-query` for server state management, and local/context state for UI. Shadcn UI, based on Radix UI and Tailwind CSS, provides components with theme support. Real-time updates are handled via Socket.io. The design is fully mobile-responsive, adapting layouts and interactions based on screen size, with specific considerations for touch targets and mobile dialogs. The desktop view utilizes CSS Grid for sticky headers and efficient horizontal scrolling, designed to prevent accidental lead detail opening during cell interaction.

### Backend Architecture

The backend is an Express.js application providing RESTful API endpoints. Authentication is JWT-based with bcrypt for password hashing, token-based sessions, and rate limiting. Data is stored in **PostgreSQL** using Drizzle ORM with the `PgStorage` implementation. The storage layer uses a common `IStorage` interface for flexibility. Socket.io manages real-time bidirectional communication, broadcasting CRUD events to relevant clients.

### Data Model

Core entities include Users, Companies, Invites, Sheets, SheetUsers, Leads (with fixed and custom fields), LeadUpdates (chronological tracking), DropdownOptions, CustomColumns, Audit logs, and WebhookLogs. The schema is defined using Drizzle ORM in `shared/schema.ts` with PostgreSQL table definitions. All tables use `varchar` UUID primary keys with `gen_random_uuid()` defaults. Lead custom fields are stored as JSON. Invites are single-use, time-limited (7 days) codes that enable staff onboarding.

### API Architecture

RESTful endpoints cover authentication, self-service signup, invite management, sheet management (CRUD for leads, columns, dropdowns, reports), lead updates, admin functions, audit logs, and webhooks for external lead creation. Public endpoints (`/api/public/*`) enable unauthenticated company signup and invite acceptance with rate limiting. Admin endpoints (`/api/admin/*`) provide invite creation and management for company admins. The request flow involves JWT validation, processing by route handlers, interaction with the storage layer, and Socket.io broadcasts for mutations. Centralized error handling is implemented.

### Security

Security features include JWT-based authentication and authorization with role-based and sheet-level permissions, HMAC signature validation for webhooks, Express Rate Limit for endpoint protection (especially on public signup/invite endpoints), and a comprehensive audit trail for all CRUD operations. The authentication system uses an `authenticate()` helper that synchronizes token state across localStorage, AuthProvider state, and React Query cache to ensure proper auth context for all subsequent requests.

### Real-time Synchronization

Socket.io enables real-time synchronization by allowing clients to join sheet-specific rooms. The server emits events (`lead_created`, `lead_updated`, `lead_deleted`, etc.) which trigger client-side React Query cache invalidation and refetching, supported by optimistic updates for immediate UI feedback.

### Lead Update Tracking

The system provides chronological tracking of lead updates, recording the method (WhatsApp/Phone Call), date, and remarks. UI components for recording and viewing updates are integrated into both desktop and mobile views, with real-time synchronization via Socket.io.

### Data Export/Import

The application supports exporting lead data to Excel (XLSX library) and CSV formats. The import system includes:
- Bulk lead import from Excel/CSV with intelligent column mapping
- Field-level validation with error/warning reporting
- Pre-validation for required columns
- **Dropdown field validation**: When importing dropdown fields, the system validates values against configured CRM dropdown options:
  - **Optional dropdown fields**: Invalid values generate warnings and are converted to empty/null. Warning format: "Field 'X': value 'Y' does not match CRM dropdown options. Valid options are: A, B, C. Value converted to empty."
  - **Required dropdown fields**: Invalid values generate errors and reject the row. Error format: "Field 'X': value 'Y' does not match CRM dropdown options. Valid options are: A, B, C. This field is required and cannot be empty."
- **Bulk lead update history import**: Users can include historical update records during import using a special "_lead_updates" column. The format is multi-line text with 3 lines per update: Method, Date, and Remark (remark can be blank). The parser features:
  - **Strict method validation**: Accepts only Call/Phone/WA/WhatsApp tokens (case-insensitive), rejects unknown methods with clear error messages
  - **Multi-format date parsing**: Supports DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, and YYYY-MM-DD (ISO) formats
  - **2-digit year normalization**: YY → 20YY for years 00-49, YY → 19YY for years 50-99
  - **Strict date validation**: Validates month (1-12) and day (1-31) bounds, rejects invalid calendar dates (e.g., Feb 30, Feb 31)
  - **Blank remark support**: Empty remark lines are preserved while maintaining 3-line grouping
  - **Comprehensive error reporting**: Position-specific error messages for debugging malformed blocks

### Design System

Styling uses Tailwind CSS with custom design tokens and supports light/dark themes. Shadcn UI provides accessible, customizable components following a compound pattern. The design is mobile-first with responsive layouts.

### Self-Service Signup System

The system supports complete self-service onboarding with the following flow:
1. **Landing Page**: Public landing page with "Get Started" call-to-action
2. **Company Signup**: Form to create new company + admin user (transactional creation ensures atomicity)
3. **Onboarding**: Post-signup flow for company setup (company admin only)
4. **Invite Management**: Admin console allows company admins to create time-limited (7-day) invite codes for staff
5. **Invite Acceptance**: Public page where invitees can create accounts using invite codes
6. **Staff Onboarding**: New staff members are automatically associated with the company and can access shared sheets

Authentication flows (signup, invite acceptance) use the `authenticate()` helper from AuthProvider to properly synchronize token, localStorage, and query cache state. Client-side form normalization (trimming, email lowercasing) prevents avoidable validation errors.

### Dashboard Architecture

The dashboard features a clean, full-width spreadsheet interface with controls consolidated in a sidebar. `DashboardContext` manages central state for `selectedSheetId`, `searchQuery`, `categoryFilter`, and action handlers. The sidebar provides sheet selection, lead actions (Add, Import, Manage Columns), filtering, search, and export options. The `SpreadsheetGrid` dynamically displays filtered data based on `DashboardContext` values, maintaining sticky headers and horizontal scrolling.

### Sheet Management

**Sheet Creation:**
- Company admins and super admins can create both personal and company-wide sheets
- Regular users can only create personal sheets (company sheet option not available)
- Personal sheets are only visible to the owner
- Company sheets are visible to all users in the company

**Sheet Deletion:**
- DELETE endpoint at `/api/sheets/:id` with role-based permission checks
- Permission rules:
  - **Personal sheets**: Only the sheet owner or super admin can delete
  - **Company sheets**: Sheet owner, company admin, or super admin can delete
- Frontend UI shows delete button only when user has permission
- Confirmation dialog with AlertDialog component prevents accidental deletion
- Uses soft delete (sets `deleted_at` timestamp)
- CASCADE deletes configured in schema automatically clean up related data (SheetUsers, Leads, LeadUpdates, etc.)
- Audit logging records all deletion events
- Real-time synchronization via Socket.io ensures deletion propagates to all connected clients

## External Dependencies

### Required Services

-   **Database**: PostgreSQL (Neon-backed) accessed via `DATABASE_URL` environment variable. All tables created using Drizzle ORM schema.

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

-   **Self-Service Signup**: Public endpoint `POST /api/public/signup` creates company + admin user atomically
-   **Invite System**: Public endpoints `GET /api/public/invites/:code` and `POST /api/public/invites/:code/accept` for staff onboarding
-   **Webhook API**: External systems can create leads via `POST /api/webhooks/leads` with HMAC signature
-   **Export Functionality**: Exports lead data to Excel or CSV
-   **Import Functionality**: Supports bulk import from Excel/CSV with intelligent column mapping. Google Sheets import is proposed but requires additional setup (Replit connector or manual API credentials)