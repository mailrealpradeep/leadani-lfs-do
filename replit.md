# Dabluz CRM

## Overview

Dabluz CRM is a production-ready, multi-tenant spreadsheet-like CRM for lead management and collaboration across multiple companies. It offers Excel-like grid interfaces with customizable workspaces, dynamic company-wide column management, webhook integration for automated lead creation, comprehensive reporting, and chronological lead update tracking. Key features include three-tier role-based access control (Super Admin, Company Admin, Regular User), data isolation per company, audit logging, data export/import, and a mobile-responsive design. The project is focused on real-time collaboration and is largely complete in its multi-tenant transformation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

The application uses a monorepo structure with `client/` (React frontend), `server/` (Node.js Express backend), and `shared/` (TypeScript types and schemas). It supports distinct development and production environments.

### Frontend Architecture

The frontend is built with React and Vite. It uses Wouter for routing, `@tanstack/react-query` for server state management, and local/context state for UI. Shadcn UI, based on Radix UI and Tailwind CSS, provides components with theme support. Real-time updates are handled via Socket.io. The design is fully mobile-responsive, adapting layouts and interactions based on screen size, with specific considerations for touch targets and mobile dialogs. The desktop view utilizes CSS Grid for sticky headers and efficient horizontal scrolling, designed to prevent accidental lead detail opening during cell interaction.

### Backend Architecture

The backend is an Express.js application providing RESTful API endpoints. Authentication is JWT-based with bcrypt for password hashing, token-based sessions, and rate limiting. Data is currently stored in an in-memory implementation (`MemStorage`) but is designed for easy migration to PostgreSQL using a common `IStorage` interface and Drizzle ORM. Socket.io manages real-time bidirectional communication, broadcasting CRUD events to relevant clients.

### Data Model

Core entities include Users, Sheets, SheetUsers, Leads (with fixed and custom fields), LeadUpdates (chronological tracking), DropdownOptions, CustomColumns, Audit logs, and WebhookLogs. The schema is TypeScript-first and Drizzle ORM-ready.

### API Architecture

RESTful endpoints cover authentication, sheet management (CRUD for leads, columns, dropdowns, reports), lead updates, admin functions, audit logs, and webhooks for external lead creation. The request flow involves JWT validation, processing by route handlers, interaction with the storage layer, and Socket.io broadcasts for mutations. Centralized error handling is implemented.

### Security

Security features include JWT-based authentication and authorization with role-based and sheet-level permissions, HMAC signature validation for webhooks, Express Rate Limit for endpoint protection, and a comprehensive audit trail for all CRUD operations.

### Real-time Synchronization

Socket.io enables real-time synchronization by allowing clients to join sheet-specific rooms. The server emits events (`lead_created`, `lead_updated`, `lead_deleted`, etc.) which trigger client-side React Query cache invalidation and refetching, supported by optimistic updates for immediate UI feedback.

### Lead Update Tracking

The system provides chronological tracking of lead updates, recording the method (WhatsApp/Phone Call), date, and remarks. UI components for recording and viewing updates are integrated into both desktop and mobile views, with real-time synchronization via Socket.io.

### Data Export

The application supports exporting lead data to Excel (XLSX library) and CSV formats.

### Design System

Styling uses Tailwind CSS with custom design tokens and supports light/dark themes. Shadcn UI provides accessible, customizable components following a compound pattern. The design is mobile-first with responsive layouts.

### Dashboard Architecture

The dashboard features a clean, full-width spreadsheet interface with controls consolidated in a sidebar. `DashboardContext` manages central state for `selectedSheetId`, `searchQuery`, `categoryFilter`, and action handlers. The sidebar provides sheet selection, lead actions (Add, Import, Manage Columns), filtering, search, and export options. The `SpreadsheetGrid` dynamically displays filtered data based on `DashboardContext` values, maintaining sticky headers and horizontal scrolling.

## External Dependencies

### Required Services

-   **Database**: Currently in-memory; designed for PostgreSQL using `DATABASE_URL` and Drizzle ORM.

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

-   **Webhook API**: External systems can create leads via `POST /api/webhooks/leads` with HMAC signature.
-   **Export Functionality**: Exports lead data to Excel or CSV.
-   **Import Functionality**: Supports bulk import from Excel/CSV with intelligent column mapping. Google Sheets import is proposed but requires additional setup (Replit connector or manual API credentials).