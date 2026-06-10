const slots = [
  { id: 401, title: 'General Consultation',       provider: 'Dr. A. Rao',      specialty: 'General',       mode: 'in-person', location: 'Bengaluru Clinic', date: '2026-05-02', startTime: '09:00', endTime: '09:30', durationMinutes: 30, price: 799,  capacity: 1, rating: 4.7 },
  { id: 402, title: 'Dermatology Follow-up',      provider: 'Dr. M. Shah',     specialty: 'Dermatology',   mode: 'online',    location: 'Telehealth',       date: '2026-05-02', startTime: '10:00', endTime: '10:20', durationMinutes: 20, price: 999,  capacity: 1, rating: 4.8 },
  { id: 403, title: 'Pediatric Check-up',         provider: 'Dr. S. Nair',     specialty: 'Pediatrics',    mode: 'in-person', location: 'Bengaluru Clinic', date: '2026-05-03', startTime: '11:30', endTime: '12:00', durationMinutes: 30, price: 899,  capacity: 1, rating: 4.6 },
  { id: 404, title: 'Cardiology Screening',       provider: 'Dr. P. Iyer',     specialty: 'Cardiology',    mode: 'in-person', location: 'Mumbai Centre',    date: '2026-05-04', startTime: '14:00', endTime: '14:45', durationMinutes: 45, price: 1499, capacity: 1, rating: 4.9 },
  { id: 405, title: 'Nutrition Consultation',     provider: 'Dr. N. Kapoor',   specialty: 'Nutrition',     mode: 'online',    location: 'Telehealth',       date: '2026-05-04', startTime: '16:00', endTime: '16:30', durationMinutes: 30, price: 699,  capacity: 1, rating: 4.5 },
  { id: 406, title: 'Group Yoga Therapy',         provider: 'Wellness Collective', specialty: 'Wellness',  mode: 'in-person', location: 'Pune Studio',      date: '2026-05-05', startTime: '07:00', endTime: '08:00', durationMinutes: 60, price: 499,  capacity: 8, rating: 4.4 },
];

const TAX_RATE = 0.08;
const VALID_PAYMENT_METHODS = ['card', 'upi', 'cod', 'netbanking', 'emi'];
const bookings = [];

const validatePayment = (method, payment) => {
  if (!VALID_PAYMENT_METHODS.includes(method)) return `method must be one of ${VALID_PAYMENT_METHODS.join(', ')}`;
  if (method === 'card') {
    const { cardNumber, cvv, expiry } = payment;
    if (!cardNumber || !cvv || !expiry) return 'cardNumber, cvv and expiry required';
    if (!/^\d{13,19}$/.test(cardNumber)) return 'Invalid card number';
    if (!/^\d{3,4}$/.test(cvv))          return 'Invalid cvv';
  } else if (method === 'upi') {
    if (!payment.upiId || !/^[\w.-]+@[\w.-]+$/.test(payment.upiId)) return 'Valid upiId required';
  } else if (method === 'netbanking') {
    if (!payment.bank) return 'bank required';
  } else if (method === 'emi') {
    if (!payment.bank) return 'bank required for emi';
    if (!payment.tenureMonths || ![3, 6, 9, 12, 18, 24].includes(parseInt(payment.tenureMonths)))
      return 'tenureMonths must be one of 3, 6, 9, 12, 18, 24';
  }
  return null;
};

exports.list = (req, res) => {
  const { specialty, mode, maxPrice, date, provider } = req.query;
  let results = [...slots];
  if (specialty) results = results.filter(s => s.specialty.toLowerCase() === specialty.toLowerCase());
  if (mode)      results = results.filter(s => s.mode === mode);
  if (maxPrice)  results = results.filter(s => s.price <= parseInt(maxPrice));
  if (date)      results = results.filter(s => s.date === date);
  if (provider)  results = results.filter(s => s.provider.toLowerCase().includes(provider.toLowerCase()));
  res.json({ slots: results, count: results.length });
};

exports.search = (req, res) => {
  const { q, specialty, mode, provider, minPrice, maxPrice, minRating, date, minDuration, maxDuration } = req.query;
  let results = [...slots];
  if (q) {
    const term = q.toLowerCase();
    results = results.filter(s => s.title.toLowerCase().includes(term) || s.provider.toLowerCase().includes(term));
  }
  if (specialty)   results = results.filter(s => s.specialty.toLowerCase() === specialty.toLowerCase());
  if (mode)        results = results.filter(s => s.mode === mode);
  if (provider)    results = results.filter(s => s.provider.toLowerCase().includes(provider.toLowerCase()));
  if (minPrice)    results = results.filter(s => s.price >= parseInt(minPrice));
  if (maxPrice)    results = results.filter(s => s.price <= parseInt(maxPrice));
  if (minRating)   results = results.filter(s => s.rating >= parseFloat(minRating));
  if (date)        results = results.filter(s => s.date === date);
  if (minDuration) results = results.filter(s => s.durationMinutes >= parseInt(minDuration));
  if (maxDuration) results = results.filter(s => s.durationMinutes <= parseInt(maxDuration));
  res.json({ results, count: results.length });
};

exports.getById = (req, res) => {
  const s = slots.find(p => p.id === parseInt(req.params.id));
  if (!s) return res.status(404).json({ error: 'Slot not found' });
  res.json(s);
};

exports.book = (req, res) => {
  const { slotId, seats = 1, patient, payment } = req.body;
  const slot = slots.find(s => s.id === parseInt(slotId));
  if (!slot) return res.status(404).json({ error: 'Slot not found' });

  const count = parseInt(seats);
  if (!count || count <= 0) return res.status(400).json({ error: 'seats must be positive' });
  if (count > slot.capacity) return res.status(400).json({ error: 'Insufficient capacity', available: slot.capacity });

  if (!patient) return res.status(400).json({ error: 'patient required' });
  const { fullName, email, phone, dateOfBirth } = patient;
  if (!fullName || !email || !phone || !dateOfBirth)
    return res.status(400).json({ error: 'patient fullName, email, phone and dateOfBirth required' });
  if (!/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
  if (!/^\+?\d{7,15}$/.test(String(phone))) return res.status(400).json({ error: 'Invalid phone' });

  if (!payment || !payment.method) return res.status(400).json({ error: 'payment.method required' });
  const paymentError = validatePayment(payment.method, payment);
  if (paymentError) return res.status(400).json({ error: paymentError });

  const subtotal = slot.price * count;
  const tax      = Math.round(subtotal * TAX_RATE);
  const total    = subtotal + tax;

  const paymentRecord = { method: payment.method, transactionId: `TXN-${Date.now()}` };
  if (payment.method === 'card')       paymentRecord.last4 = payment.cardNumber.slice(-4);
  if (payment.method === 'upi')        paymentRecord.upiId = payment.upiId;
  if (payment.method === 'netbanking') paymentRecord.bank  = payment.bank;
  if (payment.method === 'emi') {
    paymentRecord.bank          = payment.bank;
    paymentRecord.tenureMonths  = parseInt(payment.tenureMonths);
    paymentRecord.monthlyAmount = Math.round(total / paymentRecord.tenureMonths);
  }
  paymentRecord.paidAt = payment.method === 'cod' ? null : new Date();

  slot.capacity -= count;

  const booking = {
    id: bookings.length + 1,
    slot: { slotId: slot.id, title: slot.title, provider: slot.provider, date: slot.date, startTime: slot.startTime, endTime: slot.endTime, mode: slot.mode, location: slot.location, price: slot.price, seats: count, lineTotal: subtotal },
    patient,
    payment: paymentRecord,
    totals: { subtotal, tax, total },
    status: payment.method === 'cod' ? 'payment_pending' : 'confirmed',
    createdAt: new Date()
  };
  bookings.push(booking);

  res.status(201).json({ message: 'Slot booked', booking });
};

exports.getBookings = (req, res) => res.json({ bookings, count: bookings.length });

exports.cancelBooking = (req, res) => {
  const booking = bookings.find(b => b.id === parseInt(req.params.id));
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status === 'cancelled') return res.status(400).json({ error: 'Booking already cancelled' });
  if (booking.status === 'completed') return res.status(400).json({ error: 'Cannot cancel completed booking' });

  const slot = slots.find(s => s.id === booking.slot.slotId);
  if (slot) slot.capacity += booking.slot.seats;

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancellationReason = req.body?.reason || 'No reason provided';
  if (booking.payment && booking.payment.method !== 'cod') {
    booking.refundAmount = booking.totals.total;
    booking.refundTransactionId = `RFND-${Date.now()}-${booking.id}`;
  }
  res.json({ message: 'Booking cancelled', booking });
};
