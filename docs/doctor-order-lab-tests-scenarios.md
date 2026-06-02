# Doctor Ordering Lab Tests for Patients — Functional Test Scenarios

Scope: end-user test scenarios for a **doctor/physician ordering laboratory investigations** (pathology, radiology, microbiology, genetics, etc.) for a patient via an EMR/EHR / LIS-integrated platform. Covers doctor authentication, patient selection, test catalog browsing & search, panel/profile ordering, specimen & collection details, clinical indication / ICD coding, priority (routine / urgent / STAT), fasting & prep instructions, ABN / consent, duplicate-order checks, drug-interference alerts, signing & releasing the order, sample collection scheduling (in-house / home / partner lab), barcode / accession generation, status tracking, result review, amendments / cancellations, and audit trail. Sample processing inside the lab, billing/insurance adjudication, and result-driven prescribing are out of scope except where they surface to the ordering doctor.

**Pages / flows exercised:**
- Doctor login (password + 2FA / digital signature token)
- Doctor dashboard (today's appointments, queue, pending results)
- Patient chart / EMR summary (allergies, active meds, prior labs)
- Start / resume consultation (in-person or tele-consult)
- Vitals, chief complaint, working diagnosis (ICD-10)
- Lab order module — add / edit / remove tests
- Test catalog search (test code, name, LOINC, panel, specialty)
- Panels / profiles (e.g., CBC, LFT, KFT, Lipid, TFT, ANC panel) and reflex tests
- Specimen / sample type & collection metadata (blood, urine, stool, swab, biopsy, imaging body part)
- Priority (Routine / Urgent / STAT / Pre-op)
- Clinical indication / ICD-10, relevant history (LMP, fasting status, pregnancy, drugs)
- Patient prep & fasting instructions
- Duplicate-order, frequency-limit, drug-interference, contrast-allergy, and pregnancy alerts
- ABN (Advance Beneficiary Notice) / patient consent & cost estimate
- Order preview, digital signature, "Sign & Send" / Release
- Specimen collection scheduling (in-house phlebotomy, home collection, partner lab)
- Accession / barcode generation, requisition print / PDF / SMS-email
- Order status tracking (Ordered → Collected → In-process → Resulted → Reviewed)
- Amend / cancel / add-on test
- Result review, abnormal flag acknowledgement, sign-off
- Lab order history & audit trail

**Key UI components:**
- Login with 2FA and optional DSC / HPR (Health Professional Registry) token
- Patient search (name, MRN, phone, ABHA/UHID, DOB)
- Lab catalog autocomplete (test name, code, LOINC, synonym) with department badge
- Quick-pick "Favorites" and "Recent orders" by doctor / specialty
- Panel expand/collapse showing constituent tests
- Order grid columns: Test, Specimen, Container, Priority, Fasting, Cost, Insurance status
- Priority radio: Routine / Urgent / STAT
- Clinical indication free-text + ICD-10 picker
- Allergy/intolerance and active-meds chip list on patient header
- Alert modal (critical / major / moderate / minor with override + reason)
- Cost / coverage estimator
- Requisition preview (doctor letterhead, registration no., signature, date/time, barcode)
- "Sign & Send to Lab" primary button
- Order list with statuses: Draft, Pending Collection, Collected, In-Process, Resulted, Reviewed, Amended, Cancelled
- Result viewer with reference ranges, delta check, trend graph

---

## 1. Doctor access & authentication

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-AUTH-01 | Login — happy path | Registered doctor with valid credentials | Enter username + password → enter 2FA OTP | Dashboard loads with appointments and pending-results widget |
| LAB-AUTH-02 | Login — wrong password | — | Enter valid username + wrong password | Error "Invalid credentials"; no session; attempt counter increments |
| LAB-AUTH-03 | Login — account locked after N failed attempts | 5 consecutive failures | 6th attempt | Account locked for fixed window; reset link shown |
| LAB-AUTH-04 | 2FA — invalid OTP | Username+password correct | Enter wrong OTP | Error "Invalid OTP"; lab order module NOT accessible |
| LAB-AUTH-05 | 2FA — expired OTP | OTP past validity window | Submit | "OTP expired; resend" |
| LAB-AUTH-06 | Doctor without active medical-council registration | Registration expired/suspended | Login | Blocked: "Your registration is not active." Cannot release orders |
| LAB-AUTH-07 | Inactive/disabled doctor account | Admin disabled account | Login | "Account is disabled" |
| LAB-AUTH-08 | Session timeout mid-order | Idle > timeout with draft order open | Resume typing | Re-login prompt; draft auto-saved and recoverable |
| LAB-AUTH-09 | DSC / HPR token required to release e-orders | Jurisdiction mandates digital signing | Try "Sign & Send" without DSC | Button disabled; tooltip "Attach DSC/HPR token to release" |
| LAB-AUTH-10 | Role-based access — nurse/receptionist | Logged in as non-prescriber role | Open lab order module | Access denied or read-only; cannot release |
| LAB-AUTH-11 | Specialty restriction | GP attempting to order genetic / oncology panel | Open such test | Allowed only if specialty permission granted; otherwise referral required |

---

## 2. Patient selection & chart open

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-PAT-01 | Select patient from today's queue | Appointment scheduled | Click patient row | Chart opens with demographics, allergies, active meds, recent labs |
| LAB-PAT-02 | Search by MRN | Patient exists | Enter MRN | Exact match opens chart |
| LAB-PAT-03 | Search by partial name | Multiple matches | Type "Shar" | List shown with DOB/phone disambiguation |
| LAB-PAT-04 | Search — no results | Unknown patient | Type random string | "No patient found"; option "Register new patient" |
| LAB-PAT-05 | Two patients with same name | Common name | Search | Both rows visible with distinguishing fields (DOB, MRN, mobile) |
| LAB-PAT-06 | Open chart for inactive / merged patient | Record merged into another | Open old MRN | Auto-redirect to surviving record with banner |
| LAB-PAT-07 | Open chart for deceased patient | DOD recorded | Open chart | Header banner "Deceased on dd-mmm-yyyy"; new lab orders disabled |
| LAB-PAT-08 | Patient demographic completeness check | DOB or sex missing | Open lab order module | Warning "DOB & sex required for reference-range interpretation" |
| LAB-PAT-09 | Patient height / weight missing for BSA-based dose-driven tests | e.g., creatinine clearance calc | Add such test | Prompt to capture height/weight |
| LAB-PAT-10 | Pregnancy / LMP not captured for female of child-bearing age | Female 15–50 | Order radiology w/ contrast | Mandatory pregnancy & LMP prompt |
| LAB-PAT-11 | Verify patient identity with two identifiers | Hospital policy | At order release | System confirms name + DOB / MRN matched |

---

## 3. Consultation context & order initiation

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-CTX-01 | Start order from active consultation | Encounter open | Click "Add Lab Order" | Order linked to current encounter & ICD diagnosis |
| LAB-CTX-02 | Start ad-hoc order without encounter | Walk-in advice | Use quick-order | Forces selection of encounter type or "Standalone" with reason |
| LAB-CTX-03 | Working diagnosis present | ICD-10 entered | Add tests | Diagnosis auto-populates "Clinical indication" |
| LAB-CTX-04 | No diagnosis entered | Encounter blank | Try to release | Block: "Clinical indication / ICD-10 required" |
| LAB-CTX-05 | Multiple diagnoses on encounter | Two ICDs | Open order | User can map specific tests to specific diagnoses |
| LAB-CTX-06 | Tele-consult patient — sample collection logistics | Tele-consult mode | Add lab order | System defaults to home collection / partner lab options |
| LAB-CTX-07 | Continue saved draft order | Draft exists | Reopen patient | "You have a draft order — Resume / Discard" |
| LAB-CTX-08 | Auto-save during typing | User typing rapidly | Network blip | Draft persisted; no data loss on reload |

---

## 4. Test catalog search & selection

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-CAT-01 | Search by exact test name | "Complete Blood Count" exists | Type full name | Single match highlighted |
| LAB-CAT-02 | Search by abbreviation | "CBC" | Type | Maps to Complete Blood Count |
| LAB-CAT-03 | Search by LOINC code | LOINC catalog enabled | Type LOINC | Test surfaces |
| LAB-CAT-04 | Search by synonym | "Sugar" → glucose | Type "Sugar" | Glucose tests listed |
| LAB-CAT-05 | Search returns deprecated test | Old code marked obsolete | Type code | Item shown with "Use replacement: X" suggestion; cannot order obsolete |
| LAB-CAT-06 | Search returns multiple variants | Glucose Fasting / PP / Random | Type "Glucose" | Variants shown with specimen & timing differences |
| LAB-CAT-07 | Department filter | Filter to "Radiology" | Search "USG" | Only radiology USG variants shown |
| LAB-CAT-08 | Specialty favorites | Cardiologist sees Troponin/BNP near top | Open catalog | Personal/role favorites surfaced |
| LAB-CAT-09 | Catalog with no result | Misspelling | Type "Triponin" | Did-you-mean suggestion "Troponin" |
| LAB-CAT-10 | Restricted test (MTP-PCR, HIV) | Special consent required | Add test | Consent dialog before adding |
| LAB-CAT-11 | Outsourced / send-out test | Performed by referral lab | Add test | Banner "Send-out: TAT 5–7 days"; partner lab visible |
| LAB-CAT-12 | Test not available at this site | Site catalog | Add test | Block: "Not available at this branch — choose alternate location" |
| LAB-CAT-13 | Add same test twice in one order | Duplicate within order | Add CBC twice | Inline warning; collapse into single line or force confirmation |

---

## 5. Panels, profiles & reflex tests

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-PANEL-01 | Add a standard panel (e.g., LFT) | LFT panel defined | Click panel | All constituent tests added; cost shown as panel price |
| LAB-PANEL-02 | Expand panel to view sub-tests | LFT added | Click expand | Sub-tests listed read-only with shared specimen |
| LAB-PANEL-03 | Remove a single sub-test from panel | Panel breakable per config | Remove ALT | Either de-bundles to individual tests OR blocks per policy |
| LAB-PANEL-04 | Custom panel built by doctor | Doctor saved a custom set | Apply | Tests added in one click; saved for reuse |
| LAB-PANEL-05 | Reflex test rule | TSH abnormal → reflex T3/T4 | Order TSH | UI shows "Reflex: Free T3, Free T4 will run if TSH out of range" |
| LAB-PANEL-06 | Conditional add-on (sequential) | Hep B sAg+ → Hep B viral load | Order Hep B sAg | Add-on shown as conditional, billed only if positive |
| LAB-PANEL-07 | Pre-op panel by procedure | Pre-op for cataract | Pick "Pre-op cataract" | Panel auto-populates per protocol |
| LAB-PANEL-08 | Age/sex-restricted panel | PSA on female patient | Try add | Block with explanation; allow override with reason if policy permits |
| LAB-PANEL-09 | Bundle vs. à-la-carte cost comparison | Both available | Add LFT individually | System suggests cheaper bundle |
| LAB-PANEL-10 | Panel containing one unavailable test at site | Mixed availability | Add panel | Either block or send only available; explicit confirmation |

---

## 6. Specimen, container & collection metadata

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-SPEC-01 | Auto-derive specimen & container | CBC → EDTA whole blood (purple) | Add CBC | Container badge "EDTA — Lavender" auto-shown |
| LAB-SPEC-02 | Mixed specimen tests share tube where possible | LFT + KFT | Add both | UI consolidates to one SST tube |
| LAB-SPEC-03 | Multiple containers required | CBC + Coag + LFT | Add all | Distinct tubes listed with draw order |
| LAB-SPEC-04 | Urine sample type variants | Random / 24-hr / first-morning | Add 24-hr Protein | Prompt for 24-hr urine container & start time |
| LAB-SPEC-05 | Microbiology sample with site | Pus culture | Add culture | Prompt for body site, swab type |
| LAB-SPEC-06 | Histopathology — biopsy site & fixative | Skin biopsy | Add HPE | Prompt for site, formalin volume, fixation time |
| LAB-SPEC-07 | Imaging order — laterality & view | X-ray knee | Add | Mandatory laterality (L/R/Both) + view (AP/Lat) |
| LAB-SPEC-08 | Volume requirement warning | Pediatric patient, total volume > limit | Add many tests | Warning "Total draw exceeds pediatric limit" |
| LAB-SPEC-09 | Special handling — cold chain | Renin/aldosterone | Add | Banner "Transport on ice; collect at scheduled slot" |
| LAB-SPEC-10 | Time-sensitive specimen | Blood gas | Add | "Process within 15 min; on-site analyzer" |
| LAB-SPEC-11 | Manual override of specimen type | Doctor edits | Edit | Audit reason captured |

---

## 7. Priority, fasting & patient prep

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-PREP-01 | Set priority Routine | Default | Add tests | Routine; standard TAT shown |
| LAB-PREP-02 | Set priority Urgent | — | Toggle Urgent | Higher TAT/cost reflected; reason optional |
| LAB-PREP-03 | Set priority STAT | — | Toggle STAT | Mandatory clinical justification; alerts lab |
| LAB-PREP-04 | Pre-op priority | Surgery in <24h | Pick Pre-op | Auto-routes to pre-op queue with surgery date/time |
| LAB-PREP-05 | Fasting required | Lipid / FBS | Add | "Fasting 8–12h" instruction shown to patient |
| LAB-PREP-06 | Conflicting fasting requirement | Random sugar + fasting lipid | Add both | Conflict warning; suggest split visits |
| LAB-PREP-07 | Patient already fed today | "Last meal" entered | Add fasting test | Warn; suggest reschedule |
| LAB-PREP-08 | Drug withholding instructions | Cortisol — hold steroids | Add | Instruction to stop drug X hours prior |
| LAB-PREP-09 | Diet restriction | 5-HIAA — avoid bananas, pineapple | Add | Diet sheet attached to patient instructions |
| LAB-PREP-10 | Hydration instruction | USG abdomen | Add | "Drink 1L water; full bladder" auto-included |
| LAB-PREP-11 | Translate prep instructions | Patient locale Hindi | Generate | Instructions translated to patient's preferred language |

---

## 8. Clinical indication, ICD-10 & history capture

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-IND-01 | Mandatory ICD-10 | Test mandates indication | Try release without | Block; ICD picker forced |
| LAB-IND-02 | Multiple ICDs per test | Two diagnoses | Map | Both shown on requisition |
| LAB-IND-03 | Free-text indication | "R/O sepsis" | Type | Stored alongside ICD |
| LAB-IND-04 | Auto-suggest ICD from chief complaint | "Chest pain" | Open ICD | R07.9 prioritized |
| LAB-IND-05 | LMP captured for female patient | Required for hormonal tests | Add FSH/LH | LMP date prompt |
| LAB-IND-06 | Pregnancy status captured | Female 15–50 | Add CT contrast | Pregnancy field mandatory |
| LAB-IND-07 | Relevant medication list flowed | Anticoagulants on profile | Add INR | Active warfarin shown on requisition |
| LAB-IND-08 | Recent transfusion flag | Transfusion <30 days | Add CBC | Flag passes to lab for interpretation |
| LAB-IND-09 | Travel / exposure history | Suspected infectious | Add tropical panel | Travel history textbox shown |
| LAB-IND-10 | Insurance / authorization code | Payer requires code | Release | Validate payer-specific indication code or block |

---

## 9. Alerts: duplicates, frequency limits, interactions, allergies, age/sex

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-ALERT-01 | Duplicate order — same day | Same test ordered earlier today | Add same test | "Already ordered today by Dr. X" with link; require confirm/cancel |
| LAB-ALERT-02 | Frequency limit — within window | HbA1c within 30 days | Add | Soft warning with override + reason |
| LAB-ALERT-03 | Frequency limit — hard rule | Genetic test once per lifetime | Add second time | Hard block |
| LAB-ALERT-04 | Drug interference alert | Biotin → thyroid assay | Patient on biotin | Warn doctor; advise hold or alternate methodology |
| LAB-ALERT-05 | Contrast allergy | Iodinated contrast allergy | Order CT contrast | Block; allow override only with prep protocol confirmed |
| LAB-ALERT-06 | Pregnancy contraindication | X-ray / CT contrast for pregnant | Order | Block with override + documented justification |
| LAB-ALERT-07 | Age inappropriate | PSA on minor / pediatric | Order | Block / warn |
| LAB-ALERT-08 | Sex-specific test on opposite sex | Pap smear on male | Order | Block / warn |
| LAB-ALERT-09 | Renal-function-dependent contrast | eGFR < 30 | Order CT contrast | Major alert; require nephrology clearance acknowledgement |
| LAB-ALERT-10 | Anticoagulation + invasive specimen | Patient on warfarin INR 4.0 | Order biopsy | Bleeding-risk warning; INR check |
| LAB-ALERT-11 | Override reason captured | Any override | Continue | Reason persists in audit trail |
| LAB-ALERT-12 | Critical alert non-overridable | Hard block category | Try | "Cannot proceed — contact pathologist" |

---

## 10. Cost estimate, ABN & consent

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-COST-01 | Cost estimator | Tests added | View totals | Per-test cost + total + estimated copay |
| LAB-COST-02 | Insurance coverage check | Payer integrated | Add tests | Each line marked Covered / Partial / Not covered |
| LAB-COST-03 | ABN required (US-Medicare-style) | Test not medically necessary per LCD | Release | Generate ABN; capture patient signature before release |
| LAB-COST-04 | Bundled price applied | Panel | Add | Bundle price < sum |
| LAB-COST-05 | Out-of-network partner lab | Send-out | Add | Higher patient share displayed |
| LAB-COST-06 | Consent for genetic / HIV / pregnancy | Restricted test | Add | E-consent dialog before release |
| LAB-COST-07 | Patient declines a test post-estimate | Patient feedback | Doctor removes | Removed line; total recalculated |
| LAB-COST-08 | Promotional package conflict | Pkg already paid covers test | Add same | "Already covered under package X" |

---

## 11. Order preview, signing & release

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-REL-01 | Preview requisition | Order populated | Click Preview | Shows letterhead, doctor reg no., tests, ICD, specimen, priority, prep |
| LAB-REL-02 | Edit from preview | Change a test | Edit → re-preview | Preview reflects change |
| LAB-REL-03 | Sign & Send — happy path | All required fields valid, DSC attached | Click Sign | Order accessioned, status "Pending Collection"; barcode generated |
| LAB-REL-04 | Sign & Send blocked — missing fields | ICD missing | Click Sign | Inline errors highlighted |
| LAB-REL-05 | Sign & Send blocked — DSC absent | Jurisdiction requires | Click | Disabled with tooltip |
| LAB-REL-06 | Network failure during release | API timeout | Click | Order remains Draft; retry banner; no duplicate accession on retry |
| LAB-REL-07 | Idempotent release | Click Sign twice rapidly | Double click | Single accession, single order |
| LAB-REL-08 | Audit entry on release | Released | Open audit | User, timestamp, IP, device captured |
| LAB-REL-09 | Patient e-receipt | Released | Auto | SMS/email with collection details, prep, address |
| LAB-REL-10 | Print requisition / label barcodes | Released | Print | PDF + barcode labels per tube |
| LAB-REL-11 | Multi-location order | Patient at branch A, partner lab at B | Release | Both routed; pickup logistics generated |

---

## 12. Sample collection scheduling & logistics

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-COL-01 | In-house phlebotomy slot | Released | Pick slot | Slot reserved; queue token issued |
| LAB-COL-02 | Home collection booking | Pincode serviceable | Schedule | Phlebo assigned; ETA shown |
| LAB-COL-03 | Home collection — non-serviceable pincode | — | Schedule | Block; suggest nearest center |
| LAB-COL-04 | Reschedule collection | Patient request | Reschedule | New slot; old released |
| LAB-COL-05 | No-show flag | Patient missed slot | After grace | Status "Collection Missed"; notify doctor |
| LAB-COL-06 | Specimen rejected at lab | Hemolyzed | Lab updates | Doctor notified; one-click "reorder same" |
| LAB-COL-07 | Partial collection (one of three tubes) | Difficult draw | Lab updates | Pending tubes flagged; recollection request |
| LAB-COL-08 | Cold-chain breach during transport | Temperature alert | Lab system | Doctor notified; reorder option |
| LAB-COL-09 | Patient prep failed (not fasting) | At collection | Phlebo flag | Doctor decides proceed/abort |
| LAB-COL-10 | Pediatric / elderly collection notes | Special handling | Add note | Note carried to phlebo & lab |

---

## 13. Order tracking, results & sign-off

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-TRK-01 | Track order status | Released | Open order | Statuses Ordered → Collected → In-Process → Resulted |
| LAB-TRK-02 | TAT countdown | Per test SLA | View | Countdown ticking; overdue highlighted |
| LAB-TRK-03 | Notification on result available | Result released | — | Push/email/SMS to ordering doctor |
| LAB-TRK-04 | View result with reference range | Resulted | Open result | Values, units, ranges, flags H/L/Critical |
| LAB-TRK-05 | Critical/panic value | e.g., K+ 7.0 | Resulted | Critical banner; phone callback log shown |
| LAB-TRK-06 | Delta-check vs prior | Significant change | Open | Delta indicator vs last value |
| LAB-TRK-07 | Trend graph | Multiple historical points | Open | Plotted with reference band |
| LAB-TRK-08 | Acknowledge & sign-off result | Doctor reviews | Click "Acknowledge" | Status → Reviewed; timestamp captured |
| LAB-TRK-09 | Unreviewed results dashboard | Pending pile | Open dashboard | List sorted by criticality and age |
| LAB-TRK-10 | Forward result to colleague | Refer for opinion | Forward | Recipient sees with note; original ownership preserved |
| LAB-TRK-11 | Amended result from lab | Lab corrects | Notify doctor | Old/new values diffed; re-acknowledge required |
| LAB-TRK-12 | Attach external result PDF | Outside lab | Upload | Stored under same order linked-result |

---

## 14. Amendments, add-ons & cancellations

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-AMD-01 | Add-on test before collection | Sample not yet drawn | Add | Updated requisition; same accession |
| LAB-AMD-02 | Add-on test after collection (same tube viable) | Sample stable, volume sufficient | Add | Lab confirms feasibility; bill updated |
| LAB-AMD-03 | Add-on infeasible | Sample exhausted | Add | Block: "Recollection required" |
| LAB-AMD-04 | Cancel test pre-collection | Released, not collected | Cancel | Status Cancelled; no charge |
| LAB-AMD-05 | Cancel test post-collection | Drawn, not run | Cancel | Charge per policy; lab acks |
| LAB-AMD-06 | Cancel after result | Released result | Cancel | Block; only "Retract" with reason and audit |
| LAB-AMD-07 | Edit clinical indication post-release | Updated diagnosis | Edit | Re-signed; both versions in audit |
| LAB-AMD-08 | Change priority Routine → STAT | Released | Change | Lab notified; queue re-prioritized |
| LAB-AMD-09 | Cancellation reason required | Any cancel | Submit | Reason mandatory; logged |
| LAB-AMD-10 | Bulk cancel on patient discharge | Inpatient discharged with pending labs | Bulk action | All open orders cancelled with single reason |

---

## 15. Inpatient, ED & repeat orders

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-IP-01 | Standing / repeat order | "FBS daily x 7 days" | Configure | Daily child orders auto-generated until D7 |
| LAB-IP-02 | Stop standing order | Day 4, condition resolved | Stop | Future child orders cancelled |
| LAB-IP-03 | ICU bundle | "ICU Daily" | Apply | Bundle generated for each calendar day |
| LAB-IP-04 | ED STAT panel | Trauma protocol | One-click | Pre-defined panel with STAT priority |
| LAB-IP-05 | Inpatient ward / bed propagated | Admitted patient | Release order | Ward, bed, attending propagated to requisition |
| LAB-IP-06 | Patient transferred mid-order | Ward changed | Auto | New ward updated on label |
| LAB-IP-07 | Discharge with pending labs | Open labs at discharge | Discharge | Confirmation modal: "Pending labs: continue/cancel" |
| LAB-IP-08 | OR / surgery linkage | Pre-op order tied to surgery slot | Schedule surgery | Lab visible on surgery checklist |

---

## 16. Integration & interoperability

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-INT-01 | HL7 ORM message to LIS | Order released | Send | LIS receives ORM with all fields |
| LAB-INT-02 | HL7 ORU result back | Lab releases | Auto | EMR ingests; result attached to order |
| LAB-INT-03 | FHIR ServiceRequest | API enabled | Release | Resource created with code, subject, requester |
| LAB-INT-04 | LOINC mapping for each test | Catalog | Inspect | LOINC populated; missing flagged in admin |
| LAB-INT-05 | DICOM order to RIS / PACS | Imaging test | Release | Modality worklist updated |
| LAB-INT-06 | ABHA-linked order (India) | ABHA-linked patient | Release | Order pushed to PHR linked account |
| LAB-INT-07 | External barcode scan at collection | Phlebo scans | Match | System validates accession ↔ tube |
| LAB-INT-08 | Result auto-attached to encounter | Resulted | Auto | Visible on encounter timeline |

---

## 17. Notifications & patient communication

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-NTF-01 | Order confirmation to patient | Released | Auto | SMS/email with prep + slot + cost |
| LAB-NTF-02 | Collection reminder | Day before slot | Auto | Reminder sent |
| LAB-NTF-03 | Sample collected confirmation | Drawn | Auto | "Sample collected at <time>" |
| LAB-NTF-04 | Result ready notification | Resulted | Auto | Patient and doctor notified |
| LAB-NTF-05 | Critical value escalation | Panic value | Auto | Phone call workflow + SMS to doctor; logged |
| LAB-NTF-06 | Notification preferences | Patient opted out of SMS | — | Channel rules respected |
| LAB-NTF-07 | Doctor on leave — coverage | Out-of-office set | Result returns | Routed to covering doctor |
| LAB-NTF-08 | Failed delivery handling | Wrong number | Bounce | Retry; admin alert |

---

## 18. Audit, compliance & security

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-AUD-01 | Full audit trail per order | Any action | Open audit | User, timestamp, action, before/after diff |
| LAB-AUD-02 | Tamper-evident records | DB-level | Verify | Append-only; no silent edits |
| LAB-AUD-03 | PHI access logging | Doctor opens chart | — | Access event logged |
| LAB-AUD-04 | Break-glass access | Emergency override | Use | Reason captured; security alert |
| LAB-AUD-05 | Role escalation attempt | Non-prescriber | Try release | Denied; security event raised |
| LAB-AUD-06 | Data export | Audit/quality team | Export CSV | RBAC-gated; watermark/hash |
| LAB-AUD-07 | Retention policy | Records older than policy | Retention job | Archived/purged per rule |
| LAB-AUD-08 | HIPAA / DPDP / GDPR right-to-access | Patient request | Generate | Patient receives complete order/result history |
| LAB-AUD-09 | Print watermarks | Each printout | Print | Patient name, MRN, time, "CONFIDENTIAL" |
| LAB-AUD-10 | Secure session in shared workstation | Walk-away | Auto-lock | Session locks; no PHI on screen |

---

## 19. Performance, reliability & accessibility

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-PERF-01 | Catalog autocomplete latency | Catalog 10k+ items | Type | <300 ms suggestions |
| LAB-PERF-02 | Order release under load | Concurrent orders | Stress | No accession collision; SLA holds |
| LAB-PERF-03 | Offline draft preserve | Network drop | Type | Local autosave; resume after reconnect |
| LAB-PERF-04 | Slow LIS callback | LIS lag | Release | Retries & queue; user shown "submitted, awaiting confirmation" |
| LAB-PERF-05 | Browser compatibility | Edge/Safari/Chrome/Firefox latest | Smoke | Module renders & functions |
| LAB-PERF-06 | Mobile / tablet layout | iPad rounding | Release order | Responsive; key actions reachable |
| LAB-PERF-07 | Keyboard-only flow | No mouse | Full order | Tab-order logical; shortcuts documented |
| LAB-PERF-08 | Screen-reader labels | NVDA/JAWS | Navigate | All controls labelled; alerts announced |
| LAB-PERF-09 | High-DPI / zoom 200% | Zoom in | Use module | No clipping or unreachable controls |
| LAB-PERF-10 | Localization & number formats | Locale en-IN, fr-FR | Switch | Dates, decimals, units localized; clinical units never silently changed |

---

## 20. Edge cases & negative scenarios

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| LAB-EDGE-01 | Order without any test | Empty cart | Click Sign | Block: "Add at least one test" |
| LAB-EDGE-02 | Catalog item retired mid-draft | Draft has obsolete code | Resume draft | Flag; require replacement |
| LAB-EDGE-03 | Patient changes sex/DOB after order draft | Draft existed | Resume | Re-validate age/sex constraints; flag conflicts |
| LAB-EDGE-04 | Panel constituents change in catalog | Panel updated | Resume draft | "Panel updated since draft" — accept new vs keep old |
| LAB-EDGE-05 | DST transition during 24-hr urine timing | Spring/fall | Capture start/stop | Time math correct; durations not 23/25 h surprises |
| LAB-EDGE-06 | Time-zone mismatch (mobile vs server) | Phone TZ wrong | Release | Server time used and stamped |
| LAB-EDGE-07 | Very long clinical note (10k chars) | Edge input | Save | Truncate or scroll cleanly; saved fully if allowed |
| LAB-EDGE-08 | Special / non-ASCII patient name | "О'Брайен", "李雷" | Print | Renders correctly; barcode unaffected |
| LAB-EDGE-09 | RTL language patient instructions | Arabic | Generate | RTL formatting on print |
| LAB-EDGE-10 | Browser back during release | Mid-submit | Click back | No half-released order; confirms discard |
| LAB-EDGE-11 | Two doctors editing same draft | Concurrent | Save | Optimistic-lock conflict; merge dialog |
| LAB-EDGE-12 | Duplicate barcode generation race | Two near-simultaneous releases | Stress | No duplicates issued |
| LAB-EDGE-13 | Price change between estimate and release | Catalog updated | Release | Re-prompt patient with new estimate |
| LAB-EDGE-14 | Patient fasting state self-reported wrong | Reports "fasting" but ate | Discovered later | Result flagged; re-collection workflow |
| LAB-EDGE-15 | Lab outage / closure | Holiday | Release | Block STAT to that lab; offer alternates |
| LAB-EDGE-16 | Test removed from formulary mid-day | Mid-shift change | Add | New orders blocked; in-flight unaffected |
| LAB-EDGE-17 | Patient minor — guardian consent | <18 with restricted test | Release | Guardian e-consent required |
| LAB-EDGE-18 | Doctor licence expires while session open | Mid-shift expiry | Release new order | Block on next release attempt |
| LAB-EDGE-19 | Refund/correction on cancelled test | Charged then cancelled | Audit | Refund initiated and traceable |
| LAB-EDGE-20 | Result file corruption | Bad PDF from lab | Open result | Graceful error; re-fetch option |
