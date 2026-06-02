const users = [
  { id: 'USR-001', name: 'Aarav Sharma',   phone: '9999900001', email: 'aarav@example.com',  blocked: false },
  { id: 'USR-002', name: 'Diya Patel',     phone: '9999900002', email: 'diya@example.com',   blocked: false },
  { id: 'USR-003', name: 'Karan Mehta',    phone: '9999900003', email: 'karan@example.com',  blocked: true  }
];

const medicines = [
  { id: 'MED-001', name: 'Crocin 500',         composition: 'Paracetamol 500 mg',   strength: '500 mg', mrp: 35.00,  pack: 'Strip of 15', stock: 120, rxRequired: false, schedule: 'OTC',  coldChain: false, genericFor: null },
  { id: 'MED-002', name: 'Dolo 650',           composition: 'Paracetamol 650 mg',   strength: '650 mg', mrp: 32.00,  pack: 'Strip of 15', stock: 200, rxRequired: false, schedule: 'OTC',  coldChain: false, genericFor: null },
  { id: 'MED-003', name: 'Amoxicillin 500',    composition: 'Amoxicillin 500 mg',   strength: '500 mg', mrp: 95.00,  pack: 'Strip of 10', stock: 80,  rxRequired: true,  schedule: 'H',    coldChain: false, genericFor: null },
  { id: 'MED-004', name: 'Augmentin 625',      composition: 'Amoxicillin + Clavulanic acid', strength: '625 mg', mrp: 240.00, pack: 'Strip of 10', stock: 40, rxRequired: true, schedule: 'H', coldChain: false, genericFor: 'MED-003' },
  { id: 'MED-005', name: 'Human Mixtard 30/70',composition: 'Insulin Human',         strength: '40 IU/mL', mrp: 165.00, pack: 'Vial 10 mL',   stock: 25, rxRequired: true, schedule: 'H',    coldChain: true,  genericFor: null },
  { id: 'MED-006', name: 'Alprazolam 0.25',    composition: 'Alprazolam 0.25 mg',    strength: '0.25 mg', mrp: 48.00,  pack: 'Strip of 15', stock: 30,  rxRequired: true,  schedule: 'H1',   coldChain: false, genericFor: null },
  { id: 'MED-007', name: 'Cetirizine 10',      composition: 'Cetirizine 10 mg',      strength: '10 mg',   mrp: 22.00,  pack: 'Strip of 10', stock: 0,   rxRequired: false, schedule: 'OTC',  coldChain: false, genericFor: null }
];

const otps = {};
const sessions = [];
const carts = {};
const addresses = {
  'USR-001': [
    { id: 'ADDR-001', label: 'Home',   line1: '12 MG Road',    city: 'Bengaluru', pincode: '560001', phone: '9999900001', isDefault: true  },
    { id: 'ADDR-002', label: 'Office', line1: '7 Brigade Rd',  city: 'Bengaluru', pincode: '560025', phone: '9999900001', isDefault: false }
  ],
  'USR-002': [
    { id: 'ADDR-003', label: 'Home',   line1: '4 Banjara Hills', city: 'Hyderabad', pincode: '500034', phone: '9999900002', isDefault: true }
  ]
};
const prescriptions = {};
const orders = [];
const subscriptions = [];
const auditLog = [];

const SERVICEABLE_PINCODES = new Set(['560001', '560025', '560066', '500034', '110001', '400001']);
const COD_CAP = 5000;
const RETURN_WINDOW_DAYS = 7;
const MAX_CART_LINES = 25;
const MAX_QTY_PER_LINE = 30;
const ALLOWED_RX_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const RX_MAX_BYTES = 5 * 1024 * 1024;

const now = () => new Date();
const audit = (userId, event, meta = {}) => {
  auditLog.push({ id: auditLog.length + 1, userId, event, meta, at: now() });
};

const findUser   = (id)    => users.find(u => u.id === id);
const findMed    = (id)    => medicines.find(m => m.id === id);
const findOrder  = (id)    => orders.find(o => o.id === id);
const userCart   = (uid)   => (carts[uid] = carts[uid] || { items: [], updatedAt: now() });
const findSession = (token) => sessions.find(s => s.token === token && !s.ended && s.expiresAt > Date.now());

const authorise = (req, res) => {
  const token = req.headers['x-user-token'] || req.query.token || req.body?.token;
  const session = findSession(token);
  if (!session) { res.status(401).json({ error: 'Login required' }); return null; }
  return session;
};

const cartTotals = (cart) => {
  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const requiresRx = cart.items.some(i => i.rxRequired);
  const coldChain = cart.items.some(i => i.coldChain);
  return { subtotal, requiresRx, coldChain, lineCount: cart.items.length };
};

const computeDelivery = (slot, coldChain) => {
  if (slot === 'express') return coldChain ? 120 : 80;
  if (slot === 'scheduled') return 30;
  return coldChain ? 100 : 49;
};

exports.listMedicines = (req, res) => {
  const { q, rxRequired, inStock } = req.query || {};
  let results = medicines.slice();
  if (q) {
    const needle = String(q).toLowerCase();
    results = results.filter(m =>
      m.name.toLowerCase().includes(needle) ||
      m.composition.toLowerCase().includes(needle));
  }
  if (rxRequired === 'true')  results = results.filter(m => m.rxRequired);
  if (rxRequired === 'false') results = results.filter(m => !m.rxRequired);
  if (inStock === 'true')     results = results.filter(m => m.stock > 0);
  res.json({ medicines: results, count: results.length });
};

exports.getMedicine = (req, res) => {
  const med = findMed(req.params.id);
  if (!med) return res.status(404).json({ error: 'Medicine not found' });
  res.json({ medicine: med });
};

exports.requestOtp = (req, res) => {
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone required' });
  const user = users.find(u => u.phone === phone);
  if (!user) return res.status(404).json({ error: 'No account with that phone' });
  if (user.blocked) return res.status(403).json({ error: 'Account is blocked' });
  otps[user.id] = { code: '123456', expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 };
  audit(user.id, 'otp_requested');
  res.status(201).json({ message: 'OTP sent', maskedPhone: phone.replace(/.(?=.{4})/g, '*') });
};

exports.login = (req, res) => {
  const { phone, otp } = req.body || {};
  if (!phone || !otp) return res.status(400).json({ error: 'phone and otp required' });
  const user = users.find(u => u.phone === phone);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.blocked) return res.status(403).json({ error: 'Account is blocked' });
  const entry = otps[user.id];
  if (!entry) return res.status(401).json({ error: 'Request an OTP first' });
  if (entry.expiresAt < Date.now()) { delete otps[user.id]; return res.status(401).json({ error: 'OTP expired' }); }
  entry.attempts += 1;
  if (entry.attempts > 5) { delete otps[user.id]; return res.status(429).json({ error: 'Too many attempts' }); }
  if (entry.code !== otp) return res.status(401).json({ error: 'Invalid OTP', attempts: entry.attempts });
  delete otps[user.id];
  const session = {
    token: `SMSESS-${Date.now()}-${user.id}`,
    userId: user.id,
    createdAt: now(),
    expiresAt: Date.now() + 30 * 60 * 1000,
    ended: false
  };
  sessions.push(session);
  audit(user.id, 'login');
  res.status(201).json({
    message: 'Logged in',
    session: { token: session.token, expiresAt: new Date(session.expiresAt) },
    user: { id: user.id, name: user.name, phone: user.phone, email: user.email }
  });
};

exports.logout = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  session.ended = true;
  session.endedAt = now();
  audit(session.userId, 'logout');
  res.json({ message: 'Logged out' });
};

exports.getCart = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const cart = userCart(session.userId);
  res.json({ cart: { items: cart.items, ...cartTotals(cart) } });
};

exports.addToCart = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const { medicineId, quantity = 1 } = req.body || {};
  if (!medicineId) return res.status(400).json({ error: 'medicineId required' });
  if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: 'quantity must be a positive integer' });
  if (quantity > MAX_QTY_PER_LINE) return res.status(400).json({ error: `Max ${MAX_QTY_PER_LINE} units per line` });
  const med = findMed(medicineId);
  if (!med) return res.status(404).json({ error: 'Medicine not found' });
  if (med.stock <= 0) return res.status(409).json({ error: 'Out of stock' });
  if (med.stock < quantity) return res.status(409).json({ error: `Only ${med.stock} units in stock` });

  const cart = userCart(session.userId);
  const existing = cart.items.find(i => i.medicineId === medicineId);
  if (existing) {
    const newQty = existing.quantity + quantity;
    if (newQty > MAX_QTY_PER_LINE) return res.status(400).json({ error: `Max ${MAX_QTY_PER_LINE} units per line` });
    if (newQty > med.stock) return res.status(409).json({ error: `Only ${med.stock} units in stock` });
    existing.quantity = newQty;
    existing.subtotal = existing.price * existing.quantity;
  } else {
    if (cart.items.length >= MAX_CART_LINES) return res.status(400).json({ error: `Cart limit ${MAX_CART_LINES} lines reached` });
    cart.items.push({
      medicineId: med.id,
      name: med.name,
      strength: med.strength,
      price: med.mrp,
      quantity,
      subtotal: med.mrp * quantity,
      rxRequired: med.rxRequired,
      schedule: med.schedule,
      coldChain: med.coldChain
    });
  }
  cart.updatedAt = now();
  audit(session.userId, 'cart_add', { medicineId, quantity });
  res.status(201).json({ cart: { items: cart.items, ...cartTotals(cart) } });
};

exports.updateCartItem = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const { quantity } = req.body || {};
  if (!Number.isInteger(quantity) || quantity < 0) return res.status(400).json({ error: 'quantity must be a non-negative integer' });
  if (quantity > MAX_QTY_PER_LINE) return res.status(400).json({ error: `Max ${MAX_QTY_PER_LINE} units per line` });
  const cart = userCart(session.userId);
  const item = cart.items.find(i => i.medicineId === req.params.medicineId);
  if (!item) return res.status(404).json({ error: 'Item not in cart' });
  if (quantity === 0) {
    cart.items = cart.items.filter(i => i.medicineId !== req.params.medicineId);
  } else {
    const med = findMed(item.medicineId);
    if (med.stock < quantity) return res.status(409).json({ error: `Only ${med.stock} units in stock` });
    item.quantity = quantity;
    item.subtotal = item.price * quantity;
  }
  cart.updatedAt = now();
  audit(session.userId, 'cart_update', { medicineId: req.params.medicineId, quantity });
  res.json({ cart: { items: cart.items, ...cartTotals(cart) } });
};

exports.removeCartItem = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const cart = userCart(session.userId);
  const before = cart.items.length;
  cart.items = cart.items.filter(i => i.medicineId !== req.params.medicineId);
  if (cart.items.length === before) return res.status(404).json({ error: 'Item not in cart' });
  cart.updatedAt = now();
  audit(session.userId, 'cart_remove', { medicineId: req.params.medicineId });
  res.json({ cart: { items: cart.items, ...cartTotals(cart) } });
};

exports.clearCart = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const cart = userCart(session.userId);
  cart.items = [];
  cart.updatedAt = now();
  res.json({ cart: { items: cart.items, ...cartTotals(cart) } });
};

exports.listAddresses = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  res.json({ addresses: addresses[session.userId] || [] });
};

exports.addAddress = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const { label, line1, city, pincode, phone, isDefault } = req.body || {};
  if (!line1 || !city || !pincode || !phone) {
    return res.status(400).json({ error: 'line1, city, pincode and phone are required' });
  }
  if (!/^\d{6}$/.test(String(pincode))) return res.status(400).json({ error: 'pincode must be a 6-digit code' });
  if (!/^\d{10}$/.test(String(phone))) return res.status(400).json({ error: 'phone must be 10 digits' });
  const list = (addresses[session.userId] = addresses[session.userId] || []);
  if (isDefault) list.forEach(a => (a.isDefault = false));
  const entry = {
    id: `ADDR-${1000 + Math.floor(Math.random() * 9000)}`,
    label: label || 'Home',
    line1, city, pincode: String(pincode), phone: String(phone),
    isDefault: !!isDefault || list.length === 0
  };
  list.push(entry);
  audit(session.userId, 'address_add', { addressId: entry.id });
  res.status(201).json({ address: entry });
};

exports.uploadPrescription = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const { filename, mimeType, sizeBytes, patientName } = req.body || {};
  if (!filename || !mimeType || !sizeBytes) {
    return res.status(400).json({ error: 'filename, mimeType, sizeBytes required' });
  }
  if (!ALLOWED_RX_TYPES.includes(mimeType)) {
    return res.status(415).json({ error: `Unsupported file type ${mimeType}. Allowed: PDF, JPEG, PNG` });
  }
  if (sizeBytes > RX_MAX_BYTES) {
    return res.status(413).json({ error: `File exceeds ${RX_MAX_BYTES} bytes` });
  }
  const id = `RX-${Date.now()}-${session.userId}`;
  const record = {
    id, userId: session.userId,
    filename, mimeType, sizeBytes,
    patientName: patientName || findUser(session.userId).name,
    status: 'pending_verification',
    uploadedAt: now()
  };
  prescriptions[id] = record;
  audit(session.userId, 'rx_upload', { rxId: id, filename });
  res.status(201).json({ prescription: record });
};

exports.getPrescription = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const rx = prescriptions[req.params.id];
  if (!rx || rx.userId !== session.userId) return res.status(404).json({ error: 'Prescription not found' });
  res.json({ prescription: rx });
};

exports.placeOrder = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const { addressId, slot = 'standard', paymentMethod, prescriptionId, idempotencyKey } = req.body || {};
  const cart = userCart(session.userId);
  if (!cart.items.length) return res.status(400).json({ error: 'Cart is empty' });
  if (!addressId) return res.status(400).json({ error: 'addressId required' });
  if (!paymentMethod) return res.status(400).json({ error: 'paymentMethod required' });
  const allowedSlots = ['express', 'standard', 'scheduled'];
  if (!allowedSlots.includes(slot)) return res.status(400).json({ error: `slot must be one of ${allowedSlots.join(', ')}` });
  const allowedPay = ['upi', 'card', 'netbanking', 'wallet', 'cod'];
  if (!allowedPay.includes(paymentMethod)) return res.status(400).json({ error: `paymentMethod must be one of ${allowedPay.join(', ')}` });

  if (idempotencyKey) {
    const existing = orders.find(o => o.idempotencyKey === idempotencyKey && o.userId === session.userId);
    if (existing) return res.status(200).json({ message: 'Order already placed (idempotent replay)', order: existing });
  }

  const list = addresses[session.userId] || [];
  const address = list.find(a => a.id === addressId);
  if (!address) return res.status(404).json({ error: 'Address not found' });
  if (!SERVICEABLE_PINCODES.has(address.pincode)) {
    return res.status(400).json({ error: `Pincode ${address.pincode} is not serviceable` });
  }

  const { subtotal, requiresRx, coldChain } = cartTotals(cart);
  if (requiresRx && !prescriptionId) {
    return res.status(400).json({ error: 'Cart contains Rx-required medicines; prescriptionId is mandatory' });
  }
  let rxRecord = null;
  if (prescriptionId) {
    rxRecord = prescriptions[prescriptionId];
    if (!rxRecord || rxRecord.userId !== session.userId) return res.status(404).json({ error: 'Prescription not found' });
  }

  const scheduleH1OrX = cart.items.some(i => ['H1', 'X'].includes(i.schedule));
  if (paymentMethod === 'cod' && (scheduleH1OrX || subtotal > COD_CAP)) {
    return res.status(400).json({
      error: scheduleH1OrX
        ? 'COD not allowed for controlled medicines (Schedule H1/X); use prepaid'
        : `COD limit ₹${COD_CAP} exceeded; use prepaid`
    });
  }

  for (const item of cart.items) {
    const med = findMed(item.medicineId);
    if (!med || med.stock < item.quantity) {
      return res.status(409).json({ error: `Stock changed for ${item.name}; only ${med ? med.stock : 0} units available` });
    }
  }
  cart.items.forEach(item => { findMed(item.medicineId).stock -= item.quantity; });

  const deliveryFee = computeDelivery(slot, coldChain);
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

  const order = {
    id: `SM-ORD-${1000 + orders.length + 1}`,
    userId: session.userId,
    items: cart.items.map(i => ({ ...i })),
    address,
    slot,
    paymentMethod,
    prescriptionId: prescriptionId || null,
    idempotencyKey: idempotencyKey || null,
    subtotal, deliveryFee, tax, total,
    coldChain,
    status: requiresRx ? 'awaiting_verification' : 'verified',
    timeline: [{ status: 'placed', at: now() }],
    createdAt: now()
  };
  if (!requiresRx) order.timeline.push({ status: 'verified', at: now() });
  orders.push(order);
  cart.items = [];
  cart.updatedAt = now();
  audit(session.userId, 'order_place', { orderId: order.id, total });
  res.status(201).json({ message: 'Order placed', order });
};

exports.listOrders = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const results = orders.filter(o => o.userId === session.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ orders: results, count: results.length });
};

exports.getOrder = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const order = findOrder(req.params.id);
  if (!order || order.userId !== session.userId) return res.status(404).json({ error: 'Order not found' });
  res.json({ order });
};

exports.advanceOrder = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const order = findOrder(req.params.id);
  if (!order || order.userId !== session.userId) return res.status(404).json({ error: 'Order not found' });
  const flow = ['placed', 'awaiting_verification', 'verified', 'packed', 'out_for_delivery', 'delivered'];
  const idx = flow.indexOf(order.status);
  if (idx === -1 || idx === flow.length - 1) {
    return res.status(400).json({ error: `Cannot advance from ${order.status}` });
  }
  const next = flow[idx + 1];
  order.status = next;
  order.timeline.push({ status: next, at: now() });
  if (next === 'delivered') order.deliveredAt = now();
  audit(session.userId, 'order_advance', { orderId: order.id, status: next });
  res.json({ order });
};

exports.cancelOrder = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const order = findOrder(req.params.id);
  if (!order || order.userId !== session.userId) return res.status(404).json({ error: 'Order not found' });
  const { reason } = req.body || {};
  if (!reason) return res.status(400).json({ error: 'reason required' });
  if (['delivered', 'cancelled', 'returned', 'refunded'].includes(order.status)) {
    return res.status(400).json({ error: `Cannot cancel ${order.status} order` });
  }
  if (['packed', 'out_for_delivery'].includes(order.status)) {
    return res.status(400).json({ error: `Order is ${order.status}; please refuse on delivery` });
  }
  order.items.forEach(item => { const med = findMed(item.medicineId); if (med) med.stock += item.quantity; });
  order.status = 'cancelled';
  order.cancelledAt = now();
  order.cancellationReason = reason;
  order.timeline.push({ status: 'cancelled', at: now() });
  audit(session.userId, 'order_cancel', { orderId: order.id, reason });
  res.json({ message: 'Order cancelled', order });
};

exports.returnOrder = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const order = findOrder(req.params.id);
  if (!order || order.userId !== session.userId) return res.status(404).json({ error: 'Order not found' });
  const { reason } = req.body || {};
  if (!reason) return res.status(400).json({ error: 'reason required' });
  if (order.status !== 'delivered') return res.status(400).json({ error: `Cannot return ${order.status} order` });
  if (order.items.some(i => ['H', 'H1', 'X'].includes(i.schedule))) {
    return res.status(400).json({ error: 'Schedule H/H1/X medicines are non-returnable' });
  }
  const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.createdAt);
  const days = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
  if (days > RETURN_WINDOW_DAYS) {
    return res.status(400).json({ error: `Return window of ${RETURN_WINDOW_DAYS} days has expired` });
  }
  order.status = 'returned';
  order.returnedAt = now();
  order.returnReason = reason;
  order.refundAmount = order.total;
  order.refundTransactionId = `RFND-${Date.now()}-${order.id}`;
  order.timeline.push({ status: 'returned', at: now() });
  audit(session.userId, 'order_return', { orderId: order.id, reason });
  res.json({ message: 'Return initiated', order });
};

exports.createSubscription = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const { medicineId, quantity, frequencyDays, addressId } = req.body || {};
  if (!medicineId || !quantity || !frequencyDays || !addressId) {
    return res.status(400).json({ error: 'medicineId, quantity, frequencyDays and addressId required' });
  }
  if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: 'quantity must be a positive integer' });
  if (!Number.isInteger(frequencyDays) || frequencyDays < 7 || frequencyDays > 90) {
    return res.status(400).json({ error: 'frequencyDays must be between 7 and 90' });
  }
  const med = findMed(medicineId);
  if (!med) return res.status(404).json({ error: 'Medicine not found' });
  const addr = (addresses[session.userId] || []).find(a => a.id === addressId);
  if (!addr) return res.status(404).json({ error: 'Address not found' });
  const sub = {
    id: `SUB-${1000 + subscriptions.length + 1}`,
    userId: session.userId,
    medicineId, quantity, frequencyDays, addressId,
    active: true,
    nextRunAt: new Date(Date.now() + frequencyDays * 86400000),
    createdAt: now()
  };
  subscriptions.push(sub);
  audit(session.userId, 'subscription_create', { subId: sub.id, medicineId });
  res.status(201).json({ subscription: sub });
};

exports.cancelSubscription = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const sub = subscriptions.find(s => s.id === req.params.id);
  if (!sub || sub.userId !== session.userId) return res.status(404).json({ error: 'Subscription not found' });
  if (!sub.active) return res.status(400).json({ error: 'Subscription already cancelled' });
  sub.active = false;
  sub.cancelledAt = now();
  audit(session.userId, 'subscription_cancel', { subId: sub.id });
  res.json({ message: 'Subscription cancelled', subscription: sub });
};

exports.getAuditLog = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const entries = auditLog.filter(a => a.userId === session.userId)
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json({ entries, count: entries.length });
};

exports._reset = () => {
  sessions.length = 0;
  orders.length = 0;
  subscriptions.length = 0;
  auditLog.length = 0;
  Object.keys(otps).forEach(k => delete otps[k]);
  Object.keys(carts).forEach(k => delete carts[k]);
  Object.keys(prescriptions).forEach(k => delete prescriptions[k]);
  medicines[0].stock = 120; medicines[1].stock = 200; medicines[2].stock = 80;
  medicines[3].stock = 40;  medicines[4].stock = 25;  medicines[5].stock = 30; medicines[6].stock = 0;
  users[0].blocked = false; users[1].blocked = false; users[2].blocked = true;
};
