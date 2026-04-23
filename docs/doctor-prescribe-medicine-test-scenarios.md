# Doctor Prescribing Medicines to Patient — Functional Test Scenarios

Scope: end-user test scenarios for a **doctor/physician prescribing medicines** to a patient via an EMR/EHR or tele-consultation platform. Covers doctor authentication, patient selection, consultation context, medicine search, dosage/frequency/duration entry, interaction & allergy checks, controlled-substance handling, e-signature, prescription issuance (print/PDF/e-Rx), sharing to pharmacy/patient, refills, amendments, and audit. Pharmacy dispensing, inventory, and insurance claim adjudication are out of scope except where they surface to the prescribing doctor.

**Pages / flows exercised:**
- Doctor login (password + 2FA / digital signature token)
- Doctor dashboard (today's appointments, queue)
- Patient chart / EMR summary
- Start / resume consultation (in-person or tele-consult)
- Vitals & chief complaint / diagnosis entry (ICD-10)
- Prescription module — add / edit / remove medicines
- Drug search (generic / brand / composition)
- Dosage builder (strength, route, frequency, duration, timing, instructions)
- Drug interaction, allergy, duplicate-therapy, and pregnancy/lactation alerts
- Controlled-substance (narcotic / Schedule H1/X) handling
- Prescription preview
- Digital signature / e-Rx token
- Issue prescription (print, PDF download, SMS/email to patient, send to pharmacy)
- Refill / repeat prescription
- Amend / cancel issued prescription
- Prescription history / audit trail

**Key UI components:**
- Login with 2FA and optional DSC (digital signature certificate) / HPR (Health Professional Registry) token
- Patient search (name, MRN, phone, ABHA/UHID)
- Drug autocomplete with formulary & stock indicator
- Structured dose fields: strength, unit, route, frequency (BID/TID/QID/SOS/etc.), duration, total quantity, timing (before/after food), taper schedule
- Free-text "Additional instructions"
- Allergy/intolerance chip list on patient header
- Alert modal (critical / major / moderate / minor severity, with override + reason)
- Rx preview (doctor letterhead, registration no., signature, date/time)
- "Sign & Issue" primary button
- Prescription list with statuses: Draft, Issued, Dispensed, Cancelled, Amended

---

## 1. Doctor access & authentication

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-AUTH-01 | Login — happy path | Registered doctor with valid credentials | Enter username + password → enter 2FA OTP | Dashboard loads with today's appointments |
| DR-AUTH-02 | Login — wrong password | — | Enter valid username + wrong password | Error "Invalid credentials"; no session created; attempt counter increments |
| DR-AUTH-03 | Login — account locked after N failed attempts | 5 consecutive failures | 6th attempt | Account locked for fixed window; password-reset link shown |
| DR-AUTH-04 | 2FA — invalid OTP | Username+password correct | Enter wrong OTP | Error "Invalid OTP"; prescription module NOT accessible |
| DR-AUTH-05 | 2FA — expired OTP | OTP past validity window | Submit | "OTP expired; resend" |
| DR-AUTH-06 | Doctor without active medical-council registration | Registration expired or suspended | Login | Blocked with message "Your registration is not active. Contact admin." Cannot issue Rx |
| DR-AUTH-07 | Inactive/disabled doctor account | Admin disabled account | Login | "Account is disabled" |
| DR-AUTH-08 | Session timeout mid-prescription | Idle > timeout threshold with draft open | Resume typing | Re-login prompt; unsaved draft auto-saved and recoverable |
| DR-AUTH-09 | Digital Signature Certificate (DSC) / HPR token required for e-Rx | e-Rx mandated in jurisdiction | Sign in without DSC/HPR attached | Warning; doctor can browse but "Sign & Issue" disabled until DSC/HPR attached |
| DR-AUTH-10 | Role-based access — nurse/receptionist attempts prescription | Logged in as non-prescriber role | Open prescription module | Access denied or read-only view |

---

## 2. Patient selection & chart open

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-PAT-01 | Select patient from today's queue | Appointment scheduled for this doctor | Click patient row | Chart opens with demographics, allergies, active meds, problem list |
| DR-PAT-02 | Search by MRN | Patient exists | Enter MRN in search | Exact match shown; click opens chart |
| DR-PAT-03 | Search by partial name | Multiple matches | Type "Shar" | List of matches with DOB/phone to disambiguate |
| DR-PAT-04 | Search by ABHA / UHID | Patient linked to ABHA | Enter ABHA number | Patient card returned |
| DR-PAT-05 | No results | No match | Enter non-existing MRN | "No patient found"; option to register new |
| DR-PAT-06 | Patient without consented tele-consult | Tele-consult only allowed after consent | Start tele-Rx flow | Blocked until patient records e-consent |
| DR-PAT-07 | Minor patient (< defined age) without guardian info | Age policy flag on | Open chart | Warning; guardian details must be filled before issuing Rx |
| DR-PAT-08 | Patient allergies visible prominently | Allergies in chart | Open chart header | Allergy chips (e.g., "Penicillin — severe") visible at all times during Rx |
| DR-PAT-09 | Patient active medication reconciliation | Existing active Rx from another doctor | Open chart | Active meds list populated; highlighted as "Active externally" |
| DR-PAT-10 | Cross-patient contamination guard | Doctor has two chart tabs open | Switch tabs mid-Rx | Rx draft is bound to originating MRN; issuing in wrong tab blocked with confirmation |

---

## 3. Start / resume consultation context

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-CON-01 | Start new consultation — in-person | Patient chart open | Click "Start consultation" → fill vitals → chief complaint → diagnosis ICD-10 | Consultation instance created; prescription module enabled |
| DR-CON-02 | Start tele-consultation with video | Tele-consult appt | Click "Join call" → video connects → start Rx | Rx module available only after call-joined event logged |
| DR-CON-03 | Resume draft consultation | Draft from earlier today | Click patient → "Resume draft" | Previously entered fields and medicine list restored |
| DR-CON-04 | Prescription without diagnosis | No diagnosis set | Try "Sign & Issue" | Soft warning "Diagnosis not recorded"; doctor must confirm or add |
| DR-CON-05 | Prescription without chief complaint | Missing CC | Issue Rx | Validation depending on policy (block or warn) |
| DR-CON-06 | Vitals abnormal (e.g., BP 200/120) | Vitals entered | Add antihypertensive | Contextual suggestion; vitals printed on Rx |
| DR-CON-07 | Pediatric patient — weight required for dose | Age < 12, weight missing | Add paediatric drug | Block "Weight is required for paediatric dosing" |

---

## 4. Medicine search & selection

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-MED-01 | Search by brand name | Formulary loaded | Type "Crocin" | Autocomplete lists Crocin 500 mg, 650 mg, Syrup, etc. |
| DR-MED-02 | Search by generic/composition | Drug indexed | Type "Paracetamol" | All brands + generic Paracetamol listed with strengths |
| DR-MED-03 | Search with typo | Fuzzy enabled | Type "paracetmol" | Near matches returned |
| DR-MED-04 | Search with 1–2 chars | Min chars enforced | Type "pa" | Either no call, or truncated results; no perf issue |
| DR-MED-05 | Drug not in formulary | Org uses restricted formulary | Search off-formulary drug | Shown but flagged "Non-formulary — requires approval/reason" |
| DR-MED-06 | Discontinued drug | Drug flagged discontinued | Select it | Warning "Discontinued — alternatives: X, Y" |
| DR-MED-07 | Select from quick favourites | Doctor has saved favourites | Open "My favourites" | Saved drug with preset dose added in one click |
| DR-MED-08 | Select from prior prescription | Patient has past Rx | Click "Repeat last Rx" | Previous medicines copied with review prompt per line |
| DR-MED-09 | Stock/availability indicator (in-house pharmacy) | Inventory integration on | View drug | In-stock / low-stock / out-of-stock badge shown |
| DR-MED-10 | Same drug added twice | Duplicate entry | Add Amoxicillin 500 then again | Warn "Already added in this Rx"; allow override with reason |

---

## 5. Dosage builder — strength, route, frequency, duration

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-DOSE-01 | Structured dose — happy path | Drug selected | Strength 500 mg, Route: Oral, Frequency: TID, Duration: 5 days, Before/after food: After, Timing: — | Line saves; total quantity = 15 tabs auto-calculated |
| DR-DOSE-02 | Missing strength | — | Leave strength blank | Block with "Strength is required" |
| DR-DOSE-03 | Missing frequency | — | Leave frequency blank | Block with "Frequency is required" |
| DR-DOSE-04 | Missing duration | — | Leave duration blank | Block or allow only with "SOS"/"Until review" toggle |
| DR-DOSE-05 | Auto total-quantity calc | Frequency TID, duration 7 days, 1 tab/dose | Fill fields | Total qty = 21 |
| DR-DOSE-06 | Manual override of total quantity | Doctor edits auto qty | Change 21 → 30 | Accepted; reason optional; printed qty = 30 |
| DR-DOSE-07 | Maximum safe dose exceeded | Paracetamol > 4 g/day for adult | Frequency QID × 1000 mg | Alert "Exceeds max recommended daily dose"; override requires reason |
| DR-DOSE-08 | Minimum therapeutic dose warning | Antibiotic under-dosed | Enter sub-therapeutic | Warn with override |
| DR-DOSE-09 | Invalid non-numeric strength | — | Enter "abc" | Inline validation error |
| DR-DOSE-10 | Negative / zero values | — | Duration = 0 | Rejected |
| DR-DOSE-11 | Fractional dose allowed | Syrup 2.5 ml | Enter 2.5 | Accepted |
| DR-DOSE-12 | Route mismatch | Tablet with IV route selected | Select IV | Block "Route not applicable for this formulation" |
| DR-DOSE-13 | Taper schedule | Steroid taper: 40→30→20→10 mg | Use taper builder | All steps saved and printed in order with start dates |
| DR-DOSE-14 | SOS / PRN medication | Frequency SOS | Max 3/day specified | Accepted; printed with "SOS — max 3/day" |
| DR-DOSE-15 | Instructions field — free text | Multi-line instructions | Enter "Take with plenty of water" | Saved & printed verbatim |
| DR-DOSE-16 | Instruction length limit | > allowed chars | Paste long text | Truncated with counter |
| DR-DOSE-17 | Weight-based dosing for pediatrics | Child 15 kg | Enter mg/kg → auto calc per-dose | Correct per-dose mg shown; parent can override |
| DR-DOSE-18 | Renal dose adjustment | Patient eGFR < 30 | Add renally cleared drug | Alert with suggested adjusted dose |
| DR-DOSE-19 | Hepatic dose adjustment | Liver dysfunction flag | Add hepatotoxic drug | Alert + suggestion |
| DR-DOSE-20 | Re-order lines | Multiple meds | Drag-reorder | Order reflected in preview and print |

---

## 6. Safety checks — interaction, allergy, duplicate, pregnancy

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-SAFE-01 | Allergy match — hard block | Patient allergic to Penicillin | Add Amoxicillin | Critical alert; drug cannot be added without override reason |
| DR-SAFE-02 | Allergy match — class-level | Allergy "sulfa" | Add Cotrimoxazole | Alert triggered |
| DR-SAFE-03 | Drug–drug interaction — major | Warfarin active + add NSAID | Add Ibuprofen | Major interaction alert with bleeding risk |
| DR-SAFE-04 | Drug–drug interaction — contraindicated | Absolute contraindication | Try to add | Blocked unless reason entered and acknowledged |
| DR-SAFE-05 | Duplicate therapy same class | Already on Atorvastatin | Add Rosuvastatin | Duplicate-therapy warning |
| DR-SAFE-06 | Pregnancy category X/D | Female of reproductive age, pregnant flag | Add Isotretinoin | Block with pregnancy-category warning |
| DR-SAFE-07 | Lactation warning | Nursing flag set | Add flagged drug | Warning with safer alternative suggestion |
| DR-SAFE-08 | Elderly / geriatric (Beers list) | Age > 65 | Add Diazepam long-term | Warning "Potentially inappropriate in elderly" |
| DR-SAFE-09 | Paediatric contraindication | Child < 12 | Add Aspirin | Reye's syndrome warning/block |
| DR-SAFE-10 | Override with reason | Alert raised | Click override → enter reason | Reason logged in audit trail; Rx proceeds |
| DR-SAFE-11 | Override without reason | Reason empty | Click override → Save | Blocked; reason mandatory |
| DR-SAFE-12 | Multiple simultaneous alerts | Allergy + interaction + duplicate | Add drug | All alerts shown grouped; each overridable individually |
| DR-SAFE-13 | Alert suppressed inadvertently | Dismiss popup | — | Alert persists as banner on line item; not silently removed |
| DR-SAFE-14 | No false positives on dissimilar names | Allergy to "sulfa" | Add Sulfasalazine vs Sorafenib | Correct behaviour: alert for Sulfasalazine only |

---

## 7. Controlled substances / Schedule H1 / narcotics

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-CTRL-01 | Schedule H1 drug requires indication | Add Ciprofloxacin/Schedule-H1 med | Save | Indication/ICD-10 mandatory; cannot sign without it |
| DR-CTRL-02 | Narcotic (NDPS) — doctor not authorised | Doctor lacks narcotic licence | Try to add | Blocked "Not authorised to prescribe narcotic drugs" |
| DR-CTRL-03 | Narcotic — max duration enforced | Regulation limits to 7 days | Enter 14 days | Blocked/clamped to 7 days |
| DR-CTRL-04 | Narcotic — duplicate Rx across doctors | Another doctor prescribed same narcotic recently | Add narcotic | Critical alert with other Rx reference |
| DR-CTRL-05 | Schedule X — printed in duplicate | Add Schedule X drug | Issue | System forces duplicate copy + patient-ID capture on print |
| DR-CTRL-06 | Controlled Rx — requires DSC / HPR signature | E-Rx regulation | Sign | Cannot issue without active DSC/HPR |

---

## 8. Prescription preview & edit

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-PREV-01 | Preview renders all sections | Meds + instructions added | Click "Preview" | Header (doctor, regn no., clinic), patient block, diagnosis, Rx lines with Rx symbol, instructions, signature placeholder, date/time |
| DR-PREV-02 | Edit a line from preview | Preview open | Click line "Edit" | Returns to builder with that line loaded |
| DR-PREV-03 | Remove a line | Preview open | Click "Remove" → confirm | Line removed; totals recomputed |
| DR-PREV-04 | Reorder lines | Preview open | Drag reorder | Order updated in preview |
| DR-PREV-05 | Save as draft | Preview open | Click "Save draft" | Rx saved as Draft; visible in patient chart but not valid for dispensing |
| DR-PREV-06 | Discard draft | Draft open | Click "Discard" → confirm | Draft deleted; audit entry recorded |
| DR-PREV-07 | Preview language — local script | Clinic language = Hindi/Tamil | Toggle language | Drug names/instructions localised where available |

---

## 9. Sign & issue prescription

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ISSUE-01 | Sign & issue — happy path | All validations pass | Click "Sign & Issue" → DSC PIN | Rx status = Issued; immutable copy stored; unique Rx ID generated |
| DR-ISSUE-02 | Sign without DSC (where mandated) | DSC not attached | Click Sign | Blocked; hint to attach token |
| DR-ISSUE-03 | DSC PIN wrong | DSC attached | Enter wrong PIN | Error; lock after N attempts |
| DR-ISSUE-04 | Network failure mid-issue | Network drop | Click Sign | Atomic — either issued with ID or rolled back; no orphaned state; retry safe |
| DR-ISSUE-05 | Duplicate click / double submit | — | Click Sign twice rapidly | Exactly one Rx issued |
| DR-ISSUE-06 | Rx ID format & uniqueness | — | Issue 1000 Rx | IDs unique, monotonic per clinic, format as defined |
| DR-ISSUE-07 | Date/time stamp | — | Issue Rx | Stamped with server time, timezone, and valid-till (if any) |
| DR-ISSUE-08 | Back-dated Rx | Attempt to set prior date | Edit date | Blocked or requires elevated permission |
| DR-ISSUE-09 | Future-dated Rx | Prospective start date allowed | Set start date +3 days | Accepted; printed start date visible |
| DR-ISSUE-10 | Empty Rx | No medicines added | Click Sign | Blocked "Add at least one medicine" |

---

## 10. Deliver prescription — print, PDF, SMS/email, pharmacy

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-DEL-01 | Print prescription | Issued Rx | Click "Print" | Print dialog; layout matches preview; QR code with Rx ID |
| DR-DEL-02 | Download PDF | Issued Rx | Click "Download" | PDF generated; filename includes Rx ID & date |
| DR-DEL-03 | Send to patient via SMS | Patient has verified mobile | Click "Send SMS" | SMS with secure link; link opens Rx PDF after OTP |
| DR-DEL-04 | Send to patient via email | Patient has verified email | Click "Send email" | Email with PDF attachment / secure link |
| DR-DEL-05 | Send to pharmacy | Linked pharmacy network | Choose pharmacy → send | Pharmacy receives e-Rx; acknowledgement status tracked |
| DR-DEL-06 | Patient contact missing | No mobile/email | Try SMS/email | Blocked with prompt to update contact |
| DR-DEL-07 | Bounced/undeliverable SMS | Invalid number or DLT block | Send | Delivery failure status visible; doctor can retry/print |
| DR-DEL-08 | Patient download via ABHA / locker | Patient links ABHA locker | Issue Rx | Rx auto-published to ABHA account |
| DR-DEL-09 | Tele-consult — Rx in chat window | Video consult active | Issue Rx | Rx link delivered in chat panel |
| DR-DEL-10 | QR code verification | Pharmacy scans QR | Scan | Redirects to verification endpoint showing valid/issued/cancelled status |

---

## 11. Refills / repeat prescription

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-REFILL-01 | Refill existing Rx | Prior Rx within refill window | Click "Refill" on past Rx | New Rx pre-filled; doctor reviews & issues |
| DR-REFILL-02 | Refill expired Rx | Past validity | Click "Refill" | Allowed but requires re-confirmation of each line |
| DR-REFILL-03 | Refill narcotic — blocked | Controlled med | Click "Refill" | Blocked; fresh Rx required |
| DR-REFILL-04 | Refill count limit | Rx marked "0 refills" | Click "Refill" | Blocked per original order |
| DR-REFILL-05 | Pharmacy refill request | Pharmacy sends refill request | Doctor approves/denies | Status reflects; new Rx created on approve |

---

## 12. Amend / cancel issued prescription

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-AMEND-01 | Cancel Rx before dispensing | Status = Issued, not dispensed | Click "Cancel" → reason | Status = Cancelled; patient/pharmacy notified |
| DR-AMEND-02 | Cancel after partial dispense | Pharmacy dispensed 1 of 3 lines | Click "Cancel" | Warning; only undispensed lines cancellable |
| DR-AMEND-03 | Amend Rx — reissue pattern | Issued Rx needs dosage change | Click "Amend" | Original marked Superseded; new version links to original via parent ID |
| DR-AMEND-04 | Cancel fully dispensed Rx | Already dispensed | Try cancel | Blocked; only advisory note can be added |
| DR-AMEND-05 | Cancel without reason | — | Click "Cancel" → blank reason | Blocked; reason mandatory |
| DR-AMEND-06 | Audit trail for amendments | Amend chain exists | Open Rx history | All versions visible with who/when/why |

---

## 13. Prescription history & audit

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-HIST-01 | View patient's Rx history | Patient has past Rx | Open "Prescriptions" tab | Chronological list: date, doctor, status |
| DR-HIST-02 | Filter by status | Mixed statuses | Filter "Cancelled" | Only cancelled shown |
| DR-HIST-03 | Filter by date range | — | Set range | Only Rx within range |
| DR-HIST-04 | Open a past Rx | — | Click row | Read-only preview with all original data including signature & time |
| DR-HIST-05 | Cross-doctor visibility | Same patient seen by multiple doctors in org | Open chart | Other doctors' Rx visible (based on consent/role) |
| DR-HIST-06 | External Rx visibility | Patient ABHA-linked external Rx | Open history | External Rx shown with source tag |
| DR-HIST-07 | Audit log for a single Rx | — | Open "Audit" on Rx | Create/sign/print/send/cancel events with user, timestamp, IP |

---

## 14. Notifications

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-NOTIF-01 | Patient SMS on issue | SMS enabled | Issue Rx | Patient receives SMS with Rx link within SLA |
| DR-NOTIF-02 | Patient email on issue | Email enabled | Issue Rx | Email with PDF/link received |
| DR-NOTIF-03 | Pharmacy notification | Pharmacy integration | Send | Pharmacy portal receives event |
| DR-NOTIF-04 | Doctor notification on pharmacy dispense | Dispense event | Pharmacy dispenses | Doctor dashboard shows "Dispensed" status |
| DR-NOTIF-05 | Failure notification | SMS gateway down | Issue | Doctor sees warning banner; manual delivery option |
| DR-NOTIF-06 | Opt-out respected | Patient opted out of SMS | Issue | SMS not sent; email or print only |

---

## 15. Accessibility, localisation & UX

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-UX-01 | Keyboard-only Rx entry | — | Tab through fields, use arrow keys in dropdowns | All fields reachable; focus visible |
| DR-UX-02 | Screen reader on drug selection | NVDA/VoiceOver on | Navigate autocomplete | Options and selected value announced |
| DR-UX-03 | Language toggle | Locale support | Switch EN → HI | Labels translated; drug names remain clinical |
| DR-UX-04 | Responsive — tablet use in OPD | iPad in landscape | Use Rx module | Usable without horizontal scroll; print still A4-accurate |
| DR-UX-05 | Dark mode | Supported | Toggle | No contrast issues on alerts |
| DR-UX-06 | High-density list | 15+ drug lines | Scroll | No performance lag; sticky header with patient + totals |

---

## 16. Error handling, performance, reliability

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-ERR-01 | Formulary service down | Drug search service 5xx | Search drug | Graceful error; fallback to last cached formulary if available; can save draft |
| DR-ERR-02 | Interaction service timeout | Alert service slow | Add drug | Soft warning "Interaction check unavailable — proceed with caution"; manually confirm required before sign |
| DR-ERR-03 | Concurrent edits | Two tabs editing same draft | Save in both | Last-write-wins with conflict detected banner; no silent data loss |
| DR-ERR-04 | Browser crash mid-Rx | Unsaved lines | Reopen | Draft auto-recovery up to last N-second save |
| DR-ERR-05 | Large patient history load | 500 past Rx | Open chart | Paginated / lazy-loaded; first page under SLA |
| DR-ERR-06 | Clock skew on client | Client time wrong | Issue Rx | Server time used on Rx; no manipulation possible |
| DR-ERR-07 | Print preview across browsers | Chrome, Safari, Firefox, Edge | Print | Same A4 layout; QR & signature intact |

---

## 17. Security & privacy

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-SEC-01 | PHI not in URL / logs | Issue Rx | Inspect network & logs | No patient name/MRN/drug in URL query or plain logs |
| DR-SEC-02 | Rx PDF access control | Patient link | Unauthenticated open | Requires OTP or token; expires after configured window |
| DR-SEC-03 | Role cannot issue outside scope | Dentist adds Schedule-X drug | Save | Blocked by role/speciality rules |
| DR-SEC-04 | Tamper evidence | Download PDF → edit locally → upload | Verify | QR verification detects tamper; signature invalid |
| DR-SEC-05 | Session hijack protection | Same session from two geographies | — | Suspicious-session prompt; re-auth required |
| DR-SEC-06 | Audit immutable | Attempt to delete audit row via API | — | Forbidden; audit table append-only |
| DR-SEC-07 | Consent-based cross-org view | No consent | Try to view other-org Rx | Blocked |

---

## 18. Edge cases

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| DR-EDGE-01 | Patient with identical name + DOB | Two patients | Search | Both shown with MRN to disambiguate; no silent merge |
| DR-EDGE-02 | Drug with same brand in multiple strengths | — | Select brand | Must pick strength explicitly; no default |
| DR-EDGE-03 | Instruction with special chars / emoji | — | Paste | Sanitised; prints without layout break |
| DR-EDGE-04 | Rx spanning page | Many lines | Print | Clean page break; header + signature repeat; line split across pages avoided |
| DR-EDGE-05 | Daylight-saving transition | — | Issue around DST change | Timestamp correct; valid-till unaffected |
| DR-EDGE-06 | Leap-day follow-up | Issue on Feb 29 with "review in 1 year" | — | Review date computed sanely (Feb 28 or Mar 1 per policy) |
| DR-EDGE-07 | Patient deceased flag | Flag set after issue | — | Further Rx blocked; prior Rx preserved read-only |
| DR-EDGE-08 | Very long drug name (>100 chars) | — | Select | Truncated with tooltip; prints without overflow |
| DR-EDGE-09 | Zero-stock in-house drug | Out of stock | Issue | Warning but Rx allowed; suggest alternative |
| DR-EDGE-10 | Doctor's registration expires during session | Expiry mid-consult | Click Sign | Blocked at issue time; draft preserved |

---

## Traceability notes

- Each test should record: patient MRN used, drug(s) added, alerts fired, override reasons, Rx ID issued, delivery channels, and final audit entries.
- For regulated markets (e.g., India e-Rx / US DEA / EU eHealth), map tests `DR-AUTH-09`, `DR-CTRL-*`, `DR-ISSUE-01..04`, and `DR-SEC-*` to the relevant regulatory clause.
- Regression suite (smoke): `DR-AUTH-01`, `DR-PAT-01`, `DR-MED-01`, `DR-DOSE-01`, `DR-SAFE-01`, `DR-ISSUE-01`, `DR-DEL-01`, `DR-AMEND-01`.
