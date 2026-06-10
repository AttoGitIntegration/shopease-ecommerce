# GET /orders/user/:userId Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /api/orders/user/:userId` endpoint that returns all orders for a given user.

**Architecture:** Add a new controller export `getOrdersByUser` that filters the in-memory `orders` array by `userId`. Register the route in `orders.js` before `/:id` to avoid Express routing conflict.

**Tech Stack:** Node.js, Express, Jest, Supertest

---

### Task 1: Add `getOrdersByUser` controller

**Files:**
- Modify: `src/controllers/orderController.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/integration/orders.test.js` inside the existing `describe('Orders API', ...)` block, after the cancel test:

```js
test('GET /orders/user/:userId - get orders by user', async () => {
  // Place a fresh order for userId 42
  await request(app).post('/api/orders').send({
    userId: 42,
    items: [{ productId: 5, name: 'Keyboard', price: 1500, quantity: 2 }],
    address: '7 Brigade Road, Bengaluru, KA 560001'
  });

  const res = await request(app).get('/api/orders/user/42');
  expect(res.status).toBe(200);
  expect(res.body.orders).toBeInstanceOf(Array);
  expect(res.body.orders.length).toBeGreaterThan(0);
  expect(res.body.orders[0].userId).toBe(42);
  expect(typeof res.body.total).toBe('number');
});

test('GET /orders/user/:userId - empty array for unknown user', async () => {
  const res = await request(app).get('/api/orders/user/99999');
  expect(res.status).toBe(200);
  expect(res.body.orders).toEqual([]);
  expect(res.body.total).toBe(0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/aayush.raj/Projects/shopease-ecommerce
npx jest tests/integration/orders.test.js --no-coverage
```

Expected: both new tests FAIL (route not found / 404).

- [ ] **Step 3: Add controller export**

In `src/controllers/orderController.js`, append after `exports.cancelOrder`:

```js
exports.getOrdersByUser = (req, res) => {
  const userId = parseInt(req.params.userId);
  const userOrders = orders.filter(o => o.userId === userId);
  res.json({ orders: userOrders, total: userOrders.length });
};
```

- [ ] **Step 4: Register route**

Replace the contents of `src/routes/orders.js` with:

```js
const router = require('express').Router();
const { placeOrder, getOrders, getOrderById, cancelOrder, getOrdersByUser } = require('../controllers/orderController');
router.post('/',                placeOrder);
router.get('/user/:userId',     getOrdersByUser);
router.get('/',                 getOrders);
router.get('/:id',              getOrderById);
router.put('/:id/cancel',       cancelOrder);
module.exports = router;
```

Note: `/user/:userId` must be declared before `/:id` — otherwise Express matches `user` as an order id.

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest tests/integration/orders.test.js --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/controllers/orderController.js src/routes/orders.js tests/integration/orders.test.js
git commit -m "feat: add GET /orders/user/:userId endpoint"
```
