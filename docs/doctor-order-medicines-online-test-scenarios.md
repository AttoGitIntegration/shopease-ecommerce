# Doctor Ordering Medicines Online for Patients — Functional Test Scenarios

Scope: end-user test scenarios for a **doctor placing an online medicine order on behalf of a patient** through a clinic / hospital / tele-health platform that is integrated with one or more e-pharmacies. Covers doctor authentication, patient selection & consent, building the medicine cart (from an issued Rx, from history, or via search), substitution (generic ↔ brand), pharmacy & price comparison, prescription upload / linkage, controlled-substance handling, delivery address & slot, payment (patient self-pay, clinic-billed, insurance/TPA, corporate, COD), order placement, pharmacy verification, fulfilment & tracking, partial shipment, cold-chain handling, cancellation/return/refund, refill & auto-order, notifications, and audit.

**Out of scope (covered by sibling docs):**
- Writing the prescription itself → `doctor-prescribe-medicine-test-scenarios.md`
- Lab test ordering → `doctor-order-lab-tests-scenarios.md`
- Generic ShopEase order cancel/return → `order-cancel-web-test-cases.md`, `product-return-web-test-cases.md`
- Payment gateway behaviour at the protocol level → `payment-api-test-scenarios.md`, `payment-web-test-cases.md`

**Pages / flows exercised:**
- Doctor login (password + 2FA)
- Doctor dashboard → "Order medicines for patient"
- Patient search / selection with consent capture
- Cart builder (from issued Rx, repeat order, or free search)
- Pharmacy selector with price + ETA + stock + rating
- Generic / brand substitution
- Prescription upload or linkage (existing Rx ID)
- Delivery address picker (patient saved address, new address, clinic pickup)
- Delivery slot / express / scheduled / subscription
- Payment method selection (patient pays, clinic pays, insurance, corporate, COD)
- Place order → pharmacy verification → dispatch → delivery
- Order tracking & status timeline
- Cancel / modify / return / refund
- Refills, auto-refill, and subscriptions
- Notifications (patient, doctor, pharmacy)
- Reports & audit

**Key UI components:**
- "Order for patient" CTA on doctor dashboard / patient chart
- Patient picker with consent banner
- Cart table (drug, strength, qty, days, generic toggle, price, stock badge)
- Pharmacy comparison drawer (price total, delivery ETA, rating, distance)
- Address card list with default flag
- Slot picker (Express ≤2 h, Same-day, Scheduled date+time)
- Payment selector with split-payment support
- "Place order" primary button with cost summary
- Order list with statuses: Draft, Awaiting verification, Verified, Packed, Out for delivery, Delivered, Cancelled, Returned, Refunded
- Tracking timeline & live courier map (where supported)

---

## 1. Doctor access & authorisation to order

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-AUTH-01 | Login — happy path | Active doctor account | Username + password → 2FA OTP | Dashboard loads; "Order medicines for patient" visible |
| DR-ORD-AUTH-02 | Doctor not entitled to order on behalf | Feature flag off for this doctor | Open dashboard | "Order medicines" CTA hidden or disabled with tooltip |
| DR-ORD-AUTH-03 | Doctor with expired registration | Council registration expired | Click "Order for patient" | Blocked with "Registration not active"; draft only |
| DR-ORD-AUTH-04 | Locum / cross-clinic doctor | Logged into clinic B, ordering for clinic A's patient | Open patient | Blocked unless cross-clinic consent and role permit |
| DR-ORD-AUTH-05 | Session timeout mid-order | Idle past threshold with cart open | Resume | Re-login prompt; cart auto-saved as draft and recoverable |
| DR-ORD-AUTH-06 | Role-based — receptionist attempts to place order | Logged in as non-doctor | Open order module | Read-only or "Forward to doctor for approval" path only |
| DR-ORD-AUTH-07 | 2FA — invalid OTP | Username+password correct | Wrong OTP | Error "Invalid OTP"; order module not accessible |
| DR-ORD-AUTH-08 | Geo / IP restriction | Doctor outside allowed region | Login | Blocked or read-only per policy |

---

## 2. Patient selection & consent to order

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-PAT-01 | Select patient from today's queue | Today's appointment exists | Click patient row → "Order medicines" | Order flow opens with patient header pre-filled |
| DR-ORD-PAT-02 | Search by MRN / phone / ABHA | Patient exists | Enter identifier | Exact match returned; consent state shown |
| DR-ORD-PAT-03 | Patient without "order on my behalf" consent | Consent missing | Click "Order medicines" | Blocked; consent capture dialog (e-sign / OTP) shown |
| DR-ORD-PAT-04 | Patient consent valid but expired | Consent older than configured window | Start order | Re-consent prompt before cart can be placed |
| DR-ORD-PAT-05 | Minor patient — guardian consent | Age < 18 | Start order | Guardian name + phone + OTP capture required |
| DR-ORD-PAT-06 | Patient marked deceased | Deceased flag set | Start order | Blocked with explicit message; audit entry recorded |
| DR-ORD-PAT-07 | Patient with active hold (unpaid dues / fraud flag) | Hold flag on | Start order | Blocked or requires admin override with reason |
| DR-ORD-PAT-08 | Wrong patient picked | Doctor switches patient mid-cart | Click another patient | Cart confirms discard / re-target; never silently re-binds |
| DR-ORD-PAT-09 | Patient with no delivery address on file | Address list empty | Reach address step | Forced to add address or pick clinic pickup |
| DR-ORD-PAT-10 | Patient with multiple identities (merged MRN) | Merge in progress | Open patient | Banner "Profile being merged — ordering temporarily disabled" |

---

## 3. Building the cart — from prescription, history, or search

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-CART-01 | One-click "Order this Rx" from issued prescription | Rx issued today | On Rx → click "Order online" | Cart pre-populated with each Rx line, qty auto-computed from frequency × duration |
| DR-ORD-CART-02 | Order from past Rx (within validity) | Past Rx valid | "Repeat order" on past Rx | Cart populated; doctor must reconfirm each line |
| DR-ORD-CART-03 | Order from past Rx (expired) | Rx > validity window | "Repeat order" | Blocked with prompt to issue fresh Rx |
| DR-ORD-CART-04 | Manual search and add | — | Search "Crocin 500" → Add | Item added with default qty = 1 strip; editable |
| DR-ORD-CART-05 | Search — generic vs brand | Drug indexed | Search by composition | Both generic and brand variants shown with price |
| DR-ORD-CART-06 | Quantity edit | Item in cart | Change qty 1 → 3 | Subtotal recomputes; max-qty per policy enforced |
| DR-ORD-CART-07 | Remove item | Item in cart | Click trash | Item removed; totals recompute |
| DR-ORD-CART-08 | Empty cart | No items | Click "Place order" | Blocked "Add at least one medicine" |
| DR-ORD-CART-09 | Out-of-stock item across all pharmacies | Drug unavailable | Add | Badge "Out of stock everywhere"; cannot proceed with that line |
| DR-ORD-CART-10 | Partial stock across pharmacies | Some pharmacies stock it | Add | Pharmacy selector limits to those carrying full cart, or offers split fulfilment |
| DR-ORD-CART-11 | Duplicate item add | Same drug added twice | Add Amoxicillin 500 twice | Merged with qty incremented + warn |
| DR-ORD-CART-12 | Maximum cart size | > N lines per policy | Add line N+1 | Blocked with policy message |
| DR-ORD-CART-13 | Cold-chain item flagged | Insulin in cart | Add | "Requires refrigerated delivery" badge; only cold-chain pharmacies eligible |
| DR-ORD-CART-14 | Cart persistence | Doctor leaves and returns | Reopen patient | Draft cart restored with timestamp |
| DR-ORD-CART-15 | Multi-patient cart isolation | Two patient tabs | Add items in tab A | Tab B unaffected; carts are per-patient |

---

## 4. Generic / brand substitution

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-SUB-01 | Substitute brand with cheaper generic | Generic available | Click "Substitute" → choose generic | Same composition/strength; price diff highlighted |
| DR-ORD-SUB-02 | "Do not substitute" flag on Rx | DNS flag set by prescriber | Try to substitute | Blocked; reason "Prescriber marked Do Not Substitute" |
| DR-ORD-SUB-03 | Substitute with different strength | Suggested 500 mg vs Rx 650 mg | Try | Blocked unless doctor explicitly confirms strength change with note |
| DR-ORD-SUB-04 | Substitute restricted by formulary | Insurance/corporate plan restricts brand | Pick restricted brand | Warn "Not covered — patient pays full"; allow proceed |
| DR-ORD-SUB-05 | Auto-suggest cheapest equivalent | Cheaper generic exists | Open cart | Inline banner "Save ₹X by switching to generic"; one-click apply |
| DR-ORD-SUB-06 | Substitute audit | After substitution | Open order audit | Original line + substituted line both recorded with reason |

---

## 5. Pharmacy & price comparison

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-PHR-01 | Pharmacy list ranked by price | Cart complete | Open pharmacy drawer | Listed with total price, delivery fee, ETA, rating |
| DR-ORD-PHR-02 | Filter by ETA — express only | Some pharmacies support express | Toggle "Express ≤2 h" | List limited; non-eligible greyed out |
| DR-ORD-PHR-03 | Filter by distance | Patient address known | Sort by distance | Nearest first; distance shown |
| DR-ORD-PHR-04 | Coupon / clinic discount applied | Doctor's clinic has tie-up | View pharmacy | Discounted price shown; "Clinic discount" label |
| DR-ORD-PHR-05 | Pharmacy out of business / disabled | Pharmacy deactivated | Select it | Not selectable; hidden with reason if admin |
| DR-ORD-PHR-06 | Split fulfilment across pharmacies | No single pharmacy has full cart | Click "Allow split" | Cart splits into two suborders with separate ETAs and invoices |
| DR-ORD-PHR-07 | Single pharmacy required for controlled drug | Schedule H1/X in cart | Open selector | Only licensed pharmacies shown; split disabled |
| DR-ORD-PHR-08 | Pharmacy outside patient pincode | Selected pharmacy doesn't deliver to pincode | Place order | Blocked with "Does not deliver to this pincode" |
| DR-ORD-PHR-09 | Price changes between selection and place | Race condition | Place order | Re-confirm new total or block; never silently charge new price |
| DR-ORD-PHR-10 | Pharmacy stock changes to OOS at place | Race condition | Place order | Order partially placed or blocked with clear message; no charge on OOS lines |

---

## 6. Prescription linkage / upload

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-RX-01 | Auto-link issued e-Rx | Cart built from issued Rx | Reach checkout | Rx ID auto-attached; preview shown |
| DR-ORD-RX-02 | Schedule H drug without linked Rx | OTC + Rx mix | Try to place | Blocked until Rx linked / uploaded |
| DR-ORD-RX-03 | Upload external Rx (PDF/image) | Doctor has paper Rx | Click "Upload" → choose file | File ≤ size limit; preview shown; OCR best-effort |
| DR-ORD-RX-04 | Upload invalid file | .exe or oversized | Choose file | Rejected with type/size error |
| DR-ORD-RX-05 | Tampered / illegible Rx flagged by pharmacy | Upload poor scan | Pharmacy review | Pharmacy rejects → doctor notified; order placed on hold |
| DR-ORD-RX-06 | Rx older than max age | Issued > validity | Attach | Blocked or warns based on policy |
| DR-ORD-RX-07 | Quantity exceeds Rx | Rx says 10 tabs; cart says 30 | Place | Blocked or requires explicit doctor override + reason |
| DR-ORD-RX-08 | Patient name on Rx ≠ patient on order | Mismatch | Attach | Blocked with prominent mismatch warning |
| DR-ORD-RX-09 | Multi-page Rx | PDF with multiple pages | Upload | All pages stored; preview pageable |
| DR-ORD-RX-10 | Rx already used / refills exhausted | Refill count = 0 | Attach | Blocked "No refills remaining" |

---

## 7. Controlled substances & regulated meds

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-CTRL-01 | Schedule H1 in cart — indication mandatory | H1 drug added | Place | Indication/ICD-10 required before checkout |
| DR-ORD-CTRL-02 | Narcotic (NDPS) — not authorised doctor | Doctor lacks licence | Add narcotic | Blocked at cart add |
| DR-ORD-CTRL-03 | Narcotic — max days enforced | Regulation 7 days | Cart qty implies 14 days | Clamped/blocked |
| DR-ORD-CTRL-04 | Schedule X — duplicate copy requirement | Drug added | Place | System enforces patient-ID capture + duplicate slip; cash-on-delivery may be blocked |
| DR-ORD-CTRL-05 | Cross-state controlled-drug delivery | Patient address in different state with stricter rules | Place | Blocked or requires special licence pharmacy |
| DR-ORD-CTRL-06 | DSC required to confirm | E-Rx regulation | Place | "Sign with DSC/HPR" mandatory; cannot proceed without it |
| DR-ORD-CTRL-07 | Audit for controlled order | After placement | Open audit | Doctor, patient, drug, qty, prescription, signature events all recorded immutably |

---

## 8. Delivery address & slot

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-ADDR-01 | Use patient's default address | Address on file | Reach address step | Default selected; tap to change |
| DR-ORD-ADDR-02 | Add new address | — | "Add address" → fill | Validated pincode; saved to patient profile (with patient consent) |
| DR-ORD-ADDR-03 | Address validation failure | Invalid pincode | Save | Blocked "Pincode not recognised" |
| DR-ORD-ADDR-04 | Address outside delivery zone | Remote area | Save | Warn; pharmacy options auto-restricted or pickup only |
| DR-ORD-ADDR-05 | Clinic pickup | Patient prefers clinic | Choose "Clinic pickup" | No delivery fee; clinic notified to receive |
| DR-ORD-ADDR-06 | Express delivery slot | Pharmacy supports express | Pick "Within 2 h" | Slot reserved; ETA shown; fee added |
| DR-ORD-ADDR-07 | Scheduled future slot | Patient prefers tomorrow morning | Pick slot | Slot locked; order goes Awaiting-dispatch until window |
| DR-ORD-ADDR-08 | Slot fills up between pick & confirm | Race | Confirm | "Slot no longer available — pick another"; no charge |
| DR-ORD-ADDR-09 | Address with missing house number | Incomplete | Save | Blocked or warns; courier-friendly fields required |
| DR-ORD-ADDR-10 | International / non-supported country | Pincode in another country | Save | Blocked with localisation-friendly message |
| DR-ORD-ADDR-11 | Cold-chain + remote address | Insulin + far pincode | Save | Only cold-chain capable pharmacies shown; longer ETA |

---

## 9. Payment

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-PAY-01 | Patient pays — UPI / card on patient device | Doctor places, patient pays | Send payment link to patient | Patient receives SMS/email link; order not confirmed until paid |
| DR-ORD-PAY-02 | Patient pays — COD | COD eligible cart | Select COD | Order confirmed; payment due at delivery; COD cap enforced |
| DR-ORD-PAY-03 | COD blocked for controlled / high-value | Schedule X or > cap | Select COD | Blocked; prepaid required |
| DR-ORD-PAY-04 | Clinic-billed | Clinic has post-paid arrangement | Select "Bill to clinic" | Added to clinic monthly invoice; patient not charged |
| DR-ORD-PAY-05 | Insurance / TPA cashless | Patient policy active | Select insurance | Pre-auth flow; covered items zero out for patient; non-covered shown as patient-payable |
| DR-ORD-PAY-06 | Insurance pre-auth declined | TPA rejects | Place | Fallback to patient-pay; never auto-charge without consent |
| DR-ORD-PAY-07 | Corporate / employee benefit | Patient is employee | Select corporate | Wallet balance deducted; cap enforced |
| DR-ORD-PAY-08 | Split payment | Part insurance + part patient | Configure split | Both legs reconciled; partial failure rolls back atomically |
| DR-ORD-PAY-09 | Discount / coupon | Valid coupon | Apply | Applied to eligible lines only; visible breakdown |
| DR-ORD-PAY-10 | Invalid / expired coupon | — | Apply | Error inline; total unchanged |
| DR-ORD-PAY-11 | Payment failure mid-place | Gateway 5xx | Place | Order in "Payment failed"; retry allowed; no double-charge |
| DR-ORD-PAY-12 | Double-click / double-submit | — | Click "Place" twice | Exactly one order created; idempotency key respected |
| DR-ORD-PAY-13 | Refundable card removed mid-flight | Patient removes card | — | Subsequent refund falls back to bank transfer / wallet |
| DR-ORD-PAY-14 | Currency / tax breakdown shown | — | Open summary | Subtotal, GST, delivery fee, discount, payable separately displayed |
| DR-ORD-PAY-15 | Receipt / invoice | After payment | Click "Download invoice" | GST-compliant invoice with patient, doctor, pharmacy, line items |

---

## 10. Place order & pharmacy verification

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-PLACE-01 | Place order — happy path | Cart + address + payment all valid | Click "Place" | Order ID generated; status = Awaiting verification |
| DR-ORD-PLACE-02 | Pharmacy verifies Rx | Pharmacist reviews | Approve | Status → Verified → Packed |
| DR-ORD-PLACE-03 | Pharmacy rejects Rx | Mismatch / illegible | Reject with reason | Doctor + patient notified; refund initiated if prepaid |
| DR-ORD-PLACE-04 | Pharmacy substitutes item | Out of brand, offers generic | Suggest substitute | Doctor approval required before dispatch; patient also notified |
| DR-ORD-PLACE-05 | Partial fulfilment | Pharmacy can ship 2 of 3 lines | Accept partial | Order splits into shipped + backordered; charges adjusted |
| DR-ORD-PLACE-06 | Pharmacy SLA breach for verification | No response in N min | Timer expires | Auto-cancel or auto-reassign per policy; patient kept informed |
| DR-ORD-PLACE-07 | Place during outage | Pharmacy API down | Place | Queued or fallback pharmacy suggested; never silent fail |
| DR-ORD-PLACE-08 | Order audit on place | After place | Open audit | Who placed, on whose behalf, from where (IP), with what Rx, time |

---

## 11. Tracking & delivery

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-TRK-01 | Status timeline | Order placed | Open order | Stages: Placed → Verified → Packed → Out for delivery → Delivered |
| DR-ORD-TRK-02 | Live courier map | Courier supports tracking | Open tracking | Map + ETA refreshes; address masked appropriately |
| DR-ORD-TRK-03 | OTP at delivery | Delivery OTP required | Courier arrives | Patient enters OTP; status → Delivered only after success |
| DR-ORD-TRK-04 | Delivery failed — recipient absent | Courier returns | — | Re-attempt scheduled; doctor + patient notified |
| DR-ORD-TRK-05 | Wrong item delivered | Recipient reports mismatch | Report | Order opens Investigation; replacement / refund per policy |
| DR-ORD-TRK-06 | Cold-chain breach reported | Insulin warm on arrival | Report | Replacement initiated; original quarantined; pharmacy notified |
| DR-ORD-TRK-07 | Doctor view across patients | Doctor has many patients | "My orders" view | List filterable by patient, status, date |
| DR-ORD-TRK-08 | Tracking link shared with patient | SMS link | Open without login | Limited tracking view; PHI minimised |

---

## 12. Cancel, modify, return, refund

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-CXL-01 | Cancel before dispatch | Status = Verified or earlier | Click "Cancel" → reason | Cancelled; full refund per policy |
| DR-ORD-CXL-02 | Cancel after dispatch | Out for delivery | Click "Cancel" | Blocked or "Refuse on delivery" path only |
| DR-ORD-CXL-03 | Modify quantity before pack | Pharmacy not packed yet | Edit qty | Allowed; charges adjusted; pharmacy re-verifies |
| DR-ORD-CXL-04 | Modify after pack | Already packed | Edit | Blocked; user prompted to cancel + reorder |
| DR-ORD-CXL-05 | Return — non-returnable category | Schedule H/X drugs | Initiate return | Blocked; safety policy explained |
| DR-ORD-CXL-06 | Return — damaged / expired on arrival | Returnable + within window | Initiate return | Approved; pickup scheduled; refund on receipt |
| DR-ORD-CXL-07 | Refund timeline | Prepaid order cancelled | — | Refund SLA visible (e.g., "5–7 business days") with tracking ID |
| DR-ORD-CXL-08 | Partial return | Multi-line shipment | Return 1 of 3 | Pro-rata refund; invoice amendment generated |
| DR-ORD-CXL-09 | Refund to original instrument unavailable | Card expired | Refund | Fallback to bank transfer / wallet with consent |
| DR-ORD-CXL-10 | Doctor-initiated vs patient-initiated cancellation | Either path | Cancel | Audit records initiator; reason captured either way |

---

## 13. Refills, repeats & subscriptions

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-REF-01 | Repeat last order | Past order exists | Click "Reorder" | Cart re-built; doctor reviews; new Rx attached if required |
| DR-ORD-REF-02 | Subscription / auto-refill setup | Chronic meds | Configure monthly | Recurrence saved; runs on schedule; cancellable any time |
| DR-ORD-REF-03 | Auto-refill needs fresh Rx | Rx near expiry | Run date arrives | Auto-refill paused; doctor prompt to renew Rx |
| DR-ORD-REF-04 | Auto-refill payment fails | Card declined | Run date | Retry per policy; user notified; never silent skip |
| DR-ORD-REF-05 | Cancel subscription | Subscription active | Cancel | Future runs stopped; pending one rolls back if not dispatched |
| DR-ORD-REF-06 | Skip next refill | Subscription active | Click "Skip next" | Next run skipped; subsequent runs unchanged |
| DR-ORD-REF-07 | Subscription dosage change | Doctor edits | Save change | Next refill reflects new dosage and price |

---

## 14. Notifications

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-NOTIF-01 | Patient SMS on placement | SMS opted in | Place order | Patient receives confirmation with order ID + ETA |
| DR-ORD-NOTIF-02 | Patient email with invoice | Email on file | Place | Email with PDF invoice and tracking link |
| DR-ORD-NOTIF-03 | Doctor dashboard alert on rejection | Pharmacy rejects | — | Banner + push notification on doctor dashboard |
| DR-ORD-NOTIF-04 | Patient opted out of SMS | Opt-out flag | Place | SMS not sent; alt channel used |
| DR-ORD-NOTIF-05 | OTP delivery on cash-on-delivery handover | COD order delivered | — | OTP sent to patient mobile only, not doctor |
| DR-ORD-NOTIF-06 | Notification on delivery | Status → Delivered | — | Both doctor (low-priority) and patient (high-priority) notified |
| DR-ORD-NOTIF-07 | Notification failure | Gateway down | Place | Doctor sees fallback banner; manual outreach option |

---

## 15. Multi-patient & batch ordering

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-BATCH-01 | Bulk reorder for ward / camp | Doctor manages multiple patients | "Batch order" | One screen with patient × cart matrix; consent enforced per patient |
| DR-ORD-BATCH-02 | Mixed addresses in batch | Some clinic, some home | Place | Separate suborders per address; one consolidated dashboard |
| DR-ORD-BATCH-03 | One patient in batch lacks consent | — | Place | That patient's row blocked; rest proceed |
| DR-ORD-BATCH-04 | Batch payment | Clinic-billed | Place | Single invoice to clinic; patient-level breakdown attached |
| DR-ORD-BATCH-05 | Batch cancellation | Cancel whole batch | Click "Cancel all" | Each suborder cancelled atomically; partial-cancel reflected if some already dispatched |

---

## 16. Reports, audit & compliance

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-AUD-01 | Audit trail per order | Order in any status | Open "Audit" | Append-only events: cart edits, Rx attach, payment, place, verify, dispatch, deliver, cancel |
| DR-ORD-AUD-02 | Doctor activity report | Date range | Export | CSV/PDF with orders placed, value, success rate |
| DR-ORD-AUD-03 | Controlled-drug register | H1/X drugs ordered | Open register | Statutory fields populated: doctor reg no., patient ID, qty, indication |
| DR-ORD-AUD-04 | Tamper attempt | Attempt to edit past audit entry | API call | Forbidden; tampering recorded as new event |
| DR-ORD-AUD-05 | Data export for regulator | Authorised admin | Request export | Filtered, signed export with hash; no PHI leak in filename |

---

## 17. Security & privacy

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-SEC-01 | PHI never in URL / logs | Place order | Inspect network & server logs | No patient name/MRN/drug names in URLs or unstructured logs |
| DR-ORD-SEC-02 | Patient-facing tracking link auth | Open link without OTP | — | Requires OTP / token; expires after window |
| DR-ORD-SEC-03 | Cross-tenant isolation | Doctor of clinic A queries patient of clinic B | API | 403; no data leakage even in errors |
| DR-ORD-SEC-04 | Saved card scope | Doctor sees patient's saved cards? | Cart payment step | Doctor never sees full PAN; patient-side payment only |
| DR-ORD-SEC-05 | Session sharing | Doctor's session forwarded | — | Bound to device fingerprint; suspicious-session prompt |
| DR-ORD-SEC-06 | Consent withdrawal | Patient revokes consent mid-order | Patient app | In-flight orders flagged; future orders blocked |
| DR-ORD-SEC-07 | Encryption | Rx PDFs at rest | DB inspection | Encrypted; signed URLs for fetch |
| DR-ORD-SEC-08 | Doctor impersonation guard | Another role tries to act-as doctor | — | Blocked unless explicit delegation feature on, audited |

---

## 18. Accessibility, localisation & UX

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-UX-01 | Keyboard-only ordering | — | Tab through cart, payment, address | All fields reachable; focus visible; submit via Enter |
| DR-ORD-UX-02 | Screen reader on pharmacy comparison | NVDA / VoiceOver | Navigate drawer | Price, ETA, rating announced per row |
| DR-ORD-UX-03 | Language toggle | EN ↔ HI/TA | Switch | Labels translated; drug names remain clinical |
| DR-ORD-UX-04 | Tablet OPD use | iPad landscape | Place order | Usable without horizontal scroll |
| DR-ORD-UX-05 | High-contrast / dark mode | Toggle | — | Alerts and status badges retain contrast ratios |
| DR-ORD-UX-06 | Long pharmacy list | 50 pharmacies | Open drawer | Virtualised list; smooth scroll |
| DR-ORD-UX-07 | Slow network indicator | Throttled to 3G | Search / place | Loading states explicit; never silent freeze |

---

## 19. Error handling, performance, reliability

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-ERR-01 | Pharmacy API timeout | Verification call hangs | Place | Order in "Awaiting verification"; retried; user informed |
| DR-ORD-ERR-02 | Price service down | Comparison unavailable | Open drawer | Fallback to last cached prices with stale-data badge; placement allowed only when prices confirmed |
| DR-ORD-ERR-03 | Idempotent place | Network retry | Auto-retry after 5xx | Same idempotency key; one order created |
| DR-ORD-ERR-04 | Concurrent edits to same cart | Two tabs | Save both | Last-write-wins with conflict banner; no silent loss |
| DR-ORD-ERR-05 | Browser crash mid-cart | Unsaved lines | Reopen | Draft auto-recovery to last save |
| DR-ORD-ERR-06 | Clock skew at client | Client clock wrong | Place | Server time used for SLA / Rx validity; no client manipulation |
| DR-ORD-ERR-07 | Large past-order history | 500 prior orders | Open list | Paginated / lazy-loaded; first page within SLA |
| DR-ORD-ERR-08 | Payment gateway slow → user clicks back | Gateway in progress | Back to app | Webhook reconciles; order shown correctly once settled |

---

## 20. Edge cases

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ORD-EDGE-01 | Cart total = ₹0 (all covered by insurance) | Cashless full cover | Place | Allowed; payment step skipped with audit |
| DR-ORD-EDGE-02 | Drug name with special chars / emoji in instructions | — | Save | Sanitised; no layout break on invoice |
| DR-ORD-EDGE-03 | Daylight-saving transition during scheduled slot | Slot near DST | — | Slot anchored to absolute UTC; user sees correct local time both sides |
| DR-ORD-EDGE-04 | Leap-day refill date | Refill scheduled Feb 29 | Following year | Computed sanely (Feb 28 / Mar 1 per policy) |
| DR-ORD-EDGE-05 | Patient changes address while order in transit | Patient updates default | — | In-flight order not re-routed; future orders use new address |
| DR-ORD-EDGE-06 | Doctor's registration expires mid-order | Expires after cart, before place | Click Place | Blocked at submission; cart preserved |
| DR-ORD-EDGE-07 | Pharmacy delists drug mid-flight | After place, before pack | — | Pharmacy contacts doctor; substitution or refund path; no silent removal |
| DR-ORD-EDGE-08 | Very long patient name / address | 500+ chars | Save / print | Truncated for label; full value in record; no overflow on invoice |
| DR-ORD-EDGE-09 | Order placed near midnight, scheduled "tomorrow" | Edge timing | Place at 23:59 | "Tomorrow" anchored to patient's local calendar day |
| DR-ORD-EDGE-10 | Two doctors order for same patient simultaneously | Race | Both place | Both succeed independently; duplicate-therapy warning surfaces in patient app |
| DR-ORD-EDGE-11 | Patient phone number changed after order | Patient updates | Delivery OTP step | OTP goes to verified-at-place number, not new number, unless policy allows update |
| DR-ORD-EDGE-12 | Returned-to-origin order auto-refund | Courier returns | — | Refund triggered without manual ticket; patient + doctor notified |

---

## Traceability notes

- Each test should record: doctor ID, patient MRN, consent ID, Rx ID (if linked), pharmacy ID, order ID, payment instrument, addresses used, status transitions, and final audit entries.
- For regulated markets (India e-pharmacy rules / US DEA / EU eHealth), map `DR-ORD-CTRL-*`, `DR-ORD-RX-*`, `DR-ORD-AUD-03`, and `DR-ORD-SEC-*` to the relevant regulatory clause.
- Smoke regression: `DR-ORD-AUTH-01`, `DR-ORD-PAT-01`, `DR-ORD-CART-01`, `DR-ORD-PHR-01`, `DR-ORD-RX-01`, `DR-ORD-ADDR-01`, `DR-ORD-PAY-01`, `DR-ORD-PLACE-01`, `DR-ORD-TRK-01`, `DR-ORD-CXL-01`.
- Cross-link with `doctor-prescribe-medicine-test-scenarios.md` for any test that begins from an issued Rx (DR-ORD-CART-01, DR-ORD-RX-01, DR-ORD-REF-01).
