const tvs = [
  { id: 201, name: '55" 4K Smart LED TV',        brand: 'VisionPlus', price: 42999, stock: 20, rating: 4.5, screenSize: 55, resolution: '4K',  smart: true,  type: 'LED'  },
  { id: 202, name: '65" QLED Ultra HD TV',       brand: 'PixelMax',   price: 79999, stock: 12, rating: 4.7, screenSize: 65, resolution: '4K',  smart: true,  type: 'QLED' },
  { id: 203, name: '43" Full HD LED TV',         brand: 'HomeView',   price: 24999, stock: 35, rating: 4.2, screenSize: 43, resolution: 'FHD', smart: true,  type: 'LED'  },
  { id: 204, name: '77" OLED 4K Smart TV',       brand: 'CinemaPro',  price: 189999, stock: 5, rating: 4.9, screenSize: 77, resolution: '4K',  smart: true,  type: 'OLED' },
  { id: 205, name: '32" HD Ready LED TV',        brand: 'HomeView',   price: 13999, stock: 60, rating: 4.1, screenSize: 32, resolution: 'HD',  smart: false, type: 'LED'  },
];

const TAX_RATE = 0.08;
const FREE_SHIP_THRESHOLD = 20000;
const SHIPPING_FEE = 499;
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
  const { type, smart, resolution, maxPrice, minScreenSize } = req.query;
  let results = [...tvs];
  if (type)          results = results.filter(t => t.type === type);
  if (smart != null) results = results.filter(t => t.smart === (smart === 'true'));
  if (resolution)    results = results.filter(t => t.resolution === resolution);
  if (maxPrice)      results = results.filter(t => t.price <= parseInt(maxPrice));
  if (minScreenSize) results = results.filter(t => t.screenSize >= parseInt(minScreenSize));
  res.json({ tvs: results, count: results.length });
};

exports.search = (req, res) => {
  const { q, type, smart, brand, resolution, minPrice, maxPrice, minRating, minScreenSize, maxScreenSize } = req.query;
  let results = [...tvs];
  if (q) {
    const term = q.toLowerCase();
    results = results.filter(t => t.name.toLowerCase().includes(term) || t.brand.toLowerCase().includes(term));
  }
  if (type)          results = results.filter(t => t.type === type);
  if (smart != null) results = results.filter(t => t.smart === (smart === 'true'));
  if (brand)         results = results.filter(t => t.brand.toLowerCase() === brand.toLowerCase());
  if (resolution)    results = results.filter(t => t.resolution === resolution);
  if (minPrice)      results = results.filter(t => t.price >= parseInt(minPrice));
  if (maxPrice)      results = results.filter(t => t.price <= parseInt(maxPrice));
  if (minRating)     results = results.filter(t => t.rating >= parseFloat(minRating));
  if (minScreenSize) results = results.filter(t => t.screenSize >= parseInt(minScreenSize));
  if (maxScreenSize) results = results.filter(t => t.screenSize <= parseInt(maxScreenSize));
  res.json({ results, count: results.length });
};

exports.getById = (req, res) => {
  const t = tvs.find(p => p.id === parseInt(req.params.id));
  if (!t) return res.status(404).json({ error: 'TV not found' });
  res.json(t);
};

exports.quickBuy = (req, res) => {
  const { productId, quantity = 1, address, payment, installation = false } = req.body;
  const product = tvs.find(t => t.id === parseInt(productId));
  if (!product) return res.status(404).json({ error: 'TV not found' });

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

  const subtotal        = product.price * qty;
  const installationFee = installation ? 999 * qty : 0;
  const tax             = Math.round((subtotal + installationFee) * TAX_RATE);
  const shipping        = subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE;
  const total           = subtotal + installationFee + tax + shipping;

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
    installation,
    payment: paymentRecord,
    totals: { subtotal, installationFee, tax, shipping, total },
    status: payment.method === 'cod' ? 'payment_pending' : 'placed',
    createdAt: new Date()
  };
  orders.push(order);

  res.status(201).json({ message: 'TV purchased', order });
};

exports.getOrders = (req, res) => res.json({ orders, count: orders.length });
