# GET /orders/user/:userId — Design Spec

**Date:** 2026-04-17

## Summary

Add `GET /api/orders/user/:userId` to retrieve all orders placed by a specific user.

## Route

```
GET /api/orders/user/:userId
```

Registered **before** `GET /:id` in `src/routes/orders.js` to prevent route conflict.

## Controller

New export `getOrdersByUser` in `src/controllers/orderController.js`:

- Parse `req.params.userId` as integer
- Filter in-memory `orders` array by `userId`
- Always return HTTP 200 with `{ orders, total }` — empty array if no orders found

## Error Handling

- No 404 on empty result — a user having zero orders is valid
- Malformed userId (NaN after parseInt) returns empty array (consistent with existing pattern)

## Test

New test case in `tests/integration/orders.test.js`:

- Place an order for `userId: 1`
- `GET /api/orders/user/1` → expect 200, body contains placed order
- `GET /api/orders/user/9999` → expect 200, empty `orders` array

## Files Changed

| File | Change |
|------|--------|
| `src/controllers/orderController.js` | Add `getOrdersByUser` export |
| `src/routes/orders.js` | Register new route before `/:id` |
| `tests/integration/orders.test.js` | Add test cases |
