<div align="center">

# ✦ UNIVRSE

### Your entire college, in one place.

**A campus companion for classes, coursework, events, student listings, and support.**

[![Frontend](https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JavaScript-7664ed?style=for-the-badge)](#-technology)
[![Backend](https://img.shields.io/badge/Backend-Express-222222?style=for-the-badge&logo=express)](#-technology)
[![Database](https://img.shields.io/badge/Database-MongoDB-47a248?style=for-the-badge&logo=mongodb&logoColor=white)](#-technology)

🌐 **Live site:** [univrse1.onrender.com](https://univrse1.onrender.com/dashboard.html)

</div>

---

## 🧭 Contents

- [✨ What is Univrse?](#-what-is-univrse)
- [🚀 Features](#-features)
- [🔐 Authentication and data](#-authentication-and-data)
- [🛠️ Technology](#️-technology)
- [⚡ Run locally](#-run-locally)
- [🗂️ Project structure](#️-project-structure)
- [👥 Team](#-team)

## ✨ What is Univrse?

Univrse is a student-focused college portal with a galaxy-inspired interface. Its multi-page frontend uses a shared Express API for live data, MongoDB for application records, and the existing JSON timetable file for weekly classes.

> **One portal. Your campus day, organized.**

## 🚀 Features

| Area | What you can do |
| --- | --- |
| 🌌 **Dashboard** | View assignment and attendance statistics, today’s timetable, upcoming deadlines and events, recent activity, and campus weather. Use the 25-minute Focus Mode timer and session-only study goals. |
| 🗓️ **Schedule** | Browse a weekly timetable; add, edit, or remove class entries; save changes to the shared timetable file. |
| 📚 **Assignments** | Create and manage assignments, search and filter the list, update completion status, and track deadlines. |
| 📊 **Attendance** | Review attendance by subject, mark classes present or absent, view recent records, and use the attendance calculator. |
| 🎭 **Clubs & Events** | Browse clubs and campus events, manage club listings, and register for events. Club preferences are browser-local; event counts are maintained by the API. |
| 🛍️ **Marketplace** | Browse, search, filter, sort, create, update, and manage student listings. |
| 🆘 **Help Desk** | Submit requests anonymously or with contact details; review, search, filter, edit, delete, and export requests. |
| 🌗 **Theme** | Switch between light and dark themes across the portal. |

### Dashboard data

Dashboard statistics are calculated from backend records. Attendance is a weighted percentage across subjects; assignment and upcoming-event numbers are database counts. Recent activity is assembled from assignment, event, marketplace, and Help Desk records. Weather is requested by the backend from Open-Meteo and requires campus coordinates in the backend environment file.

The Dashboard assistant buttons summarize live timetable, assignment, or attendance data. They are frontend helpers, not a separate AI service.

## 🔐 Authentication and data

- Create an account or log in at **`login.html`**. Opening **`index.html`** takes you to the login page.
- Accounts are stored in MongoDB’s **`users`** collection. Passwords are saved as salted scrypt hashes; plaintext passwords are not stored.
- Login sessions are stored in **`authsessions`** and sent to the browser in an HttpOnly cookie. Sessions expire after seven days.
- In the currently configured Atlas connection, the database is **`univrse`**. In MongoDB Compass, open `univrse` → `users` to view account documents and `univrse` → `authsessions` for session records.
- `/api/health`, `/api/auth/register`, and `/api/auth/login` are public. Other API routes require a valid session. Use the app’s **Log out** button to end a session.
- Registration is open to users. Email verification and password recovery are not implemented yet.
- Portal records such as assignments and Help Desk requests are shared between authenticated users; the current data models do not assign those records to individual accounts.

### Where data lives

| Data | Storage |
| --- | --- |
| Accounts and sessions | MongoDB: `users`, `authsessions` |
| Assignments, attendance, events, clubs, marketplace listings, Help Desk requests | MongoDB through the backend API |
| Weekly timetable | Root `data/timetable.json`; intentionally not migrated to MongoDB |
| Theme, attendance preferences, club membership/favourites | Browser storage on the current browser and site origin |
| Focus Mode timer and Dashboard goals | Current page session; reloading clears them |

See [`API_CONTRACT.md`](API_CONTRACT.md) for endpoints and data fields, and [`backend/README.md`](backend/README.md) for backend configuration.

> **Compass tip:** Refresh the `univrse` database after registering. A `users` document contains the name, normalized email, `passwordHash`, and login timestamps. The raw password is intentionally never stored. `authsessions` holds hashed session tokens and expiry dates, not the cookie token itself.

## 🛠️ Technology

| Layer | Tools |
| --- | --- |
| Frontend | HTML, CSS, and vanilla JavaScript |
| API | Node.js 18+, Express 4 |
| Database | MongoDB with Mongoose |
| Password security | Node.js `crypto.scrypt`, per-password salt, constant-time verification |
| Session security | Random opaque session token, SHA-256 token hash in MongoDB, HttpOnly cookie |
| Weather | Open-Meteo current weather endpoint |

No frontend build step is required. The backend dependencies are managed in `backend/package.json`.

## ⚡ Run locally

### 1. Configure and start the backend

From the repository root:

```sh
cd backend
npm ci
```

Copy `backend/.env.example` to `backend/.env` and configure `MONGO_URI`, `CLIENT_ORIGIN`, and (for weather) `CAMPUS_LATITUDE` and `CAMPUS_LONGITUDE`. Keep `.env` private and never commit database credentials.

```sh
npm start
```

The API listens on `http://localhost:5000/api` by default. Check `http://localhost:5000/api/health` for backend and database readiness.

### 2. Serve the frontend

Open a second terminal at the repository root and run:

```sh
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000). Make sure that exact origin is included in `CLIENT_ORIGIN` in `backend/.env`.

For local login cookies, use the **same hostname** for the frontend and API. For example, use `localhost` for both; don’t mix `localhost` and `127.0.0.1`. Different ports are fine. VS Code Live Server also works when its origin is included in `CLIENT_ORIGIN`.

### 3. Create an account

Choose **Create an account** on the login page, then register with your name, email, and a password of at least 10 characters. Once logged in, the portal APIs use the session cookie automatically.

## 🗂️ Project structure

```text
UNIVRSE/
├── index.html                  # Entry redirect
├── login.html                  # Login and registration
├── dashboard.html              # Campus dashboard
├── schedule.html               # Weekly timetable
├── assignments.html            # Assignment manager
├── attendance.html             # Attendance tools
├── clubs.html                  # Clubs and events
├── marketplace.html            # Student marketplace
├── helpdesk.html               # Help Desk requests
├── assets/                     # Shared visual assets
├── images/                     # Page image assets
├── css/                        # Shared and page-specific styles
├── js/                         # Frontend behavior and API clients
├── data/
│   ├── timetable.json          # Shared weekly timetable source
│   ├── Attendance.json         # Attendance fallback snapshot
│   └── clubs.json              # Seed source for club records
├── backend/
│   ├── config/                 # MongoDB connection setup
│   ├── controllers/            # API logic, including authentication
│   ├── middleware/             # Authentication and error handling
│   ├── models/                 # Mongoose models, users and sessions
│   ├── routes/                 # Express API routes
│   ├── utils/                  # Validation, responses, password/session helpers
│   ├── server.js               # Express application entry point
│   ├── seed.js                 # Safe demonstration-data seeder
│   └── README.md               # Backend setup and API guide
├── API_CONTRACT.md             # API endpoints and field contracts
├── CONTRIBUTING.md             # Team ownership and contribution notes
└── README.md
```

## 👥 Team

| Contributor | Project role |
| --- | --- |
| Aarush Negi | Common backend, Dashboard, Schedule, Help Desk, integration |
| Udit Agarwal | Assignments |
| Akshit Chaudhary | Attendance |
| Vansh Chaudhary | Clubs & Events |
| Sanskar Udage | Marketplace |

---

<div align="center">

### ✦ Built to make student life more organized, connected, and effortless. ✦

</div>
