# ShopEase — Return a Product (Web UI) Functional Test Cases

Scope: end-user functional test cases for returning a delivered product via the **web UI** (customer storefront + return status tracking). These are UI tests, not API tests. Backend contract reference: `src/controllers/orderController.js` → `returnOrder`, `approveReturn`, `rejectReturn`, `issueRefund`, `getReturnStatus`.

**Pages exercised:**
- My Orders (list) — `/account/orders`
- Order Details — `/account/orders/:id`
- Return Request form — `/account/orders/:id/return`
- Return Status — `/account/orders/:id/return-status`
- Refund summary — rendered inside Return Status

**Eligibility rules (from backend):**
- Only orders with status `delivered` can be returned.
- Return window: **30 days** from `deliveredAt` (falls back to `createdAt` if `deliveredAt` missing).
- `reason` is **required**.
- After user submits → status `returned`. Admin can `approve` or `reject`. Approved returns can be refunded; rejected returns zero the refund.

---

## 1. Entry points & visibility of the Return control

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PR-W-V-01 | Return button visible for delivered order within 30d | Logged-in user; order #1 `status=delivered`, delivered 5 days ago | Open `/account/orders/1` | "Return Item(s)" button rendered, enabled, focusable |
| PR-W-V-02 | Return button hidden for placed order | `status=placed` | Open order details | No "Return" button; "Cancel Order" shown instead |
| PR-W-V-03 | Return button hidden for shipped order | `status=shipped` | Open order details | No "Return" button; tracking info shown |
| PR-W-V-04 | Return button hidden for cancelled order | `status=cancelled` | Open order details | No "Return" button; "Cancelled" badge shown |
| PR-W-V-05 | Return button hidden after window expiry | `status=delivered`, delivered 31 days ago | Open order details | "Return" button hidden or disabled; helper text "Return window expired on <date>" |
| PR-W-V-06 | Return button hidden once already returned | `status=returned` | Open order details | No "Return" button; link to "View return status" shown |
| PR-W-V-07 | Return action in Orders list row | Orders list includes a delivered, in-window order | Open `/account/orders` | Delivered rows have inline "Return" link/menu item |
| PR-W-V-08 | Guest user blocked | Not logged in | Visit `/account/orders/1/return` directly | Redirected to login; post-login lands on return page only if order belongs to user |
| PR-W-V-09 | Cross-user protection | Logged in as user B; order belongs to user A | Visit return URL | 404 / "Order not found"; no Return form |
| PR-W-V-10 | Days-left indicator | Delivered 25 days ago | Open order details | Return button badge / helper reads "5 days left to return" |

---

## 2. Return request form

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PR-W-F-01 | Form opens on click | Eligible order | Click "Return Item(s)" | Form page/modal opens with order summary, item list, reason field, optional comment, "Submit Return", "Cancel" |
| PR-W-F-02 | Order summary visible | Form open | — | Order ID, delivered-on date, items, total shown; matches order details |
| PR-W-F-03 | Reason is required | Form open | Leave reason empty → click Submit | Inline error "Please select a reason"; Submit stays enabled (or re-enables); no API call made |
| PR-W-F-04 | Reason dropdown options | Form open | Open reason selector | Predefined reasons present (e.g., "Damaged on arrival", "Wrong item", "Not as described", "No longer needed", "Other") |
| PR-W-F-05 | "Other" requires free-text | Select "Other" | Leave comment empty → Submit | Inline error "Please describe the issue" |
| PR-W-F-06 | Free-text length cap | Select "Other" | Paste 5000 chars | Capped at documented max (e.g. 500); counter reflects remaining characters |
| PR-W-F-07 | XSS safe | Reason comment: `<script>alert(1)</script>` | Submit | Treated as plain text; no script execution; rendered escaped on status page |
| PR-W-F-08 | Item-level selection (if partial return supported) | Multi-item order | Select subset of items | Submit carries only selected items; summary shows selected total |
| PR-W-F-09 | Quantity selector per item | Item qty=3 | Choose to return 2 | Selection reflected in summary; qty cannot exceed purchased |
| PR-W-F-10 | Photo/attachment upload (if supported) | Form open | Attach a JPG ≤ limit | Thumbnail shown; remove works |
| PR-W-F-11 | Attachment oversize | Form open | Attach 50 MB file | Inline error "File too large (max X MB)"; upload rejected client-side |
| PR-W-F-12 | Attachment unsupported type | Form open | Attach `.exe` | Inline error "Unsupported file type" |
| PR-W-F-13 | Cancel button closes form | Form open | Click "Cancel" | Returns to order details; no data submitted |
| PR-W-F-14 | Esc on modal | Modal variant open | Press Esc | Modal closes; data discarded |
| PR-W-F-15 | Navigate away with unsaved changes | Reason + comment filled | Click browser back | Browser prompt "Leave page? Unsaved return details"; Stay keeps data |

---

## 3. Submitting the return (happy path)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PR-W-S-01 | Submit delivered order within window | Eligible order, valid reason | Click Submit Return | Spinner on button; success toast "Return request submitted"; redirected to Return Status page |
| PR-W-S-02 | Order details updates | After PR-W-S-01 | Open `/account/orders/1` | Status badge reads "Return requested"; Return button removed; link to "View return status" |
| PR-W-S-03 | Orders list reflects status | After PR-W-S-01 | `/account/orders` | Row shows "Return requested" |
| PR-W-S-04 | Refund amount preview shown | After PR-W-S-01 | Return Status page | Displays expected refund = order total (initial state); "Pending approval" |
| PR-W-S-05 | Reason echoed on status page | — | Return Status page | Shows selected reason and comment |
| PR-W-S-06 | Timestamp rendered | — | Return Status page | `requestedAt` shown in user locale; tooltip shows ISO |
| PR-W-S-07 | Hard refresh retains state | After PR-W-S-01 | Reload | State persists from server |
| PR-W-S-08 | Browser Back after submit | After PR-W-S-01 | Back → Forward | No re-submission; no duplicate return requests |

---

## 4. Eligibility guardrails (direct URL / edge cases)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PR-W-G-01 | Direct URL for placed order | `status=placed` | Visit `/…/1/return` | Redirect to order details with banner "This order hasn't been delivered yet." |
| PR-W-G-02 | Direct URL for shipped order | `status=shipped` | Visit return URL | Redirect; banner "Shipped orders can be returned after delivery." |
| PR-W-G-03 | Direct URL for cancelled order | `status=cancelled` | Visit return URL | Redirect; banner "Cancelled orders cannot be returned." |
| PR-W-G-04 | Direct URL after window expired | delivered 31d+ ago | Visit return URL | Redirect; banner "Return window expired on <date>. Contact support if you need help." |
| PR-W-G-05 | Direct URL for already-returned order | `status=returned` | Visit return URL | Redirect to Return Status page |
| PR-W-G-06 | Unknown order id | no order #999 | Visit `/account/orders/999/return` | 404 page |
| PR-W-G-07 | Window expires mid-flow | Form open at day 29, cross midnight into day 31 | Click Submit | API 400 "Return window of 30 days has expired"; inline error; form stays with entered data so user can copy it |
| PR-W-G-08 | Exactly at 30-day boundary | delivered exactly 30 days ago | Open form and submit | Submit succeeds (boundary is inclusive per `daysSince > 30` strict check) |
| PR-W-G-09 | Just past boundary | delivered 30 days + 1 minute ago | Open form and submit | API 400; banner per PR-W-G-04 |

---

## 5. Return status tracking

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PR-W-T-01 | Status timeline | Return submitted | Open Return Status | Timeline shows: Requested → Under Review → (Approved or Rejected) → (Refunded) with current step highlighted |
| PR-W-T-02 | Pending approval state | status=`returned` | Open Return Status | Shows "Pending approval"; refund amount shown as expected, not yet issued |
| PR-W-T-03 | Approved state | admin approved (`status=return_approved`) | Open Return Status | Shows "Approved"; approval note (if any); refund not yet issued; ETA message |
| PR-W-T-04 | Rejected state | admin rejected (`status=return_rejected`) | Open Return Status | Shows "Rejected"; rejection reason prominently; refund amount shows 0; "Contact support" link |
| PR-W-T-05 | Refunded state | refund issued (`status=refunded`) | Open Return Status | Shows "Refunded"; refund method, transaction id, refunded-at timestamp, refund amount |
| PR-W-T-06 | Non-return order on status URL | order never returned | Visit `/…/1/return-status` | Redirect to order details with info "No return initiated for this order" |
| PR-W-T-07 | Status auto-refresh / polling | Status page open | Wait or trigger backend transition | Page updates without manual refresh (if implemented), or manual Refresh button visible |
| PR-W-T-08 | Copy refund transaction id | Refunded state | Click copy icon next to txn id | Txn id copied to clipboard; toast "Copied" |

---

## 6. Error handling

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PR-W-E-01 | Network offline on submit | Form open; disable network | Click Submit | Inline error "Network error — retry"; Submit re-enabled; form data preserved |
| PR-W-E-02 | 500 server error | Stub 500 | Submit | Error "Something went wrong. Please try again."; no state change |
| PR-W-E-03 | 401 session expired | Token invalidated | Submit | Redirect to login; post-login returns to return form with data (if persisted) or a safe fallback to order details |
| PR-W-E-04 | 400 "reason required" (validator drift) | Bypass client validation, empty reason | Submit | Display backend message gracefully; reason field highlighted |
| PR-W-E-05 | 400 "Cannot return <status>" | Status changed to non-delivered server-side | Submit | Error banner with backend message; form disabled; link back to order details |
| PR-W-E-06 | Retry after transient failure | After PR-W-E-02 | Submit again (API healthy) | Single successful request; no duplicate returns |
| PR-W-E-07 | Double-click Submit | Form open | Rapid-click Submit | Single API call; button disabled during in-flight |
| PR-W-E-08 | Upload failure mid-submit | Attachment service fails | Submit | Either blocks submit with clear error or submits without attachment per spec — document chosen behavior |

---

## 7. Visual feedback & messaging

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PR-W-M-01 | Loading state | Form open | Click Submit | Button shows spinner + "Submitting…"; form controls disabled |
| PR-W-M-02 | Success toast | After PR-W-S-01 | — | Toast "Return request for order #<id> submitted"; auto-dismiss ~5s; dismissible |
| PR-W-M-03 | Status badge colors | Each status | — | Distinct accessible colors + icon/text for Requested / Approved / Rejected / Refunded (contrast ≥ 4.5:1) |
| PR-W-M-04 | Refund amount formatting | — | — | Currency symbol + decimals per locale; tooltip shows original total |
| PR-W-M-05 | Timezone-aware timestamps | — | — | All dates in user locale; tooltip ISO |
| PR-W-M-06 | Empty-state copy | User never returned anything | Open "Returns" filter | Empty state with link to Orders list |

---

## 8. Navigation & deep-linking

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PR-W-N-01 | Return form URL-addressable | Eligible order | Open `/…/1/return` directly | Form renders with order context |
| PR-W-N-02 | Status page URL-addressable | Returned order | Open `/…/1/return-status` directly | Renders current return state |
| PR-W-N-03 | Back preserves entered data | Reason filled | Navigate away and back | Data preserved (draft) or cleared per spec — document |
| PR-W-N-04 | Reload return form | Draft on page | Reload | Either draft restored or blank — document consistent behavior |
| PR-W-N-05 | Deep-link to already-returned order's form | `status=returned`, URL `/…/1/return` | Visit | Redirect to `/…/1/return-status` |

---

## 9. Accessibility (a11y)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PR-W-A-01 | Keyboard-only return flow | Eligible order, keyboard only | Tab to Return → Enter → Tab through form → Submit | Flow completes; focus rings visible at every step |
| PR-W-A-02 | Form labels | Form open | Inspect DOM | Each control has an associated `<label>` or `aria-label`; reason dropdown has accessible name |
| PR-W-A-03 | Error messages associated | Submit with no reason | — | Error text linked via `aria-describedby`; announced to screen readers |
| PR-W-A-04 | Status timeline semantics | Status page | Inspect | Uses `<ol>` with `aria-current="step"` on active step |
| PR-W-A-05 | Reduced motion | OS "reduce motion" on | Submit | No bouncy animations; plain transitions |
| PR-W-A-06 | Color-independent status | — | View statuses | Status communicated by icon/text, not color alone |
| PR-W-A-07 | Screen-reader announcement on submit | SR on | Submit | Toast announced via `aria-live="polite"` |

---

## 10. Responsive & cross-device

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PR-W-X-01 | Mobile viewport (≤ 375px) | — | Complete return flow | Form fits screen; dropdowns open as native picker; Submit reachable without horizontal scroll |
| PR-W-X-02 | Tablet viewport | — | Complete return flow | Two-column layout or stacked per design; content readable |
| PR-W-X-03 | Desktop (≥ 1440px) | — | Complete return flow | Max-width enforced; form centered |
| PR-W-X-04 | Touch targets | Mobile | — | All interactive controls ≥ 44×44 px |
| PR-W-X-05 | Cross-browser parity | Chrome, Safari, Firefox, Edge | Full flow | Visual and functional parity; no console errors |
| PR-W-X-06 | File picker on iOS Safari | Mobile Safari | Trigger attachment | Native picker opens; chosen image displays |

---

## 11. Concurrency & session edge cases

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PR-W-C-01 | Two tabs submitting | Form open in Tab A and Tab B for same order | Submit in A, then Submit in B | Tab B gets 400 "Cannot return returned order"; Tab B reconciles to Return Status |
| PR-W-C-02 | Admin approves while user viewing | User on Return Status (`returned`) | Admin approves in background | Next refresh / poll flips state to "Approved"; no stale state prevents user action |
| PR-W-C-03 | Admin rejects while user viewing | User on Return Status | Admin rejects | Page updates to "Rejected" with reason; refund amount shows 0 |
| PR-W-C-04 | Refund issued mid-view | User on Approved status page | Admin issues refund | Page updates to "Refunded" with transaction id |
| PR-W-C-05 | Logout during form | Form open | Logout in another tab → Submit | 401 flow per PR-W-E-03 |
| PR-W-C-06 | Return window expires mid-form | Form open right at 30-day edge | Submit after crossing boundary | Matches PR-W-G-07 |

---

## 12. Analytics & side-effects (if instrumented)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| PR-W-AN-01 | Form opened | — | Click "Return Item(s)" | Event `return_form_opened` with `orderId`, `daysSinceDelivery` |
| PR-W-AN-02 | Submission | — | Submit | Event `return_submitted` with `orderId`, `reason`, `itemCount`, `expectedRefund` |
| PR-W-AN-03 | Dismissed | — | Close form without submit | Event `return_form_dismissed` with source (cancel/esc/back) |
| PR-W-AN-04 | No duplicate submit events | — | Per PR-W-E-07 | Only one `return_submitted` event |
| PR-W-AN-05 | Refund received | — | Status moves to `refunded` | Event `return_refunded` with `orderId`, `refundAmount`, `refundMethod` |

---

## 13. Content & copy

| # | Title | Expected |
|---|---|---|
| PR-W-CO-01 | Page title | "Return Item(s)" |
| PR-W-CO-02 | Primary button | "Submit Return" |
| PR-W-CO-03 | Secondary button | "Cancel" |
| PR-W-CO-04 | Reason label | "Why are you returning this?" |
| PR-W-CO-05 | Comment placeholder (Other) | "Tell us more (required)" |
| PR-W-CO-06 | Success toast | "Return request for order #<id> submitted" |
| PR-W-CO-07 | Ineligible banners | Match exact copy in PR-W-G-01..04 |
| PR-W-CO-08 | Rejection explanation | Admin-provided reason rendered verbatim under "Why was this rejected?" |
| PR-W-CO-09 | Refund confirmation | "Refunded <amount> to <method> on <date>. Transaction ID: <txn>." |
| PR-W-CO-10 | Localization | All strings render in supported locales; no hard-coded English |

---

## Traceability to API contract

| UI behavior | Backend test | Source |
|---|---|---|
| Return delivered within window | O-R-01 | `returnOrder` |
| Reject return of non-delivered order | O-R-02 | `status !== 'delivered'` guard |
| Reject return outside 30d | O-R-03 | `daysSince > 30` guard |
| Reason required | O-R-04 | `if (!reason) return 400` |
| Unknown order → 404 | O-R-05 | `orders.find(...)` miss |
| Admin approve flow | O-AR-01..04 | `approveReturn` |
| Admin reject flow | (from `rejectReturn`) | `rejectReturn` |
| Refund issued after approval | (from `issueRefund`) | `issueRefund` |
| Return status endpoint | (from `getReturnStatus`) | `getReturnStatus` |
