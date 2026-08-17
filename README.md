# ZeepUp website

Responsive ZeepUp website with a consumer homepage, an Italian business landing page, an interactive Milan restaurant map, app download links, FAQ content and responsive desktop/mobile layouts.

## Run locally

```bash
npm run dev
```

Then open `http://localhost:4173`.

## Project structure

- `index.html` — consumer homepage
- `business-italia.html` — Italian business and HomeChef page
- `faq-italia.html` — Italian FAQ and support page
- `assets/css/site.css` — homepage styles and responsive rules
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
- `/faq-italia` — Italian FAQ page

The map uses OpenStreetMap/CARTO tiles and therefore requires an internet connection for its basemap.
