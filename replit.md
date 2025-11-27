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

The system implements RESTful APIs for authentication, signup, invites, sheet operations, lead updates, and webhooks. Security features include JWT-based authentication with role and sheet-level permissions, HMAC signature validation for webhooks, Express Rate Limit for public endpoints, password-protected sheet deletion (requires account password verification), and comprehensive audit trails.

### Real-time Synchronization

Socket.io facilitates real-time synchronization by allowing clients to subscribe to sheet-specific rooms. Server-emitted events for data changes trigger client-side React Query cache invalidation and refetching, enabling optimistic UI updates.

### Key Features

*   **Lead Management**: Chronological tracking of lead updates, export/import of leads (Excel/CSV) with intelligent column mapping, field validation, and bulk lead transfer.
*   **Soft Delete & Recovery**: Leads can be soft-deleted and recovered by admins within 30 days, with a scheduled job for permanent removal.
*   **Conditional Validation**: Supports creation of company-scoped, sheet-specific rules to make fields required based on trigger conditions, with visual highlighting of invalid leads in the grid and non-blocking import validation.
*   **NFDT Highlighting**: Two-tier visual highlighting for Next Follow-up Date Time columns:
    - **Empty NFDT (Red)**: When validation rules require NFDT but it's empty, the entire row gets red background (`bg-red-50`)
    - **Past NFDT (Amber)**: Individual NFDT cells with past dates get amber cell-level styling (`bg-amber-100`), clock icon, and tooltip "Past follow-up date"
    - Column detection matches: `nfdt`, `next_follow`, `followup_date` in column_key, or `nfdt`, `next follow` in column name
    - Works in both desktop spreadsheet view and mobile card view
    - Uses memoized `leadsWithPastNFDT` Map for efficient rendering
*   **Design System**: Tailwind CSS with custom design tokens, Shadcn UI components, and support for light/dark themes, built with a mobile-first approach.
*   **Self-Service Signup**: A multi-step onboarding flow for company registration, admin setup, invite management, and staff onboarding.
*   **User Management**: Company admins can manage users, including deletion (with safeguards like preventing self-deletion and ensuring admin presence) and sheet-level access control (viewer/editor roles), with real-time updates and audit logging.
*   **Dashboard**: Features a full-width spreadsheet interface with a sidebar for controls. `DashboardContext` manages state, and `SpreadsheetGrid` dynamically displays filtered data. Quick filters are integrated into the header.
*   **Webhook Integration**: Allows external systems to create leads via HTTP POST requests. Includes configurable field mapping, two-tier conditional allocation logic (team/condition-based and percentage-based round-robin), lead attribution, and security measures like unique tokens and rate limiting.
*   **Reports Section**: Provides comprehensive data visualization and analytics with permission-based access. Includes a dynamic Report Builder for custom reports (X-axis, Y-axis aggregation, chart type, multi-sheet support). Admins can create and edit all reports; regular users can view reports for accessible sheets. Data aggregation excludes soft-deleted leads. **Drill-down Feature**: Interactive pivot tables and charts allow users to click on any number or chart segment to view the underlying leads in a responsive modal dialog, with paginated results showing full lead details including sheet name and owner information.
*   **Team Performance Section**: A dedicated page (accessible via sidebar menu below Reports) for executive comparison and performance tracking. Features:
    - **Executive Performance Card**: Shows dropdown option counts (e.g., "Visit Scheduled") per sheet/executive with Today/This Week/Last 30 Days/Total columns
    - Users can select any dropdown column and option to track performance
    - Drill-down support to view underlying leads for any count
    - Time periods calculated from midnight (Today), Monday-start (This Week), and 30-day lookback (Last 30 Days)
    - Dropdown options are read from column config.dropdown_options
*   **Mobile Card Configuration**: Company admins can configure which columns appear on mobile lead cards via Admin Console:
    - MobileCardSettings component with drag-and-drop reordering in Admin Console
    - First 2 selected columns display as card title, next 4 as detail fields
    - Settings stored in company.settings.mobile_card_columns
    - Mobile card view includes Call and WhatsApp action buttons with tel: and wa.me links
    - API: GET /api/company/settings (all users), PATCH /api/admin/company/settings (admins only)
*   **Mobile Lead Editing**: LeadEditDialog component for editing leads on mobile devices:
    - Bottom sheet drawer (85vh height) slides up with rounded corners
    - Full form with all lead fields based on column configuration
    - Field types: text inputs, number inputs, dropdown selects, date pickers
    - "Edit Lead" button as primary action on mobile cards
    - Action button layout: Edit Lead (full width primary), then Update/History/Call/WhatsApp row
    - Uses nullish coalescing (??) to properly preserve zero values in inputs
    - PATCH /api/leads/{id} to save changes
    - Touch-friendly with min-h-[44px] for all interactive elements
*   **Mobile Sort & Filter**: MobileFilterSheet component for sorting and filtering leads on mobile:
    - Bottom sheet drawer (80vh height) with Sort By and Filter By sections
    - Sort by any column in ascending/descending order
    - Filter by dropdown columns (single value) and date columns (date range picker)
    - "Sort & Filter" button in mobile header with active count badge
    - Active filters shown as removable badges with individual clear option and "Clear All"
    - State management pattern: useEffect syncs local state when sheet opens, handleCancel resets before closing
    - Date range filter supports Today, This Week, This Month, Last 7 Days, and Custom Range
    - Apply button commits changes to parent, Cancel reverts to committed values
    - Touch-friendly with min-h-[44px] for all interactive elements
*   **Lead Detail Drawer**: Slide-out drawer showing lead details and activity history
    - Header displays the lead's Full Name dynamically using flexible regex matching
    - Uses getFullName function with patterns: /^full[_\s]?name/i, /^name$/i
    - Falls back to column metadata lookup and any field containing "name"
    - Proper scroll behavior with flex layout for Activity History at bottom
*   **Mandatory System Columns**: Full Name and Mobile No are protected system columns
    - PROTECTED_SYSTEM_COLUMN_KEYS: ["full_name", "mobile_no"] hardcoded in routes
    - Cannot be deleted (DELETE returns 400 error)
    - Cannot have type changed (PATCH returns 400)
    - Cannot have required or is_system_column flags removed
    - Config is merged, not replaced, and flags are re-enforced for system columns
    - UI shows "Required" badge and hides delete button for system columns
    - New companies get these columns with is_system_column: true in config
*   **Multi-Sheet Selection with Pagination**: Admin-only feature for viewing combined leads from multiple sheets
    - MultiSheetSelector component in sidebar provides drawer with checkboxes for selecting multiple sheets
    - Unified SpreadsheetGrid component handles both single-sheet and multi-sheet modes
    - Multi-sheet mode adds "Sheet" column as first column with badge styling
    - Server-side pagination via POST /api/leads/query endpoint with sheetIds, page, limit, sortBy, sortOrder
    - Multi-sheet mode supports global search but disables column filters and per-column sorting (backend limitation)
    - Fixed sort order: newest leads first (created_at desc)
    - Pagination controls at bottom: page navigation (First/Prev/Next/Last) and page size selector (25/50/100 rows)
    - DashboardContext manages isMultiSheetMode, selectedSheetIds, pagination state
    - AddLeadDialog shows sheet selector dropdown when in multi-sheet mode
    - Storage layer getLeadsBySheetIds handles pagination and search across multiple sheets
    - Designed for large datasets (10k-100k leads) with efficient server-side processing

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