const users = [];
exports.register = (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' });
  const user = { id: users.length + 1, name, email, password };
  users.push(user);
  res.status(201).json({ message: 'Registration successful', userId: user.id });
};
exports.login = (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ message: 'Login successful', token: `fake-jwt-${user.id}`, userId: user.id });
};
exports.logout = (req, res) => res.json({ message: 'Logged out successfully' });
