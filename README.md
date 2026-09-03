# LeadAni LFS

A production-ready multi-user spreadsheet-like lead management system with customizable workspaces, dynamic columns, webhook ingestion, realtime collaboration, and comprehensive reporting.

## 🚀 Features

### Core Functionality
- **Multi-user Workspaces**: Create and share sheets (workspaces) with role-based permissions (Owner/Editor/Viewer)
- **Spreadsheet-like Grid**: Excel-like interface with inline editing, sorting, filtering, and search
- **Dynamic Columns**: Add custom columns with multiple field types (text, number, date, dropdown, boolean)
- **Editable Dropdowns**: Customize dropdown options for Lang, Occupation, Qualification, Lead Status, Visit Status
- **Webhook Integration**: Secure API endpoint for automated lead creation from external sources
- **Realtime Updates**: Live synchronization across users using Socket.io
- **Bulk Operations**: Multi-select rows for bulk status changes and deletion
- **Comprehensive Reports**: Per-sheet and global analytics dashboards with conversion tracking
- **Audit Logging**: Complete activity trail of all create/update/delete actions
- **Data Export**: Export leads to CSV or XLSX format

### Security & Best Practices
- JWT-based authentication with bcrypt password hashing
- Role-based access control (Admin/User) with sheet-level permissions
- HMAC webhook validation to prevent unauthorized access
- Rate limiting on authentication and webhook endpoints
- Comprehensive audit logging for compliance

## 🛠️ Tech Stack

### Frontend
- **React** (Vite) - Fast, modern build tooling
- **TypeScript** - Type safety across the application
- **Tailwind CSS** - Utility-first styling
- **Shadcn UI** - Beautiful, accessible components
- **React Query** - Powerful data fetching and caching
- **Socket.io Client** - Realtime bidirectional communication
- **Wouter** - Lightweight routing

### Backend
- **Node.js + Express** - Fast, unopinionated server framework
- **TypeScript** - End-to-end type safety
- **PostgreSQL + Drizzle ORM** - Persistent storage (standard `pg` driver; falls back to in-memory MemStorage in dev/tests when DATABASE_URL is unset)
- **Socket.io** - Realtime server
- **bcryptjs** - Secure password hashing
- **jsonwebtoken** - JWT authentication
- **XLSX** - Excel export functionality
- **Express Rate Limit** - API rate limiting

## 📦 Getting Started

### Step 1: Configure Environment
Copy `.env.example` and fill in real values — it documents every variable
(database, secrets, storage driver, Google Sheets backup, etc.). At minimum set:

```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secure-random-string-here
HMAC_SECRET=your-webhook-secret-here
```

**Generate secure secrets** with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

On Replit, set these in the Secrets tab (🔒). For Docker/Coolify, see the
`Dockerfile` header and `docker-compose.yml`.

### Step 2: Run the Application
```bash
npm install
npm run dev        # development (port 5000)
# or
npm run build && npm start   # production
```

### Step 3: First Login
Use one of these pre-seeded accounts:

**Admin Account:**
- Email: `admin@example.com`
- Password: `Passw0rd!`

**User Accounts:**
- Email: `user1@example.com` / Password: `password123`
- Email: `user2@example.com` / Password: `password123`

## 🏃 Running Locally

### Prerequisites
- Node.js 20+ installed (the Dockerfile pins node:20-alpine)
- npm or yarn package manager

### Installation
```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and set your secrets
nano .env

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000`

## 📚 API Reference

### Authentication Endpoints

#### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

Response:
{
  "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "user" },
  "token": "eyJhbGc..."
}
```

#### Get Current User
```bash
GET /api/auth/me
Authorization: Bearer <token>
```

### Sheet Endpoints

#### Get User's Sheets
```bash
GET /api/sheets
Authorization: Bearer <token>
```

#### Create Sheet
```bash
POST /api/sheets
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Sales Q1 2025",
  "settings": {}
}
```

#### Get Sheet Leads
```bash
GET /api/sheets/:id/leads
Authorization: Bearer <token>
```

#### Create Lead
```bash
POST /api/sheets/:id/leads
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Smith",
  "mobile_no": "9123456789",
  "whatsapp": "9123456789",
  "lang": "English",
  "occupation": "Student",
  "qualification": "Graduate",
  "lead_status": "New",
  "visit_status": "Not Visited"
}
```

### Webhook Endpoint

#### Create Lead via Webhook
```bash
POST /api/webhooks/leads
X-API-KEY: <your-hmac-secret>
Content-Type: application/json

{
  "sheet_id": "your-sheet-id",
  "name": "Ramesh Kumar",
  "mobile_no": "9123456789",
  "whatsapp": "9123456789",
  "lang": "Hindi",
  "occupation": "Student",
  "qualification": "12th Pass",
  "lead_date": "2025-11-21",
  "lead_time": "14:30",
  "lead_status": "New",
  "visit_status": "Not Visited",
  "meta": {
    "utm_source": "facebook",
    "campaign": "winter"
  }
}
```

**Security Note:** The `X-API-KEY` header must match your `HMAC_SECRET` environment variable.

### Reports Endpoints

#### Get Sheet Reports
```bash
GET /api/sheets/:id/reports
Authorization: Bearer <token>

Response:
{
  "total_leads": 50,
  "leads_by_status": { "New": 20, "Contacted": 15, "Converted": 10, "Lost": 5 },
  "leads_by_executive": { "John Doe": 30, "Jane Smith": 20 },
  "daily_trends": [{ "date": "2025-11-21", "count": 5 }],
  "conversion_rate": 20.0,
  "visits_scheduled": 8,
  "nfdt_count": 3
}
```

#### Get Global Reports (Admin Only)
```bash
GET /api/reports/global
Authorization: Bearer <token>
```

### Export Endpoints

#### Export Sheet to CSV/XLSX
```bash
GET /api/sheets/:id/export?format=csv
GET /api/sheets/:id/export?format=xlsx
Authorization: Bearer <token>
```

## 🔧 Webhook Integration Guide

### Step 1: Get Your Webhook URL
```
https://your-app-domain.com/api/webhooks/leads
```

### Step 2: Configure External Service
Set up your external service (Facebook Leads, Google Forms, Zapier, etc.) to POST to this URL.

### Step 3: Add Authentication Header
Include `X-API-KEY` header with your HMAC_SECRET value:
```
X-API-KEY: your-webhook-hmac-secret-here
```

### Step 4: Test with cURL
```bash
curl -X POST https://your-app-domain.com/api/webhooks/leads \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-hmac-secret" \
  -d '{
    "sheet_id": "your-sheet-id",
    "name": "Test Lead",
    "mobile_no": "9123456789",
    "whatsapp": "9123456789",
    "lang": "English",
    "occupation": "Student",
    "qualification": "Graduate",
    "lead_status": "New",
    "visit_status": "Not Visited"
  }'
```

### Webhook Payload Mapping
- **Required**: `sheet_id` (ID of the target sheet)
- **Recommended**: `name`, `mobile_no`, `lead_status`, `visit_status`
- **Optional**: All other lead fields
- **Meta Data**: Unknown fields are stored in `meta` object

### Auto-create Dropdown Options
If you send a dropdown value (lang, occupation, qualification, lead_status, visit_status) that doesn't exist, the system will automatically create it and log the action in audit logs.

## 📋 Manual QA Checklist

### Authentication & User Management
- [ ] Register new user account
- [ ] Login with valid credentials
- [ ] Login fails with invalid credentials
- [ ] Logout clears session and redirects to login
- [ ] Theme toggle works (light/dark mode)

### Sheet Management
- [ ] Create new sheet
- [ ] Sheet appears in sheet selector
- [ ] Switch between sheets
- [ ] Multiple users can access shared sheets
- [ ] Sheet permissions work correctly (Owner/Editor/Viewer)

### Lead Management
- [ ] Add new lead via "Add Lead" button
- [ ] All fields save correctly
- [ ] Edit lead by double-clicking cells
- [ ] Changes save on Enter key
- [ ] Delete single lead
- [ ] Bulk select and delete multiple leads
- [ ] Search/filter leads works
- [ ] Sort columns works
- [ ] View lead details in drawer

### Dropdown Management
- [ ] Open dropdown manager for any dropdown column
- [ ] Add new dropdown option
- [ ] Delete dropdown option
- [ ] Reorder dropdown options (drag)
- [ ] Dropdown changes reflect immediately in grid

### Custom Columns
- [ ] Add custom text column
- [ ] Add custom number column
- [ ] Add custom date column
- [ ] Add custom dropdown column
- [ ] Delete custom column
- [ ] Custom columns appear in grid

### Webhook Integration
- [ ] Send test webhook with cURL
- [ ] Lead appears in sheet immediately
- [ ] Realtime update notifies other users
- [ ] Webhook logs show success status
- [ ] Invalid API key is rejected

### Reports & Analytics
- [ ] View per-sheet reports
- [ ] Total leads count is accurate
- [ ] Leads by status chart shows correct data
- [ ] Leads by executive chart shows correct data
- [ ] Daily trends chart shows recent activity
- [ ] Admin global reports accessible (admin only)

### Export Functionality
- [ ] Export to CSV downloads correctly
- [ ] Export to XLSX downloads correctly
- [ ] Exported data matches grid data

### Realtime Updates
- [ ] Open same sheet in two browsers
- [ ] Add lead in browser 1
- [ ] Lead appears in browser 2 without refresh
- [ ] Edit lead in browser 1
- [ ] Changes reflect in browser 2

### Audit Logging
- [ ] View audit logs page
- [ ] Audit logs show recent actions
- [ ] Audit logs include user, action, timestamp
- [ ] Lead detail drawer shows lead-specific audit trail

## 🏗️ Architecture & Design Decisions

### Dynamic Columns: JSON vs Database Schema
**Implementation**: We use JSON `custom_fields` column for dynamic data.

**Pros**:
- No schema migrations needed for new columns
- Flexible and fast to add columns via UI
- Perfect for in-memory storage
- Easy to version and rollback

**Cons**:
- Cannot index custom fields for performance
- Type safety is runtime, not compile-time
- Querying custom fields is more complex

**Migration Path**: For production with PostgreSQL, consider JSONB columns (indexed) or implement proper migrations for frequently-queried custom columns.

### Storage
**Current**: `PgStorage` (PostgreSQL via Drizzle ORM + `pg`) whenever `DATABASE_URL` is set; `MemStorage` (Map-based, in-memory) is used only in dev/tests without a database. Production refuses to start without `DATABASE_URL`.
5. No changes needed to routes or frontend

## 🚀 Future Improvements

### Immediate Next Steps
1. **PostgreSQL Migration**: Move from in-memory to persistent database
2. **Email Notifications**: Send alerts for new leads, status changes
3. **WhatsApp Integration**: Send messages directly from CRM
4. **Advanced Filtering**: Saved filter presets, complex AND/OR conditions
5. **Calendar View**: Visualize visits and follow-ups on calendar

### Scalability Enhancements
1. **Full-text Search**: Elasticsearch or PostgreSQL full-text search
2. **Caching Layer**: Redis for frequently accessed data
3. **File Attachments**: S3/Cloudinary integration for lead documents
4. **Import Leads**: CSV/XLSX bulk import with field mapping
5. **Custom Fields Indexing**: Hybrid approach for commonly-queried custom fields

### Advanced Features
1. **Email/SMS Campaigns**: Bulk communication with templates
2. **Pipeline Views**: Kanban boards for lead progression
3. **Team Analytics**: Individual performance tracking
4. **Automated Workflows**: Trigger actions based on lead status changes
5. **Mobile App**: Native iOS/Android apps
6. **API Rate Plans**: Public API with usage-based pricing
7. **Multi-language Support**: i18n for global teams
8. **Advanced RBAC**: Field-level permissions, custom roles

## 🐛 Troubleshooting

### Application won't start
- Check that all environment variables are set (Replit Secrets, or the
  environment-variable panel of whatever host you are on — see `.env.example`)
- Ensure Node.js 20+ is being used
- Check Console for error messages

### Can't login
- Verify you're using the correct email/password
- Check browser console for network errors
- Ensure JWT_SECRET is set correctly

### Webhook not working
- Verify X-API-KEY header matches HMAC_SECRET
- Check sheet_id exists and is correct
- Review webhook logs in the UI for error messages

### Realtime updates not working
- Check that Socket.io connection is established (browser console)
- Verify both users are viewing the same sheet
- Ensure firewall isn't blocking WebSocket connections

## 📄 License

This project is provided as-is for educational and commercial use.

## 👥 Support

For questions or issues:
1. Check this README thoroughly
2. Review the code comments
3. Check browser and server console logs
4. Review audit logs and webhook logs in the UI

---

Built with ❤️ for efficient lead management
