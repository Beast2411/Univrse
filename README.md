# UNIVRSE

> Your entire college, in one place.

UNIVRSE is a student-focused college companion with a dashboard, timetable, assignments, attendance tools, student clubs, a marketplace, and a Help Desk. Its multi-page HTML/CSS/JavaScript frontend uses a shared Express API for Dashboard, Schedule and Help Desk, while other modules retain their current data sources.

## Live Website

UNIVRSE is live at **[univrse1.onrender.com/dashboard.html](https://univrse1.onrender.com/dashboard.html)**.

## Features

### Dashboard

- Daily overview with timetable information and upcoming work.
- UNI Assistant actions for today's classes, assignments due soon, and attendance. The assistant reads the existing JSON data files and reports missing data when it is unavailable. There is no campus events JSON source at this time.
- Focus Mode with a 25-minute Pomodoro timer, pause and reset controls, a break reminder, and a next-session action.
- My Goals form with a deadline and priority, an interactive checklist, and completion progress. Goals exist only for the current page session and are cleared when the page is reloaded.
- Global light and dark theme control. The Dashboard toggle saves the selected theme in browser storage so it carries across the other pages.

### Schedule

- Weekly timetable is loaded from the backend, which reads and writes the existing root `data/timetable.json`.
- Select a day or navigate between weeks to see class times, rooms, instructors, and the current class.
- Add, edit, or remove classes, then save the weekly timetable through `PUT /api/timetable`.

### Assignments

- Assignment list, status filters, search, sorting, completion controls, and upcoming deadlines.
- Assignment records and completion status are loaded and saved through the backend API.

### Attendance

- Overall and subject-level attendance, charts, recent records, and attendance calculations use backend Attendance records.
- Supports a configurable attendance target and custom subjects. These preferences are kept in browser storage.

### Clubs

- Browse student organizations and descriptions from the local clubs data.
- Upcoming event lists are loaded from the Events API.

### Marketplace

- Browse Marketplace listings loaded from MongoDB through the backend API.
- Search listings, filter by category or condition, sort by price or date, and view listing details.
- Create and manage listings through the Marketplace API.

### Help Desk

- Submit, review, search, filter, edit, delete, and export requests from the MongoDB-backed Help Desk API.
- Anonymous requests store no submitter identity. Non-anonymous requests send name and email to the backend.
- Status is read-only in the student page; status changes remain on the backend management API.

## Pages

| Page | Purpose |
| --- | --- |
| `dashboard.html` | Daily overview, assistant, Focus Mode, My Goals, and theme toggle |
| `schedule.html` | Weekly timetable and upcoming classes |
| `assignments.html` | Assignment tracking, filters, and completion status |
| `attendance.html` | Attendance insights, records, and calculator |
| `clubs.html` | Student organizations and campus events |
| `marketplace.html` | Student listings, search, filters, and demo listing form |
| `helpdesk.html` | Database-backed request form, history, filters, and JSON export |

## Data Files

| File | Used for |
| --- | --- |
| `data/timetable.json` | Schedule page and Dashboard timetable/assistant |
| `data/Attendance.json` | Local Attendance fallback snapshot |
| `data/clubs.json` | Local club descriptions and membership demo content |

Keep the JSON files valid and preserve their existing property names when editing the data. Pages that load JSON with `fetch()` need to be served over HTTP; opening an HTML file directly may block those requests.

## Browser Storage

Some preferences and demonstration interactions are stored in the browser:

| Data | Storage behavior |
| --- | --- |
| Theme preference | Saved as `univrse.theme` and shared across pages on this browser and site origin |
| Assignment completion | Saved locally in this browser |
| Attendance target and custom subjects | Saved locally in this browser |
| Dashboard goals and Marketplace demo listings | Kept in memory for the current page session only |

Clearing browser data or using a different browser/device will not carry over browser-stored data.

## Run Locally

1. Clone or download the repository.
2. Configure the backend by following `backend/README.md`, then start `npm start` from the `backend` directory in one terminal.
3. Open a second terminal in the repository root and start a local web server:

   ```sh
   python -m http.server 8000
   ```

4. Open [http://localhost:8000/dashboard.html](http://localhost:8000/dashboard.html) in a browser.
5. Use the sidebar to navigate between pages.

VS Code Live Server can also be used. No build step or external JavaScript dependencies are required.

## Project Structure

```text
UNIVRSE/
|-- dashboard.html
|-- schedule.html
|-- assignments.html
|-- attendance.html
|-- clubs.html
|-- marketplace.html
|-- helpdesk.html
|-- clubs.js
|-- clubs.json
|-- css/
|   |-- app-shell.css
|   |-- global.css
|   |-- dashboard.css
|   |-- schedule.css
|   |-- assignments.css
|   |-- attendance.css
|   |-- clubs.css
|   |-- marketplace.css
|   `-- helpdesk.css
|-- js/
|   |-- api.js
|   |-- theme.js
|   |-- dashboard.js
|   |-- schedule.js
|   |-- assignments.js
|   |-- attendance.js
|   |-- marketplace.js
|   `-- helpdesk.js
|-- data/
|   |-- timetable.json
|   |-- assignments.json
|   |-- Attendance.json
|   `-- products.json
|-- backend/
|   |-- server.js
|   |-- controllers/
|   |-- models/
|   |-- routes/
|   `-- middleware/
|-- assets/
|   |-- icons/
|   `-- images/
`-- images/
```

## Team

- Aarush Negi
- Udit Agarwal
- Akshit Chaudhary
- Vansh Chaudhary
- Sanskar Udage

---

Built to make student life more organized, connected, and effortless.
## Evaluation 3: Common Backend

A common Express and MongoDB backend is implemented under `backend/`, with configuration, models, routes, controllers, middleware, and utilities separated by responsibility. The API base URL and implemented endpoint/data contracts are documented in [`API_CONTRACT.md`](API_CONTRACT.md); setup and run instructions are in [`backend/README.md`](backend/README.md), and team ownership is in [`CONTRIBUTING.md`](CONTRIBUTING.md). The existing frontend still uses its current local JSON/browser storage until each page is migrated.

Team ownership: Aarush maintains the common backend and owns Dashboard, Schedule, Help Desk, and final integration; Udit owns Assignments; Akshit owns Attendance; Sanskar owns Marketplace; and Vansh owns Clubs and Events.
