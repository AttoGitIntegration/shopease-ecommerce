const headphones = [
  { id: 101, name: 'Wireless Over-Ear Headphones', brand: 'SoundWave', price: 2999, stock: 50, rating: 4.5, wireless: true, type: 'over-ear' },
  { id: 102, name: 'Noise-Cancelling Headphones',  brand: 'QuietPro',  price: 5499, stock: 25, rating: 4.7, wireless: true, type: 'over-ear' },
  { id: 103, name: 'In-Ear Sport Earbuds',         brand: 'FlexFit',   price: 1299, stock: 80, rating: 4.2, wireless: true, type: 'in-ear'  },
  { id: 104, name: 'Wired Studio Headphones',      brand: 'StudioMax', price: 3999, stock: 15, rating: 4.6, wireless: false, type: 'over-ear' },
  { id: 105, name: 'Gaming Headset',               brand: 'PlayLoud',  price: 2499, stock: 40, rating: 4.4, wireless: false, type: 'over-ear' },
];

const TAX_RATE = 0.08;
const FREE_SHIP_THRESHOLD = 2000;
const SHIPPING_FEE = 99;
const VALID_PAYMENT_METHODS = ['card', 'upi', 'cod', 'netbanking'];
const orders = [];

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
  }
  return null;
};

exports.list = (req, res) => {
  const { type, wireless, maxPrice } = req.query;
  let results = [...headphones];
  if (type)             results = results.filter(h => h.type === type);
  if (wireless != null) results = results.filter(h => h.wireless === (wireless === 'true'));
  if (maxPrice)         results = results.filter(h => h.price <= parseInt(maxPrice));
  res.json({ headphones: results, count: results.length });
};

exports.search = (req, res) => {
  const { q, type, wireless, brand, minPrice, maxPrice, minRating } = req.query;
  let results = [...headphones];
  if (q) {
    const term = q.toLowerCase();
    results = results.filter(h => h.name.toLowerCase().includes(term) || h.brand.toLowerCase().includes(term));
  }
  if (type)             results = results.filter(h => h.type === type);
  if (wireless != null) results = results.filter(h => h.wireless === (wireless === 'true'));
  if (brand)            results = results.filter(h => h.brand.toLowerCase() === brand.toLowerCase());
  if (minPrice)         results = results.filter(h => h.price >= parseInt(minPrice));
  if (maxPrice)         results = results.filter(h => h.price <= parseInt(maxPrice));
  if (minRating)        results = results.filter(h => h.rating >= parseFloat(minRating));
  res.json({ results, count: results.length });
};

exports.getById = (req, res) => {
  const h = headphones.find(p => p.id === parseInt(req.params.id));
  if (!h) return res.status(404).json({ error: 'Headphones not found' });
  res.json(h);
};

exports.quickBuy = (req, res) => {
  const { productId, quantity = 1, address, payment } = req.body;
  const product = headphones.find(h => h.id === parseInt(productId));
  if (!product) return res.status(404).json({ error: 'Headphones not found' });

  const qty = parseInt(quantity);
  if (!qty || qty <= 0) return res.status(400).json({ error: 'quantity must be positive' });
  if (qty > product.stock) return res.status(400).json({ error: 'Insufficient stock', available: product.stock });

  if (!address) return res.status(400).json({ error: 'address required' });
  const { fullName, line1, city, state, postalCode, country } = address;
  if (!fullName || !line1 || !city || !state || !postalCode || !country)
    return res.status(400).json({ error: 'address fullName, line1, city, state, postalCode and country required' });

  if (!payment || !payment.method) return res.status(400).json({ error: 'payment.method required' });
  const paymentError = validatePayment(payment.method, payment);
  if (paymentError) return res.status(400).json({ error: paymentError });

  const subtotal = product.price * qty;
  const tax      = Math.round(subtotal * TAX_RATE);
  const shipping = subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE;
  const total    = subtotal + tax + shipping;

  const paymentRecord = { method: payment.method, transactionId: `TXN-${Date.now()}` };
  if (payment.method === 'card')       paymentRecord.last4 = payment.cardNumber.slice(-4);
  if (payment.method === 'upi')        paymentRecord.upiId = payment.upiId;
  if (payment.method === 'netbanking') paymentRecord.bank  = payment.bank;
  paymentRecord.paidAt = payment.method === 'cod' ? null : new Date();

  product.stock -= qty;

  const order = {
    id: orders.length + 1,
    item: { productId: product.id, name: product.name, brand: product.brand, price: product.price, quantity: qty, lineTotal: subtotal },
    address,
    payment: paymentRecord,
    totals: { subtotal, tax, shipping, total },
    status: payment.method === 'cod' ? 'payment_pending' : 'placed',
    createdAt: new Date()
  };
  orders.push(order);

  res.status(201).json({ message: 'Headphones purchased', order });
};

exports.getOrders = (req, res) => res.json({ orders, count: orders.length });

exports.cancelOrder = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status === 'cancelled') return res.status(400).json({ error: 'Order already cancelled' });
  if (order.status === 'shipped' || order.status === 'delivered') {
    return res.status(400).json({ error: `Cannot cancel ${order.status} order` });
  }
  const reason = req.body?.reason;
  if (!reason) return res.status(400).json({ error: 'reason required' });

  const product = headphones.find(h => h.id === order.item.productId);
  if (product) product.stock += order.item.quantity;

  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancellationReason = reason;
  order.refundAmount = order.payment.method === 'cod' ? 0 : order.totals.total;
  res.json({ message: 'Headphones order cancelled', order });
};
