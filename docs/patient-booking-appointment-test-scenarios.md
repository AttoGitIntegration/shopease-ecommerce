# Patient Booking Appointment — Functional Test Scenarios

Scope: end-user test scenarios for a **patient booking an appointment** with a doctor via a web/mobile healthcare portal. Covers doctor/slot discovery, slot selection, patient details, and booking confirmation.

**Pages / flows exercised:**
- Doctor / specialty search
- Slot selection (date + time)
- Patient details + booking confirmation

---

## 1. Search & select doctor

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PT-BOOK-01 | Search doctor by specialty — happy path | Patient logged in; doctors with "Cardiology" specialty exist | Open "Book Appointment" → select specialty "Cardiology" → select city → click Search | List of cardiologists returned with name, qualification, experience, fee, next available slot, and rating |
| PT-BOOK-02 | Search doctor by name — partial match | Doctors named "Sharma" exist | Type "Shar" in doctor name field → click Search | Matching doctor cards returned; non-matching doctors are not shown |
| PT-BOOK-03 | Filter by consultation mode | Both in-clinic and tele-consult doctors available | Apply filter "Video consult" | Only doctors offering video consultation are displayed; in-clinic-only doctors excluded |
| PT-BOOK-04 | No results for specialty in selected city | No doctor for "Neurosurgery" in "Tier-3 city" | Search | Empty state "No doctors found"; suggestions for nearby cities or tele-consult shown |
| PT-BOOK-05 | View doctor profile | Doctor in results | Click doctor card | Profile page opens with bio, qualifications, clinic address, timings, fees, reviews, and "Book" CTA |

---

## 2. Select slot

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PT-BOOK-06 | Book available slot — happy path | Doctor has free slots today | Open doctor profile → pick today → pick 11:00 AM slot → click Continue | Slot marked as selected; booking summary displays doctor, date, time, fee |
| PT-BOOK-07 | Slot taken by another patient mid-flow | Selected slot gets booked by another user before payment | Select slot → on next screen attempt to confirm | "Slot no longer available"; user returned to slot picker with that slot disabled |
| PT-BOOK-08 | Past / expired slot not selectable | Today's earlier slots already elapsed | Open today's slot picker | Past slots greyed out and unclickable |
| PT-BOOK-09 | Future date navigation | Slots visible for next 14 days only | Click "Next week" → pick a date | Slots for chosen date load; dates beyond 14-day window are disabled |
| PT-BOOK-10 | Doctor on leave | Doctor has blocked the selected date | Pick that date | "Doctor unavailable on this date" message; other dates remain selectable |
| PT-BOOK-11 | Double-booking prevention | Patient already has an appointment at 11:00 AM same day | Select another doctor at 11:00 AM | Warning "You already have an appointment at this time"; confirm or pick different slot |

---

## 3. Patient details & confirm booking

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PT-BOOK-12 | Confirm booking for self — happy path | Slot selected; profile complete | Choose "Booking for: Self" → accept terms → click "Pay & Confirm" → complete payment | Appointment created with status "Confirmed"; confirmation screen shows booking ID, QR/code, and calendar-add CTA; SMS + email sent |
| PT-BOOK-13 | Book for family member | "Family members" configured on profile | Choose "Booking for: Mother" → fill any missing fields → confirm | Appointment booked against family member's profile; confirmation references that member |
| PT-BOOK-14 | Missing mandatory patient details | Age / gender missing on profile | Try to confirm | Inline validation on missing fields; Confirm button disabled until fixed |
| PT-BOOK-15 | Payment failure | Booking requires prepayment | Select slot → payment fails / user cancels at gateway | No appointment created; slot released within hold-timeout; user returned to booking summary with retry option |
| PT-BOOK-16 | Free follow-up within window | Previous consult with same doctor within 7 days | Book follow-up | Fee shows as ₹0 (or "Free follow-up"); booking confirmed without payment step |
| PT-BOOK-17 | Successful booking — notifications | Booking confirmed | — | SMS, email, and in-app notification received with booking ID, doctor, date, time, clinic address / video-call link; reminder scheduled 30 min before appointment |
| PT-BOOK-18 | View booking in "My Appointments" | Booking confirmed | Open "My Appointments" | New appointment appears with status "Upcoming", with Reschedule and Cancel actions |
