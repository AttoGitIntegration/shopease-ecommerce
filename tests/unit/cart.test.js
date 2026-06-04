const request = require('supertest');
const app = require('../../src/app');
const { resetCart } = require('../../src/controllers/cartController');

describe('Cart API', () => {
  beforeEach(() => resetCart());

  test('GET /cart - returns cart', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
  });

  test('POST /cart/add - adds new item with 201', async () => {
    const res = await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0].quantity).toBe(2);
    expect(res.body.message).toBe('Item added to cart');
  });

  test('POST /cart/add - adding same product increments quantity', async () => {
    await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 2 });
    const res = await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 3 });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Quantity updated for existing item');
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0].quantity).toBe(5);
    expect(res.body.item.quantity).toBe(5);
  });

  test('POST /cart/add - adding same product updates total correctly', async () => {
    await request(app).post('/api/cart/add')
      .send({ productId: 2, name: 'Keyboard', price: 1000, quantity: 1 });
    const res = await request(app).post('/api/cart/add')
      .send({ productId: 2, name: 'Keyboard', price: 1000, quantity: 2 });
    expect(res.body.cart.total).toBe(3000);
  });

  test('POST /cart/add - rejects missing productId', async () => {
    const res = await request(app).post('/api/cart/add')
      .send({ name: 'Headphones', price: 999 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /cart/add - rejects negative price', async () => {
    const res = await request(app).post('/api/cart/add')
      .send({ productId: 3, name: 'Bad Item', price: -10, quantity: 1 });
    expect(res.status).toBe(400);
  });

  test('POST /cart/add - rejects zero quantity', async () => {
    const res = await request(app).post('/api/cart/add')
      .send({ productId: 4, name: 'Another Item', price: 500, quantity: 0 });
    expect(res.status).toBe(400);
  });

  test('DELETE /cart/clear - clears cart', async () => {
    const res = await request(app).delete('/api/cart/clear');
    expect(res.status).toBe(200);
    expect(res.body.cart.items).toHaveLength(0);
  });

  test('GET /cart/count - returns itemCount and productCount', async () => {
    const res = await request(app).get('/api/cart/count');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('itemCount');
    expect(res.body).toHaveProperty('productCount');
  });
});
