const employees = [];

const DEPARTMENTS = ['engineering', 'sales', 'marketing', 'hr', 'finance', 'support', 'operations'];
const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'intern'];
const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;

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
