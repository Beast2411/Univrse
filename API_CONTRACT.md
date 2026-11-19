# UNIVRSE API Contract

**Common base URL:** `http://localhost:5000/api`

Every endpoint below is **PLANNED, NOT YET IMPLEMENTED**. The API and field names are the shared contract for Evaluation 3. Keep existing frontend JSON property names when they apply. Any additional endpoint must first be proposed to Aarush and approved before implementation. Do not infer a new endpoint from an implementation need.

## Conventions

- JSON request and response bodies use the field names below. Resource IDs are opaque strings or numbers as shown by the current data; clients must treat them as opaque.
- `createdAt`, `submittedAt`, and event timestamps use ISO 8601 strings. Timetable `start` and `end` remain 24-hour `HH:mm`; assignment `dueDate` remains `YYYY-MM-DD`.
- For list endpoints, the planned response is a JSON array unless noted. Successful writes return the created/updated resource; deletes return a success response. Exact error response shape can be agreed before implementation.

## Dashboard

- `GET /dashboard/stats` — planned summary derived from existing timetable, assignments, and attendance data. No standalone dashboard record fields are agreed yet.
- `GET /dashboard/recent-activity` — planned activity list. Activity item fields are TBD and must be agreed before implementation.

## Weather

- `GET /weather` — planned current campus weather. Location, provider, and response fields are TBD and must be agreed before implementation.

## Schedule

- `GET /timetable` — returns the existing root `data/timetable.json` shape: weekday keys (`Monday` through `Sunday`) containing arrays of `{ start, end, name, instructor, room }` class records.
- `PUT /timetable` — accepts/replaces that same weekday-to-class-array shape. Do not create another timetable file; the planned backend will use the existing root `data/timetable.json`.

## Assignments

- `GET /assignments`
- `GET /assignments/:id`
- `POST /assignments`
- `PUT /assignments/:id`
- `PATCH /assignments/:id/status`
- `DELETE /assignments/:id`

Assignment fields follow `data/assignments.json`: `id`, `subject`, `title`, `description`, `dueDate`, `status`, `priority`, `progress`, and `submission` (`submittedAt`, `grade`, `note`). Stored status values: `pending`, `overdue`, `submitted`; the page's `completed` filter is a UI completion state, not an existing stored value. Priority values: `low`, `medium`, `high`.

## Attendance

- `GET /attendance`
- `GET /attendance/:id`
- `POST /attendance`
- `PUT /attendance/:id`
- `PATCH /attendance/:id/mark`
- `DELETE /attendance/:id`

Preserve the current attendance data shape: top-level `minimumAttendance`, `subjects` (`name`, `attended`, `total`, `theoryPerWeek`, `practicalPerWeek`, optional `image`), `weeklyClasses` (`day`, `classes`), and `recentAttendance` (`subject`, `date`, `time`, `status`). A mark record uses `subject`, `date`, `time`, and `status`. Allowed attendance status values: `Present`, `Absent`. Attendance has no priority field.

## Marketplace

- `GET /marketplace`
- `GET /marketplace/:id`
- `POST /marketplace`
- `PUT /marketplace/:id`
- `PATCH /marketplace/:id/status`
- `DELETE /marketplace/:id`

Product fields follow `data/products.json` and the Sell form: `id`, `name`, `price`, `category`, `condition`, `location`, `seller`, `image`. Categories currently used: `Books`, `Electronics`, `Calculators`, `Cycles`, `Accessories`, `Furniture`. Conditions: `New`, `Like New`, `Good`, `Used`. The current products have no `status` field, so status values and whether the API adds one must be agreed with Aarush before implementation. Marketplace has no priority field.

## Clubs and Events

- `GET /events`
- `GET /events/:id`
- `POST /events`
- `PUT /events/:id`
- `PATCH /events/:id/register`
- `DELETE /events/:id`

Current club/event data in `data/clubs.json` uses club fields `id`, `name`, `category`, `icon`, `iconClass`, `members`, `joined`, `description`, `nextEvent`; nested event fields currently include `day`, `name`, and `schedule`. Event API fields beyond these examples, including a stable event ID, registration representation, and status values, are TBD and must be agreed before implementation. Clubs and events have no priority field currently.

## Help Desk

- `GET /helpdesk`
- `GET /helpdesk/:id`
- `POST /helpdesk`
- `PUT /helpdesk/:id`
- `PATCH /helpdesk/:id/status`
- `DELETE /helpdesk/:id`

Request fields follow the existing Help Desk page: `id`, `category`, `subject`, `description`, `priority`, `isAnonymous`, `submittedBy` (`name`, `email`, or `null` for anonymous submissions), `status`, and `createdAt`. Categories: `Technical Issue`, `Academic Help`, `Campus Issue`, `Event or Club`, `Suggestion / Feedback`, `Other Request`. Priorities: `Low`, `Medium`, `High`. Status values: `Submitted`, `In Progress`, `Resolved`.
