const { _findPatient: findPatient, _getPrescriptionsByPatient: getRxByPatient } = require('./prescriptionController');

const visits = [
  { id: 'VIS-001', patientId: 'PAT-001', date: '2024-08-12', doctorId: 'DOC-001', speciality: 'General Medicine', reason: 'Fever and body ache',           diagnosis: 'Viral fever',                vitals: { bp: '120/78', pulse: 88, tempF: 101.2, spo2: 98 }, notes: 'Advised rest and hydration.' },
  { id: 'VIS-002', patientId: 'PAT-001', date: '2025-02-04', doctorId: 'DOC-003', speciality: 'Cardiology',       reason: 'Routine cardiac check-up',       diagnosis: 'No abnormality detected',    vitals: { bp: '118/76', pulse: 72, tempF: 98.4, spo2: 99 }, notes: 'Continue lifestyle modifications.' },
  { id: 'VIS-003', patientId: 'PAT-002', date: '2025-09-21', doctorId: 'DOC-002', speciality: 'Dermatology',      reason: 'Skin rash on forearm',           diagnosis: 'Contact dermatitis',         vitals: { bp: '110/70', pulse: 80, tempF: 98.6, spo2: 99 }, notes: 'Avoid suspected allergen.' },
  { id: 'VIS-004', patientId: 'PAT-002', date: '2026-01-15', doctorId: 'DOC-001', speciality: 'General Medicine', reason: 'Antenatal follow-up',            diagnosis: 'Pregnancy — second trimester', vitals: { bp: '116/74', pulse: 84, tempF: 98.6, spo2: 99 }, notes: 'Iron and folic acid supplements continued.' },
  { id: 'VIS-005', patientId: 'PAT-004', date: '2025-11-02', doctorId: 'DOC-003', speciality: 'Cardiology',       reason: 'Chest discomfort',                diagnosis: 'Stable angina',              vitals: { bp: '146/92', pulse: 96, tempF: 98.9, spo2: 96 }, notes: 'Started on statin; review in 2 weeks.' },
  { id: 'VIS-006', patientId: 'PAT-004', date: '2026-03-19', doctorId: 'DOC-001', speciality: 'General Medicine', reason: 'Diabetes follow-up',              diagnosis: 'Type 2 diabetes — controlled', vitals: { bp: '138/86', pulse: 82, tempF: 98.6, spo2: 97 }, notes: 'HbA1c improved from 8.1 to 6.9.' }
];

const labReports = [
  { id: 'LAB-001', patientId: 'PAT-001', date: '2024-08-12', test: 'Complete Blood Count',       result: 'Normal',          normalRange: '—',          flag: 'normal' },
  { id: 'LAB-002', patientId: 'PAT-001', date: '2025-02-04', test: 'Lipid Profile',              result: 'LDL 110 mg/dL',   normalRange: '< 130',       flag: 'normal' },
  { id: 'LAB-003', patientId: 'PAT-002', date: '2026-01-15', test: 'Hemoglobin',                 result: '10.4 g/dL',        normalRange: '12.0–15.5',   flag: 'low' },
  { id: 'LAB-004', patientId: 'PAT-004', date: '2025-11-02', test: 'Troponin I',                 result: '0.02 ng/mL',       normalRange: '< 0.04',      flag: 'normal' },
  { id: 'LAB-005', patientId: 'PAT-004', date: '2025-11-02', test: 'LDL Cholesterol',            result: '168 mg/dL',        normalRange: '< 130',       flag: 'high' },
  { id: 'LAB-006', patientId: 'PAT-004', date: '2026-03-19', test: 'HbA1c',                       result: '6.9 %',            normalRange: '< 7.0',       flag: 'normal' },
  { id: 'LAB-007', patientId: 'PAT-004', date: '2026-03-19', test: 'eGFR',                       result: '28 mL/min/1.73m²', normalRange: '> 60',       flag: 'low' }
];

const vaccinations = [
  { id: 'VAX-001', patientId: 'PAT-001', date: '2021-06-10', vaccine: 'COVID-19 (Covishield)', dose: '1' },
  { id: 'VAX-002', patientId: 'PAT-001', date: '2021-09-12', vaccine: 'COVID-19 (Covishield)', dose: '2' },
  { id: 'VAX-003', patientId: 'PAT-001', date: '2023-10-05', vaccine: 'Influenza (annual)',    dose: 'annual' },
  { id: 'VAX-004', patientId: 'PAT-003', date: '2018-12-20', vaccine: 'BCG',                    dose: 'birth' },
  { id: 'VAX-005', patientId: 'PAT-003', date: '2019-02-20', vaccine: 'Pentavalent',            dose: '1' },
  { id: 'VAX-006', patientId: 'PAT-003', date: '2019-04-20', vaccine: 'Pentavalent',            dose: '2' },
  { id: 'VAX-007', patientId: 'PAT-004', date: '2024-10-01', vaccine: 'Influenza (annual)',    dose: 'annual' },
  { id: 'VAX-008', patientId: 'PAT-004', date: '2023-08-14', vaccine: 'Pneumococcal',           dose: '1' }
];

const conditions = [
  { id: 'CON-001', patientId: 'PAT-001', condition: 'Seasonal allergic rhinitis', since: '2018', status: 'active' },
  { id: 'CON-002', patientId: 'PAT-002', condition: 'Pregnancy',                   since: '2025-12', status: 'active' },
  { id: 'CON-003', patientId: 'PAT-002', condition: 'Iron deficiency anaemia',     since: '2026-01', status: 'active' },
  { id: 'CON-004', patientId: 'PAT-004', condition: 'Type 2 diabetes',             since: '2012',   status: 'active' },
  { id: 'CON-005', patientId: 'PAT-004', condition: 'Hypertension',                since: '2014',   status: 'active' },
  { id: 'CON-006', patientId: 'PAT-004', condition: 'Stable angina',               since: '2025-11', status: 'active' },
  { id: 'CON-007', patientId: 'PAT-004', condition: 'Chronic kidney disease — stage 4', since: '2024', status: 'active' }
];

const otps = {};
const sessions = [];
const accessLog = [];

const now = () => new Date();
const findSession = (token) => sessions.find(s => s.token === token && !s.ended && s.expiresAt > Date.now());
const log = (patientId, event, meta = {}) => {
  accessLog.push({ id: accessLog.length + 1, patientId, event, meta, at: now() });
};

const sanitisePatient = (p) => ({
  id: p.id,
  mrn: p.mrn,
  abha: p.abha,
  name: p.name,
  dateOfBirth: p.dateOfBirth,
  sex: p.sex,
  phone: p.phone,
  email: p.email,
  allergies: p.allergies || [],
  activeMeds: p.activeMeds || []
});

const summariseRx = (rx) => ({
  id: rx.id,
  rxId: rx.rxId,
  status: rx.status,
  doctorId: rx.doctorId,
  diagnosis: rx.diagnosis,
  chiefComplaint: rx.chiefComplaint,
  issuedAt: rx.issuedAt,
  validTill: rx.validTill || null,
  lines: (rx.lines || []).map(l => ({
    brand: l.brand,
    generic: l.generic,
    strength: l.strength,
    unit: l.unit,
    frequency: l.frequency,
    durationDays: l.durationDays,
    instructions: l.instructions
  }))
});

exports.requestOtp = (req, res) => {
  const { patientId } = req.body || {};
  if (!patientId) return res.status(400).json({ error: 'patientId required' });
  const patient = findPatient(patientId);
  if (!patient) return res.status(404).json({ error: 'No patient on file with given details' });
  if (patient.deceased) return res.status(403).json({ error: 'Account inactive' });
  if (!patient.phone) return res.status(400).json({ error: 'No phone number on file; cannot send OTP' });

  otps[patient.id] = { code: '654321', expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 };
  log(patient.id, 'otp_requested', { phone: patient.phone });
  res.status(201).json({ message: 'OTP sent', maskedPhone: patient.phone.replace(/.(?=.{4})/g, '*') });
};

exports.login = (req, res) => {
  const { patientId, otp } = req.body || {};
  if (!patientId || !otp) return res.status(400).json({ error: 'patientId and otp required' });
  const patient = findPatient(patientId);
  if (!patient) return res.status(401).json({ error: 'Invalid credentials' });
  if (patient.deceased) return res.status(403).json({ error: 'Account inactive' });

  const entry = otps[patient.id];
  if (!entry) return res.status(401).json({ error: 'Request an OTP first' });
  if (entry.expiresAt < Date.now()) {
    delete otps[patient.id];
    return res.status(401).json({ error: 'OTP expired; request a new one' });
  }
  entry.attempts += 1;
  if (entry.attempts > 5) {
    delete otps[patient.id];
    return res.status(429).json({ error: 'Too many attempts; request a new OTP' });
  }
  if (entry.code !== otp) return res.status(401).json({ error: 'Invalid OTP', attempts: entry.attempts });

  delete otps[patient.id];
  const session = {
    token: `PSESS-${Date.now()}-${patient.id}`,
    patientId: patient.id,
    createdAt: now(),
    expiresAt: Date.now() + 30 * 60 * 1000,
    ended: false
  };
  sessions.push(session);
  log(patient.id, 'login');
  res.status(201).json({
    message: 'Logged in',
    session: { token: session.token, expiresAt: new Date(session.expiresAt) },
    patient: sanitisePatient(patient)
  });
};

exports.logout = (req, res) => {
  const session = findSession(req.body?.token);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.ended = true;
  session.endedAt = now();
  log(session.patientId, 'logout');
  res.json({ message: 'Logged out' });
};

const authorise = (req, res) => {
  const token = req.headers['x-patient-token'] || req.query.token || req.body?.token;
  const session = findSession(token);
  if (!session) {
    res.status(401).json({ error: 'Login required' });
    return null;
  }
  return session;
};

exports.getHistory = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const patient = findPatient(session.patientId);
  const { from, to } = req.query || {};
  const inRange = (d) => {
    if (from && new Date(d) < new Date(from)) return false;
    if (to   && new Date(d) > new Date(to))   return false;
    return true;
  };

  const patientVisits = visits.filter(v => v.patientId === patient.id && inRange(v.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const labs = labReports.filter(l => l.patientId === patient.id && inRange(l.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const vax = vaccinations.filter(v => v.patientId === patient.id && inRange(v.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const conds = conditions.filter(c => c.patientId === patient.id);
  const rx = getRxByPatient(patient.id).map(summariseRx);

  log(patient.id, 'history_viewed', { from: from || null, to: to || null });
  res.json({
    patient: sanitisePatient(patient),
    summary: {
      visits: patientVisits.length,
      prescriptions: rx.length,
      labReports: labs.length,
      vaccinations: vax.length,
      activeConditions: conds.filter(c => c.status === 'active').length
    },
    visits: patientVisits,
    prescriptions: rx,
    labReports: labs,
    vaccinations: vax,
    conditions: conds,
    allergies: patient.allergies || []
  });
};

exports.getVisits = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const patient = findPatient(session.patientId);
  const results = visits.filter(v => v.patientId === patient.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ visits: results, count: results.length });
};

exports.getVisitById = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const visit = visits.find(v => v.id === req.params.id);
  if (!visit) return res.status(404).json({ error: 'Visit not found' });
  if (visit.patientId !== session.patientId) return res.status(403).json({ error: 'Not your record' });
  res.json({ visit });
};

exports.getPrescriptions = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const results = getRxByPatient(session.patientId).map(summariseRx);
  res.json({ prescriptions: results, count: results.length });
};

exports.getLabReports = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const results = labReports.filter(l => l.patientId === session.patientId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ labReports: results, count: results.length });
};

exports.getVaccinations = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const results = vaccinations.filter(v => v.patientId === session.patientId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ vaccinations: results, count: results.length });
};

exports.getAllergies = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const patient = findPatient(session.patientId);
  res.json({ allergies: patient.allergies || [] });
};

exports.getConditions = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const results = conditions.filter(c => c.patientId === session.patientId);
  res.json({ conditions: results, count: results.length });
};

exports.getAccessLog = (req, res) => {
  const session = authorise(req, res);
  if (!session) return;
  const entries = accessLog.filter(a => a.patientId === session.patientId)
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json({ entries, count: entries.length });
};

exports._reset = () => {
  sessions.length = 0;
  accessLog.length = 0;
  Object.keys(otps).forEach(k => delete otps[k]);
};
