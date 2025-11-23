# LeadAni LFS Design Guidelines

## Design Approach

**Selected Approach**: Design System + Industry Reference Hybrid

Drawing inspiration from data-intensive productivity tools (Airtable, Linear, Notion) combined with Material Design principles for information-dense applications. This lead management system requires exceptional data readability, efficient workflows, and minimal cognitive load for users managing large datasets.

## Core Design Elements

### A. Typography

**Font Stack**: Inter (via Google Fonts CDN)
- Primary: Inter (400, 500, 600, 700)
- Monospace (for data/IDs): JetBrains Mono (400, 500)

**Type Scale**:
- Page Headers: text-2xl/text-3xl, font-semibold
- Section Headers: text-lg/text-xl, font-semibold
- Card/Panel Titles: text-base, font-medium
- Body/Data: text-sm, font-normal
- Table Headers: text-xs, font-medium, uppercase, tracking-wide
- Table Cells: text-sm, font-normal
- Labels: text-xs, font-medium
- Helper Text: text-xs, font-normal

### B. Layout System

**Spacing Primitives**: Use Tailwind units of 2, 3, 4, 6, 8, 12, 16
- Component padding: p-4, p-6
- Section spacing: space-y-6, space-y-8
- Grid gaps: gap-4, gap-6
- Input fields: p-3, px-4
- Card padding: p-6
- Modal padding: p-8

**Grid Structure**:
- Main application: Sidebar (240px fixed) + Main content area (flex-1)
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Reports: grid-cols-1 lg:grid-cols-2 for charts
- Form layouts: grid-cols-1 md:grid-cols-2 with gap-6

### C. Component Library

**Navigation**
- Top Bar: Fixed height (h-16), contains workspace selector, user menu, notifications
- Sidebar: Fixed left (w-60), collapsible on mobile, contains sheet navigation, main menu items
- Breadcrumbs: text-sm with slash separators for deep navigation

**Data Display - Spreadsheet Grid**
- Table container: border, rounded-lg, overflow-auto
- Header row: sticky top-0, font-medium, text-xs, uppercase, tracking-wide
- Cell height: h-10, consistent across all rows
- Cell padding: px-3, py-2
- Editable cells: Double-click to edit, Enter to save, Esc to cancel
- Dropdown cells: Chevron indicator on right, opens below cell
- Row hover: Subtle treatment for discoverability
- Selected rows: Checkbox on left, visible selection state
- Column resize: Draggable handles between headers
- Frozen columns: Name and key identifier columns sticky-left

**Forms & Inputs**
- Input fields: h-10, rounded-md, border, px-4, focus:ring-2
- Dropdowns: Same height as inputs, chevron-down icon
- Date pickers: Calendar icon on right
- Checkboxes/Radio: w-4 h-4, rounded (checkbox) or rounded-full (radio)
- Text areas: min-h-24, resize-y
- Field labels: text-sm, font-medium, mb-2
- Error states: border-red, text-red-600, text-xs below field
- Field groups: space-y-4

**Cards & Panels**
- Dashboard cards: rounded-lg, border, p-6, min-h-32
- Stat cards: Large number (text-3xl, font-bold), label below (text-sm)
- Panel sections: space-y-6, divide-y for multiple sections

**Buttons**
- Primary CTA: px-4, py-2, rounded-md, font-medium, text-sm
- Secondary: Same size, border variant
- Icon buttons: w-8, h-8, rounded-md, centered icon
- Bulk actions bar: Fixed bottom with shadow-up when rows selected

**Modals & Drawers**
- Modal overlay: Full screen with backdrop
- Modal content: max-w-2xl (standard), max-w-4xl (wide), max-w-6xl (extra-wide for column manager)
- Modal header: pb-4, border-b, text-xl, font-semibold
- Modal body: py-6, max-h-[60vh], overflow-y-auto
- Modal footer: pt-4, border-t, flex justify-end, gap-3
- Side drawer (Lead detail): Fixed right, w-96, full height, slide-in animation

**Dropdown Management Modal**
- List of options with drag handles for reordering
- Each option: flex items between name and delete icon, h-10
- Add option input at bottom with plus icon button
- Live preview showing how dropdown appears in grid

**Reports & Charts**
- Chart containers: aspect-video, p-4
- Chart titles: text-base, font-medium, mb-4
- Filters bar: flex wrap, gap-3, items-center, mb-6
- Date range picker: Two date inputs with "to" between them
- Export button: Top-right of report section

**Admin Console**
- Two-column layout: Users list (left) + Sheet management (right)
- User cards: flex items-center, gap-4, p-4, border-b
- Global stats: grid-cols-4, prominent numbers
- Activity feed: Timeline style with timestamps on left

**Notifications & Alerts**
- Toast notifications: Fixed top-right, max-w-sm, slide-in
- Inline alerts: p-4, rounded-md, flex gap-3, icon + message
- Real-time indicators: Small badge with pulse animation

**Loading States**
- Table skeleton: Shimmer animation on rows
- Spinner: w-5 h-5 for buttons, w-8 h-8 for page loading
- Progress bar: h-1, rounded-full, for long operations

**Empty States**
- Centered icon (w-16 h-16), heading, description, CTA button
- Min height to avoid layout shift when data loads

### D. Responsive Behavior

**Breakpoints**:
- Mobile: Stack sidebar as drawer, single column forms/grids
- Tablet (md): Two-column layouts, sidebar visible
- Desktop (lg+): Full multi-column dashboards, optimal grid density

**Mobile Adaptations**:
- Spreadsheet: Horizontal scroll with frozen first column
- Filters: Collapse into dropdown menu
- Bulk actions: Bottom sheet instead of fixed bar
- Modals: Full screen on mobile

## Application-Specific Guidelines

**Spreadsheet Grid Enhancements**:
- Quick actions menu: Right-click or three-dot menu per row
- Inline add row: Plus icon button at bottom of visible rows
- Column menu: Dropdown on header for hide/show/freeze/sort
- Filter chips: Below headers showing active filters, dismissible

**Sheet Switcher**:
- Dropdown in top bar showing current sheet name
- List shows sheet name, owner, last updated
- Quick actions: Star favorite sheets, recent sheets section

**Webhook Logs**:
- Table with timestamp, status badge, payload preview
- Expandable rows showing full JSON payload
- Filter by status (success/error), date range

**Audit Trail**:
- Timeline view with user avatar, action description, timestamp
- Filterable by user, action type, date range
- Expandable to show before/after values

## Accessibility & Interaction

- Focus visible on all interactive elements (ring-2, ring-offset-2)
- Keyboard navigation: Tab through cells, arrow keys to move in grid
- Screen reader labels on all icon-only buttons
- Skip navigation link for keyboard users
- Sufficient contrast for all text and interactive elements