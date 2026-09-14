# Vehicle Export Site — Project Notes

Business: sourcing Toyota models from factories in China, exporting CIF to sea
ports across Venezuela and Latin America (Colombia, Peru, Ecuador, Mexico,
Chile, Panama).

This folder picks up mid-build. Read this before editing — it explains the
decisions baked into the code/contracts so you don't have to reverse-engineer
them.

---

## Files

- `quote-calculator.html` — Phase 1 deliverable. Single-file HTML/CSS/JS, no
  build step, no dependencies except Google Fonts (Archivo Expanded, IBM Plex
  Sans, IBM Plex Mono). Open it directly in a browser or serve it locally.
- `nindge-automobile-agreement-EN.docx` — Phase 2, English draft. Edit
  this one first; it's the working copy.
- `contrato-nindge-automobile.docx` — Phase 2, Spanish draft. Structurally
  mirrors the English version. Do a final translation pass on this only
  after the English version is locked, so the two don't drift out of sync.
- `claude-code-handoff.md` — short original handoff prompt (superseded by
  this README, kept for reference).

---

## Rebrand (latest change)

Site and both contracts renamed from "Nindge Automobile" wherever it
previously said something else — check for any remaining stray references
if you're merging this with a separately-edited Claude Code copy.

- **Palette** — swapped to a red/gold/sand identity:
  ```
  --navy    #2A0E08   dark rust-black (was navy #0B2338)
  --ink     #241611   warm near-black text (was cool navy-black)
  --paper   #F5F0DD   warm sand background (was cool grey #E9ECE9)
  --paper-2 #FBF8EE   warm off-white panels
  --steel   #6E5A45   warm taupe secondary text (was cool blue-grey)
  --orange  #D73C37   primary red — CTAs, main accent (was orange #D65A1F)
  --orange-dark #B51F09  deep rust — hover states, dark accents
  --red     #EE6146   coral — "Usada" badge, caution states (was maroon)
  --green   #DFBC5E   gold — "Kilometraje de fábrica" badge (repurposed
                       from green; variable name kept as `--green` in the
                       code for now to minimize edits — rename if it causes
                       confusion later)
  ```
  Two colors from the requested swatch (`#e6e0ae` sand, `#dfbc5e` gold) are
  in active use; `#ee6146` (coral) and `#d73c37` / `#b51f09` (reds) are all
  in use as primary/accent/badge colors.

- **Fonts** — swapped Archivo Expanded + IBM Plex Sans for **Oswald +
  Inter** (IBM Plex Mono kept for data/numbers). Deliberately different
  typographic voice, not just a recolor.

- **Shape language** — the circular rotated "stamp" badge became a flat
  rectangular ribbon/pill; the dashed-perforation strip on the manifest
  card became a solid gradient bar (rust → red → gold).

- **Images removed** — the four generated SVG vehicle-angle illustrations
  (front/side/rear/interior) were deleted per instruction. The
  roulette/gallery *mechanism* (arrows, dots, auto-rotate, model-linking)
  was kept intact — it now shows a plain "FOTO — [angle] próximamente"
  placeholder instead of drawn art. Swap in real photos the same way as
  before: replace what `angleIcons` returns.

- No testimonial blocks existed in this copy to remove — if the Claude Code
  version had them, they won't carry over from this file.

---

## Phase status

- **Phase 1 — Quote calculator: done**, described in full below.
- **Phase 2 — Contract & policy rewrite: in progress.** Both language
  versions exist and are structurally identical (28 articles each). Currently
  editing the English version; Spanish gets a final translation pass once
  English is locked. See "Contract decisions" below for what's already been
  decided vs. still open.
- **Phase 3 — Catalog integration: not started.** Replace the fixed
  `models` array in the calculator with a real catalog (photos + specs).
- **Phase 4 — Lead capture / CRM handoff: not started.**

---

## Design system

CSS custom properties at the top of `quote-calculator.html` (`:root`):

```
--navy    #0B2338   headers, dark sections
--ink     #10202B   body text
--paper   #E9ECE9   page background
--paper-2 #F4F5F2   panel background
--steel   #4C6572   secondary text
--orange  #D65A1F   primary accent / CTA
--red     #A32B2B   used-unit badge, warnings
--green   #2F6B4F   new-unit badge, positive states
```

Aesthetic direction: shipping-manifest / customs-document look — dashed
perforation lines, stamped badges, monospace for all numbers/codes
(IBM Plex Mono), condensed display type for headers (Archivo Expanded).

---

## Data model (top of the `<script>` block)

### `models[]`
Each model has `newPrice`, `usedPrice`, and `shipped` (placeholder units-sold
count used in the trust strip, now shown dynamically per selected model).
All prices already have `PRICE_CUT` ($6,000) subtracted — that constant is
defined once at the top.

### `ports[]`
Each port carries real researched data:

- `usedAllowed` (bool) — whether the destination country permits importing
  used vehicles at all. **Colombia, Ecuador, and Chile are `false`** (outright
  bans). Venezuela is `false` for practical commercial import by
  non-citizens. Peru and Panama are `true` with age/mileage caps.
- `maxUsedAgeYears`, `maxUsedKm` — Peru (5 yrs / 80,000 km), Panama (5 yrs,
  no km cap found).
- `dutyLow` / `dutyHigh` — rough total import tax burden as % of CIF value.
- `regFeeLow` / `regFeeHigh` — flat USD estimate for local registration,
  plates, and mandatory liability insurance, scaled by quantity.
- `regulationNote` — buyer-facing explanation shown in the compliance
  warning banner.

**All of these numbers are estimates and will drift.** Get a customs broker
in each country to sanity-check this table before launch.

---

## Calculator logic (`calculate()` function)

1. Base goods value = unit price (new/used) × qty
2. + inland transport ($180/unit) + export fees ($270/unit) + freight
   (port-specific, +$450/unit if enclosed container)
3. − bulk discount (5% off freight at 4+ units, 10% at 8+)
4. + insurance (1.1% of the above subtotal)
5. = Total CIF
6. Compliance check runs independently — if the destination doesn't allow
   the selected condition (or age/mileage exceeds the limit), a warning
   banner replaces the normal flow and the WhatsApp CTA text changes to
   "Consultar alternativas."
7. **Total cost of ownership box**: CIF + duty range + local registration
   range, shown as a grand total range — this is the number that answers
   "what will it actually cost me to own this car," not just the CIF price.

## Gallery / roulette
Model-linked, 4 angles, arrows + dots + 4s auto-rotate. Currently renders
generated SVG placeholder icons — swap `angleIcons` to return `<img>` tags
once real catalog photos exist.

## Live order ticker
Toast notification (bottom-left, slides in/out) that cycles through
`liveOrders[]` at randomized 9–23s intervals. **Empty array by default —
stays completely silent until real data is added.** Do not populate with
invented orders; the whole point is that each entry links to a real,
verifiable blockchain transaction. Format:

```js
{
  orderId: 'NDG-CH-VZ-0358-538',
  vehicle: 'Toyota Hilux (Doble Cabina)',
  port: 'Puerto Cabello, Venezuela',
  amountUsdt: 26800,
  txHash: '9f2a...c81e',       // real tx hash
  network: 'TRC20',            // TRC20 | ERC20 | BEP20 — determines explorer link
  timeAgo: 'hace 12 min'
}
```
Links to Tronscan/Etherscan/BscScan automatically based on `network`.

---

## Contract decisions already made (don't re-litigate these without reason)

- **Structure**: 28 articles, same as the source JC China Export contract —
  CIF terms, 40/60 payment split, ownership retained until 100% paid.
- **Tone**: softened from the original. Refund policy (Art. 23) explains
  *why* sales are generally final instead of just stating it, and adds a
  good-faith resolution path when the seller is at fault. Non-circumvention
  (Art. 20), fraud prevention (Art. 17), and liability limits (Art. 21) are
  reframed as mutual protection rather than one-sided disclaimers.
- **Payment (Art. 5)**: offers USD wire *or* USDT — USDT positioned as the
  practical option for markets with limited USD banking access (Venezuela
  specifically), not the only option.
- **Governing law vs. arbitration seat (Art. 26/27) — decided**: contract
  stays governed by PRC law, but disputes are arbitrated at a **neutral
  seat: Hong Kong International Arbitration Centre (HKIAC)**, not mainland
  China. Buyer can choose English or Spanish for proceedings. This was a
  deliberate choice to reduce the "I'd have to fight this in China" fear
  factor for first-time Latin American buyers, while staying convenient
  enough for the seller to actually use. Rationale is documented directly
  in Article 27's text.

## Still open / waiting on the business owner

- Real vehicle photos + full catalog
- Real WhatsApp number (currently `000000000`) and sales email (currently
  `ventas@tuempresa.com`)
- Real pricing/freight cost sheet
- Trust-strip stats (years in business, countries active)
- Legal entity name, representative name/title, and registered address for
  the contract's `[Nombre Legal de la Entidad]` placeholders
- First batch of real orders + tx hashes to populate the live ticker
- Brand name — still using placeholder "Nindge Automobile" throughout
  every file (site + both contracts) — if this changes, it needs to change
  everywhere consistently

## Not started yet

- Phase 3 — catalog integration
- Phase 4 — lead capture / CRM handoff
