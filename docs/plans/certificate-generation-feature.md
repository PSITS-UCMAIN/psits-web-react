---
title: Certificate Generation Feature Implementation (ICT Congress 2026)
planned: 2026-05-16
updated: 2026-05-16
planned_by: agent
status: approved
---

## What Was Planned

A certificate generation feature **specifically for the 12th UC CCS ICT Congress 2026** that allows authenticated students to generate and download PDF certificates of participation. The implementation includes:
- A new `EligibleCertificate` model to track certificate eligibility with ObjectId references
- Admin module for managing eligible certificates (manual entry, bulk check, CSV import)
- Dedicated client-side certificate generation module
- 5-minute cooldown mechanism to prevent abuse
- Student authentication requirement

**Key Constraint:** This is an **ICT Congress 2026-specific implementation**. All event details (name, theme, date, venue, signees) are hardcoded in the template. Only student name and email are dynamically pulled from the database.

## Key Decisions

- **Frontend Implementation Strategy**: Split implementation across two frontends:
  - **Student UI (Phase 5):** Implemented in `client-side-ts/` (TypeScript) — Modern React 19 with Radix UI primitives, Tailwind CSS 4, pill-shaped buttons (`rounded-full`), glassmorphism effects, and strict TypeScript
  - **Admin UI (Phase 6):** Implemented in `client-side/` (Legacy JavaScript) — Production-ready React 18 with Tailwind CSS 3, Framer Motion animations, institutional aesthetic
  - **Rationale:** client-side-ts admin module is incomplete; focusing on legacy admin ensures faster delivery and lower risk while providing students with the modern TypeScript interface

- **ICT Congress-Specific Scope**: After examining the certificate template, determined that the implementation is for ICT Congress 2026 only, not a generic event certificate system. This significantly simplifies the implementation by eliminating the need for dynamic event data queries and complex database schema work.

- **EligibleCertificate Model with ObjectId References**: Created a new standalone model with ObjectId references to Student model for referential integrity. This ensures:
  - Database-level validation that students exist
  - No orphaned eligibility records
  - Efficient queries with Mongoose populate
  - Follows MongoDB best practices

- **Denormalized studentIdNumber Field**: Added optional `studentIdNumber` string field for admin UI performance. This allows quick display of student IDs without needing to populate the full Student reference, while maintaining referential integrity through the ObjectId.

- **Admin Certificate Management Module**: Created a dedicated admin module in event administration for managing certificate eligibility. Supports:
  - Manual entry with bulk selection
  - CSV import with detailed error reporting and ObjectId resolution
  - Bulk check validation (ensures only attendees can be added)
  - Remove functionality

- **CSV Import with Validation**: Admin can import a CSV file containing student ID numbers. The system:
  - Resolves student ID numbers to ObjectIds
  - Validates each student (exists in system, attended event, not already eligible)
  - Provides detailed error reporting for any issues

- **Dedicated Certificate Module**: Created a standalone certificate generation module that fetches all `EligibleCertificate` records for the authenticated student. Only shows events where the student is eligible.

- **Hardcoded Event Data**: All ICT Congress 2026 details are hardcoded in the controller:
  - Event name, theme, date, time, venue
  - 4 deans as signees (Neil A. Basabe, Dr. Janette Tanquis, Eric Ortega, Carlo D. Petalver)
  - Images (logos and e-signatures)
  - Fonts (AlexBrush, Cinzel, Montserrat)
  - Only dynamic data: student name and email from database

- **Rebase Strategy**: Chose to rebase `ram/certs2` into `ram/cert-feat` rather than cherry-picking or merging to maintain a clean commit history and bring in all certificate-related utilities, templates, and assets as a cohesive unit.

- **Cooldown Implementation**: Opted for an in-memory Map-based cooldown (5 minutes per student) using student ObjectId as the key. This is sufficient for MVP and avoids additional database queries. Includes cleanup mechanism to prevent memory leaks.

- **Queue System Deferred**: Single certificate generation is fast enough (<2 seconds) for synchronous processing, making queue unnecessary for MVP. Can be added later if needed.

- **Direct PDF Generation**: Chose to call the PDF generation utility directly rather than the email function, since the requirement is download-only (not email delivery).

## Phases at a Glance

| Phase | Effort | Risk | Agent-safe | Frontend Target |
|-------|--------|------|------------|-----------------|
| Phase 0: Discovery & Clarification | 1h | Low | Yes ✅ COMPLETE | N/A |
| Phase 1: Git Rebase | 0.75h | Medium | No (requires human review) | N/A |
| Phase 2: Create EligibleCertificate Model | 0.5h | Low | Yes | N/A |
| Phase 3: Admin API for Certificate Eligibility | 2.25h | Low-Medium | Yes | N/A |
| Phase 4: Server-Side Certificate Generation | 2.75h | Low-Medium | Yes | N/A |
| Phase 5: Client-Side Certificate Module | 3.25h | Low | Yes | **client-side-ts** (TypeScript) |
| Phase 6: Admin UI for Certificate Eligibility | 2.75h | Low-Medium | Yes | **client-side** (Legacy JS) |
| Phase 7: Testing | 2.75h | Low | Yes | Both |
| Phase 8: Documentation & Cleanup | 0.75h | Low | Yes | N/A |

**Design References:**
- **Phase 5 (Student UI):** Follow `client-side-ts/DESIGN.md` — Modern React 19 + TypeScript with Radix UI, Tailwind CSS 4, pill-shaped buttons, glassmorphism effects
- **Phase 6 (Admin UI):** Follow `client-side/DESIGN.md` — Legacy React 18 + JavaScript with Tailwind CSS 3, Framer Motion, institutional aesthetic

**Total Estimated Effort:** 13-15.5 hours

## What Was Explicitly Left Out

- **Generic certificate generation for any event** — Current implementation is ICT Congress 2026-specific. Future enhancement would require pulling event details from database, dynamic signee management, and multiple template support.

- **Bulk certificate generation** — Deferred to future iteration; current scope is single certificate per request to keep implementation simple and testable.

- **Certificate template customization UI** — Templates are managed via EJS files in the codebase; no admin UI for template editing is in scope.

- **Certificate history/archive system** — Certificates are generated on-demand only; no persistent storage or retrieval of previously generated certificates.

- **Email delivery** — Only download is supported; the existing `certificateOfParticipationEmail` function exists but is not used in this feature (download-only requirement).

- **Queue-based processing** — Not needed for single certificate generation which is fast enough for synchronous processing. Can be added later if production metrics indicate need.

- **Certificate revocation or invalidation** — No mechanism to mark certificates as invalid or revoked; assumes certificates are always valid once generated.

- **Analytics/tracking** — No logging or analytics for certificate generation events beyond standard server logs.

- **Dynamic signee management** — 4 deans are hardcoded in the template; no database or configuration for managing signees.

- **Multiple certificate templates** — Only one template for ICT Congress 2026; no support for different event types or template variations.

- **Certificate preview** — No preview functionality before download; certificate is generated and downloaded immediately.

- **Certificate verification system** — No QR code or verification URL to validate certificate authenticity.

- **Automatic eligibility based on evaluation** — Admin must manually manage eligibility; no automatic population based on evaluation completion.

- **Cascade delete for orphaned records** — ObjectId reference provides referential integrity but no automatic cascade delete implemented.

## Risks to Watch

1. **Merge conflicts during rebase** (Medium likelihood, High impact): The `ram/certs2` branch may have diverged significantly from `ram/cert-feat`. Logic conflicts must be reviewed by a human rather than auto-resolved.

2. **CSV parsing errors** (Medium likelihood, Medium impact): CSV files may have incorrect format or encoding issues. Comprehensive validation and clear error messages are implemented.

3. **Admin adds non-attendees** (Medium likelihood, High impact): Admin might accidentally try to add students who didn't attend. Bulk check validation ensures only attendees can be added.

4. **ObjectId resolution fails during CSV import** (Low likelihood, Medium impact): Student ID numbers in CSV may not exist in system. Clear error messages identify which student IDs failed.

## Answered Critical Questions

All critical questions have been answered and the plan is approved:

1. **Button Visibility Condition**: Controlled by `EligibleCertificate` model. Admin manages eligibility via new admin module with manual entry, bulk check, and CSV import.

2. **Event Context**: Dedicated client-side certificate module that fetches all `EligibleCertificate` records for authenticated student. Only shows events where student is eligible.

3. **Authentication Requirements**: Student auth only. Students can only generate their own certificates.

4. **Attendance Verification**: Handled by `EligibleCertificate` model. Admin ensures only attendees are added via bulk check validation.

5. **Queue System Decision**: Deferred. Not needed for single certificate generation.

6. **API Endpoint Naming**: `/api/certificates/generate`

## New Database Model

**EligibleCertificate Model (`server-side/src/models/eligibleCertificate.model.ts`):**
```typescript
{
  evaluationId: string;
  eventId: ObjectId; // reference to Event
  attendeeId: ObjectId; // reference to Student (for referential integrity)
  studentIdNumber: string; // optional, denormalized for quick display
  createdAt: Date;
  createdBy: string; // admin who added this record
}
```

**Key Design Decisions:**
- `attendeeId` uses ObjectId reference to Student model for referential integrity
- `studentIdNumber` is denormalized for admin UI performance (no populate needed for display)
- Compound unique index on (eventId, attendeeId) prevents duplicates
- Mongoose populate enables efficient queries when full student data is needed

## New API Endpoints

**Student Endpoints:**
- `POST /api/certificates/generate` - Generate certificate for authenticated student (requires EligibleCertificate record)

**Admin Endpoints:**
- `POST /api/admin/eligible-certificates` - Add eligible certificates (manual or bulk)
- `DELETE /api/admin/eligible-certificates` - Remove eligible certificates
- `GET /api/admin/eligible-certificates/event/:eventId` - Get all eligible students for an event (with populate)
- `POST /api/admin/eligible-certificates/import-csv` - Import from CSV file (resolves student IDs to ObjectIds)
- `POST /api/admin/eligible-certificates/bulk-check` - Validate students before adding (returns ObjectIds)

## Artifact Locations

- **Plan (Markdown)**: `.agents/plan/certificate-generation-feature.plan.md`
- **Plan (JSON)**: `.agents/plan/certificate-generation-feature.plan.json` *(to be created during implementation)*
- **Summary Record**: `docs/plans/certificate-generation-feature.md` *(this file)*

## Design Implementation Guidelines

### Phase 5: Student Certificate Module (client-side-ts)

**Design Reference:** `client-side-ts/DESIGN.md`

**Key Design Patterns to Follow:**
- **Component Structure:** Feature-based organization in `src/features/certificates/`
- **UI Components:** Use Radix UI primitives (Dialog, Button, Badge) with custom styling
- **Button Style:** `rounded-full` (pill-shaped), primary color `#1c9dde`, with `active:scale-95` feedback
- **Typography:** Switzer font family, heading sizes from DESIGN.md type scale
- **Colors:** Use semantic tokens (`--color-primary`, `--color-success`, `--color-danger`)
- **Spacing:** Tailwind spacing scale, common patterns: `p-6` for cards, `gap-6` for sections
- **Animations:** Framer Motion for complex interactions, CSS transitions for simple states
- **Loading States:** Use existing skeleton patterns with `animate-pulse`
- **Error Handling:** Toast notifications using existing patterns (sonner or notyf)
- **Border Radius:** Cards use `rounded-xl` (12px), inputs use `rounded-md` (6px)
- **Shadows:** Minimal approach, subtle shadows only
- **TypeScript:** Strict mode, no `any` types, proper interface definitions

**Certificate List Component:**
- Card-based layout with `rounded-xl` and `p-6`
- Event name in heading style (Switzer, semibold)
- "Generate Certificate" button with pill shape and primary color
- Loading state with spinner and disabled button
- Empty state message if no eligible certificates

**Certificate Generation Button:**
- Pill-shaped (`rounded-full`) with primary background
- Loading state: Spinner icon with "Generating..." text
- Cooldown state: Disabled with countdown timer display
- Success state: Brief success message before download
- Error state: Red text with error message from API

### Phase 6: Admin Certificate Management (client-side)

**Design Reference:** `client-side/DESIGN.md`

**Key Design Patterns to Follow:**
- **Component Structure:** Page-based in `src/pages/admin/`
- **UI Style:** Institutional aesthetic with teal-blue color scheme (`#4398AC`)
- **Button Style:** `rounded-md` with slate background (`bg-slate-800`)
- **Typography:** Montserrat font family, extrabold headings
- **Colors:** Use Tailwind config tokens (`primary`, `secondary`, `accent`)
- **Spacing:** Standard Tailwind scale, common patterns: `p-4` to `p-6` for cards
- **Animations:** Framer Motion for interactive elements (hover scale, tap feedback)
- **Form Inputs:** Standard input style with `py-2 px-3`, focus shadow
- **Modals:** Fixed overlay with backdrop blur, white content with `rounded-xl`
- **Tables:** Full width with hover states (`hover:bg-gray-50`)
- **Notifications:** React Toastify with colored theme

**Admin Page Structure:**
- Event selector dropdown at top
- Attendee list in table format with checkboxes
- Action buttons: "Add to Eligible", "Import CSV", "Remove"
- Filter options: Show all / Eligible only / Non-eligible only
- Status badges for eligible students (colored, `rounded-full`)

**CSV Import Modal:**
- File upload component with drag-and-drop
- Results display in modal with categorized lists:
  - Success: Green text with count
  - Errors: Red text with student IDs and reasons
  - Duplicates: Yellow text with student IDs
- "Close" and "Confirm Import" buttons

**Bulk Check Validation Modal:**
- Similar to CSV import results
- Three sections: Valid, Invalid, Duplicate
- "Proceed with Valid Students" button
- Cancel option

## Next Steps

1. ✅ Plan approved - all critical questions answered
2. ✅ Database design finalized - ObjectId references with denormalization
3. ✅ Design guidelines documented - Separate patterns for each frontend
4. Begin implementation with Phase 1 (Git Rebase)
5. Follow phases sequentially as outlined in the detailed plan
6. **Refer to respective DESIGN.md files during implementation**
7. Run tests after each major phase
8. Create PR with comprehensive documentation

## Implementation Notes

- The implementation is ICT Congress 2026-specific to reduce complexity and implementation time
- Admin has full control over certificate eligibility via `EligibleCertificate` model
- CSV import provides efficient bulk management with detailed error reporting and ObjectId resolution
- Students can only generate certificates for events where they have an `EligibleCertificate` record
- ObjectId references ensure referential integrity and prevent orphaned records
- Denormalized `studentIdNumber` field optimizes admin UI performance
- Future enhancement to generic system would require significant refactoring but can be done without breaking this implementation
- Consider adding a TODO comment in the code pointing to this plan for future developers who need to generalize the system
