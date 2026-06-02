const { v4: uuid } = require('uuid');
const { users } = require('../data/store');
const { signToken } = require('../middleware/auth');

function register(req, res) {
  const { name, email, phone, password } = req.body || {};

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: 'name, email, phone and password are required' });
  }

  const existing = Array.from(users.values()).find((u) => u.email === email);
  if (existing) {
    return res.status(409).json({ error: 'A user with this email already exists' });
  }

  const user = {
    id: uuid(),
    name,
    email,
    phone,
    password,
    addresses: [],
    createdAt: new Date().toISOString(),
  };

  users.set(user.id, user);

  const token = signToken({ id: user.id, email: user.email });
  return res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
  });
}

function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = Array.from(users.values()).find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken({ id: user.id, email: user.email });
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
  });
}

function addAddress(req, res) {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { label, line1, city, state, pincode } = req.body || {};
  if (!line1 || !city || !state || !pincode) {
    return res.status(400).json({ error: 'line1, city, state, pincode are required' });
  }

  const address = {
    id: uuid(),
    label: label || 'Home',
    line1,
    city,
    state,
    pincode,
  };
  user.addresses.push(address);
  res.status(201).json(address);
}

function getProfile(req, res) {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safe } = user;
  res.json(safe);
}

module.exports = { register, login, addAddress, getProfile };
