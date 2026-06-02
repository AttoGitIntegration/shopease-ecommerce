const { medicines, carts } = require('../data/store');

function getCart(userId) {
  if (!carts.has(userId)) {
    carts.set(userId, { items: [] });
  }
  return carts.get(userId);
}

function buildCartView(cart) {
  const items = cart.items.map((line) => {
    const medicine = medicines.find((m) => m.id === line.medicineId);
    if (!medicine) return null;
    return {
      medicineId: medicine.id,
      name: medicine.name,
      price: medicine.price,
      quantity: line.quantity,
      subtotal: +(medicine.price * line.quantity).toFixed(2),
      prescriptionRequired: medicine.prescriptionRequired,
      image: medicine.image,
    };
  }).filter(Boolean);

  const subtotal = +items.reduce((sum, l) => sum + l.subtotal, 0).toFixed(2);
  const shipping = subtotal > 0 && subtotal < 500 ? 40 : 0;
  const total = +(subtotal + shipping).toFixed(2);
  const needsPrescription = items.some((l) => l.prescriptionRequired);

  return { items, subtotal, shipping, total, needsPrescription };
}

function viewCart(req, res) {
  const cart = getCart(req.user.id);
  res.json(buildCartView(cart));
}

function addToCart(req, res) {
  const { medicineId, quantity = 1 } = req.body || {};
  if (!medicineId) {
    return res.status(400).json({ error: 'medicineId is required' });
  }

  const qty = parseInt(quantity, 10);
  if (Number.isNaN(qty) || qty < 1) {
    return res.status(400).json({ error: 'quantity must be a positive integer' });
  }

  const medicine = medicines.find((m) => m.id === medicineId);
  if (!medicine) {
    return res.status(404).json({ error: 'Medicine not found' });
  }
  if (medicine.stock < qty) {
    return res.status(409).json({ error: `Only ${medicine.stock} unit(s) available` });
  }

  const cart = getCart(req.user.id);
  const existing = cart.items.find((l) => l.medicineId === medicineId);
  if (existing) {
    const newQty = existing.quantity + qty;
    if (medicine.stock < newQty) {
      return res.status(409).json({ error: `Only ${medicine.stock} unit(s) available` });
    }
    existing.quantity = newQty;
  } else {
    cart.items.push({ medicineId, quantity: qty });
  }

  res.status(201).json(buildCartView(cart));
}

function updateCartItem(req, res) {
  const { quantity } = req.body || {};
  const qty = parseInt(quantity, 10);
  if (Number.isNaN(qty) || qty < 0) {
    return res.status(400).json({ error: 'quantity must be zero or a positive integer' });
  }

  const cart = getCart(req.user.id);
  const line = cart.items.find((l) => l.medicineId === req.params.medicineId);
  if (!line) {
    return res.status(404).json({ error: 'Item not in cart' });
  }

  if (qty === 0) {
    cart.items = cart.items.filter((l) => l.medicineId !== req.params.medicineId);
  } else {
    const medicine = medicines.find((m) => m.id === req.params.medicineId);
    if (medicine && medicine.stock < qty) {
      return res.status(409).json({ error: `Only ${medicine.stock} unit(s) available` });
    }
    line.quantity = qty;
  }

  res.json(buildCartView(cart));
}

function removeCartItem(req, res) {
  const cart = getCart(req.user.id);
  const before = cart.items.length;
  cart.items = cart.items.filter((l) => l.medicineId !== req.params.medicineId);
  if (cart.items.length === before) {
    return res.status(404).json({ error: 'Item not in cart' });
  }
  res.json(buildCartView(cart));
}

function clearCart(req, res) {
  const cart = getCart(req.user.id);
  cart.items = [];
  res.json(buildCartView(cart));
}

module.exports = {
  viewCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  getCart,
  buildCartView,
};
