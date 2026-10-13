import { useState } from 'react'
import './App.css'

function App() {
  const [memberName, setMemberName] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [result, setResult] = useState('')

    const slots = [
    { time: '06:00 AM – 07:00 AM', booked: 14 },
    { time: '07:00 AM – 08:00 AM', booked: 18 },
    { time: '05:00 PM – 06:00 PM', booked: 20 },
    { time: '06:00 PM – 07:00 PM', booked: 9 },
  ]

 async function handleBooking(event) {
  event.preventDefault()
  setResult('')

  if (!memberName.trim() || !selectedSlot) {
    setResult('Please enter your name and choose a session.')
    return
  }

  try {
    const response = await fetch('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberName: memberName.trim(),
        sessionTime: selectedSlot,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setResult(data.error || 'Booking failed.')
      return
    }

    if (data.status === 'confirmed') {
      setResult(
        `Booking confirmed! Code: ${data.checkinCode}. Booking ID: ${data.id}`
      )
    } else {
      setResult(`You're on the waitlist. Booking ID: ${data.id}`)
    }
  } catch (error) {
    setResult('Could not reach the backend. Check that the server is running.')
  }
}

  return (
    <main className="gym-app">
      <header className="gym-header">
        <h1>IRON HOUSE</h1>
        <p>GYM SLOT BOOKING</p>
      </header>

      <section className="welcome">
        <p className="eyebrow">YOUR FITNESS, YOUR TIME</p>
        <h2>Make time for <span>yourself.</span></h2>
        <p>Choose your session and plan your next workout.</p>
      </section>

      <section className="booking-panel">
        <h2>Book a session</h2>
        <p>Each session has a maximum capacity of 20 members.</p>

        <form onSubmit={handleBooking}>
          <label htmlFor="memberName">Member name</label>
          <input
            id="memberName"
            value={memberName}
            onChange={(event) => setMemberName(event.target.value)}
            placeholder="Enter your name"
          />

          <label htmlFor="slot">Available sessions</label>
          <select
            id="slot"
            value={selectedSlot}
            onChange={(event) => setSelectedSlot(event.target.value)}
          >
            <option value="">Choose a session</option>
            {slots.map((slot) => (
              <option key={slot.time} value={slot.time}>
                {slot.time} — {slot.booked}/20 booked
              </option>
            ))}
          </select>

          <button type="submit">Continue to booking →</button>
        </form>

        <p role="status" aria-live="polite" className="demo-note">
  {result || 'Choose a session to get started.'}
</p>
      </section>
    </main>
  )
}

export default App
