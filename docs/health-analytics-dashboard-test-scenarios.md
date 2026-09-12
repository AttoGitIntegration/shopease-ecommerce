# Health Analytics Dashboard — Functional Test Scenarios

Scope: end-user test scenarios for a **Health Analytics Dashboard** (web UI) used by patients, clinicians, and care-team admins to view vitals, trends, risk scores, medication adherence, and wearable-device data. Covers login/access, KPI cards, charts, filters, alerts, patient lookup, exports, sharing, and compliance concerns. Backend analytics / ML model tests are out of scope.

**Pages exercised:**
- Login / SSO — `/login`
- Dashboard home — `/dashboard`
- Patient detail — `/patients/:patientId`
- Cohort / population view — `/cohorts/:cohortId`
- Alerts center — `/alerts`
- Reports & exports — `/reports`
- Settings — `/settings`

**Key UI components:**
- Global filter bar (date range, patient, cohort, device, unit system)
- KPI summary cards (heart rate, BP, SpO₂, glucose, steps, sleep, BMI, risk score)
- Time-series charts (line, area, band for normal ranges)
- Distribution / histogram charts
- Heatmaps (sleep, activity, adherence)
- Alerts / anomaly list
- Patient search + typeahead
- Export / share dialog
- Role switcher (patient / clinician / admin)

---

## 1. Access, authentication & roles

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| HAD-AU-01 | Login required | Not logged in | Open `/dashboard` | Redirects to `/login` with return URL preserved |
| HAD-AU-02 | Valid login | Valid credentials | Submit form | Lands on role-appropriate dashboard |
| HAD-AU-03 | Invalid password | Wrong password | Submit | Generic "Invalid credentials" (no account enumeration) |
| HAD-AU-04 | SSO (SAML/OIDC) | IdP configured | Click "Sign in with SSO" | Redirect to IdP → return authenticated |
| HAD-AU-05 | MFA challenge | MFA enabled | Login | OTP/TOTP step shown; bypassing URL isn't possible |
| HAD-AU-06 | Session timeout | Idle for N minutes | — | Auto-logout with "session expired" toast; data cleared from UI |
| HAD-AU-07 | Role: Patient | Patient user | — | Sees only own data; no cohort views or other-patient access |
| HAD-AU-08 | Role: Clinician | Clinician user | — | Sees assigned patient panel; alerts scoped to panel |
| HAD-AU-09 | Role: Admin | Admin user | — | Sees org-wide cohorts, user management, audit log link |
| HAD-AU-10 | Role escalation guard | Patient user tries `/cohorts/123` via URL | — | 403 Forbidden page, not empty dashboard |
| HAD-AU-11 | Audit log entry on login | — | Login | Entry in audit log: `user_id, ip, user_agent, ts` |
| HAD-AU-12 | Logout | Authenticated | Click logout | Session invalidated server-side; back button doesn't restore data |

---

## 2. Dashboard home — KPI summary cards

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| HAD-KPI-01 | Cards render on load | Patient has ≥ 1 day of data | Open dashboard | Cards visible within 2 s: HR, BP, SpO₂, glucose, steps, sleep, BMI, risk |
| HAD-KPI-02 | Current value + unit | — | — | Each card shows latest value with correct unit (bpm, mmHg, %, mg/dL, steps, hrs, kg/m², score) |
| HAD-KPI-03 | Delta vs previous period | — | — | Up/down arrow and % change vs selected comparison window |
| HAD-KPI-04 | Color coding by range | Value in normal / borderline / abnormal | — | Green / amber / red per clinical thresholds; accessible (not color-only) |
| HAD-KPI-05 | No data state | New patient, no readings | — | Card shows "No data yet" placeholder, not `NaN`/`null`/`-` |
| HAD-KPI-06 | Stale data indicator | Last reading > 48 h old | — | "Last updated X ago" with warning icon |
| HAD-KPI-07 | Click card drills down | — | Click HR card | Opens HR detail chart scoped to active filters |
| HAD-KPI-08 | Card tooltip | Hover info icon | — | Tooltip shows metric definition and data source (e.g. "Fitbit") |
| HAD-KPI-09 | Metric unit switch | Toggle metric/imperial in settings | — | All cards re-render in new units (e.g. kg ↔ lb); values mathematically correct |
| HAD-KPI-10 | Skeleton on load | Slow network | — | Skeleton placeholders, not a spinner-over-blank |
| HAD-KPI-11 | Reorder cards | Drag card (if supported) | — | New order persists per user |
| HAD-KPI-12 | Hide / pin cards | Toggle in customize menu | — | Hidden cards removed; preference persists across sessions |

---

## 3. Global filter bar

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| HAD-FL-01 | Default date range | Fresh session | — | Default is "Last 7 days" (or org-configured default) |
| HAD-FL-02 | Preset date ranges | — | Pick 24h / 7d / 30d / 90d / 1y / YTD | All cards and charts refresh to match |
| HAD-FL-03 | Custom range picker | — | Pick start=2026-01-01, end=2026-01-31 | Inclusive range applied; URL has `?from=…&to=…` |
| HAD-FL-04 | Invalid range (end < start) | — | Set end before start | Validation error, Apply disabled |
| HAD-FL-05 | Future dates blocked | — | Pick tomorrow | Future dates disabled in picker |
| HAD-FL-06 | Timezone handling | User in IST viewing UTC-stored data | — | Timestamps shown in user's timezone; tooltip shows TZ label |
| HAD-FL-07 | Patient filter (clinician) | Clinician view | Select patient | Dashboard scopes to that patient only |
| HAD-FL-08 | Cohort filter (admin) | — | Select cohort "Diabetic, 50+" | Aggregates re-compute across that cohort |
| HAD-FL-09 | Device filter | Patient uses 2 wearables | Filter by "Apple Watch" | Only readings from that device included |
| HAD-FL-10 | Multiple filters combined | — | Date + cohort + device | AND-logic applied; active filter chips visible |
| HAD-FL-11 | Clear individual filter | Filter chip active | Click × on chip | That filter cleared; others retained; URL reflects change |
| HAD-FL-12 | Reset all filters | — | Click "Reset" | Defaults restored |
| HAD-FL-13 | Deep link with filters | Open `/dashboard?from=…&cohort=…` | — | Page loads with filters pre-applied |
| HAD-FL-14 | Filters persist across pages | Apply filter on home → go to Alerts | — | Alerts page respects the same date/cohort scope |

---

## 4. Time-series charts

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| HAD-CH-01 | Chart renders with data | Readings exist | — | Line chart draws within 1.5 s; no overlap with axis labels |
| HAD-CH-02 | Normal range band | Metric has clinical range | — | Shaded band shows normal range (e.g. BP 90/60–120/80) |
| HAD-CH-03 | Out-of-range points highlighted | Abnormal readings exist | — | Points outside band are styled (e.g. red dot) and labelled in legend |
| HAD-CH-04 | Hover tooltip | — | Hover over data point | Tooltip: exact value, timestamp, device, flag (if abnormal) |
| HAD-CH-05 | Zoom / brush | — | Drag-select region on chart | Chart zooms in; "Reset zoom" button appears |
| HAD-CH-06 | Pan | Zoomed-in chart | Shift+drag | Pans horizontally within data range |
| HAD-CH-07 | Multi-metric overlay | — | Enable "Show HR + BP" | Two y-axes; correct scale for each; legend toggles |
| HAD-CH-08 | Aggregation granularity | — | Switch raw / hourly / daily | Data re-aggregated (avg/min/max); chart updates accordingly |
| HAD-CH-09 | Missing data handling | Gaps in readings | — | Line breaks at gap; no interpolation across > N hours |
| HAD-CH-10 | Annotations (events) | Patient logged "medication taken" | — | Event markers on x-axis with tooltips |
| HAD-CH-11 | Empty chart state | No data for selected range | — | Empty-state illustration + "No readings for this period" |
| HAD-CH-12 | Chart legend toggle | Multi-series | Click legend item | Series hidden; other series rescale |
| HAD-CH-13 | Download as PNG | — | Click download icon | PNG saved; image contains chart title, range, axis labels |
| HAD-CH-14 | Large dataset | 1-year range with 1-min readings | — | Downsampled rendering stays < 2 s; no browser freeze |

---

## 5. Blood pressure, heart rate, SpO₂ (vitals-specific)

| # | Title | Expected |
|---|---|---|
| HAD-V-01 | BP chart shows systolic + diastolic as paired bars/lines | Both values on the same x-point; legend distinguishes them |
| HAD-V-02 | MAP calculation (if shown) | MAP = (SBP + 2·DBP)/3 within ±1 mmHg |
| HAD-V-03 | Pulse pressure flag | SBP − DBP > 60 flagged as high pulse pressure |
| HAD-V-04 | Resting vs active HR | Chart can split resting/active using movement data |
| HAD-V-05 | HRV trend | HRV chart plotted in ms; baseline line per user's 30-day avg |
| HAD-V-06 | SpO₂ below 92% | Readings < 92% highlighted red; count shown in KPI |
| HAD-V-07 | Unit correctness | HR in bpm, BP in mmHg, SpO₂ in % always; no conversions allowed |
| HAD-V-08 | Arrhythmia flag (if provided by device) | Flagged events list under chart with timestamp |

---

## 6. Glucose, weight, BMI, metabolic

| # | Title | Expected |
|---|---|---|
| HAD-M-01 | CGM stream renders | Continuous glucose shows 5-min granularity line; time-in-range (TIR) % computed |
| HAD-M-02 | TIR bands | Low / in-range / high / very-high bands, WHO/ADA thresholds |
| HAD-M-03 | Fasting vs postprandial | Tagged points visible in tooltip |
| HAD-M-04 | Weight trend | kg/lb switch; trend line (e.g. 7-day moving avg) |
| HAD-M-05 | BMI auto-calc | BMI = weight(kg) / height(m)² ; updates when either changes |
| HAD-M-06 | BMI category | Underweight/Normal/Overweight/Obese badge correct per WHO |
| HAD-M-07 | A1c projection (if shown) | Computed from avg glucose via standard formula; clearly labelled as "estimated" |

---

## 7. Activity, sleep, adherence

| # | Title | Expected |
|---|---|---|
| HAD-AC-01 | Step count daily total matches source | Total == sum of hourly bars |
| HAD-AC-02 | Goal progress ring | Ring fills to goal %; 100% still visually bounded |
| HAD-AC-03 | Active minutes breakdown | Light/Moderate/Vigorous segments accurate |
| HAD-AC-04 | Sleep heatmap | Rows = days, columns = hours; color intensity = sleep stage |
| HAD-AC-05 | Sleep stages | Awake/Light/Deep/REM durations sum to total sleep time |
| HAD-AC-06 | Medication adherence % | adherence = (doses taken / doses scheduled) × 100, rounded to 1 dp |
| HAD-AC-07 | Missed-dose markers | Missed doses shown on calendar heatmap with drug name |
| HAD-AC-08 | Weekly summary card | Avg steps, sleep, adherence vs previous week delta |

---

## 8. Risk scores & predictions

| # | Title | Expected |
|---|---|---|
| HAD-RS-01 | Risk score displayed with confidence | Score + confidence interval (e.g. "Risk 7.2 ± 0.8") |
| HAD-RS-02 | Model version label | "Model v2.3, updated 2026-03-15" visible in tooltip |
| HAD-RS-03 | Contributing factors | Top features listed (e.g. "BP trend, sleep, adherence") |
| HAD-RS-04 | Disclaimer banner | "Not a diagnostic tool. For clinical decision support only." |
| HAD-RS-05 | Score refresh cadence | Indicates last compute time and next scheduled refresh |
| HAD-RS-06 | Score history | Trend of risk score over time; can correlate with vitals |
| HAD-RS-07 | Insufficient data | If < N readings, show "Not enough data" instead of score |

---

## 9. Alerts & anomalies

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| HAD-AL-01 | Alerts list loads | Patient has open alerts | Open `/alerts` | Alerts sorted newest first; severity badges visible |
| HAD-AL-02 | Severity filter | — | Filter "Critical" | Only critical alerts shown |
| HAD-AL-03 | Unread count badge | — | — | Count in nav matches unread alerts in list |
| HAD-AL-04 | Acknowledge alert | Clinician role | Click Acknowledge | Marked acknowledged with user + ts; stays in list (not deleted) |
| HAD-AL-05 | Resolve alert | — | Click Resolve + note | Alert closed; note persisted; audit entry created |
| HAD-AL-06 | Snooze alert | — | Snooze 24h | Hidden from active list; reappears after 24h |
| HAD-AL-07 | Real-time push | New abnormal reading during session | — | New alert appears in list / toast without refresh |
| HAD-AL-08 | Alert drill-through | — | Click alert | Jumps to chart view with the triggering point highlighted |
| HAD-AL-09 | Threshold rule editing | Admin | Edit rule "HR > 120" | Saved; takes effect on next evaluation; version bumped |
| HAD-AL-10 | No alerts state | No alerts | — | Friendly empty state, not blank white |
| HAD-AL-11 | False-positive reporting | — | "Mark as false positive" | Flagged; contributes to model feedback; does not re-trigger |

---

## 10. Patient search & selection (clinician/admin)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| HAD-PS-01 | Search by name | Typeahead | Type "jo" | Suggestions after ≥ 2 chars; within clinician's panel only |
| HAD-PS-02 | Search by MRN | — | Type MRN | Matches exact MRN; shows patient header with name + DOB |
| HAD-PS-03 | Search respects access | Clinician A searches for Clinician B's patient | — | No match (unless shared care team); no data leak via count |
| HAD-PS-04 | Recent patients | — | Open dropdown | Last 5 viewed patients shown first |
| HAD-PS-05 | Open patient | Click a result | — | Routes to `/patients/:id`; breadcrumb updated |
| HAD-PS-06 | Patient banner PII | — | — | Name, DOB, MRN, allergies, age visible; matches record |
| HAD-PS-07 | Switch patient | On patient A | Select patient B | Full page refresh of data; no stale data from A |
| HAD-PS-08 | Deceased patient indicator | If applicable | — | Clear banner + styling; read-only mode |

---

## 11. Cohort / population view

| # | Title | Expected |
|---|---|---|
| HAD-CO-01 | Cohort aggregate KPIs | Mean/median/percentiles for chosen metric across cohort |
| HAD-CO-02 | Distribution chart | Histogram with bin selector (5/10/20 bins) |
| HAD-CO-03 | Cohort size | Total patient count matches underlying query |
| HAD-CO-04 | Drill into patient | Click bar/point → list of patients in that bucket |
| HAD-CO-05 | Compare two cohorts | Side-by-side stats for Cohort A vs Cohort B |
| HAD-CO-06 | De-identified mode | Toggle removes all PII from cohort view |
| HAD-CO-07 | Small-cell suppression | Buckets with < 5 patients suppressed to protect privacy |
| HAD-CO-08 | Export cohort definition | Download JSON/CSV of the query, not patient data |

---

## 12. Data freshness, sync & device ingestion

| # | Title | Expected |
|---|---|---|
| HAD-DS-01 | Last-sync timestamp per device | Shown in device list; tooltip indicates latency |
| HAD-DS-02 | Manual refresh | Refresh button re-fetches without reload; disables during request |
| HAD-DS-03 | Background sync | New readings land within 60 s without navigation |
| HAD-DS-04 | Device disconnected | Banner in device list; no phantom "live" data |
| HAD-DS-05 | Duplicate readings | Same reading from two sources de-duplicated by timestamp+device |
| HAD-DS-06 | Out-of-order arrivals | Late-arriving readings inserted in correct chronological slot |
| HAD-DS-07 | Unit mismatch on ingest | Rejected or auto-converted per source spec; never silently stored wrong unit |
| HAD-DS-08 | Invalid reading | HR = 999 or negative → quarantined, not charted |

---

## 13. Exports, reports & sharing

| # | Title | Expected |
|---|---|---|
| HAD-EX-01 | Export chart as PNG | PNG includes title, date range, patient ID (or anonymized), watermark |
| HAD-EX-02 | Export data as CSV | CSV columns: timestamp, metric, value, unit, device, flag |
| HAD-EX-03 | Export PDF report | PDF has cover page, summary KPIs, charts, alerts, footer with timestamp + user |
| HAD-EX-04 | Large-range export | 1-year hourly data → async job; email link when ready; no UI freeze |
| HAD-EX-05 | Scheduled reports | Weekly PDF emailed to care team; can unsubscribe |
| HAD-EX-06 | Share link | Generates time-limited signed URL; no credentials needed to open |
| HAD-EX-07 | Revoke share | Revoked link returns 410 Gone |
| HAD-EX-08 | PHI redaction toggle | "De-identified export" strips name/DOB/MRN before download |
| HAD-EX-09 | Export audit | Every export logged: user, patient, scope, destination, ts |

---

## 14. Settings & preferences

| # | Title | Expected |
|---|---|---|
| HAD-SE-01 | Units metric/imperial | Changes propagate everywhere after save |
| HAD-SE-02 | Default date range | User preference honored on dashboard load |
| HAD-SE-03 | Alert channels | Toggle email / SMS / push; test-send works |
| HAD-SE-04 | Quiet hours | Alerts suppressed during quiet hours; critical can override (configurable) |
| HAD-SE-05 | Language | UI strings switch; dates/numbers localized |
| HAD-SE-06 | Accessibility | High-contrast mode, larger text scale persisted |
| HAD-SE-07 | Theme | Light/dark/auto; charts remain readable in both |

---

## 15. Empty, loading & error states

| # | Title | Expected |
|---|---|---|
| HAD-ST-01 | First-time user | Onboarding card with "connect a device" CTA |
| HAD-ST-02 | No data in range | Empty state per chart, not a zero line |
| HAD-ST-03 | API 500 | Friendly error with Retry; card-level, not page-level where possible |
| HAD-ST-04 | API 401 mid-session | Redirect to login; return to same URL after auth |
| HAD-ST-05 | Partial failure | One card fails, others load; failed card has Retry |
| HAD-ST-06 | Offline | Banner "You're offline"; cached last-known data labelled "stale" |
| HAD-ST-07 | Rate limited | 429 handled with backoff; user-friendly message |
| HAD-ST-08 | Long-running query | Progress indicator > 2 s; cancel button available |

---

## 16. Performance

| # | Title | Expected |
|---|---|---|
| HAD-PF-01 | Dashboard initial load | LCP < 2.5 s on broadband |
| HAD-PF-02 | Filter apply | Re-render < 1 s for 30-day ranges |
| HAD-PF-03 | Chart render | 10k points renders < 1.5 s (downsampled if needed) |
| HAD-PF-04 | Memory | 30-min session on dashboard stays under 400 MB browser memory |
| HAD-PF-05 | Concurrent dashboards | 3 tabs open simultaneously — no request storm, shared cache |
| HAD-PF-06 | WebSocket reconnect | Drop/reconnect < 5 s; missed events re-fetched |
| HAD-PF-07 | Bundle size | Main JS < 400 KB gzipped |

---

## 17. Accessibility (a11y)

| # | Title | Expected |
|---|---|---|
| HAD-A-01 | Keyboard nav | Tab traverses nav → filters → cards → charts in logical order |
| HAD-A-02 | ARIA on cards | Each card has accessible name, role, value announced |
| HAD-A-03 | Chart SR alternative | Chart has data table alternative (`aria-describedby` or toggle) |
| HAD-A-04 | Not color-only | Abnormal state indicated by icon + label, not just red |
| HAD-A-05 | Contrast | WCAG AA (≥ 4.5:1) for all text, including axis labels |
| HAD-A-06 | Focus ring | Visible focus indicator on all interactive elements |
| HAD-A-07 | Reduced motion | Chart animations disabled when OS prefers-reduced-motion |
| HAD-A-08 | Zoom to 200% | Layout still usable; no horizontal scroll on main content |

---

## 18. Responsive & cross-device

| # | Title | Expected |
|---|---|---|
| HAD-X-01 | Desktop ≥ 1440px | 3-column KPI grid; charts full-width per row |
| HAD-X-02 | Tablet | 2-column KPI grid; filters collapse to drawer |
| HAD-X-03 | Mobile ≤ 375px | Single column; charts horizontally scroll within card |
| HAD-X-04 | Touch targets | ≥ 44×44 px for filter chips, legend items |
| HAD-X-05 | Pinch zoom on charts | Works on mobile; doesn't break tooltips |
| HAD-X-06 | Landscape orientation | Charts reflow; no clipped labels |
| HAD-X-07 | Cross-browser | Chrome, Safari, Firefox, Edge parity; no console errors |

---

## 19. Security, privacy & compliance (HIPAA/GDPR)

| # | Title | Expected |
|---|---|---|
| HAD-SEC-01 | HTTPS everywhere | All requests over TLS; HSTS header present |
| HAD-SEC-02 | No PHI in URL | Patient name/DOB never in query string; use opaque IDs |
| HAD-SEC-03 | No PHI in logs | Front-end error logs scrub names/MRN/DOB before send |
| HAD-SEC-04 | Session cookie | `HttpOnly`, `Secure`, `SameSite=Lax/Strict` |
| HAD-SEC-05 | XSS resistance | Patient name `<script>` rendered as text; strict CSP |
| HAD-SEC-06 | CSRF | State-changing POSTs require CSRF token |
| HAD-SEC-07 | IDOR | `/patients/:id` — direct ID from another org returns 404 (not 403-leak) |
| HAD-SEC-08 | Export watermark | PDFs include "Confidential — <user email> — <ts>" footer |
| HAD-SEC-09 | Access audit | Every view of a patient record logged (who, when, what) |
| HAD-SEC-10 | Data residency | EU-tenant data stays in EU region; indicator visible in settings |
| HAD-SEC-11 | Right to erasure (GDPR) | Admin can trigger patient delete; data purged from UI cache as well |
| HAD-SEC-12 | Print/screenshot | No preventive UI (not enforceable), but watermark applies to print stylesheet |
| HAD-SEC-13 | Screen idle auto-lock | After N min idle, UI blurs / prompts re-auth |

---

## 20. Analytics & tracking (product telemetry)

| # | Title | Expected |
|---|---|---|
| HAD-AN-01 | Dashboard viewed | Event with `{role, filters, patient_id_hash}` — no raw PHI |
| HAD-AN-02 | KPI drill-through | Event `{metric, source: "kpi-card"}` |
| HAD-AN-03 | Alert acknowledged | Event `{alert_id, severity, latency_seconds}` |
| HAD-AN-04 | Export generated | Event `{type: pdf/csv/png, scope, row_count}` |
| HAD-AN-05 | Error surfaced to user | Event `{error_code, route}` — stack trace not sent |
| HAD-AN-06 | No duplicate events | Exactly one per user action (debounced) |

---

## 21. Edge cases & exploratory

| # | Title | Expected |
|---|---|---|
| HAD-EX-01 | DST transition | Day with 23h or 25h renders correctly; no duplicate or missing hour |
| HAD-EX-02 | Leap day | 2028-02-29 selectable; charts show correct day |
| HAD-EX-03 | Patient with 0 devices | Dashboard shows connect-device CTA, not broken cards |
| HAD-EX-04 | Patient with 10 devices | Device filter scrollable; no layout overflow |
| HAD-EX-05 | Pediatric patient | Clinical ranges swap to pediatric norms based on DOB |
| HAD-EX-06 | Pregnancy flag | Certain metrics hidden/adjusted per pregnancy reference ranges |
| HAD-EX-07 | Extreme values | Glucose 1000 mg/dL — flagged as "check device"; not charted as truth |
| HAD-EX-08 | Rapid filter flipping | Cancels in-flight requests; only last response rendered |
| HAD-EX-09 | Two tabs editing settings | Optimistic lock or last-write-wins with warning toast |
| HAD-EX-10 | Browser back after drill-down | Returns to dashboard with filters + scroll restored |
| HAD-EX-11 | Time change mid-session | App detects clock skew; re-syncs server time before re-query |
| HAD-EX-12 | Very new tenant | Cohort view with 0 patients shows empty state, not division-by-zero |

---

## 22. Content & copy

| # | Expected |
|---|---|
| HAD-CO-01 | Clinical disclaimers use approved legal copy ("not a substitute for medical advice") |
| HAD-CO-02 | Empty states are supportive, not clinical ("No readings yet — connect your device to get started") |
| HAD-CO-03 | Alert severity copy consistent: Info / Warning / Critical — no ad-hoc labels |
| HAD-CO-04 | Units always rendered (never a bare number) |
| HAD-CO-05 | Dates shown per user locale (e.g. `Apr 23, 2026` vs `23/04/2026`) |
| HAD-CO-06 | No hard-coded English on localized builds |
