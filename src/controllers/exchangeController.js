const EXCHANGE_WINDOW_DAYS = 30;
const VALID_REASONS = ['size', 'color', 'defective', 'wrong_item', 'not_as_described', 'other'];

const exchanges = [];

const findExchange = (id) => exchanges.find(e => e.exchangeId === id || String(e.id) === String(id));

exports.requestExchange = (req, res) => {
  const {
    orderId,
    userId,
    itemId,
    originalProductId,
    originalPrice,
    quantity,
    replacementProductId,
    replacementVariant,
    reason,
    deliveredAt,
    priceDifference
  } = req.body || {};

  if (!orderId || !userId || !itemId || !replacementProductId || !reason) {
    return res.status(400).json({ error: 'orderId, userId, itemId, replacementProductId and reason required' });
  }
  if (!VALID_REASONS.includes(reason)) {
    return res.status(400).json({ error: `reason must be one of ${VALID_REASONS.join(', ')}` });
  }
  if (typeof originalPrice !== 'number' || originalPrice < 0) {
    return res.status(400).json({ error: 'originalPrice must be a non-negative number' });
  }

  if (deliveredAt) {
    const delivered = new Date(deliveredAt);
    if (isNaN(delivered.getTime())) {
      return res.status(400).json({ error: 'deliveredAt must be a valid date' });
    }
    const daysSince = (Date.now() - delivered.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > EXCHANGE_WINDOW_DAYS) {
      return res.status(400).json({ error: `Exchange window of ${EXCHANGE_WINDOW_DAYS} days has expired` });
    }
    if (daysSince < 0) {
      return res.status(400).json({ error: 'deliveredAt cannot be in the future' });
    }
  }

  const existing = exchanges.find(e =>
    String(e.orderId) === String(orderId) &&
    String(e.itemId) === String(itemId) &&
    !['rejected', 'cancelled', 'completed'].includes(e.status)
  );
  if (existing) {
    return res.status(409).json({ error: 'An active exchange already exists for this item', exchangeId: existing.exchangeId });
  }

  const diff = typeof priceDifference === 'number' ? priceDifference : 0;
  const exchange = {
    id: exchanges.length + 1,
    exchangeId: `EXC-${Date.now()}-${exchanges.length + 1}`,
    orderId,
    userId,
    itemId,
    originalProductId: originalProductId || itemId,
    originalPrice,
    quantity: quantity || 1,
    replacementProductId,
    replacementVariant: replacementVariant || null,
    reason,
    priceDifference: diff,
    settlement: diff > 0 ? 'customer_pays' : diff < 0 ? 'refund_due' : 'none',
    status: 'requested',
    createdAt: new Date(),
    approvedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    shippedAt: null,
    trackingNumber: null,
    carrier: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null
  };
  exchanges.push(exchange);
  res.status(201).json({ message: 'Exchange requested', exchange });
};

exports.listExchanges = (req, res) => {
  const { status, userId, orderId } = req.query || {};
  let filtered = exchanges;
  if (status)  filtered = filtered.filter(e => e.status === status);
  if (userId)  filtered = filtered.filter(e => String(e.userId) === String(userId));
  if (orderId) filtered = filtered.filter(e => String(e.orderId) === String(orderId));
  res.json({ exchanges: filtered, total: filtered.length });
};

exports.getExchange = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  res.json(exchange);
};

exports.approveExchange = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  if (exchange.status !== 'requested') {
    return res.status(400).json({ error: `Cannot approve exchange in ${exchange.status} state` });
  }
  exchange.status = 'approved';
  exchange.approvedAt = new Date();
  exchange.approvalNote = req.body?.note || null;
  res.json({ message: 'Exchange approved', exchange });
};

exports.rejectExchange = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  if (exchange.status !== 'requested') {
    return res.status(400).json({ error: `Cannot reject exchange in ${exchange.status} state` });
  }
  const reason = req.body?.reason;
  if (!reason) return res.status(400).json({ error: 'reason required' });
  exchange.status = 'rejected';
  exchange.rejectedAt = new Date();
  exchange.rejectionReason = reason;
  res.json({ message: 'Exchange rejected', exchange });
};

exports.shipReplacement = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  if (exchange.status !== 'approved') {
    return res.status(400).json({ error: `Cannot ship replacement for exchange in ${exchange.status} state` });
  }
  const { trackingNumber, carrier } = req.body || {};
  if (!trackingNumber) return res.status(400).json({ error: 'trackingNumber required' });
  exchange.status = 'shipped';
  exchange.shippedAt = new Date();
  exchange.trackingNumber = trackingNumber;
  exchange.carrier = carrier || null;
  res.json({ message: 'Replacement shipped', exchange });
};

exports.completeExchange = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  if (exchange.status !== 'shipped') {
    return res.status(400).json({ error: `Cannot complete exchange in ${exchange.status} state` });
  }
  exchange.status = 'completed';
  exchange.completedAt = new Date();
  res.json({ message: 'Exchange completed', exchange });
};

exports.cancelExchange = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  if (['completed', 'cancelled', 'rejected'].includes(exchange.status)) {
    return res.status(400).json({ error: `Cannot cancel exchange in ${exchange.status} state` });
  }
  if (exchange.status === 'shipped') {
    return res.status(400).json({ error: 'Cannot cancel exchange after replacement has shipped' });
  }
  exchange.status = 'cancelled';
  exchange.cancelledAt = new Date();
  exchange.cancellationReason = req.body?.reason || 'No reason provided';
  res.json({ message: 'Exchange cancelled', exchange });
};

exports.getExchangeStatus = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  res.json({
    exchangeId: exchange.exchangeId,
    orderId: exchange.orderId,
    status: exchange.status,
    reason: exchange.reason,
    priceDifference: exchange.priceDifference,
    settlement: exchange.settlement,
    requestedAt: exchange.createdAt,
    approvedAt: exchange.approvedAt,
    rejectedAt: exchange.rejectedAt,
    rejectionReason: exchange.rejectionReason,
    shippedAt: exchange.shippedAt,
    trackingNumber: exchange.trackingNumber,
    carrier: exchange.carrier,
    completedAt: exchange.completedAt,
    cancelledAt: exchange.cancelledAt
  });
};

exports._reset = () => { exchanges.length = 0; };
