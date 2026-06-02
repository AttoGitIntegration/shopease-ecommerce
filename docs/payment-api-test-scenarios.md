# ShopEase — Payment (API) Functional Test Scenarios

Scope: detailed **backend / API** test scenarios for the payment module. Companion to `payment-web-test-cases.md` (which covers the web UI). All scenarios are derived from `src/controllers/paymentController.js` and `src/routes/payments.js`. The in-memory `payments` and `refunds` arrays are reset via `paymentController._reset()` between scenarios unless noted.

**Base path:** `/api/payments` (mounted in `src/app.js`).

**Endpoints under test**

| Method | Path | Handler |
|---|---|---|
| GET    | `/api/payments/methods`        | `listMethods` |
| GET    | `/api/payments/`               | `listPayments` |
| POST   | `/api/payments/intent`         | `createIntent` |
| POST   | `/api/payments/:id/capture`    | `capture` |
| POST   | `/api/payments/:id/fail`       | `markFailed` |
| POST   | `/api/payments/:id/refund`     | `refund` |
| GET    | `/api/payments/refunds`        | `listRefunds` |
| GET    | `/api/payments/:id/verify`     | `verify` |
| GET    | `/api/payments/:id`            | `getPayment` |

**Reference constants**

| Constant | Value |
|---|---|
| `VALID_METHODS`     | `card`, `upi`, `cod`, `netbanking`, `wallet` |
| `VALID_CURRENCIES`  | `INR`, `USD`, `EUR`, `GBP` |
| `SUPPORTED_BANKS`   | `HDFC`, `ICICI`, `SBI`, `AXIS`, `KOTAK` |
| `SUPPORTED_WALLETS` | `paytm`, `phonepe`, `gpay`, `amazonpay` |

**Payment state machine**

```
                ┌──────────────┐
                │   created    │  ← createIntent
                └──────┬───────┘
        capture(card/upi/netbanking/wallet) │ │ capture(cod)
                       ▼                    │ ▼
                 ┌──────────┐         ┌──────────────────────┐
                 │ captured │         │ pending_collection   │
                 └────┬─────┘         └──────────────────────┘
        refund(full)  │  refund(partial)
                      ▼
   ┌──────────────────┴──────────────────┐
   │                                     │
   ▼                                     ▼
┌──────────┐                  ┌────────────────────────┐
│ refunded │                  │ partially_refunded     │
└──────────┘                  └────────────────────────┘

markFailed allowed from: { created, captured }  →  failed
```

---

## 1. `GET /api/payments/methods` — list supported methods

| # | Title | Pre-conditions | Request | Expected |
|---|---|---|---|---|
| PAY-API-M-01 | Method catalog returned | — | `GET /api/payments/methods` | 200; body contains arrays `methods`, `currencies`, `banks`, `wallets` |
| PAY-API-M-02 | Methods value | — | — | `methods === ['card','upi','cod','netbanking','wallet']` (exact order) |
| PAY-API-M-03 | Currencies value | — | — | `currencies === ['INR','USD','EUR','GBP']` |
| PAY-API-M-04 | Banks value | — | — | `banks === ['HDFC','ICICI','SBI','AXIS','KOTAK']` |
| PAY-API-M-05 | Wallets value | — | — | `wallets === ['paytm','phonepe','gpay','amazonpay']` |
| PAY-API-M-06 | Endpoint is idempotent / read-only | — | Call twice | Two identical responses; `payments` and `refunds` unchanged |
| PAY-API-M-07 | Unsupported HTTP verbs | — | `POST /methods`, `PUT /methods`, `DELETE /methods` | 404 (no route match) |
| PAY-API-M-08 | Query string ignored | — | `GET /methods?foo=bar` | 200; same payload as PAY-API-M-01 |
| PAY-API-M-09 | Content type | — | — | `Content-Type: application/json; charset=utf-8` |

---

## 2. `POST /api/payments/intent` — create payment intent

### 2.1 Happy paths

| # | Title | Body | Expected |
|---|---|---|---|
| PAY-API-CI-01 | Card intent (INR) | `{ amount: 1299, currency: 'INR', method: 'card', orderId: 101 }` | 201; `payment.status='created'`; `transactionId` matches `/^TXN-\d+-\d+$/`; `id=1`; `capturedAt=null`; `failureReason=null` |
| PAY-API-CI-02 | UPI intent (default currency) | `{ amount: 500, method: 'upi' }` | 201; `currency='INR'` (default applied); `orderId=null` |
| PAY-API-CI-03 | COD intent | `{ amount: 999, method: 'cod', orderId: 'ORD-9' }` | 201; `status='created'` (state transitions only on capture) |
| PAY-API-CI-04 | Netbanking intent | `{ amount: 4999, method: 'netbanking', currency: 'INR' }` | 201 |
| PAY-API-CI-05 | Wallet intent | `{ amount: 250, method: 'wallet' }` | 201 |
| PAY-API-CI-06 | Foreign-currency intent | `{ amount: 19.99, currency: 'USD', method: 'card' }` | 201; `currency='USD'`; decimals preserved |
| PAY-API-CI-07 | EUR / GBP accepted | `{ amount: 49, currency: 'EUR', method: 'card' }` and `currency: 'GBP'` | 201 in both cases |
| PAY-API-CI-08 | Sequential `id` values | Create 3 intents | `id` values are `1, 2, 3` in creation order |
| PAY-API-CI-09 | Unique `transactionId` per intent | Create 5 intents quickly | All 5 `transactionId`s differ (suffix counter ensures uniqueness even at same ms) |
| PAY-API-CI-10 | `createdAt` is a Date | — | `new Date(payment.createdAt)` is valid; close to now (±5s) |

### 2.2 Validation — `amount`

| # | Title | Body | Expected |
|---|---|---|---|
| PAY-API-CI-V-01 | Missing amount | `{ method: 'card' }` | 400 `"amount must be a positive number"` |
| PAY-API-CI-V-02 | Amount = 0 | `{ amount: 0, method: 'card' }` | 400 `"amount must be a positive number"` |
| PAY-API-CI-V-03 | Negative amount | `{ amount: -100, method: 'card' }` | 400 `"amount must be a positive number"` |
| PAY-API-CI-V-04 | Amount as string | `{ amount: '1299', method: 'card' }` | 400 `"amount must be a positive number"` (typeof check fails) |
| PAY-API-CI-V-05 | Amount as boolean | `{ amount: true, method: 'card' }` | 400 same as above |
| PAY-API-CI-V-06 | Amount NaN | `{ amount: NaN, method: 'card' }` | 400 (NaN is not `> 0`) |
| PAY-API-CI-V-07 | Amount Infinity | `{ amount: Infinity, method: 'card' }` | Documented behavior — currently passes (`> 0` and is a number); flag as risk |
| PAY-API-CI-V-08 | Floating point precision | `{ amount: 0.1 + 0.2, method: 'card' }` | 201; stored as `0.30000000000000004` (document FP behavior) |
| PAY-API-CI-V-09 | Very small positive | `{ amount: 0.0001, method: 'card' }` | 201 (no minimum enforced) |
| PAY-API-CI-V-10 | Very large amount | `{ amount: 1e15, method: 'card' }` | 201 (no maximum enforced — flag for product policy) |

### 2.3 Validation — `currency`

| # | Title | Body | Expected |
|---|---|---|---|
| PAY-API-CI-C-01 | Default INR when omitted | `{ amount: 100, method: 'card' }` | 201; `currency='INR'` |
| PAY-API-CI-C-02 | JPY rejected | `{ amount: 100, currency: 'JPY', method: 'card' }` | 400 `"currency must be one of INR, USD, EUR, GBP"` |
| PAY-API-CI-C-03 | Lowercase rejected | `currency: 'inr'` | 400 (case-sensitive includes check) |
| PAY-API-CI-C-04 | Empty string | `currency: ''` | 400 |
| PAY-API-CI-C-05 | Numeric currency | `currency: 356` | 400 |
| PAY-API-CI-C-06 | `null` currency | `currency: null` | Default `'INR'` applied (because `null` → triggers default? **No**: ES default only applies to `undefined`. `null` reaches the includes check → 400.) Verify and lock behavior. |
| PAY-API-CI-C-07 | `undefined` currency | `currency: undefined` | Default `'INR'` applied; 201 |

### 2.4 Validation — `method`

| # | Title | Body | Expected |
|---|---|---|---|
| PAY-API-CI-MV-01 | Missing method | `{ amount: 100 }` | 400 `"method must be one of card, upi, cod, netbanking, wallet"` |
| PAY-API-CI-MV-02 | Crypto method | `{ amount: 100, method: 'crypto' }` | 400 |
| PAY-API-CI-MV-03 | Capitalized | `method: 'Card'` | 400 (case-sensitive) |
| PAY-API-CI-MV-04 | Method as array | `method: ['card']` | 400 |
| PAY-API-CI-MV-05 | Method whitespace | `method: ' card'` | 400 |

### 2.5 Body / request shape

| # | Title | Request | Expected |
|---|---|---|---|
| PAY-API-CI-B-01 | Empty body | `POST /intent` with `{}` | 400 amount error |
| PAY-API-CI-B-02 | No body at all | `POST /intent` (no body, no Content-Type) | 400 amount error (controller uses `req.body || {}`) |
| PAY-API-CI-B-03 | Malformed JSON | Body: `"{ amount: 100,"` | 400 from JSON parser middleware |
| PAY-API-CI-B-04 | Wrong content type | `Content-Type: text/plain`, body `amount=1` | 400 amount error (body not parsed) |
| PAY-API-CI-B-05 | Extra fields ignored | `{ amount: 100, method: 'card', xss: '<script>' }` | 201; persisted intent does not include `xss` |
| PAY-API-CI-B-06 | `orderId` as number | `orderId: 42` | 201; stored as number 42 |
| PAY-API-CI-B-07 | `orderId` as string | `orderId: 'ORD-42'` | 201; stored as string |
| PAY-API-CI-B-08 | `orderId` not provided | — | `orderId` defaults to `null` |

---

## 3. `POST /api/payments/:id/capture` — capture by method

### 3.1 Resolution of `:id`

| # | Title | Setup | Request | Expected |
|---|---|---|---|---|
| PAY-API-CAP-ID-01 | Capture by numeric id | Intent #1 created | `POST /1/capture` | 200 captured |
| PAY-API-CAP-ID-02 | Capture by transactionId | Intent created with TXN `TXN-X-1` | `POST /TXN-X-1/capture` | 200 captured |
| PAY-API-CAP-ID-03 | Unknown id | — | `POST /99999/capture` | 404 `"Payment not found"` |
| PAY-API-CAP-ID-04 | Empty id segment | — | `POST //capture` | 404 (no route match) |
| PAY-API-CAP-ID-05 | Numeric id as string | id `'1'` vs `1` | Both forms | Both resolve same payment (`String(p.id) === String(id)`) |
| PAY-API-CAP-ID-06 | Whitespace id | `POST /%20/capture` | 404 |
| PAY-API-CAP-ID-07 | SQL-injection-like id | `POST /1' OR '1'='1/capture` | 404 |

### 3.2 Card capture

| # | Title | Setup | Body | Expected |
|---|---|---|---|---|
| PAY-API-CAP-C-01 | Valid card | card intent | `{ cardNumber: '4111111111111111', cvv: '123', expiry: '12/30' }` | 200; `status='captured'`; `last4='1111'`; `capturedAt` ≈ now |
| PAY-API-CAP-C-02 | 13-digit card | — | `cardNumber: '4111111111111'` | 200 (boundary lower) |
| PAY-API-CAP-C-03 | 19-digit card | — | `cardNumber: '4111111111111111119'` | 200 (boundary upper) |
| PAY-API-CAP-C-04 | 12-digit rejected | — | `cardNumber: '411111111111'` | 400 `"Invalid card number"` |
| PAY-API-CAP-C-05 | 20-digit rejected | — | 20-digit number | 400 `"Invalid card number"` |
| PAY-API-CAP-C-06 | Non-digit chars | — | `cardNumber: '4111-1111-1111-1111'` | 400 `"Invalid card number"` (no normalization) |
| PAY-API-CAP-C-07 | Letters in card | — | `cardNumber: 'abcd1111…'` | 400 |
| PAY-API-CAP-C-08 | CVV 3-digit | — | `cvv: '123'` | 200 |
| PAY-API-CAP-C-09 | CVV 4-digit (Amex-like) | — | `cvv: '1234'` | 200 |
| PAY-API-CAP-C-10 | CVV 2-digit | — | `cvv: '12'` | 400 `"Invalid cvv"` |
| PAY-API-CAP-C-11 | CVV 5-digit | — | `cvv: '12345'` | 400 |
| PAY-API-CAP-C-12 | CVV non-numeric | — | `cvv: 'abc'` | 400 |
| PAY-API-CAP-C-13 | Expiry future | — | `expiry: '12/99'` | 200 |
| PAY-API-CAP-C-14 | Expiry month 00 | — | `expiry: '00/30'` | 400 `"expiry must be MM/YY"` |
| PAY-API-CAP-C-15 | Expiry month 13 | — | `expiry: '13/30'` | 400 |
| PAY-API-CAP-C-16 | Expiry wrong format | — | `expiry: '2030-12'` or `12-30` | 400 |
| PAY-API-CAP-C-17 | Expired in past year | — | `expiry: '01/20'` | 400 `"Card expired"` |
| PAY-API-CAP-C-18 | Expiry boundary — last day of month | — | `expiry` = current month/year | 200 (valid until 23:59:59 of last day) |
| PAY-API-CAP-C-19 | Expiry boundary — month just past | — | `expiry` = previous month of current year | 400 `"Card expired"` |
| PAY-API-CAP-C-20 | Missing card field | — | `{ cvv: '123', expiry: '12/30' }` (no number) | 400 `"cardNumber, cvv and expiry required"` |
| PAY-API-CAP-C-21 | All card fields blank | — | `{ cardNumber: '', cvv: '', expiry: '' }` | 400 same as above |
| PAY-API-CAP-C-22 | UPI payload sent for card intent | card intent | `{ upiId: 'a@b' }` | 400 `"cardNumber, cvv and expiry required"` (UPI fields ignored) |
| PAY-API-CAP-C-23 | `last4` correctness | — | `cardNumber: '4111111111119876'` | `last4='9876'` |
| PAY-API-CAP-C-24 | `last4` not stored on failure | invalid card | — | `payment.last4` remains undefined |

### 3.3 UPI capture

| # | Title | Body | Expected |
|---|---|---|---|
| PAY-API-CAP-U-01 | Valid UPI | `upiId: 'user@okicici'` | 200; `payment.upiId='user@okicici'`; `status='captured'` |
| PAY-API-CAP-U-02 | Dot/dash allowed | `upiId: 'user.name-1@ok-bank'` | 200 |
| PAY-API-CAP-U-03 | Underscore/digits | `upiId: 'user_1@bank'` | 200 |
| PAY-API-CAP-U-04 | Missing `@` | `upiId: 'userokicici'` | 400 `"Valid upiId required"` |
| PAY-API-CAP-U-05 | Empty | `upiId: ''` | 400 |
| PAY-API-CAP-U-06 | Non-ASCII | `upiId: 'उपयोगकर्ता@ok'` | 400 (`\w` is ASCII word in JS regex) |
| PAY-API-CAP-U-07 | Spaces | `upiId: 'user name@bank'` | 400 |
| PAY-API-CAP-U-08 | Multiple `@` | `upiId: 'a@b@c'` | 400 |
| PAY-API-CAP-U-09 | Card fields ignored | `{ upiId: 'a@b', cardNumber: '4111…' }` | 200; only `upiId` saved; no `last4` |

### 3.4 Netbanking capture

| # | Title | Body | Expected |
|---|---|---|---|
| PAY-API-CAP-N-01 | Each supported bank | `bank: 'HDFC' \| 'ICICI' \| 'SBI' \| 'AXIS' \| 'KOTAK'` | 200 in each case; `payment.bank` matches |
| PAY-API-CAP-N-02 | Missing bank | `{}` | 400 `"bank required"` |
| PAY-API-CAP-N-03 | Bank lowercase | `bank: 'hdfc'` | 400 `"bank must be one of HDFC, ICICI, SBI, AXIS, KOTAK"` |
| PAY-API-CAP-N-04 | Unknown bank | `bank: 'YESBANK'` | 400 same as above |
| PAY-API-CAP-N-05 | Bank as array | `bank: ['HDFC']` | 400 |
| PAY-API-CAP-N-06 | Bank with whitespace | `bank: ' HDFC '` | 400 |

### 3.5 Wallet capture

| # | Title | Body | Expected |
|---|---|---|---|
| PAY-API-CAP-W-01 | Each supported wallet + valid OTP | `wallet ∈ {paytm, phonepe, gpay, amazonpay}`, `otp: '123456'` | 200 in each case; `payment.wallet` saved |
| PAY-API-CAP-W-02 | Missing wallet | `{ otp: '1234' }` | 400 `"wallet required"` |
| PAY-API-CAP-W-03 | Unknown wallet | `wallet: 'mobikwik', otp: '1234'` | 400 `"wallet must be one of paytm, phonepe, gpay, amazonpay"` |
| PAY-API-CAP-W-04 | Wallet uppercase | `wallet: 'Paytm'` | 400 |
| PAY-API-CAP-W-05 | Missing OTP | `{ wallet: 'paytm' }` | 400 `"otp (4-6 digits) required"` |
| PAY-API-CAP-W-06 | OTP 3 digits | `otp: '123'` | 400 |
| PAY-API-CAP-W-07 | OTP 7 digits | `otp: '1234567'` | 400 |
| PAY-API-CAP-W-08 | OTP 4 digits boundary | `otp: '1234'` | 200 |
| PAY-API-CAP-W-09 | OTP 6 digits boundary | `otp: '123456'` | 200 |
| PAY-API-CAP-W-10 | OTP non-numeric | `otp: 'abcd'` | 400 |
| PAY-API-CAP-W-11 | OTP with spaces | `otp: '12 34'` | 400 |

### 3.6 COD capture

| # | Title | Body | Expected |
|---|---|---|---|
| PAY-API-CAP-COD-01 | Capture COD | `{}` (no fields needed) | 200; `status='pending_collection'`; `capturedAt=null` |
| PAY-API-CAP-COD-02 | COD ignores card fields | `{ cardNumber: '4111…', cvv: '123', expiry: '12/30' }` | 200 pending_collection; `last4` not set |
| PAY-API-CAP-COD-03 | COD ignores UPI/wallet/bank | any extra fields | 200 pending_collection |
| PAY-API-CAP-COD-04 | COD `capturedAt` stays null | — | `payment.capturedAt === null` |

### 3.7 State guards on capture

| # | Title | Setup | Action | Expected |
|---|---|---|---|---|
| PAY-API-CAP-G-01 | Capture twice | Captured already | Capture again | 400 `"Cannot capture payment in captured state"` |
| PAY-API-CAP-G-02 | Capture after fail | Marked failed | Capture | 400 `"Cannot capture payment in failed state"` |
| PAY-API-CAP-G-03 | Capture after refund | Refunded | Capture | 400 `"Cannot capture payment in refunded state"` |
| PAY-API-CAP-G-04 | Capture after partial refund | Partially refunded | Capture | 400 `"Cannot capture payment in partially_refunded state"` |
| PAY-API-CAP-G-05 | Capture COD again after pending_collection | pending_collection | Capture | 400 `"Cannot capture payment in pending_collection state"` |
| PAY-API-CAP-G-06 | Empty body to capture | created card intent | `POST /:id/capture` no body | 400 `"cardNumber, cvv and expiry required"` (does not crash on `req.body || {}`) |

---

## 4. `POST /api/payments/:id/fail` — mark failed

| # | Title | Setup | Body | Expected |
|---|---|---|---|---|
| PAY-API-F-01 | Fail a created payment | created | `{ reason: 'gateway timeout' }` | 200; `status='failed'`; `failureReason='gateway timeout'`; `failedAt` ≈ now |
| PAY-API-F-02 | Fail a captured payment | captured | `{ reason: 'chargeback' }` | 200; `status='failed'` |
| PAY-API-F-03 | Cannot fail pending_collection | COD captured | `{ reason: 'x' }` | 400 `"Cannot fail payment in pending_collection state"` |
| PAY-API-F-04 | Cannot fail already-failed | failed | `{ reason: 'x' }` | 400 `"Cannot fail payment in failed state"` |
| PAY-API-F-05 | Cannot fail refunded | refunded | `{ reason: 'x' }` | 400 `"Cannot fail payment in refunded state"` |
| PAY-API-F-06 | Cannot fail partially_refunded | partially_refunded | `{ reason: 'x' }` | 400 `"Cannot fail payment in partially_refunded state"` |
| PAY-API-F-07 | Missing reason | created | `{}` | 400 `"reason required"` |
| PAY-API-F-08 | Empty-string reason | created | `{ reason: '' }` | 400 `"reason required"` (falsy) |
| PAY-API-F-09 | Whitespace reason | created | `{ reason: '   ' }` | 200 — controller does not trim; documents lenient behavior |
| PAY-API-F-10 | Reason as object | created | `{ reason: { msg: 'x' } }` | 200 — stored as object (no validation); flag as risk |
| PAY-API-F-11 | XSS in reason | created | `{ reason: '<script>alert(1)</script>' }` | 200 — stored verbatim; consumers must escape on render |
| PAY-API-F-12 | Unknown payment | — | `POST /999/fail` | 404 `"Payment not found"` |
| PAY-API-F-13 | Lookup by transactionId | created | `POST /TXN-…/fail` | 200 |

---

## 5. `POST /api/payments/:id/refund` — full & partial refunds

### 5.1 Allowed source states

| # | Title | Setup | Body | Expected |
|---|---|---|---|---|
| PAY-API-RF-S-01 | Refund created intent | status=created | `{}` | 400 `"Cannot refund payment in created state"` |
| PAY-API-RF-S-02 | Refund pending_collection | COD pending | `{}` | 400 `"Cannot refund payment in pending_collection state"` |
| PAY-API-RF-S-03 | Refund failed | failed | `{}` | 400 `"Cannot refund payment in failed state"` |
| PAY-API-RF-S-04 | Refund captured (full default) | captured ₹1000 | `{}` | 201; refund amount=1000; payment `status='refunded'`; `refundedAmount=1000` |
| PAY-API-RF-S-05 | Refund refunded again | already refunded | `{}` | 400 `"Cannot refund payment in refunded state"` |
| PAY-API-RF-S-06 | Refund partially_refunded again | partially refunded ₹400 of ₹1000 | `{ amount: 600 }` | 201; status flips to `refunded`; `refundedAmount=1000`. (Note: refund is allowed only when `status==='captured'`, so a second partial refund is **rejected**: 400 `"Cannot refund payment in partially_refunded state"`. Lock this behavior in test — second refund cannot happen via API.) |

### 5.2 Amount validation

| # | Title | Setup (captured ₹1000) | Body | Expected |
|---|---|---|---|---|
| PAY-API-RF-A-01 | Default refund = full amount | — | `{}` | 201; `refund.amount=1000`; `payment.status='refunded'` |
| PAY-API-RF-A-02 | Explicit full | — | `{ amount: 1000 }` | 201; `payment.status='refunded'` |
| PAY-API-RF-A-03 | Partial < full | — | `{ amount: 400 }` | 201; `payment.status='partially_refunded'`; `refundedAmount=400` |
| PAY-API-RF-A-04 | Partial = 1 (minimum positive) | — | `{ amount: 1 }` | 201 |
| PAY-API-RF-A-05 | Zero amount | — | `{ amount: 0 }` | 400 `"amount must be a positive number"` |
| PAY-API-RF-A-06 | Negative amount | — | `{ amount: -10 }` | 400 |
| PAY-API-RF-A-07 | Amount as string | — | `{ amount: '500' }` | 400 (typeof check) |
| PAY-API-RF-A-08 | Amount NaN | — | `{ amount: NaN }` | 400 |
| PAY-API-RF-A-09 | Amount > captured | — | `{ amount: 2000 }` | 400 `"Refund exceeds refundable amount (1000)"` |
| PAY-API-RF-A-10 | Floating point amount | — | `{ amount: 99.99 }` | 201; stored verbatim |
| PAY-API-RF-A-11 | `amount: null` uses default | — | `{ amount: null }` | 201; defaults to refundable (`amount ?? refundable`) |
| PAY-API-RF-A-12 | `amount: undefined` uses default | — | `{ amount: undefined }` | 201; defaults to refundable |

### 5.3 Lifecycle / cumulative

> Note: the controller only allows refund when `payment.status === 'captured'`, so multiple partial refunds via the live API are not possible after the first partial flips status to `partially_refunded`. The scenarios below cover both the **as-implemented** behavior and any **regression** if that guard is loosened.

| # | Title | Setup | Action | Expected |
|---|---|---|---|---|
| PAY-API-RF-L-01 | First partial then second partial blocked | captured ₹1000; refund ₹400 | second refund `{ amount: 300 }` | 400 `"Cannot refund payment in partially_refunded state"` |
| PAY-API-RF-L-02 | Refund metadata persisted | captured ₹1000; refund ₹1000 | `GET /refunds?transactionId=TXN-…` | 200; one refund with same `transactionId`, `amount=1000` |
| PAY-API-RF-L-03 | `refundId` format | — | — | matches `/^RFND-\d+-\d+$/` |
| PAY-API-RF-L-04 | Sequential refund `id` | two refunds across two payments | — | `id` increments globally (`refunds.length + 1`) |
| PAY-API-RF-L-05 | `refundedAmount` updates payment | refund ₹400 | `GET /:id` | `payment.refundedAmount=400`; `status='partially_refunded'` |
| PAY-API-RF-L-06 | Refund status field | — | — | `refund.status='processed'` |
| PAY-API-RF-L-07 | `reason` optional | — | `{ amount: 100 }` | 201; `refund.reason=null` |
| PAY-API-RF-L-08 | `reason` provided | — | `{ amount: 100, reason: 'returned' }` | 201; `refund.reason='returned'` |

### 5.4 Identification & errors

| # | Title | Request | Expected |
|---|---|---|---|
| PAY-API-RF-E-01 | Unknown payment | `POST /99999/refund` | 404 `"Payment not found"` |
| PAY-API-RF-E-02 | Refund by transactionId | `POST /TXN-…/refund` | 201 if captured |
| PAY-API-RF-E-03 | Refund body absent | captured payment; no body | 201 (defaults to full refund) |
| PAY-API-RF-E-04 | Garbage extra fields | `{ amount: 100, foo: 'bar' }` | 201; `refund` object excludes `foo` |

---

## 6. `GET /api/payments/:id/verify`

| # | Title | Setup | Request | Expected |
|---|---|---|---|---|
| PAY-API-V-01 | Verify created | created intent | `GET /:id/verify` | 200; body contains `transactionId`, `status='created'`, `amount`, `currency`, `method`, `capturedAt=null`, `failureReason=null` |
| PAY-API-V-02 | Verify captured card | captured | — | `status='captured'`, `capturedAt` set |
| PAY-API-V-03 | Verify pending_collection (COD) | COD captured | — | `status='pending_collection'`, `capturedAt=null` |
| PAY-API-V-04 | Verify failed | failed | — | `status='failed'`, `failureReason` populated |
| PAY-API-V-05 | Verify refunded | refunded | — | `status='refunded'` |
| PAY-API-V-06 | Verify partially_refunded | — | — | `status='partially_refunded'` |
| PAY-API-V-07 | Verify by transactionId | — | `GET /TXN-…/verify` | Same body as numeric id |
| PAY-API-V-08 | Verify unknown id | — | `GET /999/verify` | 404 `"Payment not found"` |
| PAY-API-V-09 | Verify response shape | — | — | Response is a strict subset (no `cardNumber`, no `cvv`, no `last4` or `upiId` exposed via this endpoint) |
| PAY-API-V-10 | Verify is read-only | — | Verify twice | Both responses identical; `payments` state unchanged |
| PAY-API-V-11 | Concurrent verify safe | 100 parallel verifies | — | All 200; same body |

---

## 7. `GET /api/payments/:id`

| # | Title | Setup | Request | Expected |
|---|---|---|---|---|
| PAY-API-G-01 | Get by id | created | `GET /1` | 200; full record returned (incl. `id`, `transactionId`, `createdAt`, …) |
| PAY-API-G-02 | Get by transactionId | created | `GET /TXN-…` | 200; same record |
| PAY-API-G-03 | Get unknown | — | `GET /9999` | 404 `"Payment not found"` |
| PAY-API-G-04 | Get returns method-specific fields | captured card | — | `last4` present; no `cardNumber` or `cvv` ever stored |
| PAY-API-G-05 | Get returns wallet/bank/upi when set | captured wallet/bank/upi | — | only the relevant fields (`wallet` or `bank` or `upiId`) populated |
| PAY-API-G-06 | Get returns refundedAmount | partially refunded | — | `refundedAmount` reflects total refunded |
| PAY-API-G-07 | Get returns failureReason | failed | — | `failureReason` and `failedAt` populated |
| PAY-API-G-08 | Routing collision with `/refunds` | — | `GET /refunds` | Routes to `listRefunds` (defined before `:id`); does not 404 as "Payment not found" |
| PAY-API-G-09 | Routing collision with `/methods` | — | `GET /methods` | Routes to `listMethods` |

---

## 8. `GET /api/payments` — list & filter

| # | Title | Setup | Query | Expected |
|---|---|---|---|---|
| PAY-API-L-01 | Empty list | reset state | `GET /` | 200; `{ payments: [], total: 0 }` |
| PAY-API-L-02 | All payments | 3 intents created | `GET /` | 200; `total=3`; `payments.length=3` |
| PAY-API-L-03 | Filter by `status=created` | mixed states | `?status=created` | Only `created` returned |
| PAY-API-L-04 | Filter by `status=captured` | — | `?status=captured` | Only `captured` |
| PAY-API-L-05 | Filter by `status=pending_collection` | COD captured | `?status=pending_collection` | matches |
| PAY-API-L-06 | Filter by `status=failed` | failed payment | `?status=failed` | matches |
| PAY-API-L-07 | Filter by `status=refunded` | refunded | `?status=refunded` | matches |
| PAY-API-L-08 | Filter by `status=partially_refunded` | partial refund | `?status=partially_refunded` | matches |
| PAY-API-L-09 | Unknown status | — | `?status=foo` | 200; `total=0` (no error) |
| PAY-API-L-10 | Filter by `method` | mix of card/upi/cod | `?method=card` | only card payments |
| PAY-API-L-11 | Filter by `orderId` (number) | intents with orderId 101 / 102 | `?orderId=101` | only intent for 101; comparison is `String(p.orderId)===String(orderId)` |
| PAY-API-L-12 | Filter by `orderId` (string) | orderId stored as `'ORD-1'` | `?orderId=ORD-1` | matches |
| PAY-API-L-13 | Filter mixing `status` + `method` | — | `?status=captured&method=upi` | intersection |
| PAY-API-L-14 | Filter with no matches | — | `?status=captured&method=cod` (COD never reaches captured) | `total=0` |
| PAY-API-L-15 | Empty query string | — | `?` | 200; full list |
| PAY-API-L-16 | Unknown query keys ignored | — | `?foo=bar` | 200; full list (no filtering) |
| PAY-API-L-17 | No pagination implemented | 1000 intents | — | 200; all 1000 returned (document; flag as future risk) |

---

## 9. `GET /api/payments/refunds` — list refunds

| # | Title | Setup | Query | Expected |
|---|---|---|---|---|
| PAY-API-LRF-01 | Empty | reset | — | `{ refunds: [], total: 0 }` |
| PAY-API-LRF-02 | All refunds | 2 refunds across 2 payments | — | `total=2` |
| PAY-API-LRF-03 | Filter by transactionId | — | `?transactionId=TXN-A` | only refunds for that txn |
| PAY-API-LRF-04 | Unknown transactionId | — | `?transactionId=NOPE` | `total=0` |
| PAY-API-LRF-05 | Refund record shape | — | — | `{ id, refundId, transactionId, amount, reason, status, createdAt }` |
| PAY-API-LRF-06 | refundId uniqueness | 2 refunds | — | distinct `refundId` values |
| PAY-API-LRF-07 | Order is creation order | 2 refunds | — | `refunds[0].id < refunds[1].id` |
| PAY-API-LRF-08 | Listing does not mutate state | — | call twice | identical responses |

---

## 10. End-to-end happy paths (integration)

| # | Title | Steps | Expected |
|---|---|---|---|
| PAY-API-E2E-01 | Card → capture → verify | `POST /intent` (card) → `POST /:id/capture` (valid card) → `GET /:id/verify` | All 2xx; verify shows `captured` with `capturedAt` |
| PAY-API-E2E-02 | UPI → capture → list | intent → capture (`user@bank`) → `GET /?method=upi&status=captured` | List contains the payment |
| PAY-API-E2E-03 | Netbanking → capture → fail attempt | intent → capture (HDFC) → `POST /:id/fail` `{ reason }` | Fails: 200; subsequent verify shows `failed` |
| PAY-API-E2E-04 | Wallet → capture → refund full | intent ₹500 wallet → capture → refund (no body) | Refund 201 ₹500; payment `refunded` |
| PAY-API-E2E-05 | COD → capture → verify | intent (cod) → capture → verify | `pending_collection`; `capturedAt=null` |
| PAY-API-E2E-06 | Card → capture → partial refund | intent ₹1000 → capture → refund ₹250 | refund 201 ₹250; payment `partially_refunded`; `refundedAmount=250` |
| PAY-API-E2E-07 | Failed retry creates new intent | intent → fail → POST `/intent` again | Old intent stays `failed`; new intent `created`; both visible in list |
| PAY-API-E2E-08 | Verify after every transition | created → captured → refunded | verify reflects each state correctly |

---

## 11. Concurrency & race conditions

| # | Title | Setup | Action | Expected |
|---|---|---|---|---|
| PAY-API-CC-01 | Two captures in parallel | One created intent | Two simultaneous `POST /:id/capture` | One succeeds (captured); the other returns 400 `"Cannot capture payment in captured state"` (in-memory store has no lock — flag race window) |
| PAY-API-CC-02 | Capture + fail race | — | parallel capture and fail | Outcome depends on order; ensure terminal state is consistent (`captured` then `failed`, OR `failed` then capture rejected) — never two terminal states |
| PAY-API-CC-03 | Two refunds in parallel | captured ₹1000 | parallel refund 600 + refund 600 | At most one succeeds for ₹600; the second sees status `partially_refunded` and is rejected. Both must NOT succeed and exceed refundable. |
| PAY-API-CC-04 | High-volume intent creation | 100 parallel `POST /intent` | — | 100 distinct `id`s and `transactionId`s; no duplicates |
| PAY-API-CC-05 | Long-running list while writes | concurrent intent creation + listing | — | Listing returns a consistent snapshot (no crash; may include or exclude in-flight items) |

---

## 12. Security & abuse

| # | Title | Request | Expected |
|---|---|---|---|
| PAY-API-SEC-01 | Path traversal in id | `GET /../../etc/passwd` | 404 (Express normalizes) |
| PAY-API-SEC-02 | NoSQL-style id | `GET /{"$gt":""}` | 404 (string match miss) |
| PAY-API-SEC-03 | XSS in `reason` | `POST /:id/fail` `{ reason: '<img src=x onerror=alert(1)>' }` | 200 stored verbatim; rendering responsibility on client (document) |
| PAY-API-SEC-04 | Oversized JSON body | 10 MB body to `/intent` | 413 from body parser (Express default limit 100kb) |
| PAY-API-SEC-05 | Prototype pollution attempt | `{ "__proto__": { polluted: true }, amount: 1, method: 'card' }` | 201; `Object.prototype.polluted` is undefined (Express body-parser ignores `__proto__`) — flag as regression test |
| PAY-API-SEC-06 | No auth required (current state) | All endpoints | Document as known gap — mounted without auth middleware in `app.js` |
| PAY-API-SEC-07 | Card data not echoed | `POST /:id/capture` happy path response | Response payment object excludes raw `cardNumber` / `cvv`; only `last4` present |
| PAY-API-SEC-08 | Refund cannot exceed remaining via repeated calls | partial refund attempts | Sum of successful refunds ≤ original `amount` (controller enforces via `refundable`) |
| PAY-API-SEC-09 | OTP not stored | wallet capture happy path | `payment.otp` is **not** persisted on the payment object (verify in `GET /:id`) |
| PAY-API-SEC-10 | Bank/UPI/wallet enums prevent injection | bank=`HDFC; DROP TABLE` | 400 |

---

## 13. Idempotency & replay

| # | Title | Setup | Action | Expected |
|---|---|---|---|---|
| PAY-API-ID-01 | No idempotency keys today | — | Same `POST /intent` twice | Two distinct intents (`id` differs) — document gap; recommend `Idempotency-Key` |
| PAY-API-ID-02 | Replay capture is rejected | captured | replay capture | 400 (state guard) — capture is effectively idempotent through the guard |
| PAY-API-ID-03 | Replay fail is rejected | failed | replay fail | 400 — fail is effectively idempotent |
| PAY-API-ID-04 | Replay refund partially safe | full refund | replay refund | 400 (state guard) — refund cannot double-charge |
| PAY-API-ID-05 | Verify is naturally idempotent | — | repeat verify | identical responses |

---

## 14. Cross-route interaction

| # | Title | Setup | Action | Expected |
|---|---|---|---|---|
| PAY-API-X-01 | Payment intent links to order | `POST /intent` with `orderId=101` | `GET /api/orders/101` | Order is unchanged by intent creation (current code does not back-link order → payment); document |
| PAY-API-X-02 | Cancel order with captured payment | order placed; payment captured; cancel order | (per `orderController.cancelOrder` behavior) | Cancel succeeds at order level; payment stays `captured` (no auto-refund). Test that explicit `POST /payments/:id/refund` is needed |
| PAY-API-X-03 | Checkout flow uses different `method` enum | `POST /api/checkout/payment` accepts the same 5 methods | Cross-check enum strings match | `card / upi / cod / netbanking / wallet` consistent across both modules |
| PAY-API-X-04 | Refund visible via order details | partial refund | (consumer) read order details | Refund total surfaces in UI per `payment-web-test-cases.md §12` |

---

## 15. State persistence & reset

| # | Title | Action | Expected |
|---|---|---|---|
| PAY-API-RST-01 | In-memory store survives within process | Create intent → list | Intent visible until process restart |
| PAY-API-RST-02 | Process restart clears store | Restart server | `GET /` returns empty |
| PAY-API-RST-03 | `_reset()` for tests | Call `paymentController._reset()` | Both `payments` and `refunds` arrays emptied; `id` counters reset (next id starts at 1 because `payments.length + 1`) |
| PAY-API-RST-04 | Reset between test suites | jest `beforeEach` calls `_reset()` | Tests are order-independent |

---

## 16. Performance / load (smoke)

| # | Title | Action | Expected |
|---|---|---|---|
| PAY-API-PERF-01 | 1k intents in < 1s | Loop create | All 201; p95 latency < 50 ms (in-memory) |
| PAY-API-PERF-02 | Listing 10k payments | After bulk create | Single response under reasonable size; no pagination today (flag) |
| PAY-API-PERF-03 | Memory growth | 100k intents + verifies | Memory bounded by stored objects; no leak per request |
| PAY-API-PERF-04 | Refund lookup linearity | 100k refunds | Filtering `?transactionId=…` is O(n); verify acceptable for test scale |

---

## 17. Response envelope & status codes (contract lock)

| Endpoint | Success status | Error status(es) | Body shape |
|---|---|---|---|
| `GET /methods`         | 200 | — | `{ methods, currencies, banks, wallets }` |
| `POST /intent`         | 201 | 400 | `{ message, payment }` / `{ error }` |
| `POST /:id/capture`    | 200 | 400, 404 | `{ message, payment }` / `{ error }` |
| `POST /:id/fail`       | 200 | 400, 404 | `{ message, payment }` / `{ error }` |
| `POST /:id/refund`     | 201 | 400, 404 | `{ message, refund, payment }` / `{ error }` |
| `GET /:id/verify`      | 200 | 404 | projection (no PII) / `{ error }` |
| `GET /:id`             | 200 | 404 | full payment / `{ error }` |
| `GET /`                | 200 | — | `{ payments, total }` |
| `GET /refunds`         | 200 | — | `{ refunds, total }` |

> Lock these in tests — if a handler ever switches between 200/201 or changes the envelope key (`payment` vs `data`), several integrations break.

---

## 18. Error message exact-match catalog

These exact strings are produced by the controller. Tests that match on substrings are brittle; prefer exact equality where feasible.

| Code path | Exact message |
|---|---|
| `createIntent` amount | `"amount must be a positive number"` |
| `createIntent` currency | `"currency must be one of INR, USD, EUR, GBP"` |
| `createIntent` method | `"method must be one of card, upi, cod, netbanking, wallet"` |
| `validateCard` missing | `"cardNumber, cvv and expiry required"` |
| `validateCard` number  | `"Invalid card number"` |
| `validateCard` cvv     | `"Invalid cvv"` |
| `validateCard` format  | `"expiry must be MM/YY"` |
| `validateCard` past    | `"Card expired"` |
| `validateUpi`          | `"Valid upiId required"` |
| Netbanking missing     | `"bank required"` |
| Netbanking invalid     | `"bank must be one of HDFC, ICICI, SBI, AXIS, KOTAK"` |
| Wallet missing         | `"wallet required"` |
| Wallet invalid         | `"wallet must be one of paytm, phonepe, gpay, amazonpay"` |
| Wallet OTP             | `"otp (4-6 digits) required"` |
| Capture wrong state    | ``"Cannot capture payment in ${status} state"`` |
| Fail wrong state       | ``"Cannot fail payment in ${status} state"`` |
| Fail missing reason    | `"reason required"` |
| Refund wrong state     | ``"Cannot refund payment in ${status} state"`` |
| Refund amount          | `"amount must be a positive number"` |
| Refund exceeds         | ``"Refund exceeds refundable amount (${refundable})"`` |
| Not found              | `"Payment not found"` |

---

## 19. Traceability

| Scenario block | Backend symbol(s) |
|---|---|
| §1 Methods           | `paymentController.listMethods` |
| §2 Intent            | `paymentController.createIntent` (validates amount/currency/method) |
| §3 Capture           | `paymentController.capture` + `validateCard` + `validateUpi` + bank/wallet enums |
| §4 Mark failed       | `paymentController.markFailed` |
| §5 Refund            | `paymentController.refund` (computes `alreadyRefunded`, `refundable`) |
| §6 Verify            | `paymentController.verify` (PII projection) |
| §7 Get payment       | `paymentController.getPayment` |
| §8 List payments     | `paymentController.listPayments` (filters `status`, `method`, `orderId`) |
| §9 List refunds      | `paymentController.listRefunds` (filter `transactionId`) |
| §11 Concurrency      | array-based store — flagged race windows |
| §15 Reset            | `paymentController._reset` |

---

## 20. Open gaps / recommendations (for product/eng review)

1. **No authentication / authorization** on `/api/payments/*` — any caller can capture/refund any payment.
2. **No idempotency keys** — duplicate intents create duplicate charges if upstream retries.
3. **No upper bound on `amount`** and `Infinity` is accepted.
4. **Floating-point amounts** are stored as JS numbers (precision risk for currency).
5. **No pagination** on list endpoints.
6. **`Infinity` / very large `amount`** passes validation.
7. **Refund guard is strict** (only `captured` → `*refunded`) — second partial refund is impossible via API; surface via refund flow design or relax the guard with cumulative checks.
8. **`reason` is not sanitized or length-limited** — XSS surface for any UI rendering it raw.
9. **No webhooks / events** emitted on state changes — downstream systems must poll `verify`.
10. **In-memory store** loses all data on restart and is not multi-instance safe.
