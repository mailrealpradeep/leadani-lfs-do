# LeadAni LFS

## Overview

LeadAni LFS is a multi-tenant, spreadsheet-like lead management system designed for lead management and collaboration. It offers an Excel-like grid interface, customizable workspaces, dynamic column management, and webhook integration for automated lead creation. Key features include comprehensive reporting, chronological lead update tracking, three-tier role-based access control, data isolation per company, audit logging, and mobile-responsive design. The system supports self-service company signup with admin invitation flows for staff. The business vision is to provide an intuitive and powerful CRM for enhancing lead management efficiency and team collaboration for businesses of all sizes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

The application is a monorepo comprising a React/Vite frontend (`client/`), a Node.js/Express backend (`server/`), and shared TypeScript types/schemas (`shared/`).

### Frontend Architecture

The frontend is built with React and Vite, utilizing Wouter for routing, `@tanstack/react-query` for server state management, and Shadcn UI (Radix UI + Tailwind CSS) for themed components. Real-time updates are powered by Socket.io, and the design is mobile-responsive with specific layouts for different screen sizes.

### Backend Architecture

The backend is an Express.js application providing RESTful API endpoints. Authentication is JWT-based with bcrypt for hashing, and it includes token-based sessions and rate limiting. Data persistence is handled by PostgreSQL with Drizzle ORM. Socket.io enables real-time bidirectional communication for CRUD operations and UI synchronization.

### Data Model

Core entities include Users, Companies, Invites, Sheets, Leads (with fixed and custom fields), LeadUpdates, DropdownOptions, CustomColumns, Audit logs, and WebhookLogs. UUIDs are used for all tables, and lead custom fields are stored as JSON. Leads support soft deletion with a 30-day recovery period and automatic exclusion from queries.

### API and Security

The system implements RESTful APIs for authentication, signup, invites, sheet operations, lead updates, and webhooks. Security features include JWT-based authentication with role and sheet-level permissions, HMAC signature validation for webhooks, Express Rate Limit for public endpoints, and comprehensive audit trails.

### Real-time Synchronization

Socket.io facilitates real-time synchronization by allowing clients to subscribe to sheet-specific rooms. Server-emitted events for data changes trigger client-side React Query cache invalidation and refetching, enabling optimistic UI updates.

### Key Features

*   **Lead Management**: Chronological tracking of lead updates, export/import of leads (Excel/CSV) with intelligent column mapping, field validation, and bulk lead transfer.
*   **Soft Delete & Recovery**: Leads can be soft-deleted and recovered by admins within 30 days, with a scheduled job for permanent removal.
*   **Conditional Validation**: Supports creation of company-scoped, sheet-specific rules to make fields required based on trigger conditions, with visual highlighting of invalid leads in the grid and non-blocking import validation.
*   **Design System**: Tailwind CSS with custom design tokens, Shadcn UI components, and support for light/dark themes, built with a mobile-first approach.
*   **Self-Service Signup**: A multi-step onboarding flow for company registration, admin setup, invite management, and staff onboarding.
*   **User Management**: Company admins can manage users, including deletion (with safeguards like preventing self-deletion and ensuring admin presence) and sheet-level access control (viewer/editor roles), with real-time updates and audit logging.
*   **Dashboard**: Features a full-width spreadsheet interface with a sidebar for controls. `DashboardContext` manages state, and `SpreadsheetGrid` dynamically displays filtered data. Quick filters are integrated into the header.
*   **Webhook Integration**: Allows external systems to create leads via HTTP POST requests. Includes configurable field mapping, two-tier conditional allocation logic (team/condition-based and percentage-based round-robin), lead attribution, and security measures like unique tokens and rate limiting.
*   **Reports Section**: Provides comprehensive data visualization and analytics with permission-based access. Includes seven pre-built reports and a dynamic Report Builder for custom reports (X-axis, Y-axis aggregation, chart type, multi-sheet support). Admins can create and edit all reports; regular users can view reports for accessible sheets. Data aggregation excludes soft-deleted leads.

## External Dependencies

### Required Services

*   **Database**: PostgreSQL (Neon-backed) accessed via Drizzle ORM.

### Third-Party Libraries

*   **Frontend**: React Query, Socket.io Client, Wouter, Radix UI, Tailwind CSS, date-fns, XLSX.
*   **Backend**: Express, Socket.io, bcryptjs, jsonwebtoken, Express Rate Limit, XLSX.
*   **Development**: Vite, TypeScript, Drizzle Kit.

### Environment Variables

*   `DATABASE_URL`
*   `JWT_SECRET`
*   `HMAC_SECRET`
*   `NODE_ENV`
*   `PORT`
*   `FRONTEND_URL`

### Integration Points

*   **Self-Service Signup**: `/api/public/signup`
*   **Invite System**: `/api/public/invites/:code`, `/api/public/invites/:code/accept`
*   **Webhook API**: `/api/public/webhooks/:token`
*   **Export Functionality**: Exports lead data to Excel or CSV.
*   **Import Functionality**: Bulk import from Excel/CSV.