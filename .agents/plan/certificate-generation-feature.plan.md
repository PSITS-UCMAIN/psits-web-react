---
title: Certificate Generation Feature Implementation (ICT Congress 2026)
created: 2026-05-16T07:24:38.006Z
updated: 2026-05-16T08:12:14.206Z
status: approved
risk: low-medium
---

## Goal

Implement a certificate generation feature specifically for the **12th UC CCS ICT Congress 2026** that allows authenticated students to generate and download PDF certificates of participation. The feature includes:
- A new `EligibleCertificate` model to track certificate eligibility
- Admin module for managing eligible certificates (manual entry, bulk check, CSV import)
- Dedicated client-side certificate generation module
- 5-minute cooldown mechanism to prevent abuse
- Student authentication requirement

**Key Constraint:** This implementation is **ICT Congress 2026-specific**. All event details (name, theme, date, venue, signees) are hardcoded in the template. Only student name and email are pulled from the database.

## Out of Scope

- Generic certificate generation for any event (future enhancement)
- Bulk certificate generation for multiple students at once
- Certificate template customization UI
- Certificate history/archive system
- Email delivery of certificates (only download is in scope)
- Queue-based processing system (deferred - not needed for single certificate generation)
- Certificate revocation or invalidation logic
- Analytics/tracking of certificate generation
- Dynamic signee management (4 deans are hardcoded)
- Multiple certificate templates

## Answered Critical Questions

1. **Button Visibility Condition**: Certificate generation is controlled by `EligibleCertificate` model. Admin manages eligibility via new admin module with manual entry, bulk check, and CSV import.

2. **Event Context**: Create a dedicated client-side certificate module that fetches all `EligibleCertificate` records. Students can only click/interact with events they are eligible for.

3. **Authentication Requirements**: Student auth only. Students can only generate their own certificates.

4. **Attendance Verification**: Handled by `EligibleCertificate` model. Only students with a record in this model can generate certificates. Admin ensures only attendees are added.

5. **Queue System Decision**: Deferred. Not needed for single certificate generation.

6. **API Endpoint Naming**: `/api/certificates/generate`

## Phases

### Phase 0 — Discovery & Clarification ✅ COMPLETE

**Risk:** low  
**Effort:** 1 hour  
**Agent-safe:** yes

All critical questions have been answered by the user. Ready to proceed with implementation.

### Phase 1 — Git Rebase

**Risk:** medium  
**Effort:** 0.5-1 hour  
**Agent-safe:** no (requires human review of conflicts)

- Checkout `ram/cert-feat` branch (current working branch)
- Execute rebase: `git rebase ram/certs2`
- Identify and document any merge conflicts
- For logic conflicts, present options to user rather than auto-resolving
- Verify that `server-side/src/mail_template/mail.template.ts` contains `certificateOfParticipationEmail` function
- Verify that supporting files are present:
  - `server-side/src/mail_template/mail.schema.ts` (Zod schemas)
  - `server-side/src/mail_template/mail.interface.ts` (TypeScript types)
  - `server-side/src/mail_template/utils/generate-pdf-from-ejs.ts` (PDF generator)
  - EJS template: `server-side/src/assets/ejs/pdf-ejs/certificate.ejs`
  - Images: `server-side/src/assets/images/etc/` (logos and e-signatures)
  - Fonts: `server-side/src/assets/ejs/fonts/` (AlexBrush, Cinzel, Montserrat)

> **Dependency:** Clean rebase must complete before Phase 2 begins

### Phase 2 — Create EligibleCertificate Model

**Risk:** low  
**Effort:** 0.5 hour  
**Agent-safe:** yes

#### Step 2.1: Create Model Interface

- Create `server-side/src/models/eligibleCertificate.interface.ts`:
  ```typescript
  import { Types } from "mongoose";
  
  export interface IEligibleCertificate {
    evaluationId: string;
    eventId: Types.ObjectId;
    attendeeId: Types.ObjectId; // ObjectId reference to Student model
    studentIdNumber?: string; // Denormalized for quick display without populate
    createdAt?: Date;
    createdBy?: string; // admin who added this record
  }
  ```

#### Step 2.2: Create Mongoose Schema

- Create `server-side/src/models/eligibleCertificate.model.ts`:
  ```typescript
  import { Schema, Document, model } from "mongoose";
  import { IEligibleCertificate } from "./eligibleCertificate.interface";
  
  export interface IEligibleCertificateDocument extends IEligibleCertificate, Document {}
  
  export const eligibleCertificateSchema = new Schema<IEligibleCertificateDocument>({
    evaluationId: { type: String, required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    attendeeId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    studentIdNumber: { type: String }, // Optional: for quick display without populate
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String }
  });
  
  // Compound index to prevent duplicates
  eligibleCertificateSchema.index({ eventId: 1, attendeeId: 1 }, { unique: true });
  
  export const EligibleCertificate = model<IEligibleCertificateDocument>(
    'EligibleCertificate',
    eligibleCertificateSchema
  );
  ```

**Key Design Decision:**
- `attendeeId` uses ObjectId reference to Student model for referential integrity
- `studentIdNumber` is denormalized for admin UI performance (optional field)
- Compound unique index prevents duplicate eligibility records
- Mongoose can populate student details efficiently when needed

> **Dependency:** Phase 1 must be complete

### Phase 3 — Admin API for Certificate Eligibility Management

**Risk:** low-medium  
**Effort:** 2-2.5 hours  
**Agent-safe:** yes

#### Step 3.1: Create Admin Controller Methods

- Create `server-side/src/controllers/eligibleCertificate.controller.ts`:
  - `addEligibleCertificates`: Add one or multiple eligible certificates
  - `removeEligibleCertificates`: Remove eligibility records
  - `getEligibleCertificatesByEvent`: Get all eligible students for an event (with populate)
  - `importEligibleCertificatesFromCSV`: Import from CSV file
  - `bulkCheckEligibility`: Validate attendees before adding

#### Step 3.2: Implement Bulk Check Logic

- Validate that students exist in the system (lookup by student ID number)
- Validate that students attended the event (check Attendee records)
- Return validation results with Student ObjectIds:
  - Valid: Students who attended and can be added (with ObjectId and student ID number)
  - Invalid: Students who didn't attend or don't exist
  - Duplicates: Students already in EligibleCertificate
- Store both ObjectId and studentIdNumber for valid students

#### Step 3.3: Implement CSV Import

- Accept CSV file with column of student ID numbers
- Parse CSV and extract student IDs
- Lookup Student records by ID number to get ObjectIds
- Run bulk check validation
- For valid students, store both `attendeeId` (ObjectId) and `studentIdNumber` (string)
- Return detailed results:
  - Successfully imported count
  - Errors with specific student IDs and reasons
  - Display in error dialog on frontend

#### Step 3.4: Create Admin Routes

- Create `server-side/src/routes/eligibleCertificate.route.ts`:
  - `POST /api/admin/eligible-certificates` - Add eligible certificates
  - `DELETE /api/admin/eligible-certificates` - Remove eligible certificates
  - `GET /api/admin/eligible-certificates/event/:eventId` - Get by event (with populate)
  - `POST /api/admin/eligible-certificates/import-csv` - Import from CSV
  - `POST /api/admin/eligible-certificates/bulk-check` - Validate before adding
- Apply admin authentication middleware
- Mount route in `server-side/src/index.ts`

> **Dependency:** Phase 2 must be complete

### Phase 4 — Server-Side Certificate Generation

**Risk:** low-medium  
**Effort:** 2.5-3 hours  
**Agent-safe:** yes

#### Step 4.1: Create Certificate Controller

- Create `server-side/src/controllers/certificate.controller.ts`
- Implement `generateCertificate` handler that:
  - Validates student authentication (from JWT token)
  - Extracts student ObjectId from token
  - Accepts event ID in request body or query param
  - **Checks if student has EligibleCertificate record for the event** (query by eventId and attendeeId ObjectId)
  - Return 403 Forbidden if not found
  - Fetches student data from Student model (or use populated data from EligibleCertificate)
  - Constructs `TCertificateData` object with hardcoded ICT Congress data
  - Calls the existing `generatePDFFromEJS` utility
  - Returns PDF as downloadable file with proper headers
  - Handles errors gracefully with appropriate HTTP status codes

**Hardcoded Certificate Data Structure:**
```typescript
const certificateData: TCertificateData = {
  student_name: studentFromDB.name, // from database
  event_name: "12th UC CCS ICT Congress 2026",
  event_theme: "Innovating the Future: Empowering Society Through Intelligent Technologies",
  event_date: "April 22, 2026",
  event_start_time: "12:00 PM",
  event_end_time: "6:00 PM",
  event_venue_specific: "New Cebu Colosseum",
  event_venue: "Sanciangko St., Cebu City",
  images: {
    main_logo: "images/etc/all_logos-removebg-preview.png",
    esig_basabe: "images/etc/neil_basabbe-removebg-preview.png",
    esig_tanquis: "images/etc/janette_tanquis-removebg-preview.png",
    esig_ortega: "images/etc/eric_ortega-removebg-preview.png",
    esig_petalver: "images/etc/carlo_petalver-removebg-preview.png"
  },
  fonts: {
    alexbrush: "ejs/fonts/AlexBrush-Regular.ttf",
    cinzel: "ejs/fonts/Cinzel-VariableFont_wght.ttf",
    montserrat: "ejs/fonts/Montserrat-VariableFont_wght.ttf"
  },
  signees: [
    {
      name: "Neil A. Basabe, MIT",
      designation: "Dean, UC-Main College of Computer Studies",
      e_sig: "esig_basabe"
    },
    {
      name: "Dr. Janette Tanquis",
      designation: "Dean, UC-LM College of Computer Studies",
      e_sig: "esig_tanquis"
    },
    {
      name: "Eric Ortega",
      designation: "Dean, UC-Banilad College of Computer Studies",
      e_sig: "esig_ortega"
    },
    {
      name: "Carlo D. Petalver, MIT",
      designation: "Dean, UC-PT College of Computer Studies",
      e_sig: "esig_petalver"
    }
  ]
};
```

#### Step 4.2: Implement Cooldown Mechanism

- Create in-memory cooldown store using `Map<string, number>`
  - Key: student ObjectId as string (from auth token)
  - Value: timestamp of last generation
- Add cooldown check before certificate generation:
  - Check if student has generated within last 5 minutes
  - If yes, return `429 Too Many Requests` with remaining time in response body
  - If no, proceed with generation and update timestamp
- Add cleanup mechanism to prevent memory leaks (remove entries older than 10 minutes)
- Structure cooldown response:
  ```json
  {
    "error": "Too many requests",
    "message": "Please wait before generating another certificate",
    "retryAfter": 180 // seconds remaining
  }
  ```

#### Step 4.3: Create Certificate Route

- Create `server-side/src/routes/certificate.route.ts`
- Define route: `POST /api/certificates/generate`
- Apply student authentication middleware
- Mount route in `server-side/src/index.ts` following existing patterns
- Follow naming conventions: lowercase with dot suffix for route files

#### Step 4.4: Database Query Implementation

- Fetch student details from Student model:
  - Query by student ObjectId (from auth token)
  - Extract: `name`, `email`
  - Handle case where student not found (404 error)
- Check EligibleCertificate record:
  - Query by eventId and attendeeId (student ObjectId)
  - Can optionally populate attendeeId to get student details in one query
  - Return 403 Forbidden if not found with message: "You are not eligible for a certificate for this event"
  - Handle case where event not found (404 error)

> **Dependency:** Phase 3 must be complete

### Phase 5 — Client-Side Certificate Module (client-side-ts for Students)

**Risk:** low  
**Effort:** 3-3.5 hours  
**Agent-safe:** yes

**IMPORTANT:** This phase targets **client-side-ts (TypeScript)** for the student-facing certificate generation UI. Students will use the modern TypeScript frontend to view and generate their certificates. This is separate from Phase 6, which implements admin management in client-side (legacy).

#### Step 5.1: Create Certificate Feature Module

- Create `client-side-ts/src/features/certificates/` directory
- Structure following existing feature patterns:
  - `components/` - UI components
  - `api/` - API client functions
  - `types/` - TypeScript interfaces
  - `index.ts` - barrel export

#### Step 5.2: Create Event List Component

- Create `CertificateEventList.tsx` component
- Fetches all `EligibleCertificate` records for the authenticated student
- Groups by event and displays:
  - Event name, date, venue
  - Only shows events where student is eligible
  - Click handler to generate certificate for the event
  - Visual indicator for events (e.g., certificate icon, badge)

#### Step 5.3: Create Certificate Generation Component

- Create `GenerateCertificateButton.tsx` component
- Component features:
  - "Generate Certificate" button with loading state
  - Cooldown state management (disable button, show countdown)
  - Success state (trigger download)
  - Error state (display error message)
  - Only rendered if student is eligible (has EligibleCertificate record)
- Use existing UI component patterns from `client-side-ts/src/components/`
- Follow TypeScript strict mode (no `any` types)

#### Step 5.4: Implement API Client

- Create `client-side-ts/src/features/certificates/api/certificateApi.ts`
- Implement functions:
  - `getEligibleCertificates()`: Fetch all eligible certificates for authenticated student
  - `generateCertificate(eventId: string)`: Generate certificate for event
- Handle response as blob for PDF download
- Parse error responses including cooldown errors and eligibility errors
- Return typed response with success/error states
- Trigger browser download with proper filename

#### Step 5.5: Implement Cooldown UI Logic

- Track cooldown state in component:
  - Store cooldown end time in component state or localStorage
  - Use `setInterval` to update remaining time
  - Disable button and show countdown timer
  - Clear interval on unmount
- Display user-friendly messages:
  - "Generating certificate..." (loading)
  - "Please wait X seconds before generating another certificate" (cooldown)
  - "Certificate downloaded successfully" (success)
  - "You are not eligible for a certificate for this event" (not eligible)
  - Error messages from API (error)

#### Step 5.6: Create Certificate Module Page

- Create standalone page at `/certificates` route
- Display `CertificateEventList` component
- Show message if no eligible certificates: "You don't have any certificates available yet"
- Add navigation link in student dashboard or main menu
- Follow existing routing patterns in `client-side-ts/src/router.tsx`
- Ensure page fits existing layout and design system
- Add clear labeling: "My Certificates"

#### Step 5.7: Integrate into Router

- Add route to `client-side-ts/src/router.tsx`:
  - Path: `/certificates`
  - Component: `CertificatesPage`
  - Protected route (student auth required)
- Add navigation link in appropriate location (student dashboard, main menu)

> **Dependency:** Phase 4 must be complete

### Phase 6 — Admin UI for Certificate Eligibility Management (client-side ONLY)

**Risk:** low-medium  
**Effort:** 2.5-3 hours  
**Agent-safe:** yes

**IMPORTANT:** This phase targets **client-side (legacy JavaScript)** only. The client-side-ts admin module is incomplete and not ready for new features. Admin certificate management will be implemented in the production-ready legacy codebase.

#### Step 6.1: Add API Functions to client-side

- Add new functions to `client-side/src/api/admin.js`:
  - `addEligibleCertificates(eventId, attendeeIds)` - Add eligible certificates
  - `removeEligibleCertificates(eventId, attendeeIds)` - Remove eligible certificates
  - `getEligibleCertificatesByEvent(eventId)` - Get all eligible students for event
  - `importEligibleCertificatesFromCSV(eventId, csvFile)` - Import from CSV
  - `bulkCheckEligibility(eventId, studentIdNumbers)` - Validate before adding
- Follow existing patterns in `admin.js`:
  - Use `backendConnection()` for base URL
  - Use `sessionStorage.getItem("Token")` for auth
  - Use `showToast()` for user feedback
  - Handle errors with try/catch and display messages

#### Step 6.2: Create Admin Page for Certificate Eligibility

- Create `client-side/src/pages/admin/EligibleCertificates.jsx`
- Page structure:
  - Event selector dropdown (fetch from events API)
  - For selected event, display:
    - List of all attendees with checkboxes
    - Bulk select/deselect functionality
    - Current eligibility status (badge/icon for eligible students)
    - Display student ID number for quick reference
    - Filter options (show all, show eligible only, show non-eligible only)
- Follow existing admin page patterns from `client-side/src/pages/admin/`
- Use existing UI components and styling

#### Step 6.3: Implement Manual Entry UI

- Add "Add to Eligible Certificates" button
- Select multiple attendees via checkboxes
- On click:
  - Collect selected student IDs
  - Call `bulkCheckEligibility()` first to validate
  - Display validation results in modal/dialog
  - If valid students exist, call `addEligibleCertificates()`
  - Show confirmation dialog with count
  - Display success/error toast notifications
  - Refresh attendee list to show updated eligibility status

#### Step 6.4: Implement CSV Import UI

- Add "Import from CSV" button
- File upload component accepting .csv files
- CSV format: Single column of student ID numbers (no header)
- On file upload:
  - Parse CSV client-side to extract student IDs
  - Call `importEligibleCertificatesFromCSV()` API
  - Backend handles validation and ObjectId resolution
  - Display results in modal/dialog:
    - Successfully imported: X students
    - Errors: List of student IDs with reasons
      - "Student ID not found in system"
      - "Student did not attend this event"
      - "Student already eligible"
  - Allow user to review results
  - Refresh attendee list after successful import

#### Step 6.5: Implement Bulk Check Validation UI

- Before adding selected students, validate them
- Call `bulkCheckEligibility()` API endpoint
- Backend returns validation results with ObjectIds
- Display validation results in modal/dialog:
  - Valid students (can be added) - show count and names
  - Invalid students (didn't attend or don't exist) - show IDs and reasons
  - Duplicate students (already eligible) - show IDs
- Provide "Proceed with Valid Students" button
- Only add valid students when user confirms

#### Step 6.6: Implement Remove Functionality UI

- Add "Remove Eligibility" button (or checkbox action)
- Allow admin to select eligible students to remove
- On click:
  - Show confirmation dialog with count
  - Call `removeEligibleCertificates()` API
  - Display success/error toast notifications
  - Refresh attendee list to show updated status

#### Step 6.7: Add Navigation Link

- Add link to new page in admin navigation menu
- Location: `client-side/src/pages/admin/AdminDashboard.jsx` or appropriate admin menu
- Label: "Certificate Eligibility" or "Manage Certificates"
- Follow existing navigation patterns

**Note:** client-side-ts admin implementation is deferred until the admin module migration is complete. This ensures faster delivery and lower risk by working with the production-ready codebase.

> **Dependency:** Phase 3 must be complete

### Phase 7 — Testing

**Risk:** low  
**Effort:** 2.5-3 hours  
**Agent-safe:** yes

- Run `generate-tests` skill for all new modules:
  - `server-side/src/models/eligibleCertificate.model.ts`
  - `server-side/src/controllers/eligibleCertificate.controller.ts`
  - `server-side/src/controllers/certificate.controller.ts`
  - `server-side/src/routes/eligibleCertificate.route.ts`
  - `server-side/src/routes/certificate.route.ts`
  - Cooldown mechanism logic
  - `client-side-ts/src/features/certificates/` components
- Manually test:
  - Admin adds eligible certificates manually
  - Admin imports eligible certificates from CSV
  - Admin sees validation errors for invalid students
  - Verify ObjectId references are correctly stored
  - Verify studentIdNumber is correctly denormalized
  - Student sees only eligible events in certificate module
  - Student generates certificate successfully
  - Verify PDF contains correct student name
  - Verify all ICT Congress 2026 details are correct in PDF
  - Cooldown enforcement (try generating twice quickly)
  - Error handling (not eligible, invalid event ID, missing data)
  - PDF download in browser with correct filename
  - UI states (loading, success, error, cooldown, not eligible)
  - Admin removes eligibility and student can no longer generate
  - Test referential integrity (try to delete a student with eligibility record)
- Verify no regressions in existing functionality

> **Dependency:** Phases 4, 5, and 6 must be complete

### Phase 8 — Documentation & Cleanup

**Risk:** low  
**Effort:** 0.5-1 hour  
**Agent-safe:** yes

- Document new API endpoints in `docs/api.md`:
  - `POST /api/certificates/generate` - Generate certificate (student auth)
  - `POST /api/admin/eligible-certificates` - Add eligible certificates (admin auth)
  - `DELETE /api/admin/eligible-certificates` - Remove eligible certificates (admin auth)
  - `GET /api/admin/eligible-certificates/event/:eventId` - Get by event (admin auth)
  - `POST /api/admin/eligible-certificates/import-csv` - Import from CSV (admin auth)
  - `POST /api/admin/eligible-certificates/bulk-check` - Validate before adding (admin auth)
- Document new database model:
  - `EligibleCertificate` model with fields and indexes
  - Explain ObjectId reference design decision
  - Explain denormalized studentIdNumber field
- Add inline code comments for hardcoded ICT Congress data
- Add TODO comment for future generic certificate system
- Update README if needed
- Remove any debug logging
- Verify all TODOs are addressed or documented
- Create PR description with:
  - Feature overview (ICT Congress 2026-specific)
  - Testing instructions
  - Screenshots of UI (admin module, CSV import, certificate module, generated PDF)
  - Known limitations (hardcoded for ICT Congress only)
  - Database design decisions (ObjectId reference, denormalization)

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Merge conflicts during rebase | Medium | High | Stop and ask user for resolution guidance; do not auto-resolve logic conflicts |
| Missing student data in database | Low | Medium | Implement graceful error handling; return clear error messages; validate student exists |
| CSV parsing errors | Medium | Medium | Validate CSV format; provide clear error messages; show detailed import results |
| Admin adds non-attendees | Medium | High | Implement bulk check validation; only allow attendees to be added; show validation errors |
| ObjectId resolution fails during CSV import | Low | Medium | Validate student ID exists before resolving to ObjectId; show clear error messages |
| PDF generation timeout | Very Low | Low | Single certificate generation is fast; monitor in production |
| Cooldown bypass via multiple sessions | Low | Low | Use student ObjectId as cooldown key; consider IP-based tracking if needed |
| Memory leak from cooldown Map | Low | Medium | Implement cleanup mechanism; remove entries older than 10 minutes |
| Certificate template missing or broken | Medium | High | Verify template and assets exist after rebase; test with sample data before full implementation |
| Authentication middleware mismatch | Low | Medium | Review existing auth patterns; reuse existing middleware; test auth flow |
| Hardcoded data becomes outdated | Low | Low | Document that this is ICT Congress 2026-specific; add TODO for future generic system |
| Duplicate eligible certificates | Low | Low | Compound unique index on (eventId, attendeeId) prevents duplicates at database level |
| Orphaned eligibility records | Very Low | Low | ObjectId reference provides referential integrity; can add cascade delete if needed |

## Implementation Summary

**Total Estimated Effort:** 13-15.5 hours

**Phase Breakdown:**
- Phase 0: Discovery & Clarification - ✅ COMPLETE
- Phase 1: Git Rebase - 0.75h
- Phase 2: Create EligibleCertificate Model - 0.5h
- Phase 3: Admin API for Certificate Eligibility - 2.25h
- Phase 4: Server-Side Certificate Generation - 2.75h
- Phase 5: Client-Side Certificate Module (client-side-ts for students) - 3.25h
- Phase 6: Admin UI for Certificate Eligibility (client-side legacy only) - 2.75h
- Phase 7: Testing - 2.75h
- Phase 8: Documentation & Cleanup - 0.75h

**Key Features:**
1. `EligibleCertificate` model with ObjectId references for referential integrity
2. Denormalized `studentIdNumber` field for admin UI performance
3. Admin module for managing eligible certificates (client-side legacy only)
4. Manual entry with bulk check validation
5. CSV import with detailed error reporting and ObjectId resolution
6. Student certificate module showing only eligible events (client-side-ts)
7. 5-minute cooldown per student
8. ICT Congress 2026-specific hardcoded data
9. Student authentication required
10. PDF download with proper filename

**Frontend Implementation Strategy:**
- **Admin UI (Phase 6):** Implemented in `client-side/` (legacy JavaScript) - production-ready, stable codebase
- **Student UI (Phase 5):** Implemented in `client-side-ts/` (TypeScript) - modern student-facing interface
- **Rationale:** client-side-ts admin module is incomplete; focusing on legacy admin ensures faster delivery and lower risk

**Database Design Decisions:**
- `attendeeId` uses ObjectId reference to Student model for referential integrity
- `studentIdNumber` is denormalized for quick admin UI display without populate
- Compound unique index on (eventId, attendeeId) prevents duplicates
- Mongoose populate enables efficient queries when full student data is needed

## Future Enhancements (Out of Current Scope)

- Generic certificate generation system for any event
- Pull event details from database instead of hardcoding
- Dynamic signee management
- Multiple certificate templates
- Certificate history/archive
- Bulk certificate generation
- Email delivery option
- Certificate preview before download
- Certificate verification system (QR code, verification URL)
- Automatic eligibility based on evaluation completion
- Cascade delete for orphaned eligibility records
