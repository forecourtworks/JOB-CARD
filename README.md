# FORECOURT WORKS LIMITED — Job Completion & Sign-Off (Work Order App)

**Tagline:** *Engineering Reliability Into Every Forecourt*

First-line operational document for inspection, repair and maintenance work across fueling facilities and power systems.

## Document title
**JOB COMPLETION & SIGN-OFF**

Meta pill: `Job Card No | Associated WO | Date (DD-MON-YYYY) | Status`

## PDF chrome (FSW theme)
- Double navy boundary (outer 0.65 mm + inner 0.22 mm)
- Company block left; logo top-right
- Blue header/body separator
- No footer text (boundary only)
- Title centred under separator

## Section order
| Part | Content |
|------|---------|
| **A** | Job & equipment particulars (3-column meta tiles) |
| **B** | JHA table (+ADD ROW), PPE, toolbox YES/NO + times, Job Safety acknowledgement, tech/supervisor signatures (pad + file) |
| — | **Page break** — page 1 ends after PART B |
| | Reported Problem (self-sizing card) |
| **C** | Scope of work & deliverables (3 cards) |
| **D** | Summary of work done and findings |
| **E** | Quality control tests (table, +ADD ROW) |
| **F** | Spare parts — 7 columns (Name & PN, Qty, Status NEW/RECONDITIONED, Vendor, Install, Warranty start/end), +ADD ROW |
| **G** | Technician recommendations |
| **H** | Equipment final status |
| **I** | Lead tech + client signatures (pad + file) |
| | Photographic evidence — **4 quadrants every page**; extra pages for 5–8, 9–12, … |

## Key form behaviours
- **Work Start Date / Work End Date** (calendar, DD-MON-YYYY on PDF)
- Times render with **AM/PM**
- **COMPLETE | DEPARTURE** share one tile
- Toolbox: YES requires start & end times
- Tables default **5 rows**; **+ ADD ROW** appends more
- PDF **does not split** cards/tables mid-block (`ensureSpace`); oversized tables break only between rows

## Files
- `index.html` — multi-step form UI
- `app.js` — state, validation, PDF generation
- `forecourt-logo-mark.png` — header logo
- `fsw-pdf-theme.js` — shared theme helpers (optional)
- `Roboto-*.ttf` — font assets

## Usage
Open `index.html` in a modern browser (or serve statically). Complete steps → Generate Professional PDF.

---
Forecourt Works Limited · Ramco Court, GT 3B, South C, Nairobi · +254 729-002-087 · sales@forecourtworks.co.ke
