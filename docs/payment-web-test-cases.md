# ShopEase — Payment (Web UI) Functional Test Cases

Scope: functional test cases for making a payment through the **web UI** (customer-facing storefront checkout). These are end-user interaction tests, not API tests. Backend contract reference: `src/controllers/paymentController.js` and routes under `/api/payments`.

**Pages exercised:**
- Checkout — Payment step — `/checkout/payment`
- Payment processing (3DS / OTP / redirect) — `/checkout/payment/processing`
- Payment success — `/checkout/payment/success`
- Payment failure — `/checkout/payment/failed`
- My Orders → Order Details (payment section) — `/account/orders/:id`
- Refund status (in order details)

**Supported methods:** `card`, `upi`, `cod`, `netbanking`, `wallet`.
**Supported currencies:** `INR`, `USD`, `EUR`, `GBP`.
**Supported banks (netbanking):** `HDFC`, `ICICI`, `SBI`, `AXIS`, `KOTAK`.
**Supported wallets:** `paytm`, `phonepe`, `gpay`, `amazonpay`.
**Payment states:** `created → captured | pending_collection | failed`, and `captured → partially_refunded | refunded`.

---

## 1. Payment method selection

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-M-01 | All supported methods listed | Cart has items; on payment step | Observe method list | Card, UPI, COD, Netbanking, Wallet are all visible and selectable |
| PAY-W-M-02 | Default method selection | First visit to payment step | — | A default method is pre-selected (e.g. Card); Pay button reflects the matching label |
| PAY-W-M-03 | Switching methods clears previous inputs | Enter card details → switch to UPI | — | Card fields are hidden and cleared; UPI input shown; no stale card data is submitted |
| PAY-W-M-04 | Unsupported method blocked client-side | Tamper DOM to select `crypto` | Click Pay | Client validation rejects; no request sent; generic "Select a supported method" error |
| PAY-W-M-05 | Method availability by currency | Switch currency to USD | — | COD hidden (domestic-only); UPI hidden; only globally-supported methods shown |
| PAY-W-M-06 | Method availability by amount | Cart total is very low (e.g. ₹1) or very high (e.g. ₹5,00,000) | — | Methods outside min/max limits are disabled with a tooltip explaining the limit |
| PAY-W-M-07 | Saved cards shown (if feature on) | Returning user with saved card | — | Saved card appears as a choice; unsaved "New card" is still available |

---

## 2. Card payment

| # | Title | Pre-conditions | Input | Expected |
|---|---|---|---|---|
| PAY-W-C-01 | Valid card — happy path | Method=card | `4111111111111111`, CVV `123`, expiry `12/30` | Intent created → captured; redirect to success; last4 displayed |
| PAY-W-C-02 | Card number too short | — | `411111` | Inline error "Invalid card number"; Pay disabled |
| PAY-W-C-03 | Card number too long | — | 20-digit number | Input caps at 19 digits; inline error if exceeded |
| PAY-W-C-04 | Card number with letters | — | `4111abcd1111` | Non-digit characters rejected by input mask |
| PAY-W-C-05 | CVV invalid length | — | `12` or `12345` | Inline error "Invalid cvv" |
| PAY-W-C-06 | Expiry format wrong | — | `13/30` or `2030-12` | Inline error "expiry must be MM/YY" |
| PAY-W-C-07 | Expired card | — | expiry `01/20` | Inline error "Card expired"; payment not created |
| PAY-W-C-08 | Missing required field | — | Leave CVV blank | Inline error "cardNumber, cvv and expiry required"; submit disabled |
| PAY-W-C-09 | Autofill support | Browser autofill on | Trigger autofill | Number, expiry, CVV populate correctly; no extra whitespace |
| PAY-W-C-10 | Card brand detection | Enter `4111…` vs `5555…` | — | Brand icon updates (Visa vs Mastercard) as user types |
| PAY-W-C-11 | Masked card display | After capture | — | Only last 4 digits shown; full PAN never rendered |
| PAY-W-C-12 | CVV is never echoed | Submit then back-navigate | — | CVV field is empty on return; never stored client-side |

---

## 3. UPI payment

| # | Title | Pre-conditions | Input | Expected |
|---|---|---|---|---|
| PAY-W-U-01 | Valid UPI id — happy path | Method=upi | `user@okicici` | Capture succeeds; success screen shows masked UPI id |
| PAY-W-U-02 | Missing UPI id | — | blank | Inline error "Valid upiId required" |
| PAY-W-U-03 | Malformed UPI id | — | `user-okicici` (no `@`) | Inline error "Valid upiId required" |
| PAY-W-U-04 | Non-ASCII UPI id | — | `उपयोगकर्ता@okicici` | Rejected per regex; inline error |
| PAY-W-U-05 | UPI QR option | Method=upi | Choose "Pay via QR" | QR code rendered; polling starts; on success → success screen |
| PAY-W-U-06 | UPI collect-request timeout | Method=upi | Wait past timeout | Status flips to failed; page offers "Retry" or "Change method" |

---

## 4. Netbanking

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-N-01 | Valid bank — happy path | Method=netbanking | Select HDFC → Pay | Redirect to bank simulation → return → capture succeeds |
| PAY-W-N-02 | No bank selected | — | Click Pay without picking bank | Inline error "bank required"; Pay not submitted |
| PAY-W-N-03 | Unsupported bank tampered | DOM-tamper value to `FOO` | Pay | Request rejected with "bank must be one of HDFC, ICICI, SBI, AXIS, KOTAK" |
| PAY-W-N-04 | Bank list ordering | — | Open bank dropdown | Supported banks shown in documented order with logos |
| PAY-W-N-05 | Return from bank — success | After bank OTP success | — | User lands on `/checkout/payment/success`; order marked paid |
| PAY-W-N-06 | Return from bank — user cancels | Cancel on bank page | — | User lands on `/checkout/payment/failed`; reason "Cancelled by user"; retry offered |
| PAY-W-N-07 | Return from bank — timeout | No response from bank | — | Payment marked failed with reason "Bank timeout" |

---

## 5. Wallet payment

| # | Title | Pre-conditions | Input | Expected |
|---|---|---|---|---|
| PAY-W-WA-01 | Valid wallet + OTP | Method=wallet | wallet=`paytm`, otp=`123456` | Capture succeeds |
| PAY-W-WA-02 | Missing wallet | — | otp only | Inline error "wallet required" |
| PAY-W-WA-03 | Unsupported wallet tampered | DOM-tamper | wallet=`mobikwik` | Error "wallet must be one of paytm, phonepe, gpay, amazonpay" |
| PAY-W-WA-04 | Missing OTP | Method=wallet | otp blank | Error "otp (4-6 digits) required" |
| PAY-W-WA-05 | OTP too short | — | otp=`12` | Error "otp (4-6 digits) required" |
| PAY-W-WA-06 | OTP too long | — | otp=`1234567` | Input capped at 6 digits or inline error |
| PAY-W-WA-07 | OTP non-numeric | — | otp=`abcd` | Non-digit rejected by mask |
| PAY-W-WA-08 | Resend OTP | On OTP screen | Click "Resend OTP" | New OTP requested; countdown starts; "Resend" disabled until expiry |

---

## 6. COD (Cash on Delivery)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-COD-01 | COD selectable for eligible address | Address is COD-eligible | Select COD → Pay | Payment state becomes `pending_collection`; order is placed; success screen shows "Pay on delivery" |
| PAY-W-COD-02 | COD hidden for ineligible pincode | Pincode not eligible | — | COD option absent; tooltip "COD not available for this address" |
| PAY-W-COD-03 | COD for cart over limit | Cart total > COD max | — | COD disabled with reason |
| PAY-W-COD-04 | COD order details | After PAY-W-COD-01 | Open order details | Payment section shows "Pending collection"; no last4/UPI displayed |
| PAY-W-COD-05 | COD cannot be refunded before capture | Order in pending_collection | Attempt refund via UI (admin side) | Blocked — refund only for captured payments |

---

## 7. Submitting a payment (happy path — any method)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-S-01 | Pay button reflects amount & currency | Cart total ₹1,299 INR | — | Button reads "Pay ₹1,299.00" (or localized format) |
| PAY-W-S-02 | Loading state on submit | Valid inputs | Click Pay | Button shows spinner + label "Processing…"; all form fields disabled |
| PAY-W-S-03 | Success redirect | After capture | — | Redirect to `/checkout/payment/success`; order id and txn id visible |
| PAY-W-S-04 | Order created only after capture | Method=card | Capture succeeds | Order exists with status `placed`; payment linked via `orderId` |
| PAY-W-S-05 | Receipt / download | On success screen | Click "Download receipt" | PDF or HTML receipt downloads with amount, method, txn id, last4/UPI masked |
| PAY-W-S-06 | Email confirmation | On success | — | Confirmation email queued; UI hints "We sent a receipt to <email>" |
| PAY-W-S-07 | Back navigation after success | After success screen | Browser Back | Does not re-submit payment; user lands on order details or Orders list |
| PAY-W-S-08 | Hard refresh after success | Success screen loaded | Reload | Page still shows success; no duplicate payment created |

---

## 8. Amount, currency, and totals

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-A-01 | Amount matches cart | Cart total ₹1,299 | — | Payment intent `amount=1299`, `currency=INR` |
| PAY-W-A-02 | Zero / negative amount blocked | Tamper total | Submit | Error "amount must be a positive number"; no intent created |
| PAY-W-A-03 | Currency switcher updates amount | Switch INR → USD | — | Total recomputed using FX rate; payment intent carries the new currency |
| PAY-W-A-04 | Unsupported currency | Tamper currency to `JPY` | Submit | Error "currency must be one of INR, USD, EUR, GBP" |
| PAY-W-A-05 | Decimal precision | Total ₹99.99 | Submit | Amount sent as `99.99`; success screen formats with 2 decimals |
| PAY-W-A-06 | Discount applied before pay | Apply coupon at previous step | Open payment step | Displayed total = subtotal − discount + tax + shipping; Pay button reflects final amount |
| PAY-W-A-07 | Tax/shipping breakdown visible | — | Expand "Total" tooltip | Subtotal, tax, shipping, discount each listed |

---

## 9. Disallowed state transitions (guardrails)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-G-01 | Capture an already-captured payment | Payment already captured | Replay capture (e.g. retry POST) | Error "Cannot capture payment in captured state"; UI shows "Payment already processed" |
| PAY-W-G-02 | Capture a failed payment | Payment status=failed | Attempt capture via direct link | Error "Cannot capture payment in failed state"; offered "Start a new payment" |
| PAY-W-G-03 | Capture a refunded payment | status=refunded | Attempt capture | Error "Cannot capture payment in refunded state" |
| PAY-W-G-04 | Fail an already-failed payment | status=failed | Fail again | Error "Cannot fail payment in failed state" |
| PAY-W-G-05 | Refund a non-captured payment | status=created or pending_collection | Request refund | Error "Cannot refund payment in created state" (or equivalent) |
| PAY-W-G-06 | Refund exceeds remaining | Already partially refunded | Refund full again | Error "Refund exceeds refundable amount (X)" |
| PAY-W-G-07 | Unknown payment id | id does not exist | Open `/payments/:id` UI | 404 page "Payment not found"; link back to Orders |

---

## 10. Error handling

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-E-01 | Network offline at submit | Disable network | Click Pay | Inline error "Network error — check your connection and retry"; button re-enables; no intent created |
| PAY-W-E-02 | 500 on intent | Stub `/payments/intent` → 500 | Click Pay | Error "Something went wrong. Please try again."; retry possible |
| PAY-W-E-03 | 500 on capture | Intent created; capture 500 | — | Page shows "Payment could not be completed"; "Retry" calls capture only (not intent) |
| PAY-W-E-04 | 400 validation from server | Force invalid expiry | — | Server error shown near field; focus returns to the faulty field |
| PAY-W-E-05 | 401 session expired | Token expired | Click Pay | Redirect to login; on return, user lands on payment step with cart intact (no auto-resubmit) |
| PAY-W-E-06 | Double-click Pay | — | Rapidly click Pay twice | Only one intent + one capture request; button disabled between click and response |
| PAY-W-E-07 | Slow network — 30s timeout | Throttle to 3G | Click Pay | Spinner remains; user not allowed to double-submit; on eventual response, outcome reconciles |
| PAY-W-E-08 | Capture timeout — reconcile via verify | Capture request timed out | App polls `verify` | If server reports captured, UI flips to success; if still created, offers retry |
| PAY-W-E-09 | Browser back during processing | Mid-capture | Click Back | App warns "Payment in progress — leaving may not cancel it"; confirmation required |
| PAY-W-E-10 | Tab close during processing | Mid-capture | Close tab | Server outcome is authoritative; reopening Orders shows the true status (failed or captured) |

---

## 11. Retry after failure

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-R-01 | Retry same method | Failed screen | Click "Retry payment" | Returns to payment step with method preselected; inputs cleared |
| PAY-W-R-02 | Switch method after failure | Failed card payment | Choose UPI → Pay | New intent created; old intent unchanged in state `failed` |
| PAY-W-R-03 | Failure reason shown | Failed screen | — | Reason text visible (e.g. "Card declined by issuer") without raw stack info |
| PAY-W-R-04 | Retry count limit (if any) | N failed attempts | N+1th try | If rate-limit in place, UI shows "Too many attempts — try again in X min" |
| PAY-W-R-05 | Order lifecycle on failure | Capture failed | — | Order is not created OR order stays in pending payment state per spec; no stock decrement |

---

## 12. Refunds (viewed from order details)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-RF-01 | Full refund after cancel | Order cancelled; payment captured | Observe payment section | Status "Refunded"; amount matches payment; refund id displayed |
| PAY-W-RF-02 | Partial refund after return | Customer returned 1 of 2 items | — | Status "Partially refunded"; refunded amount < paid amount; both totals shown |
| PAY-W-RF-03 | Multiple partial refunds add up | Two partial refunds processed | — | UI lists both refund entries with dates; total refunded equals sum |
| PAY-W-RF-04 | Refund not offered on COD pre-collection | COD, not yet delivered | Cancel order | No refund record; UI shows "No payment was collected" |
| PAY-W-RF-05 | Refund timeline copy | Refund processed | — | UI shows "Refund will reflect in 5–7 business days" (or configured copy) |

---

## 13. Payment status in Order Details

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-O-01 | Captured payment | Order paid online | Open `/account/orders/:id` | Payment section shows method, last4/UPI/bank/wallet, amount, status "Paid", capturedAt time |
| PAY-W-O-02 | Pending collection (COD) | COD order | — | Shows "Pay on delivery" with expected amount |
| PAY-W-O-03 | Failed payment | Last attempt failed | — | Shows "Payment failed" with reason; CTA to retry (if order retains a payment window) |
| PAY-W-O-04 | Refunded | After refund | — | Shows "Refunded" with refund id and date |
| PAY-W-O-05 | Partially refunded | After partial refund | — | Shows "Partially refunded (X of Y)" |
| PAY-W-O-06 | Timestamp localization | — | Hover time | Tooltip shows ISO time; display uses user locale/time zone |

---

## 14. Visual feedback & messaging

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-VF-01 | Field-level errors inline | Invalid card | — | Errors attached to the relevant field; not only as toast |
| PAY-W-VF-02 | Form-level error banner | Server 500 | — | Non-dismissible banner at top of form until retry |
| PAY-W-VF-03 | Success toast | Captured | — | Toast "Payment successful"; auto-dismiss ≈ 5s |
| PAY-W-VF-04 | Status badge color & contrast | — | Inspect badges | Paid/Failed/Refunded badges each use distinct color + icon; ≥ 4.5:1 contrast |
| PAY-W-VF-05 | Amount is prominent | On payment step | — | Amount + currency visually dominant on Pay button and summary panel |
| PAY-W-VF-06 | Secure-pay trust markers | — | — | Lock icon, "Secure payment" text, supported-card logos are visible |

---

## 15. Navigation & deep-linking

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-N-01 | Deep link to payment step | Cart has items | Open `/checkout/payment` directly | Step renders; cart summary loaded from server |
| PAY-W-N-02 | Deep link with empty cart | No cart | Open `/checkout/payment` | Redirect to `/cart` with banner "Your cart is empty" |
| PAY-W-N-03 | Deep link to success for other user | Guest | Open `/checkout/payment/success?txn=…` | 403 or redirect to login; no payment data leaks |
| PAY-W-N-04 | Deep link to failed screen | — | Open `/checkout/payment/failed?txn=unknown` | Generic failure page; no txn details from guessed ids |
| PAY-W-N-05 | Browser Back from payment step | On payment step | Back | Returns to address/shipping step; data intact |
| PAY-W-N-06 | Reload during processing | Intent captured in-flight | Reload | App calls `verify` to reconcile; shows the true outcome |

---

## 16. Concurrency & session edge cases

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-CC-01 | Two tabs, same cart | Payment step open in Tab A and Tab B | Pay in Tab A → attempt Pay in Tab B | Tab B detects the captured order and blocks duplicate charge with message |
| PAY-W-CC-02 | Cart changes during payment | Another tab edits cart mid-flow | Click Pay | App revalidates total; if changed, payment blocked with "Your cart was updated" |
| PAY-W-CC-03 | Logout during payment | Logout in other tab | Click Pay | 401 flow per PAY-W-E-05 |
| PAY-W-CC-04 | Admin cancel before capture | Admin cancels order while intent exists | User clicks Pay | Capture is rejected; UI shows "Order no longer available" |
| PAY-W-CC-05 | Session timeout on processing screen | Token expires mid-capture | — | After re-login, `verify` shows final state; UI reconciles |

---

## 17. Accessibility (a11y)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-A-01 | Keyboard-only flow | Cart ready | Tab through method tabs → fill card → Enter on Pay | Entire payment completes without a mouse; focus ring visible |
| PAY-W-A-02 | Method switcher ARIA | — | Inspect DOM | Method tabs use `role="tablist"` / `role="tab"`; active tab announces correctly |
| PAY-W-A-03 | Field labels & descriptions | — | Inspect | Each input has `<label>` and `aria-describedby` linked to its error text |
| PAY-W-A-04 | Error announcement | Submit invalid | — | Screen reader announces errors via `aria-live="assertive"` on form errors |
| PAY-W-A-05 | Reduced motion | OS setting on | Open/close steps | No transform or scale animations; fades only |
| PAY-W-A-06 | Color-blind safe status | — | Observe badges | Status uses color + icon + text |
| PAY-W-A-07 | High-contrast mode | Windows High Contrast or forced-colors | — | Borders, buttons, and errors remain visible and distinguishable |

---

## 18. Responsive & cross-device

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-X-01 | Mobile viewport (≤ 375px) | iPhone SE | Full pay flow | Fields stack; numeric keyboard shown for card/UPI/OTP; Pay button sticky to bottom |
| PAY-W-X-02 | Tablet viewport | iPad | — | Two-column layout (form + summary); no overlap |
| PAY-W-X-03 | Desktop wide viewport (≥ 1920px) | — | — | Max-width content; summary panel aligned; no stretched inputs |
| PAY-W-X-04 | Touch targets | Mobile | — | All interactive targets ≥ 44×44 px |
| PAY-W-X-05 | Cross-browser parity | Chrome, Safari, Firefox, Edge | Full flow | Visual + functional parity; no console errors |
| PAY-W-X-06 | iOS Safari autofill (card) | Saved card in Wallet | Trigger autofill | Number/CVV/expiry populate; no focus trap breakage |
| PAY-W-X-07 | Android numeric keyboard | Mobile | Focus card/UPI/OTP | Numeric keypad opens; no alpha keys for numeric-only inputs |

---

## 19. Security (UI surface)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-SE-01 | CVV never stored / logged | Fill card → submit | Inspect devtools + localStorage | CVV not in storage, URL, or client logs |
| PAY-W-SE-02 | No full PAN in DOM post-submit | After capture | Inspect DOM | Only last4 visible |
| PAY-W-SE-03 | HTTPS enforced | — | Load `http://…/checkout/payment` | Forced to HTTPS |
| PAY-W-SE-04 | CSRF protection | — | Submit with bad/missing CSRF token | Request rejected; UI shows generic retry error |
| PAY-W-SE-05 | XSS via reason / UPI | Enter `<script>alert(1)</script>` in free-text fields | — | Escaped as plain text; no script execution |
| PAY-W-SE-06 | Clickjacking | Load page in iframe | — | X-Frame-Options / CSP `frame-ancestors` prevents embedding |
| PAY-W-SE-07 | Do-not-autocomplete CVV | Inspect | — | CVV field has `autocomplete="off"` (or equivalent per spec) |
| PAY-W-SE-08 | No sensitive data in analytics | Capture network | — | No PAN/CVV/OTP/UPI id sent to analytics providers |

---

## 20. Analytics & side-effects (if instrumented)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PAY-W-AN-01 | Method selected event | On payment step | Choose method | Event `payment_method_selected` with `{method}` |
| PAY-W-AN-02 | Payment submitted | Click Pay | — | Event `payment_submitted` with `{amount, currency, method}` (no PAN/CVV) |
| PAY-W-AN-03 | Payment succeeded | After capture | — | Event `payment_succeeded` with `{transactionId, orderId, amount, currency, method}` |
| PAY-W-AN-04 | Payment failed | After failure | — | Event `payment_failed` with `{reason, method}` |
| PAY-W-AN-05 | Refund viewed | Open order details | — | Event `refund_viewed` with `{orderId, refundId}` |
| PAY-W-AN-06 | No duplicates on retries | Per PAY-W-E-06 | — | Exactly one `payment_submitted` per unique click storm |

---

## 21. Content & copy

| # | Title | Expected |
|---|---|
| PAY-W-CO-01 | Step title | "Payment" |
| PAY-W-CO-02 | Pay button | "Pay {amount}" — primary styling |
| PAY-W-CO-03 | Method labels | "Credit/Debit Card", "UPI", "Netbanking", "Wallet", "Cash on Delivery" |
| PAY-W-CO-04 | Success screen | "Payment successful" + order id |
| PAY-W-CO-05 | Failure screen | "Payment failed" + reason + Retry CTA |
| PAY-W-CO-06 | COD confirmation | "You'll pay {amount} on delivery" |
| PAY-W-CO-07 | Refund timeline | "Refunds take 5–7 business days" (or spec copy) |
| PAY-W-CO-08 | Localization | All strings localized; currency formatted per locale |

---

## Traceability to API contract

| UI behavior | Backend endpoint / check | Source |
|---|---|---|
| Method list rendered | `GET /api/payments/methods` | `paymentController.listMethods` |
| Create payment intent | `POST /api/payments/intent` | `paymentController.createIntent` |
| Amount must be positive | 400 "amount must be a positive number" | `createIntent` |
| Unsupported currency | 400 "currency must be one of …" | `createIntent` |
| Unsupported method | 400 "method must be one of …" | `createIntent` |
| Capture card | `POST /api/payments/:id/capture` | `paymentController.capture` + `validateCard` |
| Capture UPI | `POST /api/payments/:id/capture` | `validateUpi` |
| Capture netbanking — bank required & allowed | 400 "bank required" / "bank must be one of …" | `capture` |
| Capture wallet — wallet + OTP required | 400 "wallet required" / "otp (4-6 digits) required" | `capture` |
| COD goes to pending_collection | state change | `capture` |
| Guard — capture in wrong state | 400 "Cannot capture payment in {status} state" | `capture` |
| Verify payment | `GET /api/payments/:id/verify` | `paymentController.verify` |
| Mark failed | `POST /api/payments/:id/fail` | `paymentController.markFailed` |
| Refund full/partial | `POST /api/payments/:id/refund` | `paymentController.refund` |
| Refund exceeds remaining | 400 "Refund exceeds refundable amount (X)" | `refund` |
| Unknown payment id | 404 "Payment not found" | `findPayment` miss |
