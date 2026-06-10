# Voter Card (EPIC) — New Application Functional Test Scenarios

Scope: end-user test scenarios for applying for a **new Voter ID (EPIC) card** through an online election-commission portal (e.g. NVSP/Voter Services Portal-style workflow). Covers account access, Form 6 (new registration), applicant details, address, identity/age proof uploads, photograph, declaration, submission, acknowledgement, tracking, and post-submission actions. Offline/BLO field verification, printing, and dispatch are out of scope except where they surface to the applicant.

**Pages / flows exercised:**
- Landing / login (OTP via mobile or email)
- New user registration
- Dashboard ("My Applications")
- Form 6 — Application for inclusion of name in electoral roll
- Personal details step
- Relative / family details step
- Present & permanent address step
- Document upload step (age proof, address proof, photograph)
- Declaration & preview step
- Submit & acknowledgement (reference number, downloadable PDF)
- Track application status
- Corrections / resubmission
- Notifications (SMS/email)

**Key UI components:**
- Mobile number / email input with OTP verification
- Multi-step form with "Save & Next" / "Previous" / "Save as Draft"
- Date-of-birth picker
- State / District / Assembly Constituency (AC) / Part number cascading dropdowns
- File upload (JPEG/PNG/PDF) with size & format validation
- Photograph preview / re-upload
- Captcha
- Declaration checkbox
- Reference number & acknowledgement PDF download

---

## 1. Access & authentication

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-AUTH-01 | New user sign-up — happy path | Valid Indian mobile number not previously registered | Enter mobile → request OTP → enter OTP → set password | Account created; auto-login; dashboard shown |
| VC-AUTH-02 | Sign-up — mobile already registered | Mobile linked to existing account | Enter mobile → request OTP | Error: "This mobile is already registered. Please log in." — no OTP sent |
| VC-AUTH-03 | OTP — invalid code | OTP requested | Enter wrong 6-digit OTP | Inline error "Invalid OTP"; attempt counter increments |
| VC-AUTH-04 | OTP — expired | OTP older than validity window (e.g. 10 min) | Enter old OTP | Error "OTP expired. Please resend." |
| VC-AUTH-05 | OTP — max retries | 5 wrong OTPs in a row | 6th attempt | Account / device temporarily locked; cooldown message |
| VC-AUTH-06 | OTP — resend throttle | Just requested OTP | Click "Resend" immediately | Resend disabled until countdown (e.g. 30 s) completes |
| VC-AUTH-07 | Login — happy path | Registered user | Enter mobile + password (or OTP) | Dashboard loads with existing applications if any |
| VC-AUTH-08 | Forgot password | Registered user | "Forgot password" → OTP → new password | Password reset; old password rejected on next login |
| VC-AUTH-09 | Session timeout mid-form | Logged in, idle past timeout | Click "Save & Next" | Redirected to login; draft preserved on return |
| VC-AUTH-10 | Logout clears session | Logged in | Click logout → press browser Back | Redirected to login, not back into the form |
| VC-AUTH-11 | Captcha on login | Login page | Submit with wrong captcha | Login rejected; captcha refreshes |

---

## 2. Starting a new Form 6 application

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-START-01 | "Fill Form 6 / New voter registration" entry visible on dashboard | Logged in, no pending Form 6 | — | Tile/button for "New voter registration (Form 6)" visible |
| VC-START-02 | Start new application — happy path | From dashboard | Click "New voter registration" | Form 6 step 1 (Personal details) opens with empty fields |
| VC-START-03 | Already has a pending Form 6 | Prior Form 6 in "Submitted" state | Try to start a new Form 6 | Blocked with message: "You already have a pending Form 6 (Ref: …)"; link to existing application |
| VC-START-04 | Existing voter (EPIC already issued) | User's EPIC already linked | Start Form 6 | Warning suggesting Form 8 (correction) or Form 8A (transposition) instead |
| VC-START-05 | Age < 17 on qualifying date | DOB implies age < 17 on 1 Jan of qualifying year | Proceed past DOB | Hard stop: "Not eligible until you attain 17 years on the qualifying date" |
| VC-START-06 | Age 17 — advance application | DOB implies age 17 on qualifying date | Continue | Form proceeds with advance-application note; will become active on 18th birthday qualifying date |
| VC-START-07 | Non-citizen / OCI | Citizenship = OCI or Foreign | Proceed | Blocked: "Only Indian citizens can enroll as voters" |

---

## 3. Personal details step

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-PD-01 | All mandatory fields — happy path | Form 6 step 1 | Fill name, DOB, gender, mobile, email → Save & Next | Advances to next step; data persisted |
| VC-PD-02 | Name — empty | Name blank | Save & Next | Inline error "Name is required" |
| VC-PD-03 | Name — non-Latin/vernacular | Type in Hindi/Tamil etc. | Save | Accepted; Unicode preserved on review page |
| VC-PD-04 | Name — numerals / special chars | Enter `Ram123 @` | Save | Rejected: "Only alphabets, spaces, and `.` allowed" |
| VC-PD-05 | Name — max length | Paste 500 chars | — | Input capped at documented max (e.g. 75); no crash |
| VC-PD-06 | DOB — future date | Pick tomorrow | Save | Rejected "Date of birth cannot be in the future" |
| VC-PD-07 | DOB — age > 120 years | Year 1850 | Save | Rejected as implausible |
| VC-PD-08 | DOB — exactly 18 on qualifying date | DOB = qualifying date − 18 years | Save | Accepted; no "advance application" flag |
| VC-PD-09 | DOB — one day short of 17 | DOB = qualifying date − 17 years + 1 day | Save | Rejected per VC-START-05 |
| VC-PD-10 | Gender options | — | Open dropdown | Options: Male, Female, Third Gender (and any official additions) |
| VC-PD-11 | Mobile — invalid format | Enter `12345` | Save | "Enter a valid 10-digit Indian mobile" |
| VC-PD-12 | Mobile OTP verification (separate from login) | Valid mobile | Click "Verify" | OTP sent; after verify, field locks with ✓ |
| VC-PD-13 | Email — invalid format | Enter `abc@` | Save | "Enter a valid email"; save blocked |
| VC-PD-14 | Email — optional | Email blank, everything else valid | Save | Advances (email treated as optional) |
| VC-PD-15 | Aadhaar — optional with consent | Enter 12-digit Aadhaar, tick consent | Save | Accepted; masked on review (XXXX-XXXX-1234) |
| VC-PD-16 | Aadhaar — invalid Verhoeff checksum | Enter 12 digits failing checksum | Save | Rejected "Invalid Aadhaar number" |
| VC-PD-17 | Aadhaar without consent | Entered, consent unticked | Save | Submission blocked until consent is ticked, or Aadhaar is cleared |
| VC-PD-18 | Disability flag (optional) | Tick "Person with disability" | — | Sub-options (Locomotor/Visual/Hearing/Other) appear |

---

## 4. Relative / family details step

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-REL-01 | Relation type required | — | Save & Next without selection | "Please select relation (Father/Mother/Husband/Wife/Other)" |
| VC-REL-02 | Relative name required | Relation selected, name blank | Save | "Relative's name is required" |
| VC-REL-03 | Relative EPIC auto-fill | Enter relative's existing EPIC number | Click "Fetch" | Relative's name auto-populates and is read-only |
| VC-REL-04 | Invalid relative EPIC | Enter malformed EPIC | Fetch | "EPIC not found / invalid"; field remains editable |
| VC-REL-05 | "Husband" relation under 18 | Applicant's DOB shows < 18, relation = Husband/Wife | Save | Warning / block per minimum-age-of-marriage rules |

---

## 5. Address step

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-ADDR-01 | Present address — happy path | All fields valid | Save & Next | Advances; AC auto-resolved from pincode |
| VC-ADDR-02 | Pincode — invalid | Enter `00000` or letters | Save | Rejected "Enter a valid 6-digit pincode" |
| VC-ADDR-03 | Pincode → State/District auto-fill | Valid pincode | Tab out | State, District pre-filled and read-only (or editable with confirm) |
| VC-ADDR-04 | AC (Assembly Constituency) dropdown | District selected | Open AC list | Shows only ACs in that district |
| VC-ADDR-05 | Part number (optional) | AC selected | Enter part number | Accepted; validated against AC's part list |
| VC-ADDR-06 | "Same as present" toggle for permanent | Present address filled | Tick "Same as present" | Permanent address auto-mirrors and is disabled |
| VC-ADDR-07 | Untick "Same as present" | Previously ticked | Untick | Permanent address fields become editable and empty |
| VC-ADDR-08 | House number — missing | Blank | Save | "House / Door number is required" |
| VC-ADDR-09 | Ordinarily resident duration | Enter date of starting residence > DOB + 18 | Save | Accepted; used to decide eligibility as "ordinarily resident" |
| VC-ADDR-10 | Date of residence in future | Pick tomorrow | Save | Rejected |
| VC-ADDR-11 | Address line — max length | Paste 1000 chars | — | Capped at documented max (e.g. 250) |
| VC-ADDR-12 | Unicode address | Village name in Devanagari | Save | Preserved verbatim |
| VC-ADDR-13 | Change state after AC selected | Change state | — | AC and District reset / forced to re-pick; stale values cleared |

---

## 6. Document upload step

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-DOC-01 | Age proof — valid PDF | ≤ 2 MB PDF | Upload | Success; thumbnail / file name shown with ✓ |
| VC-DOC-02 | Age proof — valid JPEG | ≤ 2 MB JPEG | Upload | Success |
| VC-DOC-03 | Age proof — oversize | 5 MB PDF (limit 2 MB) | Upload | Rejected "File exceeds 2 MB" |
| VC-DOC-04 | Age proof — unsupported format | `.docx` or `.zip` | Upload | Rejected "Only JPG, PNG, PDF allowed" |
| VC-DOC-05 | Age proof — corrupt/empty file | 0-byte PDF | Upload | Rejected "Unable to read file" |
| VC-DOC-06 | Age proof — replace | File already uploaded | Click "Replace" → upload new | New file overwrites old; old removed from server |
| VC-DOC-07 | Age proof — document type required | Uploaded but no "type" (Birth certificate / 10th marksheet / Passport / Aadhaar) | Save | Rejected: "Select document type" |
| VC-DOC-08 | Address proof — valid | ≤ 2 MB PDF of utility bill | Upload + pick type | Accepted |
| VC-DOC-09 | Address proof — type allowed list | — | Open type dropdown | Shows official list (electricity bill, water bill, bank passbook, rent agreement, etc.) |
| VC-DOC-10 | Photograph — minimum resolution | 200×200 JPEG | Upload | Accepted; preview visible |
| VC-DOC-11 | Photograph — too small | 50×50 | Upload | Rejected "Minimum 200×200" |
| VC-DOC-12 | Photograph — landscape / rotated | Rotated 90° | Upload | Either auto-rotate with preview, OR reject with "portrait orientation required" — consistent with spec |
| VC-DOC-13 | Photograph — animated GIF | Uploaded | — | Rejected "Static image only" |
| VC-DOC-14 | Photograph — preview before save | Uploaded | — | Rendered preview matches uploaded file |
| VC-DOC-15 | All uploads pending — Save & Next | Nothing uploaded | Save & Next | Blocked: "Upload age proof and photograph to continue" |
| VC-DOC-16 | Upload interruption | Network drop mid-upload | — | Fails gracefully with "Retry"; no half-saved artifact |
| VC-DOC-17 | Malware / executable rename | `shell.pdf` actually EXE | Upload | Rejected by MIME sniff, not just extension |
| VC-DOC-18 | Concurrent uploads | Trigger 3 uploads together | — | All complete; no UI deadlock; size total respected if capped |

---

## 7. Declaration, preview & submit

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-SUB-01 | Preview shows all entered data | All prior steps valid | Reach Preview | Every field visible exactly as captured; photograph rendered |
| VC-SUB-02 | Edit from preview | On preview | Click Edit on Address section | Deep-links to Address step with data pre-filled |
| VC-SUB-03 | Declaration unchecked | On preview | Click Submit without tick | Blocked: "Please accept the declaration" |
| VC-SUB-04 | Declaration checked — happy path | All valid + ticked | Click Submit | Success page with reference number + acknowledgement PDF link |
| VC-SUB-05 | Submit — captcha required | Preview with captcha | Submit with wrong captcha | Error; captcha refreshes; form data retained |
| VC-SUB-06 | Double-submit guard | Click Submit twice quickly | — | Only one application created; second click ignored |
| VC-SUB-07 | Server 500 on submit | Backend error | Submit | Friendly error; draft retained; user can retry |
| VC-SUB-08 | Age-on-qualifying-date re-check at submit | DOB makes applicant ineligible now (e.g. spec change) | Submit | Blocked with clear message; no reference number generated |
| VC-SUB-09 | Acknowledgement PDF — content | After submit | Download PDF | Contains reference number, submission timestamp, applicant name, photo thumbnail, AC, declaration text |
| VC-SUB-10 | Acknowledgement — SMS/email | After submit | — | Both SMS and email with reference number arrive within spec'd SLA |
| VC-SUB-11 | Post-submit redirect | After submit | — | "My Applications" shows new row with status "Submitted" |

---

## 8. Drafts

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-DR-01 | Save as draft mid-step | Partial data on step 2 | Click "Save as Draft" | Saved; redirected to dashboard; draft visible |
| VC-DR-02 | Resume draft | Draft exists | Click "Resume" | Opens on the last-saved step with data pre-filled |
| VC-DR-03 | Draft auto-save | Typing on a step | Wait (e.g. 30 s) | Auto-save indicator; refresh retains data |
| VC-DR-04 | Draft expiry | Draft older than retention period (e.g. 30 days) | Log in | Expired notice; draft can no longer be resumed |
| VC-DR-05 | Delete draft | Draft exists | "Delete draft" + confirm | Draft removed; uploaded files purged |
| VC-DR-06 | Max drafts per user | Already at cap (e.g. 1 active Form 6) | Try to create another | Blocked |

---

## 9. Tracking & status

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-TRK-01 | Track by reference number (logged-in) | Submitted application exists | Open "My Applications" | Row shows ref no., submission date, current status |
| VC-TRK-02 | Track by reference number (public tracker) | Have ref no., not logged in | Use public tracker → enter ref | Shows status without PII beyond masked name |
| VC-TRK-03 | Invalid reference in tracker | Random string | Submit | "Application not found" |
| VC-TRK-04 | Status transitions | Application in BLO verification | Check status | Shows current stage (Submitted → BLO Verification → ERO Approval → EPIC Generated → Dispatched) |
| VC-TRK-05 | Rejection with reason | ERO rejected | Check status | Reason displayed; guidance on re-applying |
| VC-TRK-06 | Objection raised | Form 7 objection filed by a citizen | Check status | Notice + hearing date visible |
| VC-TRK-07 | Download EPIC (e-EPIC) | Status = Approved | Click "Download e-EPIC" | PDF downloads with QR code and EPIC number |
| VC-TRK-08 | e-EPIC before eligibility window | Status = Submitted | — | Download disabled / not offered |

---

## 10. Corrections & resubmission

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-COR-01 | BLO raises discrepancy | Status = "Clarification needed" | Open application | Highlighted fields/docs with BLO remarks; "Respond" action enabled |
| VC-COR-02 | Resubmit with new document | Clarification on age proof | Upload new file → Resubmit | Status returns to "Submitted"; history log updated |
| VC-COR-03 | Change locked fields | Clarification only asks for document | Try to edit name | Name locked; only requested fields editable |
| VC-COR-04 | Withdraw application | Status = Submitted | Click "Withdraw" + confirm | Status = Withdrawn; not editable further |
| VC-COR-05 | Withdraw after approval | Status = Approved | — | Withdraw option hidden; Form 7 (deletion) suggested instead |

---

## 11. Accessibility, i18n, and cross-cutting

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-X-01 | Keyboard-only navigation | — | Tab through Form 6 | Logical focus order; skip links; no trapped focus |
| VC-X-02 | Screen-reader labels | Any field | Inspect with reader | Every input has accessible name; errors announced |
| VC-X-03 | Language toggle | Supported: English + regional | Switch to Hindi | Labels, errors, and placeholders re-render; user data unchanged |
| VC-X-04 | Mobile responsive | Open on 360×640 | — | Multi-step form usable; no horizontal scroll; upload works from camera |
| VC-X-05 | Back/forward browser nav | Mid-form | Press Back | Either returns to previous step with data retained, OR warns before losing changes — consistent |
| VC-X-06 | Refresh mid-step | Data entered, not saved | F5 | Auto-save restores; otherwise a clear warning before reload |
| VC-X-07 | Copy-paste DOB | DOB field | Paste `01/01/2005` | Parsed into picker correctly |
| VC-X-08 | Timezone consistency | Submit at 23:59 IST | Check ack timestamp | Displayed in IST; not UTC-shifted to next day |
| VC-X-09 | PII never in URL | Navigate through form | Inspect URLs | No Aadhaar / DOB / mobile in query string or logs |
| VC-X-10 | Rate limiting | Scripted rapid submits | — | Throttled with 429 / captcha challenge; no data corruption |

---

## 12. Negative / security scenarios

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-SEC-01 | XSS in name | Name = `<script>alert(1)</script>` | Save & preview | Rendered as text, not executed |
| VC-SEC-02 | SQL-ish input | Address = `' OR 1=1 --` | Save | Stored and rendered verbatim; no DB error surfaced |
| VC-SEC-03 | CSRF on submit | Craft cross-site form post | — | Rejected (token mismatch) |
| VC-SEC-04 | IDOR on tracker | Ref no. of another user | Open via URL guess | Public tracker shows only status, no PII; dashboard route blocks access |
| VC-SEC-05 | Uploading another user's photo via URL injection | Manipulate upload payload | — | Server re-validates owner & file; no leakage |
| VC-SEC-06 | Replaying submit request | Capture + replay submit | — | Idempotency key / token prevents duplicate application |
| VC-SEC-07 | Downloading e-EPIC without auth | Direct link to PDF | — | 401/403; signed URL expires |
| VC-SEC-08 | OTP brute force | Script 10000 OTPs | — | Blocked by attempt cap + exponential backoff |
