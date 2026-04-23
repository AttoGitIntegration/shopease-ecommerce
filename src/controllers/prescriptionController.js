const doctors = [
  { id: 'DOC-001', name: 'Dr. A. Rao',    speciality: 'General Medicine', registrationNo: 'MCI-11001', registrationActive: true, narcoticLicence: false, dscAttached: true,  role: 'prescriber', active: true  },
  { id: 'DOC-002', name: 'Dr. M. Shah',   speciality: 'Dermatology',       registrationNo: 'MCI-11002', registrationActive: true, narcoticLicence: false, dscAttached: false, role: 'prescriber', active: true  },
  { id: 'DOC-003', name: 'Dr. P. Iyer',   speciality: 'Cardiology',        registrationNo: 'MCI-11003', registrationActive: true, narcoticLicence: true,  dscAttached: true,  role: 'prescriber', active: true  },
  { id: 'DOC-004', name: 'Dr. S. Nair',   speciality: 'Paediatrics',       registrationNo: 'MCI-11004', registrationActive: false, narcoticLicence: false, dscAttached: false, role: 'prescriber', active: true  },
  { id: 'DOC-005', name: 'Nurse J. Pinto', speciality: 'Nursing',          registrationNo: 'NUR-22001', registrationActive: true, narcoticLicence: false, dscAttached: false, role: 'nurse',      active: true  },
  { id: 'DOC-006', name: 'Dr. R. Gomes',  speciality: 'General Medicine',  registrationNo: 'MCI-11006', registrationActive: true, narcoticLicence: false, dscAttached: true,  role: 'prescriber', active: false }
];

const patients = [
  { id: 'PAT-001', mrn: 'MRN1001', abha: 'ABHA-1001', name: 'Ramesh Sharma',  dateOfBirth: '1980-03-12', sex: 'M', phone: '+919999900011', email: 'ramesh@example.com', allergies: ['Penicillin'],      activeMeds: [],                 pregnant: false, nursing: false, weightKg: 72,  eGFR: 85,  liverDysfunction: false, deceased: false, teleConsent: true  },
  { id: 'PAT-002', mrn: 'MRN1002', abha: 'ABHA-1002', name: 'Priya Menon',    dateOfBirth: '1992-07-08', sex: 'F', phone: '+919999900012', email: 'priya@example.com',  allergies: ['Sulfa'],           activeMeds: ['Warfarin'],       pregnant: true,  nursing: false, weightKg: 58,  eGFR: 92,  liverDysfunction: false, deceased: false, teleConsent: true  },
  { id: 'PAT-003', mrn: 'MRN1003', abha: null,        name: 'Aarav Gupta',    dateOfBirth: '2018-11-20', sex: 'M', phone: '+919999900013', email: null,                 allergies: [],                   activeMeds: [],                 pregnant: false, nursing: false, weightKg: 15,  eGFR: 95,  liverDysfunction: false, deceased: false, teleConsent: false, guardian: null },
  { id: 'PAT-004', mrn: 'MRN1004', abha: 'ABHA-1004', name: 'Mohan Lal',      dateOfBirth: '1948-01-03', sex: 'M', phone: '+919999900014', email: 'mohan@example.com',  allergies: [],                   activeMeds: ['Atorvastatin'],   pregnant: false, nursing: false, weightKg: 68,  eGFR: 28,  liverDysfunction: true,  deceased: false, teleConsent: true  },
  { id: 'PAT-005', mrn: 'MRN1005', abha: null,        name: 'Divya Rao',      dateOfBirth: '1994-05-22', sex: 'F', phone: null,             email: null,                 allergies: [],                   activeMeds: [],                 pregnant: false, nursing: true,  weightKg: 62,  eGFR: 88,  liverDysfunction: false, deceased: false, teleConsent: true  }
];

const drugs = [
  { id: 'DRG-001', brand: 'Crocin',     generic: 'Paracetamol',   strengths: [500, 650],           unit: 'mg',  forms: ['tablet', 'syrup'], routes: ['oral'],            schedule: null,   maxDailyMg: 4000, classes: ['analgesic'],   discontinued: false, inStock: true,  renalAdjust: false, hepatotoxic: true,  pregnancyCategory: 'B' },
  { id: 'DRG-002', brand: 'Mox',        generic: 'Amoxicillin',   strengths: [250, 500],           unit: 'mg',  forms: ['capsule'],         routes: ['oral'],            schedule: null,   maxDailyMg: 3000, classes: ['antibiotic', 'penicillin'], discontinued: false, inStock: true, renalAdjust: true, hepatotoxic: false, pregnancyCategory: 'B' },
  { id: 'DRG-003', brand: 'Brufen',     generic: 'Ibuprofen',     strengths: [200, 400, 600],       unit: 'mg',  forms: ['tablet'],          routes: ['oral'],            schedule: null,   maxDailyMg: 2400, classes: ['nsaid'],       discontinued: false, inStock: true,  renalAdjust: true,  hepatotoxic: false, pregnancyCategory: 'C' },
  { id: 'DRG-004', brand: 'Atorva',     generic: 'Atorvastatin',  strengths: [10, 20, 40],          unit: 'mg',  forms: ['tablet'],          routes: ['oral'],            schedule: null,   maxDailyMg: 80,   classes: ['statin'],      discontinued: false, inStock: true,  renalAdjust: false, hepatotoxic: true,  pregnancyCategory: 'X' },
  { id: 'DRG-005', brand: 'Rosulip',    generic: 'Rosuvastatin',  strengths: [5, 10, 20],           unit: 'mg',  forms: ['tablet'],          routes: ['oral'],            schedule: null,   maxDailyMg: 40,   classes: ['statin'],      discontinued: false, inStock: true,  renalAdjust: true,  hepatotoxic: true,  pregnancyCategory: 'X' },
  { id: 'DRG-006', brand: 'Cipro',      generic: 'Ciprofloxacin', strengths: [250, 500],           unit: 'mg',  forms: ['tablet'],          routes: ['oral'],            schedule: 'H1',   maxDailyMg: 1500, classes: ['antibiotic', 'quinolone'], discontinued: false, inStock: true, renalAdjust: true, hepatotoxic: false, pregnancyCategory: 'C' },
  { id: 'DRG-007', brand: 'Tramadol',   generic: 'Tramadol',      strengths: [50, 100],            unit: 'mg',  forms: ['tablet'],          routes: ['oral'],            schedule: 'NDPS', maxDailyMg: 400,  classes: ['opioid'],      discontinued: false, inStock: true,  renalAdjust: true,  hepatotoxic: false, pregnancyCategory: 'C', narcoticMaxDays: 7 },
  { id: 'DRG-008', brand: 'Morcontin',  generic: 'Morphine',      strengths: [10, 30],             unit: 'mg',  forms: ['tablet'],          routes: ['oral'],            schedule: 'X',    maxDailyMg: 120,  classes: ['opioid'],      discontinued: false, inStock: true,  renalAdjust: true,  hepatotoxic: false, pregnancyCategory: 'C', narcoticMaxDays: 7 },
  { id: 'DRG-009', brand: 'Sporanox',   generic: 'Itraconazole',  strengths: [100],                unit: 'mg',  forms: ['capsule'],         routes: ['oral'],            schedule: null,   maxDailyMg: 400,  classes: ['antifungal'],  discontinued: true,  inStock: false, renalAdjust: false, hepatotoxic: true,  pregnancyCategory: 'C' },
  { id: 'DRG-010', brand: 'Softovac',   generic: 'Isotretinoin',  strengths: [10, 20],             unit: 'mg',  forms: ['capsule'],         routes: ['oral'],            schedule: null,   maxDailyMg: 80,   classes: ['retinoid'],    discontinued: false, inStock: true,  renalAdjust: false, hepatotoxic: true,  pregnancyCategory: 'X' },
  { id: 'DRG-011', brand: 'Aspirin',    generic: 'Aspirin',       strengths: [75, 150, 325],       unit: 'mg',  forms: ['tablet'],          routes: ['oral'],            schedule: null,   maxDailyMg: 4000, classes: ['nsaid', 'antiplatelet'], discontinued: false, inStock: true, renalAdjust: false, hepatotoxic: false, pregnancyCategory: 'D', paediatricBlocked: true },
  { id: 'DRG-012', brand: 'Septran',    generic: 'Cotrimoxazole', strengths: [480, 960],           unit: 'mg',  forms: ['tablet'],          routes: ['oral'],            schedule: null,   maxDailyMg: 1920, classes: ['antibiotic', 'sulfa'], discontinued: false, inStock: true, renalAdjust: true, hepatotoxic: true, pregnancyCategory: 'C' },
  { id: 'DRG-013', brand: 'Valium',     generic: 'Diazepam',      strengths: [2, 5, 10],           unit: 'mg',  forms: ['tablet'],          routes: ['oral'],            schedule: 'H1',   maxDailyMg: 40,   classes: ['benzodiazepine'], discontinued: false, inStock: true, renalAdjust: false, hepatotoxic: true, pregnancyCategory: 'D', beersListElderly: true },
  { id: 'DRG-014', brand: 'Prednisone', generic: 'Prednisone',    strengths: [5, 10, 20, 40],      unit: 'mg',  forms: ['tablet'],          routes: ['oral'],            schedule: null,   maxDailyMg: 80,   classes: ['steroid'],     discontinued: false, inStock: true,  renalAdjust: false, hepatotoxic: false, pregnancyCategory: 'C' },
  { id: 'DRG-015', brand: 'Warfarin',   generic: 'Warfarin',      strengths: [1, 2, 5],            unit: 'mg',  forms: ['tablet'],          routes: ['oral'],            schedule: null,   maxDailyMg: 15,   classes: ['anticoagulant'], discontinued: false, inStock: true, renalAdjust: false, hepatotoxic: true, pregnancyCategory: 'X' }
];

const VALID_FREQUENCIES = ['OD', 'BID', 'TID', 'QID', 'Q4H', 'Q6H', 'Q8H', 'Q12H', 'HS', 'SOS', 'PRN', 'STAT'];
const FREQUENCY_DOSES_PER_DAY = { OD: 1, BID: 2, TID: 3, QID: 4, Q4H: 6, Q6H: 4, Q8H: 3, Q12H: 2, HS: 1, SOS: 0, PRN: 0, STAT: 1 };
const INTERACTION_PAIRS = [
  { a: 'anticoagulant', b: 'nsaid',        severity: 'major',           message: 'Increased bleeding risk' },
  { a: 'anticoagulant', b: 'antiplatelet', severity: 'major',           message: 'Increased bleeding risk' },
  { a: 'statin',        b: 'statin',       severity: 'duplicate',       message: 'Duplicate therapy — same class' },
  { a: 'opioid',        b: 'benzodiazepine', severity: 'contraindicated', message: 'Respiratory depression — avoid combination' }
];

const sessions   = [];
const prescriptions = [];
const auditLog   = [];
const failedLogins = {};

const now = () => new Date();
const ageYears = (dob) => Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
const findDoctor  = (id) => doctors.find(d => d.id === id);
const findPatient = (id) => patients.find(p => p.id === id || p.mrn === id || p.abha === id);
const findDrug    = (id) => drugs.find(d => d.id === id);
const findSession = (token) => sessions.find(s => s.token === token && !s.ended);
const findPrescription = (id) => prescriptions.find(p => p.rxId === id || String(p.id) === String(id));
const audit = (rxId, actor, event, meta = {}) => {
  auditLog.push({ id: auditLog.length + 1, rxId, actor, event, meta, at: now() });
};

const checkSafety = (patient, drug, doseMg, durationDays, existingLines, overrideFlag) => {
  const alerts = [];
  const patientAge = ageYears(patient.dateOfBirth);

  (patient.allergies || []).forEach(a => {
    const term = String(a).toLowerCase();
    if (drug.generic.toLowerCase().includes(term) ||
        drug.brand.toLowerCase().includes(term) ||
        (drug.classes || []).some(c => c.toLowerCase() === term)) {
      alerts.push({ kind: 'allergy', severity: 'critical', message: `Patient is allergic to ${a}` });
    }
  });

  const activeClasses = new Set();
  (patient.activeMeds || []).forEach(m => {
    const d = drugs.find(x => x.generic.toLowerCase() === String(m).toLowerCase());
    if (d) (d.classes || []).forEach(c => activeClasses.add(c));
  });
  existingLines.forEach(l => {
    const d = findDrug(l.drugId);
    if (d) (d.classes || []).forEach(c => activeClasses.add(c));
  });
  (drug.classes || []).forEach(c => {
    INTERACTION_PAIRS.forEach(p => {
      const hit = (p.a === c && activeClasses.has(p.b)) || (p.b === c && activeClasses.has(p.a));
      if (hit) alerts.push({ kind: p.severity === 'duplicate' ? 'duplicate' : 'interaction', severity: p.severity, message: p.message });
    });
  });

  if (patient.pregnant && ['D', 'X'].includes(drug.pregnancyCategory)) {
    alerts.push({ kind: 'pregnancy', severity: 'critical', message: `Pregnancy category ${drug.pregnancyCategory}` });
  }
  if (patient.nursing && drug.pregnancyCategory === 'X') {
    alerts.push({ kind: 'lactation', severity: 'major', message: 'Unsafe in lactation — consider alternative' });
  }
  if (patientAge >= 65 && drug.beersListElderly) {
    alerts.push({ kind: 'geriatric', severity: 'moderate', message: 'Potentially inappropriate in elderly (Beers list)' });
  }
  if (patientAge < 12 && drug.paediatricBlocked) {
    alerts.push({ kind: 'paediatric', severity: 'critical', message: "Contraindicated in children (e.g., Reye's syndrome risk)" });
  }
  if (drug.renalAdjust && patient.eGFR !== undefined && patient.eGFR < 30) {
    alerts.push({ kind: 'renal', severity: 'major', message: 'Renal dose adjustment suggested (eGFR < 30)' });
  }
  if (drug.hepatotoxic && patient.liverDysfunction) {
    alerts.push({ kind: 'hepatic', severity: 'major', message: 'Hepatic dose adjustment suggested' });
  }

  const freq = existingLines.__freq;
  if (drug.maxDailyMg && doseMg && freq) {
    const perDay = FREQUENCY_DOSES_PER_DAY[freq] || 0;
    if (perDay && doseMg * perDay > drug.maxDailyMg) {
      alerts.push({ kind: 'maxDose', severity: 'major', message: `Exceeds max recommended daily dose of ${drug.maxDailyMg} ${drug.unit}` });
    }
  }

  const hardBlocked = alerts.some(a => ['critical', 'contraindicated'].includes(a.severity));
  const blocked = hardBlocked && !overrideFlag;
  return { alerts, blocked };
};

exports.login = (req, res) => {
  const { doctorId, password, otp, dscPin } = req.body || {};
  if (!doctorId || !password) return res.status(400).json({ error: 'doctorId and password required' });
  const doctor = findDoctor(doctorId);
  if (!doctor) return res.status(401).json({ error: 'Invalid credentials' });
  if (!doctor.active) return res.status(403).json({ error: 'Account is disabled' });

  failedLogins[doctorId] = failedLogins[doctorId] || { count: 0, lockedUntil: null };
  const fl = failedLogins[doctorId];
  if (fl.lockedUntil && fl.lockedUntil > Date.now()) {
    return res.status(423).json({ error: 'Account locked. Try after some time or reset password.' });
  }

  if (password !== 'secret') {
    fl.count += 1;
    if (fl.count >= 5) {
      fl.lockedUntil = Date.now() + 15 * 60 * 1000;
      return res.status(423).json({ error: 'Account locked after too many failed attempts' });
    }
    return res.status(401).json({ error: 'Invalid credentials', attempts: fl.count });
  }

  if (!otp)           return res.status(401).json({ error: '2FA OTP required' });
  if (otp === '000000') return res.status(401).json({ error: 'OTP expired; resend' });
  if (otp !== '123456') return res.status(401).json({ error: 'Invalid OTP' });

  if (!doctor.registrationActive) {
    return res.status(403).json({ error: 'Your registration is not active. Contact admin.' });
  }

  fl.count = 0;
  fl.lockedUntil = null;

  const session = {
    token: `SESS-${Date.now()}-${doctor.id}`,
    doctorId: doctor.id,
    role: doctor.role,
    dscUnlocked: Boolean(dscPin && doctor.dscAttached && dscPin === '1234'),
    createdAt: now(),
    ended: false
  };
  sessions.push(session);
  audit(null, doctor.id, 'login');
  res.status(201).json({ message: 'Logged in', session: { token: session.token, doctor: { id: doctor.id, name: doctor.name, role: doctor.role, speciality: doctor.speciality, dscAttached: doctor.dscAttached, dscUnlocked: session.dscUnlocked } } });
};

exports.logout = (req, res) => {
  const session = findSession(req.body?.token);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.ended = true;
  session.endedAt = now();
  audit(null, session.doctorId, 'logout');
  res.json({ message: 'Logged out' });
};

exports.getPatient = (req, res) => {
  const patient = findPatient(req.params.id);
  if (!patient) return res.status(404).json({ error: 'No patient found' });
  res.json({ patient });
};

exports.searchPatients = (req, res) => {
  const { q, mrn, abha } = req.query || {};
  let results = [...patients];
  if (mrn)  results = results.filter(p => p.mrn === mrn);
  if (abha) results = results.filter(p => p.abha === abha);
  if (q) {
    const term = String(q).toLowerCase();
    if (term.length < 2) return res.json({ results: [], count: 0 });
    results = results.filter(p => p.name.toLowerCase().includes(term) || p.mrn.toLowerCase().includes(term));
  }
  res.json({ results, count: results.length });
};

exports.searchDrugs = (req, res) => {
  const { q } = req.query || {};
  if (!q || q.length < 2) return res.json({ results: [], count: 0 });
  const term = String(q).toLowerCase();
  let results = drugs.filter(d =>
    d.brand.toLowerCase().includes(term) ||
    d.generic.toLowerCase().includes(term)
  );
  if (results.length === 0) {
    results = drugs.filter(d =>
      d.brand.toLowerCase().slice(0, term.length) === term.slice(0, Math.min(term.length, 3)) ||
      d.generic.toLowerCase().slice(0, term.length) === term.slice(0, Math.min(term.length, 3))
    );
  }
  res.json({ results: results.map(d => ({ id: d.id, brand: d.brand, generic: d.generic, strengths: d.strengths, unit: d.unit, forms: d.forms, schedule: d.schedule, discontinued: d.discontinued, inStock: d.inStock })), count: results.length });
};

exports.createDraft = (req, res) => {
  const { token, patientId, chiefComplaint, diagnosis, vitals } = req.body || {};
  const session = findSession(token);
  if (!session) return res.status(401).json({ error: 'Invalid or expired session' });
  if (session.role !== 'prescriber') return res.status(403).json({ error: 'Only prescribers can create prescriptions' });

  const patient = findPatient(patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient.deceased) return res.status(400).json({ error: 'Patient is deceased; new prescriptions blocked' });

  const patientAge = ageYears(patient.dateOfBirth);
  if (patientAge < 18 && !patient.guardian) {
    return res.status(400).json({ error: 'Guardian details required for minor patient' });
  }

  const rx = {
    id: prescriptions.length + 1,
    rxId: null,
    parentRxId: null,
    doctorId: session.doctorId,
    patientId: patient.id,
    chiefComplaint: chiefComplaint || null,
    diagnosis: diagnosis || null,
    vitals: vitals || null,
    lines: [],
    status: 'draft',
    refillsAllowed: 0,
    createdAt: now(),
    issuedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    supersededAt: null,
    dispensedLines: []
  };
  prescriptions.push(rx);
  audit(rx.id, session.doctorId, 'draft_created', { patientId: patient.id });
  res.status(201).json({ message: 'Draft created', prescription: rx });
};

exports.addLine = (req, res) => {
  const { token, drugId, strength, unit, route, frequency, durationDays, totalQuantity, instructions, foodTiming, override, overrideReason, indication, startDate } = req.body || {};
  const rx = findPrescription(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found' });
  if (rx.status !== 'draft') return res.status(400).json({ error: `Cannot edit prescription in ${rx.status} state` });

  const session = findSession(token);
  if (!session) return res.status(401).json({ error: 'Invalid or expired session' });
  if (session.doctorId !== rx.doctorId) return res.status(403).json({ error: 'Prescription belongs to another doctor' });

  const drug = findDrug(drugId);
  if (!drug) return res.status(404).json({ error: 'Drug not found' });
  if (typeof strength !== 'number' || strength <= 0) return res.status(400).json({ error: 'Strength is required and must be positive' });
  if (!drug.strengths.includes(strength)) return res.status(400).json({ error: `Strength ${strength} not available for ${drug.brand}` });
  if (!frequency) return res.status(400).json({ error: 'Frequency is required' });
  if (!VALID_FREQUENCIES.includes(frequency)) return res.status(400).json({ error: `Frequency must be one of ${VALID_FREQUENCIES.join(', ')}` });
  if (!['SOS', 'PRN'].includes(frequency) && (typeof durationDays !== 'number' || durationDays <= 0)) {
    return res.status(400).json({ error: 'Duration is required and must be positive' });
  }
  if (route && !drug.routes.includes(route)) return res.status(400).json({ error: `Route ${route} not applicable for ${drug.brand}` });
  if (instructions && String(instructions).length > 500) return res.status(400).json({ error: 'instructions too long (max 500 chars)' });

  const patient = findPatient(rx.patientId);
  const patientAge = ageYears(patient.dateOfBirth);
  if (patientAge < 12 && !patient.weightKg) return res.status(400).json({ error: 'Weight is required for paediatric dosing' });

  if (drug.schedule === 'H1' && !indication) {
    return res.status(400).json({ error: 'Indication (ICD-10) is required for Schedule H1 drugs' });
  }
  const doctor = findDoctor(session.doctorId);
  if (drug.schedule === 'NDPS' && !doctor.narcoticLicence) {
    return res.status(403).json({ error: 'Not authorised to prescribe narcotic drugs' });
  }
  if (['NDPS', 'X'].includes(drug.schedule) && drug.narcoticMaxDays && durationDays > drug.narcoticMaxDays) {
    return res.status(400).json({ error: `Duration for this controlled drug capped at ${drug.narcoticMaxDays} days` });
  }

  const duplicate = rx.lines.find(l => l.drugId === drug.id);
  if (duplicate && !override) {
    return res.status(409).json({ error: 'Already added in this Rx', requiresOverride: true });
  }

  const linesForSafety = [...rx.lines];
  linesForSafety.__freq = frequency;
  const { alerts, blocked } = checkSafety(patient, drug, strength, durationDays, linesForSafety, override);
  if (blocked) {
    return res.status(409).json({ error: 'Safety alerts must be overridden with reason', alerts, requiresOverride: true });
  }
  if (alerts.length > 0 && override && !overrideReason) {
    return res.status(400).json({ error: 'Override reason required when overriding alerts' });
  }

  const perDay = FREQUENCY_DOSES_PER_DAY[frequency] || 0;
  const autoQty = perDay > 0 && durationDays ? perDay * durationDays : null;
  const qty = typeof totalQuantity === 'number' && totalQuantity > 0 ? totalQuantity : autoQty;

  const line = {
    lineId: rx.lines.length + 1,
    drugId: drug.id,
    brand: drug.brand,
    generic: drug.generic,
    strength,
    unit: unit || drug.unit,
    route: route || drug.routes[0],
    frequency,
    durationDays: durationDays || null,
    totalQuantity: qty,
    instructions: instructions || null,
    foodTiming: foodTiming || null,
    indication: indication || null,
    startDate: startDate || null,
    alerts,
    overrideReason: alerts.length > 0 ? (overrideReason || null) : null,
    schedule: drug.schedule
  };
  rx.lines.push(line);
  audit(rx.id, session.doctorId, 'line_added', { drugId: drug.id, alerts: alerts.length, override: Boolean(override) });
  res.status(201).json({ message: 'Line added', line, prescription: rx });
};

exports.removeLine = (req, res) => {
  const rx = findPrescription(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found' });
  if (rx.status !== 'draft') return res.status(400).json({ error: `Cannot edit prescription in ${rx.status} state` });
  const lineId = parseInt(req.params.lineId);
  const idx = rx.lines.findIndex(l => l.lineId === lineId);
  if (idx === -1) return res.status(404).json({ error: 'Line not found' });
  const session = findSession(req.body?.token);
  if (!session || session.doctorId !== rx.doctorId) return res.status(401).json({ error: 'Invalid session' });
  rx.lines.splice(idx, 1);
  audit(rx.id, session.doctorId, 'line_removed', { lineId });
  res.json({ message: 'Line removed', prescription: rx });
};

exports.preview = (req, res) => {
  const rx = findPrescription(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found' });
  const doctor = findDoctor(rx.doctorId);
  const patient = findPatient(rx.patientId);
  res.json({
    rxId: rx.rxId,
    status: rx.status,
    header: { doctor: doctor ? { id: doctor.id, name: doctor.name, speciality: doctor.speciality, registrationNo: doctor.registrationNo } : null },
    patient: patient ? { id: patient.id, name: patient.name, mrn: patient.mrn, dateOfBirth: patient.dateOfBirth, allergies: patient.allergies } : null,
    diagnosis: rx.diagnosis,
    chiefComplaint: rx.chiefComplaint,
    vitals: rx.vitals,
    lines: rx.lines,
    issuedAt: rx.issuedAt
  });
};

exports.issue = (req, res) => {
  const { token, dscPin, confirmNoDiagnosis, idempotencyKey } = req.body || {};
  const rx = findPrescription(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found' });
  if (rx.status !== 'draft') return res.status(400).json({ error: `Cannot issue prescription in ${rx.status} state` });
  if (idempotencyKey && rx.issuedIdempotencyKey === idempotencyKey) {
    return res.status(200).json({ message: 'Already issued', prescription: rx });
  }

  const session = findSession(token);
  if (!session) return res.status(401).json({ error: 'Invalid or expired session' });
  if (session.doctorId !== rx.doctorId) return res.status(403).json({ error: 'Prescription belongs to another doctor' });

  const doctor = findDoctor(session.doctorId);
  if (!doctor.registrationActive) return res.status(403).json({ error: 'Doctor registration is not active' });
  if (rx.lines.length === 0) return res.status(400).json({ error: 'Add at least one medicine' });

  const hasControlled = rx.lines.some(l => ['H1', 'NDPS', 'X'].includes(l.schedule));
  if (hasControlled || doctor.dscAttached) {
    if (!doctor.dscAttached) return res.status(403).json({ error: 'DSC/HPR token required to sign & issue' });
    const unlocked = session.dscUnlocked || (dscPin && dscPin === '1234');
    if (!unlocked) return res.status(401).json({ error: 'Invalid DSC PIN' });
    session.dscUnlocked = true;
  }

  if (!rx.diagnosis && !confirmNoDiagnosis) {
    return res.status(400).json({ error: 'Diagnosis not recorded; confirm to proceed', requiresConfirmation: true });
  }

  rx.status = 'issued';
  rx.issuedAt = now();
  rx.rxId = `RX-${new Date().getFullYear()}-${String(rx.id).padStart(6, '0')}`;
  rx.issuedIdempotencyKey = idempotencyKey || null;
  rx.validTill = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  audit(rx.id, session.doctorId, 'issued', { rxId: rx.rxId });
  res.status(201).json({ message: 'Prescription issued', prescription: rx });
};

exports.deliver = (req, res) => {
  const rx = findPrescription(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found' });
  if (rx.status !== 'issued' && rx.status !== 'amended') return res.status(400).json({ error: 'Only issued prescriptions can be delivered' });

  const { channel, pharmacyId } = req.body || {};
  const patient = findPatient(rx.patientId);
  if (channel === 'sms') {
    if (!patient.phone) return res.status(400).json({ error: 'Patient mobile not on file' });
  } else if (channel === 'email') {
    if (!patient.email) return res.status(400).json({ error: 'Patient email not on file' });
  } else if (channel === 'pharmacy') {
    if (!pharmacyId) return res.status(400).json({ error: 'pharmacyId required' });
  } else if (!['print', 'pdf', 'abha', 'chat'].includes(channel)) {
    return res.status(400).json({ error: 'channel must be one of print, pdf, sms, email, pharmacy, abha, chat' });
  }

  rx.deliveries = rx.deliveries || [];
  const delivery = { channel, pharmacyId: pharmacyId || null, at: now(), status: 'sent' };
  rx.deliveries.push(delivery);
  audit(rx.id, rx.doctorId, 'delivered', { channel });
  res.json({ message: 'Delivered', delivery, rxId: rx.rxId });
};

exports.cancel = (req, res) => {
  const rx = findPrescription(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found' });
  const reason = req.body?.reason;
  if (!reason) return res.status(400).json({ error: 'reason required' });
  if (['cancelled', 'superseded'].includes(rx.status)) {
    return res.status(400).json({ error: `Cannot cancel prescription in ${rx.status} state` });
  }
  const totalLines = rx.lines.length;
  const dispensed = (rx.dispensedLines || []).length;
  if (dispensed === totalLines && totalLines > 0) {
    return res.status(400).json({ error: 'Cannot cancel fully dispensed prescription' });
  }
  rx.status = 'cancelled';
  rx.cancelledAt = now();
  rx.cancellationReason = reason;
  audit(rx.id, rx.doctorId, 'cancelled', { reason, partiallyDispensed: dispensed > 0 });
  res.json({ message: 'Prescription cancelled', prescription: rx, partiallyDispensed: dispensed > 0 });
};

exports.amend = (req, res) => {
  const { token } = req.body || {};
  const original = findPrescription(req.params.id);
  if (!original) return res.status(404).json({ error: 'Prescription not found' });
  if (original.status !== 'issued') return res.status(400).json({ error: `Cannot amend prescription in ${original.status} state` });
  const session = findSession(token);
  if (!session || session.doctorId !== original.doctorId) return res.status(401).json({ error: 'Invalid session' });

  original.status = 'superseded';
  original.supersededAt = now();

  const copy = {
    id: prescriptions.length + 1,
    rxId: null,
    parentRxId: original.rxId,
    doctorId: original.doctorId,
    patientId: original.patientId,
    chiefComplaint: original.chiefComplaint,
    diagnosis: original.diagnosis,
    vitals: original.vitals,
    lines: original.lines.map(l => ({ ...l })),
    status: 'draft',
    refillsAllowed: 0,
    createdAt: now(),
    issuedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    supersededAt: null,
    dispensedLines: []
  };
  prescriptions.push(copy);
  audit(copy.id, session.doctorId, 'amended_from', { parent: original.rxId });
  res.status(201).json({ message: 'Amendment draft created', prescription: copy });
};

exports.refill = (req, res) => {
  const { token } = req.body || {};
  const original = findPrescription(req.params.id);
  if (!original) return res.status(404).json({ error: 'Prescription not found' });
  if (original.status === 'cancelled') return res.status(400).json({ error: 'Cannot refill cancelled prescription' });
  if (original.refillsAllowed !== undefined && original.refillsAllowed <= 0) {
    return res.status(400).json({ error: 'No refills remaining' });
  }
  if (original.lines.some(l => ['NDPS', 'X'].includes(l.schedule))) {
    return res.status(400).json({ error: 'Controlled drugs cannot be refilled; fresh Rx required' });
  }
  const session = findSession(token);
  if (!session || session.doctorId !== original.doctorId) return res.status(401).json({ error: 'Invalid session' });

  const copy = {
    id: prescriptions.length + 1,
    rxId: null,
    parentRxId: original.rxId,
    doctorId: original.doctorId,
    patientId: original.patientId,
    chiefComplaint: original.chiefComplaint,
    diagnosis: original.diagnosis,
    vitals: original.vitals,
    lines: original.lines.map(l => ({ ...l })),
    status: 'draft',
    refillsAllowed: Math.max(0, (original.refillsAllowed || 0) - 1),
    createdAt: now(),
    issuedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    supersededAt: null,
    dispensedLines: []
  };
  prescriptions.push(copy);
  audit(copy.id, session.doctorId, 'refill_from', { parent: original.rxId });
  res.status(201).json({ message: 'Refill draft created', prescription: copy });
};

exports.list = (req, res) => {
  const { patientId, doctorId, status, from, to } = req.query || {};
  let results = [...prescriptions];
  if (patientId) results = results.filter(r => r.patientId === patientId || findPatient(patientId)?.id === r.patientId);
  if (doctorId)  results = results.filter(r => r.doctorId === doctorId);
  if (status)    results = results.filter(r => r.status === status);
  if (from)      results = results.filter(r => new Date(r.createdAt) >= new Date(from));
  if (to)        results = results.filter(r => new Date(r.createdAt) <= new Date(to));
  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ prescriptions: results, count: results.length });
};

exports.getById = (req, res) => {
  const rx = findPrescription(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found' });
  res.json({ prescription: rx });
};

exports.auditLog = (req, res) => {
  const rx = findPrescription(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found' });
  const entries = auditLog.filter(a => a.rxId === rx.id);
  res.json({ rxId: rx.rxId, entries });
};

exports.verify = (req, res) => {
  const rx = findPrescription(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found' });
  res.json({
    rxId: rx.rxId,
    status: rx.status,
    issuedAt: rx.issuedAt,
    validTill: rx.validTill || null,
    tamperValid: rx.status === 'issued' || rx.status === 'amended'
  });
};

exports._reset = () => {
  prescriptions.length = 0;
  sessions.length = 0;
  auditLog.length = 0;
  Object.keys(failedLogins).forEach(k => delete failedLogins[k]);
};
