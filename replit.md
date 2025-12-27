# Leadani LFS

## Overview

Leadani LFS is a multi-tenant, spreadsheet-like lead management system designed to enhance lead management efficiency and collaboration. It offers an intuitive Excel-like grid interface, customizable workspaces, dynamic column management, and automated lead creation via webhooks. Key capabilities include comprehensive reporting, chronological lead update tracking, robust three-tier role-based access control, data isolation per company, audit logging, and an attendance system. The system supports self-service company signup and is fully mobile-responsive, aiming to be a powerful and user-friendly CRM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

The project is a monorepo consisting of a React/Vite frontend, a Node.js/Express backend, and shared TypeScript types/schemas.

### Frontend Architecture

The frontend uses React with Vite, Wouter for routing, `@tanstack/react-query` for server state management, and Shadcn UI (Radix UI + Tailwind CSS) for themed, mobile-responsive components. Real-time updates are handled by Socket.io.

### Backend Architecture

The backend is an Express.js application providing RESTful APIs. It utilizes JWT for authentication, bcrypt for hashing, and Drizzle ORM with PostgreSQL for data persistence. Socket.io facilitates real-time bidirectional communication and UI synchronization.

### Data Model

Core entities include Users, Companies, Sheets, Leads (with fixed and custom JSON fields), LeadUpdates, DropdownOptions, CustomColumns, Audit logs, and WebhookLogs. All tables use UUIDs, and leads support soft deletion.

### UI/UX Decisions

The system features a customizable grid interface with dynamic column management, conditional validation, and "Next Follow-up Date Time" (NFDT) highlighting. It includes a robust highlighting rules engine for conditional row highlighting based on multi-condition logic. The design is mobile-first, offering specific layouts and configurable mobile lead cards. An "editing row persistence" mechanism ensures rows being edited remain visible even if filtered.

### Key Features

*   **Lead Management**: Comprehensive lead lifecycle management including import/export, bulk operations, soft-delete, and duplicate prevention.
*   **Real-time Synchronization**: Achieved via Socket.io for all data updates.
*   **Role-Based Access Control**: Three-tier system (Super Admin, Company Admin, User) with sheet-level permissions.
*   **Company Timezone Configuration**: Per-company timezone settings for consistent date/time.
*   **Webhooks**: Configurable integration for lead creation from external systems with field mapping and allocation logic.
*   **Self-Service Onboarding**: Multi-step flow for company registration and user invitations.
*   **Attendance System**: Mobile-first PWA for daily entry/exit tracking.
*   **Target Management System (TMS)**: Performance tracking with multi-goal targets, flexible assignment, and leaderboards.
*   **User Row Filters**: Persistent, user-defined row filtering with multiple conditions.
*   **Google Sheets Backup System**: Automatic hourly lead data backup to Google Sheets.
*   **Point-in-Time Sheet Recovery (Snapshots)**: SuperAdmin-only system for automatic hourly snapshots with recovery UI.
*   **Data Management (Admin Console)**: Company Admin tools for bulk operations like data clearing and lead transfers.
*   **Visit Schedules & Visited Calendar**: Calendar-based views for tracking scheduled and completed site visits with customizable card displays.
*   **Hot Leads**: Company-wide feature to identify and prioritize high-value leads based on configurable conditions.
*   **Custom Views**: Configurable sidebar menu items displaying filtered leads based on group-based conditions, with customizable icons, optional badge counts, and section assignment (can display in "Custom Views" or "Data Mismatch" sidebar sections).
*   **Validation Rules**: Configurable rules prompting users to update related fields during lead editing, with server-side enforcement.
*   **Add Lead Form Configuration**: Company Admins can configure, reorder, and mark fields as required/optional for the 'Add Lead' form.
*   **Auto-Fill Rules**: Company Admins can configure rules to automatically populate target fields when trigger conditions are met, with priority ordering and enable/disable toggles.
*   **Watchlist**: Personal lead watchlist for users to track important leads, with real-time updates.
*   **PowerScore**: Gamified leaderboard system with configurable scoring rules, admin approval workflow, milestone bonuses, login streaks, multi-sheet user exclusion, and transaction management with void capability. Admins can view all point transactions, filter by user, and void transactions (with mandatory reason) which creates compensating negative adjustments for audit trail.
*   **PowerFlow (Pipeline Analytics)**: Visual funnel analytics showing lead progression through configurable pipeline stages, including conversion rate calculations, period-based filtering, sheet-level access control, backward simulation, and multi-sheet user exclusion.
*   **Quality Check Settings**: AI-powered remark validation for lead updates using Sarvam AI, with configurable acceptance levels, multi-language support, and a fail-open strategy.
*   **Insta Support**: AI-powered support assistant answering questions about application features using Sarvam AI, featuring a question classifier, entity extraction, role-based access control, PII redaction, and multi-language support.
*   **Final Value Settings**: Company-wide rules to prevent status reversals of critical values, with backend enforcement, frontend protection, and admin override capabilities.

### Security

JWT-based authentication with role and sheet-level permissions, HMAC signature validation for webhooks, Express Rate Limit, password-protected sheet deletion, and comprehensive audit trails.

## External Dependencies

### Required Services

*   **Database**: PostgreSQL (Neon-backed).

### Third-Party Libraries

*   **Frontend**: React Query, Socket.io Client, Wouter, Radix UI, Tailwind CSS, date-fns, XLSX.
*   **Backend**: Express, Socket.io, bcryptjs, jsonwebtoken, Express Rate Limit, XLSX.

### Integration Points

*   **Authentication & Onboarding**: Public APIs for signup, invites, and invite acceptance.
*   **Webhook API**: Public endpoint for external lead creation.
*   **Data Operations**: Export and Import functionalities for lead data.
*   **AI Services**: Sarvam AI for Quality Check and Insta Support.