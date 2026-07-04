# Pizza Button Simple

A simple GitHub Pages POC with one red button.

No Supabase. No IP tracking. No database.

## What it does

1. User taps the red button.
2. Browser asks for location permission.
3. App searches Google Places for nearby pizza restaurants.
4. App picks a strong option using:
   - Google rating
   - number of reviews
   - distance from the user
5. App shows the restaurant and a Google Maps link.

## Files

Upload these to GitHub Pages:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`

## Setup

Open the webpage, expand **Settings**, paste your Google Maps JavaScript API key, and save it on the device.

You need a Google Maps API key with:

- Maps JavaScript API enabled
- Places API enabled

For GitHub Pages, restrict the API key by HTTP referrer, for example:

```text
https://YOUR_GITHUB_USERNAME.github.io/*
```

## Local testing

Run:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Geolocation works on localhost or HTTPS.
