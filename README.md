Gym Slot Booking System

Overview

A web application for managing gym session bookings, waitlists, cancellations, and member check-ins.

Features

- Book an hourly gym session.
- Limit each session to 20 confirmed bookings.
- Add members to a waitlist when a session is full.
- Promote the next waiting member when a confirmed booking is cancelled.
- Generate check-in codes for confirmed bookings.
- Verify check-in codes and prevent duplicate check-ins.
- Store booking data in SQLite.

Technology Stack

- Frontend: React and Vite
- Backend: Node.js and Express
- Database: SQLite using better-sqlite3
- API communication: HTTP and JSON

Setup Instructions

1. Install backend dependencies

From the project root, run:

npm install express better-sqlite3 cors

2. Start the backend

Run:

node server.js

The API runs at "http://localhost:3000".

3. Install frontend dependencies

Open a second terminal and run:

cd frontend
npm install
npm run dev

Open the local URL printed by Vite, usually "http://localhost:5173".

API Endpoints

- "GET /api/health" — check server status.
- "GET /api/sessions" — view booking counts by session.
- "POST /api/bookings" — create a booking.
- "GET /api/bookings/:id" — view a booking.
- "POST /api/bookings/:id/cancel" — cancel a booking.
- "POST /api/check-in" — verify a check-in code.

Data Model

Each booking stores a member name, session time, booking status, check-in code, check-in state, and creation timestamp. Booking statuses are confirmed, waitlisted, or cancelled.

Testing

Test a booking, fill a session to its 20-person capacity, verify that the next booking is waitlisted, cancel a confirmed booking, and check that the next waiting member is promoted. Also test valid, invalid, and already-used check-in codes.

Limitations

This is a development project. Authentication, staff authorization, production deployment, and additional security hardening may be needed before real-world use.