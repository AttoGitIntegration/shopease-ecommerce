const RETURN_WINDOW_DAYS = 30;
const VALID_REASONS = ['defective', 'wrong_item', 'not_as_described', 'damaged_in_transit', 'no_longer_needed', 'other'];
const VALID_CARRIERS = ['fedex', 'ups', 'usps', 'dhl', 'bluedart', 'delhivery', 'other'];
const VALID_INSPECTION_RESULTS = ['pass', 'fail'];
const VALID_REFUND_METHODS = ['original_payment', 'store_credit', 'bank_transfer', 'wallet'];

const returns = [];

const findReturn = (id) =>
  returns.find(r => r.returnId === id || String(r.id) === String(id));

const recordEvent = (ret, event, details = {}) => {
  ret.history.push({ event, at: new Date(), ...details });
};

exports.initiateReturn = (req, res) => {
  const {
    orderId,
    userId,
    itemId,
    productId,
    quantity,
    purchasePrice,
    reason,
    deliveredAt,
    notes
  } = req.body || {};

  if (!orderId || !userId || !itemId || !reason) {
    return res.status(400).json({ error: 'orderId, userId, itemId and reason required' });
  }
  if (!VALID_REASONS.includes(reason)) {
    return res.status(400).json({ error: `reason must be one of ${VALID_REASONS.join(', ')}` });
  }
  if (typeof purchasePrice !== 'number' || purchasePrice < 0) {
    return res.status(400).json({ error: 'purchasePrice must be a non-negative number' });
  }

  if (deliveredAt) {
    const delivered = new Date(deliveredAt);
    if (isNaN(delivered.getTime())) {
      return res.status(400).json({ error: 'deliveredAt must be a valid date' });
    }
    const daysSince = (Date.now() - delivered.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 0) {
      return res.status(400).json({ error: 'deliveredAt cannot be in the future' });
    }
    if (daysSince > RETURN_WINDOW_DAYS) {
      return res.status(400).json({ error: `Return window of ${RETURN_WINDOW_DAYS} days has expired` });
    }
  }

  const existing = returns.find(r =>
    String(r.orderId) === String(orderId) &&
    String(r.itemId) === String(itemId) &&
    !['rejected', 'cancelled', 'refunded'].includes(r.status)
  );
  if (existing) {
    return res.status(409).json({ error: 'An active return already exists for this item', returnId: existing.returnId });
  }

  const ret = {
    id: returns.length + 1,
    returnId: `RET-${Date.now()}-${returns.length + 1}`,
    orderId,
    userId,
    itemId,
    productId: productId || itemId,
    quantity: quantity || 1,
    purchasePrice,
    reason,
    notes: notes || null,
    status: 'initiated',
    createdAt: new Date(),
    label: null,
    labelGeneratedAt: null,
    carrier: null,
    trackingNumber: null,
    shippedAt: null,
    checkpoints: [],
    deliveredAt: null,
    deliverySignature: null,
    inspectedAt: null,
    inspectionResult: null,
    inspectionNotes: null,
    refundAmount: null,
    refundMethod: null,
    refundReference: null,
    refundedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    cancelledAt: null,
    cancellationReason: null,
    lostAt: null,
    lostNote: null,
    history: []
  };
  recordEvent(ret, 'initiated', { reason });
  returns.push(ret);
  res.status(201).json({ message: 'Return initiated', return: ret });
};

exports.listReturns = (req, res) => {
  const { status, userId, orderId } = req.query || {};
  let filtered = returns;
  if (status)  filtered = filtered.filter(r => r.status === status);
  if (userId)  filtered = filtered.filter(r => String(r.userId) === String(userId));
  if (orderId) filtered = filtered.filter(r => String(r.orderId) === String(orderId));
  res.json({ returns: filtered, total: filtered.length });
};

exports.getReturn = (req, res) => {
  const ret = findReturn(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  res.json(ret);
};

exports.generateLabel = (req, res) => {
  const ret = findReturn(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  if (ret.status !== 'initiated') {
    return res.status(400).json({ error: `Cannot generate label in ${ret.status} state` });
  }
  const { carrier, fromAddress, toAddress } = req.body || {};
  if (!carrier || !fromAddress || !toAddress) {
    return res.status(400).json({ error: 'carrier, fromAddress and toAddress required' });
  }
  if (!VALID_CARRIERS.includes(carrier)) {
    return res.status(400).json({ error: `carrier must be one of ${VALID_CARRIERS.join(', ')}` });
  }
  const trackingNumber = `${carrier.toUpperCase()}-${Date.now()}-${ret.id}`;
  ret.status = 'label_generated';
  ret.carrier = carrier;
  ret.trackingNumber = trackingNumber;
  ret.label = {
    trackingNumber,
    carrier,
    fromAddress,
    toAddress,
    labelUrl: `/labels/${trackingNumber}.pdf`
  };
  ret.labelGeneratedAt = new Date();
  recordEvent(ret, 'label_generated', { carrier, trackingNumber });
  res.json({ message: 'Return label generated', return: ret });
};

exports.markShipped = (req, res) => {
  const ret = findReturn(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  if (ret.status !== 'label_generated') {
    return res.status(400).json({ error: `Cannot mark shipped in ${ret.status} state` });
  }
  const { shippedAt, location } = req.body || {};
  const at = shippedAt ? new Date(shippedAt) : new Date();
  if (isNaN(at.getTime())) {
    return res.status(400).json({ error: 'shippedAt must be a valid date' });
  }
  ret.status = 'in_transit';
  ret.shippedAt = at;
  ret.checkpoints.push({ at, location: location || 'origin', status: 'picked_up_by_carrier' });
  recordEvent(ret, 'shipped', { location: location || 'origin' });
  res.json({ message: 'Return shipment in transit', return: ret });
};

exports.addTrackingCheckpoint = (req, res) => {
  const ret = findReturn(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  if (ret.status !== 'in_transit') {
    return res.status(400).json({ error: `Cannot add checkpoint in ${ret.status} state` });
  }
  const { location, status, at } = req.body || {};
  if (!location || !status) {
    return res.status(400).json({ error: 'location and status required' });
  }
  const checkpointAt = at ? new Date(at) : new Date();
  if (isNaN(checkpointAt.getTime())) {
    return res.status(400).json({ error: 'at must be a valid date' });
  }
  ret.checkpoints.push({ at: checkpointAt, location, status });
  recordEvent(ret, 'tracking_update', { location, status });
  res.json({ message: 'Tracking checkpoint added', return: ret });
};

exports.markDelivered = (req, res) => {
  const ret = findReturn(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  if (ret.status !== 'in_transit') {
    return res.status(400).json({ error: `Cannot mark delivered in ${ret.status} state` });
  }
  const { signature, deliveredAt } = req.body || {};
  const at = deliveredAt ? new Date(deliveredAt) : new Date();
  if (isNaN(at.getTime())) {
    return res.status(400).json({ error: 'deliveredAt must be a valid date' });
  }
  ret.status = 'delivered';
  ret.deliveredAt = at;
  ret.deliverySignature = signature || null;
  ret.checkpoints.push({ at, location: 'warehouse', status: 'delivered' });
  recordEvent(ret, 'delivered', { signature: ret.deliverySignature });
  res.json({ message: 'Return shipment delivered to warehouse', return: ret });
};

exports.markLost = (req, res) => {
  const ret = findReturn(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  if (ret.status !== 'in_transit') {
    return res.status(400).json({ error: `Cannot mark lost in ${ret.status} state` });
  }
  const { note } = req.body || {};
  ret.status = 'lost';
  ret.lostAt = new Date();
  ret.lostNote = note || null;
  recordEvent(ret, 'lost', { note: ret.lostNote });
  res.json({ message: 'Return shipment marked as lost in transit', return: ret });
};

exports.inspectReturn = (req, res) => {
  const ret = findReturn(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  if (ret.status !== 'delivered') {
    return res.status(400).json({ error: `Cannot inspect in ${ret.status} state` });
  }
  const { result, notes } = req.body || {};
  if (!VALID_INSPECTION_RESULTS.includes(result)) {
    return res.status(400).json({ error: `result must be one of ${VALID_INSPECTION_RESULTS.join(', ')}` });
  }
  ret.inspectedAt = new Date();
  ret.inspectionResult = result;
  ret.inspectionNotes = notes || null;
  ret.status = result === 'pass' ? 'inspected_pass' : 'inspected_fail';
  recordEvent(ret, 'inspected', { result, notes: ret.inspectionNotes });
  res.json({ message: `Inspection ${result}`, return: ret });
};

exports.issueRefund = (req, res) => {
  const ret = findReturn(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  if (!['inspected_pass', 'lost'].includes(ret.status)) {
    return res.status(400).json({ error: `Cannot issue refund in ${ret.status} state` });
  }
  const { method, reference, amount } = req.body || {};
  if (!VALID_REFUND_METHODS.includes(method)) {
    return res.status(400).json({ error: `method must be one of ${VALID_REFUND_METHODS.join(', ')}` });
  }
  if (!reference) {
    return res.status(400).json({ error: 'reference required' });
  }
  const refundAmount = typeof amount === 'number' ? amount : ret.purchasePrice * ret.quantity;
  if (refundAmount < 0 || refundAmount > ret.purchasePrice * ret.quantity) {
    return res.status(400).json({ error: 'amount must be between 0 and the original purchase total' });
  }
  ret.status = 'refunded';
  ret.refundAmount = refundAmount;
  ret.refundMethod = method;
  ret.refundReference = reference;
  ret.refundedAt = new Date();
  recordEvent(ret, 'refunded', { method, reference, amount: refundAmount });
  res.json({ message: 'Refund issued', return: ret });
};

exports.rejectReturn = (req, res) => {
  const ret = findReturn(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  if (!['initiated', 'inspected_fail'].includes(ret.status)) {
    return res.status(400).json({ error: `Cannot reject in ${ret.status} state` });
  }
  const reason = req.body?.reason;
  if (!reason) return res.status(400).json({ error: 'reason required' });
  ret.status = 'rejected';
  ret.rejectedAt = new Date();
  ret.rejectionReason = reason;
  recordEvent(ret, 'rejected', { reason });
  res.json({ message: 'Return rejected', return: ret });
};

exports.cancelReturn = (req, res) => {
  const ret = findReturn(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  if (!['initiated', 'label_generated'].includes(ret.status)) {
    return res.status(400).json({ error: `Cannot cancel return in ${ret.status} state (only allowed before shipment)` });
  }
  ret.status = 'cancelled';
  ret.cancelledAt = new Date();
  ret.cancellationReason = req.body?.reason || 'No reason provided';
  recordEvent(ret, 'cancelled', { reason: ret.cancellationReason });
  res.json({ message: 'Return cancelled', return: ret });
};

exports.getReturnStatus = (req, res) => {
  const ret = findReturn(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  res.json({
    returnId: ret.returnId,
    orderId: ret.orderId,
    status: ret.status,
    reason: ret.reason,
    carrier: ret.carrier,
    trackingNumber: ret.trackingNumber,
    initiatedAt: ret.createdAt,
    labelGeneratedAt: ret.labelGeneratedAt,
    shippedAt: ret.shippedAt,
    deliveredAt: ret.deliveredAt,
    inspectedAt: ret.inspectedAt,
    inspectionResult: ret.inspectionResult,
    refundedAt: ret.refundedAt,
    refundAmount: ret.refundAmount,
    rejectedAt: ret.rejectedAt,
    cancelledAt: ret.cancelledAt,
    lostAt: ret.lostAt
  });
};

exports.getReturnTracking = (req, res) => {
  const ret = findReturn(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  res.json({
    returnId: ret.returnId,
    carrier: ret.carrier,
    trackingNumber: ret.trackingNumber,
    status: ret.status,
    checkpoints: ret.checkpoints
  });
};

exports.getReturnHistory = (req, res) => {
  const ret = findReturn(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  res.json({
    returnId: ret.returnId,
    status: ret.status,
    history: ret.history
  });
};

exports._reset = () => { returns.length = 0; };
