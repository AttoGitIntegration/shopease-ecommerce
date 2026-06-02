# SmartMed — Order Medicines Online

A standalone medicine-ordering web application with a Node.js/Express backend
and a vanilla-JS frontend. No build step required.

```
smartmed-app/
├── backend/
│   ├── server.js              Express app entry
│   ├── routes/                Auth, medicines, cart, orders
│   ├── controllers/           Request handlers
│   ├── middleware/auth.js     JWT auth
│   └── data/                  In-memory store + seed medicines.json
└── frontend/
    ├── index.html
    ├── css/styles.css
    └── js/                    api.js, state.js, app.js
```

## Run locally

```sh
cd smartmed-app/backend
npm install
npm start
```

Open http://localhost:4000 — the backend serves the frontend statically.

## API surface

### Auth
- `POST /api/auth/register` — `{ name, email, phone, password }` → `{ token, user }`
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`
- `GET  /api/auth/me`  *(auth)*
- `POST /api/auth/addresses` *(auth)* — `{ label, line1, city, state, pincode }`

### Medicines
- `GET /api/medicines?q=&category=&prescriptionRequired=true|false`
- `GET /api/medicines/categories`
- `GET /api/medicines/:id`

### Cart *(auth required)*
- `GET    /api/cart`
- `POST   /api/cart/items` — `{ medicineId, quantity }`
- `PATCH  /api/cart/items/:medicineId` — `{ quantity }`
- `DELETE /api/cart/items/:medicineId`
- `DELETE /api/cart`

### Orders *(auth required)*
- `POST /api/orders` — `{ addressId, paymentMethod, prescriptionId? }`
- `GET  /api/orders`
- `GET  /api/orders/:id`
- `POST /api/orders/:id/cancel`
- `POST /api/orders/prescriptions` — `{ fileName, notes? }`

## User flow

1. Browse / search the medicine catalog (no login required).
2. Sign up or log in.
3. Add medicines to cart — Rx-required items are flagged.
4. Open cart → Checkout.
5. Pick / add a delivery address.
6. If the cart contains an Rx item, upload a prescription (auto-verified in dev).
7. Choose a payment method (COD / UPI / Card / Net Banking).
8. Place order — stock decrements and the order appears in *My Orders*.
9. Orders in `PLACED` status can be cancelled (stock is restored).

## Notes

- This implementation uses an **in-memory store** (`backend/data/store.js`) —
  data is reset every restart, except for the seed medicines list.
- Passwords are stored in plaintext for demo purposes only. Swap in bcrypt
  before any real deployment.
- The JWT secret defaults to a dev value. Set `SMARTMED_JWT_SECRET` in prod.
