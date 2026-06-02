# ShopEase — Order Cancel (Web UI) Functional Test Cases

Scope: functional test cases for cancelling an order via the **web UI** (customer-facing storefront). These are end-user interaction tests, not API tests. Backend contract reference: `src/controllers/orderController.js` → `cancelOrder` and `PUT /api/orders/:id/cancel`.

**Pages exercised:**
- My Orders (list) — `/account/orders`
- Order Details — `/account/orders/:id`
- Cancel Order dialog/page — `/account/orders/:id/cancel`

**Allowed cancel states:** `placed` only. Disallowed: `cancelled`, `shipped`, `delivered`.

---

## 1. Entry points & visibility of the Cancel control

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| OC-W-V-01 | Cancel button visible on Order Details for placed order | Logged in; order #1 status=placed | Navigate to `/account/orders/1` | "Cancel Order" button is rendered, enabled, and focusable |
| OC-W-V-02 | Cancel button visible on Orders list row | Logged in; order list contains a placed order | Open `/account/orders` | Each placed order row shows a "Cancel" action (inline or in kebab menu) |
| OC-W-V-03 | Cancel button hidden for shipped order | Order #2 status=shipped | Open order details | No "Cancel Order" button; status badge reads "Shipped" |
| OC-W-V-04 | Cancel button hidden for delivered order | status=delivered | Open order details | No "Cancel Order" button; a "Return" action is shown instead |
| OC-W-V-05 | Cancel button hidden for already cancelled order | status=cancelled | Open order details | No "Cancel Order" button; status badge reads "Cancelled"; `cancelledAt` timestamp displayed |
| OC-W-V-06 | Guest user cannot see Cancel | Not logged in | Navigate to `/account/orders/1` directly | Redirected to login page; after login, Cancel is shown only if the order belongs to this user |
| OC-W-V-07 | Other user's order — Cancel not shown | Logged in as user B; order belongs to user A | Open `/account/orders/1` | 404 or "Order not found" page; no Cancel control |

---

## 2. Cancel confirmation dialog

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| OC-W-D-01 | Dialog opens on click | On order details for placed order | Click "Cancel Order" | Modal opens with title "Cancel this order?", order summary, reason field, "Keep Order" and "Confirm Cancel" buttons |
| OC-W-D-02 | Dialog shows order summary | Dialog open | — | Order ID, item count, total amount, and delivery address match the order on screen |
| OC-W-D-03 | Reason field present and optional | Dialog open | Inspect reason input | Input is visible, placeholder hints "Optional — help us improve", no required-field marker |
| OC-W-D-04 | Default focus | Dialog opens | — | Focus lands on the reason input (or first interactive control per design) |
| OC-W-D-05 | Close via X icon | Dialog open | Click the close (×) icon | Dialog closes; order state unchanged; page returns focus to "Cancel Order" trigger |
| OC-W-D-06 | Close via "Keep Order" | Dialog open | Click "Keep Order" | Dialog closes; no request sent; order state unchanged |
| OC-W-D-07 | Close via Esc key | Dialog open | Press `Esc` | Dialog closes; focus returns to trigger |
| OC-W-D-08 | Backdrop click | Dialog open | Click outside the dialog | Dialog closes (or remains, per spec — verify and document); no cancel submitted |
| OC-W-D-09 | Focus trap | Dialog open | Tab through controls | Focus cycles only within the dialog; `Shift+Tab` from first element goes to last |
| OC-W-D-10 | Scroll lock | Dialog open on long page | Attempt to scroll background | Background scroll is locked; dialog itself scrolls if content overflows |

---

## 3. Reason input behavior

| # | Title | Pre-conditions | Input | Expected |
|---|---|---|---|---|
| OC-W-R-01 | Blank reason allowed | Dialog open | Leave empty, Confirm | Request submits; success screen shows "Reason: No reason provided" |
| OC-W-R-02 | Typical reason | Dialog open | `Changed my mind` | Submits; success screen shows the typed reason |
| OC-W-R-03 | Whitespace-only reason | Dialog open | `"   "` | Trimmed to empty; treated like OC-W-R-01 |
| OC-W-R-04 | Max-length enforcement | Dialog open | Paste 1000-char string | Input caps at the documented max (e.g. 500); counter turns red at limit; Confirm still succeeds with truncated value |
| OC-W-R-05 | Emoji / unicode reason | Dialog open | `Too slow 🐢 — ありがとう` | Submits; success screen renders reason correctly without mojibake |
| OC-W-R-06 | HTML/script in reason | Dialog open | `<script>alert(1)</script>` | Treated as plain text; no script execution; rendered as escaped text on confirmation |
| OC-W-R-07 | Predefined reason chips | Dialog open | Click chip "Found cheaper elsewhere" | Chip value populates reason field; user can still edit before confirming |
| OC-W-R-08 | Reason persists on dialog reopen within session | Type reason, close dialog, reopen | — | Either cleared (per spec) or preserved — verify and document consistent behavior |

---

## 4. Submitting the cancellation (happy path)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| OC-W-S-01 | Cancel placed order — success | Order #1 status=placed | Click Cancel → enter reason → Confirm Cancel | Button shows spinner + disabled state; on success, dialog closes; toast "Order cancelled" appears |
| OC-W-S-02 | Order details updates in place | After OC-W-S-01 | Observe the order details page | Status badge flips to "Cancelled"; `cancelledAt` timestamp displayed; cancellation reason shown; Cancel button is removed |
| OC-W-S-03 | Orders list reflects new status | After OC-W-S-01 | Navigate to `/account/orders` | Order row shows "Cancelled"; inline Cancel action removed |
| OC-W-S-04 | Back navigation preserves state | After OC-W-S-01 | Browser Back then Forward | No re-submission; order remains cancelled; no duplicate toast |
| OC-W-S-05 | Hard refresh after cancel | After OC-W-S-01 | Reload page | Status persists as cancelled (server state authoritative) |
| OC-W-S-06 | Deep-link to cancelled order | After OC-W-S-01 | Open `/account/orders/1` in new tab | Shows cancelled state; no Cancel control |

---

## 5. Disallowed states (guardrails in UI)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| OC-W-G-01 | Already cancelled — direct URL | status=cancelled | Manually visit `/account/orders/1/cancel` | Redirects to order details with info banner "This order is already cancelled" |
| OC-W-G-02 | Shipped — direct URL | status=shipped | Visit cancel URL | Redirects to order details; banner "Shipped orders cannot be cancelled. Use Return after delivery." |
| OC-W-G-03 | Delivered — direct URL | status=delivered | Visit cancel URL | Redirects; banner "Delivered orders cannot be cancelled. You can request a Return within 30 days." |
| OC-W-G-04 | Unknown order id | No order #999 | Visit `/account/orders/999` | 404 page with link back to Orders list |
| OC-W-G-05 | Race — status changes while dialog open | Dialog open; backend moves order to shipped | Click Confirm Cancel | API returns 400; dialog shows inline error "This order has just been shipped and can no longer be cancelled."; page refreshes the status badge |

---

## 6. Error handling

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| OC-W-E-01 | Network offline at submit | Dialog open; disable network | Click Confirm | Inline error "Network error — check your connection and retry"; Confirm button re-enables; order state unchanged |
| OC-W-E-02 | 500 server error | Stub API to 500 | Click Confirm | Inline error "Something went wrong. Please try again."; Confirm re-enabled; no local state change |
| OC-W-E-03 | 401 session expired | Token expired | Click Confirm | Redirect to login; after login, user returns to order details (not an accidental duplicate cancel) |
| OC-W-E-04 | 404 order deleted mid-flow | Dialog open; order removed server-side | Click Confirm | Error "Order not found"; dialog closes; redirects to Orders list after acknowledgement |
| OC-W-E-05 | Retry after transient failure | After OC-W-E-02 | Click Confirm again (API now healthy) | Single successful cancellation; no duplicate records |
| OC-W-E-06 | Double-click Confirm | Dialog open | Rapidly click Confirm twice | Only one API call fires; button disabled between click and response |

---

## 7. Visual feedback & messaging

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| OC-W-M-01 | Loading state on Confirm | Dialog open | Click Confirm | Spinner inside button; button label reads "Cancelling…"; other dialog controls disabled |
| OC-W-M-02 | Success toast | After OC-W-S-01 | — | Toast auto-dismisses after ~5s; includes order ID; dismissible via × |
| OC-W-M-03 | Status badge color | After cancel | Observe badge | Badge uses "cancelled" token (e.g. grey/red per design); accessible contrast ratio ≥ 4.5:1 |
| OC-W-M-04 | Timestamp formatting | After cancel | Observe `cancelledAt` | Displayed in the user's locale/time-zone; tooltip shows full ISO timestamp |
| OC-W-M-05 | Empty state after last order cancelled | User's only order cancelled | Open Orders list | List still shows the cancelled order (not removed); filter "Active" hides it; "All" shows it |

---

## 8. Navigation & deep-linking

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| OC-W-N-01 | Dialog URL-addressable (if design uses modal route) | Placed order | Open `/account/orders/1/cancel` directly | Order details render in background with cancel dialog open on top |
| OC-W-N-02 | Closing dialog updates URL | Dialog open at `/…/1/cancel` | Press Esc | URL returns to `/account/orders/1` without history spam (replace, not push) |
| OC-W-N-03 | Browser Back closes dialog | Dialog open | Click browser Back | Dialog closes; URL returns to order details |
| OC-W-N-04 | Reload with dialog URL | status=placed; URL `/…/1/cancel` | Reload | Dialog re-opens on top of order details |
| OC-W-N-05 | Reload with dialog URL on non-placed order | status=shipped; URL `/…/1/cancel` | Reload | Dialog does not open; banner OC-W-G-02 shown |

---

## 9. Accessibility (a11y)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| OC-W-A-01 | Keyboard-only cancel flow | Placed order; keyboard only | Tab to Cancel button → Enter → type reason → Tab to Confirm → Enter | Flow completes without mouse; focus is visible at each step |
| OC-W-A-02 | ARIA roles | Dialog open | Inspect DOM | Dialog has `role="dialog"`, `aria-modal="true"`, labelled by title; Cancel button has accessible name |
| OC-W-A-03 | Screen-reader announcements | Using SR (VoiceOver/NVDA) | Cancel success | SR announces toast message via `aria-live="polite"` |
| OC-W-A-04 | Reduced motion | OS setting "reduce motion" on | Open/close dialog | No transform animations; dialog fades without slide/scale |
| OC-W-A-05 | Color-blind safe status | — | View cancelled badge | Status communicated by both color and icon/text, not color alone |

---

## 10. Responsive & cross-device

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| OC-W-X-01 | Mobile viewport (≤ 375px) | iPhone SE viewport | Cancel flow | Dialog becomes full-screen sheet; Confirm button reachable without scroll; reason field sized for on-screen keyboard |
| OC-W-X-02 | Tablet viewport | iPad viewport | Cancel flow | Dialog rendered as centered modal; content readable |
| OC-W-X-03 | Desktop wide viewport (≥ 1920px) | — | Cancel flow | Dialog max-width enforced; does not stretch across screen |
| OC-W-X-04 | Touch interactions | Mobile device | Tap outside dialog | Per OC-W-D-08 behavior; tap targets ≥ 44×44 px |
| OC-W-X-05 | Cross-browser | Chrome, Safari, Firefox, Edge | Full flow | Visual and functional parity; no console errors |

---

## 11. Concurrency & session edge cases

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| OC-W-C-01 | Same user, two tabs | Order open in Tab A and Tab B | Cancel in Tab A, then click Cancel in Tab B | Tab B Confirm returns 400 "Order already cancelled"; Tab B reconciles and shows cancelled state |
| OC-W-C-02 | Admin cancels from back office | Admin cancels via `/api/admin/checkout/orders/:id/cancel` | User is on order details page | Next user action (refresh or polling tick) reveals cancelled state; no stale Cancel button allows a second submit |
| OC-W-C-03 | Logout during dialog | Dialog open | Logout in another tab → Confirm in this tab | 401 flow per OC-W-E-03 |
| OC-W-C-04 | Cancel after auto-logout | Token expires while idle | Click Cancel button | Redirect to login; after re-auth, lands back on order details with Cancel still available |

---

## 12. Analytics & side-effects (if instrumented)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| OC-W-AN-01 | Event fired on dialog open | Analytics enabled | Open dialog | Event `order_cancel_dialog_opened` with `orderId` |
| OC-W-AN-02 | Event fired on confirm | — | Confirm cancel | Event `order_cancelled` with `orderId`, `reason`, `itemCount`, `total` |
| OC-W-AN-03 | Event fired on dismiss | — | Close without cancelling | Event `order_cancel_dismissed` with `orderId`, source (`x`/`esc`/`backdrop`/`keep`) |
| OC-W-AN-04 | No duplicate events on double submit | — | Per OC-W-E-06 | Only one `order_cancelled` event recorded |

---

## 13. Content & copy

| # | Title | Expected |
|---|---|---|
| OC-W-CO-01 | Dialog title | "Cancel this order?" (exact copy per design) |
| OC-W-CO-02 | Primary button | "Confirm Cancel" — destructive styling |
| OC-W-CO-03 | Secondary button | "Keep Order" — neutral styling |
| OC-W-CO-04 | Reason placeholder | "Optional — tell us why (helps us improve)" |
| OC-W-CO-05 | Success toast | "Order #<id> cancelled" |
| OC-W-CO-06 | Disallowed banners | Match exact copy in OC-W-G-01..03 |
| OC-W-CO-07 | Localization | All strings render correctly in supported locales; no hard-coded English in dialog |

---

## Traceability to API contract

| UI behavior | Backend test | Source |
|---|---|---|
| Cancel placed order succeeds | O-C-01 | `orderController.cancelOrder` |
| Default reason when blank | O-C-02 | `req.body?.reason \|\| 'No reason provided'` |
| Re-cancel rejected | O-C-03 | `status === 'cancelled'` guard |
| Shipped disallowed | O-C-04 | `status === 'shipped'` guard |
| Delivered disallowed | O-C-05 | `status === 'delivered'` guard |
| Unknown order → 404 | O-C-06 | `orders.find(...)` miss |
commit