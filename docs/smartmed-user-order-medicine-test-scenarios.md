# SmartMed — Patient Ordering Medicine Online — Test Scenarios

Scope: end-user test scenarios for a **patient/consumer** placing a medicine order on the SmartMed web application — covering catalog browse, OTP login, cart, addresses, prescription upload, checkout (slot + payment), order placement, tracking, cancellation, return, refunds, refill subscriptions, and audit.

**Out of scope (see sibling docs):**
- Doctor ordering on behalf of patient → `doctor-order-medicines-online-test-scenarios.md`
- Lab tests → `doctor-order-lab-tests-scenarios.md`
- Payment gateway protocol → `payment-api-test-scenarios.md`

**Backend endpoints exercised:** `/api/smartmed/medicines`, `/api/smartmed/auth/*`, `/api/smartmed/cart*`, `/api/smartmed/addresses`, `/api/smartmed/prescriptions`, `/api/smartmed/orders*`, `/api/smartmed/subscriptions*`, `/api/smartmed/audit-log`.

**Frontend page:** `/public/smartmed/order.html` — single-page UI with login, catalog, cart, checkout, tracking.

---

## 1. Catalog browse & search

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SM-CAT-01 | List medicines (anonymous) | Catalog seeded | GET /medicines | Returns full list with `rxRequired`, `stock`, `coldChain` flags |
| SM-CAT-02 | Search by composition | "Paracetamol" indexed | GET /medicines?q=paracetamol | Returns brand variants (Crocin, Dolo) |
| SM-CAT-03 | Filter Rx-required only | — | GET /medicines?rxRequired=true | All returned items flagged Rx |
| SM-CAT-04 | Filter in-stock only | One OTC has stock=0 | GET /medicines?inStock=true | Out-of-stock items excluded |
| SM-CAT-05 | Unknown medicine ID | — | GET /medicines/MED-NOPE | 404 |

## 2. Authentication

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SM-AUTH-01 | OTP request — happy path | Known phone | POST /auth/otp | 201, masked phone returned |
| SM-AUTH-02 | OTP — unknown phone | No account | POST /auth/otp | 404 |
| SM-AUTH-03 | OTP — blocked account | `blocked=true` | POST /auth/otp | 403 |
| SM-AUTH-04 | Login — wrong OTP | OTP requested | POST /auth/login with `000000` | 401 |
| SM-AUTH-05 | Login — no prior OTP | None requested | POST /auth/login | 401 |
| SM-AUTH-06 | Login — happy path | Valid OTP | POST /auth/login `123456` | 201, session token returned |
| SM-AUTH-07 | Protected route unauthenticated | No token | GET /cart | 401 |
| SM-AUTH-08 | Logout invalidates session | Logged in | POST /auth/logout, retry GET /cart | First 200, second 401 |

## 3. Cart management

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SM-CART-01 | Add OTC medicine | Logged in | POST /cart/items MED-001 qty 2 | 201, subtotal=70 |
| SM-CART-02 | Add Rx medicine | Logged in | POST MED-003 | `requiresRx=true` |
| SM-CART-03 | Add duplicate merges qty | Cart has MED-001 | POST MED-001 again | Quantity sums to 5, single line |
| SM-CART-04 | Out-of-stock add | MED-007 stock=0 | POST MED-007 | 409 |
| SM-CART-05 | Over-stock quantity | MED-005 stock=25 | POST qty=26 | 409 |
| SM-CART-06 | Quantity ≤ 0 | — | POST qty=0 | 400 |
| SM-CART-07 | Update qty | Item in cart | PUT /cart/items/MED-001 qty=4 | 200 |
| SM-CART-08 | Update qty to zero removes line | — | PUT qty=0 | Item removed |
| SM-CART-09 | Remove line | — | DELETE /cart/items/MED-001 | Removed |
| SM-CART-10 | Cart isolation between users | Two sessions | User-A adds, User-B fetches | B's cart empty |

## 4. Address management

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SM-ADDR-01 | List seeded addresses | User has saved address | GET /addresses | Includes default flag |
| SM-ADDR-02 | Add new address | — | POST /addresses | 201; `ADDR-` ID issued |
| SM-ADDR-03 | Invalid pincode | `pincode=12` | POST | 400 |

## 5. Prescription upload

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SM-RX-01 | Upload valid PDF | Logged in | POST /prescriptions | 201, status `pending_verification` |
| SM-RX-02 | Reject .exe | — | POST mimeType `application/x-msdownload` | 415 |
| SM-RX-03 | Reject oversized | sizeBytes 10 MB | POST | 413 |
| SM-RX-04 | Cross-user isolation | User-A's Rx | User-B GET /prescriptions/:id | 404 |

## 6. Placing orders

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SM-ORD-01 | Happy path (OTC + UPI) | Cart has OTC | POST /orders | 201, status `verified` |
| SM-ORD-02 | Empty cart | — | POST /orders | 400 |
| SM-ORD-03 | Rx item without prescription | Cart has MED-003 | POST /orders | 400 “prescription mandatory” |
| SM-ORD-04 | Rx item with prescription | Rx uploaded | POST /orders with `prescriptionId` | 201, status `awaiting_verification` |
| SM-ORD-05 | COD blocked for Schedule H1 | Alprazolam in cart | POST paymentMethod=`cod` | 400 |
| SM-ORD-06 | Unserviceable pincode | pincode=999999 | POST | 400 “not serviceable” |
| SM-ORD-07 | Idempotency replay | Same `idempotencyKey` | POST twice | Second returns 200 with original order |
| SM-ORD-08 | Cold-chain delivery fee | Insulin in cart | POST | `deliveryFee=100`, `coldChain=true` |
| SM-ORD-09 | Stock decrement | Order placed qty=3 | GET /medicines/MED-001 | Stock decreased by 3 |

## 7. Order lifecycle, tracking, cancellation

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SM-TRK-01 | List user orders | One placed | GET /orders | count=1 |
| SM-TRK-02 | Advance through flow | Order verified | POST /advance ×3 | placed → packed → out_for_delivery → delivered |
| SM-CXL-01 | Cancel before pack | Status verified | PUT /cancel | Status `cancelled`; stock restored |
| SM-CXL-02 | Cancel without reason | — | PUT /cancel without `reason` | 400 |
| SM-CXL-03 | Cancel after pack | Status packed | PUT /cancel | 400 “refuse on delivery” |
| SM-CXL-04 | Cross-user cancel | Other user's order | GET /orders/:id | 404 |

## 8. Returns & refunds

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SM-RET-01 | Schedule H non-returnable | Amoxicillin delivered | PUT /return | 400 “non-returnable” |
| SM-RET-02 | OTC return within window | Delivered, ≤ 7 days | PUT /return | 200, `refundTransactionId` issued |

## 9. Subscriptions

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SM-SUB-01 | Create monthly refill | Logged in | POST /subscriptions frequencyDays=30 | 201, active |
| SM-SUB-02 | Invalid frequency | `frequencyDays=3` | POST | 400 |
| SM-SUB-03 | Cancel subscription | Active | PUT /cancel | Active=false |

## 10. Audit log

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SM-AUD-01 | Audit captures key events | Login + cart add | GET /audit-log | Entries include `login`, `cart_add` |

---

## Smoke regression
`SM-AUTH-06`, `SM-CART-01`, `SM-ORD-01`, `SM-ORD-04`, `SM-TRK-02`, `SM-CXL-01`.

## Traceability
- Backend module: `src/controllers/smartmedOrderController.js`
- Backend routes: `src/routes/smartmedOrders.js` (mounted at `/api/smartmed`)
- Frontend: `public/smartmed/order.html`
- Integration tests: `tests/integration/smartmedOrders.test.js`

Each test records: user ID, session token, address ID, prescription ID (if any), order ID, payment method, status transitions, and final audit entries.
