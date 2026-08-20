# ZeepUp website

Static ZeepUp website for Italy and the United Kingdom. The repository includes public landing pages, registration forms, legal pages, shared assets, local preview tooling, Vercel routing, and Supabase database/function sources.

## Run locally

```bash
npm run dev
```

Then open `http://localhost:4173`.

## Project structure

```text
.
|-- assets/
|   |-- css/                  Shared styles
|   |-- data/                 Map and municipality datasets
|   |-- images/               Brand and page imagery
|   |-- js/                   Shared browser scripts
|   `-- vendor/               Pinned third-party browser assets
|-- it/                       Italian homepage
|-- uk/                       UK homepage and legal pages
|-- output/                   Public generated documents, including PDFs
|-- supabase/
|   |-- functions/            Supabase Edge Functions
|   `-- *.sql                 Database setup and migration scripts
|-- *.html                    Public extensionless Vercel pages
|-- middleware.ts             Country-routing middleware
|-- server.js                 Dependency-free local preview server
|-- sitemap.xml               Public sitemap
`-- vercel.json               Production routes and deployment configuration
```

Top-level HTML files intentionally remain at the repository root. Vercel uses `cleanUrls` so, for example, `store-registration.html` is served publicly as `/store-registration`.

## Shared assets

- `assets/images/brand/favicon.png` — shared browser favicon
- `assets/css/site.css` — Italian homepage styles and responsive rules
- `assets/css/shared-header.css` — shared header styles
- `assets/css/legal-pages.css` — shared legal-page styles
- `assets/js/site.js` — homepage interactions and map behaviour
- `assets/data/shops-map-data.js` — restaurant marker data
- `assets/data/italian-municipalities-by-region.js` — municipality picker data used by store registration
- `assets/data/italian-municipalities.json` — complete Italian municipality dataset
- `assets/vendor/leaflet/` — pinned Leaflet runtime and assets

## Main production routes

- `/it` — Italian homepage
- `/uk` — UK homepage
- `/business` — business and HomeChef page
- `/store-registration` — store registration
- `/business-registration` — legacy alias for store registration
- `/home-chef-registration` — HomeChef registration
- `/homechef-registration` — legacy alias for HomeChef registration
- `/corporate-dinner` — corporate dining and events
- `/faq-italia` — Italian FAQ
- `/vendor-documentation` — vendor documentation
- `/post-builder` — post builder
- `/scarica-app` — app download page
- `/slowfood` — ZeepUp × Slow Food Italia page
- `/referral-italia` — Italian referral page
- `/privacy-policy-italia` — Italian privacy policy
- `/privacy-policy-italia/accountrimuovi` — account removal instructions
- `/termini-e-condizioni` — terms and conditions hub
- `/termini-e-condizioni/termini-e-condizioni-acquirenti` — buyer terms
- `/termini-e-condizioni-venditori` — seller terms

The interactive map uses OpenStreetMap/CARTO tiles and requires an internet connection for its basemap.

## Local-only folders

The following folders are intentionally excluded from Git and production deployments:

- `.vscode/` — editor settings
- `.sync-backups/` — local safety copies
- `_archive/` — superseded files retained for reference
- `tmp/` — temporary working files
- `supabase/.temp/` — Supabase CLI cache
