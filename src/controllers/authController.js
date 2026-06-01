const users = [];
const activeTokens = new Set();
const emailOtps = new Map();
const signupOtps = new Map();
exports.activeTokens = activeTokens;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.register = (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (!EMAIL_REGEX.test(email)) return res.status(400).json({ error: 'Invalid email format' });
  if (users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' });
  const user = { id: users.length + 1, name, email, password, isVerified: false };
  users.push(user);
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  signupOtps.set(email, { otp, expiresAt });
  res.status(201).json({ message: 'Registration successful. Please verify your email.', userId: user.id, otp, otpExpiresAt: expiresAt });
};
exports.verifyEmail = (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'email and otp required' });
  const record = signupOtps.get(email);
  if (!record) return res.status(400).json({ error: 'No OTP requested for this email' });
  if (new Date() > record.expiresAt) {
    signupOtps.delete(email);
    return res.status(400).json({ error: 'OTP expired' });
  }
  if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
  signupOtps.delete(email);
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.isVerified = true;
  res.json({ message: 'Email verified successfully' });
};
exports.login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.isVerified) return res.status(403).json({ error: 'Email not verified. Please verify your email before logging in.' });
  const token = `fake-jwt-${user.id}-${Date.now()}`;
  activeTokens.add(token);
  res.json({ message: 'Login successful', token, userId: user.id });
};
exports.logout = (req, res) => {
  activeTokens.delete(req.token);
  res.json({ message: 'Logged out successfully' });
};
exports.me = (req, res) => {
  const userId = parseInt(req.token.split('-')[2], 10);
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email });
};
exports.sendLoginOtp = (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'No account found with this email' });
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  emailOtps.set(email, { otp, expiresAt });
  res.json({ message: 'OTP sent to email', otp, otpExpiresAt: expiresAt });
};
exports.verifyLoginOtp = (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'email and otp required' });
  const record = emailOtps.get(email);
  if (!record) return res.status(400).json({ error: 'No OTP requested for this email' });
  if (new Date() > record.expiresAt) {
    emailOtps.delete(email);
    return res.status(400).json({ error: 'OTP expired' });
  }
  if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
  emailOtps.delete(email);
  const user = users.find(u => u.email === email);
  const token = `fake-jwt-${user.id}-${Date.now()}`;
  activeTokens.add(token);
  res.json({ message: 'Login successful', token, userId: user.id });
};
