# UNIVRSE API Contract

**Base URL:** `http://localhost:5000/api`

**Status:** Implemented in the common backend. MongoDB-backed routes require a configured, reachable MongoDB URI. Weather additionally requires campus coordinates.

**Authentication:** All API routes except `/health` and `/auth/register` and `/auth/login` require a valid database-backed session cookie. Browser requests must include credentials. The frontend login page is `login.html`.

Do not add endpoints or rename shared fields independently. Propose any additional endpoint to Aarush and get approval before implementation; update this contract before frontend integration.

## Response format

Success responses use `{ "success": true, "message": "...", "data": ... }`. Errors use `{ "success": false, "message": "..." }`. List routes return arrays in `data`; single-resource routes return an object. IDs are MongoDB `_id` strings. Created resources return HTTP 201; invalid input returns 400; missing resources return 404; event capacity conflicts return 409; upstream/configuration failures use 502/503; unexpected failures return 500.

## Authentication

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/auth/register` | Creates a student account from `name`, `email`, and `password`, then starts a session. Name is 2-100 characters; password is 10-128 characters. |
| POST | `/auth/login` | Verifies `email` and `password`, then starts a session. Invalid credentials return the same generic 401 message. |
| GET | `/auth/me` | Returns the current authenticated user. |
| POST | `/auth/logout` | Deletes the current session and clears the cookie. |

Sessions are random opaque tokens stored only as SHA-256 hashes in MongoDB, expire after seven days, and are delivered to the browser in an HttpOnly cookie. Passwords use salted scrypt hashes. The cookie is SameSite=Lax for local development and Secure/SameSite=None in production; production deployment must use HTTPS. Authentication is required for all other `/api` routes. Configure `CLIENT_ORIGIN` with the exact frontend origin(s); CORS allows credentialed requests only from those origins. Authenticated accounts share existing portal records; the current schemas do not assign them to individual users.

## Health and dashboard

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/health` | API/database readiness; 200 when connected, 503 otherwise |
| GET | `/dashboard/stats` | Assignment counts, weighted attendance percent, and upcoming event count |
| GET | `/dashboard/recent-activity` | Recent Assignment, Event, Help Desk, and Marketplace records ordered by `updatedAt`; derived from records, not a separate activity log |

Stats data fields: `totalAssignments`, `pendingAssignments`, `completedAssignments`, `averageAttendance`, `upcomingEvents`.

## Timetable

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/timetable` | Reads and returns the existing root `data/timetable.json` |
| PUT | `/timetable` | Validates and replaces that same JSON file |

The body/data shape has weekday keys Monday through Sunday. Each day contains an array of `{ start, end, name, instructor, room }` class objects. Times use 24-hour `HH:mm`; start must precede end and `name` must be non-empty. Writes are validated and atomically replace the same file. The backend resolves the file relative to its source, not the process working directory. No second timetable file is used.

## Assignments

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/assignments` | List; optional `subject`, `priority`, `status`, `search` query filters |
| GET | `/assignments/:id` | Fetch one |
| POST | `/assignments` | Create |
| PUT | `/assignments/:id` | Replace editable fields |
| PATCH | `/assignments/:id/status` | Update status |
| DELETE | `/assignments/:id` | Delete |

Fields: `title` (required), `subject` (required), `description`, `dueDate` (required), `priority` (`Low`, `Medium`, `High`), `status` (`Pending`, `Completed`), timestamps. Query filter `search` matches title, subject, or description. `dueDate` is a date string or ISO date accepted by JavaScript/Mongoose.

## Attendance

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/attendance` | Returns `{ subjects, weeklyClasses, recentAttendance, storage }`; optional `subject` substring filter |
| GET | `/attendance/:id` | Fetch one |
| POST | `/attendance` | Create |
| PUT | `/attendance/:id` | Replace editable fields |
| PATCH | `/attendance/:id/mark` | Add one daily record using `{ "status": "Present" }` or `{ "status": "Absent" }` and update the counts |
| DELETE | `/attendance/:id` | Delete |

Attendance follows the existing page schema: `subject`, unique lowercase `subjectKey`, `subjectCode`, `totalClasses` (positive integer), `attendedClasses` (non-negative and no greater than total), `theoryPerWeek`, `practicalPerWeek`, `image`, and `records` (`date`, `time`, `status` of `Present` or `Absent`). The GET list returns the page's aggregate object; MongoDB storage reports `storage: "mongodb"` and has an empty `weeklyClasses` list because weekly timetable data stays in `data/timetable.json`.

## Marketplace

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/marketplace` | List; optional `search`, `category`, `status`, `sort` filters |
| GET | `/marketplace/:id` | Fetch one |
| POST | `/marketplace` | Create |
| PUT | `/marketplace/:id` | Replace editable fields |
| PATCH | `/marketplace/:id/status` | Set status |
| DELETE | `/marketplace/:id` | Delete |

Fields: `title` (required), `description`, `category` (required), `price` (required non-negative number), `sellerName` (required), `contact`, `imageUrl`, `status` (`Available`, `Sold`, default `Available`), timestamps. `search` matches title. `sort` accepts `price_asc`, `price_desc`, or `newest`.

## Clubs

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/clubs` | List; optional `category` and text `search` filters |
| GET | `/clubs/:id` | Fetch one |
| POST | `/clubs` | Create; duplicate club names return 409 |
| PUT | `/clubs/:id` | Update editable club fields; duplicate names return 409 |
| DELETE | `/clubs/:id` | Delete the directory record only; related Events remain |

Fields: `name` and `category` (required), `description`, `members` (non-negative integer, default 0), `venue`, `lead`, `icon`, `iconClass` (`purple`, `green`, `orange`, `pink`, `blue`, `yellow`, or `teal`), and optional seed-only `legacyId`. Club names are unique. Club membership and favourites remain browser preferences because per-user membership records are not implemented. Upcoming Events use the separate Events API and collection.

## Events

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/events` | List; optional `search`, `category`, `club`, `period` filters |
| GET | `/events/:id` | Fetch one |
| POST | `/events` | Create |
| PUT | `/events/:id` | Replace event fields |
| PATCH | `/events/:id/register` | Atomically increments aggregate `registeredCount` if capacity remains |
| DELETE | `/events/:id` | Delete |

Fields: `title` (required), `club`, `description`, `date` (required), `time`, `venue`, `category`, `capacity` (required positive integer), `registeredCount` (default 0), timestamps. `search` matches title, club, description, and venue. `period` accepts `upcoming` or `past`. A full event returns 409. Registration requires an authenticated session but only increments an aggregate counter; it does not track student identity or prevent duplicate registrations per student.

## Help Desk

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/helpdesk` | List; optional `category`, `priority`, `status`, `search` filters |
| GET | `/helpdesk/:id` | Fetch one |
| POST | `/helpdesk` | Create |
| PUT | `/helpdesk/:id` | Replace editable fields |
| PATCH | `/helpdesk/:id/status` | Update status |
| DELETE | `/helpdesk/:id` | Delete |

Fields: `category`, `subject`, `description` (required), `priority` (`Low`, `Medium`, `High`), `isAnonymous` (default false), `submittedBy` (`{ name, email }` or `null`), `status` (`Submitted`, `In Progress`, `Resolved`), timestamps. Anonymous requests always store `submittedBy: null`; non-anonymous requests require both name and email. `search` matches subject and description. The student frontend reads/writes requests through the API and does not expose status editing; the PATCH endpoint remains available for backend management workflows. All Help Desk endpoints require an authenticated session, but requests are shared among signed-in users rather than owner-scoped.

## Weather

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/weather` | Fetches current conditions from Open-Meteo and caches a successful response for ten minutes |

Requires `CAMPUS_LATITUDE` and `CAMPUS_LONGITUDE`; no API key is required for this public forecast endpoint. Response fields: `temperature`, `apparentTemperature`, `condition`, `weatherCode`, `windSpeed`, `relativeHumidity`, `isDay`, `observedAt`, `timezone`. Missing coordinates return 503; provider timeout/unavailability returns 502.

## CORS and local configuration

Set `CLIENT_ORIGIN` in `backend/.env` to the frontend origin (or comma-separated allowed origins). It defaults to `http://localhost:5500`. Requests without an `Origin` header, such as command-line clients, are permitted by CORS, but protected routes still require a valid session cookie.
