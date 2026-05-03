# ShopEase — Functional Test Cases

Source of truth: `src/app.js`, `src/routes/*.js`, `src/controllers/*.js`, `src/middleware/*.js`.

**Base URL:** `http://localhost:<PORT>` (default from `src/server.js`).
**Content-Type:** All `POST`/`PUT`/`PATCH` requests send `application/json`.

## Global conventions

- **User token**: `Authorization: Bearer <token>` where `<token>` is the string returned from `POST /api/auth/login`. Token is validated by `src/middleware/auth.js` against an in-memory `Set`.
- **Admin token**: `Authorization: Bearer <admin-token>` returned from `POST /api/admin/auth/login`. Validated by `src/middleware/adminAuth.js`.
- **State**: All stores are in-memory and reset on every process restart. Tests must assume a fresh process or use `beforeEach` resets where available (e.g. `paymentController._reset`). Cart is a module-level singleton — not per-user.
- **HTTP error envelope**: `{ "error": "<message>" }` unless stated.
- Where a test asserts a dynamic value (id, timestamp, transactionId), treat the assertion as "present and of the right shape" rather than a literal match.

---

## 1. Health — `GET /health`

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| H-01 | Liveness probe | Server running | `GET /health` | `200` · body `{ "status": "ok" }` |
| H-02 | Method not allowed | — | `POST /health` | `404` (no handler for POST) |

---

## 2. User Authentication — `/api/auth`

### 2.1 `POST /api/auth/register`

| # | Title | Request body | Expected |
|---|---|---|---|
| AU-R-01 | Register new user — happy path | `{ "name": "Alice", "email": "alice@test.com", "password": "p@ss1" }` | `201` · `{ message: "Registration successful", userId: <int> }` |
| AU-R-02 | Missing `name` | `{ email, password }` | `400` · `error: "All fields required"` |
| AU-R-03 | Missing `email` | `{ name, password }` | `400` · `error: "All fields required"` |
| AU-R-04 | Missing `password` | `{ name, email }` | `400` · `error: "All fields required"` |
| AU-R-05 | Empty body | `{}` | `400` · `error: "All fields required"` |
| AU-R-06 | Duplicate email | Register `alice@test.com`, then register again with same email | 2nd call `409` · `error: "Email already registered"` |
| AU-R-07 | Empty-string fields | `{ name: "", email: "", password: "" }` | `400` (falsy values) |
| AU-R-08 | User id auto-increments | Register 3 users | Each response has `userId = 1, 2, 3` |
| AU-R-09 | Case-sensitive email uniqueness | Register `A@x.com` then `a@x.com` | Both accepted (exact match only) |
| AU-R-10 | No content-type | POST without JSON header | `400` (no body parsed) |

### 2.2 `POST /api/auth/login`

| # | Title | Pre-conditions | Request | Expected |
|---|---|---|---|---|
| AU-L-01 | Valid credentials | User registered | `{ email, password }` | `200` · `{ message, token: "fake-jwt-…", userId }` |
| AU-L-02 | Wrong password | User registered | `{ email, password: "bad" }` | `401` · `error: "Invalid credentials"` |
| AU-L-03 | Unknown email | — | `{ email: "noone@x.com", password: "p" }` | `401` · `error: "Invalid credentials"` |
| AU-L-04 | Missing email | — | `{ password }` | `401` |
| AU-L-05 | Missing password | — | `{ email }` | `401` |
| AU-L-06 | Token format | Successful login | — | token matches `/^fake-jwt-\d+-\d+$/` |
| AU-L-07 | Multiple logins | Login same user twice | Two distinct tokens, both usable |

### 2.3 `POST /api/auth/logout`

| # | Title | Auth | Expected |
|---|---|---|---|
| AU-O-01 | Logout with valid token | Logged in | `200` · `message: "Logged out successfully"`; token no longer works on subsequent `logout` / protected endpoints (`401`) |
| AU-O-02 | Missing `Authorization` | None | `401` · `error: "No token provided"` |
| AU-O-03 | Malformed header (`"Bearer"` only) | — | `401` (token is `undefined` after split) |
| AU-O-04 | Token not in active set (random string) | — | `401` · `error: "Invalid or expired token"` |
| AU-O-05 | Double logout | After AU-O-01 reuse same token | `401` second call |

---

## 3. Products — `/api/products`

> Seed: 5 products (ids 1..5). All endpoints are public.

### 3.1 `GET /api/products`

| # | Title | Expected |
|---|---|---|
| P-L-01 | List all | `200` · `{ products: [...5], total: 5 }` |
| P-L-02 | Schema | Each product has `id,name,price,category,stock,rating` |

### 3.2 `GET /api/products/search`

| # | Title | Query | Expected |
|---|---|---|---|
| P-S-01 | No filters | `/search` | all products, `count=5` |
| P-S-02 | `q` substring (case-insensitive) | `q=shoes` | 1 result (Running Shoes) |
| P-S-03 | `q` no match | `q=xyz` | `count=0`, empty array |
| P-S-04 | `category` exact match | `category=Footwear` | 1 result |
| P-S-05 | `category` wrong case | `category=footwear` | `count=0` (case-sensitive) |
| P-S-06 | `minPrice` boundary | `minPrice=1499` | returns items >=1499 incl. Running Shoes |
| P-S-07 | `maxPrice` boundary | `maxPrice=499` | 1 result (Wallet) |
| P-S-08 | Combined `q`+category+price range | `q=o&category=Electronics&minPrice=1000&maxPrice=5000` | Wireless Headphones |
| P-S-09 | Non-numeric `minPrice` | `minPrice=abc` | `NaN` comparison filters everything out (`count=0`) |

### 3.3 `GET /api/products/categories`

| # | Title | Expected |
|---|---|---|
| P-C-01 | Category counts | `200` · 5 categories each `count:1` · `total:5` |
| P-C-02 | Sorted/unsorted | Document current order (insertion) |

### 3.4 `GET /api/products/category/:name`

| # | Title | Params | Expected |
|---|---|---|---|
| P-CN-01 | Case-insensitive match | `/category/electronics` | `200` · `category:"Electronics"`, 1 product |
| P-CN-02 | Unknown category | `/category/unknown` | `404` · `error: "Category not found"` |
| P-CN-03 | URL-encoded | `/category/Footwear` | `200` |

### 3.5 `GET /api/products/:id`

| # | Title | Expected |
|---|---|---|
| P-G-01 | Valid id | `200` full product |
| P-G-02 | Non-integer id | `/products/abc` — `parseInt` → NaN | `404` |
| P-G-03 | Missing id (0 / 99) | `404` |
| P-G-04 | Float id | `/products/1.5` — `parseInt("1.5")=1` | `200` product 1 |

### 3.6 `GET /api/products/:id/stock`

| # | Title | Expected |
|---|---|---|
| P-ST-01 | Valid id | `200` · `{ productId, stock, inStock: true }` |
| P-ST-02 | Unknown id | `404` |
| P-ST-03 | After `select` leaves stock > 0 | `inStock:true` (selection does not mutate stock) |

### 3.7 `POST /api/products/:id/select`

| # | Title | Body | Expected |
|---|---|---|---|
| P-SE-01 | Default quantity=1 | `{}` | `200` · `selection.quantity=1`, `lineTotal=price` |
| P-SE-02 | Explicit quantity | `{ "quantity": 3 }` | `lineTotal = price*3` |
| P-SE-03 | quantity=0 | `{ "quantity": 0 }` | returns default 1 (because `parseInt(0) \|\| 1` → 1) |
| P-SE-04 | Negative quantity | `{ "quantity": -1 }` | `400` · `error: "quantity must be positive"` |
| P-SE-05 | Over stock | `{ "quantity": 999 }` | `400` · `error: "Insufficient stock"`, `available` present |
| P-SE-06 | Unknown product id | `/products/99/select` | `404` |
| P-SE-07 | Cancelled product | Pre: `PUT /:id/cancel` then `select` | `400` · `error: "Product is cancelled and unavailable"` |
| P-SE-08 | Non-numeric quantity | `{ "quantity": "abc" }` | `parseInt` NaN → default `1` → `200` |

### 3.8 `PUT /api/products/:id/cancel` (exported but also bound via legacy router)

| # | Title | Body | Expected |
|---|---|---|---|
| P-CX-01 | Missing reason | `{}` | `400` · `error: "reason required"` |
| P-CX-02 | Cancel success | `{ "reason": "discontinued" }` | `200` · product gains `status:"cancelled"`, `cancelledAt`, `cancellationReason` |
| P-CX-03 | Already cancelled | Repeat CX-02 | `400` · `error: "Product already cancelled"` |
| P-CX-04 | Unknown id | `/products/99/cancel` | `404` |

> **Known repo defect:** `src/routes/products.js` has two `require` blocks and two `const` destructurings which Node will reject at import time — document but do not gate tests on it. Test via the effective export (search, categories, category/:name, :id/stock, :id/select, :id, cancel, getAll).

---

## 4. Cart — `/api/cart`

> Single shared in-memory cart. Reset between tests.

### 4.1 `GET /api/cart`

| # | Title | Expected |
|---|---|---|
| C-G-01 | Empty cart | `200` · `{ items: [], total: 0 }` |
| C-G-02 | After add | Reflects current items + recalculated `total` |

### 4.2 `POST /api/cart/add`

| # | Title | Body | Expected |
|---|---|---|---|
| C-A-01 | Add new item (default qty 1) | `{ productId:1, name:"H", price:100 }` | `200` · item added, `total=100` |
| C-A-02 | Add with quantity | `{ productId:1, name:"H", price:100, quantity:3 }` | `total=300` |
| C-A-03 | Add existing increments | Add id=1 qty 2, then qty 3 | final qty=5, `total=500` |
| C-A-04 | Different productIds | Add id=1 and id=2 | 2 line items |
| C-A-05 | Decimal price | `price:9.99`, qty 2 | `total=19.98` (floating math) |
| C-A-06 | Negative quantity | `quantity:-1` | Currently accepted — document actual behavior |
| C-A-07 | Missing productId | `{ name, price }` | existing lookup matches `undefined`; pushes item with `productId:undefined` |

### 4.3 `GET /api/cart/item/:productId`

| # | Title | Pre | Expected |
|---|---|---|---|
| C-I-01 | Exists | After add productId=1 | `200` · item body |
| C-I-02 | Not in cart | `/item/99` | `404` · `error: "Item not in cart"` |
| C-I-03 | String vs number productId | Cart stored with number, URL is string | `404` (strict `===` on string vs number) |

### 4.4 `PUT /api/cart/update`

| # | Title | Body | Expected |
|---|---|---|---|
| C-U-01 | Update quantity | `{ productId:1, quantity:5 }` on existing item | `200` · item qty=5, total recalc |
| C-U-02 | Quantity 0 removes item | `{ productId:1, quantity:0 }` | item removed; item not present |
| C-U-03 | Negative quantity removes | `{ productId:1, quantity:-1 }` | item removed |
| C-U-04 | Item not in cart | `{ productId:99, quantity:2 }` | `404` · `error: "Item not in cart"` |

### 4.5 `DELETE /api/cart/remove`

| # | Title | Body | Expected |
|---|---|---|---|
| C-R-01 | Remove existing | `{ productId:1 }` | item gone · total recalculated |
| C-R-02 | Remove non-existent | `{ productId:99 }` | `200` — no error, cart unchanged |
| C-R-03 | Missing productId | `{}` | `200` — filter no-op |

### 4.6 `DELETE /api/cart/clear`

| # | Title | Expected |
|---|---|---|
| C-X-01 | Clear populated cart | `200` · `cart:{ items:[], total:0 }` |
| C-X-02 | Clear already-empty cart | `200` — idempotent |

---

## 5. Checkout (user) — `/api/checkout`

> Single global session. All endpoints public (no auth middleware).

### 5.1 `POST /api/checkout/initiate`

| # | Title | Pre-conditions | Expected |
|---|---|---|---|
| CK-I-01 | Empty cart | Cart empty | `400` · `error: "Cart is empty"` |
| CK-I-02 | Happy path | Cart has 1 item @ price 500 qty 1 | `201` · `session.status="initiated"`, `totals={subtotal:500,tax:40,shipping:99,total:639}` |
| CK-I-03 | Free shipping threshold | subtotal=2000 | `shipping=0` · `total=subtotal+tax` |
| CK-I-04 | Free shipping just below | subtotal=1999 | `shipping=99` |
| CK-I-05 | Tax rounding | subtotal=125 (tax=10) | `tax=Math.round(125*0.08)=10` |
| CK-I-06 | Re-initiate overwrites | Initiate twice | second call replaces session |

### 5.2 `GET /api/checkout`

| # | Title | Expected |
|---|---|---|
| CK-G-01 | No session | `404` · `error: "No active checkout session"` |
| CK-G-02 | Active session | `200` · session body |

### 5.3 `POST /api/checkout/shipping`

| # | Title | Body | Expected |
|---|---|---|---|
| CK-S-01 | All fields | full address | `200` · `session.status="shipping_set"` |
| CK-S-02 | Missing any field | drop `city` | `400` |
| CK-S-03 | No active session | empty session | `404` |

### 5.4 `POST /api/checkout/payment`

| # | Title | Body | Expected |
|---|---|---|---|
| CK-P-01 | Valid method | `{ method: "card" }` | `200` · `session.status="payment_set"` |
| CK-P-02 | Invalid method | `{ method: "crypto" }` | `400` · `method must be one of card, upi, cod, netbanking` |
| CK-P-03 | Missing method | `{}` | `400` |
| CK-P-04 | No active session | — | `404` |

### 5.5 `POST /api/checkout/pay`

| # | Title | Pre | Body | Expected |
|---|---|---|---|---|
| CK-PP-01 | Card valid | method=card | `{ cardNumber:"4111111111111111", cvv:"123", expiry:"12/30" }` | `200` · `status="paid"`, `payment.last4="1111"`, `transactionId` present |
| CK-PP-02 | Card short number | method=card | `cardNumber:"123"` | `400` · `Invalid card number` |
| CK-PP-03 | Card long number | method=card | 20 digits | `400` |
| CK-PP-04 | Card bad cvv | `cvv:"12"` | — | `400` |
| CK-PP-05 | Missing card fields | omit expiry | — | `400` · `cardNumber, cvv and expiry required` |
| CK-PP-06 | UPI valid | method=upi | `{ upiId:"alice@okaxis" }` | `200` · `upiId` stored |
| CK-PP-07 | UPI invalid format | `upiId:"nope"` | — | `400` · `Valid upiId required` |
| CK-PP-08 | Netbanking valid | method=netbanking | `{ bank:"HDFC" }` | `200` |
| CK-PP-09 | Netbanking missing bank | — | `{}` | `400` · `bank required` |
| CK-PP-10 | COD | method=cod | `{}` | `200` · `status="payment_pending"`, `paidAt=null` |
| CK-PP-11 | No session | — | — | `404` |
| CK-PP-12 | No payment method set | session without `setPayment` | — | `400` · `Payment method required` |

### 5.6 `POST /api/checkout/confirm`

| # | Title | Pre | Expected |
|---|---|---|---|
| CK-C-01 | Missing address | payment set only | `400` · `Shipping address required` |
| CK-C-02 | Missing payment | shipping set only | `400` · `Payment method required` |
| CK-C-03 | Happy path | both set | `201` · `order.status="placed"`, cart cleared, session cleared |
| CK-C-04 | No session | fresh | `404` |
| CK-C-05 | Post-confirm session is null | After CK-C-03 | `GET /checkout` → `404` |

### 5.7 `DELETE /api/checkout`

| # | Title | Expected |
|---|---|---|
| CK-X-01 | Cancel active session | `200` · session cleared |
| CK-X-02 | Cancel when no session | `404` |

---

## 6. Headphones — `/api/headphones`

> Seed: ids 101..105.

### 6.1 `GET /api/headphones`

| # | Title | Query | Expected |
|---|---|---|---|
| HP-L-01 | List all | — | 5 items |
| HP-L-02 | `type=over-ear` | | 3 items |
| HP-L-03 | `wireless=true` | | 3 items |
| HP-L-04 | `wireless=false` | | 2 items |
| HP-L-05 | `maxPrice=2000` | | 1 item (id 103 @1299) |

### 6.2 `GET /api/headphones/search`

| # | Title | Query | Expected |
|---|---|---|---|
| HP-S-01 | `q` matches name | `q=gaming` | 1 result |
| HP-S-02 | `q` matches brand | `q=soundwave` | 1 result |
| HP-S-03 | `brand` filter | `brand=quietpro` | case-insensitive match |
| HP-S-04 | `minRating` | `minRating=4.7` | 1 result |
| HP-S-05 | Combined | `type=over-ear&wireless=true&maxPrice=4000` | 1 result (101) |

### 6.3 `GET /api/headphones/:id`

| # | Title | Expected |
|---|---|---|
| HP-G-01 | Valid id | `200` product body |
| HP-G-02 | Unknown id | `404` · `Headphones not found` |

### 6.4 `POST /api/headphones/buy`

| # | Title | Body | Expected |
|---|---|---|---|
| HP-B-01 | Card happy path | valid productId=101 qty=1, address, `payment:{method:"card", cardNumber:"4111111111111111", cvv:"123", expiry:"12/30"}` | `201` · `order.status="placed"`, `last4="1111"`, `totals.total` with tax+shipping, stock decrements |
| HP-B-02 | Free shipping | qty where subtotal>=2000 | `shipping=0` |
| HP-B-03 | Shipping fee applies | subtotal=1299 | `shipping=99` |
| HP-B-04 | Insufficient stock | qty > stock | `400` · `Insufficient stock`, `available` |
| HP-B-05 | Non-existent product | productId=999 | `404` |
| HP-B-06 | Missing address | omit address | `400` · `address required` |
| HP-B-07 | Incomplete address | drop `city` | `400` |
| HP-B-08 | Missing payment | omit | `400` · `payment.method required` |
| HP-B-09 | UPI happy path | `payment:{method:"upi",upiId:"a@b"}` | `201` |
| HP-B-10 | UPI bad id | `upiId:"oops"` | `400` |
| HP-B-11 | Netbanking happy path | `method:netbanking, bank:"HDFC"` | `201` |
| HP-B-12 | Netbanking missing bank | — | `400` |
| HP-B-13 | COD | `method:cod` | `201` · `status:"payment_pending"`, `paidAt:null` |
| HP-B-14 | Quantity 0 | qty=0 | `400` · `quantity must be positive` |
| HP-B-15 | Quantity negative | qty=-1 | `400` |
| HP-B-16 | Stock decrement persists | Buy 2 then GET /:id | stock reduced by 2 |

### 6.5 `GET /api/headphones/orders`

| # | Title | Expected |
|---|---|---|
| HP-O-01 | Empty on cold start | `200` · `{ orders:[], count:0 }` |
| HP-O-02 | After purchases | `count` matches |

---

## 7. TV — `/api/tv`

> Seed: ids 201..205. Adds `installation` and `emi` method.

### 7.1 `GET /api/tv` (list)

| # | Title | Query | Expected |
|---|---|---|---|
| TV-L-01 | All | — | 5 |
| TV-L-02 | `type=OLED` | | 1 |
| TV-L-03 | `smart=true` | | 4 |
| TV-L-04 | `smart=false` | | 1 |
| TV-L-05 | `resolution=4K` | | 3 |
| TV-L-06 | `maxPrice=30000` | | 2 (203, 205) |
| TV-L-07 | `minScreenSize=55` | | 3 |

### 7.2 `GET /api/tv/search`

| # | Title | Query | Expected |
|---|---|---|---|
| TV-S-01 | `q` name | `q=QLED` | 1 |
| TV-S-02 | `brand=HomeView` | | 2 |
| TV-S-03 | `minRating=4.8` | | 2 |
| TV-S-04 | Range `minScreenSize=40&maxScreenSize=65` | | 3 |

### 7.3 `GET /api/tv/:id`

| # | Title | Expected |
|---|---|---|
| TV-G-01 | Valid | `200` |
| TV-G-02 | Unknown | `404` · `TV not found` |

### 7.4 `POST /api/tv/buy`

| # | Title | Body | Expected |
|---|---|---|---|
| TV-B-01 | Card happy path (no installation) | productId=203 qty=1 | `201`, `totals.installationFee=0` |
| TV-B-02 | With installation | `installation:true` qty=2 | `installationFee=999*2=1998`, `tax = round((subtotal+installationFee)*0.08)` |
| TV-B-03 | EMI valid | `method:"emi", bank:"HDFC", tenureMonths:12` | `201` · `monthlyAmount = round(total/12)` |
| TV-B-04 | EMI missing bank | `method:emi, tenureMonths:6` | `400` · `bank required for emi` |
| TV-B-05 | EMI invalid tenure | `tenureMonths:7` | `400` · enumerates allowed set |
| TV-B-06 | Shipping free threshold | `subtotal>=20000` | `shipping=0` |
| TV-B-07 | Shipping fee | `subtotal<20000` | `shipping=499` |
| TV-B-08 | Stock decrement | Buy qty 2 | stock -= 2 |
| TV-B-09 | Insufficient stock | qty>stock | `400` |
| TV-B-10 | Invalid method | `method:"bitcoin"` | `400` · lists valid methods |
| TV-B-11 | COD | `method:cod` | `201` · `status:payment_pending` |
| TV-B-12 | Non-boolean `installation` | `installation:"yes"` | treated truthy → `installationFee` applied; document current |

### 7.5 `GET /api/tv/orders`

| # | Title | Expected |
|---|---|---|
| TV-O-01 | Empty on cold start | `{orders:[], count:0}` |

---

## 8. Laptops — `/api/laptops`

### 8.1 `GET /api/laptops`

| # | Title | Query | Expected |
|---|---|---|---|
| LP-L-01 | All | — | 6 |
| LP-L-02 | `type=Gaming` | | 1 |
| LP-L-03 | `os=macos` case-insensitive | | 1 |
| LP-L-04 | `processor=intel` substring | | 4 |
| LP-L-05 | `maxPrice=80000` | | 2 |
| LP-L-06 | `minRam=16` | | 5 |
| LP-L-07 | `minStorage=1024` | | 2 |

### 8.2 `GET /api/laptops/search`

| # | Title | Query | Expected |
|---|---|---|---|
| LP-S-01 | `q=pro` (name/brand) | | multiple |
| LP-S-02 | `brand=pixelmax` | | 1 |
| LP-S-03 | `minScreenSize=15&maxScreenSize=16` | | 3 |
| LP-S-04 | `minRating=4.8` | | 2 |

### 8.3 `GET /api/laptops/:id`

| # | Title | Expected |
|---|---|---|
| LP-G-01 | Valid | `200` |
| LP-G-02 | Unknown | `404` · `Laptop not found` |

### 8.4 `POST /api/laptops/buy`

| # | Title | Body | Expected |
|---|---|---|---|
| LP-B-01 | Card basic | productId=301 qty=1 | `201`, addOns=0 |
| LP-B-02 | With extendedWarranty | `extendedWarranty:true` qty=2 | `extendedWarrantyFee=2999*2` |
| LP-B-03 | With accidentalProtection | `accidentalProtection:true` qty=1 | `accidentalProtectionFee=1999` |
| LP-B-04 | Both add-ons | both true qty=1 | both fees present, tax includes add-ons |
| LP-B-05 | EMI | `method:emi, bank, tenureMonths:24` | `monthlyAmount` present |
| LP-B-06 | Shipping free threshold | subtotal>=20000 | always true for laptops seed |
| LP-B-07 | Unknown product | 999 | `404` |
| LP-B-08 | Missing address field | drop `country` | `400` |
| LP-B-09 | Bad UPI | `upiId:"x"` | `400` |
| LP-B-10 | Stock decrement | qty 2 | `product.stock -= 2` |
| LP-B-11 | Over stock | qty > stock | `400` |

### 8.5 `GET /api/laptops/orders`

| # | Title | Expected |
|---|---|---|
| LP-O-01 | Empty cold start | `{orders:[], count:0}` |

### 8.6 `POST /api/laptops/orders/:id/cancel`

| # | Title | Pre | Body | Expected |
|---|---|---|---|---|
| LP-X-01 | Cancel placed card order | Buy with card, status=placed | `{ reason: "changed mind" }` | `200` · `status:cancelled`, `refundAmount`, `refundTransactionId` set, stock restored |
| LP-X-02 | Cancel COD order | Buy with COD | `{}` | `200` · no refund fields set (method=cod) |
| LP-X-03 | Default reason | Buy, cancel without body | no body | `cancellationReason: "No reason provided"` |
| LP-X-04 | Already cancelled | Cancel twice | — | 2nd call `400` · `Order already cancelled` |
| LP-X-05 | Shipped order | Manually set `status:"shipped"` (not exposed) — document limitation | — | `400` per controller rule |
| LP-X-06 | Unknown order id | `/orders/999/cancel` | — | `404` |

---

## 9. Booking Slots — `/api/booking-slots`

> Seed: ids 401..406. Slot 406 has `capacity:8` (multi-seat).

### 9.1 `GET /api/booking-slots`

| # | Title | Query | Expected |
|---|---|---|---|
| BS-L-01 | All | — | 6 |
| BS-L-02 | `specialty=Dermatology` (case-insensitive) | `specialty=dermatology` | 1 |
| BS-L-03 | `mode=online` | | 2 |
| BS-L-04 | `date=2026-05-04` | | 2 |
| BS-L-05 | `provider` substring | `provider=rao` | 1 |
| BS-L-06 | `maxPrice=800` | | 2 (401, 405, 406) — verify against price |

### 9.2 `GET /api/booking-slots/search`

| # | Title | Query | Expected |
|---|---|---|---|
| BS-S-01 | `q=yoga` | | 1 |
| BS-S-02 | `minDuration=60` | | 1 |
| BS-S-03 | `minRating=4.8` | | 2 |
| BS-S-04 | `minPrice=1000&maxPrice=1500` | | 1 |

### 9.3 `GET /api/booking-slots/:id`

| # | Title | Expected |
|---|---|---|
| BS-G-01 | Valid | `200` |
| BS-G-02 | Unknown | `404` · `Slot not found` |

### 9.4 `POST /api/booking-slots/book`

| # | Title | Body | Expected |
|---|---|---|---|
| BS-B-01 | Happy path card | `slotId:401, seats:1, patient:{fullName,email,phone,dateOfBirth}, payment:{method:card,...}` | `201` · `booking.status:"confirmed"` · `slot.capacity -= 1` |
| BS-B-02 | Book multi-seat | `slotId:406, seats:3` | `201` · capacity 8→5 |
| BS-B-03 | Over capacity | `slotId:401, seats:2` (capacity 1) | `400` · `Insufficient capacity`, `available:1` |
| BS-B-04 | Seats 0 | `seats:0` | `400` · `seats must be positive` |
| BS-B-05 | Missing patient | omit | `400` · `patient required` |
| BS-B-06 | Invalid email | `patient.email:"nope"` | `400` · `Invalid email` |
| BS-B-07 | Invalid phone | `patient.phone:"abc"` | `400` · `Invalid phone` |
| BS-B-08 | Phone with +country | `+14155551234` | accepted |
| BS-B-09 | Missing payment method | payment without method | `400` · `payment.method required` |
| BS-B-10 | COD booking | `method:cod` | `201` · `status:"payment_pending"` |
| BS-B-11 | EMI | full emi payload | `201` · `monthlyAmount` |
| BS-B-12 | Unknown slotId | 999 | `404` |
| BS-B-13 | Capacity depletion | Book 406 until capacity=0, then book 1 more | `400` once exhausted |

### 9.5 `GET /api/booking-slots/bookings`

| # | Title | Expected |
|---|---|---|
| BS-BL-01 | Empty | `{bookings:[], count:0}` |
| BS-BL-02 | After book | reflects bookings |

### 9.6 `POST /api/booking-slots/bookings/:id/cancel`

| # | Title | Pre | Body | Expected |
|---|---|---|---|---|
| BS-C-01 | Cancel confirmed card booking | confirmed card booking | `{ reason: "busy" }` | `200` · `status:cancelled` · `refundAmount:total` · slot capacity restored |
| BS-C-02 | Cancel COD booking | confirmed cod booking | — | `200`, no refund fields |
| BS-C-03 | Default reason | no body | `cancellationReason:"No reason provided"` |
| BS-C-04 | Already cancelled | cancel twice | 2nd `400` · `Booking already cancelled` |
| BS-C-05 | Completed booking (status manually forced) | — | `400` · `Cannot cancel completed booking` |
| BS-C-06 | Unknown id | `/bookings/999/cancel` | `404` |

---

## 10. Orders — `/api/orders`

> **Known repo defect:** `src/routes/orders.js` redeclares its imports and `src/controllers/orderController.js` has an unclosed function body for `getReturnStatus` (the `}` before `exports.getOrdersByUser` closes the function but the inner `res.json(...)` block already returned). Treat test cases below as specifying intended behavior; a test run may surface these as hard failures — report them.

### 10.1 `POST /api/orders`

| # | Title | Body | Expected |
|---|---|---|---|
| O-P-01 | Happy path | `{ userId:1, items:[{productId,price:100,quantity:2,name}], address:{...} }` | `201` · order with `total=200` · `status:placed` |
| O-P-02 | Missing userId | drop userId | `400` · `userId, items and address required` |
| O-P-03 | Empty items array | `items:[]` | `400` |
| O-P-04 | Missing address | — | `400` |
| O-P-05 | Total calculation with multiple items | two items | `total = Σ price*qty` |

### 10.2 `GET /api/orders`

| # | Title | Expected |
|---|---|---|
| O-L-01 | Empty | `{ orders:[], total:0 }` |
| O-L-02 | After placements | `total` matches |

### 10.3 `GET /api/orders/user/:userId`

| # | Title | Expected |
|---|---|---|
| O-U-01 | Orders exist for user | `{ orders:[...], total:N }` (only user's orders) |
| O-U-02 | No orders for user | `{ orders:[], total:0 }` |
| O-U-03 | Non-numeric userId | `parseInt` → NaN; no match → `total:0` |

### 10.4 `GET /api/orders/:id`

| # | Title | Expected |
|---|---|---|
| O-G-01 | Existing order | `200` |
| O-G-02 | Unknown | `404` · `Order not found` |

### 10.5 `PUT /api/orders/:id/cancel`

| # | Title | Pre | Body | Expected |
|---|---|---|---|---|
| O-C-01 | Cancel placed | `status:placed` | `{ reason }` | `200` · `status:cancelled`, `cancelledAt`, `cancellationReason` |
| O-C-02 | Default reason | no body | — | `cancellationReason:"No reason provided"` |
| O-C-03 | Already cancelled | cancel twice | — | 2nd `400` · `Order already cancelled` |
| O-C-04 | Shipped order | force `status:shipped` | — | `400` · `Cannot cancel shipped order` |
| O-C-05 | Delivered order | — | — | `400` · `Cannot cancel delivered order` |
| O-C-06 | Unknown id | `/orders/99/cancel` | — | `404` |

### 10.6 `PUT /api/orders/:id/return`

| # | Title | Pre | Body | Expected |
|---|---|---|---|---|
| O-R-01 | Return delivered within window | force `status:delivered`, set `deliveredAt: <now-1d>` | `{ reason: "broken" }` | `200` · `status:returned`, `returnReason`, `refundAmount:total` |
| O-R-02 | Return non-delivered | `status:placed` | — | `400` · `Cannot return placed order` |
| O-R-03 | Return outside 30d | `deliveredAt: <now-31d>` | `{ reason }` | `400` · `Return window of 30 days has expired` |
| O-R-04 | Missing reason | `{}` | — | `400` · `reason required` |
| O-R-05 | Unknown order | — | — | `404` |

### 10.7 `PUT /api/orders/:id/approve-return`

| # | Title | Pre | Body | Expected |
|---|---|---|---|---|
| O-AR-01 | Approve returned | `status:returned` | `{ note }` | `200` · `status:return_approved`, `returnApprovalNote` |
| O-AR-02 | Wrong state | `status:placed` | — | `400` · `Cannot approve return for placed order` |
| O-AR-03 | No note | `{}` | — | `200`, `returnApprovalNote:null` |
| O-AR-04 | Unknown order | — | — | `404` |

### 10.8 `PUT /api/orders/:id/reject-return`

| # | Title | Pre | Body | Expected |
|---|---|---|---|---|
| O-RR-01 | Reject returned | `status:returned` | `{ reason: "damage self-inflicted" }` | `200` · `status:return_rejected`, `refundAmount:0` |
| O-RR-02 | Wrong state | `status:placed` | — | `400` |
| O-RR-03 | Missing reason | `{}` | — | `400` |

### 10.9 `POST /api/orders/:id/refund`

| # | Title | Pre | Body | Expected |
|---|---|---|---|---|
| O-RF-01 | Refund approved return | `status:return_approved` | `{}` | `200` · `status:refunded`, `refundMethod:"original_payment"`, `refundAmount:total`, `refundTransactionId` |
| O-RF-02 | Custom method | `{ method: "store_credit" }` | — | `refundMethod: "store_credit"` |
| O-RF-03 | Wrong state | `status:placed` | — | `400` · `Cannot issue refund for placed order` |
| O-RF-04 | Unknown order | — | — | `404` |

### 10.10 `GET /api/orders/:id/return-status`

| # | Title | Pre | Expected |
|---|---|---|---|
| O-RS-01 | Returned | `status:returned` | `200` · `status:returned`, timestamps where present |
| O-RS-02 | Approved | `status:return_approved` | reflects `approvedAt` |
| O-RS-03 | Rejected | `status:return_rejected` | reflects `rejectionReason`, `rejectedAt` |
| O-RS-04 | Refunded | `status:refunded` | `refundTransactionId`, `refundAmount`, `refundMethod` |
| O-RS-05 | Not returned yet | `status:placed` | `400` · `No return initiated for this order` |
| O-RS-06 | Unknown order | — | `404` |

---

## 11. Payments — `/api/payments`

### 11.1 `GET /api/payments/methods`

| # | Title | Expected |
|---|---|---|
| PM-M-01 | Enumerate capabilities | `200` · `{methods, currencies, banks, wallets}` |

### 11.2 `POST /api/payments/intent`

| # | Title | Body | Expected |
|---|---|---|---|
| PM-I-01 | Valid intent | `{ amount:100, method:"card" }` | `201` · `payment.status="created"`, `transactionId` |
| PM-I-02 | Default currency INR | omit currency | `currency:"INR"` |
| PM-I-03 | Non-number amount | `amount:"100"` | `400` · `amount must be a positive number` |
| PM-I-04 | Zero amount | `amount:0` | `400` |
| PM-I-05 | Negative amount | `amount:-1` | `400` |
| PM-I-06 | Invalid currency | `currency:"BTC"` | `400` · lists valid currencies |
| PM-I-07 | Invalid method | `method:"giftcard"` | `400` |
| PM-I-08 | orderId attached | `{ amount, method, orderId:77 }` | `payment.orderId:77` |

### 11.3 `POST /api/payments/:id/capture`

> `:id` accepts either numeric `id` or `transactionId` string.

| # | Title | Pre intent | Body | Expected |
|---|---|---|---|---|
| PM-CP-01 | Capture card | method=card | `{ cardNumber:"4111111111111111", cvv:"123", expiry:"12/30" }` | `200` · `status:"captured"`, `last4:"1111"`, `capturedAt` set |
| PM-CP-02 | Expired card | `expiry:"01/20"` | — | `400` · `Card expired` |
| PM-CP-03 | Bad expiry format | `expiry:"2030-01"` | — | `400` · `expiry must be MM/YY` |
| PM-CP-04 | Capture UPI | method=upi | `{ upiId:"a@b" }` | `200` |
| PM-CP-05 | Bad UPI | `upiId:"x"` | — | `400` |
| PM-CP-06 | Capture netbanking | method=netbanking | `{ bank:"HDFC" }` | `200` |
| PM-CP-07 | Unsupported bank | `{ bank:"UNKNOWN" }` | — | `400` · lists supported |
| PM-CP-08 | Netbanking missing bank | `{}` | — | `400` |
| PM-CP-09 | Capture wallet | method=wallet | `{ wallet:"paytm", otp:"1234" }` | `200` · `status:"captured"` |
| PM-CP-10 | Wallet bad otp | `otp:"12"` | — | `400` |
| PM-CP-11 | Wallet missing | omit wallet | — | `400` · `wallet required` |
| PM-CP-12 | Unsupported wallet | `wallet:"mypay"` | — | `400` |
| PM-CP-13 | Capture COD | method=cod | `{}` | `200` · `status:"pending_collection"`, `capturedAt:null` |
| PM-CP-14 | Already captured | call twice | — | 2nd `400` · `Cannot capture payment in captured state` |
| PM-CP-15 | Unknown id | `/payments/9999/capture` | — | `404` |
| PM-CP-16 | Capture by transactionId | use `TXN-…` string as path | — | `200` |

### 11.4 `POST /api/payments/:id/fail`

| # | Title | Pre | Body | Expected |
|---|---|---|---|---|
| PM-F-01 | Fail created | `status:created` | `{ reason:"insufficient funds" }` | `200` · `status:failed`, `failureReason`, `failedAt` |
| PM-F-02 | Fail captured | `status:captured` | `{ reason }` | `200` |
| PM-F-03 | Missing reason | `{}` | — | `400` |
| PM-F-04 | Fail refunded | refund then fail | — | `400` · `Cannot fail payment in refunded state` |
| PM-F-05 | Unknown | — | — | `404` |

### 11.5 `POST /api/payments/:id/refund`

| # | Title | Pre | Body | Expected |
|---|---|---|---|---|
| PM-R-01 | Full refund | captured amount=500 | `{}` | `201` · `refund.amount:500`, `payment.status:"refunded"`, `refundedAmount:500` |
| PM-R-02 | Partial refund | captured 500 | `{ amount:200 }` | `201` · `payment.status:"partially_refunded"`, `refundedAmount:200` |
| PM-R-03 | Second partial completes | after PM-R-02 | `{ amount:300 }` | `payment.status:"refunded"`, `refundedAmount:500` |
| PM-R-04 | Exceed refundable | `{ amount:600 }` | — | `400` · `Refund exceeds refundable amount (500)` |
| PM-R-05 | Non-number amount | `amount:"x"` | — | `400` |
| PM-R-06 | Refund non-captured | status=created | — | `400` · `Cannot refund payment in created state` |
| PM-R-07 | Unknown payment | — | — | `404` |
| PM-R-08 | Refund reason stored | `{ reason:"dup" }` | — | `refund.reason:"dup"` |

### 11.6 `GET /api/payments`

| # | Title | Query | Expected |
|---|---|---|---|
| PM-LS-01 | All | — | full list |
| PM-LS-02 | Filter by status | `?status=captured` | only captured |
| PM-LS-03 | Filter by method | `?method=card` | only card |
| PM-LS-04 | Filter by orderId | `?orderId=77` | matches regardless of string/number |

### 11.7 `GET /api/payments/:id`

| # | Title | Expected |
|---|---|---|
| PM-G-01 | Exists | full record |
| PM-G-02 | By transactionId | works |
| PM-G-03 | Unknown | `404` |

### 11.8 `GET /api/payments/:id/verify`

| # | Title | Expected |
|---|---|---|
| PM-V-01 | Verify projection | `200` · `{transactionId,status,amount,currency,method,capturedAt,failureReason}` |
| PM-V-02 | Unknown | `404` |

### 11.9 `GET /api/payments/refunds`

| # | Title | Query | Expected |
|---|---|---|---|
| PM-RL-01 | All refunds | — | full list |
| PM-RL-02 | Filter by transactionId | `?transactionId=TXN-…` | only refunds for that payment |

---

## 12. Admin Auth — `/api/admin/auth`

> Seed admin: `admin@shopease.com / admin@123`. Secret for self-registration: `SHOPEASE-ADMIN-SECRET`.

### 12.1 `POST /api/admin/auth/register`

| # | Title | Body | Expected |
|---|---|---|---|
| AA-R-01 | Valid secret | `{ name,email,password, secret:"SHOPEASE-ADMIN-SECRET" }` | `201` · `adminId` |
| AA-R-02 | Invalid secret | `secret:"nope"` | `403` · `Invalid admin secret` |
| AA-R-03 | Missing secret | omit | `403` |
| AA-R-04 | Missing fields | omit `password` | `400` · `All fields required` |
| AA-R-05 | Duplicate email | register same email twice | 2nd `409` · `Email already registered` |

### 12.2 `POST /api/admin/auth/login`

| # | Title | Body | Expected |
|---|---|---|---|
| AA-L-01 | Valid seed admin | `{email:"admin@shopease.com", password:"admin@123"}` | `200` · `token: "admin-jwt-…"` |
| AA-L-02 | Wrong password | — | `401` · `Invalid credentials` |
| AA-L-03 | Unknown email | — | `401` |
| AA-L-04 | Token format | — | `/^admin-jwt-\d+-\d+$/` |

### 12.3 `GET /api/admin/auth/me`

| # | Title | Auth | Expected |
|---|---|---|---|
| AA-ME-01 | Logged-in admin | valid token | `200` · `{id,name,email}` |
| AA-ME-02 | Missing header | no Authorization | `401` · `No admin token provided` |
| AA-ME-03 | User token (not admin) | user token | `403` · `Admin privileges required` |
| AA-ME-04 | Admin record deleted after token issued | — | `404` · `Admin not found` (edge: mutate `admins` array) |

### 12.4 `POST /api/admin/auth/logout`

| # | Title | Expected |
|---|---|---|
| AA-O-01 | Valid token → logout | `200`; subsequent admin calls with that token `403` |
| AA-O-02 | No token | `401` |
| AA-O-03 | User token | `403` |

---

## 13. Admin Checkout — `/api/admin/checkout` (all require admin JWT)

> Sessions are keyed by `adminId` — one active session per admin. Drafts, quotes, orders shared across admins but filtered by `adminId` where relevant.

### 13.1 Session lifecycle

#### `POST /api/admin/checkout/initiate`

| # | Title | Body | Expected |
|---|---|---|---|
| AC-I-01 | Valid | `{customerUserId:7, items:[{productId:1,name:"X",price:100,quantity:2}], notes:"test"}` | `201` · session with computed totals |
| AC-I-02 | Missing customerUserId | — | `400` |
| AC-I-03 | Empty items | `items:[]` | `400` · `items must be a non-empty array` |
| AC-I-04 | Item missing fields | item without `price` | `400` · `each item requires productId, name, price and quantity` |
| AC-I-05 | Non-positive qty | `quantity:0` | `400` |
| AC-I-06 | Negative price | `price:-1` | `400` |
| AC-I-07 | Existing session overwritten | initiate twice | second call replaces (sessions.set) |
| AC-I-08 | No admin token | — | `401` |
| AC-I-09 | User token only | — | `403` |

#### `GET /api/admin/checkout`

| # | Title | Expected |
|---|---|---|
| AC-G-01 | With session | `200` · session |
| AC-G-02 | No session | `404` |

#### `DELETE /api/admin/checkout`

| # | Title | Expected |
|---|---|---|
| AC-X-01 | Cancel | `200` |
| AC-X-02 | No session | `404` |

### 13.2 Shipping & totals

#### `POST /api/admin/checkout/shipping`

| # | Title | Body | Expected |
|---|---|---|---|
| AC-S-01 | Address + priority=true | full address + `priority:true` | `200` · `session.priority=true`, `shipping=299` |
| AC-S-02 | Address only | | `200`, `shipping` via threshold (99 or 0) |
| AC-S-03 | Missing field | drop `line1` | `400` |
| AC-S-04 | priority as non-boolean | `priority:"yes"` | treated as string → not applied (still previous value) |
| AC-S-05 | No session | — | `404` |

### 13.3 Discounts

#### `POST /api/admin/checkout/discount`

| # | Title | Body | Expected |
|---|---|---|---|
| AC-D-01 | Percent 10% | `{type:"percent", value:10}` | `200` · `totals.discount = round(subtotal*0.1)` |
| AC-D-02 | Percent > 50 | `{type:"percent", value:60}` | `400` · `percent discount capped at 50%` |
| AC-D-03 | Flat value | `{type:"flat", value:50}` (subtotal >= 50) | `discount=50` |
| AC-D-04 | Flat exceeds subtotal | `value:1_000_000` | `discount = subtotal` (capped via Math.min) |
| AC-D-05 | Invalid type | `{type:"other"}` | `400` |
| AC-D-06 | Non-positive value | `value:0` | `400` |
| AC-D-07 | Non-numeric value | `value:"x"` | `400` |
| AC-D-08 | Reason stored | `{type,value,reason:"loyalty"}` | `session.discount.reason:"loyalty"` |
| AC-D-09 | No session | — | `404` |

### 13.4 Tax exemption

#### `POST /api/admin/checkout/tax-exempt`

| # | Title | Body | Expected |
|---|---|---|---|
| AC-T-01 | Exempt on | `{exempt:true, reason:"non-profit"}` | `200` · `tax=0`, `taxExemptReason:"non-profit"` |
| AC-T-02 | Exempt off | `{exempt:false}` | `200` · tax restored, `taxExemptReason:null` |
| AC-T-03 | Missing exempt | `{}` | `400` · `exempt must be a boolean` |
| AC-T-04 | Non-boolean | `exempt:"true"` | `400` |
| AC-T-05 | No session | — | `404` |

### 13.5 Payment

#### `POST /api/admin/checkout/payment`

| # | Title | Body | Expected |
|---|---|---|---|
| AC-P-01 | Card | `{method:"card"}` | `200`, no extra fields |
| AC-P-02 | Invalid | `{method:"bitcoin"}` | `400` · enumerates valid |
| AC-P-03 | Invoice with days | `{method:"invoice", invoiceDueDays:30}` | `200`, `invoiceDueAt` ~30d future |
| AC-P-04 | Invoice bad days | `invoiceDueDays:100` | `400` |
| AC-P-05 | Invoice missing days | `{method:"invoice"}` | `400` |
| AC-P-06 | Purchase order | `{method:"purchase_order", poNumber:"PO-1"}` | `200`, `payment.poNumber` |
| AC-P-07 | PO missing number | `{method:"purchase_order"}` | `400` |
| AC-P-08 | No session | — | `404` |

### 13.6 Items in session

#### `POST /api/admin/checkout/items`

| # | Title | Body | Expected |
|---|---|---|---|
| AC-IT-A-01 | Add new | `{productId:2,name,price:50,quantity:1}` | `200` · item added, totals recomputed |
| AC-IT-A-02 | Add existing | same productId again | quantity accumulates |
| AC-IT-A-03 | Invalid | `{productId,name,price:-1,quantity:1}` | `400` |
| AC-IT-A-04 | No session | — | `404` |

#### `PATCH /api/admin/checkout/items/:productId`

| # | Title | Body | Expected |
|---|---|---|---|
| AC-IT-U-01 | Update qty | `{quantity:5}` | `200`, item qty=5 |
| AC-IT-U-02 | Qty ≤ 0 removes (when other items remain) | `quantity:0` (multi-item session) | item removed |
| AC-IT-U-03 | Remove last item → rejected | qty=0 when only one item | `400` · `Session must retain at least one item; cancel instead` |
| AC-IT-U-04 | Missing qty | `{}` | `400` |
| AC-IT-U-05 | Unknown item | `/items/9999` | `404` |
| AC-IT-U-06 | No session | — | `404` |

#### `DELETE /api/admin/checkout/items/:productId`

| # | Title | Pre | Expected |
|---|---|---|---|
| AC-IT-D-01 | Remove from multi-item session | 2 items | `200`, one remains |
| AC-IT-D-02 | Remove last item | 1 item | `400` · `Session must retain at least one item` |
| AC-IT-D-03 | Unknown productId | — | `404` |
| AC-IT-D-04 | No session | — | `404` |

### 13.7 Drafts (hold/resume)

| # | Title | Steps | Expected |
|---|---|---|---|
| AC-DR-01 | Hold active session | initiate then `POST /hold` | `201` · `draft` returned, session cleared |
| AC-DR-02 | Hold with no session | — | `404` |
| AC-DR-03 | List drafts — only own | admin A holds, admin B calls `GET /drafts` | admin B sees empty |
| AC-DR-04 | Resume draft | `POST /drafts/:id/resume` | `200` · session restored, draft removed |
| AC-DR-05 | Resume with active session | initiate then resume | `409` · `Active session already exists; cancel it first` |
| AC-DR-06 | Resume other admin's draft | A creates, B resumes | `404` |
| AC-DR-07 | Delete draft | `DELETE /drafts/:id` | `200` |
| AC-DR-08 | Delete other admin's draft | — | `404` |

### 13.8 Confirm

#### `POST /api/admin/checkout/confirm`

| # | Title | Pre | Expected |
|---|---|---|---|
| AC-CF-01 | Happy (card) | address + payment set | `201` · `order.status:"placed"`, `placedBy.adminId` set, session deleted |
| AC-CF-02 | Happy (COD) | `payment.method:"cod"` | `order.status:"payment_pending"` |
| AC-CF-03 | Missing address | payment only | `400` |
| AC-CF-04 | Missing payment | shipping only | `400` |
| AC-CF-05 | No session | — | `404` |

### 13.9 Order lifecycle

#### `GET /api/admin/checkout/orders`

| # | Title | Query | Expected |
|---|---|---|---|
| AC-O-L-01 | All | — | all orders |
| AC-O-L-02 | Filter by customer | `?customerUserId=7` | only that customer |
| AC-O-L-03 | Filter by status | `?status=placed` | matches |

#### `GET /api/admin/checkout/orders/:id`

| # | Title | Expected |
|---|---|---|
| AC-O-G-01 | Exists | `200` |
| AC-O-G-02 | Unknown | `404` |

#### `POST /api/admin/checkout/orders/:id/ship`

| # | Title | Pre | Body | Expected |
|---|---|---|---|---|
| AC-O-SH-01 | Ship placed | `status:placed` | `{carrier:"FedEx", trackingNumber:"Z1"}` | `200` · `status:shipped`, `shipment` populated |
| AC-O-SH-02 | Missing carrier | `{trackingNumber}` | — | `400` |
| AC-O-SH-03 | Wrong status | `status:shipped` already | — | `400` |
| AC-O-SH-04 | Unknown order | — | — | `404` |

#### `POST /api/admin/checkout/orders/:id/deliver`

| # | Title | Pre | Expected |
|---|---|---|---|
| AC-O-DV-01 | Deliver shipped | `status:shipped` | `200` · `status:delivered`; if COD then `payment.paidAt` set |
| AC-O-DV-02 | Wrong status | `status:placed` | `400` |
| AC-O-DV-03 | Unknown | — | `404` |

#### `POST /api/admin/checkout/orders/:id/cancel`

| # | Title | Pre | Body | Expected |
|---|---|---|---|---|
| AC-O-CX-01 | Cancel placed (card) | placed with card | `{reason:"x"}` | `200` · `status:cancelled`, `refund` present |
| AC-O-CX-02 | Cancel placed (COD) | placed with cod | — | `200`, no refund (non-refundable method) |
| AC-O-CX-03 | Cancel invoice | method:invoice | — | `200`, no refund |
| AC-O-CX-04 | Cancel shipped | `status:shipped` card | — | `200`, refund present |
| AC-O-CX-05 | Already cancelled | — | — | `400` |
| AC-O-CX-06 | Delivered | — | — | `400` |
| AC-O-CX-07 | Unknown | — | — | `404` |
| AC-O-CX-08 | Default reason | no body | — | `cancellationReason:"No reason provided"` |

#### `POST /api/admin/checkout/orders/:id/refund`

| # | Title | Pre | Body | Expected |
|---|---|---|---|---|
| AC-O-RF-01 | Full refund | placed card total=500 | `{}` | `200` · `refunds[0].amount=500`, `refundedTotal=500`, `status:refunded` |
| AC-O-RF-02 | Partial then complete | partial 200, then 300 | — | status transitions to refunded after full |
| AC-O-RF-03 | Exceed remaining | 500 already refunded | `{amount:1}` | `400` · `Order is fully refunded` |
| AC-O-RF-04 | Amount > remaining | partial 200 used, `amount:400` | — | `400` |
| AC-O-RF-05 | Non-positive amount | `amount:0` | — | `400` |
| AC-O-RF-06 | COD order | method:cod | — | `400` · `Payment method cod is not refundable via this endpoint` |
| AC-O-RF-07 | Invoice order | — | — | `400` |
| AC-O-RF-08 | PO order | — | — | `400` |
| AC-O-RF-09 | Cancelled order | after cancel | — | `400` · `Cancelled orders auto-refund; use cancel endpoint` |
| AC-O-RF-10 | Unknown | — | — | `404` |

### 13.10 Quotes

#### `POST /api/admin/checkout/quotes`

| # | Title | Body | Expected |
|---|---|---|---|
| AC-Q-C-01 | Valid | `{customerUserId, items, validityDays:14}` | `201` · `quote.status:"open"`, `expiresAt` |
| AC-Q-C-02 | Default validity 14 | omit days | 14-day expiry |
| AC-Q-C-03 | Invalid validity | `validityDays:0` | `400` |
| AC-Q-C-04 | Validity > 90 | `validityDays:91` | `400` |
| AC-Q-C-05 | Items invalid | invalid items | `400` |
| AC-Q-C-06 | Missing customer | — | `400` |
| AC-Q-C-07 | With discount | `{discount:{type:"percent",value:10}}` | totals reflect discount |
| AC-Q-C-08 | Discount > 50% | `{discount:{type:"percent",value:60}}` | `400` |
| AC-Q-C-09 | Discount invalid type | `{discount:{type:"bad",value:1}}` | `400` |

#### `GET /api/admin/checkout/quotes`

| # | Title | Expected |
|---|---|---|
| AC-Q-L-01 | All | returns list |
| AC-Q-L-02 | Filter by customer | `?customerUserId=7` |
| AC-Q-L-03 | Filter by status | `?status=open` |
| AC-Q-L-04 | Expired auto-transition on list | Force `expiresAt` in the past, then list → `status:"expired"` |

#### `GET /api/admin/checkout/quotes/:id`

| # | Title | Expected |
|---|---|---|
| AC-Q-G-01 | Exists | `200` |
| AC-Q-G-02 | Unknown | `404` |
| AC-Q-G-03 | Expired on read | `200` with `status:expired` |

#### `POST /api/admin/checkout/quotes/:id/convert`

| # | Title | Pre | Expected |
|---|---|---|---|
| AC-Q-CV-01 | Convert open quote | open | `201` · session created (`fromQuoteId` set), quote `status:converted` |
| AC-Q-CV-02 | Convert when session exists | pre-initiate | `409` · `Active session already exists; cancel it first` |
| AC-Q-CV-03 | Convert expired | force expiresAt past | `400` · `Cannot convert quote in status expired` |
| AC-Q-CV-04 | Already converted | convert twice | 2nd `400` |
| AC-Q-CV-05 | Unknown | — | `404` |

#### `DELETE /api/admin/checkout/quotes/:id`

| # | Title | Pre | Expected |
|---|---|---|---|
| AC-Q-D-01 | Delete open | open | `200` |
| AC-Q-D-02 | Delete converted | converted | `400` · `Cannot delete a converted quote` |
| AC-Q-D-03 | Unknown | — | `404` |

### 13.11 Reports — `GET /api/admin/checkout/reports/summary`

| # | Title | Query | Expected |
|---|---|---|---|
| AC-RP-01 | No filters | — | `200` · aggregates across all orders: `orderCount`, `grossRevenue`, `totalRefunded`, `netRevenue`, `totalDiscount`, `byStatus` |
| AC-RP-02 | Date range | `?from=2026-01-01&to=2026-12-31` | only orders in range |
| AC-RP-03 | Invalid `from` | `?from=notadate` | `400` · `Invalid from date` |
| AC-RP-04 | Invalid `to` | `?to=nope` | `400` |
| AC-RP-05 | Filter by adminId | `?adminId=1` | only orders placed by admin 1 |
| AC-RP-06 | Filter by customer | `?customerUserId=7` | matches |
| AC-RP-07 | Counts `byStatus` | mix of placed/cancelled/refunded | correct counts |
| AC-RP-08 | `totalRefunded` sums both `refundedTotal` (partial refunds) and auto-cancel refund (`refund.amount`) | mix both cases | sum matches |
| AC-RP-09 | `netRevenue = gross - refunded` | — | equality holds |

---

## 14. Cross-cutting / negative

| # | Title | Steps | Expected |
|---|---|---|---|
| X-01 | Unknown route | `GET /api/nope` | `404` (Express default) |
| X-02 | Wrong method | `DELETE /api/products` | `404` |
| X-03 | Malformed JSON body | `POST /api/auth/register` with invalid JSON | `400` from `express.json()` body-parser |
| X-04 | Admin endpoints reject user tokens | Use `fake-jwt-*` against `/api/admin/*` | `403` (not in adminTokens) |
| X-05 | User endpoints accept admin token? | use `admin-jwt-*` on `/api/auth/logout` | `401` — admin token not in `activeTokens` |
| X-06 | Token case sensitivity | `Authorization: bearer <token>` (lowercase) | Works — split is whitespace-based |
| X-07 | Token with extra whitespace | `"Bearer  <token>"` (two spaces) | Split index 1 may be empty → `401` |
| X-08 | Large payload | 1 MB body to `POST /orders` | passes if under Express default limit; else `413` |

---

## 15. End-to-end user journeys (smoke)

### Journey A — Guest browse + cart + checkout (card)
1. `GET /api/products` → 5 products.
2. `POST /api/cart/add` productId=1 qty=2.
3. `GET /api/cart` → total=5998.
4. `POST /api/checkout/initiate` → session.
5. `POST /api/checkout/shipping` with full address.
6. `POST /api/checkout/payment` `{method:"card"}`.
7. `POST /api/checkout/pay` with valid card.
8. `POST /api/checkout/confirm` → `201`, cart cleared.
9. `GET /api/cart` → empty.

### Journey B — Authenticated return flow
1. `POST /api/auth/register` → user.
2. `POST /api/auth/login` → token.
3. `POST /api/orders` → order (userId=1).
4. Force `status:delivered`, `deliveredAt:now-1d` (test harness).
5. `PUT /api/orders/:id/return` with reason.
6. `PUT /api/orders/:id/approve-return`.
7. `POST /api/orders/:id/refund` → status=refunded.
8. `GET /api/orders/:id/return-status` reflects full refund.

### Journey C — Laptop quick-buy then cancel
1. `POST /api/laptops/buy` productId=301 qty=1, card → `201`.
2. `GET /api/laptops/301` → stock -1.
3. `POST /api/laptops/orders/1/cancel` with reason → status=cancelled, refund set.
4. `GET /api/laptops/301` → stock restored.

### Journey D — Admin on-behalf order
1. `POST /api/admin/auth/login` → admin token.
2. `POST /api/admin/checkout/initiate` with items for customer 7.
3. `POST /api/admin/checkout/discount` percent 10%.
4. `POST /api/admin/checkout/tax-exempt` `{exempt:true}`.
5. `POST /api/admin/checkout/shipping` with priority=true.
6. `POST /api/admin/checkout/payment` invoice 30 days.
7. `POST /api/admin/checkout/confirm` → order placed.
8. `POST /api/admin/checkout/orders/:id/ship` (FedEx, TRK1).
9. `POST /api/admin/checkout/orders/:id/deliver`.
10. `GET /api/admin/checkout/reports/summary` includes order.

### Journey E — Quote → session → order
1. Admin `POST /quotes` with discount percent 5%.
2. `GET /quotes/:id` → open.
3. `POST /quotes/:id/convert` → session (`fromQuoteId`).
4. Shipping + payment + confirm.
5. `GET /quotes/:id` → converted.

### Journey F — Booking slot lifecycle
1. `GET /api/booking-slots?specialty=Wellness` → slot 406.
2. `POST /api/booking-slots/book` seats=3 patient card → `201`; capacity 8→5.
3. `POST /api/booking-slots/bookings/1/cancel` → capacity back to 8, refund set.

---

## 16. Known repo defects to call out during test execution

1. `src/routes/products.js` — duplicate `const` destructuring from `productController` imports will throw `SyntaxError: Identifier 'getAll' has already been declared` at require time. **Impact:** every product test will 500/crash on import. Fix before running P-* tests.
2. `src/routes/orders.js` — same duplicate `const` destructuring pattern; will throw at require time. **Impact:** every O-* and order-related journey will crash.
3. `src/controllers/orderController.js` — `getReturnStatus` function block closes (line 106 `}`) **before** `exports.getOrdersByUser` is defined; the closing `};` for `getReturnStatus` actually ends the file scope incorrectly. Will throw `SyntaxError` at require time. **Impact:** order module unusable.
4. `tests/integration/orders.test.js` is already open in the IDE — likely being edited in relation to these defects.

Fixing these three syntax issues is a prerequisite to running the Orders and Products test suites end-to-end.
