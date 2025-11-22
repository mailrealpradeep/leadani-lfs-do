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

### Webhook Integration System

External systems can create leads via HTTP POST requests using a comprehensive webhook system.
-   **Database Schema**: Stores webhook configurations, field mappings, allocation rules, and request logs.
-   **API Endpoints**: Admin endpoints for CRUD operations and a public endpoint (`POST /api/public/webhooks/:token`) for lead ingestion.
-   **Field Mapping**: Transforms incoming JSON payloads to CRM lead structures, mapping to fixed and custom fields.
-   **Allocation Logic**: Supports conditional two-tier allocation (team/condition-based then percentage-based round-robin) with operators like "equals," "contains," and "starts_with." Includes percentage validation and fallback rules.
-   **Lead Attribution**: Webhook-created leads are attributed to the webhook's `created_by_user_id`.
-   **Security**: Unique, hashed webhook tokens and rate-limited public endpoint.

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