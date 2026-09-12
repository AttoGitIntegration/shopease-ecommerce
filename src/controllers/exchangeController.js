const EXCHANGE_WINDOW_DAYS = 30;
const VALID_REASONS = ['size', 'color', 'defective', 'wrong_item', 'not_as_described', 'other'];
const VALID_PICKUP_SLOTS = ['morning', 'afternoon', 'evening'];
const VALID_INSPECTION_RESULTS = ['pass', 'fail'];
const VALID_SETTLEMENT_METHODS = ['card', 'upi', 'wallet', 'store_credit', 'bank_transfer'];

const exchanges = [];

const findExchange = (id) => exchanges.find(e => e.exchangeId === id || String(e.id) === String(id));

const recordEvent = (exchange, event, details = {}) => {
  exchange.history.push({
    event,
    at: new Date(),
    ...details
  });
};

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
    settlementStatus: diff === 0 ? 'not_required' : 'pending',
    settlementMethod: null,
    settlementReference: null,
    settledAt: null,
    status: 'requested',
    createdAt: new Date(),
    approvedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    pickupScheduledAt: null,
    pickupAddress: null,
    pickupDate: null,
    pickupSlot: null,
    pickedUpAt: null,
    pickupAgent: null,
    receivedAt: null,
    receivedBy: null,
    inspectedAt: null,
    inspectionResult: null,
    inspectionNotes: null,
    shippedAt: null,
    trackingNumber: null,
    carrier: null,
    deliveredAt: null,
    deliverySignature: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    history: []
  };
  recordEvent(exchange, 'requested', { reason, priceDifference: diff });
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
  recordEvent(exchange, 'approved', { note: exchange.approvalNote });
  res.json({ message: 'Exchange approved', exchange });
};

exports.rejectExchange = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  if (!['requested', 'inspected_fail'].includes(exchange.status)) {
    return res.status(400).json({ error: `Cannot reject exchange in ${exchange.status} state` });
  }
  const reason = req.body?.reason;
  if (!reason) return res.status(400).json({ error: 'reason required' });
  exchange.status = 'rejected';
  exchange.rejectedAt = new Date();
  exchange.rejectionReason = reason;
  recordEvent(exchange, 'rejected', { reason });
  res.json({ message: 'Exchange rejected', exchange });
};

exports.schedulePickup = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  if (exchange.status !== 'approved') {
    return res.status(400).json({ error: `Cannot schedule pickup in ${exchange.status} state` });
  }
  const { pickupAddress, pickupDate, pickupSlot } = req.body || {};
  if (!pickupAddress || !pickupDate || !pickupSlot) {
    return res.status(400).json({ error: 'pickupAddress, pickupDate and pickupSlot required' });
  }
  if (!VALID_PICKUP_SLOTS.includes(pickupSlot)) {
    return res.status(400).json({ error: `pickupSlot must be one of ${VALID_PICKUP_SLOTS.join(', ')}` });
  }
  const date = new Date(pickupDate);
  if (isNaN(date.getTime())) {
    return res.status(400).json({ error: 'pickupDate must be a valid date' });
  }
  if (date.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
    return res.status(400).json({ error: 'pickupDate cannot be in the past' });
  }
  exchange.status = 'pickup_scheduled';
  exchange.pickupScheduledAt = new Date();
  exchange.pickupAddress = pickupAddress;
  exchange.pickupDate = date;
  exchange.pickupSlot = pickupSlot;
  recordEvent(exchange, 'pickup_scheduled', { pickupDate: date, pickupSlot });
  res.json({ message: 'Pickup scheduled', exchange });
};

exports.markPickedUp = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  if (exchange.status !== 'pickup_scheduled') {
    return res.status(400).json({ error: `Cannot mark picked up in ${exchange.status} state` });
  }
  const { pickupAgent } = req.body || {};
  exchange.status = 'picked_up';
  exchange.pickedUpAt = new Date();
  exchange.pickupAgent = pickupAgent || null;
  recordEvent(exchange, 'picked_up', { pickupAgent: exchange.pickupAgent });
  res.json({ message: 'Original item picked up', exchange });
};

exports.markReceived = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  if (exchange.status !== 'picked_up') {
    return res.status(400).json({ error: `Cannot mark received in ${exchange.status} state` });
  }
  const { receivedBy } = req.body || {};
  exchange.status = 'received';
  exchange.receivedAt = new Date();
  exchange.receivedBy = receivedBy || null;
  recordEvent(exchange, 'received', { receivedBy: exchange.receivedBy });
  res.json({ message: 'Original item received at warehouse', exchange });
};

exports.inspectItem = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  if (exchange.status !== 'received') {
    return res.status(400).json({ error: `Cannot inspect in ${exchange.status} state` });
  }
  const { result, notes } = req.body || {};
  if (!VALID_INSPECTION_RESULTS.includes(result)) {
    return res.status(400).json({ error: `result must be one of ${VALID_INSPECTION_RESULTS.join(', ')}` });
  }
  exchange.inspectedAt = new Date();
  exchange.inspectionResult = result;
  exchange.inspectionNotes = notes || null;
  exchange.status = result === 'pass' ? 'inspected_pass' : 'inspected_fail';
  recordEvent(exchange, 'inspected', { result, notes: exchange.inspectionNotes });
  res.json({ message: `Inspection ${result}`, exchange });
};

exports.shipReplacement = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  if (!['approved', 'inspected_pass'].includes(exchange.status)) {
    return res.status(400).json({ error: `Cannot ship replacement for exchange in ${exchange.status} state` });
  }
  const { trackingNumber, carrier } = req.body || {};
  if (!trackingNumber) return res.status(400).json({ error: 'trackingNumber required' });
  exchange.status = 'shipped';
  exchange.shippedAt = new Date();
  exchange.trackingNumber = trackingNumber;
  exchange.carrier = carrier || null;
  recordEvent(exchange, 'shipped', { trackingNumber, carrier: exchange.carrier });
  res.json({ message: 'Replacement shipped', exchange });
};

exports.markDelivered = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  if (exchange.status !== 'shipped') {
    return res.status(400).json({ error: `Cannot mark delivered in ${exchange.status} state` });
  }
  const { signature } = req.body || {};
  exchange.status = 'delivered';
  exchange.deliveredAt = new Date();
  exchange.deliverySignature = signature || null;
  recordEvent(exchange, 'delivered', { signature: exchange.deliverySignature });
  res.json({ message: 'Replacement delivered', exchange });
};

exports.settlePriceDifference = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  if (!['delivered', 'shipped'].includes(exchange.status)) {
    return res.status(400).json({ error: `Cannot settle in ${exchange.status} state` });
  }
  if (exchange.settlement === 'none') {
    return res.status(400).json({ error: 'No settlement required for this exchange' });
  }
  if (exchange.settlementStatus === 'settled') {
    return res.status(400).json({ error: 'Settlement already completed' });
  }
  const { method, reference } = req.body || {};
  if (!VALID_SETTLEMENT_METHODS.includes(method)) {
    return res.status(400).json({ error: `method must be one of ${VALID_SETTLEMENT_METHODS.join(', ')}` });
  }
  if (!reference) {
    return res.status(400).json({ error: 'reference required' });
  }
  exchange.settlementStatus = 'settled';
  exchange.settlementMethod = method;
  exchange.settlementReference = reference;
  exchange.settledAt = new Date();
  recordEvent(exchange, 'settled', {
    method,
    reference,
    direction: exchange.settlement,
    amount: Math.abs(exchange.priceDifference)
  });
  res.json({ message: 'Price difference settled', exchange });
};

exports.completeExchange = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  if (!['shipped', 'delivered'].includes(exchange.status)) {
    return res.status(400).json({ error: `Cannot complete exchange in ${exchange.status} state` });
  }
  if (exchange.settlement !== 'none' && exchange.settlementStatus !== 'settled') {
    return res.status(400).json({ error: 'Cannot complete exchange before price difference is settled' });
  }
  exchange.status = 'completed';
  exchange.completedAt = new Date();
  recordEvent(exchange, 'completed');
  res.json({ message: 'Exchange completed', exchange });
};

exports.cancelExchange = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  if (['completed', 'cancelled', 'rejected'].includes(exchange.status)) {
    return res.status(400).json({ error: `Cannot cancel exchange in ${exchange.status} state` });
  }
  if (['picked_up', 'received', 'inspected_pass', 'inspected_fail', 'shipped', 'delivered'].includes(exchange.status)) {
    return res.status(400).json({ error: `Cannot cancel exchange after original item has been picked up (current state: ${exchange.status})` });
  }
  exchange.status = 'cancelled';
  exchange.cancelledAt = new Date();
  exchange.cancellationReason = req.body?.reason || 'No reason provided';
  recordEvent(exchange, 'cancelled', { reason: exchange.cancellationReason });
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
    settlementStatus: exchange.settlementStatus,
    requestedAt: exchange.createdAt,
    approvedAt: exchange.approvedAt,
    rejectedAt: exchange.rejectedAt,
    rejectionReason: exchange.rejectionReason,
    pickupScheduledAt: exchange.pickupScheduledAt,
    pickupDate: exchange.pickupDate,
    pickupSlot: exchange.pickupSlot,
    pickedUpAt: exchange.pickedUpAt,
    receivedAt: exchange.receivedAt,
    inspectedAt: exchange.inspectedAt,
    inspectionResult: exchange.inspectionResult,
    shippedAt: exchange.shippedAt,
    trackingNumber: exchange.trackingNumber,
    carrier: exchange.carrier,
    deliveredAt: exchange.deliveredAt,
    settledAt: exchange.settledAt,
    completedAt: exchange.completedAt,
    cancelledAt: exchange.cancelledAt
  });
};

exports.getExchangeHistory = (req, res) => {
  const exchange = findExchange(req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
  res.json({
    exchangeId: exchange.exchangeId,
    status: exchange.status,
    history: exchange.history
  });
};

exports._reset = () => { exchanges.length = 0; };
