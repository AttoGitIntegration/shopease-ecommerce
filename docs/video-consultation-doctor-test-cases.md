# ShopEase — Video Consultation (Doctor) Functional Test Scenarios

Scope: functional test scenarios for the **Doctor-facing** video consultation web UI — joining a scheduled consultation, running the live video session with a patient, capturing clinical notes/prescriptions, and closing the visit. These are end-user interaction tests from the doctor's perspective.

**Pages exercised:**
- Doctor Dashboard — `/doctor/dashboard`
- Consultation Queue — `/doctor/consultations`
- Upcoming / Scheduled Slots — `/doctor/schedule`
- Pre-join Lobby — `/doctor/consultations/:id/lobby`
- Live Consultation Room — `/doctor/consultations/:id/room`
- Post-consultation Summary — `/doctor/consultations/:id/summary`

**Consultation states:** `scheduled`, `waiting`, `in_progress`, `completed`, `cancelled`, `no_show`, `expired`.

---

## 1. Entry points & consultation visibility

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-D-V-01 | Today's consultations visible on dashboard | Logged in as doctor; 3 consultations scheduled today | Open `/doctor/dashboard` | Today's consultations list shows patient name, time slot, status, and "Join" action for imminent visits |
| VC-D-V-02 | Upcoming consultation listed in queue | Scheduled consultation at 14:00 | Open `/doctor/consultations` | Row for the consultation with countdown timer, patient avatar/name, reason-for-visit preview |
| VC-D-V-03 | Join button enabled within join window | Consultation starts in 10 min (inside 15-min pre-join window) | Open consultation row | "Join" button enabled; tooltip "Pre-join lobby opens 15 minutes before scheduled start" |
| VC-D-V-04 | Join button disabled outside join window | Consultation starts in 2 hours | Open consultation row | "Join" button disabled; label "Opens at 13:45" |
| VC-D-V-05 | Past completed consultation shows summary link | status=completed | Open consultations list with "Past" filter | Row shows "View summary" — no Join control |
| VC-D-V-06 | Cancelled consultation shows cancellation reason | status=cancelled by patient | Open row | Row shows "Cancelled by patient" with timestamp; no Join |
| VC-D-V-07 | No-show consultation flagged after grace period | Patient never joined; 15 min past start | Open row | Status auto-transitions to `no_show`; "Mark no-show" CTA already applied; notes field available |
| VC-D-V-08 | Non-owning doctor cannot see another doctor's consultation | Logged in as Dr. B; consultation belongs to Dr. A | Navigate to `/doctor/consultations/:id/room` directly | 403 or "Consultation not found"; redirected to own queue |
| VC-D-V-09 | Consultation list filter — by date | Queue open | Select date range filter | Only consultations in range are shown; count badge updates |
| VC-D-V-10 | Consultation list filter — by status | Queue open | Apply "Waiting" filter | Only `waiting` consultations shown; empty-state handled |

---

## 2. Pre-join lobby (device & network check)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-D-L-01 | Lobby opens from Join CTA | Consultation within join window | Click "Join" | Navigates to `/doctor/consultations/:id/lobby`; camera/mic preview starts; patient status badge shows "Waiting"/"Not yet joined" |
| VC-D-L-02 | Camera permission prompt — first visit | Browser has not granted camera | Open lobby | Native browser prompt appears; preview area shows "Allow camera to continue" placeholder |
| VC-D-L-03 | Camera permission denied | User clicks "Block" on prompt | Observe lobby | Inline error "Camera access blocked — update browser permissions to continue"; link to help article |
| VC-D-L-04 | Mic permission denied | User blocks mic only | Observe lobby | Inline error for mic; camera preview still works; "Enter Room" disabled until mic granted |
| VC-D-L-05 | Camera selection dropdown | Multiple webcams connected | Change camera in dropdown | Preview switches to selected device; selection persisted for next session |
| VC-D-L-06 | Microphone selection dropdown | Multiple mics | Change mic; speak | Input level meter moves on selected mic only |
| VC-D-L-07 | Speaker selection & test tone | Multiple audio outputs | Click "Test speaker" | Short tone plays on selected output device |
| VC-D-L-08 | Mute mic from lobby | Mic active | Toggle mic off | Mic button shows muted state; level meter flat; state carried into room |
| VC-D-L-09 | Camera off from lobby | Camera active | Toggle camera off | Preview replaced by doctor's avatar/initials; state carried into room |
| VC-D-L-10 | Network quality indicator | Network ok | Observe indicator | Shows "Good" (green); tooltip with bitrate / RTT |
| VC-D-L-11 | Poor network warning | Throttle network to 2G | Observe | Indicator turns red/amber; banner "Connection is unstable — video may degrade" |
| VC-D-L-12 | Blocked WebRTC ports | Corporate firewall blocks UDP | Open lobby | Warning "Your network may block video calls. Contact IT or switch networks" with retry |
| VC-D-L-13 | Patient information panel | Lobby open | Inspect side panel | Shows patient name, age, sex, reason-for-visit, allergies, last-visit summary, attached documents |
| VC-D-L-14 | Review attached documents before join | Patient uploaded PDF report | Click attachment | Opens in modal/new tab; no auto-download; PDF viewer renders scan/report |
| VC-D-L-15 | Enter Room CTA enabled when ready | Camera + mic granted; within window | Click "Enter Consultation" | Navigates to live room; session initialized |

---

## 3. Live consultation room — video, audio & layout

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-D-R-01 | Doctor and patient tiles render | Both joined | Observe room | Two video tiles; patient tile prominent; self-view tile smaller/PiP; names overlaid |
| VC-D-R-02 | Self-view mirror effect | Doctor video on | Observe self-tile | Self-view is mirrored; remote doctor sees un-mirrored view |
| VC-D-R-03 | Patient joins after doctor | Doctor already in room; patient joins | Patient clicks Join | Patient tile transitions from "Waiting for patient…" placeholder to live video within ~3s; join sound plays |
| VC-D-R-04 | Doctor mutes self | In room | Click mic toggle | Mic button shows muted; patient's UI shows doctor muted indicator; incoming audio unaffected |
| VC-D-R-05 | Doctor disables camera | In room | Click camera toggle | Self-tile shows avatar; patient sees camera-off placeholder with doctor name |
| VC-D-R-06 | Switch camera device mid-call | Extra webcam connected | Device switcher → pick camera | Stream switches without drop; short freeze < 1s acceptable |
| VC-D-R-07 | Speaker volume control | Patient speaks | Adjust volume slider / OS volume | Incoming audio volume changes; no mic echo |
| VC-D-R-08 | Full-screen toggle | In room | Click fullscreen icon | Video expands to full-screen; ESC exits |
| VC-D-R-09 | Minimize to PiP / floating window | In room | Click minimize | Call becomes floating PiP; doctor can navigate other app pages while call continues |
| VC-D-R-10 | Return to full room from PiP | PiP active | Click PiP to expand | Returns to full consultation layout; session uninterrupted |
| VC-D-R-11 | Layout swap — make self-view primary | In room | Click swap on tiles | Tiles swap; choice not persisted across sessions |
| VC-D-R-12 | Network-aware quality downgrade | Start HD; throttle bandwidth | Observe remote | Resolution drops (e.g., 720p → 360p); banner "Video quality lowered due to network" |
| VC-D-R-13 | Audio-only fallback | Bandwidth collapses | Observe | Video pauses with placeholder; audio remains; "Video paused — audio only" indicator |
| VC-D-R-14 | Reconnect on transient network drop | Kill network 10s then restore | Observe | Banner "Reconnecting…" with spinner; session resumes automatically once restored; timer continues accurately |
| VC-D-R-15 | Session timer visibility | In room | Observe header | Elapsed time HH:MM:SS updates every second; scheduled duration shown alongside |
| VC-D-R-16 | Scheduled-duration overrun warning | Slot = 15 min; elapsed = 14 min | Observe | Amber banner at 14 min "Approaching end of slot"; red at overrun with "Extend / End" options |

---

## 4. In-call tools — chat, screen share, file share

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-D-T-01 | Open in-call chat | In room | Click chat icon | Side panel opens with message history empty; focus in input |
| VC-D-T-02 | Send text message | Chat open | Type "Please show me the rash" → Enter | Message appears in both doctor and patient transcripts with timestamp |
| VC-D-T-03 | Patient-sent message notification | Chat panel closed; patient sends message | Observe | Chat icon badge shows unread count; toast with message preview (dismissible) |
| VC-D-T-04 | Chat persists in transcript | Exchange 3 messages → end call → open summary | View summary | Chat transcript attached to consultation record |
| VC-D-T-05 | Emoji / unicode message | Chat open | Send "👍 ありがとう" | Renders correctly on both sides |
| VC-D-T-06 | HTML / script in message | Chat open | Send `<script>alert(1)</script>` | Rendered as escaped plain text; no script execution |
| VC-D-T-07 | Very long message | Chat open | Paste 5000-char text | Capped at documented max (e.g., 2000); counter warns at limit |
| VC-D-T-08 | Start screen share | In room | Click "Share screen" | Browser picker shows; select tab/window/screen; patient sees shared content; doctor video moves to PiP |
| VC-D-T-09 | Stop screen share | Sharing active | Click "Stop sharing" (in-app or browser bar) | Share ends; doctor video restored; patient UI returns to normal layout |
| VC-D-T-10 | Screen share — sensitive window warning | Doctor picks a window with another patient's chart | Start share | Pre-share warning "You are sharing a window that may contain PHI — confirm before continuing" |
| VC-D-T-11 | Doctor uploads a file to patient | In room | Attach PDF (e.g., diet plan) | File appears in chat; patient can preview/download; upload progress shown; max size enforced |
| VC-D-T-12 | Invalid file type rejected | In room | Attach `.exe` | Inline error "File type not allowed"; no upload initiated |
| VC-D-T-13 | Patient attaches file mid-call | In room | Patient uploads image | Thumbnail in chat; doctor can click to preview full size; not auto-downloaded |

---

## 5. Clinical notes, prescription & diagnosis (during call)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-D-N-01 | Notes panel visible alongside video | In room | Open "Notes" side panel | Structured sections: Chief complaint, History, Observations, Diagnosis, Plan |
| VC-D-N-02 | Auto-save draft notes | Notes panel open | Type "patient reports fever since 2 days" → wait 5s | "Draft saved HH:MM" indicator; no data loss on reload |
| VC-D-N-03 | Notes draft recovery after refresh | Typed notes; hard refresh | Return to room | Draft notes restored from server; cursor position resets to end |
| VC-D-N-04 | Diagnosis ICD-10 search | Diagnosis field focused | Type "hypert" | Autocomplete suggests "I10 — Essential (primary) hypertension" and related codes |
| VC-D-N-05 | Prescription — add medication | Notes panel | Click "Add medication" → select "Amoxicillin 500mg" → dosage "1-0-1, 5 days" | Row added to prescription table; running count shown |
| VC-D-N-06 | Drug interaction warning | Patient already on warfarin | Add "Aspirin 75mg" | Red warning banner "Potential interaction: aspirin × warfarin — bleeding risk"; can acknowledge and proceed |
| VC-D-N-07 | Allergy warning | Patient allergic to penicillin | Add "Amoxicillin" | Red banner "Patient allergy: Penicillin — contraindicated"; requires explicit "Override & continue" confirmation |
| VC-D-N-08 | Remove prescription line | Prescription has 3 lines | Click delete on line 2 | Line removed; undo toast available for 5s |
| VC-D-N-09 | Prescription quantity & refills | Adding medication | Set quantity 30, refills 2 | Fields accept numbers only; negatives rejected; decimals per design |
| VC-D-N-10 | Request lab tests | Notes panel | Click "Order tests" → add "CBC", "FBS" | Tests listed under "Lab orders"; appears on patient summary post-call |
| VC-D-N-11 | Follow-up scheduling | Notes panel | Click "Schedule follow-up" → pick date | Slot reserved; shown in doctor's calendar; patient notified post-call |
| VC-D-N-12 | Reference prior consultation | Patient has past visit | Click "History" tab in sidebar | Prior notes, prescriptions, test results scrollable without leaving room |

---

## 6. Ending the consultation

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-D-E-01 | End consultation CTA | In room | Click "End consultation" | Confirmation modal "End this consultation?" with checklist: Notes saved, Prescription signed, Follow-up set |
| VC-D-E-02 | Confirm end — happy path | Modal open; all items complete | Click "End now" | Call drops; both sides routed to their summary screens; status → `completed`; `endedAt` recorded |
| VC-D-E-03 | End with unsigned prescription | Prescription has lines but not signed | Click "End now" | Warning "Prescription not signed — patient will not receive it. Continue?" with Sign / End anyway / Cancel |
| VC-D-E-04 | Sign prescription | In confirm modal | Click "Sign prescription" | Doctor digital signature applied (per config); prescription state → `signed`; visible in summary and patient portal |
| VC-D-E-05 | Patient ends first | In room; patient clicks leave | Observe | Banner "Patient has left the call"; doctor can finalize notes; timer pauses; "End consultation" still available |
| VC-D-E-06 | Doctor accidental close tab | In room | Close browser tab | Re-opening queue shows consultation still `in_progress`; "Rejoin" CTA available until grace period or explicit end |
| VC-D-E-07 | Idle timeout | No audio/video/interaction for 10 min | Observe | Warning modal "Still there?" with 60s countdown → auto-ends call if no response |
| VC-D-E-08 | Forced end by admin | Admin ends session from back office | Observe | Doctor sees banner "Session ended by administrator"; routed to summary with reason displayed |

---

## 7. Post-consultation summary

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-D-S-01 | Summary page loads | Just ended call | Observe `/doctor/consultations/:id/summary` | Shows duration, patient info, notes, diagnosis, prescription, lab orders, follow-up, chat transcript |
| VC-D-S-02 | Edit notes within grace window | Within 24h of end | Click "Edit notes" | Editor opens; changes saved and versioned; "edited HH:MM" marker visible to admin |
| VC-D-S-03 | Edit blocked after grace window | > 24h since end | Click "Edit notes" | Field read-only; tooltip "Editing window closed — create addendum instead" |
| VC-D-S-04 | Create addendum | Past editing window | Click "Add addendum" → enter text → sign | Addendum appended with timestamp + signature; original notes unchanged |
| VC-D-S-05 | Download consultation PDF | Summary open | Click "Download PDF" | Generates PDF with clinic letterhead, doctor signature, all sections; patient PHI redaction per policy |
| VC-D-S-06 | Share summary with patient | Summary open | Click "Send to patient" | Patient notified via in-app + email/SMS per preference; audit log entry created |
| VC-D-S-07 | Rating / feedback (optional) | Summary open | Rate call quality | Submitted to QoS analytics; not blocking |

---

## 8. Disallowed states & guardrails

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-D-G-01 | Join a cancelled consultation via direct URL | status=cancelled | Open `/doctor/consultations/:id/room` | Redirects to queue; banner "This consultation was cancelled on <date>" |
| VC-D-G-02 | Join completed consultation | status=completed | Visit room URL | Redirects to summary page |
| VC-D-G-03 | Join expired consultation | status=expired (scheduled time > 1h past with no-show) | Visit room URL | Banner "This slot has expired. Please reschedule."; no join |
| VC-D-G-04 | Join before pre-join window | 2h before scheduled start | Visit room URL | Banner "Room opens at <time>"; join disabled |
| VC-D-G-05 | Unknown consultation id | No such id | Visit URL | 404 with link back to queue |
| VC-D-G-06 | Join when another device already connected | Same doctor already in room from Device A | Connect from Device B | Prompt "Already connected on another device — continue here and disconnect other?" |
| VC-D-G-07 | Sign prescription without any medication | Empty Rx | Click "Sign prescription" | Error "Add at least one medication before signing" |
| VC-D-G-08 | End call during active screen share | Sharing | Click "End consultation" | Confirmation also warns "You are currently sharing your screen" |

---

## 9. Error handling & recovery

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-D-ERR-01 | Token/session expired before join | Token expires | Click "Join" | Redirect to login; after re-auth, lands on lobby (not room) |
| VC-D-ERR-02 | Signaling server down | WS endpoint unreachable | Enter room | Banner "Can't connect to service — retrying…" with retry count; timeout after N attempts with manual retry |
| VC-D-ERR-03 | TURN server failure in strict NAT | UDP blocked and TURN down | Enter room | Clear error "Media server unreachable"; suggestion to switch network |
| VC-D-ERR-04 | Notes save failure (5xx) | API returns 500 on save | Type notes | Inline warning "Couldn't save draft — retrying"; local buffer kept; backoff retry; no silent data loss |
| VC-D-ERR-05 | Prescription submit failure | API 500 on sign | Click Sign | Error toast; Sign re-enabled; no duplicate prescription on retry |
| VC-D-ERR-06 | Patient kicked by network loss | Patient device loses connection | Observe | Doctor sees "Patient disconnected — waiting to reconnect (1:23)"; auto-resumes if patient returns |
| VC-D-ERR-07 | Double-click Join | In queue | Rapidly click Join twice | Only one session opened; second click no-op |
| VC-D-ERR-08 | Browser permissions revoked mid-call | Revoke camera in browser settings | Observe | Self-video freezes/off; banner "Camera access was revoked"; re-grant restores stream |

---

## 10. Visual feedback, notifications & messaging

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-D-M-01 | Desktop notification on patient join | Browser notifications allowed; tab not focused | Patient joins | OS notification "Patient <name> has joined"; click focuses tab |
| VC-D-M-02 | In-app toast on patient arrival | Tab focused; doctor on other page | Patient joins | Toast with "Join room" CTA; auto-dismiss after 10s |
| VC-D-M-03 | Recording indicator | Recording policy ON | Enter room | Red "REC" badge visible to both parties; consent language shown in lobby |
| VC-D-M-04 | Mic speaking indicator | In room | Speak | Patient tile border pulses when patient speaks; same for self |
| VC-D-M-05 | Connection-quality tooltip details | In room | Hover quality indicator | Shows uplink/downlink kbps, packet loss %, round-trip ms |
| VC-D-M-06 | Time badges in user's timezone | Doctor in IST; consultation at 14:00 UTC | Observe list | Times shown in IST with timezone abbreviation; tooltip shows UTC |

---

## 11. Accessibility (a11y)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-D-A-01 | Keyboard-only flow | Keyboard only | Tab through lobby → enter room → toggle mic/cam → open chat → end call | Full flow completes; visible focus rings; no keyboard traps |
| VC-D-A-02 | Screen-reader labels on controls | SR active | Focus mic button | Announces "Microphone, on, button"; toggled state read after press |
| VC-D-A-03 | Live region announcements | SR active | Patient joins | Announced via `aria-live="polite"` ("Patient has joined the consultation") |
| VC-D-A-04 | Captions / transcript toggle | In room | Enable "Live captions" | Real-time captions overlay on video; scrollable transcript in side panel |
| VC-D-A-05 | High-contrast mode | OS high-contrast on | Enter room | All icons and status text remain distinguishable; no reliance on color alone |
| VC-D-A-06 | Reduced motion | OS reduced-motion on | Toggles, modals | No sliding/scale animations; cross-fade or instant |
| VC-D-A-07 | Focus return after modal close | End-confirmation modal open → Esc | — | Focus returns to "End consultation" button |

---

## 12. Responsive & cross-device

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-D-X-01 | Mobile web viewport | iPhone SE-sized viewport | Full flow | Video stacks vertically; controls reachable with thumb; side panels become bottom sheets |
| VC-D-X-02 | Tablet viewport | iPad | Full flow | Two-column layout: video + notes side by side; orientation change handled |
| VC-D-X-03 | Ultra-wide desktop (≥ 1920px) | — | Room | Video tile max-width enforced; notes/chat pinned; no awkward stretching |
| VC-D-X-04 | Cross-browser parity | Chrome, Safari, Firefox, Edge | Full flow | Media capture, screen share, and chat work; any browser-specific limitations surfaced (e.g. Safari screen-share on macOS only) |
| VC-D-X-05 | External monitor / multi-display | Doctor drags window to secondary monitor | In room | Video continues rendering; no device re-selection required |
| VC-D-X-06 | Headset plugged/unplugged mid-call | Bluetooth headset | Unplug mid-call | Audio routes to next available device per OS; banner "Audio device changed" |

---

## 13. Concurrency & session edge cases

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-D-C-01 | Two overlapping consultations | Slots 14:00 and 14:10 both open | Try to join second while first is active | Warning "You are already in a consultation"; blocks second entry until first ended |
| VC-D-C-02 | Admin cancels mid-call | Admin cancels consultation during live session | Observe | Banner "This consultation was cancelled by admin"; room gracefully ends; summary records cancellation |
| VC-D-C-03 | Patient reschedules mid-call | Patient clicks "Reschedule" on their side | Observe | Request surfaces to doctor as modal with Accept / Decline |
| VC-D-C-04 | Doctor logs out elsewhere | Logout in another tab while in call | Observe | Active call preserved in current tab; 401 returned on next save → forces logout and call ends with draft saved |
| VC-D-C-05 | Clock skew on client | System clock set wrong | Join flow | Server-authoritative time used for window checks; tolerated ±5 min drift; banner if drift is > 5 min |

---

## 14. Privacy, compliance & security

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-D-P-01 | Consent language in lobby | Lobby open | Observe | Notice "By joining, you agree to recording per clinic policy" with link to policy |
| VC-D-P-02 | Recording only when consented | Policy requires explicit patient consent; patient declined | Enter room | No recording started; REC badge absent; notes explicitly capture "Recording declined" |
| VC-D-P-03 | Transcript/recording not downloadable by unauthorized roles | Front-desk account opens summary | — | Download buttons hidden or disabled; audit log records access attempts |
| VC-D-P-04 | PHI masked in URLs & analytics | Navigate through flow | Inspect URLs + analytics payloads | No patient names/IDs in URL query or third-party analytics beyond anonymized IDs |
| VC-D-P-05 | Session resilience to inspect tools | DevTools open | Observe | Media streams not logged to console; auth tokens not printed |
| VC-D-P-06 | Logout clears camera/mic | In lobby | Logout | Media tracks stopped; camera LED turns off; re-login prompts for permission anew if revoked |
| VC-D-P-07 | Audit log entries | Various actions | Review admin audit log | Entries for join, end, notes edit, prescription sign, PDF download, addendum, share-with-patient |

---

## 15. Analytics & side-effects (if instrumented)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| VC-D-AN-01 | Lobby entered event | — | Enter lobby | Event `consultation_lobby_opened` with `consultationId` |
| VC-D-AN-02 | Join event | — | Enter room | Event `consultation_joined` with role=doctor, timestamps |
| VC-D-AN-03 | End event | — | End call | Event `consultation_ended` with duration, reason, who-ended |
| VC-D-AN-04 | Prescription signed event | — | Sign Rx | Event `prescription_signed` with drug count (no drug names in analytics) |
| VC-D-AN-05 | QoS sampling | In room | Per minute | `call_quality_sample` with bitrate, packet loss, RTT |
| VC-D-AN-06 | No duplicate join events | Rapid join clicks | — | Only one `consultation_joined` recorded |

---

## 16. Content & copy

| # | Title | Expected |
|---|---|
| VC-D-CO-01 | Lobby title | "Get ready for your consultation" |
| VC-D-CO-02 | Join CTA in queue | "Join" (enabled) / "Opens at HH:MM" (disabled) |
| VC-D-CO-03 | Enter room CTA | "Enter Consultation" |
| VC-D-CO-04 | End modal title | "End this consultation?" |
| VC-D-CO-05 | End confirm button | "End now" — destructive styling |
| VC-D-CO-06 | Cancel end button | "Keep consulting" — neutral styling |
| VC-D-CO-07 | Patient-joined toast | "<Patient name> has joined" |
| VC-D-CO-08 | Reconnecting banner | "Reconnecting… your session will resume automatically" |
| VC-D-CO-09 | Allergy override confirm | "This medication conflicts with a known allergy. Type OVERRIDE to continue." |
| VC-D-CO-10 | Localization | All strings render in supported locales (EN / HI / regional per clinic); dates, times, currency symbols localized |

---

## Traceability (suggested)

| UI behavior | Backend surface |
|---|---|
| Join window enforcement | Consultation controller — `joinLobby`, `enterRoom` guards |
| State transitions (`scheduled` → `in_progress` → `completed`) | Consultation lifecycle service |
| Notes autosave | Notes controller — draft PATCH endpoint |
| Prescription sign | Prescription controller — `signPrescription` with audit |
| Drug-interaction / allergy checks | Safety-check service |
| No-show auto flag | Scheduled job / cron after grace period |
| Recording consent & storage | Media recording service + consent audit |
