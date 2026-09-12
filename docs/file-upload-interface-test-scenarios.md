# File Upload Interface — Functional Test Scenarios

Scope: end-user test scenarios for a generic **file upload interface** embedded in a web application (e.g. a document/attachment uploader used inside a form, a profile picture uploader, a bulk-import uploader, or a chat attachment tray). Covers the upload widget itself — selection, validation, progress, preview, replace/remove, error handling, accessibility, and security — independent of any specific downstream workflow.

**UI surfaces / flows exercised:**
- Idle / empty state ("Drop files here or browse")
- File picker dialog (click-to-browse)
- Drag-and-drop zone (single and multi-file)
- Paste-to-upload (clipboard image / file)
- Mobile camera / gallery capture
- Inline client-side validation (type, size, dimensions, count)
- Per-file progress bars and overall progress summary
- Preview (image thumbnail, PDF first-page, icon for other types)
- File list / queue management (reorder, remove, replace, retry)
- Completed / failed / canceled states
- Error banners and retry controls
- Submit / save with attached files
- Post-upload server validation failures

**Key UI components:**
- Drop zone container with visual hover/active states
- "Browse" / "Choose file" button (keyboard + screen-reader accessible)
- Hidden `<input type="file">` with `accept`, `multiple`, `capture` attributes
- Progress bar (determinate) with % and byte counter
- Cancel (✕) / Retry (⟳) / Remove (🗑) icons per file
- Thumbnail / preview tile with filename, size, type badge
- Inline error message area (per file + global)
- Toast / snackbar for transient feedback
- File count and total-size indicator (e.g. "3 of 10 files, 8.2 MB / 25 MB")

---

## 1. Rendering & idle state

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-UI-01 | Drop zone renders on first load | Upload field visible on page | — | Drop zone visible with prompt text, icon, and "Browse" button |
| FU-UI-02 | Allowed types & size shown in helper text | Config: JPG/PNG/PDF, 10 MB | — | Helper text reads "JPG, PNG, PDF — up to 10 MB each" |
| FU-UI-03 | File count limit displayed | Config: max 5 files | — | "0 of 5 files" indicator present |
| FU-UI-04 | Disabled state | Field disabled (e.g. form read-only) | Hover drop zone / click Browse | No interaction; cursor: not-allowed; tooltip explains why |
| FU-UI-05 | Required marker | Upload is required | — | Asterisk or "Required" badge on label |
| FU-UI-06 | Dark-mode rendering | Theme = dark | — | Drop zone, text, icons legible; no white flash on hover |
| FU-UI-07 | RTL layout | Locale = Arabic/Hebrew | — | Icons, progress bars, remove buttons mirrored correctly |
| FU-UI-08 | Long helper text truncation | Very long allowed-types list | — | Truncates with "…" and tooltip / "show more" reveal |

---

## 2. File selection — click to browse

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-SEL-01 | Open file picker via Browse button | Drop zone visible | Click "Browse" | Native OS file picker opens |
| FU-SEL-02 | Open file picker via drop zone click | Drop zone visible | Click anywhere in drop zone | File picker opens |
| FU-SEL-03 | Picker filters by `accept` | `accept="image/*"` | Open picker on macOS/Windows | Non-image files grayed out (best-effort; still re-validated on select) |
| FU-SEL-04 | Single-file mode | `multiple=false` | Try to select two files | Picker enforces single-select |
| FU-SEL-05 | Multi-file mode | `multiple=true` | Select 3 files (Cmd/Ctrl-click) | All 3 queued |
| FU-SEL-06 | Cancel picker | Picker open | Press Esc / Cancel | Drop zone returns to idle; no file added |
| FU-SEL-07 | Re-select same file after remove | File removed from queue | Pick the same file again | Accepted (input value reset; `onChange` fires) |
| FU-SEL-08 | Keyboard selection | Tab focus on Browse button | Press Enter / Space | Picker opens |

---

## 3. Drag and drop

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-DND-01 | Dragover highlight | Drag file over drop zone | — | Drop zone shows active state (border, tint, icon change) |
| FU-DND-02 | Drop one file | Dragging valid file | Release over drop zone | File queued; active state clears |
| FU-DND-03 | Drop multiple files | Multi enabled | Drag & drop 4 files at once | All 4 queued in order |
| FU-DND-04 | Drop outside zone | Dragging file | Release outside drop zone | No file added; page does not navigate to file (default prevented) |
| FU-DND-05 | Drop a folder | Drag a folder | Release | Either folder expanded recursively OR rejected with "Folders not supported" — consistent with spec |
| FU-DND-06 | Drop mixed valid + invalid | 2 JPG + 1 EXE | Drop together | Valid files queued; invalid ones show per-file error |
| FU-DND-07 | Drop while upload in progress | Upload of earlier batch running | Drop new file | Added to queue; begins uploading per concurrency policy |
| FU-DND-08 | Drop when limit already reached | Max 5 already queued | Drop 2 more | Rejected: "Maximum 5 files" |
| FU-DND-09 | Drag-leave clears highlight | Dragover then leave | — | Active state removed, no leftover styling |
| FU-DND-10 | Drop non-file (text / URL) | Drag a text selection from another tab | Release | Ignored or gracefully rejected; drop zone does not crash |

---

## 4. Paste & camera capture

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-PST-01 | Paste image from clipboard | Copied screenshot | Focus drop zone → Cmd/Ctrl-V | Image added as `image.png` with timestamp name |
| FU-PST-02 | Paste text | Copied plain text | Paste | Ignored; no empty file created |
| FU-PST-03 | Mobile — take photo | Mobile browser, `capture="environment"` | Tap Browse | OS offers Camera / Gallery; photo taken uploads correctly |
| FU-PST-04 | Mobile — pick from gallery | Mobile | Tap Browse → Gallery | File picks and queues with correct MIME |
| FU-PST-05 | Camera permission denied | User declines camera permission | Tap camera option | Falls back to gallery; clear message shown |

---

## 5. File type / format validation

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-TYP-01 | Allowed extension accepted | Config: PDF | Upload `report.pdf` | Accepted |
| FU-TYP-02 | Disallowed extension rejected | Config: PDF only | Upload `report.docx` | Rejected inline: "Only PDF allowed" |
| FU-TYP-03 | Uppercase extension | `REPORT.PDF` | Upload | Accepted (case-insensitive) |
| FU-TYP-04 | Double extension | `invoice.pdf.exe` | Upload | Rejected — evaluated by true MIME, not last token alone |
| FU-TYP-05 | No extension | File with no `.` | Upload | Rejected, or accepted only if MIME sniff matches allowlist |
| FU-TYP-06 | MIME mismatch vs extension | `.png` file containing PDF bytes | Upload | Rejected on server; clear message |
| FU-TYP-07 | Unicode filename | `отчёт.pdf`, `レポート.pdf`, `report📄.pdf` | Upload | Accepted; name rendered correctly in list |
| FU-TYP-08 | Very long filename | 255-char name | Upload | Accepted; truncated in UI with tooltip of full name |
| FU-TYP-09 | Filename with path traversal | `../../etc/passwd` | Upload | Sanitized; stored as basename only |
| FU-TYP-10 | Filename with HTML | `<img src=x onerror=alert(1)>.png` | Upload | Rendered as literal text, not executed (no XSS) |
| FU-TYP-11 | Reserved Windows name | `CON.pdf`, `NUL.pdf` | Upload | Either accepted with safe rename, or rejected with message |
| FU-TYP-12 | Spaces / special chars | `my file (v2) #final.pdf` | Upload | Accepted; name preserved |

---

## 6. Size validation

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-SZ-01 | Under per-file limit | Limit 10 MB, file 1 MB | Upload | Accepted |
| FU-SZ-02 | Exactly at per-file limit | File = 10 MB | Upload | Accepted (boundary inclusive per spec) |
| FU-SZ-03 | Just over per-file limit | File = 10 MB + 1 byte | Upload | Rejected: "Max 10 MB per file" |
| FU-SZ-04 | Zero-byte file | 0 B file | Upload | Rejected: "File is empty" |
| FU-SZ-05 | Total batch exceeds combined cap | Cap 25 MB; 3 × 10 MB | Upload all | Third file rejected: "Total upload exceeds 25 MB" |
| FU-SZ-06 | Very large file (GB) | 5 GB file when max is 10 MB | Upload | Rejected instantly client-side; no upload started |
| FU-SZ-07 | Size shown in human units | 1.5 MB file | Queue | "1.5 MB" not "1572864 B" |
| FU-SZ-08 | Server-side size re-check | Client bypassed | Upload oversize via API | Server rejects with 413 and friendly UI message |

---

## 7. Image-specific validation

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-IMG-01 | Min dimensions | Config 200×200 | Upload 200×200 | Accepted |
| FU-IMG-02 | Below min dimensions | 100×100 | Upload | Rejected: "Minimum 200×200" |
| FU-IMG-03 | Max dimensions / downscale | 8000×8000 | Upload | Either downscaled with notice, or rejected per spec |
| FU-IMG-04 | Aspect ratio enforced | Spec: 1:1 portrait | Upload 4:3 | Crop UI presented, or rejected |
| FU-IMG-05 | EXIF rotation | iPhone photo with orientation=6 | Upload | Preview shown upright; stored normalized |
| FU-IMG-06 | Animated GIF vs static | Config: static only | Upload animated GIF | Rejected or first-frame extracted |
| FU-IMG-07 | Transparent PNG preview | PNG with alpha | Upload | Preview uses checkerboard or matches UI background |
| FU-IMG-08 | SVG upload | SVG with inline script | Upload | Rejected, or sanitized (scripts stripped) — never served inline |
| FU-IMG-09 | HEIC from iPhone | HEIC file | Upload | Either accepted & transcoded to JPG, or rejected with guidance |
| FU-IMG-10 | Corrupt image | Truncated JPEG | Upload | Rejected: "Unable to read image" — no broken preview |

---

## 8. Upload progress & status

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-PRG-01 | Progress bar advances | Upload in flight | — | Bar moves monotonically 0→100% with byte counter |
| FU-PRG-02 | ETA / speed shown (if spec'd) | Large file upload | — | Speed and ETA update at least every second |
| FU-PRG-03 | Queue indicator | 5 files queued, 2 concurrent | — | Shows "Uploading 2 of 5" |
| FU-PRG-04 | Success state | Upload finishes | — | Tile shows ✓, filename, size, timestamp |
| FU-PRG-05 | Failure state | Server 500 | — | Tile shows ✕ with "Upload failed" and Retry action |
| FU-PRG-06 | Cancel in-flight | Upload at 40% | Click ✕ | Request aborted; partial bytes cleaned up on server |
| FU-PRG-07 | Retry after failure | Failed item visible | Click Retry | New upload attempt; progress resets |
| FU-PRG-08 | Navigate away warning | Upload in progress | Try to close tab / navigate | beforeunload prompt: "Uploads in progress — leave anyway?" |
| FU-PRG-09 | Background tab throttling | Browser throttles background tab | — | Upload completes correctly even if progress updates batch |

---

## 9. Preview, replace, remove

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-PV-01 | Image thumbnail | JPG uploaded | — | Thumbnail rendered from local blob before server finishes |
| FU-PV-02 | PDF first-page preview | PDF uploaded | — | First page thumbnail shown (or generic PDF icon per spec) |
| FU-PV-03 | Non-previewable type | ZIP uploaded | — | Generic file icon + extension badge |
| FU-PV-04 | Open full preview | Click thumbnail | — | Opens modal/lightbox with full-size view and filename |
| FU-PV-05 | Remove file | File in list | Click 🗑 | Confirmation (if non-trivial) → file removed; server artifact deleted |
| FU-PV-06 | Replace file | Existing file tile | Click "Replace" → pick new | Old file removed; new uploads in same slot |
| FU-PV-07 | Reorder (if supported) | Multi-file list | Drag tile to new position | Order persists on submit |
| FU-PV-08 | Duplicate filename | Upload `a.pdf` twice | — | Either both kept (auto-rename `a (1).pdf`) or deduped — consistent with spec |

---

## 10. Error handling

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-ERR-01 | Network offline at start | Device offline | Try to upload | Immediate "You're offline" banner; files stay queued |
| FU-ERR-02 | Network drop mid-upload | Kill network at 50% | — | Automatic retry (with backoff) or manual Retry; no duplicate on resume |
| FU-ERR-03 | Server 413 Payload Too Large | Oversize bypassing client check | Upload | Graceful "File too large" (not raw 413) |
| FU-ERR-04 | Server 415 Unsupported Media | Disallowed MIME | Upload | Graceful "File type not supported" |
| FU-ERR-05 | Server 401 / 403 | Session expired | Upload | Redirect to login; queue preserved on return (if feasible) |
| FU-ERR-06 | Server 5xx | Backend outage | Upload | Retry with exponential backoff; after N attempts, surface error |
| FU-ERR-07 | CORS misconfiguration | Cross-origin endpoint without headers | Upload | Clear developer-facing console error; user sees generic failure |
| FU-ERR-08 | Virus scan rejects | AV flags file post-upload | Upload a test-EICAR file | "File failed security scan" — item marked failed, not silently accepted |
| FU-ERR-09 | Storage quota exceeded | User at quota | Upload | "Storage full — remove files to continue" with link to manage storage |
| FU-ERR-10 | Rate limit | Too many uploads too fast | Rapid-fire uploads | 429 surfaced as "Too many requests — try again in Xs" |

---

## 11. Multi-file & concurrency

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-MUL-01 | Parallel upload cap | Cap = 3 concurrent | Queue 10 files | Only 3 upload at a time; others queue |
| FU-MUL-02 | Queue preserves order | Upload A, B, C | — | Completion order is either FIFO or clearly labeled per tile |
| FU-MUL-03 | One failure doesn't block others | B fails mid-batch | — | A and C still complete; B shows Retry |
| FU-MUL-04 | Cancel all | Bulk cancel button | Click during upload | All in-flight aborted; queued items cleared |
| FU-MUL-05 | Mixed valid/invalid batch | 3 valid, 2 too large | Drop all 5 | Valid 3 upload; invalid 2 rejected inline with per-file reasons |
| FU-MUL-06 | Adding to an in-progress batch | New file dropped while batch uploading | — | Appended to queue; honors concurrency cap |

---

## 12. Resumable / chunked uploads (if spec'd)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-RES-01 | Chunk upload for large file | File > chunk threshold | Upload | File split into N chunks; progress reflects sum |
| FU-RES-02 | Resume after refresh | Upload at 60%, refresh page | Return to form | Prompt to resume; uploads remaining chunks only |
| FU-RES-03 | Resume across sessions | Log out mid-upload | Log back in | Resume still available within retention window |
| FU-RES-04 | Chunk checksum mismatch | Tamper with one chunk | — | Server rejects; that chunk retried |
| FU-RES-05 | Final assembly failure | Last chunk server error | — | Whole upload marked failed; cleanup of partial chunks |

---

## 13. Security

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-SEC-01 | Executable disguised as image | `photo.jpg` with PE header | Upload | Rejected by MIME sniff |
| FU-SEC-02 | Polyglot file (e.g. GIFAR) | GIF/JAR polyglot | Upload | Rejected |
| FU-SEC-03 | XSS via filename | `"><script>alert(1)</script>.png` | Upload & render | Escaped when displayed; no script execution |
| FU-SEC-04 | SVG with `<script>` | Upload SVG | — | Scripts stripped, or SVG served with `Content-Disposition: attachment` |
| FU-SEC-05 | Directory path in filename | `../../../etc/passwd` | Upload | Stored as basename; no traversal on server |
| FU-SEC-06 | Content-Type spoofing | Client sets `text/plain` on a PDF | Upload | Server re-derives type from bytes |
| FU-SEC-07 | Zip bomb | 42.zip / deeply nested archive | Upload (if archives allowed) | Rejected by decompression-ratio guard |
| FU-SEC-08 | CSRF on upload endpoint | Forged cross-site POST | — | Rejected (token / SameSite cookies) |
| FU-SEC-09 | Direct object reference | Modify upload ID in request | Access another user's upload | 403 / 404 — no leakage |
| FU-SEC-10 | Pre-signed URL scope | Obtain pre-signed URL | Try to PUT to another path/bucket | Rejected by signature / policy |
| FU-SEC-11 | Stored file served from sandbox domain | Access uploaded file URL | — | Served from separate origin / with `Content-Disposition: attachment` for risky types |
| FU-SEC-12 | Audit log created | Any successful upload | Check logs | Entry with user, filename, size, timestamp, IP |

---

## 14. Accessibility

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-A11Y-01 | Browse button has accessible name | Screen reader on | Tab to button | Announced as "Browse files, button" |
| FU-A11Y-02 | Drop zone role | SR on | Focus drop zone | Announced as region with instructions |
| FU-A11Y-03 | Keyboard-only flow | No mouse | Tab → Enter → pick file → Tab to remove | Full upload/remove flow reachable |
| FU-A11Y-04 | Focus returns after picker close | Picker opened & canceled | — | Focus restored to Browse button |
| FU-A11Y-05 | Progress announced | Upload in flight | — | SR announces progress at reasonable intervals (aria-live polite) |
| FU-A11Y-06 | Errors linked to field | Validation error | — | `aria-describedby` points error text to input |
| FU-A11Y-07 | Color is not the only signal | Error / success states | — | Icon + text present, not just red/green |
| FU-A11Y-08 | Reduced motion | `prefers-reduced-motion: reduce` | Upload | No spinning / bouncing animations |
| FU-A11Y-09 | High-contrast mode | Windows HC / forced-colors | — | All borders, icons, text visible |

---

## 15. Cross-browser & device

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-X-01 | Chrome latest | Desktop | Full flow | Works |
| FU-X-02 | Firefox latest | Desktop | Full flow | Works |
| FU-X-03 | Safari latest | macOS | Full flow | Works; drag-drop and paste behave identically |
| FU-X-04 | Edge latest | Windows | Full flow | Works |
| FU-X-05 | iOS Safari | iPhone | Pick from camera/gallery | Works; HEIC handled per spec |
| FU-X-06 | Android Chrome | Phone | Pick & upload | Works |
| FU-X-07 | Tablet landscape | iPad | Full flow | Drop zone scales; thumbnails not overflowing |
| FU-X-08 | Small viewport | 320×568 | Full flow | Zone, progress, and remove buttons tappable (≥44 px) |
| FU-X-09 | Slow 3G | Network throttled | Upload | Progress visible; timeouts tuned for slow links |

---

## 16. Integration with host form

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-INT-01 | Submit blocks until uploads finish | Form submit clicked mid-upload | — | Button disabled or prompt: "Wait for uploads to complete" |
| FU-INT-02 | Required upload missing | Form submitted with no file | — | Validation error on the upload field with focus moved to it |
| FU-INT-03 | Form reset clears queue | Click Reset on form | — | Uploaded + queued files cleared; server artifacts for unsaved drafts cleaned |
| FU-INT-04 | Draft save includes uploads | Save-as-draft after 2 files uploaded | Reload draft | Both files restored with previews and original names |
| FU-INT-05 | Discard draft removes files | Delete draft | — | Uploaded files purged server-side |
| FU-INT-06 | Back/forward navigation | Upload, navigate away, come back | — | Queue restored (where spec'd) or clear state with no ghosts |
| FU-INT-07 | Validation errors persist focus | Server rejects one file on submit | — | That tile scrolled into view and focused |

---

## 17. Telemetry & observability (spec-dependent)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-TEL-01 | Upload-start event | Start upload | — | Analytics event with file type, size bucket (no PII) |
| FU-TEL-02 | Upload-success event | Complete upload | — | Event with duration, size, chunk count |
| FU-TEL-03 | Upload-failure event | Fail upload | — | Event with error class, HTTP status, retry count |
| FU-TEL-04 | No filename / contents leaked to analytics | Any event | Inspect payload | Only hashed/bucketed metadata present |

---

## 18. Edge cases

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| FU-EDGE-01 | Same file uploaded twice simultaneously | Drop `a.pdf` twice in quick succession | — | Dedup, or both accepted with unique names — consistent with spec |
| FU-EDGE-02 | File modified on disk mid-upload | Start upload, edit file externally | — | Either completes with original snapshot, or fails with clear error — no silent corruption |
| FU-EDGE-03 | Clock skew between client/server | Skew 10 min | Upload | Pre-signed URL / token still accepted within tolerance |
| FU-EDGE-04 | Browser permission revoked mid-session | Revoke file system access (where applicable) | Upload | Graceful failure with instructions |
| FU-EDGE-05 | Very slow first byte | Server takes 30s to 200 OK | — | Does not time out prematurely; progress shows "waiting for server" |
| FU-EDGE-06 | 100+ files dropped | Multi enabled, cap = 100 | Drop 150 | First 100 queued; extras rejected with summary toast |
| FU-EDGE-07 | File with only extension, no name | `.gitignore` | Upload | Accepted, name rendered correctly |
| FU-EDGE-08 | Hidden / system file | `.DS_Store`, `Thumbs.db` | Upload | Filtered out by default, or uploaded with warning per spec |
