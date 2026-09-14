# Handoff prompt — paste this into Claude Code

I'm building a website for a vehicle export business: sourcing Toyota models from
factories in China and shipping them to sea ports across Venezuela and Latin
America (Colombia, Peru, Ecuador, Mexico, Chile, Panama).

Attached is `quote-calculator.html` — a working single-file quote calculator
(Phase 1 of the site). It includes:

- Model + condition (new/factory-mileage vs used) selector with badges
- Model-linked vehicle preview gallery with a 4-angle roulette (placeholder
  vector art — needs real catalog photos)
- CIF quote breakdown (goods, inland transport, export fees, freight, insurance)
- 40/60 payment split display
- Per-country import eligibility checks (blocks/warns on used-vehicle imports
  where illegal or age/mileage-restricted — data is in the `ports` array)
- Total cost of ownership estimate (CIF + duty range + local registration/
  insurance range)
- Container type toggle (RoRo vs enclosed, +$450/unit)
- Bulk discount tiers (5% at 4+ units, 10% at 8+)
- Document checklist, trust-signals strip (placeholder stats), WhatsApp +
  email CTAs (placeholder contact info)
- Full mobile-responsive layout

Design system: navy/steel/orange "shipping manifest" aesthetic, Archivo
Expanded + IBM Plex Sans/Mono fonts, CSS custom properties at the top of the
file for all colors.

Please:
1. Start a local dev server so I can view/edit this live in the browser
2. Help me wire in [real vehicle photos / real pricing data / whatever's next]

Known placeholders still to replace: brand name ("Nindge Automobile"),
WhatsApp number, sales email, trust-strip stats, per-model shipped-units
counts, and all vehicle photos (currently generated vector icons).
