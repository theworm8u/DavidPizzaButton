# Pizza Button — GitHub Pages Fixed Version

No Supabase. No IP tracking. No database.

Upload these files directly to the root of your GitHub repo:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`

Do not upload the ZIP itself. Do not leave the files inside an extra folder unless GitHub Pages is configured to publish from that folder.

## Google setup

Your Google Maps API key needs:

- Maps JavaScript API enabled
- Places API enabled
- Billing enabled

For GitHub Pages, add HTTP referrers like:

```text
https://YOUR_USERNAME.github.io/*
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/*
```

## Local test

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```
