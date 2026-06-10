const request = require('supertest');
const app = require('../../src/app');
const ctrl = require('../../src/controllers/employeeController');

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
