const users = [];
const activeTokens = new Set();
const resetTokens = new Map();
const verifyTokens = new Map();
exports.activeTokens = activeTokens;
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
  const token = `fake-jwt-${user.id}-${Date.now()}`;
  activeTokens.add(token);
  res.json({ message: 'Login successful', token, userId: user.id });
};
exports.logout = (req, res) => {
  activeTokens.delete(req.token);
  res.json({ message: 'Logged out successfully' });
};
exports.forgotPassword = (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const token = `reset-${user.id}-${Date.now()}`;
  resetTokens.set(token, user.id);
  res.json({ message: 'Reset token issued', resetToken: token });
};
exports.resetPassword = (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  const userId = resetTokens.get(token);
  if (!userId) return res.status(400).json({ error: 'Invalid or expired token' });
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.password = password;
  resetTokens.delete(token);
  res.json({ message: 'Password reset successful' });
};
exports.verifyEmail = (req, res) => {
  const { token } = req.params;
  const userId = verifyTokens.get(token);
  if (!userId) return res.status(400).json({ error: 'Invalid or expired token' });
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.verified = true;
  verifyTokens.delete(token);
  res.json({ message: 'Email verified' });
};
exports.resendVerification = (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.verified) return res.status(400).json({ error: 'Already verified' });
  const token = `verify-${user.id}-${Date.now()}`;
  verifyTokens.set(token, user.id);
  res.json({ message: 'Verification token issued', verifyToken: token });
};
exports.refreshToken = (req, res) => {
  const { token } = req.body;
  if (!token || !activeTokens.has(token)) return res.status(401).json({ error: 'Invalid token' });
  activeTokens.delete(token);
  const userId = Number(token.split('-')[2]);
  const newToken = `fake-jwt-${userId}-${Date.now()}`;
  activeTokens.add(newToken);
  res.json({ message: 'Token refreshed', token: newToken });
};
