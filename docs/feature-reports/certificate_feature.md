---
title: Certificate Generation Feature (ICT Congress 2026)
created: 2026-05-16
status: implemented
---

## Overview

This feature allows authenticated students to generate and download PDF certificates of participation for the **12th UC CCS ICT Congress 2026**. The system includes admin management for certificate eligibility and implements a 5-minute cooldown mechanism to prevent abuse.

**Important:** This implementation is **ICT Congress 2026-specific**. All event details (name, theme, date, venue, signees) are hardcoded in the certificate template. Only student name and email are pulled from the database.

## Architecture

### Database Model

**EligibleCertificate Model** (`server-side/src/models/eligibleCertificate.model.ts`)

```typescript
{
  evaluationId: string;           // Unique identifier: eventId-attendeeId
  eventId: ObjectId;              // Reference to Event model
  attendeeId: ObjectId;           // Reference to Student model (for referential integrity)
  studentIdNumber?: string;       // Denormalized for quick admin UI display
  createdAt: Date;                // Timestamp
  createdBy?: string;             // Admin who added this record
}
```

**Design Decisions:**
- `attendeeId` uses ObjectId reference to Student model for referential integrity
- `studentIdNumber` is denormalized for admin UI performance (avoids populate on list views)
- Compound unique index on `(eventId, attendeeId)` prevents duplicate eligibility records
- Mongoose populate enables efficient queries when full student data is needed

### Backend Components

#### Controllers

1. **Certificate Controller** (`server-side/src/controllers/certificate.controller.ts`)
   - `generateCertificate`: Generates PDF certificate for authenticated student
   - `getEligibleCertificatesForStudent`: Fetches all eligible certificates for student
   - Implements in-memory cooldown store with automatic cleanup

2. **Eligible Certificate Controller** (`server-side/src/controllers/eligibleCertificate.controller.ts`)
   - `addEligibleCertificates`: Add one or multiple eligible certificates
   - `removeEligibleCertificates`: Remove eligibility records
   - `getEligibleCertificatesByEvent`: Get all eligible students for an event
   - `bulkCheckEligibility`: Validate students before adding
   - `importEligibleCertificatesFromCSV`: Import from CSV file

#### Routes

1. **Student Routes** (`/api/certificates`)
   - `GET /eligible` - Get eligible certificates for authenticated student
   - `POST /generate` - Generate and download certificate PDF

2. **Admin Routes** (`/api/admin/eligible-certificates`)
   - `POST /` - Add eligible certificates
   - `DELETE /` - Remove eligible certificates
   - `GET /event/:eventId` - Get eligible certificates by event
   - `POST /bulk-check` - Validate before adding
   - `POST /import-csv` - Import from CSV

### Frontend Components

#### Student UI (client-side-ts)

**Location:** `client-side-ts/src/features/certificates/`

**Components:**
- `CertificateEventList.tsx` - Displays eligible events with certificate generation buttons
- `GenerateCertificateButton.tsx` - Handles certificate generation with cooldown UI
- `certificateApi.ts` - API client functions for certificate operations

**Route:** `/student/certificates`

**Features:**
- Only shows events where student is eligible
- 5-minute cooldown with countdown timer
- Automatic PDF download on success
- Error handling for eligibility and cooldown violations
- Cooldown state persisted in localStorage

#### Admin UI (client-side)

**Location:** `client-side/src/pages/admin/EligibleCertificates.jsx`

**Route:** `/admin/certificates`

**Features:**
- Event selector dropdown
- Attendee list with eligibility status badges
- Bulk select/deselect functionality
- Filter options (all, eligible only, non-eligible only)
- Manual entry with validation
- CSV import with detailed error reporting
- Bulk check validation before adding
- Remove eligibility functionality

**Admin API Functions** (`client-side/src/api/admin.js`):
- `addEligibleCertificates(eventId, attendeeIds, createdBy)`
- `removeEligibleCertificates(eventId, attendeeIds)`
- `getEligibleCertificatesByEvent(eventId)`
- `bulkCheckEligibility(eventId, studentIdNumbers)`
- `importEligibleCertificatesFromCSV(eventId, csvFile)`

## Certificate Data Structure

The certificate PDF is generated with the following hardcoded data:

```typescript
{
  student_name: string,                    // From database
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
}
```

## Cooldown Mechanism

**Implementation:** In-memory Map with automatic cleanup

**Duration:** 5 minutes per student

**Key:** Student ObjectId (from auth token)

**Cleanup:** Entries older than 10 minutes are automatically removed to prevent memory leaks

**Response on Cooldown Violation:**
```json
{
  "success": false,
  "error": "Too many requests",
  "message": "Please wait before generating another certificate",
  "retryAfter": 180  // seconds remaining
}
```

## CSV Import Format

**File Format:** `.csv` file with single column of student ID numbers

**Example:**
```
2021-00001
2021-00002
2021-00003
```

**No header row required**

**Import Process:**
1. Parse CSV and extract student ID numbers
2. Lookup Student records by ID number to get ObjectIds
3. Validate that students attended the event (check Attendee records)
4. Check for existing eligibility records (duplicates)
5. Store both `attendeeId` (ObjectId) and `studentIdNumber` (string)
6. Return detailed results with success count and errors

**Import Results:**
```json
{
  "success": true,
  "message": "Successfully imported X eligible certificates",
  "results": {
    "imported": 10,
    "invalid": [
      { "studentId": "2021-00001", "reason": "Student ID not found in system" },
      { "studentId": "2021-00002", "reason": "Student did not attend this event" }
    ],
    "duplicates": [
      { "studentId": "2021-00003", "attendeeId": "..." }
    ],
    "errors": []
  }
}
```

## Validation Rules

### Bulk Check Validation

Before adding students to eligible certificates, the system validates:

1. **Student Exists:** Student ID must exist in the Student collection
2. **Attended Event:** Student must have an Attendee record for the event
3. **Not Duplicate:** Student must not already have an eligible certificate for the event

**Validation Response:**
```json
{
  "success": true,
  "results": {
    "valid": [
      { "studentId": "2021-00001", "attendeeId": "...", "name": "John Doe" }
    ],
    "invalid": [
      { "studentId": "2021-00002", "reason": "Student did not attend this event" }
    ],
    "duplicates": [
      { "studentId": "2021-00003", "attendeeId": "..." }
    ]
  }
}
```

### Certificate Generation Validation

1. **Authentication:** Student must be authenticated
2. **Eligibility:** Student must have an EligibleCertificate record for the event
3. **Cooldown:** Student must not have generated a certificate in the last 5 minutes
4. **Student Exists:** Student record must exist in database

## Error Handling

### Student Errors

- **401 Unauthorized:** Authentication required
- **403 Forbidden:** Not eligible for certificate
- **404 Not Found:** Student or event not found
- **429 Too Many Requests:** Cooldown period active

### Admin Errors

- **400 Bad Request:** Invalid input (missing eventId, attendeeIds, etc.)
- **404 Not Found:** Event or student not found
- **500 Internal Server Error:** Database or server errors

## Testing Checklist

### Manual Testing Required

- [ ] Admin adds eligible certificates manually
- [ ] Admin imports eligible certificates from CSV
- [ ] Admin sees validation errors for invalid students
- [ ] Verify ObjectId references are correctly stored
- [ ] Verify studentIdNumber is correctly denormalized
- [ ] Student sees only eligible events in certificate module
- [ ] Student generates certificate successfully
- [ ] Verify PDF contains correct student name
- [ ] Verify all ICT Congress 2026 details are correct in PDF
- [ ] Cooldown enforcement (try generating twice quickly)
- [ ] Error handling (not eligible, invalid event ID, missing data)
- [ ] PDF download in browser with correct filename
- [ ] UI states (loading, success, error, cooldown, not eligible)
- [ ] Admin removes eligibility and student can no longer generate
- [ ] Test referential integrity (try to delete a student with eligibility record)

### Automated Testing

Run the following commands to generate tests:

```bash
# Server-side tests
cd server-side
npm run test

# Client-side tests
cd client-side-ts
npm run test
```

## Future Enhancements

The following features are out of scope for the initial implementation but can be added in the future:

1. **Generic Certificate System**
   - Pull event details from database instead of hardcoding
   - Support multiple certificate templates
   - Dynamic signee management

2. **Bulk Operations**
   - Bulk certificate generation for multiple students
   - Automatic eligibility based on evaluation completion

3. **Certificate Management**
   - Certificate history/archive system
   - Certificate preview before download
   - Certificate verification system (QR code, verification URL)

4. **Delivery Options**
   - Email delivery of certificates
   - Scheduled certificate generation

5. **Advanced Features**
   - Certificate revocation or invalidation logic
   - Analytics/tracking of certificate generation
   - Queue-based processing for large batches

## Known Limitations

1. **ICT Congress 2026 Specific:** All event details are hardcoded
2. **Single Certificate:** Students can only generate one certificate at a time
3. **No Email Delivery:** Certificates are only available for download
4. **No Certificate History:** No record of when certificates were generated
5. **In-Memory Cooldown:** Cooldown state is lost on server restart
6. **No Queue System:** Not optimized for bulk generation

## Migration Notes

When migrating to a generic certificate system:

1. Add event details fields to Event model
2. Create Signee model for dynamic signee management
3. Create CertificateTemplate model for multiple templates
4. Update certificate controller to fetch data from database
5. Add certificate generation history tracking
6. Consider implementing queue-based processing for bulk operations
