const mobiles = [
  { id: 301, name: 'Samsung Galaxy S24 Ultra',   brand: 'Samsung', price: 129999, stock: 25, rating: 4.8, storage: 256, ram: 12, series: 'S',     color: 'Titanium Black' },
  { id: 302, name: 'Samsung Galaxy S24',         brand: 'Samsung', price: 79999,  stock: 40, rating: 4.6, storage: 128, ram: 8,  series: 'S',     color: 'Onyx Black'     },
  { id: 303, name: 'Samsung Galaxy Z Fold 5',    brand: 'Samsung', price: 154999, stock: 10, rating: 4.7, storage: 512, ram: 12, series: 'Z',     color: 'Phantom Black'  },
  { id: 304, name: 'Samsung Galaxy Z Flip 5',    brand: 'Samsung', price: 99999,  stock: 18, rating: 4.5, storage: 256, ram: 8,  series: 'Z',     color: 'Mint'           },
  { id: 305, name: 'Samsung Galaxy A54 5G',      brand: 'Samsung', price: 38999,  stock: 60, rating: 4.3, storage: 128, ram: 8,  series: 'A',     color: 'Awesome Violet' },
  { id: 306, name: 'Samsung Galaxy M14 5G',      brand: 'Samsung', price: 13999,  stock: 80, rating: 4.1, storage: 64,  ram: 4,  series: 'M',     color: 'Smoky Teal'     },
];

const TAX_RATE = 0.08;
const FREE_SHIP_THRESHOLD = 15000;
const SHIPPING_FEE = 199;
const VALID_PAYMENT_METHODS = ['card', 'upi', 'cod', 'netbanking', 'emi'];
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
  } else if (method === 'emi') {
    if (!payment.bank) return 'bank required for emi';
    if (!payment.tenureMonths || ![3, 6, 9, 12, 18, 24].includes(parseInt(payment.tenureMonths)))
      return 'tenureMonths must be one of 3, 6, 9, 12, 18, 24';
  }
  return null;
};

exports.list = (req, res) => {
  const { series, maxPrice, minStorage, minRam, color } = req.query;
  let results = [...mobiles];
  if (series)     results = results.filter(m => m.series === series);
  if (maxPrice)   results = results.filter(m => m.price <= parseInt(maxPrice));
  if (minStorage) results = results.filter(m => m.storage >= parseInt(minStorage));
  if (minRam)     results = results.filter(m => m.ram >= parseInt(minRam));
  if (color)      results = results.filter(m => m.color.toLowerCase() === color.toLowerCase());
  res.json({ mobiles: results, count: results.length });
};

exports.search = (req, res) => {
  const { q, series, minPrice, maxPrice, minRating, minStorage, maxStorage, minRam, color } = req.query;
  let results = [...mobiles];
  if (q) {
    const term = q.toLowerCase();
    results = results.filter(m => m.name.toLowerCase().includes(term) || m.color.toLowerCase().includes(term));
  }
  if (series)     results = results.filter(m => m.series === series);
  if (minPrice)   results = results.filter(m => m.price >= parseInt(minPrice));
  if (maxPrice)   results = results.filter(m => m.price <= parseInt(maxPrice));
  if (minRating)  results = results.filter(m => m.rating >= parseFloat(minRating));
  if (minStorage) results = results.filter(m => m.storage >= parseInt(minStorage));
  if (maxStorage) results = results.filter(m => m.storage <= parseInt(maxStorage));
  if (minRam)     results = results.filter(m => m.ram >= parseInt(minRam));
  if (color)      results = results.filter(m => m.color.toLowerCase() === color.toLowerCase());
  res.json({ results, count: results.length });
};

exports.getById = (req, res) => {
  const m = mobiles.find(p => p.id === parseInt(req.params.id));
  if (!m) return res.status(404).json({ error: 'Mobile not found' });
  res.json(m);
};

exports.quickBuy = (req, res) => {
  const { productId, quantity = 1, address, payment, protectionPlan = false } = req.body;
  const product = mobiles.find(m => m.id === parseInt(productId));
  if (!product) return res.status(404).json({ error: 'Mobile not found' });

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

  const subtotal          = product.price * qty;
  const protectionPlanFee = protectionPlan ? 1499 * qty : 0;
  const tax               = Math.round((subtotal + protectionPlanFee) * TAX_RATE);
  const shipping          = subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE;
  const total             = subtotal + protectionPlanFee + tax + shipping;

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

  product.stock -= qty;

  const order = {
    id: orders.length + 1,
    item: { productId: product.id, name: product.name, brand: product.brand, price: product.price, quantity: qty, lineTotal: subtotal },
    address,
    protectionPlan,
    payment: paymentRecord,
    totals: { subtotal, protectionPlanFee, tax, shipping, total },
    status: payment.method === 'cod' ? 'payment_pending' : 'placed',
    createdAt: new Date()
  };
  orders.push(order);

  res.status(201).json({ message: 'Samsung mobile purchased', order });
};

exports.getOrders = (req, res) => res.json({ orders, count: orders.length });
