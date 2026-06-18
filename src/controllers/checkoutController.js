const { readCart, resetCart } = require('./cartController');
const TAX_RATE = 0.08;
const FREE_SHIP_THRESHOLD = 2000;
const SHIPPING_FEE = 99;
const VALID_PAYMENT_METHODS = ['card', 'upi', 'cod', 'netbanking'];
const COUPONS = {
  SAVE10:  { type: 'percent', value: 10 },
  FLAT50:  { type: 'flat',    value: 50 },
  WELCOME: { type: 'percent', value: 15 },
};
let session = null;
const orders = [];

const computeTotals = (items) => {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax      = Math.round(subtotal * TAX_RATE);
  const shipping = subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE;
  const total    = subtotal + tax + shipping;
  return { subtotal, tax, shipping, total };
};

exports.initiate = (req, res) => {
  const cart = readCart();
  if (!cart.items.length) return res.status(400).json({ error: 'Cart is empty' });
  session = {
    id: Date.now(),
    items: cart.items.map(i => ({ ...i })),
    totals: computeTotals(cart.items),
    address: null,
    payment: null,
    status: 'initiated',
    createdAt: new Date()
  };
  res.status(201).json({ message: 'Checkout initiated', session });
};

exports.getSession = (req, res) => {
  if (!session) return res.status(404).json({ error: 'No active checkout session' });
  res.json(session);
};

exports.getAmount = (req, res) => {
  const items = session ? session.items : readCart().items;
  if (!items.length) return res.status(400).json({ error: 'No items to calculate amount for' });
  const totals = computeTotals(items);
  const coupon = session?.coupon || null;
  const discount = coupon ? coupon.discount : 0;
  res.json({
    items: items.map(i => ({ productId: i.productId, name: i.name, price: i.price, quantity: i.quantity, lineTotal: i.price * i.quantity })),
    subtotal: totals.subtotal,
    tax: totals.tax,
    shipping: totals.shipping,
    discount,
    total: totals.total - discount,
    coupon,
    source: session ? 'session' : 'cart'
  });
};

exports.applyCoupon = (req, res) => {
  if (!session) return res.status(404).json({ error: 'No active checkout session' });
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  const rule = COUPONS[code.toUpperCase()];
  if (!rule) return res.status(400).json({ error: 'Invalid coupon code' });
  const base = computeTotals(session.items);
  const discount = rule.type === 'percent'
    ? Math.round(base.subtotal * rule.value / 100)
    : Math.min(rule.value, base.subtotal);
  session.coupon = { code: code.toUpperCase(), type: rule.type, value: rule.value, discount };
  session.totals = { ...base, discount, total: base.total - discount };
  res.json({ message: 'Coupon applied', coupon: session.coupon, totals: session.totals });
};

exports.setShipping = (req, res) => {
  if (!session) return res.status(404).json({ error: 'No active checkout session' });
  const { fullName, line1, city, state, postalCode, country } = req.body;
  if (!fullName || !line1 || !city || !state || !postalCode || !country)
    return res.status(400).json({ error: 'fullName, line1, city, state, postalCode and country required' });
  session.address = { fullName, line1, city, state, postalCode, country };
  session.status = 'shipping_set';
  res.json({ message: 'Shipping address saved', session });
};

exports.setPayment = (req, res) => {
  if (!session) return res.status(404).json({ error: 'No active checkout session' });
  const { method } = req.body;
  if (!VALID_PAYMENT_METHODS.includes(method))
    return res.status(400).json({ error: `method must be one of ${VALID_PAYMENT_METHODS.join(', ')}` });
  session.payment = { method };
  session.status = 'payment_set';
  res.json({ message: 'Payment method saved', session });
};

exports.processPayment = (req, res) => {
  if (!session) return res.status(404).json({ error: 'No active checkout session' });
  if (!session.payment) return res.status(400).json({ error: 'Payment method required' });
  const { method } = session.payment;
  const { cardNumber, cvv, expiry, upiId, bank } = req.body;
  if (method === 'card') {
    if (!cardNumber || !cvv || !expiry)
      return res.status(400).json({ error: 'cardNumber, cvv and expiry required' });
    if (!/^\d{13,19}$/.test(cardNumber)) return res.status(400).json({ error: 'Invalid card number' });
    if (!/^\d{3,4}$/.test(cvv))          return res.status(400).json({ error: 'Invalid cvv' });
    session.payment.last4 = cardNumber.slice(-4);
  } else if (method === 'upi') {
    if (!upiId || !/^[\w.-]+@[\w.-]+$/.test(upiId))
      return res.status(400).json({ error: 'Valid upiId required' });
    session.payment.upiId = upiId;
  } else if (method === 'netbanking') {
    if (!bank) return res.status(400).json({ error: 'bank required' });
    session.payment.bank = bank;
  }
  session.payment.transactionId = `TXN-${Date.now()}`;
  session.payment.paidAt = method === 'cod' ? null : new Date();
  session.status = method === 'cod' ? 'payment_pending' : 'paid';
  res.json({ message: 'Payment processed', session });
};

exports.confirm = (req, res) => {
  if (!session) return res.status(404).json({ error: 'No active checkout session' });
  if (!session.address) return res.status(400).json({ error: 'Shipping address required' });
  if (!session.payment) return res.status(400).json({ error: 'Payment method required' });
  const order = {
    id: orders.length + 1,
    sessionId: session.id,
    items: session.items,
    address: session.address,
    payment: session.payment,
    totals: session.totals,
    status: 'placed',
    createdAt: new Date()
  };
  orders.push(order);
  resetCart();
  session = null;
  res.status(201).json({ message: 'Order confirmed', order });
};

exports.cancel = (req, res) => {
  if (!session) return res.status(404).json({ error: 'No active checkout session' });
  session = null;
  res.json({ message: 'Checkout cancelled' });
};
