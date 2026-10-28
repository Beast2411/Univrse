# UNIVRSE

> Your entire college, in one place.

UNIVRSE is a student-focused college companion with a dashboard, timetable, assignments, attendance tools, student clubs, a marketplace, and a Help Desk. It is a multi-page frontend project built with HTML, CSS, JavaScript, and local JSON data.

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

- Weekly timetable loaded from `data/timetable.json`.
- Select a day to see its classes and view upcoming days.
- Class times, room details, and current-class state are shown when available in the timetable data.

### Assignments

- Assignment list, status filters, search, sorting, completion controls, and upcoming deadlines.
- Data is loaded from `data/assignments.json`.
- Completion changes are saved in browser storage; the source JSON file is not modified.

### Attendance

- Overall and subject-level attendance, charts, recent records, and attendance calculations.
- Supports a configurable attendance target and custom subjects. These preferences are kept in browser storage.
- The Dashboard Assistant also reads the attendance counts from `data/Attendance.json`.

### Clubs

- Browse student organizations, descriptions, and event information.
- The page has access to the local `clubs.json` file. Club and event details shown in the page are demonstration content.

### Marketplace

- Browse product listings loaded from `data/products.json`.
- Search listings, filter by category or condition, sort by price or date, and view listing details.
- The Sell an Item form adds a demonstration listing for the current page session. It does not update the JSON file or send the listing to a service.

### Help Desk

- Submit a campus request with category, subject, description, priority, and optional contact details. Anonymous submissions omit identifying contact information.
- Search and filter submissions, view descriptions, update local demonstration statuses, and delete individual requests.
- Requests are stored in this browser under `univrseHelpDeskRequests`. They are not sent to university staff or shared with other students.
- Export saved submissions as a JSON download. Exporting downloads a file to the device; it does not write into the project folder.

## Pages

| Page | Purpose |
| --- | --- |
| `dashboard.html` | Daily overview, assistant, Focus Mode, My Goals, and theme toggle |
| `schedule.html` | Weekly timetable and upcoming classes |
| `assignments.html` | Assignment tracking, filters, and completion status |
| `attendance.html` | Attendance insights, records, and calculator |
| `clubs.html` | Student organizations and campus events |
| `marketplace.html` | Student listings, search, filters, and demo listing form |
| `helpdesk.html` | Request form, local submissions, filters, and JSON export |

## Data Files

| File | Used for |
| --- | --- |
| `data/timetable.json` | Schedule page and Dashboard timetable/assistant |
| `data/assignments.json` | Assignments page and Dashboard assistant |
| `data/Attendance.json` | Dashboard attendance assistant and attendance data |
| `data/products.json` | Marketplace listings |
| `clubs.json` | Local clubs data available to the Clubs page |

Keep the JSON files valid and preserve their existing property names when editing the data. Pages that load JSON with `fetch()` need to be served over HTTP; opening an HTML file directly may block those requests.

## Browser Storage

This project has no backend or database. Some demonstration preferences and interactions are stored in the browser:

| Data | Storage behavior |
| --- | --- |
| Theme preference | Saved as `univrse.theme` and shared across pages on this browser and site origin |
| Assignment completion | Saved locally in this browser |
| Attendance target and custom subjects | Saved locally in this browser |
| Help Desk requests and local statuses | Saved as `univrseHelpDeskRequests` in this browser |
| Dashboard goals and Marketplace demo listings | Kept in memory for the current page session only |

Clearing browser data or using a different browser/device will not carry over browser-stored data.

## Run Locally

1. Clone or download the repository.
2. Open a terminal in the repository root.
3. Start a local web server:

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