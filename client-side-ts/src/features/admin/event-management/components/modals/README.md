# Admin Modals — Overview

This directory contains modal/dialog components used across the admin feature. The README documents each modal, their props, data shapes and usage examples so you can review or extend them consistently.

## Files in this folder

```
modals/
├── AddAttendeeModal.tsx        # Attendee creation form dialog
├── AddEventModal.tsx           # Event creation/edit dialog with tabs
├── EditEventModal.tsx          # Event edit dialog
├── EventInfoTab.tsx            # Event information form (image, name, description)
├── SessionSetupTab.tsx         # Session setup with date/time pickers
├── FilterSheet.tsx             # Filter dialog (status/course/year/date)
├── MarkAttendanceModal.tsx     # Manual mark attendance dialog
├── MarkAttendanceButton.tsx    # Dropdown trigger for attendance actions
├── ScanQRModal.tsx             # QR scanner modal for quick check-in
├── StudentDetailsModal.tsx     # Student details preview dialog
├── AttendeeSettingsModal.tsx   # Per-campus attendee settings
└── index.ts                    # Barrel exports
```

## Modal summaries

- AddEventModal
  - Multi-tab dialog for creating/editing events. Tabs: Event Info, Session Setup.
  - Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, optional `event` data.

- EventInfoTab
  - Inputs for name, description, image upload, date range, and location. Uses responsive grid.

- SessionSetupTab
  - Configure sessions per date with morning/afternoon/evening slots and time pickers. Improved positioning for mobile.

- AddAttendeeModal
  - Form to add attendees manually. Uses `Select` components with `w-full` triggers and responsive layout.

- FilterSheet (now Dialog)
  - Filter modal for attendee lists: status, course, year level, confirmed date. Matches dialog style used elsewhere.

- MarkAttendanceButton / MarkAttendanceModal / ScanQRModal
  - Button/dropdown to choose Scan QR or Enter Student ID; modals handle scanning or manual entry.

- StudentDetailsModal
  - Read-only preview of a selected student's information.

- AttendeeSettingsModal
  - Per-campus limit settings and defaults.

## Common props & patterns

- Most modals follow the `Dialog` pattern with these props:
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - Action callbacks such as `onSubmit`, `onCancel`, or feature-specific handlers

- Layout:
  - Modal header uses `DialogHeader` / `DialogTitle` and a ghost close `Button` sized `h-8 w-8` for alignment.
  - Content area: `flex-1 min-h-0 overflow-y-auto px-6 py-6` so the footer can be fixed.
  - Footer: `flex-none flex items-center justify-end gap-3 px-6 py-4 border-t bg-background`.

## Data shapes (examples)

### EventFormData

```ts
interface EventFormData {
  eventName: string;
  eventDescription: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  image?: File | null;
  sessions?: SessionData[];
}
```

### SessionData

```ts
interface SessionData {
  date: string;
  morning?: { enabled: boolean; startTime: string; endTime: string };
  afternoon?: { enabled: boolean; startTime: string; endTime: string };
  evening?: { enabled: boolean; startTime: string; endTime: string };
}
```

### AttendeeFormData

```ts
interface AttendeeFormData {
  studentId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  campus?: string;
  course?: string;
  yearLevel?: string;
  shirtSize?: string;
  shirtPrice?: string;
}
```

### FilterOptions

```ts
interface FilterOptions {
  status: ("present" | "absent")[];
  course: string[];
  yearLevel: string[];
  confirmedOn?: Date;
}
```

## Dependencies

- Shared UI primitives from `client-side-ts/src/components/ui` (Dialog, Button, Input, Select, Tabs, Calendar, Popover)
- `lucide-react` for icons
- `date-fns` for formatting dates

## Styling & responsiveness

- Tailwind CSS utility classes across all modals. Key patterns:
  - Mobile-first grid layouts (`grid grid-cols-1 md:grid-cols-2`)
  - Dialog sizing: `w-full max-w-4xl sm:max-w-2xl h-[90vh]` for large forms
  - Buttons: use `w-full` on mobile and `sm:w-auto` on larger screens where appropriate

## Best practices and notes

- Keep dialog chrome consistent: header, content, footer styling should match `AddAttendeeModal` and `AddEventModal`.
- Prefer updating shared primitives (`components/ui/*`) for global visual changes rather than repeating styles in each modal.
- When adding new modal controls, ensure keyboard accessibility and focus management.
