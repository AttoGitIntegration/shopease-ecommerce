# Amazon — Search (Web UI) Functional Test Scenarios

Scope: end-user test scenarios for the **Amazon.com search experience** on the web (desktop + mobile web). Covers the top search bar, suggestions (autocomplete), results page (SERP), filters / facets, sorting, pagination, and edge cases. API/backend tests are out of scope.

**Pages exercised:**
- Amazon homepage — `https://www.amazon.com/`
- Search results (SERP) — `https://www.amazon.com/s?k=<query>`
- Department-scoped search — `https://www.amazon.com/s?k=<query>&i=<dept>`
- Product Detail Page (PDP) — `https://www.amazon.com/dp/<ASIN>`

**Key UI components:**
- Department dropdown (left of search box)
- Search input box
- "Go" / magnifier submit button
- Autocomplete suggestions panel
- SERP: result grid, left-rail filters, sort dropdown, pagination, sponsored / "Sponsored" labels, "Best seller" / "Amazon's Choice" badges

---

## 1. Search bar — basic behavior

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SRCH-SB-01 | Search bar visible on every page | Any page | — | Search bar anchored in the top nav; visible on homepage, SERP, PDP, cart, account |
| SRCH-SB-02 | Placeholder copy | Homepage | Inspect input | Placeholder reads "Search Amazon" (or localized equivalent) |
| SRCH-SB-03 | Focus on click | Homepage | Click the input | Cursor enters the input; caret visible; suggestion panel prepares to open |
| SRCH-SB-04 | Submit via Enter key | Input focused | Type `iphone` → Enter | Navigates to `/s?k=iphone`; SERP loads |
| SRCH-SB-05 | Submit via Go button | — | Type `iphone` → click magnifier | Same SERP as SRCH-SB-04 |
| SRCH-SB-06 | Empty submit | Input empty | Press Enter | Either no-op (stay on page) or SERP with "Enter a search term" — must be consistent |
| SRCH-SB-07 | Whitespace-only submit | Input `"   "` | Enter | Treated as empty per SRCH-SB-06; no SERP load |
| SRCH-SB-08 | Leading/trailing whitespace | Input `"  iphone  "` | Enter | Trimmed; URL is `/s?k=iphone`, not `%20iphone%20` |
| SRCH-SB-09 | Max length | Paste 2000-char string | — | Input capped at documented max (e.g. 200 chars); no browser crash |
| SRCH-SB-10 | Input keeps query on SERP | Search `iphone` | — | On SERP, the input still displays `iphone` (not cleared) |
| SRCH-SB-11 | Clear (×) affordance | Input has text | Click × | Input clears; focus remains in the input |

---

## 2. Department (category) dropdown

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SRCH-DD-01 | Default is "All Departments" | Fresh session | — | Dropdown shows "All Departments" |
| SRCH-DD-02 | Dropdown lists departments | — | Open dropdown | All standard departments visible (Electronics, Books, Home & Kitchen, etc.) in documented order |
| SRCH-DD-03 | Scoped search — happy path | Select "Electronics" | Type `iphone` → Enter | URL contains `&i=electronics` (or the corresponding alias); SERP shows only electronics |
| SRCH-DD-04 | Scope persists within session | Set scope to Books | Navigate away and return | Scope remains "Books" until user changes it or session ends |
| SRCH-DD-05 | Scope persists in URL, not forever | SERP with `i=books` | Open a new tab / homepage | New tab starts with "All Departments" |
| SRCH-DD-06 | Change scope on SERP re-issues search | On SERP for `iphone` in All | Change scope to Electronics | New SERP at `/s?k=iphone&i=electronics` |
| SRCH-DD-07 | Scope with empty query | Scope=Books; input empty | Submit | Either no-op or browse-books landing — consistent with spec |

---

## 3. Autocomplete / suggestions

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SRCH-AC-01 | Suggestions appear on typing | Input focused | Type `ip` | Panel opens within ~300 ms with up to ~10 suggestions |
| SRCH-AC-02 | Suggestion ordering | — | Type `iphone` | Most popular/likely suggestions first; paid/sponsored suggestions labelled |
| SRCH-AC-03 | Department hint in suggestion | — | Type `iphone` | Some suggestions show "in Electronics" / "in Cell Phones" badges |
| SRCH-AC-04 | Keyboard navigation | Suggestions visible | Press ↓ / ↑ | Highlight moves through suggestions; Enter submits the highlighted one |
| SRCH-AC-05 | Mouse selection | Suggestions visible | Click a suggestion | Submits to SERP for the clicked text |
| SRCH-AC-06 | Esc closes panel | Suggestions open | Press Esc | Panel closes; input retains text; focus still in input |
| SRCH-AC-07 | Click outside closes | Suggestions open | Click outside | Panel closes |
| SRCH-AC-08 | Throttling / debounce | — | Type quickly `iphone` | No more than one in-flight suggest call per keystroke burst; no UI flicker |
| SRCH-AC-09 | Recent searches (logged in) | Logged-in user with search history | Focus empty input | Recent queries surface above generic suggestions |
| SRCH-AC-10 | Recent searches (signed out) | Not logged in | Focus empty input | Local recent searches (if any) — otherwise the panel is empty/collapsed |
| SRCH-AC-11 | Clear search history | Logged in | Open history manager | User can delete individual or all recent queries |
| SRCH-AC-12 | Special chars in suggestions | Type `iphone 13 128gb` | — | Space + digits behave correctly; no suggestion-panel crash |
| SRCH-AC-13 | Long suggestion wrapping | Very long suggestion | — | Truncated with ellipsis; full text on hover/tooltip |

---

## 4. Query variations

| # | Title | Input | Expected |
|---|---|---|---|
| SRCH-Q-01 | Exact product name | `Apple AirPods Pro 2nd generation` | Exact / near-exact PDPs ranked first |
| SRCH-Q-02 | Misspelling tolerance | `iphne` | "Did you mean: iphone" banner; results for corrected query |
| SRCH-Q-03 | Abbreviation | `tv` | TV results; not just literal 2-char matches |
| SRCH-Q-04 | Plural vs singular | `shoe` vs `shoes` | Both return relevant shoe results |
| SRCH-Q-05 | Brand search | `Samsung` | Brand-heavy results with brand rail filter highlighted |
| SRCH-Q-06 | Model number | `MQD83AM/A` | Specific PDP returned if ASIN matches; otherwise closest variant |
| SRCH-Q-07 | Multi-word | `red running shoes men` | All tokens considered; color / category filters pre-selected or suggested |
| SRCH-Q-08 | Special characters | `C++ programming book` | `+` characters don't break URL; results still relevant |
| SRCH-Q-09 | Unicode / non-Latin | `книга` or `日本語` | UTF-8 encoded in URL; SERP handles without mojibake |
| SRCH-Q-10 | Emojis | `📱` | Handled gracefully — either empty state or best-effort match; no 5xx |
| SRCH-Q-11 | HTML / script injection | `<script>alert(1)</script>` | Rendered as plain text in results header; no script execution (XSS safe) |
| SRCH-Q-12 | SQL-ish payload | `' OR 1=1 --` | Treated as literal search string; no error page |
| SRCH-Q-13 | Very long query | 500-word sentence | No browser crash; server returns either results or graceful empty state |
| SRCH-Q-14 | Numeric only | `12345` | Works; may match model numbers or ASINs |
| SRCH-Q-15 | Case insensitivity | `IPHONE` vs `iphone` | Same result set (subject to relevance noise) |
| SRCH-Q-16 | Leading punctuation | `!iphone` | Trimmed or handled; SERP is not broken |

---

## 5. Search results page (SERP) — layout

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SRCH-RP-01 | Result grid renders | Query returns results | — | N result cards visible (default per-page count), each with image, title, rating, price, Prime badge, shipping info |
| SRCH-RP-02 | Results count displayed | — | — | "1-48 of over X results for 'query'" is shown near top |
| SRCH-RP-03 | Active query in breadcrumb/title | — | — | Page `<title>` and H1-equivalent contain the query |
| SRCH-RP-04 | Sponsored labelling | Sponsored items exist | — | Items tagged "Sponsored"; label is visible without hover |
| SRCH-RP-05 | "Amazon's Choice" badge | Applicable query | — | Badge present on qualifying item; click-through goes to PDP |
| SRCH-RP-06 | "Best Seller" badge | Applicable category | — | Badge visible with category name |
| SRCH-RP-07 | Empty state | Garbage query (e.g. `asdkjfhaskjdfhakjshdf`) | — | "No results for '…'" message with suggestions (check spelling, try broader terms) |
| SRCH-RP-08 | Zero-result department change | Scoped empty result | Change scope to All | Results populate from broader scope |
| SRCH-RP-09 | Out-of-stock items | Query matching OOS item | — | Marked "Currently unavailable"; price may be hidden; can still click to PDP |
| SRCH-RP-10 | Price range display | Products with variants | — | Prices show as `$X.XX - $Y.YY` for variant ranges |
| SRCH-RP-11 | Image lazy load | Scroll down | — | Below-the-fold images lazy-load; no layout shift |

---

## 6. Filters (left-rail facets)

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SRCH-F-01 | Department filter | SERP for `iphone` | Click "Cell Phones" | URL updates; only cell-phone items shown |
| SRCH-F-02 | Price range filter | — | Enter min=100 max=500 → Go | URL contains `rh=p_36` range; items all within range |
| SRCH-F-03 | Invalid price range | min > max | Apply | Client validation prevents apply OR server returns empty with a warning |
| SRCH-F-04 | Brand filter | — | Check "Apple" | Only Apple items; filter pill appears above grid |
| SRCH-F-05 | Multiple brands | — | Check Apple + Samsung | Both brands; union logic (OR within facet) |
| SRCH-F-06 | Rating filter | — | Click "4 Stars & Up" | Items with avg rating ≥ 4 stars only |
| SRCH-F-07 | Prime-eligible filter | — | Toggle Prime | Only Prime-shipped items |
| SRCH-F-08 | Deals / Discount filter | — | Toggle "Today's Deals" | Deal items only |
| SRCH-F-09 | Seller filter | — | Choose "Amazon.com" | Only items shipped/sold by Amazon |
| SRCH-F-10 | Combined facets | — | Apply brand + price + rating | All three applied simultaneously (AND across facets) |
| SRCH-F-11 | Clear individual facet | Facets active | Click × on one pill | That facet cleared; others retained; URL reflects change |
| SRCH-F-12 | Clear all facets | — | Click "Clear" | All pills removed; URL resets to base query |
| SRCH-F-13 | Facet counts | — | — | Each facet shows count of results matching it; counts are accurate and update when other facets applied |
| SRCH-F-14 | Zero-count facets | — | — | Facets with 0 matches are either disabled or hidden |
| SRCH-F-15 | Deep link with facets | Open `/s?k=iphone&rh=p_89:Apple` | — | SERP loads with Apple filter pre-applied |
| SRCH-F-16 | Facet state survives pagination | Apply facet → go to page 2 | — | Facet still active on page 2 |

---

## 7. Sorting

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SRCH-S-01 | Default sort | Fresh SERP | — | "Featured" selected by default |
| SRCH-S-02 | Sort: Price low to high | — | Select in dropdown | Prices ascending across pages |
| SRCH-S-03 | Sort: Price high to low | — | Select | Prices descending |
| SRCH-S-04 | Sort: Avg customer review | — | Select | Items ordered by rating desc (with rating count as tiebreak if applicable) |
| SRCH-S-05 | Sort: Newest arrivals | — | Select | Items with most recent release date first |
| SRCH-S-06 | Sort: Best sellers | — | Select | Items ordered by sales rank |
| SRCH-S-07 | Sort persists with facets | Apply brand=Apple + sort price asc | — | Both URL params present; sort correctly applied to filtered set |
| SRCH-S-08 | Sort persists on pagination | Page 1 price-asc | Go to page 2 | Page 2 continues in ascending order |
| SRCH-S-09 | Sort reset on new query | Set to price-asc → new search | — | Sort resets to Featured for the new query |

---

## 8. Pagination

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SRCH-P-01 | Pagination controls visible | Results > 1 page | — | Page numbers + Prev/Next shown at bottom |
| SRCH-P-02 | Go to next page | Page 1 | Click Next | URL `&page=2`; fresh result set; page position 2 highlighted |
| SRCH-P-03 | Direct page number click | — | Click page 5 | URL `&page=5`; viewport scrolls to top |
| SRCH-P-04 | Prev on page 1 | Page 1 | — | Prev is disabled |
| SRCH-P-05 | Next on last page | Last page | — | Next is disabled |
| SRCH-P-06 | Max page limit | Very large page number via URL (`page=9999`) | — | Amazon caps pagination (commonly 20 pages); out-of-range shows a graceful last-page or empty message |
| SRCH-P-07 | Deep link to page N | Open `/s?k=iphone&page=3` | — | Page 3 loads directly |
| SRCH-P-08 | Per-page count | — | — | Consistent items per page (e.g. 48 on desktop, fewer on mobile) |
| SRCH-P-09 | Back navigation preserves position | On page 3 → click PDP → Back | — | Returns to page 3 with same facets/sort and scroll position |

---

## 9. Interactions from SERP

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SRCH-I-01 | Click product title → PDP | On SERP | Click title | Navigates to correct PDP (ASIN match) |
| SRCH-I-02 | Click image → PDP | — | Click image | Same PDP as SRCH-I-01 |
| SRCH-I-03 | Middle-click opens new tab | — | Middle-click a card | New tab loads PDP; SERP retains state |
| SRCH-I-04 | Hover quick-look (if enabled) | — | Hover card | Preview popover with variant/price info; does not steal focus |
| SRCH-I-05 | Add to cart from SERP (if card supports) | Variant-less product | Click "Add to cart" | Cart count increments; toast confirmation; SERP remains |
| SRCH-I-06 | Wishlist / Save-for-later icon | Logged in | Click heart icon | Item added to default list; icon state changes |
| SRCH-I-07 | Compare checkbox (where applicable) | — | Select 2-4 items → Compare | Compare view opens |
| SRCH-I-08 | Sponsored click tracking | — | Click sponsored | Navigates to PDP; analytics fire; user not trapped on ad domain |

---

## 10. Localization & currency

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SRCH-L-01 | Locale-aware site | Open amazon.in vs amazon.com | Same query | Results reflect local catalog; currency matches (₹ / $) |
| SRCH-L-02 | Ship-to location | Change ship-to | — | Availability and prices refresh; some items may become unavailable |
| SRCH-L-03 | Language toggle | Switch language (where supported) | — | UI strings localized; product data localized where available |
| SRCH-L-04 | RTL support | Switch to Arabic/Hebrew locale | — | Layout flips to RTL correctly; facets align right |
| SRCH-L-05 | Query in non-English | `книга` on amazon.com | — | Gracefully handled (may show few/no results, but no UI break) |

---

## 11. Performance

| # | Title | Expected |
|---|---|---|
| SRCH-PF-01 | SERP initial load | LCP < 2.5s on broadband; < 4s on mid-tier mobile |
| SRCH-PF-02 | Suggestion latency | Panel updates within ~300 ms of keystroke |
| SRCH-PF-03 | Pagination click latency | Next page TTFB < 500 ms; content visible < 2 s |
| SRCH-PF-04 | No CLS on image load | Cumulative Layout Shift < 0.1 |
| SRCH-PF-05 | Facet apply | Result refresh < 1 s on typical connection |
| SRCH-PF-06 | Memory on long scroll | Scrolling through 20 pages does not progressively degrade (leak check) |

---

## 12. Accessibility (a11y)

| # | Title | Expected |
|---|---|---|
| SRCH-A-01 | Keyboard-only search | Tab reaches input, dropdown, Go button in logical order |
| SRCH-A-02 | Suggestion list ARIA | `role="listbox"` with `role="option"` children; `aria-activedescendant` updates with ↑/↓ |
| SRCH-A-03 | Screen reader announces results count | SR reads "1–48 of X results for query" on SERP load |
| SRCH-A-04 | Focus management | After search submit, focus moves to results heading |
| SRCH-A-05 | Facet checkboxes labelled | Each facet has accessible label with count |
| SRCH-A-06 | Sponsored label is SR-visible | SRs announce "Sponsored" before item title |
| SRCH-A-07 | Color contrast | All text, including price and badges, meets WCAG AA (≥ 4.5:1) |
| SRCH-A-08 | Reduced motion | Suggestion panel does not animate when OS reduce-motion is on |

---

## 13. Responsive & cross-device

| # | Title | Pre-conditions | Expected |
|---|---|---|---|
| SRCH-X-01 | Mobile web ≤ 375px | iPhone SE viewport | Search input full-width; dropdown collapses into menu; results single-column |
| SRCH-X-02 | Tablet | iPad viewport | Two-column grid; facets either visible or behind filter drawer |
| SRCH-X-03 | Desktop ≥ 1920px | — | Grid uses more columns (4+); max-width enforced on content |
| SRCH-X-04 | Touch targets | Mobile | All tap targets ≥ 44×44 px |
| SRCH-X-05 | Mobile filters drawer | Mobile SERP | "Filter" button opens overlay; Apply/Clear visible at bottom |
| SRCH-X-06 | Cross-browser | Chrome, Safari, Firefox, Edge | Visual + functional parity; no console errors |
| SRCH-X-07 | iOS Safari back gesture | PDP from SERP | Swipe-back returns to SERP with preserved scroll |

---

## 14. Session, history, personalization

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SRCH-SE-01 | Logged-out search | Incognito | Search + browse | Results served; personalization reduced; no user name anywhere |
| SRCH-SE-02 | Login during search | On SERP | Click Sign in → return | Return to the same SERP; query + facets preserved |
| SRCH-SE-03 | Browsing history influences suggestions | Logged in, previously viewed phones | Focus input | Phone-related suggestions surface |
| SRCH-SE-04 | Clear browsing history | — | Delete history → search | Suggestions no longer reflect deleted history |
| SRCH-SE-05 | Cross-device continuity | Same account on mobile + desktop | Recent on desktop | Visible in recent searches on mobile (if feature enabled) |

---

## 15. Error handling & resilience

| # | Title | Pre-conditions | Steps | Expected |
|---|---|---|---|---|
| SRCH-ER-01 | Network offline | Offline | Submit search | Offline page or cached last SERP; no infinite spinner |
| SRCH-ER-02 | Suggestion API fails | Stub 500 on suggest | Type query | Suggestion panel silently hides; search submission still works |
| SRCH-ER-03 | SERP API 500 | Stub | — | Friendly error page ("Something went wrong") with retry; no stack traces |
| SRCH-ER-04 | Slow network | Throttle 3G | Search | Skeleton placeholders shown; no double-submission on repeated Enter |
| SRCH-ER-05 | Browser Back/Forward | Multiple searches in session | Back/Forward | SERPs restore exactly from history (state + scroll) |
| SRCH-ER-06 | Hard refresh on SERP | Facets applied | Reload | All facets/sort/page preserved from URL |

---

## 16. Security & privacy

| # | Title | Expected |
|---|---|---|
| SRCH-SEC-01 | XSS via query | Query `<script>` renders as text; no script execution |
| SRCH-SEC-02 | URL length bombs | Very long query/facet URL doesn't crash client; server returns 400 or 414 gracefully |
| SRCH-SEC-03 | HTTPS only | All search requests over TLS |
| SRCH-SEC-04 | CSRF on search (GET only) | Submission is idempotent GET; no state change possible via crafted URL |
| SRCH-SEC-05 | PII in URL | Email/password never appear in SERP URLs |
| SRCH-SEC-06 | Autocomplete privacy | Cross-tenant / other-user history never leaks in suggestions |

---

## 17. Analytics & tracking

| # | Title | Expected |
|---|---|---|
| SRCH-AN-01 | Search submitted event | Event fires with `{query, department, source}` |
| SRCH-AN-02 | Suggestion selected | Event with `{query, suggestion, position}` |
| SRCH-AN-03 | Facet applied | Event with `{facet, value}` |
| SRCH-AN-04 | Sort changed | Event with `{sortOption}` |
| SRCH-AN-05 | Result clicked | Event with `{query, ASIN, position, isSponsored}` |
| SRCH-AN-06 | Zero results | Event `search_zero_results` with `{query}` |
| SRCH-AN-07 | No duplicate events on double-submit | Exactly one search event per Enter/click storm |

---

## 18. Edge cases & exploratory

| # | Title | Expected |
|---|---|---|
| SRCH-EX-01 | Paste with newlines | Newlines stripped or converted to spaces; search runs on single-line query |
| SRCH-EX-02 | Right-click on result card | Native browser context menu (not suppressed) |
| SRCH-EX-03 | Drag-and-drop image into search | Either ignored or opens visual search (if supported) |
| SRCH-EX-04 | Rapid sequential searches | Previous in-flight request cancelled; only last result rendered |
| SRCH-EX-05 | Back after adding to cart from SERP | Returns to SERP with correct cart count in nav |
| SRCH-EX-06 | Emoji in saved search | Stored and replayable |
| SRCH-EX-07 | Search bar inside iframe (embedded) | Clickjack-protected; frame-ancestors respected |
| SRCH-EX-08 | Voice search (where supported) | Mic icon; permission prompt; recognized text fills input; auto-submits |
| SRCH-EX-09 | Barcode / image search (where supported) | Camera opens; barcode scan routes to PDP or SERP |

---

## 19. Content & copy

| # | Expected |
|---|---|
| SRCH-CO-01 | Placeholder: "Search Amazon" (localized) |
| SRCH-CO-02 | Empty state: "No results for '<query>'" with tips list |
| SRCH-CO-03 | "Did you mean" banner copy is grammatical and links to corrected search |
| SRCH-CO-04 | Sponsored items always carry visible "Sponsored" label |
| SRCH-CO-05 | Results count grammar: singular/plural correct ("1 result" vs "N results") |
| SRCH-CO-06 | All strings localized in supported locales; no hard-coded English on non-English sites |
