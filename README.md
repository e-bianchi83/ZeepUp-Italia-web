# ZeepUp website

Responsive ZeepUp Italia website with consumer, business, registration, event, referral, support and legal pages. It includes an interactive Milan restaurant map and shared responsive header and footer components.

## Run locally

```bash
npm run dev
```

Then open `http://localhost:4173`.

## Project structure

- `index.html` — consumer homepage
- `business-italia.html` — Italian business and HomeChef page
- `store-registration.html` — food-business and store registration page
- `home-chef-registration.html` — HomeChef registration page
- `corporate-dinner.html` — corporate dining and events page
- `faq-italia.html` — Italian FAQ and support page
- `vendor-Documentation.html` — vendor documentation page
- `scarica-app.html` — app download page
- `slowfood.html` — ZeepUp × Slow Food Italia page
- `referral-italia.html` — Italian referral page
- `privacy-policy-italia.html` — privacy policy
- `termini-e-condizioni*.html` — general, customer and vendor terms
- `Favicon.png` — shared browser favicon
- `assets/css/site.css` — homepage styles and responsive rules
- `assets/css/shared-header.css` — shared header positioning and responsive rules
- `assets/css/legal-pages.css` — shared legal-page styles
- `assets/js/site.js` — carousel and interactive map behaviour
- `assets/data/shops-map-data.js` — restaurant marker data
- `assets/images/` — shared brand, store, business and editorial imagery
- `assets/vendor/leaflet/` — pinned local Leaflet runtime and assets
- `server.js` — dependency-free local preview server
- `vercel.json` — static Vercel routes and deployment configuration

## Production routes

- `/` — consumer homepage
- `/business` — stable business-page URL
- `/business-italia` — Italian business-page alias
- `/store-registration` — food-business and store registration
- `/business-registration` — legacy alias for store registration
- `/home-chef-registration` — HomeChef registration
- `/homechef-registration` — legacy alias for HomeChef registration
- `/corporate-dinner` — corporate dining and events
- `/faq-italia` — Italian FAQ page
- `/vendor-documentation` — vendor documentation
- `/scarica-app` — app download page
- `/slowfood` — ZeepUp × Slow Food Italia page
- `/referral-italia` — Italian referral page
- `/privacy-policy-italia` — privacy policy
- `/privacy-policy-italia/accountrimuovi` — account removal instructions
- `/termini-e-condizioni` — general terms and conditions
- `/termini-e-condizioni/termini-e-condizioni-acquirenti` — customer terms and conditions
- `/termini-e-condizioni-venditori` — vendor terms and conditions

The map uses OpenStreetMap/CARTO tiles and therefore requires an internet connection for its basemap.
