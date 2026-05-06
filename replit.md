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

The backend is an Express.js application providing RESTful APIs. It utilizes JWT for authentication, bcrypt for hashing, and Drizzle ORM with PostgreSQL for data persistence. Socket.io facilitates real-time bidirectional communication and UI synchronization. Route files are modularized for better organization and to reduce compilation memory overhead.

### Data Model

Core entities include Users, Companies, Sheets, Leads (with fixed and custom JSON fields), LeadUpdates, DropdownOptions, CustomColumns, Audit logs, and WebhookLogs. All tables use UUIDs, and leads support soft deletion.

### UI/UX Decisions

The system features a customizable grid interface with dynamic column management, conditional validation, and "Next Follow-up Date Time" (NFDT) highlighting. It includes a robust highlighting rules engine for conditional row highlighting based on multi-condition logic. The design is mobile-first, offering specific layouts and configurable mobile lead cards. An "editing row persistence" mechanism ensures rows being edited remain visible even if filtered. It also features a Vision Board with a modern UI using glass-morphism cards and an Admin-Controlled Mode for company-wide vision targets.

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
*   **Visit Schedules & Visited Calendar**: Calendar-based views for tracking scheduled and completed site visits.
*   **Hot Leads**: Company-wide feature to identify and prioritize high-value leads based on configurable conditions.
*   **Custom Views**: Configurable sidebar menu items displaying filtered leads based on group-based conditions.
*   **Validation Rules**: Configurable rules prompting users to update related fields during lead editing, with server-side enforcement.
*   **Add Lead Form Configuration**: Company Admins can configure, reorder, and mark fields as required/optional for the 'Add Lead' form.
*   **Auto-Fill Rules**: Company Admins can configure rules to automatically populate target fields when trigger conditions are met.
*   **Watchlist**: Personal lead watchlist for users to track important leads.
*   **PowerScore**: Gamified leaderboard system with configurable scoring rules, admin approval workflow, milestone bonuses, login streaks, and transaction management with void capability.
*   **Followup Transactions**: Admin-only page showing all follow-up events with filtering and pagination, using deduplication for PowerScore awards.
*   **PowerFlow (Pipeline Analytics)**: Visual funnel analytics showing lead progression through configurable pipeline stages, including conversion rate calculations.
*   **Quality Check Settings**: AI-powered remark validation for lead updates using Sarvam AI, with configurable acceptance levels and multi-language support.
*   **Insta Support**: AI-powered support assistant answering questions about application features using Sarvam AI, featuring a question classifier, entity extraction, role-based access control, and PII redaction.
*   **Final Value Settings**: Company-wide rules to prevent status reversals of critical values, with backend enforcement, frontend protection, and admin override capabilities, including options to block webhooks and automations.
*   **Vision Board**: Personal goal tracking system for executives with money-based goals, dream images carousel, earnings tracking, and effort metrics breakdown. Supports multiple currencies and offers an Admin-Controlled Mode for company-wide and per-user targets.
*   **Conversion Settings**: Centralized Admin Panel for managing sales pipeline configuration, including visual pipeline overview, stage metrics, incentive structures, and approval workflows.
*   **AI Lead Rating**: AI-powered lead quality analysis using Sarvam AI, analyzing followup remarks to calculate engagement, sentiment, and progression scores. Features real-time Socket.io updates and a fallback pattern-based rating.
*   **WhatsApp Integration**: Automated lead intake from WhatsApp Business API with trigger-based new lead detection, phone number allocation (single-user or split-by-percentage mode), configurable field mapping, default values, and duplicate detection with transfer requests. Includes Admin UI for configuration and message logs. Split mode uses weighted round-robin that resets daily in company timezone (`whatsapp_allocation_splits` + `whatsapp_allocation_daily_counts` tables).
*   **Call Schedule**: Executive view for Saila AI call commitments, displaying pending/completed/missed calls with inline status updates.
*   **Saila Intake**: Multi-tenant, keyword-triggered, sequential free-text Q&A WhatsApp lead-qualifier built additively on top of Saila.AI. Admins define industry-agnostic Intake Flows (`saila_intake_flows`) with trigger keywords (`saila_intake_triggers`) and ordered questions (`saila_intake_questions`); each question targets a `lead.custom_fields` key. Sessions (`saila_intake_sessions`) track depth, fallback attempts, and status (active/paused/completed/abandoned). Engine precedence inside `generateSailaResponse`: (1) intake continuation/start → short-circuits remaining pipeline; (2) Fixed Reply Mode; (3) keyword fast-path / templates / LLM. Drop-off at any question = qualifier signal — depth_reached is logged on the lead. Background tick worker (1-min interval, `server/saila-intake-scheduler.ts`) handles silence timeouts, configurable fallback prompts (`{question}` placeholder), and abandonment after max attempts. Optional Sarvam relevance check per question (fail-open). Human takeover detected via `whatsapp_message_logs.origin` column (bot/human) — every human send pauses the active session for 24h. Cancel keywords abort. All bot/human messages mirrored into `lead_updates` for full transcript visibility. Admin UI lives in Saila → "Intake" tab.
*   **Saila Fixed Reply Mode**: Engine mode that intercepts Meta Ad contacts' 2nd message within 3 hours and sends a configurable template reply (with {greeting}, {call_time}, {executive_name} placeholders) instead of the AI response. Configurable per-phone via the Saila AI settings page. Includes company-wide Greeting Slots (hour range → greeting text) and Call Time Slots (hour range → call time label). Automatically creates Call Schedule entries. Silent skip if no call time slot matches (logged to activity log).
*   **Radar (Close Monitor Lead View)**: Admin-managed card-based view for monitoring high-priority leads, allowing admins to add/remove leads from the spreadsheet grid and view/edit key fields.
*   **Time-wise Work Report**: Grid in Vision Board showing each executive's lead activity across hourly time slots, with capped minute calculations (4 min/lead, capped at slot duration). Clicking a cell navigates to a drill-down view that renders the full SpreadsheetGrid for that slot's leads. Backend endpoints at `/api/work-report` (summary) and `/api/work-report/slot-leads` (drill-down leads). Accessible to all users with admin user-filter option.

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
*   **Saila.AI**: AI-powered WhatsApp response engine using Sarvam LLM, template matching, keyword matching, confidence scoring, and Wauper Session Messaging API. Includes an LLM Test Mode for response calibration.
*   **WhatsApp Cloud API**: Meta Embedded Signup for multi-tenant WhatsApp Business connections.