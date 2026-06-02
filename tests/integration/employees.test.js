const request = require('supertest');
const app = require('../../src/app');
const ctrl = require('../../src/controllers/employeeController');
const authCtrl = require('../../src/controllers/authController');

const loginAsAdmin = async () => {
  const res = await request(app)
    .post('/api/admin/auth/login')
    .send({ email: 'admin@shopease.com', password: 'admin@123' });
  return res.body.token;
};

const validEmployee = (overrides = {}) => ({
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@shopease.com',
  department: 'engineering',
  jobTitle: 'Software Engineer',
  ...overrides,
});

let token;
beforeEach(async () => {
  ctrl._reset();
  token = await loginAsAdmin();
});

describe('Employee creation (EMP-CREATE)', () => {
  test('EMP-01 creates an employee with valid data', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send(validEmployee());
    expect(res.status).toBe(201);
    expect(res.body.employee).toMatchObject({
      id: 1,
      employeeCode: 'EMP-00001',
      email: 'ada@shopease.com',
      employmentType: 'full_time',
      status: 'active',
    });
    expect(res.body.employee.createdAt).toBeDefined();
  });

  test('EMP-02 rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/employees').send(validEmployee());
    expect(res.status).toBe(401);
  });

  test('EMP-03 rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Ada' });
    expect(res.status).toBe(400);
  });

  test('EMP-04 rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send(validEmployee({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  test('EMP-05 rejects invalid department', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send(validEmployee({ department: 'astronaut' }));
    expect(res.status).toBe(400);
  });

  test('EMP-06 rejects duplicate email (case-insensitive)', async () => {
    await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`).send(validEmployee());
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send(validEmployee({ email: 'ADA@shopease.com' }));
    expect(res.status).toBe(409);
  });

  test('EMP-07 rejects negative salary', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send(validEmployee({ salary: -100 }));
    expect(res.status).toBe(400);
  });

  test('EMP-08 rejects unknown managerId', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send(validEmployee({ managerId: 999 }));
    expect(res.status).toBe(400);
  });

  test('EMP-09 links a valid managerId', async () => {
    await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`).send(validEmployee());
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send(validEmployee({ email: 'grace@shopease.com', managerId: 1 }));
    expect(res.status).toBe(201);
    expect(res.body.employee.managerId).toBe(1);
  });

  test('EMP-10 list and filter by department', async () => {
    await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`).send(validEmployee());
    await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`)
      .send(validEmployee({ email: 'sam@shopease.com', department: 'sales' }));
    const res = await request(app)
      .get('/api/employees?department=sales')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.employees[0].department).toBe('sales');
  });

  test('EMP-11 getById returns 404 for unknown employee', async () => {
    const res = await request(app).get('/api/employees/999').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

const createEmployee = (overrides = {}) =>
  request(app).post('/api/employees').set('Authorization', `Bearer ${token}`).send(validEmployee(overrides));

// Register and log in a user account whose email links to an employee record,
// returning the active login token.
const loginUser = async (email) => {
  await request(app).post('/api/auth/register').send({ name: 'Ada', email, password: 'pw' });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'pw' });
  return res.body.token;
};

describe('Employee termination (EMP-TERMINATE)', () => {
  test('EMP-12 terminates an active employee with audit fields', async () => {
    await createEmployee();
    const res = await request(app)
      .patch('/api/employees/1/terminate')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Role eliminated' });
    expect(res.status).toBe(200);
    expect(res.body.employee).toMatchObject({
      status: 'terminated',
      terminationReason: 'Role eliminated',
    });
    expect(res.body.employee.terminatedAt).toBeDefined();
  });

  test('EMP-13 defaults the termination reason when omitted', async () => {
    await createEmployee();
    const res = await request(app).patch('/api/employees/1/terminate').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.employee.terminationReason).toBe('No reason provided');
  });

  test('EMP-14 revokes the linked user login on termination', async () => {
    await createEmployee();
    const userToken = await loginUser('ada@shopease.com');
    expect(authCtrl.activeTokens.has(userToken)).toBe(true);

    const res = await request(app).patch('/api/employees/1/terminate').set('Authorization', `Bearer ${token}`);
    expect(res.body.loginRevoked).toBe(true);
    expect(authCtrl.activeTokens.has(userToken)).toBe(false);

    // The revoked token is rejected by user-protected routes.
    const after = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${userToken}`);
    expect(after.status).toBe(401);
  });

  test('EMP-15 reports loginRevoked false when no linked account exists', async () => {
    await createEmployee();
    const res = await request(app).patch('/api/employees/1/terminate').set('Authorization', `Bearer ${token}`);
    expect(res.body.loginRevoked).toBe(false);
  });

  test('EMP-16 rejects re-terminating an already terminated employee', async () => {
    await createEmployee();
    await request(app).patch('/api/employees/1/terminate').set('Authorization', `Bearer ${token}`);
    const res = await request(app).patch('/api/employees/1/terminate').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  test('EMP-17 returns 404 for unknown employee', async () => {
    const res = await request(app).patch('/api/employees/999/terminate').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('EMP-18 requires admin authentication', async () => {
    await createEmployee();
    const res = await request(app).patch('/api/employees/1/terminate');
    expect(res.status).toBe(401);
  });
});

describe('Employee status management (EMP-STATUS)', () => {
  test('EMP-19 updates status to on_leave', async () => {
    await createEmployee();
    const res = await request(app)
      .patch('/api/employees/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'on_leave', reason: 'Sabbatical' });
    expect(res.status).toBe(200);
    expect(res.body.employee).toMatchObject({ status: 'on_leave', statusReason: 'Sabbatical' });
    expect(res.body.loginRevoked).toBe(false);
  });

  test('EMP-20 revokes login when suspending an employee', async () => {
    await createEmployee();
    const userToken = await loginUser('ada@shopease.com');
    const res = await request(app)
      .patch('/api/employees/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'suspended' });
    expect(res.status).toBe(200);
    expect(res.body.loginRevoked).toBe(true);
    expect(authCtrl.activeTokens.has(userToken)).toBe(false);
  });

  test('EMP-21 rejects an invalid status', async () => {
    await createEmployee();
    const res = await request(app)
      .patch('/api/employees/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'vacationing' });
    expect(res.status).toBe(400);
  });

  test('EMP-22 rejects terminating via the status endpoint', async () => {
    await createEmployee();
    const res = await request(app)
      .patch('/api/employees/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'terminated' });
    expect(res.status).toBe(400);
  });

  test('EMP-23 rejects changing status of a terminated employee', async () => {
    await createEmployee();
    await request(app).patch('/api/employees/1/terminate').set('Authorization', `Bearer ${token}`);
    const res = await request(app)
      .patch('/api/employees/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });
    expect(res.status).toBe(409);
  });

  test('EMP-24 rejects a no-op status change', async () => {
    await createEmployee();
    const res = await request(app)
      .patch('/api/employees/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });
    expect(res.status).toBe(400);
  });

  test('EMP-25 reactivating a suspended employee does not revoke login', async () => {
    await createEmployee();
    await request(app).patch('/api/employees/1/status').set('Authorization', `Bearer ${token}`).send({ status: 'suspended' });
    const userToken = await loginUser('ada@shopease.com');
    const res = await request(app)
      .patch('/api/employees/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });
    expect(res.status).toBe(200);
    expect(authCtrl.activeTokens.has(userToken)).toBe(true);
  });
});
