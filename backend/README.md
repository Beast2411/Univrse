# UNIVRSE Backend

Common Express 4 and Mongoose API for the existing student portal. MongoDB-backed resources use MongoDB Atlas; timetable APIs read and write the single root `data/timetable.json` file. The existing frontend remains independent until its pages are migrated to these API routes.

## Prerequisites

- Node.js 18 or newer and npm
- A MongoDB Atlas cluster (or reachable MongoDB deployment)
- Campus latitude/longitude for live weather data

## Setup

From this `backend` directory:

```sh
npm ci
```

Copy `.env.example` to `.env` and fill the local values. Never commit `.env` or paste database credentials into source files.

```dotenv
PORT=5000
MONGO_URI=mongodb+srv://<db-user>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority
CLIENT_ORIGIN=http://localhost:5500
DNS_SERVERS=
CAMPUS_LATITUDE=<campus-latitude>
CAMPUS_LONGITUDE=<campus-longitude>
```

`DNS_SERVERS` is optional and accepts a comma-separated list of DNS server IPs. Leave it empty when the system resolver works. It is only needed in environments whose default resolver blocks MongoDB SRV lookups.

### MongoDB Atlas

1. Create an Atlas project and cluster.
2. Create a database user with access to the application database.
3. Add the development machine's IP to the Atlas network access list. Avoid `0.0.0.0/0` for a production deployment.
4. Select **Connect → Drivers**, copy the Node.js connection string, replace its placeholders, and set it as `MONGO_URI`.
5. Set the database name in that URI. Mongoose creates collections and indexes as models are used.

Set `CLIENT_ORIGIN` to the exact frontend origin, such as `http://localhost:5500` or `http://127.0.0.1:5500`. A comma-separated allowlist is accepted. The API permits requests without an Origin header for command-line clients.

## Start

```sh
npm start
```

For development with Node's watch mode:

```sh
npm run dev
```

The server connects to MongoDB before listening on `PORT` (default 5000). A missing or unreachable `MONGO_URI` causes startup to fail with a clear message. Check readiness at `http://localhost:5000/api/health`.

## API

Base URL: `http://localhost:5000/api`. All responses use `{ success, message, data }` on success and `{ success, message }` on error. Read the root [`API_CONTRACT.md`](../API_CONTRACT.md) for complete request fields, filters, statuses, and response details.

| Method and path | Purpose |
| --- | --- |
| `GET /health` | API and Mongo readiness |
| `GET /dashboard/stats` | Database-derived totals and weighted attendance |
| `GET /dashboard/recent-activity` | Recent resource records (not an activity log) |
| `GET`, `PUT /timetable` | Read/update root `../data/timetable.json` |
| `GET`, `POST /assignments` | List/create assignments |
| `GET`, `PUT`, `DELETE /assignments/:id` | Read/update/delete assignment |
| `PATCH /assignments/:id/status` | Set `Pending` or `Completed` |
| `GET`, `POST /attendance` | List/create attendance records |
| `GET`, `PUT`, `DELETE /attendance/:id` | Read/update/delete attendance record |
| `PATCH /attendance/:id/mark` | Mark one class attended or absent |
| `GET`, `POST /marketplace` | List/create listings |
| `GET`, `PUT`, `DELETE /marketplace/:id` | Read/update/delete listing |
| `PATCH /marketplace/:id/status` | Set `Available` or `Sold` |
| `GET`, `POST /events` | List/create events |
| `GET`, `PUT`, `DELETE /events/:id` | Read/update/delete event |
| `PATCH /events/:id/register` | Atomically increment aggregate registration count |
| `GET`, `POST /helpdesk` | List/create requests |
| `GET`, `PUT`, `DELETE /helpdesk/:id` | Read/update/delete request |
| `PATCH /helpdesk/:id/status` | Set `Submitted`, `In Progress`, or `Resolved` |
| `GET /weather` | Cached current conditions from Open-Meteo |

Mongo-generated `_id` strings are returned. No auth or file upload is implemented. Event registration is only a count and cannot identify or deduplicate students. Help Desk localStorage remains unchanged until a separate frontend migration.

## Request examples

Create an assignment:

```sh
curl -X POST http://localhost:5000/api/assignments \
  -H "Content-Type: application/json" \
  -d '{"title":"Lab report","subject":"Physics","description":"Submit findings","dueDate":"2026-12-01","priority":"High"}'
```

Mark a class attended:

```sh
curl -X PATCH http://localhost:5000/api/attendance/REPLACE_WITH_MONGO_ID/mark \
  -H "Content-Type: application/json" -d '{"attended":true}'
```

Create an anonymous Help Desk request:

```sh
curl -X POST http://localhost:5000/api/helpdesk \
  -H "Content-Type: application/json" \
  -d '{"category":"Technical Issue","subject":"Portal issue","description":"The page is unavailable","priority":"Medium","isAnonymous":true}'
```

Filter Marketplace listings:

```sh
curl "http://localhost:5000/api/marketplace?category=Books&status=Available&sort=price_asc"
```

Fetch timetable:

```sh
curl http://localhost:5000/api/timetable
```

## Testing and integration checks

Start the server with a working Atlas URI, then use Postman, Thunder Client, or `curl` against the routes above. For each MongoDB module, test list on an empty collection, create a valid record, list and fetch the returned `_id`, update it, exercise its PATCH route, delete it, and fetch it again (404). Also test a missing required field (400), a malformed ObjectId (400), and a valid but absent ObjectId (404). Dashboard totals should reflect records inserted during the check.

Timetable checks: GET the file, PUT the same returned body to verify a valid write, PUT `{}` and malformed JSON to verify 400 responses. To exercise GET's malformed-file handling, back up the existing root JSON, temporarily replace it with invalid JSON, call GET, then restore the original immediately. Do not leave the project timetable changed.

Weather checks: with valid coordinates set, call GET and check returned values against the API response and observed timestamp; call again within ten minutes to check the cached result. To test failure handling, temporarily use an invalid coordinate/provider-network setup and expect 502, then restore coordinates. Missing coordinates return 503. No weather result is fabricated.

Automated endpoint verification requires access to the configured MongoDB and weather network. Do not report database CRUD or provider success as tested unless those live checks pass. No test collection is included yet; the steps above are reproducible manually.

## Common errors

- **Startup says `MONGO_URI is missing`:** create `backend/.env` from `.env.example` and set a real connection URI.
- **Mongo server selection timeout:** check Atlas IP allowlist, database username/password encoding, cluster state, and outbound network access.
- **CORS error in browser:** set `CLIENT_ORIGIN` to the exact scheme/host/port of the frontend and restart.
- **Weather returns 503:** configure numeric `CAMPUS_LATITUDE` and `CAMPUS_LONGITUDE`.
- **Weather returns 502:** check network access to Open-Meteo; upstream calls time out after eight seconds.
- **404 on a resource:** verify its Mongo `_id`; browser demo/localStorage IDs are not Mongo IDs.
