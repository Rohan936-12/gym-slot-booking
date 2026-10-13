const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const crypto = require('crypto');

const app = express();
const db = new Database('gym-booking.db');
const PORT = 3000;
const CAPACITY = 20;

app.use(cors());
app.use(express.json());

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_name TEXT NOT NULL,
    session_time TEXT NOT NULL,
    status TEXT NOT NULL CHECK (
      status IN ('confirmed', 'waitlisted', 'cancelled')
    ),
    checkin_code TEXT UNIQUE,
    checked_in INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

function makeCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function promoteNext(sessionTime) {
  const confirmed = db.prepare(`
    SELECT COUNT(*) AS count
    FROM bookings
    WHERE session_time = ? AND status = 'confirmed'
  `).get(sessionTime).count;

  if (confirmed >= CAPACITY) return;

  const next = db.prepare(`
    SELECT id FROM bookings
    WHERE session_time = ? AND status = 'waitlisted'
    ORDER BY id ASC LIMIT 1
  `).get(sessionTime);

  if (next) {
    db.prepare(`
      UPDATE bookings
      SET status = 'confirmed', checkin_code = ?
      WHERE id = ?
    `).run(makeCode(), next.id);
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Gym booking API is running' });
});

app.get('/api/sessions', (req, res) => {
  const sessions = db.prepare(`
    SELECT
      session_time,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS booked,
      SUM(CASE WHEN status = 'waitlisted' THEN 1 ELSE 0 END) AS waiting
    FROM bookings
    GROUP BY session_time
  `).all();

  res.json(sessions);
});

app.post('/api/bookings', (req, res) => {
  const memberName = String(req.body.memberName || '').trim();
  const sessionTime = String(req.body.sessionTime || '').trim();

  if (!memberName || !sessionTime) {
    return res.status(400).json({
      error: 'Member name and session are required.'
    });
  }

  if (memberName.length > 80 || sessionTime.length > 80) {
    return res.status(400).json({ error: 'Input is too long.' });
  }

  const existing = db.prepare(`
    SELECT id FROM bookings
    WHERE member_name = ? AND session_time = ?
      AND status IN ('confirmed', 'waitlisted')
  `).get(memberName, sessionTime);

  if (existing) {
    return res.status(409).json({
      error: 'This member already has an active booking for this session.'
    });
  }

  const confirmed = db.prepare(`
    SELECT COUNT(*) AS count FROM bookings
    WHERE session_time = ? AND status = 'confirmed'
  `).get(sessionTime).count;

  const status = confirmed < CAPACITY ? 'confirmed' : 'waitlisted';
  const code = status === 'confirmed' ? makeCode() : null;

  const result = db.prepare(`
    INSERT INTO bookings
      (member_name, session_time, status, checkin_code)
    VALUES (?, ?, ?, ?)
  `).run(memberName, sessionTime, status, code);

  res.status(201).json({
    id: result.lastInsertRowid,
    memberName,
    sessionTime,
    status,
    checkinCode: code,
    message: status === 'confirmed'
      ? 'Booking confirmed!'
      : 'Session full. You have joined the waitlist.'
  });
});

app.get('/api/bookings/:id', (req, res) => {
  const booking = db.prepare(`
    SELECT id, member_name AS memberName,
      session_time AS sessionTime, status,
      checkin_code AS checkinCode, checked_in AS checkedIn
    FROM bookings WHERE id = ?
  `).get(req.params.id);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  res.json(booking);
});

app.post('/api/bookings/:id/cancel', (req, res) => {
  const booking = db.prepare(`
    SELECT * FROM bookings WHERE id = ?
  `).get(req.params.id);

  if (!booking || !['confirmed', 'waitlisted'].includes(booking.status)) {
    return res.status(404).json({
      error: 'Active booking not found.'
    });
  }

  if (booking.checked_in) {
    return res.status(409).json({
      error: 'A checked-in booking cannot be cancelled here.'
    });
  }

  const cancelAndPromote = db.transaction(() => {
    db.prepare(`
      UPDATE bookings
      SET status = 'cancelled', checkin_code = NULL
      WHERE id = ?
    `).run(booking.id);

    if (booking.status === 'confirmed') {
      promoteNext(booking.session_time);
    }
  });

  cancelAndPromote();

  res.json({ message: 'Booking cancelled.' });
});

app.post('/api/check-in', (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();

  if (!code) {
    return res.status(400).json({ error: 'Enter a check-in code.' });
  }

  const booking = db.prepare(`
    SELECT * FROM bookings WHERE checkin_code = ?
  `).get(code);

  if (!booking || booking.status !== 'confirmed') {
    return res.status(404).json({
      error: 'Invalid booking code.'
    });
  }

  if (booking.checked_in) {
    return res.status(409).json({
      error: 'This code has already been used.'
    });
  }

  db.prepare(`
    UPDATE bookings SET checked_in = 1 WHERE id = ?
  `).run(booking.id);

  res.json({
    message: 'Check-in successful!',
    memberName: booking.member_name,
    sessionTime: booking.session_time
  });
});

app.listen(PORT, () => {
  console.log(`Gym booking API running at http://localhost:${PORT}`);
});