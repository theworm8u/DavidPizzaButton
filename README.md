# Pizza Button — No API Key Version

This is the simplest GitHub Pages version.

No Supabase.  
No IP tracking.  
No Google API key.  
No backend required.

## What it does

1. User taps the red button.
2. Browser asks for location permission.
3. App searches OpenStreetMap data through the public Overpass API.
4. App returns the closest pizza place found.
5. App also provides a Google Maps search link for nearby/best-rated pizza.

## Important limitation

Without a Google Places API key, the app cannot directly read Google ratings or pick the official "best rated" Google result.

This version returns the closest pizza place from OpenStreetMap data. The Google Maps link is included so the user can quickly see Google-rated options.

## Deploy to GitHub Pages

Upload these files directly to the root of your GitHub repo:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`

Then enable GitHub Pages from the repo settings.

## Local test

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Geolocation works on localhost or HTTPS.
