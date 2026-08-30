# Venezuela Meta Catalogue: Taxonomy and Setup Guide

Last verified: 24 August 2026

This guide is the operating procedure for HainaAuto's Venezuelan Meta catalogue. It explains how vehicles are classified in the feed, how to create clean product sets in Commerce Manager, and how to update the catalogue without breaking item IDs, tracking, or Spanish landing pages.

## 1. Use the correct feed

- Public feed URL: `https://hainautocn.com/meta-catalog-venezuela.csv`
- Generator: `scripts/build-venezuela-meta-catalog.mjs`
- Build command: `npm run data:catalog-feed:venezuela`
- Current size: 1,000 available vehicles
- Language: Venezuelan Spanish (`es-VE`)
- Currency: USD
- Category field: `custom_label_0`
- Priority field: `custom_label_1`

This is a standard product feed designed for an Ecommerce/Product catalogue. Do not upload it into a property, hotel, flight, or other vertical catalogue. If Meta offers a dedicated automotive inventory catalogue in the account, do not switch to it without first creating a separate vehicle-specific feed with Meta's required automotive fields. The current feed deliberately uses the stable product fields `id`, `title`, `description`, `availability`, `condition`, `price`, `link`, `image_link`, `brand`, `product_type`, and `custom_label_0` through `custom_label_4`.

Meta notes that catalogue/shop availability and interfaces vary by account and country. The business portfolio must have full control of the Page and catalogue, and the business/domain must meet Meta's commerce eligibility requirements. See Meta's official [shop setup requirements](https://www.facebook.com/help/instagram/1187859655048322/) and [commerce eligibility requirements](https://www.facebook.com/help/instagram/1627591223954487).

## 2. Current classification

The generator classifies each record in a fixed order so ambiguous vehicles receive only one primary category:

1. Heavy-duty truck or machinery
2. Truck
3. Pickup, including known pickup models such as Hilux, Ranger, Frontier, Navara, Silverado, F-150, Maverick, and D-Max
4. Commercial passenger vehicle, MPV, van, or bus
5. SUV or off-road vehicle
6. Passenger sedan or hatchback
7. Supercar, sports car, coupe, convertible, motorcycle, or other specialty vehicle

The order matters. For example, a Ford Ranger whose source body type says “SUV” is still categorized as a pickup, while a passenger van is commercial rather than machinery.

The published CSV is ordered for campaign priority, with every category kept separate: camiones pesados first, then camiones, camionetas/pickups, vans/autobuses, SUVs/todoterrenos, sedanes/hatchbacks, and specialty vehicles.

### Published category counts

| Product set | `custom_label_1` | Total | New | Used |
|---|---|---:|---:|---:|
| Camiones pesados | `priority_01_heavy_duty_trucks` | 20 | 5 | 15 |
| Camiones | `priority_02_trucks` | 73 | 5 | 68 |
| Camionetas y pickups | `priority_03_pickups` | 17 | 5 | 12 |
| Vans y autobuses | `priority_04_vans_buses` | 17 | 0 | 17 |
| SUVs y todoterrenos | `priority_05_suvs` | 542 | 100 | 442 |
| Sedanes y hatchbacks | `priority_06_passenger_cars` | 224 | 56 | 168 |
| Supercarros y deportivos | `priority_07_specialty` | 107 | 6 | 101 |

There are currently no approved motorcycle records in the selected 1,000-item feed. Do not create an empty motorcycle set. It will appear automatically as `category_motorcycle` when eligible inventory is available.

### Feed hierarchy

`product_type` is the customer-readable hierarchy:

```text
SUVs y todoterrenos > Toyota > RAV4 Hybrid
Camionetas y pickups > Ford > Ranger 2.3T
Sedanes y hatchbacks > BYD > Seal 06
Supercarros y deportivos > Porsche > 911 Carrera
```

Use `product_type` for browsing and collection presentation. Use custom labels for advertising filters because their values are stable and language-independent.

## 3. Custom-label design

| Field | Purpose | Values |
|---|---|---|
| `custom_label_0` | Customer-facing vehicle category | `Camiones pesados`, `Camiones`, `Camionetas y pickups`, `Vans y autobuses`, `SUVs y todoterrenos`, `Sedanes y hatchbacks`, `Supercarros y deportivos` |
| `custom_label_1` | Stable category priority | `priority_01_heavy_duty_trucks` through `priority_07_specialty` |
| `custom_label_2` | Condition | `condition_new`, `condition_used` |
| `custom_label_3` | Model-year band | `year_2025_plus`, `year_2023_2024`, `year_pre_2023`, `year_unknown` |
| `custom_label_4` | USD price band | `price_under_15000`, `price_15000_24999`, `price_25000_39999`, `price_40000_plus` |

Current year distribution:

- `year_2025_plus`: 393
- `year_2023_2024`: 585
- `year_pre_2023`: 8
- `year_unknown`: 14

Current price distribution:

- `price_under_15000`: 637
- `price_15000_24999`: 236
- `price_25000_39999`: 54
- `price_40000_plus`: 73

Brand is already a native feed field. Do not waste a custom label by repeating it. Trim/model is the second level of `product_type`; it should not occupy a custom label either.

## 4. Commerce Manager setup

Meta changes menu wording periodically, but the workflow remains Catalogue → Data sources → Data feed.

1. Open Commerce Manager and select the HainaAuto catalogue.
2. Confirm the catalogue belongs to the correct business portfolio and that the operator has full control.
3. Open **Data sources** or **Data sources → Data feeds**.
4. Choose **Add items**, **Data feed**, and **Use a URL** or **Scheduled feed**.
5. Enter `https://hainautocn.com/meta-catalog-venezuela.csv`.
6. No username or password is required.
7. Choose a daily schedule after the site's inventory deployment window. Recommended: 04:00 Venezuela time.
8. Set the default currency to USD if Meta asks. Do not convert the feed to VES; vehicle pricing and campaigns use USD.
9. Name the data source `HainaAuto Venezuela — ES-VE — Daily`.
10. Run the first upload and wait for processing to finish.
11. Open **Diagnostics** and resolve all errors before creating ads. Warnings about optional fields may be acceptable; missing IDs, links, images, prices, availability, or rejected items are not.

Do not upload the same feed as a second data source into the same catalogue. Duplicate sources can overwrite fields unpredictably even when item IDs match.

## 5. Product sets to create

Create these sets in **Catalogue → Sets**. Use the exact names and filters so campaign reporting remains understandable.

### Required foundation sets

| Set name | Filter |
|---|---|
| `VE — All inventory` | No filter; this feed contains Venezuela inventory only |
| `VE — New vehicles` | `custom_label_2 = condition_new` |
| `VE — Used vehicles` | `custom_label_2 = condition_used` |
| `VE — 01 Camiones pesados` | `custom_label_1 = priority_01_heavy_duty_trucks` |
| `VE — 02 Camiones` | `custom_label_1 = priority_02_trucks` |
| `VE — 03 Camionetas y pickups` | `custom_label_1 = priority_03_pickups` |
| `VE — 04 Vans y autobuses` | `custom_label_1 = priority_04_vans_buses` |
| `VE — 05 SUVs y todoterrenos` | `custom_label_1 = priority_05_suvs` |
| `VE — 06 Sedanes y hatchbacks` | `custom_label_1 = priority_06_passenger_cars` |
| `VE — 07 Especiales y deportivos` | `custom_label_1 = priority_07_specialty` |

### Recommended campaign sets

| Set name | Filters |
|---|---|
| `VE — Prioridad camiones pesados` | `custom_label_1 = priority_01_heavy_duty_trucks` |
| `VE — Prioridad camiones` | `custom_label_1 = priority_02_trucks` |
| `VE — Prioridad pickups` | `custom_label_1 = priority_03_pickups` |
| `VE — SUVs nuevos` | `custom_label_1 = priority_05_suvs` + `custom_label_2 = condition_new` |
| `VE — SUVs usados` | `custom_label_1 = priority_05_suvs` + `custom_label_2 = condition_used` |
| `VE — Sedanes nuevos` | `custom_label_1 = priority_06_passenger_cars` + `custom_label_2 = condition_new` |
| `VE — Sedanes usados` | `custom_label_1 = priority_06_passenger_cars` + `custom_label_2 = condition_used` |
| `VE — Under $15k` | `custom_label_4 = price_under_15000` |
| `VE — $15k–$24,999` | `custom_label_4 = price_15000_24999` |
| `VE — $25k–$39,999` | `custom_label_4 = price_25000_39999` |
| `VE — $40k+` | `custom_label_4 = price_40000_plus` |
| `VE — 2025+ models` | `custom_label_3 = year_2025_plus` |

Create brand sets only for brands receiving dedicated budget or creative. Filter the native `brand` field; do not create 37–40 brand sets merely because the feed contains those brands. Start with Toyota, Chery, BYD, Honda, Jetour, Geely, Nissan, Ford, Wuling, and Changan.

Avoid sets with fewer than roughly 10–20 active items unless the campaign is intentionally narrow. Very small dynamic sets reduce creative variety and can limit delivery.

## 6. Campaign structure

Use a simple structure first:

```text
Campaign: VE | Catalogue | Leads or Sales
├── Ad set: Camiones pesados
│   └── Product set: VE — 01 Camiones pesados
├── Ad set: Camiones
│   └── Product set: VE — 02 Camiones
├── Ad set: Camionetas y pickups
│   └── Product set: VE — 03 Camionetas y pickups
├── Ad set: SUVs
│   └── Product set: VE — 05 SUVs y todoterrenos
├── Ad set: Supercarros
│   └── Product set: VE — Supercarros y deportivos
└── Ad set: Value inventory
    └── Product set: VE — Under $15k
```

At campaign level select the objective appropriate to the actual funnel. At ad-set level select Venezuela as the location and the intended product set. At ad level verify the Spanish title, USD price, image crop, destination link, and call to action. Meta describes the campaign/ad-set/ad responsibility split in its official [Ads Manager setup guide](https://www.facebook.com/help/messenger-app/621956575422138/).

Do not mix heavy-duty trucks with passenger vehicles in the same ad set. Their audiences, pricing, imagery, and lead qualification are materially different. Keep supercars separate from value inventory for the same reason.

## 7. Spanish landing-page verification

Every feed link contains:

```text
?lang=es-VE&utm_source=meta&utm_medium=catalog&utm_campaign=venezuela
```

Before activating ads, click at least one item from every category and confirm:

- the link returns HTTP 200;
- the correct vehicle opens;
- the page switches to Spanish;
- the image loads;
- USD pricing is visible;
- quote and WhatsApp actions work;
- mobile layout does not cover the primary call to action.

Do not remove `lang=es-VE` or the UTM parameters from the generator.

## 8. Update and release procedure

Run this sequence after inventory changes:

```powershell
npm.cmd run data:catalog-feed:venezuela
npx.cmd eslint app/auto-translate.tsx proxy.ts
npm.cmd run build
```

The generator stops with an error if it finds duplicate/empty IDs, unavailable inventory, missing images, invalid prices, unapproved brands, invalid conditions, insecure URLs, or text exceeding Meta limits.

After validation:

1. Review the generated diff for `public/meta-catalog-venezuela.csv`.
2. Commit the generator and generated CSV together.
3. Deploy the website.
4. Confirm the public CSV URL returns HTTP 200.
5. Trigger **Request update now** in Commerce Manager, or wait for the scheduled fetch.
6. Review Diagnostics after processing.
7. Compare the processed item count with the generated count.

Never edit the generated CSV manually. Any manual correction will disappear on the next generation; fix the source data, alias map, eligibility rule, or classifier instead.

## 9. Final acceptance checklist

- [ ] Feed processes with zero critical errors.
- [ ] Processed count matches the generated count.
- [ ] No duplicate data source points to the same item IDs.
- [ ] All items are in `VE — All inventory`.
- [ ] Category-set totals add up to the full inventory total.
- [ ] New plus used totals equal the full inventory total.
- [ ] Prices display in USD.
- [ ] Spanish titles retain accents.
- [ ] No pseudo-brands or model names appear in the brand field.
- [ ] At least one landing page per category was tested on mobile.
- [ ] Unavailable stock disappears after the next scheduled update.
- [ ] Diagnostics and rejected items were reviewed before campaign launch.

If catalogue items are rejected or the Commerce Manager interface differs from this guide, use Commerce Manager's Help panel. Meta lists rejected items, shop inventory, technical issues, and review requests as supported Commerce Manager help topics in its official [support guidance](https://www.facebook.com/help/131834970288134).
