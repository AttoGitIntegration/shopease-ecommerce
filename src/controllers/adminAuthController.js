const admins = [
  { id: 1, name: 'Root Admin', email: 'admin@shopease.com', password: 'admin@123' },
];
const adminTokens = new Set();
exports.adminTokens = adminTokens;
exports.admins = admins;

exports.register = (req, res) => {
  const { name, email, password, secret } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (secret !== 'SHOPEASE-ADMIN-SECRET') return res.status(403).json({ error: 'Invalid admin secret' });
  if (admins.find(a => a.email === email)) return res.status(409).json({ error: 'Email already registered' });
  const admin = { id: admins.length + 1, name, email, password };
  admins.push(admin);
  res.status(201).json({ message: 'Admin registration successful', adminId: admin.id });
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  const admin = admins.find(a => a.email === email && a.password === password);
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
  const token = `admin-jwt-${admin.id}-${Date.now()}`;
  adminTokens.add(token);
  res.json({ message: 'Admin login successful', token, adminId: admin.id });
};

exports.logout = (req, res) => {
  adminTokens.delete(req.adminToken);
  res.json({ message: 'Admin logged out successfully' });
};

exports.whoAmI = (req, res) => {
  const admin = admins.find(a => a.id === req.adminId);
  if (!admin) return res.status(404).json({ error: 'Admin not found' });
  res.json({ id: admin.id, name: admin.name, email: admin.email });
};
