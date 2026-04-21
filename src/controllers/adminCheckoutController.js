const TAX_RATE = 0.08;
const FREE_SHIP_THRESHOLD = 2000;
const SHIPPING_FEE = 99;
const PRIORITY_SHIPPING_FEE = 299;
const VALID_PAYMENT_METHODS = ['card', 'upi', 'cod', 'netbanking', 'invoice', 'purchase_order'];
const MAX_ADMIN_DISCOUNT_PERCENT = 50;

const sessions = new Map();
const orders = [];

const computeTotals = (items, opts = {}) => {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  let discount = 0;
  if (opts.discount) {
    if (opts.discount.type === 'percent') discount = Math.round(subtotal * (opts.discount.value / 100));
    else if (opts.discount.type === 'flat') discount = Math.min(opts.discount.value, subtotal);
  }
  const discountedSubtotal = subtotal - discount;
  const tax      = opts.taxExempt ? 0 : Math.round(discountedSubtotal * TAX_RATE);
  const shipping = opts.priority ? PRIORITY_SHIPPING_FEE : (discountedSubtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE);
  const total    = discountedSubtotal + tax + shipping;
  return { subtotal, discount, tax, shipping, total };
};

const getSession = (adminId) => sessions.get(adminId);

exports.initiate = (req, res) => {
  const { customerUserId, items, notes } = req.body;
  if (!customerUserId) return res.status(400).json({ error: 'customerUserId required' });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items must be a non-empty array' });
  for (const it of items) {
    if (!it.productId || !it.name || typeof it.price !== 'number' || !it.quantity)
      return res.status(400).json({ error: 'each item requires productId, name, price and quantity' });
    if (it.quantity <= 0) return res.status(400).json({ error: 'quantity must be positive' });
    if (it.price < 0)     return res.status(400).json({ error: 'price must be non-negative' });
  }
  const session = {
    id: Date.now(),
    adminId: req.adminId,
    customerUserId,
    items: items.map(i => ({ ...i })),
    discount: null,
    taxExempt: false,
    priority: false,
    notes: notes || null,
    totals: computeTotals(items),
    address: null,
    payment: null,
    status: 'initiated',
    createdAt: new Date(),
  };
  sessions.set(req.adminId, session);
  res.status(201).json({ message: 'Admin checkout initiated', session });
};

exports.getSession = (req, res) => {
  const session = getSession(req.adminId);
  if (!session) return res.status(404).json({ error: 'No active admin checkout session' });
  res.json(session);
};

exports.setShipping = (req, res) => {
  const session = getSession(req.adminId);
  if (!session) return res.status(404).json({ error: 'No active admin checkout session' });
  const { fullName, line1, city, state, postalCode, country, priority } = req.body;
  if (!fullName || !line1 || !city || !state || !postalCode || !country)
    return res.status(400).json({ error: 'fullName, line1, city, state, postalCode and country required' });
  session.address = { fullName, line1, city, state, postalCode, country };
  if (typeof priority === 'boolean') session.priority = priority;
  session.totals = computeTotals(session.items, { discount: session.discount, taxExempt: session.taxExempt, priority: session.priority });
  session.status = 'shipping_set';
  res.json({ message: 'Shipping address saved', session });
};

exports.applyDiscount = (req, res) => {
  const session = getSession(req.adminId);
  if (!session) return res.status(404).json({ error: 'No active admin checkout session' });
  const { type, value, reason } = req.body;
  if (!['percent', 'flat'].includes(type)) return res.status(400).json({ error: 'type must be percent or flat' });
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'value must be a positive number' });
  if (type === 'percent' && amount > MAX_ADMIN_DISCOUNT_PERCENT)
    return res.status(400).json({ error: `percent discount capped at ${MAX_ADMIN_DISCOUNT_PERCENT}%` });
  session.discount = { type, value: amount, reason: reason || null, appliedBy: req.adminId, appliedAt: new Date() };
  session.totals = computeTotals(session.items, { discount: session.discount, taxExempt: session.taxExempt, priority: session.priority });
  res.json({ message: 'Admin discount applied', session });
};

exports.setTaxExempt = (req, res) => {
  const session = getSession(req.adminId);
  if (!session) return res.status(404).json({ error: 'No active admin checkout session' });
  const { exempt, reason } = req.body;
  if (typeof exempt !== 'boolean') return res.status(400).json({ error: 'exempt must be a boolean' });
  session.taxExempt = exempt;
  session.taxExemptReason = exempt ? (reason || null) : null;
  session.totals = computeTotals(session.items, { discount: session.discount, taxExempt: session.taxExempt, priority: session.priority });
  res.json({ message: exempt ? 'Tax exemption applied' : 'Tax exemption removed', session });
};

exports.setPayment = (req, res) => {
  const session = getSession(req.adminId);
  if (!session) return res.status(404).json({ error: 'No active admin checkout session' });
  const { method, poNumber, invoiceDueDays } = req.body;
  if (!VALID_PAYMENT_METHODS.includes(method))
    return res.status(400).json({ error: `method must be one of ${VALID_PAYMENT_METHODS.join(', ')}` });
  const payment = { method };
  if (method === 'purchase_order') {
    if (!poNumber) return res.status(400).json({ error: 'poNumber required for purchase_order' });
    payment.poNumber = poNumber;
  }
  if (method === 'invoice') {
    const days = parseInt(invoiceDueDays);
    if (!days || days <= 0 || days > 90) return res.status(400).json({ error: 'invoiceDueDays must be between 1 and 90' });
    payment.invoiceDueDays = days;
    payment.invoiceDueAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  session.payment = payment;
  session.status = 'payment_set';
  res.json({ message: 'Payment method saved', session });
};

exports.confirm = (req, res) => {
  const session = getSession(req.adminId);
  if (!session) return res.status(404).json({ error: 'No active admin checkout session' });
  if (!session.address) return res.status(400).json({ error: 'Shipping address required' });
  if (!session.payment) return res.status(400).json({ error: 'Payment method required' });
  const order = {
    id: orders.length + 1,
    sessionId: session.id,
    placedBy: { adminId: session.adminId, role: 'admin' },
    customerUserId: session.customerUserId,
    items: session.items,
    address: session.address,
    payment: session.payment,
    discount: session.discount,
    taxExempt: session.taxExempt,
    priority: session.priority,
    notes: session.notes,
    totals: session.totals,
    status: session.payment.method === 'cod' ? 'payment_pending' : 'placed',
    createdAt: new Date(),
  };
  orders.push(order);
  sessions.delete(req.adminId);
  res.status(201).json({ message: 'Admin order confirmed', order });
};

exports.cancel = (req, res) => {
  if (!sessions.has(req.adminId)) return res.status(404).json({ error: 'No active admin checkout session' });
  sessions.delete(req.adminId);
  res.json({ message: 'Admin checkout cancelled' });
};

exports.listOrders = (req, res) => {
  const { customerUserId, status } = req.query;
  let results = [...orders];
  if (customerUserId) results = results.filter(o => o.customerUserId === parseInt(customerUserId));
  if (status)         results = results.filter(o => o.status === status);
  res.json({ orders: results, count: results.length });
};

exports.getOrder = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Admin order not found' });
  res.json(order);
};
