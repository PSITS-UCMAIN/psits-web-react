# Attendance & Event Management Fixes — Before / After Impact

**Date**: August 23, 2026, 09:37 AM PST
**Context**: Found via live E2E testing (TEST-003) of the attendance system on event "TESTTYPESHII". All 3 bugs reproduced live, then fixed and re-verified live.
**Build**: `npm run build` in `server-side/` — exit 0 (before and after).

---

## ERR-021 — One-session-per-student rule missing

### Before
A student marked in the **morning** could be marked again in the **afternoon** (and vice versa). Both sessions recorded `attended: true`.

```
Morning mark  → 200 "Attendance for morning successfully recorded"
Afternoon mark → 200 "Attendance for afternoon successfully recorded"
→ attendance.morning.attended = true
→ attendance.afternoon.attended = true   ← both true, no restriction
```

### After
Second mark rejected with 409 regardless of which session came first.

```
Morning mark  → 200 "Attendance for morning successfully recorded"
Afternoon mark → 409 ALREADY_RECORDED_OTHER_SESSION
                 "Attendance already recorded for another session"
→ attendance.morning.attended = true
→ attendance.afternoon.attended = false  ← blocked
```

### Impact
- **Good**: One credit per student per event day. Raffle eligibility, certificates, and headcount reports no longer inflated by double marks.
- **Rule chosen (owner)**: first mark wins; any later mark in a different session is rejected. Same-session duplicates still reject with the existing `ALREADY_RECORDED` (409).
- **Note**: The check runs inside the existing mark transaction — atomic, no race window between check and write.
- **Sessions checked**: all stored sessions (morning/afternoon/evening) — an `evening` mark is also blocked if morning was already recorded, even if evening is the only enabled window at that moment.

**Files changed**: `server-side/src/services/attendance.service.ts` (+21)

---

## ERR-022 — Partial PATCH wiped event times

### Before
PATCHing an event with only some fields cleared the omitted ones. Live repro:

```
PATCH /api/v2/events/:id  { sessionConfig: {...} }   → 200
GET /api/v2/events/:id
  → eventStartTime: ""     ← was "01:30 AM"
  → eventEndTime: ""       ← was "05:00 PM"
```

**Chain reaction**: empty times → frontend `normalizeStatus` treats event as "upcoming" → `isSessionActive = false` → **Mark Attendance button disabled** even while a session window is live → officer cannot mark attendance mid-event.

### After
Omitted fields are untouched. Live repro:

```
PATCH /api/v2/events/:id  { sessionConfig: {...} }   → 200
GET /api/v2/events/:id
  → eventStartTime: "01:30 AM"   ← preserved
  → eventEndTime: "05:00 PM"     ← preserved
```

### Impact
- **Good**: Officers can edit one thing (e.g. session schedule) without silently destroying event start/end times. Mark Attendance stays enabled during live windows after partial edits.
- **Covers**: `eventName`, `eventDescription`, `eventVenue`, `eventTheme`, `eventVenueSpecific`, `eventStartTime`, `eventEndTime` — all now conditional on presence.
- **Same bug class elsewhere?** `sessionConfig` and `limit` already had presence guards — untouched. A duplicated `if (limit !== undefined)` block exists (harmless, pre-existing, not fixed).

**Files changed**: `server-side/src/controllers/eventV2.controller.ts` (+7/−7)

---

## ERR-023 — Event deletion hung forever

### Before
Deleting an event with the `_id` value (what the API returns) never answered:

```
POST /api/events/remove-event  { eventId: "6a8a...253" }   ← _id
→ (server never responds)  → client timeout, spinner forever
```

Root causes: (1) controller queried only the `eventId` string field, but V2-created events have a **different** `eventId` field value than their `_id`; (2) when nothing matched, the controller ended the transaction but **sent no response**.

### After
```
POST /api/events/remove-event  { eventId: "6a8a...253" }   ← _id
→ 200 "Event Successfully Deleted"          (matches _id)
POST /api/events/remove-event  { eventId: "0000...0000" }  ← nothing exists
→ 404 "Event not found"   (~190ms, no hang)
```

### Impact
- **Good**: Delete always answers — 200 when found (by `_id` OR `eventId` field), 404 when not, 500 on errors. No more frozen spinners / silent timeouts.
- **Cleanup bonus**: One leftover temp event from earlier testing (created before this fix, deletable only via the `eventId` field value) is now deletable by `_id` like normal API flows.
- **Risk**: None identified — success-path transaction (delete event + `Attendance.deleteMany`) unchanged.

**Files changed**: `server-side/src/controllers/event.controller.ts` (+15/−1)

---

## Summary

| Error | Severity before | Behavior before | Behavior after | Verified |
|---|---|---|---|---|
| ERR-021 | High (data integrity) | Double attendance credit | 409 on 2nd session | live 200→409 |
| ERR-022 | High (blocks marking) | Times wiped on partial edit → button disabled | Times preserved | live PATCH check |
| ERR-023 | Medium (hang/freeze) | Delete hangs forever | 200/404/500 always | live 404 190ms, delete 200 |

**Side observation (not fixed, not blocking)**: event `status` is immutable via the update API and no cron/service auto-flips it from `eventDate` — separate future work item.
