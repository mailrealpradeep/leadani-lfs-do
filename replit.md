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
*   **PowerScore**: Gamified leaderboard system with configurable scoring rules, admin approval workflow, milestone bonuses, login streaks, multi-sheet user exclusion, and transaction management with void capability. Admins can view all point transactions, filter by user, and void transactions (with mandatory reason) which creates compensating negative adjustments for audit trail. Unified Follow-up Tracking with 60-second deduplication ensures only one PowerScore award per lead update session.
*   **Followup Transactions**: Admin-only page showing all follow-up events with user/sheet/date filters and pagination. Uses unified followup_events table with sliding 60-second deduplication window to prevent duplicate PowerScore awards from rapid or concurrent actions.
*   **PowerFlow (Pipeline Analytics)**: Visual funnel analytics showing lead progression through configurable pipeline stages, including conversion rate calculations, period-based filtering, sheet-level access control, backward simulation, and multi-sheet user exclusion.
*   **Quality Check Settings**: AI-powered remark validation for lead updates using Sarvam AI, with configurable acceptance levels, multi-language support, and a fail-open strategy.
*   **Insta Support**: AI-powered support assistant answering questions about application features using Sarvam AI, featuring a question classifier, entity extraction, role-based access control, PII redaction, and multi-language support.
*   **Final Value Settings**: Company-wide rules to prevent status reversals of critical values, with backend enforcement, frontend protection, and admin override capabilities. Includes optional "Block Webhooks & Automations" toggle per rule — when enabled, also prevents webhooks, WhatsApp integration, and auto-fill rules from changing protected final values.
*   **Vision Board**: Personal goal tracking system for executives with money-based goals, dream images carousel, animated circular progress ring, earnings tracking (closings + incentives), and effort metrics breakdown (Sales, Visits, New Leads, Follow-ups) auto-calculated across yearly/monthly/weekly/daily periods. Supports multiple currencies (INR, USD, EUR, GBP, AED) and includes a 4-step setup wizard with Apple-level stunning UI featuring glass-morphism cards and motivational messages. **Admin-Controlled Mode**: Company Admins can configure company-wide and per-user vision targets through Admin Console with 3 tabs - Company Vision (annual targets with auto-distribution to months), User Targets (per-user configuration), and Incentives (admin-added payments). Admins/Multi-sheet users see a User Filter dropdown to switch between Company Vision, My Vision, and individual user views. Regular users continue to see only their personal vision board. Data aggregation uses team totals for company view and individual progress metrics for user views.
*   **Conversion Settings**: Centralized Admin Panel hub for managing sales pipeline configuration. Features include: visual pipeline overview with stage metrics and expected vs actual conversion rate tracking, up to 8 configurable stages with trigger mapping (lead_status/visit_status/combined), conversion value configuration (fixed/from lead field/manual), incentive structures (percentage/fixed/manual/tiered), approval workflow settings, and date-range filtering with quick filters (Today, This Week, Last Week, This Month, Last Month, This Quarter, This Year).
*   **AI Lead Rating**: AI-powered lead quality analysis using Sarvam AI. Analyzes followup remarks (Odia/Hindi/English) to calculate engagement, sentiment, and progression scores. Requires 3+ followups before analysis (shows "New" otherwise to minimize API costs). Rating categories: Hot (4.5-5), Warm (3.5-4.5), Neutral (2.5-3.5), Cold (1.5-2.5), Poor (1-1.5). Features AI Insights column in spreadsheet grid with dropdown filtering, star-based rating display, detailed breakdown in lead detail drawer, mobile card badge, and real-time Socket.io updates. Includes fallback pattern-based rating when AI API unavailable. **Automatic trigger**: When a lead update is created and the lead has 3+ followups, AI rating is calculated in the background and broadcast via Socket.io - no manual "Analyze" button click needed for new followups.
*   **WhatsApp Integration**: Automated lead intake from WhatsApp Business API with trigger-based new lead detection, phone number allocation to users/sheets, configurable field mapping, and default values. Features duplicate detection with automatic transfer request creation when existing leads are found with different owners, follow-up message tracking that adds messages to existing leads' update history. Admin UI includes Phone Allocations (map WhatsApp business numbers to users/sheets), Trigger Rules (pattern matching with contains/equals/starts_with operators), Field Mappings (map WhatsApp fields to lead columns), Default Values (preset values for new leads), Transfer Settings (configurable auto-reset of lead status and auto-approve of transfers when lead has specific statuses like Lost/Not Interested), Message Logs with processing outcomes, and a "Process Pending" button for batch processing. Outcomes include: new_lead_created, followup_added, transfer_request_created, ignored_no_trigger, ignored_no_match, error.

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
*   **AI Services**: Sarvam AI for Quality Check, Insta Support, and AI Lead Rating.
*   **WhatsApp Cloud API**: Meta Embedded Signup for multi-tenant WhatsApp Business connections. SuperAdmin configures Meta Developer App credentials (App ID, App Secret, Configuration ID) and Company Admins connect their WhatsApp Business numbers via Facebook OAuth popup. Webhook endpoint receives incoming messages from Meta. Tables: `whatsapp_cloud_config` (per-company), `meta_platform_settings` (global).