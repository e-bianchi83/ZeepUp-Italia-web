# ZeepUp homepage

Responsive ZeepUp homepage concept with an interactive Milan restaurant map, app download links, FAQ content and responsive desktop/mobile layouts.

## Run locally

```bash
npm run dev
```

Then open `http://localhost:4173`.

## Project structure

- `index.html` — semantic page markup
- `assets/css/site.css` — site styles and responsive rules
- `assets/js/site.js` — carousel and interactive map behaviour
- `assets/data/shops-map-data.js` — restaurant marker data
- `assets/images/` — brand, hero, process and editorial imagery
- `assets/vendor/leaflet/` — pinned local Leaflet runtime and assets
- `server.js` — dependency-free local preview server
- `vercel.json` — static Vercel deployment configuration

The map uses OpenStreetMap/CARTO tiles and therefore requires an internet connection for its basemap.
