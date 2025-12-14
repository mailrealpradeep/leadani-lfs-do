# Hidden Features Documentation

This document tracks features that have been intentionally hidden (but not fully removed) from the application.

---

## Hot Leads Feature

**Status:** HIDDEN  
**Date Hidden:** December 2025  
**Hidden By:** User request  

### Why Hidden
The Hot Leads feature functionality is now covered by the **Custom Views** feature, which provides more flexibility:
- Custom Views supports the same condition-based lead filtering
- Custom Views allows multiple filtered views with custom icons and badges
- Having both features created redundancy in the UI

### What Was Hidden

1. **Sidebar Menu Item** - `client/src/components/app-sidebar.tsx`
   - Commented out the "Hot Leads" menu item with Flame icon
   - Lines ~287-298

2. **Admin Panel Configuration** - `client/src/pages/admin.tsx`
   - Commented out the "Hot Leads" AccordionItem in the admin settings
   - Lines ~943-966

### Files NOT Modified (Still Exist)
These files were left in place for easy restoration:
- `client/src/pages/hot-leads.tsx` - The Hot Leads page component
- `client/src/components/hot-leads-config.tsx` - The configuration manager
- `client/src/components/spreadsheet-grid.tsx` - Contains `hotLeadsMode` prop
- `client/src/App.tsx` - Contains `/hot-leads` route
- Backend API routes for hot leads configuration
- Database table: `hot_leads_config`

### How to Restore

1. **Restore Sidebar Menu:**
   Open `client/src/components/app-sidebar.tsx` and uncomment the Hot Leads menu item (search for "HOT LEADS FEATURE HIDDEN")

2. **Restore Admin Panel:**
   Open `client/src/pages/admin.tsx` and uncomment the Hot Leads AccordionItem (search for "HOT LEADS FEATURE HIDDEN")

### How to Fully Remove (If Decided Later)

If you decide to permanently remove Hot Leads, you would need to:
1. Delete `client/src/pages/hot-leads.tsx`
2. Delete `client/src/components/hot-leads-config.tsx`
3. Remove the `/hot-leads` route from `client/src/App.tsx`
4. Remove `hotLeadsMode` prop handling from `spreadsheet-grid.tsx`
5. Remove related API routes from `server/routes.ts`
6. Remove `hot_leads_config` table and related storage methods
7. Clean up the commented code in sidebar and admin panel

---

*Last Updated: December 2025*
