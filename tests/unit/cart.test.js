const request = require('supertest');
const app = require('../../src/app');

describe('Cart API', () => {
  beforeEach(async () => {
    await request(app).delete('/api/cart/clear');
  });

  test('GET /cart - returns cart', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
  });

  test('POST /cart/add - adds item using catalog price', async () => {
    const res = await request(app).post('/api/cart/add')
      .send({ productId: 1, quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0]).toMatchObject({
      productId: 1,
      name: 'Wireless Headphones',
      price: 2999,
      quantity: 2,
    });
    expect(res.body.cart.total).toBe(5998);
  });

  test('POST /cart/add - increments quantity for duplicate product', async () => {
    await request(app).post('/api/cart/add').send({ productId: 2, quantity: 1 });
    const res = await request(app).post('/api/cart/add').send({ productId: 2, quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0].quantity).toBe(3);
  });

  test('POST /cart/add - defaults quantity to 1', async () => {
    const res = await request(app).post('/api/cart/add').send({ productId: 3 });
    expect(res.status).toBe(200);
    expect(res.body.cart.items[0].quantity).toBe(1);
  });

  test('POST /cart/add - 400 when productId missing', async () => {
    const res = await request(app).post('/api/cart/add').send({ quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /cart/add - 400 when quantity is invalid', async () => {
    const res = await request(app).post('/api/cart/add').send({ productId: 1, quantity: 0 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /cart/add - 404 when product does not exist', async () => {
    const res = await request(app).post('/api/cart/add').send({ productId: 999, quantity: 1 });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /cart/add - 409 when quantity exceeds stock', async () => {
    const res = await request(app).post('/api/cart/add').send({ productId: 1, quantity: 999 });
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('available');
  });

  test('DELETE /cart/clear - clears cart', async () => {
    await request(app).post('/api/cart/add').send({ productId: 1, quantity: 1 });
    const res = await request(app).delete('/api/cart/clear');
    expect(res.status).toBe(200);
    expect(res.body.cart.items).toHaveLength(0);
  });
});
