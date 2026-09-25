# Morrow

Static marketing site for Morrow, a (fictional) research-stage startup building longitudinal, within-person models of affect.

## Structure

```
site/
  index.html        homepage
  research.html     research notes (KaTeX via CDN)
  thanks.html       form fallback page
  404.html
  assets/styles.css
  assets/main.js    charts (seeded, rendered client-side), reveal, form
netlify.toml        publish = "site"
```

No build step. Preview locally with any static server:

```bash
npx serve site
```

## Deploy

Connect the repo in Netlify (publish directory is set in `netlify.toml`), or drag the `site/` folder into Netlify Drop.
The "Join research preview" form uses Netlify Forms (`research-preview`); submissions appear under Forms in the Netlify dashboard.

## Placeholders

Founder names on the homepage are placeholders (`Founder Name`). Investors and internal evaluation numbers are fictional.
