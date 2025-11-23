# Dabluz CRM

## Overview

Dabluz CRM is a multi-tenant, spreadsheet-like CRM designed for lead management and collaboration across multiple companies. It features an Excel-like grid interface, customizable workspaces, dynamic column management, webhook integration for automated lead creation, comprehensive reporting, and chronological lead update tracking. The system includes three-tier role-based access control, data isolation per company, audit logging, data export/import, and a mobile-responsive design. A self-service signup flow allows companies to register independently, with the first user becoming a company admin who can then invite staff via time-limited codes. The business vision is to provide an intuitive and powerful CRM solution for businesses of all sizes, enhancing lead management efficiency and team collaboration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

The application uses a monorepo with a React/Vite frontend (`client/`), a Node.js/Express backend (`server/`), and shared TypeScript types/schemas (`shared/`).

### Frontend Architecture

Built with React and Vite, the frontend uses Wouter for routing, `@tanstack/react-query` for server state, and Shadcn UI (Radix UI + Tailwind CSS) for themed components. Real-time updates are handled via Socket.io. The design is mobile-responsive, with specific layouts for mobile and desktop (CSS Grid for sticky headers and horizontal scrolling).

### Backend Architecture

The Express.js backend provides RESTful API endpoints. Authentication is JWT-based with bcrypt for password hashing, token-based sessions, and rate limiting. Data is stored in PostgreSQL using Drizzle ORM. Socket.io facilitates real-time bidirectional communication for CRUD events.

### Data Model

Core entities include Users, Companies, Invites, Sheets, SheetUsers, Leads (fixed and custom fields), LeadUpdates, DropdownOptions, CustomColumns, Audit logs, and WebhookLogs. All tables use UUIDs, and lead custom fields are stored as JSON. Leads support a soft-delete mechanism with a 30-day retention period, recoverable by admins.

### API and Security

RESTful APIs manage authentication, signup, invites, sheet operations, lead updates, and webhooks. Security features include JWT-based authentication with role and sheet-level permissions, HMAC signature validation for webhooks, Express Rate Limit for public endpoints, and comprehensive audit trails. Public endpoints are rate-limited and handle unauthenticated signup and invite acceptance.

### Real-time Synchronization

Socket.io enables real-time synchronization by allowing clients to join sheet-specific rooms. The server emits events for data changes (e.g., `lead_created`, `lead_updated`) to trigger client-side React Query cache invalidation and refetching, supporting optimistic UI updates.

### Lead Management Features

The system includes chronological tracking of lead updates (method, date, remarks, user attribution). It supports exporting lead data to Excel/CSV and importing leads from Excel/CSV with intelligent column mapping, field-level validation, and handling of various date formats. Bulk lead transfer between sheets is supported with permission checks, company isolation, audit logging, and real-time updates.

**Soft Delete and Recovery**: Leads support soft deletion with a 30-day retention period. Company admins and super admins can delete leads (which sets `deleted_at` timestamp and `deleted_by_user_id`), view deleted leads through a dedicated UI in the dashboard sidebar, and restore them within 30 days. A scheduled cleanup job runs daily on server startup and every 24 hours thereafter to permanently remove leads deleted more than 30 days ago. All lead queries automatically exclude soft-deleted records. Real-time Socket.io events synchronize deletions and restorations across connected clients.

**Conditional Validation Rules**: The system supports creating conditional validation rules that make certain fields required when trigger conditions are met. Rules are company-scoped with optional sheet-level specificity. When a lead matches a rule's trigger condition (e.g., status equals "Hot"), specified fields become required. Invalid leads are highlighted in red in the spreadsheet grid. During import, validation is non-blocking - all leads are imported but validation warnings are logged for invalid entries. Company admins can manage validation rules via the sidebar UI, creating rules with trigger columns, operators (equals, in, not_equals, not_in), trigger values, and required field lists. The validator evaluates both fixed and custom fields.

### Design System

Styling uses Tailwind CSS with custom design tokens, supporting light/dark themes. Shadcn UI provides accessible, customizable components, prioritizing a mobile-first approach.

### Self-Service Signup System

A comprehensive onboarding flow includes:
1.  **Landing Page**: Public "Get Started" call-to-action.
2.  **Company Signup**: Transactional creation of new company and admin user.
3.  **Onboarding**: Post-signup setup for company admin.
4.  **Invite Management**: Admins create time-limited invite codes for staff.
5.  **Invite Acceptance**: Public page for invitees to create accounts.
6.  **Staff Onboarding**: New staff are automatically associated with the company and gain sheet access.

### Dashboard Architecture

The dashboard features a full-width spreadsheet interface with controls in a sidebar. A central `DashboardContext` manages state for sheet selection, search, filtering, and actions. The `SpreadsheetGrid` dynamically displays filtered data with sticky headers and horizontal scrolling.

**Quick Filter Integration**: Quick filter buttons are displayed in the main application header (next to the sidebar toggle) to save vertical space. The filter logic is managed through `DashboardContext` with handlers registered from `SpreadsheetGrid` using `useCallback` to prevent stale closures. The system provides 7 pre-configured filters: Lead Type, Visit Today, Follow Up Today, Not Attended, Today's Leads, Visit Tomorrow, and Clear All. Filters only activate when target columns exist, providing user feedback via toast notifications when columns are missing. The header conditionally renders the quick filter bar only when on the dashboard route with a selected sheet.

### Webhook Integration System

External systems can create leads via HTTP POST requests using a comprehensive webhook system.
-   **Database Schema**: Stores webhook configurations, field mappings, allocation rules, and request logs.
-   **API Endpoints**: Admin endpoints for CRUD operations and a public endpoint (`POST /api/public/webhooks/:token`) for lead ingestion.
-   **Field Mapping**: Transforms incoming JSON payloads to CRM lead structures, mapping to fixed and custom fields.
-   **Allocation Logic**: Supports conditional two-tier allocation (team/condition-based then percentage-based round-robin) with operators like "equals," "contains," and "starts_with." Includes percentage validation and fallback rules.
-   **Lead Attribution**: Webhook-created leads are attributed to the webhook's `created_by_user_id`.
-   **Security**: Unique, hashed webhook tokens and rate-limited public endpoint.

### Reports Section

The Reports Section provides comprehensive data visualization and analytics capabilities with permission-based access control and a dynamic Report Builder for custom analytics.

**Database Schema**: Reports table stores custom reports with company_id, name, report_type, sheet_ids array, and config JSON. The config includes `x_axis` (column to group by), `y_axis` (aggregation type: count/sum/avg), `y_axis_field` (field to aggregate for sum/avg), and `chart_type` (bar/line/pie).

**Report Types**: 
1. **Pre-built Reports** - Seven predefined report types: Lead Status Distribution, Leads Over Time, Lead Source Analysis, Conversion Rate, User Performance, Lead Age Distribution, Custom Field Analysis
2. **Custom Dynamic Reports** - User-defined reports created via the Report Builder with:
   - X-axis selector: Choose any column (fixed or custom) to group data by
   - Y-axis aggregation: Count, Sum, or Average
   - Y-axis field: Select numeric field to aggregate (for sum/avg)
   - Chart type selector: Bar, Line, or Pie charts
   - Multi-sheet support: Aggregate data across multiple sheets

**Authorization Model**:
-   **Company Admins**: Can create, view, and delete all reports in their company; see all company sheets when creating reports
-   **Regular Users**: Can view reports for sheets they have access to; cannot create or delete reports
-   **Sheet Visibility**: `/api/sheets` endpoint returns all company sheets for admins, only accessible sheets for regular users
-   **Field Access**: Custom reports validate that users can only access authorized columns based on their sheet permissions

**API Endpoints**:
-   `GET /api/company/reports` - Fetch all accessible reports (filtered by user permissions)
-   `POST /api/company/reports` - Create new report (admin only, validates sheet ownership, access, and custom report config)
-   `PATCH /api/company/reports/:id` - Update existing report (admin only, validates all fields and normalizes config)
-   `GET /api/company/reports/:id/data` - Fetch report with generated visualizations and metadata
-   `DELETE /api/company/reports/:id` - Delete report (admin only)

**Data Aggregation**: The `generateDynamicReport()` function handles custom reports by grouping leads by the selected X-axis column and aggregating using the specified Y-axis method (count, sum, average). All queries automatically exclude soft-deleted leads (WHERE deleted_at IS NULL).

**Backend Validation**: Custom reports are validated at creation:
- Required fields: `x_axis`, `y_axis`, `chart_type`
- Conditional validation: `y_axis_field` required for sum/avg aggregations
- Enum validation: `y_axis` must be count/sum/avg; `chart_type` must be bar/line/pie

**Frontend**: Reports page (`/reports`) features a card-based grid layout displaying all reports as individual cards. Each card shows the report name, lead count, and visualization (Recharts bar/line/pie charts). The Report Builder dialog provides intuitive selectors for X-axis (all available columns), Y-axis (aggregation method), Y-axis field (for sum/avg), chart type, and multi-sheet checkbox selection.

**Report Editing**: Company admins can edit existing reports via an Edit button (pencil icon) on each report card. The Report Builder dialog supports both create and edit modes, pre-populating all fields when editing. The implementation includes:
-   **State Management**: `resetBuilder()` clears all state before loading edit values to prevent stale data when switching between chart and pivot table reports
-   **Enhanced Validation**: Required field validation enforces `y_axis_field` for chart sum/avg aggregations and `value_field` for pivot sum/avg aggregations
-   **Config Normalization**: Only includes necessary fields in the config payload (e.g., omits `column_field` if empty, `y_axis_field` for count aggregations)
-   **Dual Mode Dialog**: Title and button text change based on mode ("Build Custom Report" / "Create Report" vs "Edit Report" / "Update Report")

**Real-time Support**: Report cards automatically fetch and render data using React Query. Empty states guide users when no reports exist, with a prominent "Create Report" call-to-action.

## External Dependencies

### Required Services

-   **Database**: PostgreSQL (Neon-backed) via `DATABASE_URL` using Drizzle ORM.

### Third-Party Libraries

-   **Frontend**: React Query, Socket.io Client, Wouter, Radix UI, Tailwind CSS, date-fns, XLSX.
-   **Backend**: Express, Socket.io, bcryptjs, jsonwebtoken, Express Rate Limit, XLSX.
-   **Development**: Vite, TypeScript, Drizzle Kit.

### Environment Variables

-   `DATABASE_URL`
-   `JWT_SECRET`
-   `HMAC_SECRET`
-   `NODE_ENV`
-   `PORT`
-   `FRONTEND_URL`

### Integration Points

-   **Self-Service Signup**: `POST /api/public/signup`
-   **Invite System**: `GET /api/public/invites/:code`, `POST /api/public/invites/:code/accept`
-   **Webhook API**: External systems integrate via `POST /api/public/webhooks/:token`
-   **Export Functionality**: Exports lead data to Excel or CSV.
-   **Import Functionality**: Bulk import from Excel/CSV.