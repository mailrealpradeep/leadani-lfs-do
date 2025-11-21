# Dabluz CRM

## Overview

Dabluz CRM is a production-ready multi-user spreadsheet-like CRM application designed for lead management and collaboration. The system provides Excel-like grid interfaces with customizable workspaces (sheets), dynamic column management, webhook integration for automated lead creation, and comprehensive reporting capabilities. Built with a focus on real-time collaboration, the application supports role-based access control, audit logging, and data export functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

**Monorepo Layout**: The application uses a unified codebase with three main directories:
- `client/`: React frontend application
- `server/`: Node.js Express backend
- `shared/`: TypeScript types and schemas shared between frontend and backend

**Development vs Production**: Two separate entry points (`index-dev.ts` and `index-prod.ts`) handle different environments. Development mode integrates Vite's HMR for fast refresh, while production serves pre-built static assets.

### Frontend Architecture

**Framework**: React with Vite as the build tool, providing fast development experience and optimized production builds.

**Routing**: Wouter (lightweight routing library) manages client-side navigation with protected routes for authentication.

**State Management**: 
- React Query (`@tanstack/react-query`) handles all server state, caching, and synchronization
- Local component state for UI interactions
- Auth context provides global authentication state

**UI Components**: Shadcn UI component library built on Radix UI primitives, styled with Tailwind CSS. Uses a custom design system with theme support (light/dark modes).

**Real-time Updates**: Socket.io client establishes WebSocket connections for live data synchronization across users viewing the same sheet.

### Backend Architecture

**Server Framework**: Express.js provides the HTTP server with RESTful API endpoints.

**Authentication**: JWT-based authentication with:
- bcrypt for password hashing
- Token-based session management (7-day expiration)
- Middleware for protected routes and admin-only access
- Rate limiting on authentication endpoints (5 attempts per 15 minutes)

**Data Storage**: In-memory storage implementation (`MemStorage` class) that provides a complete CRUD interface. This design allows easy swapping to PostgreSQL through a common `IStorage` interface.

**Real-time Layer**: Socket.io server handles bidirectional communication:
- Users join/leave sheet-specific rooms
- Server broadcasts CRUD events to connected clients
- Automatic reconnection handling

### Data Model

**Core Entities**:
- **Users**: Authentication and role management (admin/user)
- **Sheets**: Workspace containers with owner and settings
- **SheetUsers**: Junction table for sheet permissions (Owner/Editor/Viewer)
- **Leads**: Primary data records with fixed and custom fields
- **DropdownOptions**: Configurable dropdown values per sheet and column
- **CustomColumns**: Dynamic column definitions (text, number, date, dropdown, boolean)
- **Audit**: Activity logging for all CRUD operations
- **WebhookLog**: Incoming webhook request tracking

**Schema Design**: Drizzle ORM ready with TypeScript-first schema definitions in `shared/schema.ts`. Currently uses in-memory storage but structured for PostgreSQL migration.

### API Architecture

**RESTful Endpoints**:
- `/api/auth/*`: Login, register, session management
- `/api/sheets/*`: Sheet CRUD, leads, columns, dropdowns, reports
- `/api/admin/*`: System-wide user and sheet management
- `/api/audit`: Activity logs
- `/api/webhooks/leads`: External lead creation endpoint
- `/api/webhook/logs`: Webhook activity tracking

**Request Flow**:
1. Client makes authenticated request with JWT in Authorization header
2. Auth middleware validates token and attaches user info to request
3. Route handler processes request, interacts with storage layer
4. Response sent to client
5. If mutation, Socket.io broadcasts update to connected clients

**Error Handling**: Centralized error responses with appropriate HTTP status codes and error messages.

### Security

**Authentication & Authorization**:
- JWT tokens with configurable secret (defaults provided, should be changed in production)
- Role-based access control (admin vs user)
- Sheet-level permissions (Owner/Editor/Viewer)
- Protected routes on both frontend and backend

**Webhook Security**:
- HMAC signature validation using shared secret
- Rate limiting (30 requests per minute)
- Raw body parsing for signature verification

**Rate Limiting**: Express Rate Limit protects authentication and webhook endpoints from abuse.

**Audit Trail**: Complete logging of create/update/delete actions with user, timestamp, and changes recorded.

### Real-time Synchronization

**Socket.io Implementation**:
- Clients join sheet-specific rooms when viewing a sheet
- Server emits events: `lead_created`, `lead_updated`, `lead_deleted`, `dropdown_updated`, `column_added`
- Clients listen for events and invalidate React Query cache to trigger refetch
- Optimistic updates on client side for immediate feedback

### Data Export

**Excel Export**: XLSX library generates Excel-compatible spreadsheets with all lead data and custom columns.

**CSV Export**: Parallel CSV generation for broader compatibility.

### Design System

**Styling Approach**: Tailwind CSS utility-first with custom design tokens defined in CSS variables. Supports light and dark themes through class-based switching.

**Component Library**: Shadcn UI provides accessible, customizable components. All components use compound pattern with separate parts (e.g., Dialog, DialogContent, DialogTitle).

**Responsive Design**: Mobile-first approach with collapsible sidebar and responsive grid layouts.

## External Dependencies

### Required Services

**Database**: Currently uses in-memory storage. Designed for PostgreSQL migration via Drizzle ORM:
- Connection string: `DATABASE_URL` environment variable
- Migration tooling configured in `drizzle.config.ts`
- Schema definitions ready in `shared/schema.ts`

### Third-Party Libraries

**Frontend**:
- React Query: Server state management and caching
- Socket.io Client: Real-time WebSocket communication
- Wouter: Lightweight routing
- Radix UI: Accessible component primitives
- Tailwind CSS: Utility-first styling
- date-fns: Date formatting and manipulation
- XLSX: Client-side Excel export

**Backend**:
- Express: HTTP server framework
- Socket.io: WebSocket server
- bcryptjs: Password hashing
- jsonwebtoken: JWT creation and validation
- Express Rate Limit: API rate limiting
- XLSX: Server-side Excel generation

**Development**:
- Vite: Frontend build tool and dev server
- TypeScript: Type safety across stack
- Drizzle Kit: Database migration tooling

### Environment Variables

Required configuration:
- `DATABASE_URL`: PostgreSQL connection string (when migrating from in-memory)
- `JWT_SECRET`: Secret key for JWT signing (default provided)
- `HMAC_SECRET`: Webhook signature validation key (default provided)
- `NODE_ENV`: Environment flag (development/production)
- `PORT`: Server port (defaults to Replit's PORT or 5000)
- `FRONTEND_URL`: CORS origin for production (defaults to wildcard in development)

### Integration Points

**Webhook API**: External systems can POST JSON to `/api/webhooks/leads` with HMAC signature for automated lead creation. Supports custom field mapping and stores unknown fields in metadata.

**Export Functionality**: Users can download lead data as Excel or CSV files for use in external tools.