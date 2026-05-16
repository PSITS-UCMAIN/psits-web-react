---
title: API
last_updated: 2026-05-16
generated_by: agent
---

## API Summary

The server mounts routers explicitly in `server-side/src/index.ts`. There is no file-based routing. Route descriptions below are inferred from controller names, route names, and nearby comments.

## Legacy Auth and Student Routes

### `/api`

| Method | Path                                              | Handler                                    | Auth                                                            | Notes                            |
| ------ | ------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------- | -------------------------------- |
| POST   | `/login`                                          | `loginController`                          | None                                                            | Legacy login                     |
| POST   | `/register`                                       | `registerController`                       | None                                                            | Legacy registration              |
| POST   | `/student/forgot-password`                        | `forgotPasswordController`                 | None                                                            | Student password recovery        |
| POST   | `/student/reset-password/:token`                  | `resetPasswordController`                  | None                                                            | Reset password using token       |
| GET    | `/students`                                       | `getAllActiveStudentsController`           | `admin_authenticate`                                            | List accepted students           |
| PUT    | `/students/request`                               | `setStudentMembershipRequest`              | `student_authenticate`                                          | Submit membership request        |
| GET    | `/students/deleted-students`                      | `getAllDeleteStudentController`            | `admin_authenticate`                                            | List deleted students            |
| GET    | `/students/get-membership-status/:id`             | `getMembershipStatusController`            | `both_authenticate`                                             | Check a membership status        |
| PUT    | `/students/softdelete`                            | `softDeleteStudentController`              | `admin_authenticate`                                            | Soft delete a student            |
| PUT    | `/students/restore`                               | `restoreDeletedStudentController`          | `admin_authenticate`                                            | Restore a deleted student        |
| PUT    | `/students/cancel-membership`                     | `cancelMembershipRequestController`        | `admin_authenticate`, `role_authenticate(["admin", "finance"])` | Cancel a membership request      |
| POST   | `/students/edited-student`                        | `editStudentController`                    | `admin_authenticate`                                            | Edit student data                |
| POST   | `/students/change-password-admin`                 | `changeStudentPassword`                    | `admin_authenticate`                                            | Admin changes a student password |
| GET    | `/fetch-specific-student/:id_number`              | `fetchSpecificStudentController`           | `both_authenticate`                                             | Fetch one student by ID number   |
| GET    | `/students/student-membership-history/:id_number` | `fetchSpecificMembershipHistoryController` | `admin_authenticate`                                            | Student membership history       |
| PUT    | `/students/edit-year-level/:id_number`            | `editStudentYearLevel`                     | `both_authenticate`                                             | Update year level                |
| GET    | `/students/is-year-updated/:id_number`            | `isYearUpdatedController`                  | `both_authenticate`                                             | Check year-level update state    |
| GET    | `/protected-route-admin`                          | inline handler                             | `admin_authenticate`                                            | Sample protected admin route     |
| GET    | `/protected-route-student`                        | inline handler                             | `student_authenticate`                                          | Sample protected student route   |

## Admin Routes

### `/api/admin`

| Method | Path                           | Handler                                | Auth                                                                         | Notes                          |
| ------ | ------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------ |
| GET    | `/student_search/:id_number`   | `getSearchStudentByIdController`       | `admin_authenticate`                                                         | Search student by ID           |
| POST   | `/approve-membership`          | `approveMembershipController`          | `admin_authenticate`, `role_authenticate(["admin", "finance"])`              | Approve membership             |
| PUT    | `/revoke-student`              | `revokeAllMembershipController`        | `admin_authenticate`, `role_authenticate(["admin"])`                         | Revoke membership              |
| GET    | `/history`                     | `getMembershipHistoryController`       | `admin_authenticate`                                                         | Membership history             |
| GET    | `/membership-request`          | `getMembershipRequestController`       | `admin_authenticate`                                                         | Membership requests            |
| GET    | `/get-students-count`          | `getStudentsCountController`           | `admin_authenticate`                                                         | Student count dashboard metric |
| GET    | `/get-active-membership-count` | `getActiveMembershipCountController`   | `admin_authenticate`                                                         | Active membership metric       |
| GET    | `/merchandise-created`         | `getPublishMerchandiseCountController` | `admin_authenticate`                                                         | Merchandise dashboard metric   |
| GET    | `/placed-orders`               | `getOrderPlacedCountController`        | `admin_authenticate`                                                         | Order count dashboard metric   |
| GET    | `/dashboard-stats`             | `getStudentDashboardCountController`   | `admin_authenticate`                                                         | Dashboard stats                |
| GET    | `/get-daily-sales`             | `getDailySalesController`              | `admin_authenticate`                                                         | Sales stats                    |
| GET    | `/get-all-officers`            | `getAllAdminAccountsController`        | `admin_authenticate`, `role_authenticate(["admin", "finance", "executive"])` | List officers                  |
| GET    | `/get-all-members`             | `getAllAdminMembersController`         | `admin_authenticate`                                                         | List admin members             |
| GET    | `/get-suspend-officers`        | `getAllSuspendAdminAccountController`  | `admin_authenticate`                                                         | Suspended officers             |
| POST   | `/edit-officer`                | `editAdminAccountController`           | `admin_authenticate`, `role_authenticate(["admin"])`                         | Edit officer account           |
| POST   | `/change-password-officer`     | `changeAdminPasswordController`        | `admin_authenticate`, `role_authenticate(["admin"])`                         | Change officer password        |
| PUT    | `/suspend`                     | `setSuspendAdminAccountController`     | `admin_authenticate`, `role_authenticate(["admin"])`                         | Suspend officer                |
| PUT    | `/role-remove`                 | `setMemberRoleRemoveController`        | `admin_authenticate`, `role_authenticate(["admin", "executive"])`            | Remove member role             |
| PUT    | `/restore-officer`             | `setRestoreAdminAccountController`     | `admin_authenticate`, `role_authenticate(["admin"])`                         | Restore officer                |
| PUT    | `/request-role`                | `setAdminRequestRoleController`        | `admin_authenticate`                                                         | Change request role            |
| GET    | `/get-request-role`            | `getAllRequestMemberController`        | `admin_authenticate`                                                         | Member role requests           |
| GET    | `/get-request-admin`           | `getAllRequestAdminAccountController`  | `admin_authenticate`                                                         | Admin account requests         |
| PUT    | `/approve-role`                | `approveRoleMemberController`          | `admin_authenticate`, `role_authenticate(["admin"])`                         | Approve member role            |
| PUT    | `/decline-role`                | `setDeclineMemberRoleController`       | `admin_authenticate`, `role_authenticate(["admin"])`                         | Decline member role            |
| POST   | `/add-officer`                 | `addNewAdminAccountController`         | `admin_authenticate`, `role_authenticate(["admin"])`                         | Add officer                    |
| PUT    | `/approve-admin-account`       | `approveAdminAccountController`        | `admin_authenticate`, `role_authenticate(["admin"])`                         | Approve admin account          |
| PUT    | `/decline-admin-account`       | `declineAdminAccountController`        | `admin_authenticate`, `role_authenticate(["admin"])`                         | Decline admin account          |
| PUT    | `/update-admin-access`         | `setNewAdminAccessController`          | `admin_authenticate`                                                         | Update admin access level      |
| GET    | `/get-membership-price`        | `getMembershipPrice`                   | `both_authenticate`                                                          | Get membership price           |
| PUT    | `/change-membership-price`     | `changeMembershipPrice`                | `admin_authenticate`, `role_authenticate(["finance", "admin"])`              | Change membership price        |

## Merchandise Routes

### `/api/merch`

| Method | Path                            | Handler                                         | Auth                                                            | Notes                                |
| ------ | ------------------------------- | ----------------------------------------------- | --------------------------------------------------------------- | ------------------------------------ |
| POST   | `/`                             | `createMerchandiseController`                   | `admin_authenticate`, `role_authenticate(["admin", "finance"])` | Create merchandise with image upload |
| GET    | `/retrieve`                     | `retrieveActiveMerchandiseController`           | `both_authenticate`                                             | Active merchandise list              |
| GET    | `/retrieve-publish-merchandise` | `retrieveActiveAndPublishMerchandiseController` | `both_authenticate`                                             | Active and published merchandise     |
| GET    | `/retrieve/:id`                 | `retrieveSpecificMerchandiseController`         | `both_authenticate`                                             | Single merchandise item              |
| GET    | `/retrieve-admin`               | `retrieveMerchAdminController`                  | `admin_authenticate`                                            | Admin merchandise view               |
| DELETE | `/delete-report`                | `deleteReportController`                        | `admin_authenticate`, `role_authenticate(["admin", "finance"])` | Delete merchandise report            |
| PUT    | `/update/:_id`                  | `updateMerchandiseController`                   | `admin_authenticate`, `role_authenticate(["admin", "finance"])` | Update merchandise                   |
| PUT    | `/delete-soft`                  | `softDeleteMerchandiseController`               | `admin_authenticate`, `role_authenticate(["admin", "finance"])` | Soft delete merchandise              |
| PUT    | `/publish`                      | `publishMerchandiseController`                  | `admin_authenticate`, `role_authenticate(["admin", "finance"])` | Publish merchandise                  |
| GET    | `/reports`                      | `retrieveReportController`                      | `admin_authenticate`                                            | Merchandise reports                  |

## Orders Routes

### `/api/orders`

| Method | Path                      | Handler                          | Auth                                                            | Notes                      |
| ------ | ------------------------- | -------------------------------- | --------------------------------------------------------------- | -------------------------- |
| GET    | `/`                       | `getSpecificOrdersController`    | `both_authenticate`                                             | Orders for a specific user |
| GET    | `/get-all-orders`         | `getAllOrdersController`         | `admin_authenticate`                                            | All orders                 |
| GET    | `/get-all-pending-orders` | `getAllPendingOrdersController`  | `admin_authenticate`                                            | Pending orders             |
| GET    | `/get-all-paid-orders`    | `getAllPaidOrdersController`     | `admin_authenticate`                                            | Paid orders                |
| POST   | `/student-order`          | `studentAndAdminOrderController` | `both_authenticate`                                             | Create an order            |
| PUT    | `/cancel/:product_id`     | `cancelOrderController`          | `both_authenticate`                                             | Cancel an order            |
| PUT    | `/approve-order`          | `approveOrderController`         | `admin_authenticate`, `role_authenticate(["admin", "finance"])` | Approve order              |
| GET    | `/get-all-pending-counts` | `getAllPendingCountController`   | `admin_authenticate`                                            | Pending order count        |
| POST   | `/refund`                 | `refund`                         | `admin_authenticate`, `role_authenticate(["admin", "finance"])` | Create refund record       |
| GET    | `/get-refund`             | `getAllRefund`                   | `admin_authenticate`, `role_authenticate(["admin", "finance"])` | List refunds               |

## Cart Routes

### `/api/cart`

| Method | Path                | Handler                     | Auth                   | Notes                    |
| ------ | ------------------- | --------------------------- | ---------------------- | ------------------------ |
| POST   | `/add-cart`         | `addCartController`         | `student_authenticate` | Add item to student cart |
| GET    | `/view-cart`        | `viewStudentCartController` | `student_authenticate` | View cart                |
| PUT    | `/delete-item-cart` | `deleteItemCartController`  | `student_authenticate` | Remove item from cart    |

## Logs Routes

### `/api/logs`

| Method | Path | Handler                | Auth                 | Notes            |
| ------ | ---- | ---------------------- | -------------------- | ---------------- |
| GET    | `/`  | `getAllLogsController` | `admin_authenticate` | List logs        |
| POST   | `/`  | `addNewLogController`  | `admin_authenticate` | Create log entry |

## Events Routes

### `/api/events`

| Method | Path                                  | Handler                                | Auth                                                 | Notes                             |
| ------ | ------------------------------------- | -------------------------------------- | ---------------------------------------------------- | --------------------------------- |
| POST   | `/create-event`                       | `createManualEventController`          | `admin_authenticate`                                 | Create event with S3 image upload |
| GET    | `/get-all-event`                      | `getAllEventsController`               | `both_authenticate`                                  | List events                       |
| GET    | `/attendees/:id`                      | `getAllEventsAndAttendeesController`   | `admin_authenticate`                                 | Event attendees                   |
| PUT    | `/attendance/:event_id/:id_number`    | `updateAttendancePerSessionController` | `admin_authenticate`                                 | Update attendance per session     |
| GET    | `/check-limit/:eventId`               | `checkLimitPerCampusController`        | `admin_authenticate`                                 | Check campus limits               |
| POST   | `/update-settings/:eventId`           | `updateLimitSettingsController`        | `admin_authenticate`                                 | Update event settings             |
| GET    | `/raffle/:eventId`                    | `getEligibleAttendeesRaffleController` | `admin_authenticate`                                 | Eligible raffle attendees         |
| POST   | `/raffle/winner/:eventId/:attendeeId` | `setAttendeeAsRaffleWinnerController`  | `admin_authenticate`                                 | Mark raffle winner                |
| PUT    | `/raffle/remove/:eventId/:attendeeId` | `removeAttendeeInRaffleController`     | `admin_authenticate`                                 | Remove raffle attendee            |
| POST   | `/add-attendee`                       | `addAttendeeController`                | `admin_authenticate`                                 | Add attendee                      |
| GET    | `/get-statistics/:eventId`            | `getEventStatisticsController`         | `admin_authenticate`                                 | Event statistics                  |
| POST   | `/remove-event`                       | `removeEventController`                | `admin_authenticate`, `role_authenticate(["admin"])` | Remove event                      |
| POST   | `/remove-attendance`                  | `removeAttendanceController`           | `admin_authenticate`                                 | Remove attendance                 |

## Documentation Routes

### `/api/docs`

| Method | Path                            | Handler                | Auth                 | Notes                        |
| ------ | ------------------------------- | ---------------------- | -------------------- | ---------------------------- |
| GET    | `/stats`                        | `getDocStats`          | None                 | Documentation stats          |
| GET    | `/feature-categories`           | `getFeatureCategories` | None                 | Feature categories           |
| GET    | `/api-methods`                  | `getApiMethods`        | None                 | API methods reference        |
| GET    | `/endpoints`                    | `getApiEndpoints`      | `admin_authenticate` | List documentation endpoints |
| GET    | `/endpoints/:endpointId`        | `getApiEndpointById`   | `admin_authenticate` | Endpoint details             |
| GET    | `/features`                     | `getFeatures`          | `admin_authenticate` | List documented features     |
| GET    | `/features/:featureId`          | `getFeatureById`       | `admin_authenticate` | Feature details              |
| POST   | `/endpoints`                    | `createApiEndpoint`    | `admin_authenticate` | Create endpoint entry        |
| POST   | `/features`                     | `createFeature`        | `admin_authenticate` | Create feature entry         |
| PUT    | `/endpoints/:endpointId`        | `updateApiEndpoint`    | `admin_authenticate` | Update endpoint entry        |
| PUT    | `/features/:featureId`          | `updateFeature`        | `admin_authenticate` | Update feature entry         |
| DELETE | `/endpoints/:endpointId`        | `deleteApiEndpoint`    | `admin_authenticate` | Soft delete endpoint         |
| DELETE | `/features/:featureId`          | `deleteFeature`        | `admin_authenticate` | Soft delete feature          |
| PATCH  | `/endpoints/:endpointId/toggle` | `toggleEndpointStatus` | `admin_authenticate` | Toggle endpoint status       |
| PATCH  | `/features/:featureId/toggle`   | `toggleFeatureStatus`  | `admin_authenticate` | Toggle feature status        |

## V2 Auth Routes

### `/api/v2/auth`

| Method | Path       | Handler               | Auth | Notes                                            |
| ------ | ---------- | --------------------- | ---- | ------------------------------------------------ |
| POST   | `/login`   | `loginV2Controller`   | None | New login flow with access and refresh tokens    |
| POST   | `/refresh` | `refreshV2Controller` | None | Refresh access token from cookie                 |
| POST   | `/logout`  | `logoutV2Controller`  | None | Clear refresh cookie and invalidate stored token |

## V2 Event Routes

### `/api/v2/events`

| Method | Path                                     | Handler                                  | Auth                                                               | Notes                                    |
| ------ | ---------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| GET    | `/get-all-event`                         | `getAllEventsV2Controller`               | `requireAccessTokenV2`, `roleAuthenticateV2(["Admin", "Student"])` | List events                              |
| GET    | `/my-events`                             | `getMyEventsController`                  | `requireAccessTokenV2`, `roleAuthenticateV2(["Student"])`          | Student event list                       |
| GET    | `/:eventId`                              | `getEventByIdV2Controller`               | `requireAccessTokenV2`, `roleAuthenticateV2(["Admin", "Student"])` | Event details                            |
| GET    | `/:eventId/attendees`                    | `getEventAttendeesV2Controller`          | `requireAccessTokenV2`, `roleAuthenticateV2(["Admin"])`            | Paginated attendees                      |
| GET    | `/:eventId/statistics`                   | `getEventStatisticsV2Controller`         | `requireAccessTokenV2`, `roleAuthenticateV2(["Admin"])`            | Event stats                              |
| POST   | `/:eventId/attendees`                    | `addAttendeeV2Controller`                | `requireAccessTokenWithDBCheck`, `roleAuthenticateV2(["Admin"])`   | Add attendee and possibly create account |
| PUT    | `/:eventId/attendance/:idNumber`         | `markAttendanceV2Controller`             | `requireAccessTokenWithDBCheck`, `roleAuthenticateV2(["Admin"])`   | Mark attendance                          |
| GET    | `/:eventId/attendees/:idNumber/editable` | `getEditableAttendeeV2Controller`        | `requireAccessTokenWithDBCheck`, `roleAuthenticateV2(["Admin"])`   | Editable attendee data                   |
| PUT    | `/:eventId/attendees/:idNumber`          | `editAttendeeV2Controller`               | `requireAccessTokenWithDBCheck`, `roleAuthenticateV2(["Admin"])`   | Edit attendee                            |
| PUT    | `/:eventId/attendees/:idNumber/password` | `changeAttendeePasswordV2Controller`     | `requireAccessTokenWithDBCheck`, `roleAuthenticateV2(["Admin"])`   | Change attendee password                 |
| GET    | `/raffle/:eventId/`                      | `getEligibleAttendeesRaffleV2Controller` | `requireAccessTokenV2`, `roleAuthenticateV2(["Admin"])`            | Eligible raffle participants             |
| POST   | `/raffle/:eventId/draw`                  | `drawEventRaffleWinnerController`        | `requireAccessTokenWithDBCheck`, `roleAuthenticateV2(["Admin"])`   | Draw raffle winner                       |
| POST   | `/raffle/:eventId/undo/:attendeeId`      | `undoEventRaffleWinnerController`        | `requireAccessTokenWithDBCheck`, `roleAuthenticateV2(["Admin"])`   | Undo raffle winner                       |

## V2 Student Routes

### `/api/v2/students`

| Method | Path                  | Handler                    | Auth                                                      | Notes                |
| ------ | --------------------- | -------------------------- | --------------------------------------------------------- | -------------------- |
| GET    | `/lookup/:id_number`  | `getStudentLookupForAdmin` | `requireAccessTokenV2`, `roleAuthenticateV2(["Admin"])`   | Admin student lookup |
| GET    | `/profile/:id_number` | `getStudentProfile`        | `requireAccessTokenV2`, `roleAuthenticateV2(["Student"])` | Student profile      |

## Notes

- The V2 auth middleware uses a layered pattern: token verification first, then role authorization, then optional DB-backed verification for sensitive operations.
- Route descriptions above are inferred from the handler names and nearby comments; they are not formal API docs from the backend itself.
