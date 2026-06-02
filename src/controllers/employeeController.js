const { revokeLoginByEmail } = require('./authController');

const employees = [];

const DEPARTMENTS = ['engineering', 'sales', 'marketing', 'hr', 'finance', 'support', 'operations'];
const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'intern'];
const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;

// Employment lifecycle. `terminated` is terminal — once set, status cannot change.
const EMPLOYMENT_STATUSES = ['active', 'on_leave', 'suspended', 'terminated'];
const TERMINAL_STATUS = 'terminated';
// Statuses in which the employee must not retain access; entering one revokes
// any active login for the linked account.
const LOGIN_REVOKED_STATUSES = ['suspended', 'terminated'];

exports.employees = employees;
exports._reset = () => { employees.length = 0; };

const validate = (body) => {
  const { firstName, lastName, email, department, jobTitle, employmentType, salary } = body;
  if (!firstName || !lastName) return 'firstName and lastName required';
  if (!email || !EMAIL_RE.test(email)) return 'Valid email required';
  if (!department || !DEPARTMENTS.includes(department))
    return `department must be one of ${DEPARTMENTS.join(', ')}`;
  if (!jobTitle) return 'jobTitle required';
  if (employmentType && !EMPLOYMENT_TYPES.includes(employmentType))
    return `employmentType must be one of ${EMPLOYMENT_TYPES.join(', ')}`;
  if (salary !== undefined) {
    const s = Number(salary);
    if (!Number.isFinite(s) || s < 0) return 'salary must be a non-negative number';
  }
  return null;
};

exports.create = (req, res) => {
  const error = validate(req.body);
  if (error) return res.status(400).json({ error });

  const email = String(req.body.email).toLowerCase();
  if (employees.find(e => e.email === email))
    return res.status(409).json({ error: 'Email already in use' });

  const { firstName, lastName, department, jobTitle, employmentType = 'full_time', salary, managerId } = req.body;

  if (managerId !== undefined && !employees.find(e => e.id === parseInt(managerId)))
    return res.status(400).json({ error: 'managerId does not reference an existing employee' });

  const employee = {
    id: employees.length + 1,
    employeeCode: `EMP-${String(employees.length + 1).padStart(5, '0')}`,
    firstName,
    lastName,
    email,
    department,
    jobTitle,
    employmentType,
    salary: salary !== undefined ? Number(salary) : null,
    managerId: managerId !== undefined ? parseInt(managerId) : null,
    status: 'active',
    createdBy: req.adminId || null,
    createdAt: new Date().toISOString(),
  };
  employees.push(employee);

  res.status(201).json({ message: 'Employee created', employee });
};

exports.list = (req, res) => {
  const { department, employmentType, status } = req.query;
  let results = [...employees];
  if (department)     results = results.filter(e => e.department === department);
  if (employmentType) results = results.filter(e => e.employmentType === employmentType);
  if (status)         results = results.filter(e => e.status === status);
  res.json({ employees: results, count: results.length });
};

exports.getById = (req, res) => {
  const employee = employees.find(e => e.id === parseInt(req.params.id));
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  res.json(employee);
};

/** Apply a status change to an employee, recording audit fields and revoking
 *  the linked login when the new status is one that should remove access. */
const applyStatus = (employee, status, reason, adminId) => {
  employee.status = status;
  employee.statusReason = reason || null;
  employee.statusUpdatedAt = new Date().toISOString();
  employee.statusUpdatedBy = adminId || null;

  let loginRevoked = false;
  if (LOGIN_REVOKED_STATUSES.includes(status)) {
    loginRevoked = revokeLoginByEmail(employee.email) > 0;
  }
  return loginRevoked;
};

// PATCH /api/employees/:id/terminate — terminate an employee and revoke login.
exports.terminate = (req, res) => {
  const employee = employees.find(e => e.id === parseInt(req.params.id));
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  if (employee.status === TERMINAL_STATUS)
    return res.status(409).json({ error: 'Employee already terminated' });

  const reason = req.body?.reason || 'No reason provided';
  const loginRevoked = applyStatus(employee, TERMINAL_STATUS, reason, req.adminId);
  // Preserve the canonical termination audit fields used by reporting.
  employee.terminatedAt = employee.statusUpdatedAt;
  employee.terminatedBy = req.adminId || null;
  employee.terminationReason = reason;

  res.json({ message: 'Employee terminated', loginRevoked, employee });
};

// PATCH /api/employees/:id/status — manage employment status (non-terminal).
exports.updateStatus = (req, res) => {
  const employee = employees.find(e => e.id === parseInt(req.params.id));
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const { status, reason } = req.body || {};
  if (!status || !EMPLOYMENT_STATUSES.includes(status))
    return res.status(400).json({ error: `status must be one of ${EMPLOYMENT_STATUSES.join(', ')}` });
  if (status === TERMINAL_STATUS)
    return res.status(400).json({ error: 'Use the terminate endpoint to terminate an employee' });
  if (employee.status === TERMINAL_STATUS)
    return res.status(409).json({ error: 'Cannot change status of a terminated employee' });
  if (employee.status === status)
    return res.status(400).json({ error: `Employee already ${status}` });

  const loginRevoked = applyStatus(employee, status, reason, req.adminId);
  res.json({ message: 'Employee status updated', loginRevoked, employee });
};
