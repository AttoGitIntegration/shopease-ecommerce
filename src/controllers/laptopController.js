const laptops = [
  { id: 301, name: '14" Ultrabook Pro',           brand: 'NovaTech',    price: 89999,  stock: 18, rating: 4.6, screenSize: 14,   ram: 16, storage: 512,  processor: 'Intel i7',  gpu: 'Integrated', os: 'Windows 11', type: 'Ultrabook' },
  { id: 302, name: '15.6" Gaming Laptop GX',      brand: 'RaptorByte',  price: 134999, stock: 10, rating: 4.8, screenSize: 15.6, ram: 32, storage: 1024, processor: 'Intel i9',  gpu: 'RTX 4070',   os: 'Windows 11', type: 'Gaming'    },
  { id: 303, name: '13.3" SlimBook Air',          brand: 'FeatherWorks', price: 64999, stock: 30, rating: 4.3, screenSize: 13.3, ram: 8,  storage: 256,  processor: 'AMD Ryzen 5', gpu: 'Integrated', os: 'Windows 11', type: 'Ultrabook' },
  { id: 304, name: '16" Creator Studio',          brand: 'PixelMax',    price: 179999, stock: 6,  rating: 4.9, screenSize: 16,   ram: 32, storage: 2048, processor: 'Apple M3 Pro', gpu: 'Integrated', os: 'macOS',     type: 'Creator'  },
  { id: 305, name: '15" Business ProBook',        brand: 'CoreWorks',   price: 74999,  stock: 25, rating: 4.2, screenSize: 15,   ram: 16, storage: 512,  processor: 'Intel i5',  gpu: 'Integrated', os: 'Windows 11', type: 'Business'  },
  { id: 306, name: '14" Convertible 2-in-1',      brand: 'NovaTech',    price: 94999,  stock: 14, rating: 4.4, screenSize: 14,   ram: 16, storage: 512,  processor: 'Intel i7',  gpu: 'Integrated', os: 'Windows 11', type: '2-in-1'    },
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
  const { type, os, processor, maxPrice, minRam, minStorage } = req.query;
  let results = [...laptops];
  if (type)       results = results.filter(l => l.type === type);
  if (os)         results = results.filter(l => l.os.toLowerCase() === os.toLowerCase());
  if (processor)  results = results.filter(l => l.processor.toLowerCase().includes(processor.toLowerCase()));
  if (maxPrice)   results = results.filter(l => l.price <= parseInt(maxPrice));
  if (minRam)     results = results.filter(l => l.ram >= parseInt(minRam));
  if (minStorage) results = results.filter(l => l.storage >= parseInt(minStorage));
  res.json({ laptops: results, count: results.length });
};

exports.search = (req, res) => {
  const { q, type, os, brand, processor, minPrice, maxPrice, minRating, minRam, minStorage, minScreenSize, maxScreenSize } = req.query;
  let results = [...laptops];
  if (q) {
    const term = q.toLowerCase();
    results = results.filter(l => l.name.toLowerCase().includes(term) || l.brand.toLowerCase().includes(term));
  }
  if (type)          results = results.filter(l => l.type === type);
  if (os)            results = results.filter(l => l.os.toLowerCase() === os.toLowerCase());
  if (brand)         results = results.filter(l => l.brand.toLowerCase() === brand.toLowerCase());
  if (processor)     results = results.filter(l => l.processor.toLowerCase().includes(processor.toLowerCase()));
  if (minPrice)      results = results.filter(l => l.price >= parseInt(minPrice));
  if (maxPrice)      results = results.filter(l => l.price <= parseInt(maxPrice));
  if (minRating)     results = results.filter(l => l.rating >= parseFloat(minRating));
  if (minRam)        results = results.filter(l => l.ram >= parseInt(minRam));
  if (minStorage)    results = results.filter(l => l.storage >= parseInt(minStorage));
  if (minScreenSize) results = results.filter(l => l.screenSize >= parseFloat(minScreenSize));
  if (maxScreenSize) results = results.filter(l => l.screenSize <= parseFloat(maxScreenSize));
  res.json({ results, count: results.length });
};

exports.getById = (req, res) => {
  const l = laptops.find(p => p.id === parseInt(req.params.id));
  if (!l) return res.status(404).json({ error: 'Laptop not found' });
  res.json(l);
};

exports.quickBuy = (req, res) => {
  const { productId, quantity = 1, address, payment, extendedWarranty = false, accidentalProtection = false } = req.body;
  const product = laptops.find(l => l.id === parseInt(productId));
  if (!product) return res.status(404).json({ error: 'Laptop not found' });

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

  const subtotal              = product.price * qty;
  const extendedWarrantyFee   = extendedWarranty    ? 2999 * qty : 0;
  const accidentalProtectionFee = accidentalProtection ? 1999 * qty : 0;
  const addOns                = extendedWarrantyFee + accidentalProtectionFee;
  const tax                   = Math.round((subtotal + addOns) * TAX_RATE);
  const shipping              = subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE;
  const total                 = subtotal + addOns + tax + shipping;

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
    extendedWarranty,
    accidentalProtection,
    payment: paymentRecord,
    totals: { subtotal, extendedWarrantyFee, accidentalProtectionFee, tax, shipping, total },
    status: payment.method === 'cod' ? 'payment_pending' : 'placed',
    createdAt: new Date()
  };
  orders.push(order);

  res.status(201).json({ message: 'Laptop purchased', order });
};

exports.getOrders = (req, res) => res.json({ orders, count: orders.length });
