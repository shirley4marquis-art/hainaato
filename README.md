This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:


You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
## Meta Catalog Feeds

The global Meta feed is generated with `npm run data:catalog-feed`.
For Venezuelan buyers, generate the smaller Spanish-language feed with:

```bash
npm run data:catalog-feed:venezuela
```

This writes `public/meta-catalog-venezuela.csv`, capped at 1,000 available listings and organized primarily by vehicle trim/model. Brand remains available as supporting metadata, while category labels cover pickups, SUVs, passenger cars, superautos/deportivos, motorcycles, and machinery/trucks. Motorcycle records will appear automatically when motorcycle inventory is available. Point Meta Commerce Manager at `https://hainautocn.com/meta-catalog-venezuela.csv` and regenerate it after inventory data changes.

For the exact taxonomy, custom-label definitions, Commerce Manager product sets, campaign structure, and release checklist, follow [`docs/venezuela-meta-catalog-setup.md`](docs/venezuela-meta-catalog-setup.md).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
