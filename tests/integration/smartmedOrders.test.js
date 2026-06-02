const request = require('supertest');
const app = require('../../src/app');
const ctrl = require('../../src/controllers/smartmedOrderController');

const PHONE = '9999900001';
const PHONE_BLOCKED = '9999900003';

const requestOtpFor = (phone) => request(app).post('/api/smartmed/auth/otp').send({ phone });
const loginAs = async (phone = PHONE) => {
  await requestOtpFor(phone);
  const res = await request(app).post('/api/smartmed/auth/login').send({ phone, otp: '123456' });
  return res.body.session.token;
};
const auth = (req, token) => req.set('x-user-token', token);

beforeEach(() => ctrl._reset());

describe('SmartMed — medicine catalog (SM-CAT)', () => {
  test('SM-CAT-01 list medicines (anonymous)', async () => {
    const res = await request(app).get('/api/smartmed/medicines');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.medicines[0]).toHaveProperty('rxRequired');
  });

  test('SM-CAT-02 search by composition', async () => {
    const res = await request(app).get('/api/smartmed/medicines?q=paracetamol');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
  });

  test('SM-CAT-03 filter Rx-required only', async () => {
    const res = await request(app).get('/api/smartmed/medicines?rxRequired=true');
    expect(res.status).toBe(200);
    expect(res.body.medicines.every(m => m.rxRequired)).toBe(true);
  });

  test('SM-CAT-04 filter in-stock excludes out-of-stock items', async () => {
    const res = await request(app).get('/api/smartmed/medicines?inStock=true');
    expect(res.body.medicines.every(m => m.stock > 0)).toBe(true);
  });

  test('SM-CAT-05 medicine not found returns 404', async () => {
    const res = await request(app).get('/api/smartmed/medicines/MED-NOPE');
    expect(res.status).toBe(404);
  });
});

describe('SmartMed — authentication (SM-AUTH)', () => {
  test('SM-AUTH-01 OTP request — happy path', async () => {
    const res = await requestOtpFor(PHONE);
    expect(res.status).toBe(201);
    expect(res.body.maskedPhone).toMatch(/\*+0001$/);
  });

  test('SM-AUTH-02 OTP request — unknown phone', async () => {
    const res = await requestOtpFor('9000000000');
    expect(res.status).toBe(404);
  });

  test('SM-AUTH-03 OTP request — blocked account', async () => {
    const res = await requestOtpFor(PHONE_BLOCKED);
    expect(res.status).toBe(403);
  });

  test('SM-AUTH-04 login with wrong OTP', async () => {
    await requestOtpFor(PHONE);
    const res = await request(app).post('/api/smartmed/auth/login').send({ phone: PHONE, otp: '000000' });
    expect(res.status).toBe(401);
  });

  test('SM-AUTH-05 login without prior OTP', async () => {
    const res = await request(app).post('/api/smartmed/auth/login').send({ phone: PHONE, otp: '123456' });
    expect(res.status).toBe(401);
  });

  test('SM-AUTH-06 login — happy path returns session token', async () => {
    const token = await loginAs();
    expect(typeof token).toBe('string');
    expect(token).toMatch(/^SMSESS-/);
  });

  test('SM-AUTH-07 protected route requires login', async () => {
    const res = await request(app).get('/api/smartmed/cart');
    expect(res.status).toBe(401);
  });

  test('SM-AUTH-08 logout invalidates session', async () => {
    const token = await loginAs();
    const out = await auth(request(app).post('/api/smartmed/auth/logout'), token).send({});
    expect(out.status).toBe(200);
    const next = await auth(request(app).get('/api/smartmed/cart'), token);
    expect(next.status).toBe(401);
  });
});

describe('SmartMed — cart management (SM-CART)', () => {
  test('SM-CART-01 add OTC medicine to cart', async () => {
    const token = await loginAs();
    const res = await auth(request(app).post('/api/smartmed/cart/items'), token)
      .send({ medicineId: 'MED-001', quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.cart.items[0].quantity).toBe(2);
    expect(res.body.cart.subtotal).toBe(70);
  });

  test('SM-CART-02 add Rx medicine flags requiresRx', async () => {
    const token = await loginAs();
    const res = await auth(request(app).post('/api/smartmed/cart/items'), token)
      .send({ medicineId: 'MED-003', quantity: 1 });
    expect(res.body.cart.requiresRx).toBe(true);
  });

  test('SM-CART-03 add duplicate medicine merges quantity', async () => {
    const token = await loginAs();
    await auth(request(app).post('/api/smartmed/cart/items'), token).send({ medicineId: 'MED-001', quantity: 2 });
    const res = await auth(request(app).post('/api/smartmed/cart/items'), token).send({ medicineId: 'MED-001', quantity: 3 });
    expect(res.body.cart.items.length).toBe(1);
    expect(res.body.cart.items[0].quantity).toBe(5);
  });

  test('SM-CART-04 add out-of-stock medicine', async () => {
    const token = await loginAs();
    const res = await auth(request(app).post('/api/smartmed/cart/items'), token)
      .send({ medicineId: 'MED-007', quantity: 1 });
    expect(res.status).toBe(409);
  });

  test('SM-CART-05 add over-stock quantity', async () => {
    const token = await loginAs();
    const res = await auth(request(app).post('/api/smartmed/cart/items'), token)
      .send({ medicineId: 'MED-005', quantity: 26 });
    expect(res.status).toBe(409);
  });

  test('SM-CART-06 add invalid quantity rejected', async () => {
    const token = await loginAs();
    const res = await auth(request(app).post('/api/smartmed/cart/items'), token)
      .send({ medicineId: 'MED-001', quantity: 0 });
    expect(res.status).toBe(400);
  });

  test('SM-CART-07 update item quantity', async () => {
    const token = await loginAs();
    await auth(request(app).post('/api/smartmed/cart/items'), token).send({ medicineId: 'MED-001', quantity: 1 });
    const res = await auth(request(app).put('/api/smartmed/cart/items/MED-001'), token).send({ quantity: 4 });
    expect(res.body.cart.items[0].quantity).toBe(4);
  });

  test('SM-CART-08 update quantity to zero removes line', async () => {
    const token = await loginAs();
    await auth(request(app).post('/api/smartmed/cart/items'), token).send({ medicineId: 'MED-001', quantity: 1 });
    const res = await auth(request(app).put('/api/smartmed/cart/items/MED-001'), token).send({ quantity: 0 });
    expect(res.body.cart.items.length).toBe(0);
  });

  test('SM-CART-09 remove cart item', async () => {
    const token = await loginAs();
    await auth(request(app).post('/api/smartmed/cart/items'), token).send({ medicineId: 'MED-001', quantity: 1 });
    const res = await auth(request(app).delete('/api/smartmed/cart/items/MED-001'), token);
    expect(res.body.cart.items.length).toBe(0);
  });

  test('SM-CART-10 carts are isolated per user', async () => {
    const t1 = await loginAs(PHONE);
    const t2 = await loginAs('9999900002');
    await auth(request(app).post('/api/smartmed/cart/items'), t1).send({ medicineId: 'MED-001', quantity: 1 });
    const cart2 = await auth(request(app).get('/api/smartmed/cart'), t2);
    expect(cart2.body.cart.items.length).toBe(0);
  });
});

describe('SmartMed — addresses (SM-ADDR)', () => {
  test('SM-ADDR-01 list seeded addresses', async () => {
    const token = await loginAs();
    const res = await auth(request(app).get('/api/smartmed/addresses'), token);
    expect(res.status).toBe(200);
    expect(res.body.addresses.find(a => a.isDefault)).toBeTruthy();
  });

  test('SM-ADDR-02 add new address', async () => {
    const token = await loginAs();
    const res = await auth(request(app).post('/api/smartmed/addresses'), token).send({
      label: 'Parents', line1: '5 Marine Drive', city: 'Mumbai', pincode: '400001', phone: '9876543210'
    });
    expect(res.status).toBe(201);
    expect(res.body.address.id).toMatch(/^ADDR-/);
  });

  test('SM-ADDR-03 invalid pincode rejected', async () => {
    const token = await loginAs();
    const res = await auth(request(app).post('/api/smartmed/addresses'), token).send({
      line1: 'X', city: 'Y', pincode: '12', phone: '9876543210'
    });
    expect(res.status).toBe(400);
  });
});

describe('SmartMed — prescription upload (SM-RX)', () => {
  test('SM-RX-01 upload valid PDF', async () => {
    const token = await loginAs();
    const res = await auth(request(app).post('/api/smartmed/prescriptions'), token).send({
      filename: 'rx.pdf', mimeType: 'application/pdf', sizeBytes: 200000
    });
    expect(res.status).toBe(201);
    expect(res.body.prescription.status).toBe('pending_verification');
  });

  test('SM-RX-02 reject unsupported file type', async () => {
    const token = await loginAs();
    const res = await auth(request(app).post('/api/smartmed/prescriptions'), token).send({
      filename: 'rx.exe', mimeType: 'application/x-msdownload', sizeBytes: 1000
    });
    expect(res.status).toBe(415);
  });

  test('SM-RX-03 reject oversized file', async () => {
    const token = await loginAs();
    const res = await auth(request(app).post('/api/smartmed/prescriptions'), token).send({
      filename: 'huge.pdf', mimeType: 'application/pdf', sizeBytes: 10 * 1024 * 1024
    });
    expect(res.status).toBe(413);
  });

  test('SM-RX-04 another user cannot read my prescription', async () => {
    const t1 = await loginAs(PHONE);
    const up = await auth(request(app).post('/api/smartmed/prescriptions'), t1)
      .send({ filename: 'rx.pdf', mimeType: 'application/pdf', sizeBytes: 1000 });
    const rxId = up.body.prescription.id;
    const t2 = await loginAs('9999900002');
    const res = await auth(request(app).get(`/api/smartmed/prescriptions/${rxId}`), t2);
    expect(res.status).toBe(404);
  });
});

describe('SmartMed — placing orders (SM-ORD)', () => {
  const seedCart = async (token, items = [{ medicineId: 'MED-001', quantity: 2 }]) => {
    for (const i of items) {
      await auth(request(app).post('/api/smartmed/cart/items'), token).send(i);
    }
  };
  const uploadRx = async (token) => {
    const up = await auth(request(app).post('/api/smartmed/prescriptions'), token)
      .send({ filename: 'rx.pdf', mimeType: 'application/pdf', sizeBytes: 1000 });
    return up.body.prescription.id;
  };

  test('SM-ORD-01 happy path — OTC + UPI', async () => {
    const token = await loginAs();
    await seedCart(token);
    const res = await auth(request(app).post('/api/smartmed/orders'), token).send({
      addressId: 'ADDR-001', slot: 'standard', paymentMethod: 'upi'
    });
    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('verified');
    expect(res.body.order.total).toBeGreaterThan(0);
  });

  test('SM-ORD-02 empty cart blocks placement', async () => {
    const token = await loginAs();
    const res = await auth(request(app).post('/api/smartmed/orders'), token).send({
      addressId: 'ADDR-001', paymentMethod: 'upi'
    });
    expect(res.status).toBe(400);
  });

  test('SM-ORD-03 Rx item without prescription blocked', async () => {
    const token = await loginAs();
    await seedCart(token, [{ medicineId: 'MED-003', quantity: 1 }]);
    const res = await auth(request(app).post('/api/smartmed/orders'), token).send({
      addressId: 'ADDR-001', paymentMethod: 'upi'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/prescription/i);
  });

  test('SM-ORD-04 Rx item with prescription — awaiting verification', async () => {
    const token = await loginAs();
    await seedCart(token, [{ medicineId: 'MED-003', quantity: 1 }]);
    const rxId = await uploadRx(token);
    const res = await auth(request(app).post('/api/smartmed/orders'), token).send({
      addressId: 'ADDR-001', paymentMethod: 'upi', prescriptionId: rxId
    });
    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('awaiting_verification');
  });

  test('SM-ORD-05 COD blocked for Schedule H1 (Alprazolam)', async () => {
    const token = await loginAs();
    await seedCart(token, [{ medicineId: 'MED-006', quantity: 1 }]);
    const rxId = await uploadRx(token);
    const res = await auth(request(app).post('/api/smartmed/orders'), token).send({
      addressId: 'ADDR-001', paymentMethod: 'cod', prescriptionId: rxId
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/COD/i);
  });

  test('SM-ORD-06 unserviceable pincode rejected', async () => {
    const token = await loginAs();
    await seedCart(token);
    const add = await auth(request(app).post('/api/smartmed/addresses'), token).send({
      line1: 'Remote', city: 'Nowhere', pincode: '999999', phone: '9876543210'
    });
    const res = await auth(request(app).post('/api/smartmed/orders'), token).send({
      addressId: add.body.address.id, paymentMethod: 'upi'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not serviceable/i);
  });

  test('SM-ORD-07 idempotency key — duplicate place returns same order', async () => {
    const token = await loginAs();
    await seedCart(token);
    const key = 'idem-xyz-1';
    const a = await auth(request(app).post('/api/smartmed/orders'), token).send({
      addressId: 'ADDR-001', paymentMethod: 'upi', idempotencyKey: key
    });
    await seedCart(token);
    const b = await auth(request(app).post('/api/smartmed/orders'), token).send({
      addressId: 'ADDR-001', paymentMethod: 'upi', idempotencyKey: key
    });
    expect(b.status).toBe(200);
    expect(b.body.order.id).toBe(a.body.order.id);
  });

  test('SM-ORD-08 cold-chain medicine has higher delivery fee', async () => {
    const token = await loginAs();
    await seedCart(token, [{ medicineId: 'MED-005', quantity: 1 }]);
    const rxId = await uploadRx(token);
    const res = await auth(request(app).post('/api/smartmed/orders'), token).send({
      addressId: 'ADDR-001', paymentMethod: 'upi', prescriptionId: rxId
    });
    expect(res.body.order.coldChain).toBe(true);
    expect(res.body.order.deliveryFee).toBe(100);
  });

  test('SM-ORD-09 stock is decremented after place', async () => {
    const token = await loginAs();
    const before = (await request(app).get('/api/smartmed/medicines/MED-001')).body.medicine.stock;
    await seedCart(token, [{ medicineId: 'MED-001', quantity: 3 }]);
    await auth(request(app).post('/api/smartmed/orders'), token).send({
      addressId: 'ADDR-001', paymentMethod: 'upi'
    });
    const after = (await request(app).get('/api/smartmed/medicines/MED-001')).body.medicine.stock;
    expect(after).toBe(before - 3);
  });
});

describe('SmartMed — order lifecycle (SM-TRK / SM-CXL)', () => {
  const placedOrder = async () => {
    const token = await loginAs();
    await auth(request(app).post('/api/smartmed/cart/items'), token).send({ medicineId: 'MED-001', quantity: 1 });
    const res = await auth(request(app).post('/api/smartmed/orders'), token).send({
      addressId: 'ADDR-001', paymentMethod: 'upi'
    });
    return { token, orderId: res.body.order.id };
  };

  test('SM-TRK-01 list orders for user', async () => {
    const { token } = await placedOrder();
    const res = await auth(request(app).get('/api/smartmed/orders'), token);
    expect(res.body.count).toBe(1);
  });

  test('SM-TRK-02 advance order through status flow', async () => {
    const { token, orderId } = await placedOrder();
    let res = await auth(request(app).post(`/api/smartmed/orders/${orderId}/advance`), token);
    expect(res.body.order.status).toBe('packed');
    res = await auth(request(app).post(`/api/smartmed/orders/${orderId}/advance`), token);
    expect(res.body.order.status).toBe('out_for_delivery');
    res = await auth(request(app).post(`/api/smartmed/orders/${orderId}/advance`), token);
    expect(res.body.order.status).toBe('delivered');
  });

  test('SM-CXL-01 cancel before pack succeeds and restores stock', async () => {
    const { token, orderId } = await placedOrder();
    const stockBefore = (await request(app).get('/api/smartmed/medicines/MED-001')).body.medicine.stock;
    const res = await auth(request(app).put(`/api/smartmed/orders/${orderId}/cancel`), token).send({ reason: 'changed mind' });
    expect(res.body.order.status).toBe('cancelled');
    const stockAfter = (await request(app).get('/api/smartmed/medicines/MED-001')).body.medicine.stock;
    expect(stockAfter).toBe(stockBefore + 1);
  });

  test('SM-CXL-02 cancel without reason rejected', async () => {
    const { token, orderId } = await placedOrder();
    const res = await auth(request(app).put(`/api/smartmed/orders/${orderId}/cancel`), token).send({});
    expect(res.status).toBe(400);
  });

  test('SM-CXL-03 cannot cancel once packed', async () => {
    const { token, orderId } = await placedOrder();
    await auth(request(app).post(`/api/smartmed/orders/${orderId}/advance`), token);
    const res = await auth(request(app).put(`/api/smartmed/orders/${orderId}/cancel`), token).send({ reason: 'no' });
    expect(res.status).toBe(400);
  });

  test('SM-CXL-04 cannot view another user\'s order', async () => {
    const { orderId } = await placedOrder();
    const t2 = await loginAs('9999900002');
    const res = await auth(request(app).get(`/api/smartmed/orders/${orderId}`), t2);
    expect(res.status).toBe(404);
  });

  test('SM-RET-01 return blocked for Schedule H medicines', async () => {
    const token = await loginAs();
    await auth(request(app).post('/api/smartmed/cart/items'), token).send({ medicineId: 'MED-003', quantity: 1 });
    const rxUp = await auth(request(app).post('/api/smartmed/prescriptions'), token)
      .send({ filename: 'r.pdf', mimeType: 'application/pdf', sizeBytes: 1000 });
    const place = await auth(request(app).post('/api/smartmed/orders'), token).send({
      addressId: 'ADDR-001', paymentMethod: 'upi', prescriptionId: rxUp.body.prescription.id
    });
    const id = place.body.order.id;
    for (let i = 0; i < 4; i++) await auth(request(app).post(`/api/smartmed/orders/${id}/advance`), token);
    const ret = await auth(request(app).put(`/api/smartmed/orders/${id}/return`), token).send({ reason: 'damaged' });
    expect(ret.status).toBe(400);
    expect(ret.body.error).toMatch(/non-returnable/i);
  });

  test('SM-RET-02 return allowed for OTC within window', async () => {
    const { token, orderId } = await placedOrder();
    for (let i = 0; i < 3; i++) await auth(request(app).post(`/api/smartmed/orders/${orderId}/advance`), token);
    const res = await auth(request(app).put(`/api/smartmed/orders/${orderId}/return`), token).send({ reason: 'damaged' });
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('returned');
    expect(res.body.order.refundTransactionId).toMatch(/^RFND-/);
  });
});

describe('SmartMed — subscriptions (SM-SUB)', () => {
  test('SM-SUB-01 create subscription', async () => {
    const token = await loginAs();
    const res = await auth(request(app).post('/api/smartmed/subscriptions'), token).send({
      medicineId: 'MED-001', quantity: 1, frequencyDays: 30, addressId: 'ADDR-001'
    });
    expect(res.status).toBe(201);
    expect(res.body.subscription.active).toBe(true);
  });

  test('SM-SUB-02 invalid frequency rejected', async () => {
    const token = await loginAs();
    const res = await auth(request(app).post('/api/smartmed/subscriptions'), token).send({
      medicineId: 'MED-001', quantity: 1, frequencyDays: 3, addressId: 'ADDR-001'
    });
    expect(res.status).toBe(400);
  });

  test('SM-SUB-03 cancel subscription', async () => {
    const token = await loginAs();
    const sub = await auth(request(app).post('/api/smartmed/subscriptions'), token).send({
      medicineId: 'MED-001', quantity: 1, frequencyDays: 30, addressId: 'ADDR-001'
    });
    const res = await auth(request(app).put(`/api/smartmed/subscriptions/${sub.body.subscription.id}/cancel`), token).send({});
    expect(res.body.subscription.active).toBe(false);
  });
});

describe('SmartMed — audit log (SM-AUD)', () => {
  test('SM-AUD-01 audit log records user events', async () => {
    const token = await loginAs();
    await auth(request(app).post('/api/smartmed/cart/items'), token).send({ medicineId: 'MED-001', quantity: 1 });
    const res = await auth(request(app).get('/api/smartmed/audit-log'), token);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
    expect(res.body.entries.some(e => e.event === 'cart_add')).toBe(true);
    expect(res.body.entries.some(e => e.event === 'login')).toBe(true);
  });
});
