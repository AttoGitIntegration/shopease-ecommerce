const VALID_METHODS = ['card', 'upi', 'cod', 'netbanking', 'wallet'];
const VALID_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
const SUPPORTED_BANKS = ['HDFC', 'ICICI', 'SBI', 'AXIS', 'KOTAK'];
const SUPPORTED_WALLETS = ['paytm', 'phonepe', 'gpay', 'amazonpay'];

const payments = [];
const refunds = [];

const findPayment = (id) => payments.find(p => p.transactionId === id || String(p.id) === String(id));

const validateCard = ({ cardNumber, cvv, expiry }) => {
  if (!cardNumber || !cvv || !expiry) return 'cardNumber, cvv and expiry required';
  if (!/^\d{13,19}$/.test(cardNumber)) return 'Invalid card number';
  if (!/^\d{3,4}$/.test(cvv))          return 'Invalid cvv';
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) return 'expiry must be MM/YY';
  const [mm, yy] = expiry.split('/').map(Number);
  const expiryDate = new Date(2000 + yy, mm, 0, 23, 59, 59);
  if (expiryDate.getTime() < Date.now()) return 'Card expired';
  return null;
};

const validateUpi = (upiId) => {
  if (!upiId || !/^[\w.-]+@[\w.-]+$/.test(upiId)) return 'Valid upiId required';
  return null;
};

exports.listMethods = (req, res) => {
  res.json({
    methods: VALID_METHODS,
    currencies: VALID_CURRENCIES,
    banks: SUPPORTED_BANKS,
    wallets: SUPPORTED_WALLETS
  });
};

exports.createIntent = (req, res) => {
  const { amount, currency = 'INR', method, orderId } = req.body || {};
  if (typeof amount !== 'number' || amount <= 0)
    return res.status(400).json({ error: 'amount must be a positive number' });
  if (!VALID_CURRENCIES.includes(currency))
    return res.status(400).json({ error: `currency must be one of ${VALID_CURRENCIES.join(', ')}` });
  if (!VALID_METHODS.includes(method))
    return res.status(400).json({ error: `method must be one of ${VALID_METHODS.join(', ')}` });
  const intent = {
    id: payments.length + 1,
    transactionId: `TXN-${Date.now()}-${payments.length + 1}`,
    orderId: orderId || null,
    amount,
    currency,
    method,
    status: 'created',
    createdAt: new Date(),
    capturedAt: null,
    failureReason: null
  };
  payments.push(intent);
  res.status(201).json({ message: 'Payment intent created', payment: intent });
};

exports.capture = (req, res) => {
  const payment = findPayment(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.status !== 'created')
    return res.status(400).json({ error: `Cannot capture payment in ${payment.status} state` });

  const { cardNumber, cvv, expiry, upiId, bank, wallet, otp } = req.body || {};

  if (payment.method === 'card') {
    const err = validateCard({ cardNumber, cvv, expiry });
    if (err) return res.status(400).json({ error: err });
    payment.last4 = cardNumber.slice(-4);
  } else if (payment.method === 'upi') {
    const err = validateUpi(upiId);
    if (err) return res.status(400).json({ error: err });
    payment.upiId = upiId;
  } else if (payment.method === 'netbanking') {
    if (!bank) return res.status(400).json({ error: 'bank required' });
    if (!SUPPORTED_BANKS.includes(bank))
      return res.status(400).json({ error: `bank must be one of ${SUPPORTED_BANKS.join(', ')}` });
    payment.bank = bank;
  } else if (payment.method === 'wallet') {
    if (!wallet) return res.status(400).json({ error: 'wallet required' });
    if (!SUPPORTED_WALLETS.includes(wallet))
      return res.status(400).json({ error: `wallet must be one of ${SUPPORTED_WALLETS.join(', ')}` });
    if (!otp || !/^\d{4,6}$/.test(otp))
      return res.status(400).json({ error: 'otp (4-6 digits) required' });
    payment.wallet = wallet;
  }

  if (payment.method === 'cod') {
    payment.status = 'pending_collection';
    payment.capturedAt = null;
  } else {
    payment.status = 'captured';
    payment.capturedAt = new Date();
  }
  res.json({ message: 'Payment captured', payment });
};

exports.verify = (req, res) => {
  const payment = findPayment(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json({
    transactionId: payment.transactionId,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    capturedAt: payment.capturedAt,
    failureReason: payment.failureReason
  });
};

exports.getPayment = (req, res) => {
  const payment = findPayment(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json(payment);
};

exports.listPayments = (req, res) => {
  const { status, method, orderId } = req.query || {};
  let filtered = payments;
  if (status)  filtered = filtered.filter(p => p.status === status);
  if (method)  filtered = filtered.filter(p => p.method === method);
  if (orderId) filtered = filtered.filter(p => String(p.orderId) === String(orderId));
  res.json({ payments: filtered, total: filtered.length });
};

exports.markFailed = (req, res) => {
  const payment = findPayment(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (!['created', 'captured'].includes(payment.status))
    return res.status(400).json({ error: `Cannot fail payment in ${payment.status} state` });
  const reason = req.body?.reason;
  if (!reason) return res.status(400).json({ error: 'reason required' });
  payment.status = 'failed';
  payment.failureReason = reason;
  payment.failedAt = new Date();
  res.json({ message: 'Payment marked failed', payment });
};

exports.refund = (req, res) => {
  const payment = findPayment(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.status !== 'captured')
    return res.status(400).json({ error: `Cannot refund payment in ${payment.status} state` });
  const { amount, reason } = req.body || {};
  const alreadyRefunded = refunds
    .filter(r => r.transactionId === payment.transactionId)
    .reduce((sum, r) => sum + r.amount, 0);
  const refundable = payment.amount - alreadyRefunded;
  const refundAmount = amount ?? refundable;
  if (typeof refundAmount !== 'number' || refundAmount <= 0)
    return res.status(400).json({ error: 'amount must be a positive number' });
  if (refundAmount > refundable)
    return res.status(400).json({ error: `Refund exceeds refundable amount (${refundable})` });
  const refund = {
    id: refunds.length + 1,
    refundId: `RFND-${Date.now()}-${refunds.length + 1}`,
    transactionId: payment.transactionId,
    amount: refundAmount,
    reason: reason || null,
    status: 'processed',
    createdAt: new Date()
  };
  refunds.push(refund);
  const totalRefunded = alreadyRefunded + refundAmount;
  payment.status = totalRefunded >= payment.amount ? 'refunded' : 'partially_refunded';
  payment.refundedAmount = totalRefunded;
  res.status(201).json({ message: 'Refund processed', refund, payment });
};

exports.listRefunds = (req, res) => {
  const { transactionId } = req.query || {};
  const filtered = transactionId
    ? refunds.filter(r => r.transactionId === transactionId)
    : refunds;
  res.json({ refunds: filtered, total: filtered.length });
};

exports._reset = () => {
  payments.length = 0;
  refunds.length = 0;
};
