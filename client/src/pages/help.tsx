import { useState, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, Sparkles } from "lucide-react";
import {
  Search,
  ChevronLeft,
  HelpCircle,
  Users,
  FileSpreadsheet,
  Upload,
  Copy,
  BarChart3,
  Webhook,
  Target,
  Clock,
  Palette,
  Filter,
  Settings,
  Database,
  Smartphone,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  X,
} from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string[];
  tips?: string[];
}

interface FAQCategory {
  id: string;
  name: string;
  icon: any;
  description: string;
  questions: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    id: "getting-started",
    name: "Getting Started",
    icon: BookOpen,
    description: "First steps, login, navigation, and basic setup",
    questions: [
      {
        id: "gs-1",
        question: "How to log in to LeadAni?",
        answer: [
          "Go to the LeadAni login page",
          "Enter your email address that was registered by your admin",
          "Enter your password",
          "Click the 'Sign In' button",
          "If this is your first login, you may be asked to set a new password"
        ],
        tips: ["If you forgot your password, contact your company admin to reset it"]
      },
      {
        id: "gs-2",
        question: "What is the Dashboard?",
        answer: [
          "The Dashboard is your main workspace where you view and manage leads",
          "It shows a spreadsheet-like grid with all leads assigned to your sheet",
          "You can add, edit, filter, and search leads from here",
          "The sidebar on the left helps you navigate to other sections"
        ]
      },
      {
        id: "gs-3",
        question: "How to navigate between different sections?",
        answer: [
          "Use the sidebar on the left side of the screen",
          "Click the menu icon (three lines) if the sidebar is collapsed",
          "Available sections include: Dashboard, Reports, Team Performance, Attendance, and more",
          "Admins see additional options like Admin Console and Webhooks"
        ]
      },
      {
        id: "gs-4",
        question: "How to switch between sheets?",
        answer: [
          "Look at the top of the Dashboard",
          "You'll see a dropdown or tabs showing available sheets",
          "Click on a sheet name to switch to it",
          "You can only see sheets that your admin has given you access to"
        ]
      },
      {
        id: "gs-5",
        question: "How to change my password?",
        answer: [
          "Click on your profile icon in the sidebar",
          "Select 'Change Password' or 'Profile Settings'",
          "Enter your current password",
          "Enter your new password twice to confirm",
          "Click 'Save' to update your password"
        ],
        tips: ["Use a strong password with letters, numbers, and symbols"]
      },
      {
        id: "gs-6",
        question: "What are the different user roles?",
        answer: [
          "Super Admin: Platform-level access, manages all companies",
          "Company Admin: Full access to company settings, users, and all sheets",
          "User: Access only to assigned sheets, can manage leads within those sheets"
        ]
      },
      {
        id: "gs-7",
        question: "How to install LeadAni as an app on my phone?",
        answer: [
          "Open LeadAni in your mobile browser (Chrome or Safari)",
          "Look for the 'Install' or 'Add to Home Screen' prompt",
          "On Android: Tap the menu (three dots) and select 'Add to Home Screen'",
          "On iPhone: Tap the Share button and select 'Add to Home Screen'",
          "The app icon will appear on your home screen"
        ],
        tips: ["Installing as an app gives you a better mobile experience with full-screen mode"]
      },
      {
        id: "gs-8",
        question: "How to switch between light and dark mode?",
        answer: [
          "Look for the sun/moon icon in the header area",
          "Click it to toggle between light and dark themes",
          "Your preference is saved automatically"
        ]
      },
      {
        id: "gs-9",
        question: "What browsers work best with LeadAni?",
        answer: [
          "Google Chrome (recommended)",
          "Microsoft Edge",
          "Mozilla Firefox",
          "Safari (for Mac/iPhone users)",
          "Make sure your browser is updated to the latest version"
        ]
      },
      {
        id: "gs-10",
        question: "How to log out?",
        answer: [
          "Click on your profile section in the sidebar",
          "Click 'Logout' or 'Sign Out'",
          "You will be redirected to the login page"
        ],
        tips: ["Always log out when using a shared or public computer"]
      }
    ]
  },
  {
    id: "lead-management",
    name: "Lead Management",
    icon: Users,
    description: "Add, edit, delete, and manage leads",
    questions: [
      {
        id: "lm-1",
        question: "How to add a new lead?",
        answer: [
          "Go to the Dashboard and select your sheet",
          "Click the '+ Add Lead' button (usually at the top or bottom of the grid)",
          "Fill in the required fields (typically Full Name and Mobile Number)",
          "Fill in any additional custom fields your company has set up",
          "Click 'Save' or 'Add Lead' to create the lead"
        ],
        tips: ["Mobile number is usually the unique identifier - duplicate numbers are not allowed"]
      },
      {
        id: "lm-2",
        question: "How to edit a lead?",
        answer: [
          "Find the lead in your sheet",
          "Click on the lead row to open the lead details",
          "Or double-click on a specific cell to edit it directly",
          "Make your changes",
          "Changes are saved automatically or click 'Save' when done"
        ]
      },
      {
        id: "lm-3",
        question: "How to delete a lead?",
        answer: [
          "Find the lead you want to delete",
          "Click on the lead to open its details",
          "Look for the 'Delete' button (usually with a trash icon)",
          "Confirm the deletion when prompted",
          "Deleted leads go to a 'Deleted' section and can be recovered within 30 days"
        ],
        tips: ["Deletion is soft-delete - your admin can recover deleted leads if needed"]
      },
      {
        id: "lm-4",
        question: "How to recover a deleted lead?",
        answer: [
          "Only admins can recover deleted leads",
          "Go to the Admin Console",
          "Look for 'Deleted Leads' or 'Recovery' section",
          "Find the lead you want to restore",
          "Click 'Restore' to bring it back to the active sheet"
        ]
      },
      {
        id: "lm-5",
        question: "How to search for a specific lead?",
        answer: [
          "Use the search bar at the top of the Dashboard",
          "Type the name, mobile number, or any keyword",
          "Results will filter as you type",
          "Click on a result to view the lead details"
        ]
      },
      {
        id: "lm-6",
        question: "How to filter leads by status or other fields?",
        answer: [
          "Look for the filter options above the lead grid",
          "Click on a filter (like Status, Source, or any custom field)",
          "Select the values you want to filter by",
          "The grid will show only matching leads",
          "To clear filters, click 'Clear Filters' or the X button"
        ]
      },
      {
        id: "lm-7",
        question: "How to sort leads by a column?",
        answer: [
          "Click on any column header in the grid",
          "Click once for ascending order (A-Z, oldest first)",
          "Click again for descending order (Z-A, newest first)",
          "A small arrow shows the current sort direction"
        ]
      },
      {
        id: "lm-8",
        question: "How to add a follow-up note to a lead?",
        answer: [
          "Click on the lead to open its details",
          "Look for 'Add Update' or 'Add Note' section",
          "Type your follow-up note",
          "Optionally set a next follow-up date",
          "Click 'Add' or 'Save' to record the update"
        ],
        tips: ["Regular follow-up notes help track your conversation history with each lead"]
      },
      {
        id: "lm-9",
        question: "What is 'Lead Thought' (Sure/May Be)?",
        answer: [
          "Lead Thought is a quick way to mark your confidence level about a lead",
          "'Sure' means you're confident this lead will convert",
          "'May Be' means the lead shows potential but needs more follow-up",
          "This helps prioritize your leads visually with different colors",
          "Click on the Lead Thought indicator to change it"
        ]
      },
      {
        id: "lm-10",
        question: "How to see the history of changes to a lead?",
        answer: [
          "Open the lead details by clicking on it",
          "Look for 'Updates' or 'History' tab/section",
          "You'll see all changes with timestamps and who made them",
          "This includes status changes, notes added, and field updates"
        ]
      },
      {
        id: "lm-11",
        question: "How to set a next follow-up date for a lead?",
        answer: [
          "Open the lead details",
          "Find the follow-up date field (may be called 'Next Follow-up' or similar)",
          "Click to open the date picker",
          "Select the date and optionally the time",
          "Save the changes"
        ],
        tips: ["Leads with upcoming follow-up dates are often highlighted for easy visibility"]
      },
      {
        id: "lm-12",
        question: "How to view only my leads vs all leads?",
        answer: [
          "Look for a filter or toggle at the top of the grid",
          "Options may include 'My Leads', 'All Leads', or similar",
          "Select 'My Leads' to see only leads assigned to you",
          "This depends on how your company has configured the system"
        ]
      },
      {
        id: "lm-13",
        question: "How to change the status of a lead?",
        answer: [
          "Click on the lead to open it, or double-click the status cell",
          "Click on the Status dropdown",
          "Select the new status from the available options",
          "The change is saved automatically"
        ],
        tips: ["Status options are customized by your company admin - ask them if you need new options"]
      },
      {
        id: "lm-14",
        question: "How to bulk select multiple leads?",
        answer: [
          "Look for checkboxes on the left side of each lead row",
          "Click the checkbox next to each lead you want to select",
          "Or click the 'Select All' checkbox in the header to select all visible leads",
          "A toolbar will appear with bulk action options"
        ]
      },
      {
        id: "lm-15",
        question: "How to transfer leads to another sheet?",
        answer: [
          "Select the leads you want to transfer using checkboxes",
          "Look for 'Transfer' or 'Move' option in the bulk actions toolbar",
          "Select the destination sheet",
          "Confirm the transfer",
          "Leads will be moved to the new sheet"
        ],
        tips: ["Only admins may have permission to transfer leads between sheets"]
      },
      {
        id: "lm-16",
        question: "What happens when I try to add a lead with a duplicate mobile number?",
        answer: [
          "The system will detect the duplicate automatically",
          "You'll see a message showing the existing lead details",
          "You can choose to: Merge with existing lead, Skip adding, or View the existing lead",
          "This prevents duplicate entries in your system"
        ]
      },
      {
        id: "lm-17",
        question: "How to copy a lead's information?",
        answer: [
          "Open the lead details",
          "Look for a 'Copy' button or right-click for copy options",
          "You can copy the mobile number, full details, or specific fields",
          "Paste wherever needed"
        ]
      },
      {
        id: "lm-18",
        question: "How to see leads that need follow-up today?",
        answer: [
          "Use the quick filter options at the top of the grid",
          "Look for 'Today's Follow-ups' or similar filter",
          "Or filter by the follow-up date column",
          "Leads with today's date will be shown"
        ]
      },
      {
        id: "lm-19",
        question: "How to add a lead from the lead queue?",
        answer: [
          "Go to the Lead Queue section (if available)",
          "Review the pending leads from webhooks or imports",
          "Click 'Push to CRM' or 'Add to Sheet'",
          "The lead will be added to the selected sheet"
        ]
      },
      {
        id: "lm-20",
        question: "How to see all leads across multiple sheets?",
        answer: [
          "This feature is usually available for Admins only",
          "Go to Reports section",
          "Create a report that includes multiple sheets",
          "You'll see aggregated data across all selected sheets"
        ]
      }
    ]
  },
  {
    id: "import-export",
    name: "Import & Export",
    icon: Upload,
    description: "Import leads from Excel/CSV, export data",
    questions: [
      {
        id: "ie-1",
        question: "How to import leads from an Excel file?",
        answer: [
          "Go to the Dashboard and select your target sheet",
          "Click 'Import' button (usually at the top)",
          "Click 'Choose File' and select your Excel (.xlsx) or CSV file",
          "The system will show a preview of your data",
          "Map your file columns to the CRM fields",
          "Review and confirm the import",
          "Leads will be added to your sheet"
        ],
        tips: ["Prepare your file with column headers that match your CRM fields for easier mapping"]
      },
      {
        id: "ie-2",
        question: "What file formats are supported for import?",
        answer: [
          "Excel files (.xlsx, .xls)",
          "CSV files (.csv)",
          "Make sure your file has headers in the first row",
          "Maximum file size varies - check with your admin if you have a large file"
        ]
      },
      {
        id: "ie-3",
        question: "How to map columns during import?",
        answer: [
          "After uploading your file, you'll see a column mapping screen",
          "Each column from your file is shown on the left",
          "Use the dropdown on the right to select the matching CRM field",
          "Required fields (like Full Name and Mobile) must be mapped",
          "You can skip columns you don't want to import"
        ]
      },
      {
        id: "ie-4",
        question: "What happens to duplicate leads during import?",
        answer: [
          "The system checks for duplicates using mobile number",
          "After mapping, you'll see a 'Duplicates' review step",
          "For each duplicate, you can choose to: Skip, Merge, or Add Anyway",
          "Use 'Skip All Duplicates' for bulk action",
          "This prevents accidentally creating duplicate records"
        ]
      },
      {
        id: "ie-5",
        question: "How to export leads to Excel?",
        answer: [
          "Go to the Dashboard with your sheet selected",
          "Click the 'Export' button",
          "Choose which columns to include (or export all)",
          "Select the format (Excel or CSV)",
          "The file will download to your computer"
        ]
      },
      {
        id: "ie-6",
        question: "Can I export only filtered leads?",
        answer: [
          "Yes! Apply your filters first",
          "Then click Export",
          "Only the currently visible/filtered leads will be exported",
          "This is useful for exporting specific segments"
        ]
      },
      {
        id: "ie-7",
        question: "How to export leads with their update history?",
        answer: [
          "During export, look for 'Include Updates' option",
          "Check this option to include follow-up notes in the export",
          "Each lead row may include recent update history",
          "The export format will be adjusted to include this data"
        ]
      },
      {
        id: "ie-8",
        question: "Why are some leads failing to import?",
        answer: [
          "Check if required fields are missing (Full Name, Mobile)",
          "Verify mobile numbers are in correct format (10 digits)",
          "Look for invalid characters in your data",
          "Check if the data matches expected dropdown values",
          "Review the error summary after import for specific issues"
        ]
      },
      {
        id: "ie-9",
        question: "How to prepare my Excel file for import?",
        answer: [
          "Use the first row for column headers",
          "Keep mobile numbers as text to preserve leading zeros",
          "Remove any special formatting (colors, formulas)",
          "Ensure dropdown values match exactly what's in the CRM",
          "Check for and remove empty rows"
        ],
        tips: ["Download a sample export first to see the expected format"]
      },
      {
        id: "ie-10",
        question: "Can I import leads to multiple sheets at once?",
        answer: [
          "Standard import adds leads to one sheet at a time",
          "For distributing leads across sheets, use webhooks with allocation rules",
          "Or import to one sheet and use the Transfer feature",
          "Contact your admin for bulk distribution needs"
        ]
      },
      {
        id: "ie-11",
        question: "How to download an import template?",
        answer: [
          "Go to the Import section",
          "Look for 'Download Template' link",
          "This gives you a pre-formatted file with correct columns",
          "Fill in your data following the template format",
          "Upload the completed file for import"
        ]
      }
    ]
  },
  {
    id: "duplicate-handling",
    name: "Duplicate Handling",
    icon: Copy,
    description: "How duplicates are detected and managed",
    questions: [
      {
        id: "dh-1",
        question: "How does LeadAni detect duplicate leads?",
        answer: [
          "The mobile number is the unique identifier",
          "The system normalizes mobile numbers (removes spaces, dashes, +, country codes)",
          "It compares the last 10 digits of mobile numbers",
          "Duplicates are detected when adding, importing, or via webhooks"
        ]
      },
      {
        id: "dh-2",
        question: "What happens when I try to add a duplicate lead manually?",
        answer: [
          "A dialog will appear showing the existing lead details",
          "You can see where the existing lead is and who's handling it",
          "Options: 'Merge' to combine data, or 'Don't Add' to cancel",
          "Merging will update the existing lead with new information"
        ]
      },
      {
        id: "dh-3",
        question: "How are duplicates handled during bulk import?",
        answer: [
          "After column mapping, a separate 'Duplicates' step appears",
          "All detected duplicates are listed with existing lead details",
          "You can handle each individually: Skip, Merge, or Add Anyway",
          "Or use bulk buttons: 'Skip All Duplicates' or 'Merge All'",
          "Continue import after resolving duplicates"
        ]
      },
      {
        id: "dh-4",
        question: "How do webhooks handle duplicate leads?",
        answer: [
          "Webhooks can be configured with a 'match_mode':",
          "create_new: Always creates new lead (may create duplicates)",
          "update_existing: Updates the existing lead if found",
          "skip_duplicate: Ignores the lead if duplicate exists",
          "Configure this in Admin Console > Webhooks"
        ]
      },
      {
        id: "dh-5",
        question: "How to merge two duplicate leads?",
        answer: [
          "When the duplicate detection dialog appears, click 'Merge'",
          "The new data will be added to the existing lead",
          "Existing fields are preserved unless explicitly overwritten",
          "A note may be added to track the merge"
        ]
      },
      {
        id: "dh-6",
        question: "Can I have the same mobile number in different sheets?",
        answer: [
          "No - mobile number uniqueness is typically company-wide",
          "This prevents the same customer from being in multiple sheets",
          "If a lead needs to be moved, use the Transfer feature",
          "Contact your admin if you have a specific use case"
        ]
      },
      {
        id: "dh-7",
        question: "How to find and clean up existing duplicates?",
        answer: [
          "Use Reports to identify leads with similar details",
          "Filter by mobile number to find potential matches",
          "Manually review and merge as needed",
          "Or contact your admin for bulk duplicate cleanup"
        ]
      },
      {
        id: "dh-8",
        question: "What data is compared when checking for duplicates?",
        answer: [
          "Primary: Mobile number (last 10 digits)",
          "The system strips spaces, dashes, plus signs, and country codes",
          "Example: '+91 98765-43210' matches '9876543210'",
          "Only mobile number is used - name matching is not automatic"
        ]
      }
    ]
  },
  {
    id: "sheet-management",
    name: "Sheet Management",
    icon: FileSpreadsheet,
    description: "Create sheets, manage columns and dropdowns",
    questions: [
      {
        id: "sm-1",
        question: "How to create a new sheet?",
        answer: [
          "Only Admins can create new sheets",
          "Go to Admin Console > Sheets section",
          "Click '+ Add Sheet' or 'Create New Sheet'",
          "Enter a name for the sheet",
          "The sheet is created with default columns (Full Name, Mobile)",
          "Add custom columns as needed"
        ]
      },
      {
        id: "sm-2",
        question: "How to rename a sheet?",
        answer: [
          "Go to Admin Console > Sheets",
          "Find the sheet you want to rename",
          "Click the edit icon or sheet settings",
          "Change the name",
          "Save your changes"
        ]
      },
      {
        id: "sm-3",
        question: "How to delete a sheet?",
        answer: [
          "Only Admins can delete sheets",
          "Go to Admin Console > Sheets",
          "Find the sheet and click Delete",
          "You may need to enter a confirmation password",
          "Deleted sheets can be recovered within 30 days"
        ],
        tips: ["Deleting a sheet will also soft-delete all leads in that sheet"]
      },
      {
        id: "sm-4",
        question: "How to add a new column to a sheet?",
        answer: [
          "Go to Admin Console > Columns or Sheet Settings",
          "Click 'Add Column'",
          "Enter the column name",
          "Select the column type (Text, Number, Date, Dropdown, etc.)",
          "Configure any additional options",
          "Save the column"
        ]
      },
      {
        id: "sm-5",
        question: "What column types are available?",
        answer: [
          "Text: For names, notes, and free-form text",
          "Number: For numeric values",
          "Date: For dates with date picker",
          "DateTime: For date and time values",
          "Dropdown: For predefined options (like Status, Source)",
          "Checkbox: For yes/no values",
          "Each type has specific validation and display options"
        ]
      },
      {
        id: "sm-6",
        question: "How to add options to a dropdown column?",
        answer: [
          "Go to Admin Console > Dropdown Options",
          "Select the column (e.g., Status, Source)",
          "Click 'Add Option'",
          "Enter the option value",
          "Optionally add a color for visual distinction",
          "Save and the option is immediately available"
        ]
      },
      {
        id: "sm-7",
        question: "How to reorder columns in the grid?",
        answer: [
          "Go to Admin Console > Columns",
          "Use drag-and-drop to reorder columns",
          "Or use up/down arrows to move columns",
          "Changes apply to all users viewing this sheet"
        ]
      },
      {
        id: "sm-8",
        question: "How to hide a column from the grid?",
        answer: [
          "Go to Admin Console > Columns",
          "Find the column you want to hide",
          "Toggle the 'Visible' or 'Show' option off",
          "The column data is preserved but hidden from the grid",
          "You can show it again anytime"
        ]
      },
      {
        id: "sm-9",
        question: "Can I make a column required?",
        answer: [
          "Yes, in Admin Console > Columns",
          "Find the column and click to edit it",
          "Enable the 'Required' option",
          "Users must fill this field when adding/editing leads",
          "Note: Full Name and Mobile are always required"
        ]
      },
      {
        id: "sm-10",
        question: "How to delete a column?",
        answer: [
          "Go to Admin Console > Columns",
          "Find the column you want to remove",
          "Click the delete button",
          "Confirm the deletion",
          "Warning: This permanently removes the column and its data"
        ],
        tips: ["Consider hiding the column instead of deleting if you might need the data later"]
      },
      {
        id: "sm-11",
        question: "What are mandatory system columns?",
        answer: [
          "Full Name and Mobile Number are system columns",
          "They cannot be deleted or hidden",
          "They are always required for every lead",
          "Mobile Number is used for duplicate detection"
        ]
      },
      {
        id: "sm-12",
        question: "How to copy column configuration to another sheet?",
        answer: [
          "Currently, columns must be configured per sheet",
          "When creating a new sheet, you may have template options",
          "Or manually recreate columns in the new sheet",
          "Contact your admin for bulk configuration needs"
        ]
      },
      {
        id: "sm-13",
        question: "How to set column width?",
        answer: [
          "In the grid view, hover between column headers",
          "Drag the border to resize the column",
          "Column widths may be saved per user",
          "Or configured globally in Admin settings"
        ]
      },
      {
        id: "sm-14",
        question: "Can different users see different columns?",
        answer: [
          "Column visibility is typically set at the sheet level",
          "All users with access to a sheet see the same visible columns",
          "Individual column hiding may be available in user preferences",
          "Contact your admin for role-based column access"
        ]
      },
      {
        id: "sm-15",
        question: "How to edit an existing dropdown option?",
        answer: [
          "Go to Admin Console > Dropdown Options",
          "Find the option you want to edit",
          "Click the edit icon",
          "Change the value or color",
          "Save changes - updates apply to all leads using this option"
        ]
      }
    ]
  },
  {
    id: "user-management",
    name: "User Management",
    icon: Users,
    description: "Invite users, manage roles and permissions",
    questions: [
      {
        id: "um-1",
        question: "How to invite a new user to my company?",
        answer: [
          "Only Admins can invite users",
          "Go to Admin Console > Users",
          "Click 'Invite User' or '+ Add User'",
          "Enter the user's email address",
          "Select their role (Admin or User)",
          "Click 'Send Invite'",
          "The user will receive an email to set up their account"
        ]
      },
      {
        id: "um-2",
        question: "What's the difference between Admin and User roles?",
        answer: [
          "Company Admin:",
          "- Can access Admin Console and all settings",
          "- Can create/edit sheets, columns, and dropdown options",
          "- Can invite and manage other users",
          "- Can view all sheets and leads",
          "",
          "User:",
          "- Can only access sheets assigned to them",
          "- Cannot access Admin Console",
          "- Can manage leads within their assigned sheets",
          "- Limited to their own attendance and targets"
        ]
      },
      {
        id: "um-3",
        question: "How to give a user access to a sheet?",
        answer: [
          "Go to Admin Console > Users",
          "Find the user and click 'Manage' or 'Sheet Access'",
          "Click 'Add Sheet'",
          "Select the sheet from the list",
          "The user can now access that sheet"
        ]
      },
      {
        id: "um-4",
        question: "How to remove a user's access to a sheet?",
        answer: [
          "Go to Admin Console > Users",
          "Find the user and open their sheet access",
          "Click the 'Remove' or X button next to the sheet",
          "Confirm the removal",
          "The user can no longer see that sheet"
        ]
      },
      {
        id: "um-5",
        question: "How to change a user's role?",
        answer: [
          "Go to Admin Console > Users",
          "Find the user",
          "Click on their role to change it",
          "Select the new role (Admin or User)",
          "Save the change"
        ],
        tips: ["Be careful when demoting an admin - they'll lose access to admin features"]
      },
      {
        id: "um-6",
        question: "How to reset a user's password?",
        answer: [
          "Go to Admin Console > Users",
          "Find the user",
          "Click 'Reset Password' option",
          "A new temporary password may be generated",
          "Share this with the user securely",
          "They should change it on first login"
        ]
      },
      {
        id: "um-7",
        question: "How to delete a user?",
        answer: [
          "Go to Admin Console > Users",
          "Find the user you want to remove",
          "Click 'Delete' or 'Remove User'",
          "Confirm the deletion",
          "The user's data (leads they created, audit history) is preserved",
          "They can no longer log in"
        ]
      },
      {
        id: "um-8",
        question: "What happens to leads when a user is deleted?",
        answer: [
          "Leads remain in the system - they are not deleted",
          "Audit history shows the deleted user's name",
          "Leads can be reassigned to other users",
          "The user's created_by records are preserved for history"
        ]
      },
      {
        id: "um-9",
        question: "How to see who has access to a sheet?",
        answer: [
          "Go to Admin Console > Sheets",
          "Click on the sheet to view its details",
          "The 'Users' or 'Access' section shows all assigned users",
          "You can add or remove users from here too"
        ]
      },
      {
        id: "um-10",
        question: "Can a user have access to multiple sheets?",
        answer: [
          "Yes, users can be assigned to multiple sheets",
          "They can switch between sheets using the sheet selector",
          "Each sheet access is independent",
          "An admin can assign any number of sheets"
        ]
      },
      {
        id: "um-11",
        question: "How do new users accept their invitation?",
        answer: [
          "They receive an email with an invitation link",
          "Clicking the link takes them to a signup page",
          "They enter their name and create a password",
          "After completing, they can log in immediately"
        ]
      },
      {
        id: "um-12",
        question: "Can I resend an invitation?",
        answer: [
          "Go to Admin Console > Users",
          "Find the pending invitation",
          "Click 'Resend Invite'",
          "A new email will be sent to the user",
          "Previous invitation links may still work"
        ]
      }
    ]
  },
  {
    id: "reports",
    name: "Reports",
    icon: BarChart3,
    description: "Create reports, analyze data, team performance",
    questions: [
      {
        id: "rp-1",
        question: "How to create a new report?",
        answer: [
          "Go to the Reports section from the sidebar",
          "Click 'Create Report' or '+ New Report'",
          "Give your report a name",
          "Select which sheet(s) to include",
          "Choose columns to display",
          "Add any filters (date range, status, etc.)",
          "Save the report"
        ]
      },
      {
        id: "rp-2",
        question: "How to filter a report by date?",
        answer: [
          "In the report builder or view, find the date filter",
          "Select a preset range (Today, This Week, This Month, etc.)",
          "Or choose 'Custom Range' for specific dates",
          "Select the start and end dates",
          "Apply the filter to update the report"
        ]
      },
      {
        id: "rp-3",
        question: "How to group report data?",
        answer: [
          "In the report builder, look for 'Group By' option",
          "Select the column to group by (e.g., Status, Source, User)",
          "The report will show counts/data grouped by that field",
          "You can drill down into each group for details"
        ]
      },
      {
        id: "rp-4",
        question: "What is drill-down in reports?",
        answer: [
          "Drill-down lets you see the details behind summary numbers",
          "Click on a group or number in the report",
          "You'll see the individual leads that make up that number",
          "Use this to understand what's behind your metrics"
        ]
      },
      {
        id: "rp-5",
        question: "How to export a report?",
        answer: [
          "Open the report you want to export",
          "Click the 'Export' or 'Download' button",
          "Choose the format (Excel or CSV)",
          "The file will download with your report data"
        ]
      },
      {
        id: "rp-6",
        question: "How to view Team Performance?",
        answer: [
          "Go to Team Performance from the sidebar",
          "You'll see performance metrics for all team members",
          "Data includes leads count, conversions, calls, etc.",
          "Filter by date range to see specific periods",
          "Click on a user to see their detailed performance"
        ]
      },
      {
        id: "rp-7",
        question: "Can I schedule reports to run automatically?",
        answer: [
          "Automatic report scheduling may not be available",
          "You can save report configurations for quick access",
          "Run saved reports whenever needed",
          "Contact your admin for scheduled reporting needs"
        ]
      },
      {
        id: "rp-8",
        question: "How to share a report with my team?",
        answer: [
          "Save the report with a descriptive name",
          "Other users with report access can see saved reports",
          "Or export the report and share the file",
          "Report visibility depends on role permissions"
        ]
      },
      {
        id: "rp-9",
        question: "How to compare performance across time periods?",
        answer: [
          "Create a report for the first period and note the metrics",
          "Change the date filter to the second period",
          "Compare the numbers manually",
          "Some views may have comparison built in"
        ]
      },
      {
        id: "rp-10",
        question: "Why am I not seeing all data in my report?",
        answer: [
          "Check your filters - some may be limiting results",
          "Verify the date range covers the period you need",
          "Check if you have access to the sheets included",
          "Deleted leads are not included in reports"
        ]
      }
    ]
  },
  {
    id: "webhooks",
    name: "Webhooks",
    icon: Webhook,
    description: "Set up webhooks, field mapping, allocation rules",
    questions: [
      {
        id: "wh-1",
        question: "What is a webhook?",
        answer: [
          "A webhook is a way to automatically receive leads from external sources",
          "When someone fills a form on your website, the data is sent to LeadAni",
          "Leads are created automatically without manual entry",
          "Common sources: Facebook Lead Ads, Google Forms, landing pages"
        ]
      },
      {
        id: "wh-2",
        question: "How to create a new webhook?",
        answer: [
          "Go to Webhooks section (Admin only)",
          "Click 'Create Webhook' or '+ New'",
          "Give your webhook a name (e.g., 'Facebook Leads')",
          "Configure the field mapping (see next question)",
          "Set up allocation rules to determine which sheet receives leads",
          "Save and copy the webhook URL"
        ]
      },
      {
        id: "wh-3",
        question: "How to map webhook fields to CRM fields?",
        answer: [
          "After creating a webhook, go to Field Mapping",
          "You'll see incoming field names on the left",
          "Select the matching CRM field on the right",
          "Map at least: name field to 'Full Name', phone to 'Mobile'",
          "Map other fields as needed",
          "Save the mapping"
        ],
        tips: ["If you haven't received test data, send a test lead first to see field names"]
      },
      {
        id: "wh-4",
        question: "What are allocation rules?",
        answer: [
          "Allocation rules determine which sheet receives incoming leads",
          "You can set conditions like: if Source = 'Facebook', go to Sheet A",
          "Multiple conditions can be combined with AND/OR logic",
          "Leads can be split across multiple sheets by percentage",
          "Example: 40% to Sheet A, 30% to Sheet B, 30% to Sheet C"
        ]
      },
      {
        id: "wh-5",
        question: "How to split leads across multiple sheets?",
        answer: [
          "In the webhook allocation rules, add multiple sheets",
          "Set a percentage for each sheet (must total 100%)",
          "Example: Sales Team 1 (50%), Sales Team 2 (50%)",
          "Leads are distributed using weighted round-robin",
          "Over time, each sheet gets their target percentage"
        ]
      },
      {
        id: "wh-6",
        question: "What happens if no allocation rule matches?",
        answer: [
          "The webhook still accepts the lead (doesn't fail)",
          "The lead goes to a 'No Allocation' queue",
          "Admins are notified about unallocated leads",
          "You can manually assign these leads or update your rules"
        ],
        tips: ["Add a 'catch-all' rule with no conditions to capture all unmatched leads"]
      },
      {
        id: "wh-7",
        question: "How to test my webhook?",
        answer: [
          "Copy the webhook URL",
          "Use a tool like Postman or your form's test feature",
          "Send a test lead with sample data",
          "Check the Webhook Logs to see if it was received",
          "Verify the lead appears in the correct sheet"
        ]
      },
      {
        id: "wh-8",
        question: "How to view webhook logs?",
        answer: [
          "Go to Webhooks section",
          "Find your webhook and click to view details",
          "The Logs tab shows all received requests",
          "You can see: timestamp, status, data received, any errors"
        ]
      },
      {
        id: "wh-9",
        question: "What is 'match mode' in webhooks?",
        answer: [
          "Match mode controls how duplicates are handled:",
          "create_new: Always creates a new lead",
          "update_existing: Updates the lead if mobile number exists",
          "skip_duplicate: Ignores the incoming lead if duplicate",
          "Choose based on your workflow needs"
        ]
      },
      {
        id: "wh-10",
        question: "How to connect Facebook Lead Ads to LeadAni?",
        answer: [
          "Create a webhook in LeadAni and copy the URL",
          "In Facebook Business Manager, go to Leads Setup",
          "Add a new CRM integration or webhook",
          "Paste the LeadAni webhook URL",
          "Map Facebook fields to your webhook field names",
          "Test with a sample lead"
        ]
      },
      {
        id: "wh-11",
        question: "Why isn't my webhook receiving leads?",
        answer: [
          "Verify the webhook URL is correctly copied",
          "Check if the source system is sending data",
          "Look at Webhook Logs for any errors",
          "Ensure field names match what's expected",
          "Check if there are any network/firewall issues"
        ]
      },
      {
        id: "wh-12",
        question: "How to update an existing webhook?",
        answer: [
          "Go to Webhooks and find your webhook",
          "Click Edit or the settings icon",
          "Update field mappings or allocation rules",
          "Save changes - they take effect immediately",
          "The webhook URL stays the same"
        ]
      },
      {
        id: "wh-13",
        question: "Can one webhook field map to multiple CRM fields?",
        answer: [
          "Yes, using multi-field matching",
          "Example: incoming 'phone' can match against both 'Mobile' and 'WhatsApp' fields",
          "Uses OR logic - matches if either field has the value",
          "Useful for flexible data structures"
        ]
      },
      {
        id: "wh-14",
        question: "How to delete a webhook?",
        answer: [
          "Go to Webhooks section",
          "Find the webhook to delete",
          "Click Delete and confirm",
          "The webhook URL will no longer work",
          "Historical logs are preserved"
        ]
      },
      {
        id: "wh-15",
        question: "How are dropdown values matched in webhooks?",
        answer: [
          "Webhooks can auto-detect dropdown values",
          "Incoming values are matched to existing dropdown options",
          "If no match, new options may be created automatically",
          "Or the value is stored as-is depending on configuration"
        ]
      }
    ]
  },
  {
    id: "targets",
    name: "Targets",
    icon: Target,
    description: "Set goals, track progress, leaderboards",
    questions: [
      {
        id: "tg-1",
        question: "What are targets?",
        answer: [
          "Targets are goals you set for yourself or your team",
          "Examples: 'Make 50 calls this week', 'Convert 10 leads this month'",
          "Progress is tracked automatically based on your activities",
          "View progress on your Dashboard or My Targets page"
        ]
      },
      {
        id: "tg-2",
        question: "How to create a new target?",
        answer: [
          "Only Admins can create targets",
          "Go to Admin Console > Targets",
          "Click 'Create Target'",
          "Choose the goal type (Count, Sum, Percentage, etc.)",
          "Set the target value and time period",
          "Assign to users or teams",
          "Save the target"
        ]
      },
      {
        id: "tg-3",
        question: "What types of targets can I create?",
        answer: [
          "Count: Number of items (e.g., 20 leads)",
          "Sum: Total of a numeric field (e.g., revenue)",
          "Average: Average value of a field",
          "Percentage: Ratio between two metrics (e.g., conversion rate)",
          "Updates: Number of follow-up updates added",
          "Conversion: Leads converted to a specific status"
        ]
      },
      {
        id: "tg-4",
        question: "How to assign a target to users?",
        answer: [
          "When creating or editing a target",
          "Choose 'Single User', 'Multiple Users', or 'All Users'",
          "Select specific users if applicable",
          "Each user gets their own progress tracking",
          "Admins can see everyone's progress"
        ]
      },
      {
        id: "tg-5",
        question: "What's the difference between one-time and recurring targets?",
        answer: [
          "One-time: Has a specific end date, tracked once",
          "Recurring: Repeats daily, weekly, or monthly",
          "Recurring targets reset at the start of each period",
          "Historical data is preserved for comparison"
        ]
      },
      {
        id: "tg-6",
        question: "How to view my target progress?",
        answer: [
          "Go to My Targets from the sidebar",
          "You'll see all targets assigned to you",
          "Progress bar shows how close you are",
          "Click on a target for detailed breakdown"
        ]
      },
      {
        id: "tg-7",
        question: "What is the Leaderboard?",
        answer: [
          "The Leaderboard ranks users by target achievement",
          "See who's leading for each target",
          "Filter by time period (Today, This Week, This Month)",
          "Motivates healthy competition in the team"
        ]
      },
      {
        id: "tg-8",
        question: "How is target progress calculated?",
        answer: [
          "Progress is calculated automatically based on your activities",
          "For Count targets: number of matching leads",
          "For Sum: total of the specified field",
          "For Conversion: leads that reached the target status",
          "Data updates in real-time as you work"
        ]
      },
      {
        id: "tg-9",
        question: "Can a target apply to multiple sheets?",
        answer: [
          "Yes, targets can be:",
          "Sheet-specific: Only counts activity in one sheet",
          "Company-wide: Counts activity across all sheets",
          "Multiple sheets: Counts from selected sheets only",
          "Choose the scope when creating the target"
        ]
      },
      {
        id: "tg-10",
        question: "How to edit or delete a target?",
        answer: [
          "Go to Admin Console > Targets",
          "Find the target you want to modify",
          "Click Edit to change settings",
          "Or click Delete to remove it",
          "Deleted targets are removed from user dashboards"
        ]
      }
    ]
  },
  {
    id: "attendance",
    name: "Attendance",
    icon: Clock,
    description: "Check-in, check-out, force exit, attendance history",
    questions: [
      {
        id: "at-1",
        question: "How to check in for the day?",
        answer: [
          "Go to Attendance from the sidebar",
          "Click 'Check In' button",
          "Your check-in time is recorded",
          "You may need to allow location access",
          "A selfie may be required for verification"
        ]
      },
      {
        id: "at-2",
        question: "How to check out?",
        answer: [
          "Go to Attendance",
          "Click 'Check Out' button",
          "Your check-out time is recorded",
          "You may need to meet certain requirements first (see exit rules)"
        ]
      },
      {
        id: "at-3",
        question: "What are exit rules?",
        answer: [
          "Exit rules are requirements before you can check out",
          "Examples: Minimum hours worked, minimum leads added",
          "Minimum follow-up updates made",
          "If you don't meet requirements, you need admin approval to exit"
        ]
      },
      {
        id: "at-4",
        question: "What is Force Exit?",
        answer: [
          "Force Exit lets you request to leave early",
          "Use when you can't meet the exit requirements",
          "You must provide a reason for early exit",
          "An admin reviews and approves/rejects your request"
        ]
      },
      {
        id: "at-5",
        question: "How to request a Force Exit?",
        answer: [
          "Go to Attendance",
          "Click 'Request Force Exit'",
          "Enter the reason for leaving early",
          "Submit the request",
          "Wait for admin approval",
          "Once approved, you can check out"
        ]
      },
      {
        id: "at-6",
        question: "How do admins approve Force Exit requests?",
        answer: [
          "Go to Admin Console > Attendance",
          "View pending Force Exit requests",
          "Review the reason and user's work for the day",
          "Click Approve or Reject",
          "The user is notified of the decision"
        ]
      },
      {
        id: "at-7",
        question: "How to view my attendance history?",
        answer: [
          "Go to Attendance",
          "Look for 'History' or 'Past Records' tab",
          "You'll see all your check-ins and check-outs",
          "Dates, times, and any notes are shown"
        ]
      },
      {
        id: "at-8",
        question: "Can I edit my attendance record?",
        answer: [
          "Regular users cannot edit attendance",
          "Only admins can modify attendance records",
          "Contact your admin if there's an error",
          "Provide details about the correction needed"
        ]
      }
    ]
  },
  {
    id: "highlighting-rules",
    name: "Highlighting Rules",
    icon: Palette,
    description: "Conditional row colors, visual alerts",
    questions: [
      {
        id: "hr-1",
        question: "What are highlighting rules?",
        answer: [
          "Highlighting rules change the background color of lead rows",
          "Based on conditions you set (e.g., Status = 'Hot')",
          "Helps you quickly spot important leads",
          "Example: All 'Urgent' leads appear in red"
        ]
      },
      {
        id: "hr-2",
        question: "How to create a highlighting rule?",
        answer: [
          "Go to Admin Console > Highlighting Rules",
          "Click 'Add Rule'",
          "Set the conditions (e.g., Status = 'Hot')",
          "Choose the highlight color",
          "Save the rule - it applies immediately"
        ]
      },
      {
        id: "hr-3",
        question: "What colors are available for highlighting?",
        answer: [
          "12 color options: Yellow, Orange, Red, Green, Blue, Purple",
          "Pink, Dark Red, Light Green, Dark Green, Light Blue, Dark Blue",
          "Choose colors that stand out but are readable",
          "Avoid too many similar colors"
        ]
      },
      {
        id: "hr-4",
        question: "Can I have multiple conditions in one rule?",
        answer: [
          "Yes, you can combine conditions with AND/OR logic",
          "AND: All conditions must be true",
          "OR: Any condition can be true",
          "Example: Status = 'Hot' AND Source = 'Facebook'"
        ]
      },
      {
        id: "hr-5",
        question: "What's the difference between sheet-specific and global rules?",
        answer: [
          "Sheet-specific: Only applies to one sheet",
          "Global: Applies to all sheets in your company",
          "Global rules are useful for company-wide standards",
          "Sheet rules can override for specific needs"
        ]
      },
      {
        id: "hr-6",
        question: "How to edit or delete a highlighting rule?",
        answer: [
          "Go to Admin Console > Highlighting Rules",
          "Find the rule you want to modify",
          "Click Edit to change conditions or color",
          "Click Delete to remove the rule",
          "Changes apply immediately to all views"
        ]
      }
    ]
  },
  {
    id: "row-filters",
    name: "Row Filters (Hide/Show)",
    icon: Filter,
    description: "Create personal filters, hide rows from view",
    questions: [
      {
        id: "rf-1",
        question: "What are row filters?",
        answer: [
          "Row filters let you hide certain leads from your view",
          "Filters are personal - only affect what you see",
          "Leads aren't deleted, just hidden from your grid",
          "Useful for focusing on specific leads"
        ]
      },
      {
        id: "rf-2",
        question: "How to create a row filter?",
        answer: [
          "Look for 'Hide/Show Rows' in the sidebar or toolbar",
          "Click 'Create Filter'",
          "Give your filter a name",
          "Add conditions (e.g., Status = 'Closed')",
          "Save the filter"
        ]
      },
      {
        id: "rf-3",
        question: "How to activate a filter?",
        answer: [
          "Go to Hide/Show Rows",
          "Toggle the switch next to the filter you want",
          "Active filters will hide matching rows",
          "Multiple filters can be active at once"
        ]
      },
      {
        id: "rf-4",
        question: "How to see hidden rows again?",
        answer: [
          "Go to Hide/Show Rows",
          "Deactivate the filter by toggling it off",
          "Or delete the filter entirely",
          "All hidden rows will reappear"
        ]
      },
      {
        id: "rf-5",
        question: "Are my filters visible to other users?",
        answer: [
          "No, row filters are personal and private",
          "Each user creates and manages their own filters",
          "Your filters don't affect what others see",
          "Filters are saved to your account"
        ]
      },
      {
        id: "rf-6",
        question: "How to delete a row filter?",
        answer: [
          "Go to Hide/Show Rows",
          "Find the filter you want to remove",
          "Click the delete/trash icon",
          "Confirm deletion",
          "Previously hidden rows will reappear"
        ]
      }
    ]
  },
  {
    id: "admin-settings",
    name: "Admin Settings",
    icon: Settings,
    description: "Company settings, timezone, audit logs",
    questions: [
      {
        id: "as-1",
        question: "How to access Admin Console?",
        answer: [
          "Only Admins see the Admin Console option",
          "Click 'Admin Console' in the sidebar",
          "You'll see sections for Users, Sheets, Columns, etc.",
          "Navigate to the section you need"
        ]
      },
      {
        id: "as-2",
        question: "How to change my company's timezone?",
        answer: [
          "Go to Admin Console > General Settings",
          "Find the 'Timezone' setting",
          "Select your timezone from the dropdown",
          "Save changes",
          "All date/time displays will use this timezone"
        ],
        tips: ["Timezone affects webhook timestamps, reports, and activity logs"]
      },
      {
        id: "as-3",
        question: "What is the Audit Log?",
        answer: [
          "The Audit Log records all important actions",
          "Shows who did what and when",
          "Tracks: lead changes, user access, settings updates",
          "Useful for security and accountability"
        ]
      },
      {
        id: "as-4",
        question: "How to view the Audit Log?",
        answer: [
          "Go to Audit Logs from the sidebar",
          "You'll see a list of all recorded actions",
          "Filter by date, user, or action type",
          "Click on an entry for more details"
        ]
      },
      {
        id: "as-5",
        question: "How to clear old data?",
        answer: [
          "Go to Admin Console > Data Management",
          "Find 'Clear Past Data' option",
          "Choose the date range or criteria",
          "Type 'DELETE' to confirm",
          "Data is soft-deleted and can be recovered for 30 days"
        ],
        tips: ["Use with caution - this affects real data"]
      },
      {
        id: "as-6",
        question: "How to bulk transfer leads between sheets?",
        answer: [
          "Go to Admin Console > Data Management",
          "Select 'Bulk Transfer Leads'",
          "Choose the source sheet",
          "Select destination sheet(s) with percentages",
          "Review duplicate detection results",
          "Confirm the transfer"
        ]
      },
      {
        id: "as-7",
        question: "What company information can I update?",
        answer: [
          "Go to Admin Console > General Settings",
          "You can update: Company name, contact info",
          "Logo, timezone, working hours",
          "Exit rules for attendance",
          "Save any changes made"
        ]
      },
      {
        id: "as-8",
        question: "How to see activity logs?",
        answer: [
          "Go to Activity Logs from the sidebar",
          "View all user activities in detail",
          "Filter by user, date, or action type",
          "Export logs if needed for review"
        ]
      }
    ]
  },
  {
    id: "google-sheets-backup",
    name: "Google Sheets Backup",
    icon: Database,
    description: "Automatic backup to Google Sheets",
    questions: [
      {
        id: "gb-1",
        question: "What is Google Sheets Backup?",
        answer: [
          "Automatic backup of your leads to Google Sheets",
          "Runs hourly to keep a copy of your data",
          "Each sheet can have its own Google Sheet backup",
          "Includes lead data and recent update history"
        ]
      },
      {
        id: "gb-2",
        question: "How to set up Google Sheets backup?",
        answer: [
          "Go to Admin Console > Sheets",
          "Select a sheet and find 'Google Backup' settings",
          "Click 'Connect' or 'Configure'",
          "Enter your Google Sheet URL",
          "Grant necessary permissions",
          "Backups will start automatically"
        ]
      },
      {
        id: "gb-3",
        question: "How to manually trigger a backup?",
        answer: [
          "Go to the sheet's backup settings",
          "Click 'Sync Now' or 'Run Backup'",
          "Wait for the sync to complete",
          "Check the Google Sheet to verify data"
        ]
      },
      {
        id: "gb-4",
        question: "What data is included in the backup?",
        answer: [
          "All lead data from the sheet",
          "All custom column values",
          "Up to 10 recent updates per lead",
          "Data is formatted for easy reading in Google Sheets"
        ]
      },
      {
        id: "gb-5",
        question: "How to view backup logs?",
        answer: [
          "Go to the sheet's backup settings",
          "Look for 'Sync History' or 'Backup Logs'",
          "See timestamps, success/failure status",
          "Error details if any backup failed"
        ]
      }
    ]
  },
  {
    id: "data-recovery",
    name: "Data Recovery",
    icon: Database,
    description: "Restore data from snapshots",
    questions: [
      {
        id: "dr-1",
        question: "What are snapshots?",
        answer: [
          "Snapshots are automatic backups of your data",
          "Created hourly by the system",
          "Stored for 30 days",
          "Allow you to restore data to a previous state"
        ]
      },
      {
        id: "dr-2",
        question: "How to restore data from a snapshot?",
        answer: [
          "Only Super Admins can access Data Recovery",
          "Go to Super Admin Console > Recovery",
          "Browse: Company > Sheet > Date > Time",
          "Preview what will be restored",
          "Confirm the restoration"
        ]
      },
      {
        id: "dr-3",
        question: "What happens during a restore?",
        answer: [
          "The system compares snapshot data to current data",
          "Shows what will be added, removed, or updated",
          "You review and confirm before proceeding",
          "An audit log records the restoration"
        ]
      },
      {
        id: "dr-4",
        question: "Can I restore individual leads?",
        answer: [
          "Current restore is sheet-level, not individual leads",
          "For individual lead recovery, use the Deleted Leads feature",
          "Contact Super Admin for specific recovery needs"
        ]
      },
      {
        id: "dr-5",
        question: "How long are snapshots kept?",
        answer: [
          "Snapshots are retained for 30 days",
          "Older snapshots are automatically deleted",
          "New snapshots are created hourly",
          "Only changed data creates new snapshots"
        ]
      }
    ]
  },
  {
    id: "mobile-app",
    name: "Mobile App",
    icon: Smartphone,
    description: "Using LeadAni on your phone",
    questions: [
      {
        id: "ma-1",
        question: "How to use LeadAni on my phone?",
        answer: [
          "Open your mobile browser (Chrome or Safari)",
          "Go to your LeadAni URL",
          "Log in with your credentials",
          "The interface adapts automatically for mobile"
        ]
      },
      {
        id: "ma-2",
        question: "How to install LeadAni as an app?",
        answer: [
          "Open LeadAni in your mobile browser",
          "Look for the 'Install' or 'Add to Home Screen' prompt",
          "On Android: Tap menu (⋮) > 'Add to Home Screen'",
          "On iPhone: Tap Share > 'Add to Home Screen'",
          "The app icon appears on your home screen"
        ]
      },
      {
        id: "ma-3",
        question: "What can I do on mobile?",
        answer: [
          "View and search leads",
          "Add new leads",
          "Edit lead details and add updates",
          "Check in/out for attendance",
          "View basic reports",
          "Most features work on mobile"
        ]
      },
      {
        id: "ma-4",
        question: "How to view lead details on mobile?",
        answer: [
          "Tap on any lead in the list",
          "A mobile-friendly detail view opens",
          "Swipe to see different sections",
          "Tap 'Edit' to make changes"
        ]
      },
      {
        id: "ma-5",
        question: "How to filter leads on mobile?",
        answer: [
          "Look for the filter icon at the top",
          "Tap to open filter options",
          "Select your filter criteria",
          "Apply to see filtered results"
        ]
      },
      {
        id: "ma-6",
        question: "How to sort leads on mobile?",
        answer: [
          "Look for the sort icon near filters",
          "Tap to see sort options",
          "Choose the column and order (A-Z, Z-A)",
          "The list updates immediately"
        ]
      },
      {
        id: "ma-7",
        question: "Why does mobile look different from desktop?",
        answer: [
          "Mobile uses a card-based layout for easier reading",
          "Some features may be in different locations",
          "The menu is usually in a hamburger icon (☰)",
          "All core functionality is still available"
        ]
      },
      {
        id: "ma-8",
        question: "How to get notifications on mobile?",
        answer: [
          "When prompted, allow notifications",
          "Go to your device settings if you missed the prompt",
          "Enable notifications for the LeadAni app",
          "You'll receive alerts for important updates"
        ]
      }
    ]
  },
  {
    id: "troubleshooting",
    name: "Troubleshooting",
    icon: AlertTriangle,
    description: "Common issues and solutions",
    questions: [
      {
        id: "ts-1",
        question: "I can't log in - what should I do?",
        answer: [
          "Check that you're using the correct email",
          "Make sure Caps Lock is off when typing password",
          "Try resetting your password if available",
          "Clear browser cache and cookies",
          "Contact your admin if problem persists"
        ]
      },
      {
        id: "ts-2",
        question: "The page is loading slowly",
        answer: [
          "Check your internet connection",
          "Try refreshing the page",
          "Clear browser cache",
          "Try a different browser",
          "If problem persists, contact support"
        ]
      },
      {
        id: "ts-3",
        question: "I don't see my sheet",
        answer: [
          "Your admin may not have granted you access",
          "Contact your admin to request access",
          "Make sure you're logged into the correct account",
          "The sheet may have been deleted"
        ]
      },
      {
        id: "ts-4",
        question: "My changes aren't saving",
        answer: [
          "Check your internet connection",
          "Look for any error messages",
          "Try refreshing and making the change again",
          "Required fields may be empty",
          "Contact support if problem continues"
        ]
      },
      {
        id: "ts-5",
        question: "Webhook is not receiving leads",
        answer: [
          "Verify the webhook URL is correct in your source",
          "Check Webhook Logs for errors",
          "Ensure field mapping is complete",
          "Test with a manual POST request",
          "Check if allocation rules are set up"
        ]
      },
      {
        id: "ts-6",
        question: "Export is not working",
        answer: [
          "Check if popup blocker is preventing download",
          "Try a different browser",
          "Reduce the number of leads if export is large",
          "Clear browser cache and try again"
        ]
      },
      {
        id: "ts-7",
        question: "Import failed - what went wrong?",
        answer: [
          "Check the error message for specific issues",
          "Verify file format is Excel or CSV",
          "Make sure required columns are mapped",
          "Check for invalid data (wrong formats, missing values)",
          "Try with a smaller sample first"
        ]
      },
      {
        id: "ts-8",
        question: "I accidentally deleted something",
        answer: [
          "Deleted leads can be recovered for 30 days",
          "Contact your admin for recovery",
          "For other data, check if restore options exist",
          "Future: snapshots allow data recovery"
        ]
      },
      {
        id: "ts-9",
        question: "Notifications aren't working",
        answer: [
          "Check browser notification permissions",
          "Ensure notifications are enabled in device settings",
          "Try logging out and back in",
          "Reinstall the PWA app if applicable"
        ]
      },
      {
        id: "ts-10",
        question: "The app looks broken on mobile",
        answer: [
          "Try rotating your device",
          "Refresh the page",
          "Clear browser cache",
          "Update your browser to latest version",
          "Try reinstalling as a PWA"
        ]
      }
    ]
  }
];

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [aiSearching, setAiSearching] = useState(false);
  const [aiMatchedIds, setAiMatchedIds] = useState<string[]>([]);
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiSearchError, setAiSearchError] = useState<string | null>(null);

  const allQuestions = useMemo(() => {
    return faqData.flatMap(cat => cat.questions.map(q => ({ 
      ...q,
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
    })));
  }, []);

  const performAiSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 3) return;
    
    setAiSearching(true);
    setAiMatchedIds([]);
    setAiSearchError(null);
    
    try {
      const faqSummary = allQuestions.map(q => ({ id: q.id, question: q.question }));
      
      const response = await fetch("/api/help/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), faqSummary }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiMatchedIds(data.matchedIds || []);
        setAiSearchQuery(query.trim());
        if (data.matchedIds?.length > 0) {
          setExpandedItems(data.matchedIds);
        }
      } else {
        setAiSearchError("AI search temporarily unavailable. Using keyword search instead.");
      }
    } catch (error) {
      console.error("AI search failed:", error);
      setAiSearchError("Could not connect to AI search. Using keyword search instead.");
    } finally {
      setAiSearching(false);
    }
  }, [allQuestions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim().length >= 3) {
      performAiSearch(searchQuery);
    }
  }, [searchQuery, performAiSearch]);

  const aiMatchedQuestions = useMemo(() => {
    if (aiMatchedIds.length === 0) return [];
    return aiMatchedIds
      .map(id => allQuestions.find(q => q.id === id))
      .filter(Boolean) as (FAQItem & { categoryId: string; categoryName: string; categoryIcon: any })[];
  }, [aiMatchedIds, allQuestions]);

  const filteredData = useMemo(() => {
    if (!searchQuery && !selectedCategory) {
      return faqData;
    }

    const query = searchQuery.toLowerCase();
    
    return faqData
      .filter(category => !selectedCategory || category.id === selectedCategory)
      .map(category => ({
        ...category,
        questions: category.questions.filter(q => 
          q.question.toLowerCase().includes(query) ||
          q.answer.some(a => a.toLowerCase().includes(query)) ||
          (q.tips && q.tips.some(t => t.toLowerCase().includes(query)))
        )
      }))
      .filter(category => category.questions.length > 0);
  }, [searchQuery, selectedCategory]);

  const totalQuestions = faqData.reduce((acc, cat) => acc + cat.questions.length, 0);
  const visibleQuestions = filteredData.reduce((acc, cat) => acc + cat.questions.length, 0);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{part}</mark>
        : part
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              <h1 className="text-lg font-semibold">LeadAni Help Center</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/guide">
              <Button variant="outline" size="sm" data-testid="button-go-to-guide">
                <BookOpen className="h-4 w-4 mr-2" />
                Guide
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-b from-primary/5 to-background py-4 sm:py-6">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-1">How can we help you?</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Search {totalQuestions}+ tutorials and guides
          </p>
          
          <div className="max-w-xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Ask a question... (Press Enter for AI search)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value) {
                    setAiMatchedIds([]);
                    setAiSearchQuery("");
                    setAiSearchError(null);
                  }
                }}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-10 h-12 text-base"
                data-testid="input-help-search"
              />
              {searchQuery && !aiSearching && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => {
                    setSearchQuery("");
                    setAiMatchedIds([]);
                    setAiSearchQuery("");
                    setAiSearchError(null);
                  }}
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {aiSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
              )}
            </div>
            <Button
              onClick={() => performAiSearch(searchQuery)}
              disabled={searchQuery.trim().length < 3 || aiSearching}
              className="h-12 px-4 gap-2"
              data-testid="button-ai-search"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI Search</span>
            </Button>
          </div>

          {aiSearching && (
            <p className="text-sm text-muted-foreground mt-3 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching with AI...
            </p>
          )}
          
          {!aiSearching && aiMatchedIds.length > 0 && (
            <p className="text-sm text-primary mt-3 flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI found {aiMatchedIds.length} relevant answers for "{aiSearchQuery}"
            </p>
          )}
          
          {!aiSearching && aiSearchError && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-3 flex items-center justify-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {aiSearchError}
            </p>
          )}
          
          {!aiSearching && !aiSearchError && searchQuery && aiMatchedIds.length === 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              Found {visibleQuestions} results (Press Enter or click AI Search for smarter results)
            </p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {!searchQuery && !selectedCategory && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
            {faqData.map(category => (
              <Card
                key={category.id}
                className="cursor-pointer hover-elevate transition-all"
                onClick={() => setSelectedCategory(category.id)}
                data-testid={`card-category-${category.id}`}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <category.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-medium text-sm">{category.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {category.questions.length} articles
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedCategory && !searchQuery && (
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategory(null)}
              data-testid="button-back-categories"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              All Categories
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">
              {faqData.find(c => c.id === selectedCategory)?.name}
            </span>
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-6 pr-4">
            {aiMatchedQuestions.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">AI Recommended Answers</h3>
                  <Badge variant="default" className="ml-auto bg-primary/10 text-primary">
                    Top {aiMatchedQuestions.length}
                  </Badge>
                </div>
                <Accordion
                  type="multiple"
                  value={expandedItems}
                  onValueChange={setExpandedItems}
                  className="space-y-2"
                >
                  {aiMatchedQuestions.map((q, index) => (
                    <AccordionItem
                      key={q.id}
                      value={q.id}
                      className="border-2 border-primary/20 rounded-lg px-4 data-[state=open]:bg-primary/5"
                      data-testid={`accordion-ai-${q.id}`}
                    >
                      <AccordionTrigger className="text-left hover:no-underline py-3">
                        <div className="flex items-center gap-3 pr-4 w-full">
                          <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
                            {index + 1}
                          </span>
                          <span className="flex-1">{q.question}</span>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {q.categoryName}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="space-y-4 ml-9">
                          <ol className="space-y-2">
                            {q.answer.map((step, idx) => (
                              <li key={idx} className="flex gap-3">
                                {step && (
                                  <>
                                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-medium">
                                      {idx + 1}
                                    </span>
                                    <span className="text-muted-foreground pt-0.5">
                                      {step}
                                    </span>
                                  </>
                                )}
                              </li>
                            ))}
                          </ol>

                          {q.tips && q.tips.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
                              <div className="flex gap-2">
                                <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800 dark:text-amber-200">
                                  <span className="font-medium">Tip: </span>
                                  {q.tips.map((tip, idx) => (
                                    <span key={idx}>{tip}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {(aiMatchedIds.length === 0 || !searchQuery) && filteredData.map(category => (
              <div key={category.id}>
                {(searchQuery || !selectedCategory) && (
                  <div className="flex items-center gap-2 mb-3">
                    <category.icon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    <Badge variant="secondary" className="ml-auto">
                      {category.questions.length}
                    </Badge>
                  </div>
                )}

                <Accordion
                  type="multiple"
                  value={expandedItems}
                  onValueChange={setExpandedItems}
                  className="space-y-2"
                >
                  {category.questions.map(q => (
                    <AccordionItem
                      key={q.id}
                      value={q.id}
                      className="border rounded-lg px-4 data-[state=open]:bg-muted/30"
                      data-testid={`accordion-${q.id}`}
                    >
                      <AccordionTrigger className="text-left hover:no-underline py-3">
                        <span className="pr-4">
                          {highlightText(q.question, searchQuery)}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="space-y-4">
                          <ol className="space-y-2 ml-4">
                            {q.answer.map((step, idx) => (
                              <li key={idx} className="flex gap-3">
                                {step && (
                                  <>
                                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-medium">
                                      {idx + 1}
                                    </span>
                                    <span className="text-muted-foreground pt-0.5">
                                      {highlightText(step, searchQuery)}
                                    </span>
                                  </>
                                )}
                              </li>
                            ))}
                          </ol>

                          {q.tips && q.tips.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
                              <div className="flex gap-2">
                                <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800 dark:text-amber-200">
                                  <span className="font-medium">Tip: </span>
                                  {q.tips.map((tip, idx) => (
                                    <span key={idx}>{highlightText(tip, searchQuery)}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}

            {filteredData.length === 0 && aiMatchedIds.length === 0 && !aiSearching && (
              <div className="text-center py-12">
                <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4">
                  Try different keywords or use AI Search for smarter results
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory(null);
                      setAiMatchedIds([]);
                      setAiSearchQuery("");
                    }}
                    data-testid="button-clear-filters"
                  >
                    Clear filters
                  </Button>
                  {searchQuery.trim().length >= 3 && (
                    <Button
                      onClick={() => performAiSearch(searchQuery)}
                      disabled={aiSearching}
                      className="gap-2"
                      data-testid="button-try-ai-search"
                    >
                      <Sparkles className="h-4 w-4" />
                      Try AI Search
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <footer className="border-t py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Can't find what you're looking for? Contact your company admin for assistance.</p>
          <p className="mt-2">LeadAni - Lead Management System</p>
        </div>
      </footer>
    </div>
  );
}
