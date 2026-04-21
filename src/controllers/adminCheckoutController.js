const TAX_RATE = 0.08;
const FREE_SHIP_THRESHOLD = 2000;
const SHIPPING_FEE = 99;
const PRIORITY_SHIPPING_FEE = 299;
const VALID_PAYMENT_METHODS = ['card', 'upi', 'cod', 'netbanking', 'invoice', 'purchase_order'];
const MAX_ADMIN_DISCOUNT_PERCENT = 50;

const sessions = new Map();
const drafts = [];
const quotes = [];
const orders = [];

const validateItems = (items) => {
  if (!Array.isArray(items) || !items.length) return 'items must be a non-empty array';
  for (const it of items) {
    if (!it.productId || !it.name || typeof it.price !== 'number' || !it.quantity)
      return 'each item requires productId, name, price and quantity';
    if (it.quantity <= 0) return 'quantity must be positive';
    if (it.price < 0)     return 'price must be non-negative';
  }
  return null;
};

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
const recomputeTotals = (s) => {
  s.totals = computeTotals(s.items, { discount: s.discount, taxExempt: s.taxExempt, priority: s.priority });
};

exports.initiate = (req, res) => {
  const { customerUserId, items, notes } = req.body;
  if (!customerUserId) return res.status(400).json({ error: 'customerUserId required' });
  const itemErr = validateItems(items);
  if (itemErr) return res.status(400).json({ error: itemErr });
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
  recomputeTotals(session);
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
  recomputeTotals(session);
  res.json({ message: 'Admin discount applied', session });
};

exports.setTaxExempt = (req, res) => {
  const session = getSession(req.adminId);
  if (!session) return res.status(404).json({ error: 'No active admin checkout session' });
  const { exempt, reason } = req.body;
  if (typeof exempt !== 'boolean') return res.status(400).json({ error: 'exempt must be a boolean' });
  session.taxExempt = exempt;
  session.taxExemptReason = exempt ? (reason || null) : null;
  recomputeTotals(session);
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

exports.addItem = (req, res) => {
  const session = getSession(req.adminId);
  if (!session) return res.status(404).json({ error: 'No active admin checkout session' });
  const { productId, name, price, quantity = 1 } = req.body;
  const itemErr = validateItems([{ productId, name, price, quantity }]);
  if (itemErr) return res.status(400).json({ error: itemErr });
  const existing = session.items.find(i => i.productId === productId);
  if (existing) existing.quantity += quantity;
  else session.items.push({ productId, name, price, quantity });
  recomputeTotals(session);
  res.json({ message: 'Item added', session });
};

exports.updateItem = (req, res) => {
  const session = getSession(req.adminId);
  if (!session) return res.status(404).json({ error: 'No active admin checkout session' });
  const productId = parseInt(req.params.productId);
  const { quantity } = req.body;
  const qty = parseInt(quantity);
  if (!Number.isFinite(qty)) return res.status(400).json({ error: 'quantity required' });
  const item = session.items.find(i => i.productId === productId);
  if (!item) return res.status(404).json({ error: 'Item not in session' });
  if (qty <= 0) session.items = session.items.filter(i => i.productId !== productId);
  else item.quantity = qty;
  if (!session.items.length) return res.status(400).json({ error: 'Session must retain at least one item; cancel instead' });
  recomputeTotals(session);
  res.json({ message: 'Item updated', session });
};

exports.removeItem = (req, res) => {
  const session = getSession(req.adminId);
  if (!session) return res.status(404).json({ error: 'No active admin checkout session' });
  const productId = parseInt(req.params.productId);
  const before = session.items.length;
  session.items = session.items.filter(i => i.productId !== productId);
  if (session.items.length === before) return res.status(404).json({ error: 'Item not in session' });
  if (!session.items.length) return res.status(400).json({ error: 'Session must retain at least one item; cancel instead' });
  recomputeTotals(session);
  res.json({ message: 'Item removed', session });
};

exports.holdSession = (req, res) => {
  const session = getSession(req.adminId);
  if (!session) return res.status(404).json({ error: 'No active admin checkout session' });
  const { label } = req.body || {};
  const draft = { ...session, draftId: drafts.length + 1, label: label || null, heldAt: new Date() };
  drafts.push(draft);
  sessions.delete(req.adminId);
  res.status(201).json({ message: 'Session held as draft', draft });
};

exports.listDrafts = (req, res) => {
  const mine = drafts.filter(d => d.adminId === req.adminId);
  res.json({ drafts: mine, count: mine.length });
};

exports.resumeDraft = (req, res) => {
  const draftId = parseInt(req.params.id);
  const idx = drafts.findIndex(d => d.draftId === draftId && d.adminId === req.adminId);
  if (idx === -1) return res.status(404).json({ error: 'Draft not found' });
  if (sessions.has(req.adminId)) return res.status(409).json({ error: 'Active session already exists; cancel it first' });
  const [draft] = drafts.splice(idx, 1);
  const { draftId: _d, label: _l, heldAt: _h, ...session } = draft;
  sessions.set(req.adminId, session);
  res.json({ message: 'Draft resumed', session });
};

exports.deleteDraft = (req, res) => {
  const draftId = parseInt(req.params.id);
  const idx = drafts.findIndex(d => d.draftId === draftId && d.adminId === req.adminId);
  if (idx === -1) return res.status(404).json({ error: 'Draft not found' });
  drafts.splice(idx, 1);
  res.json({ message: 'Draft deleted' });
};

exports.shipOrder = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Admin order not found' });
  if (order.status !== 'placed') return res.status(400).json({ error: `Cannot ship order in status ${order.status}` });
  const { carrier, trackingNumber, estimatedDelivery } = req.body;
  if (!carrier || !trackingNumber) return res.status(400).json({ error: 'carrier and trackingNumber required' });
  order.status = 'shipped';
  order.shipment = { carrier, trackingNumber, estimatedDelivery: estimatedDelivery || null, shippedAt: new Date(), shippedBy: req.adminId };
  res.json({ message: 'Order marked shipped', order });
};

exports.deliverOrder = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Admin order not found' });
  if (order.status !== 'shipped') return res.status(400).json({ error: `Cannot deliver order in status ${order.status}` });
  order.status = 'delivered';
  order.deliveredAt = new Date();
  order.deliveredBy = req.adminId;
  if (order.payment && order.payment.method === 'cod') order.payment.paidAt = new Date();
  res.json({ message: 'Order marked delivered', order });
};

exports.cancelOrder = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Admin order not found' });
  if (['cancelled', 'delivered'].includes(order.status))
    return res.status(400).json({ error: `Cannot cancel order in status ${order.status}` });
  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancelledBy = req.adminId;
  order.cancellationReason = req.body?.reason || 'No reason provided';
  if (order.payment && !['cod', 'invoice', 'purchase_order'].includes(order.payment.method)) {
    order.refund = { amount: order.totals.total, transactionId: `RFND-${Date.now()}-${order.id}`, refundedAt: new Date(), refundedBy: req.adminId };
  }
  res.json({ message: 'Order cancelled', order });
};

exports.refundOrder = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Admin order not found' });
  if (order.status === 'cancelled') return res.status(400).json({ error: 'Cancelled orders auto-refund; use cancel endpoint' });
  if (!['placed', 'shipped', 'delivered'].includes(order.status))
    return res.status(400).json({ error: `Cannot refund order in status ${order.status}` });
  if (order.payment && ['cod', 'invoice', 'purchase_order'].includes(order.payment.method))
    return res.status(400).json({ error: `Payment method ${order.payment.method} is not refundable via this endpoint` });
  const { amount, reason } = req.body || {};
  const alreadyRefunded = (order.refunds || []).reduce((s, r) => s + r.amount, 0);
  const remaining = order.totals.total - alreadyRefunded;
  if (remaining <= 0) return res.status(400).json({ error: 'Order is fully refunded' });
  const refundAmount = amount == null ? remaining : Number(amount);
  if (!Number.isFinite(refundAmount) || refundAmount <= 0) return res.status(400).json({ error: 'amount must be a positive number' });
  if (refundAmount > remaining) return res.status(400).json({ error: `amount exceeds remaining refundable ${remaining}` });
  const refund = { amount: refundAmount, reason: reason || null, transactionId: `RFND-${Date.now()}-${order.id}`, refundedAt: new Date(), refundedBy: req.adminId };
  order.refunds = [...(order.refunds || []), refund];
  order.refundedTotal = alreadyRefunded + refundAmount;
  if (order.refundedTotal >= order.totals.total) order.status = 'refunded';
  res.json({ message: 'Refund recorded', refund, order });
};

exports.createQuote = (req, res) => {
  const { customerUserId, items, notes, validityDays = 14, discount } = req.body;
  if (!customerUserId) return res.status(400).json({ error: 'customerUserId required' });
  const itemErr = validateItems(items);
  if (itemErr) return res.status(400).json({ error: itemErr });
  const days = parseInt(validityDays);
  if (!days || days <= 0 || days > 90) return res.status(400).json({ error: 'validityDays must be between 1 and 90' });
  let quoteDiscount = null;
  if (discount) {
    if (!['percent', 'flat'].includes(discount.type)) return res.status(400).json({ error: 'discount.type must be percent or flat' });
    const v = Number(discount.value);
    if (!Number.isFinite(v) || v <= 0) return res.status(400).json({ error: 'discount.value must be positive' });
    if (discount.type === 'percent' && v > MAX_ADMIN_DISCOUNT_PERCENT)
      return res.status(400).json({ error: `percent discount capped at ${MAX_ADMIN_DISCOUNT_PERCENT}%` });
    quoteDiscount = { type: discount.type, value: v, reason: discount.reason || null };
  }
  const quote = {
    id: quotes.length + 1,
    createdBy: req.adminId,
    customerUserId,
    items: items.map(i => ({ ...i })),
    discount: quoteDiscount,
    notes: notes || null,
    totals: computeTotals(items, { discount: quoteDiscount }),
    status: 'open',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
  };
  quotes.push(quote);
  res.status(201).json({ message: 'Quote created', quote });
};

exports.listQuotes = (req, res) => {
  const { customerUserId, status } = req.query;
  let results = [...quotes];
  if (customerUserId) results = results.filter(q => q.customerUserId === parseInt(customerUserId));
  if (status)         results = results.filter(q => q.status === status);
  results.forEach(q => { if (q.status === 'open' && q.expiresAt < new Date()) q.status = 'expired'; });
  res.json({ quotes: results, count: results.length });
};

exports.getQuote = (req, res) => {
  const quote = quotes.find(q => q.id === parseInt(req.params.id));
  if (!quote) return res.status(404).json({ error: 'Quote not found' });
  if (quote.status === 'open' && quote.expiresAt < new Date()) quote.status = 'expired';
  res.json(quote);
};

exports.convertQuote = (req, res) => {
  const quote = quotes.find(q => q.id === parseInt(req.params.id));
  if (!quote) return res.status(404).json({ error: 'Quote not found' });
  if (quote.status === 'open' && quote.expiresAt < new Date()) quote.status = 'expired';
  if (quote.status !== 'open') return res.status(400).json({ error: `Cannot convert quote in status ${quote.status}` });
  if (sessions.has(req.adminId)) return res.status(409).json({ error: 'Active session already exists; cancel it first' });
  const session = {
    id: Date.now(),
    adminId: req.adminId,
    customerUserId: quote.customerUserId,
    items: quote.items.map(i => ({ ...i })),
    discount: quote.discount,
    taxExempt: false,
    priority: false,
    notes: quote.notes,
    totals: computeTotals(quote.items, { discount: quote.discount }),
    address: null,
    payment: null,
    status: 'initiated',
    createdAt: new Date(),
    fromQuoteId: quote.id,
  };
  sessions.set(req.adminId, session);
  quote.status = 'converted';
  quote.convertedAt = new Date();
  quote.convertedBy = req.adminId;
  res.status(201).json({ message: 'Quote converted to session', session, quote });
};

exports.deleteQuote = (req, res) => {
  const idx = quotes.findIndex(q => q.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Quote not found' });
  if (quotes[idx].status === 'converted') return res.status(400).json({ error: 'Cannot delete a converted quote' });
  quotes.splice(idx, 1);
  res.json({ message: 'Quote deleted' });
};

exports.summary = (req, res) => {
  const { from, to, adminId, customerUserId } = req.query;
  const fromDate = from ? new Date(from) : null;
  const toDate   = to   ? new Date(to)   : null;
  if (fromDate && isNaN(fromDate)) return res.status(400).json({ error: 'Invalid from date' });
  if (toDate   && isNaN(toDate))   return res.status(400).json({ error: 'Invalid to date' });
  let scope = orders;
  if (fromDate)       scope = scope.filter(o => o.createdAt >= fromDate);
  if (toDate)         scope = scope.filter(o => o.createdAt <= toDate);
  if (adminId)        scope = scope.filter(o => o.placedBy.adminId === parseInt(adminId));
  if (customerUserId) scope = scope.filter(o => o.customerUserId === parseInt(customerUserId));
  const byStatus = scope.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
  const grossRevenue  = scope.reduce((s, o) => s + o.totals.total, 0);
  const totalRefunded = scope.reduce((s, o) => s + (o.refundedTotal || (o.refund ? o.refund.amount : 0)), 0);
  const totalDiscount = scope.reduce((s, o) => s + (o.totals.discount || 0), 0);
  res.json({
    orderCount: scope.length,
    grossRevenue,
    totalRefunded,
    netRevenue: grossRevenue - totalRefunded,
    totalDiscount,
    byStatus,
    filters: { from: fromDate, to: toDate, adminId: adminId ? parseInt(adminId) : null, customerUserId: customerUserId ? parseInt(customerUserId) : null },
  });
};
