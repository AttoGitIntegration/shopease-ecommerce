# Google Search - Negative Test Scenarios

## 1. Empty / Whitespace Input
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| NEG-001 | Submit search with empty query | 1. Open google.com<br>2. Leave search box empty<br>3. Click "Google Search" | No search executes; user remains on home page |
| NEG-002 | Submit search with only spaces | 1. Enter "   " (only spaces)<br>2. Press Enter | No results page is shown OR a message indicating no useful query |
| NEG-003 | Submit search with only tabs/newlines | 1. Paste tab/newline-only string<br>2. Submit | Treated as empty input; no search performed |
| NEG-004 | Submit search with only punctuation | 1. Enter "!@#$%^&*()"<br>2. Submit | "No results found" or fallback suggestions; no crash |

## 2. Excessively Long Input
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| NEG-005 | Query exceeds maximum allowed length (>2048 chars) | 1. Paste a 5000-character string<br>2. Submit | Query is truncated or rejected with a graceful message; no 414 URI Too Long error visible to user |
| NEG-006 | Query with extremely long single word (no spaces) | 1. Enter 3000 characters of "a"<br>2. Submit | "No results found"; UI does not break layout |
| NEG-007 | Query with thousands of repeated terms | 1. Enter "test " repeated 1000 times<br>2. Submit | Either truncated or returns generic results; no timeout |

## 3. Special Characters & Injection Attempts
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| NEG-008 | XSS injection in query | 1. Enter `<script>alert('xss')</script>`<br>2. Submit | Treated as plain text; no script execution; HTML is escaped |
| NEG-009 | SQL injection style query | 1. Enter `' OR 1=1 --`<br>2. Submit | Treated as text query; results shown safely |
| NEG-010 | HTML tags in query | 1. Enter `<h1>hello</h1>`<br>2. Submit | Tags treated as text; no rendering as HTML |
| NEG-011 | Unicode/RTL override characters | 1. Enter query with U+202E (RTL override)<br>2. Submit | Rendered safely; no UI direction hijack |
| NEG-012 | Null byte in query | 1. Enter `test%00query`<br>2. Submit | Sanitized; no server error |
| NEG-013 | Emoji-only query | 1. Enter "🎉🎉🎉"<br>2. Submit | Returns relevant or "no results" gracefully |

## 4. Invalid / Malformed Operators
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| NEG-014 | Unclosed quotes | 1. Enter `"hello world`<br>2. Submit | Query interpreted leniently; no error |
| NEG-015 | Invalid `site:` operator | 1. Enter `site:`<br>2. Submit | No crash; fallback to text search |
| NEG-016 | Malformed `filetype:` | 1. Enter `filetype:###`<br>2. Submit | "No results" or treated as text |
| NEG-017 | Conflicting operators | 1. Enter `site:google.com -site:google.com`<br>2. Submit | Empty result set handled gracefully |
| NEG-018 | Operator with no value | 1. Enter `intitle:`<br>2. Submit | Fallback behavior; no 500 error |
| NEG-019 | Excessive minus operators | 1. Enter `------test`<br>2. Submit | Handled as text; results returned |

## 5. Network & Connectivity
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| NEG-020 | Submit search with no internet | 1. Disconnect network<br>2. Submit query | Browser shows connectivity error; no partial results |
| NEG-021 | Slow / throttled network | 1. Throttle to 2G in DevTools<br>2. Submit query | Loading indicator visible; no UI freeze |
| NEG-022 | Network drops mid-request | 1. Submit query<br>2. Disconnect immediately | Error or retry option; no infinite spinner |
| NEG-023 | DNS resolution failure | 1. Block google.com DNS<br>2. Submit | Browser-level DNS error |

## 6. Browser & Session State
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| NEG-024 | JavaScript disabled | 1. Disable JS in browser<br>2. Submit query | Basic search still works (HTML form fallback) or graceful message |
| NEG-025 | Cookies disabled | 1. Block all cookies<br>2. Submit query | Search executes; consent banner may appear |
| NEG-026 | Search in private/incognito with extensions blocking google | 1. Use ad-blocker blocking google domains<br>2. Submit | Clear failure message or fallback |
| NEG-027 | Back button after search | 1. Search<br>2. Click result<br>3. Press back | Returns to results without re-submitting |
| NEG-028 | Submit while previous search loading | 1. Submit query A<br>2. Immediately submit query B | Latest query wins; no stale results |
| NEG-029 | Multiple rapid submissions (double-click submit) | 1. Click search button rapidly 10x | Single search performed; no duplicate requests |

## 7. URL Manipulation
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| NEG-030 | Direct URL with empty `q` param | 1. Visit `google.com/search?q=` | Redirect to home or empty results page; no error |
| NEG-031 | URL with malformed query params | 1. Visit `google.com/search?q=%%%` | Decoded gracefully or error page; no crash |
| NEG-032 | URL with extremely long encoded query | 1. Visit `?q=` followed by 10000 chars | 414 URI Too Long handled gracefully |
| NEG-033 | URL with invalid `start` parameter | 1. Visit `?q=test&start=-1`<br>2. Visit `?q=test&start=99999` | Defaults to valid range; no error |
| NEG-034 | URL with invalid `num` parameter | 1. Visit `?q=test&num=99999` | Caps to allowed maximum |
| NEG-035 | URL with non-existent language code | 1. Visit `?q=test&hl=xx99` | Falls back to default language |

## 8. Locale & Encoding
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| NEG-036 | Mixed-script query (e.g., Cyrillic + Latin lookalikes) | 1. Enter "gооgle" (Cyrillic o)<br>2. Submit | Results returned; possible "did you mean" |
| NEG-037 | Right-to-left language with Latin operators | 1. Enter `العربية site:wikipedia.org`<br>2. Submit | Results display correctly with proper bidi |
| NEG-038 | Invalid encoding in pasted text | 1. Paste broken UTF-8 sequence<br>2. Submit | Sanitized; no garbled UI |

## 9. Voice & Image Search (if used)
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| NEG-039 | Voice search with mic permission denied | 1. Click mic icon<br>2. Deny permission | Clear permission-required message |
| NEG-040 | Voice search with silent input | 1. Allow mic<br>2. Stay silent for 10s | "Didn't hear anything" or timeout message |
| NEG-041 | Image search with corrupted image | 1. Upload a `.txt` renamed as `.jpg` | Clear "unsupported file" error |
| NEG-042 | Image search with file > size limit | 1. Upload a 100MB image | Rejected with size-limit message |
| NEG-043 | Image search with 0-byte file | 1. Upload empty file | Rejected with validation error |

## 10. Rate Limiting & Bot Behavior
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| NEG-044 | Excessive automated queries from same IP | 1. Submit 100+ queries rapidly via script | CAPTCHA challenge or temporary block |
| NEG-045 | Suspicious user-agent | 1. Use empty/known-bot UA | CAPTCHA or 429 response |
| NEG-046 | Failed CAPTCHA | 1. Trigger CAPTCHA<br>2. Fail it 3 times | Continued challenge; no bypass |

## 11. Accessibility & UI Edge Cases
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| NEG-047 | Tab key bypasses search box | 1. Use only keyboard navigation<br>2. Submit empty | Focus order correct; no trap |
| NEG-048 | Submit with screen reader on empty input | 1. Use screen reader<br>2. Submit empty | Announces "no query entered" or stays silent appropriately |
| NEG-049 | Zoom at 400% with very long query | 1. Set zoom 400%<br>2. Type 200-char query | UI does not break; query remains editable |
| NEG-050 | Paste from clipboard with formatting | 1. Copy rich-text from Word<br>2. Paste in search box | Plain text only; formatting stripped |
