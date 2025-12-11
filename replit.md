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
*   **Visit Schedules**: Calendar-based view for tracking site visits, configurable by company to link specific lead statuses and date columns.
*   **Hot Leads**: Company-wide feature to identify and prioritize high-value leads based on configurable conditions, displayed in a unified view with real-time updates and a sidebar badge.

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