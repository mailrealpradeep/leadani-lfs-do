# Dabluz CRM

## Overview

Dabluz CRM is a multi-tenant, spreadsheet-like CRM designed for lead management and collaboration across multiple companies. It offers an Excel-like grid interface, customizable workspaces, dynamic column management, and webhook integration for automated lead creation. Key features include comprehensive reporting, chronological lead update tracking, three-tier role-based access control, data isolation, audit logging, and data export/import. The system supports a self-service signup flow where companies can register independently, and the first user becomes an admin who can invite staff. The vision is to provide an intuitive and powerful CRM solution for businesses to enhance lead management efficiency and team collaboration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

The application follows a monorepo structure with a React/Vite frontend, a Node.js/Express backend, and shared TypeScript types.

### Frontend Architecture

Built with React and Vite, the frontend uses Wouter for routing, `@tanstack/react-query` for server state management, and Shadcn UI (Radix UI + Tailwind CSS) for components. It supports real-time updates via Socket.io and features a mobile-responsive design.

### Backend Architecture

The Express.js backend provides RESTful APIs, with JWT-based authentication, bcrypt for password hashing, and token-based sessions. Data is stored in PostgreSQL using Drizzle ORM. Socket.io enables real-time bidirectional communication for data changes.

### Data Model

Core entities include Users, Companies, Sheets, Leads (with fixed and custom JSON fields), LeadUpdates, DropdownOptions, CustomColumns, Audit logs, and WebhookLogs. All tables use UUIDs, and leads support a soft-delete mechanism with a 30-day retention period.

### API and Security

RESTful APIs manage authentication, signup, invites, sheet operations, lead updates, and webhooks. Security features include JWT with role and sheet-level permissions, HMAC signature validation for webhooks, Express Rate Limit for public endpoints, and comprehensive audit trails.

### Real-time Synchronization

Socket.io enables real-time synchronization by allowing clients to join sheet-specific rooms. The server emits events for data changes to trigger client-side React Query cache invalidation and refetching, supporting optimistic UI updates. Infrastructure for cell-level locking exists to prevent concurrent edits, with visual indicators for locked cells.

### Lead Management Features

The system provides chronological tracking of lead updates, export/import of lead data (Excel/CSV) with intelligent column mapping and validation, and bulk lead transfer between sheets. Leads support soft deletion with admin recovery within 30 days and a daily cleanup job for permanent removal. Conditional validation rules allow making fields required based on trigger conditions.

### Design System

Styling uses Tailwind CSS with custom design tokens, supporting light/dark themes. Shadcn UI provides accessible, customizable components with a mobile-first approach.

### Self-Service Signup System

A comprehensive onboarding flow includes company signup, invite management for staff, and invite acceptance, automatically associating new staff with the company.

### Dashboard Architecture

The dashboard features a full-width spreadsheet interface with sidebar controls. A `DashboardContext` manages state for sheet selection, search, and filtering. The `SpreadsheetGrid` dynamically displays filtered data with sticky headers and horizontal scrolling. Quick filter buttons are integrated into the header for common lead filtering scenarios.

### Webhook Integration System

External systems can create leads via HTTP POST requests. The system includes database schema for configurations, admin APIs for CRUD operations, and a public ingestion endpoint. Features include field mapping from JSON payloads, conditional two-tier allocation logic (team/condition-based then percentage-based), and lead attribution.

### Reports Section

The Reports Section provides data visualization and analytics with permission-based access. It includes pre-built reports and a dynamic Report Builder for custom analytics, allowing users to define X-axis, Y-axis aggregation (Count, Sum, Avg), Y-axis field, and chart type (Bar, Line, Pie) across multiple sheets. Company admins can create and manage all reports, while regular users can view reports for sheets they access. Report cards allow filtering data by specific sheets.

## External Dependencies

### Required Services

-   **Database**: PostgreSQL (Neon-backed) via `DATABASE_URL` using Drizzle ORM.

### Third-Party Libraries

-   **Frontend**: React Query, Socket.io Client, Wouter, Radix UI, Tailwind CSS, date-fns, XLSX.
-   **Backend**: Express, Socket.io, bcryptjs, jsonwebtoken, Express Rate Limit, XLSX.

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