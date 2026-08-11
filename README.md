# Accessibility Legislation Map

Which legislation covers specific area in map. Seeded from the CPACC Content Outline, Domain III. **Not legal advice**, and coverage is partial by design.

## Running it

```bash
python3 -m http.server 8731
```

Then open `http://localhost:8731`. On GitHub Pages it works as-is: every path is relative, and `.nojekyll` stops Jekyll processing the site.

- The map renders. A "Could not load the dataset" message means `data.json` or `geometry.json` 404'd — almost always an absolute path (`/data.json`) instead of a relative one (`./data.json`).
- The page is not raw markdown or missing files — that means `.nojekyll` did not make it into the commit.
- Hard-refresh after each deploy; Pages caches assets.

**Updating the data later** is: edit `data.json`, validate, commit, push. The live site should refresh with new data.

## Files

| File | What it is |
|---|---|
| `data.json` | Instruments and jurisdictions. **The only file you edit routinely.** |
| `geometry.json` | Country paths, generated once. Never hand-edited. |
| `app.js` | Resolution, filter, panel, announcements. |
| `index.html`, `style.css` | Markup and styles. |


## Editing the dataset

```json
"CA": {
  "name": "Canada",
  "shape": "124",
  "applies": [
    { "instrument": "crpd", "source": "cpacc-outline", "verifiedOn": "2026-08-08" }
  ]
}
```

- `source` is `cpacc-outline` (transcribed, unchecked) or `primary` (checked against the statute or ratification record, and then `sourceUrl` is required).
- `verifiedOn` is when **this tool** last checked the claim — never when the law was enacted.
- `shape` is an ISO 3166-1 numeric key into `geometry.json`. Omit it for jurisdictions with no outline, like Ontario; they are reached through their parent's panel.
- `note` is optional prose shown in the panel, for outlines that surprise people — France carries one because its shape reaches into South America (French Guiana is one of its departments).
- `parent` nests a jurisdiction. Children inherit their ancestors' entries automatically

There is no build step and no validation on deploy: a malformed `data.json` goes straight to the public URL, where the page says it could not load rather than rendering an empty world. Checking it locally first is worth the two seconds:

```bash
node -e 'require("./data.json") && console.log("valid")'
```

## Regenerating the basemap

`geometry.json` is derived from [Natural Earth](https://www.naturalearthdata.com/) 1:110m (public domain) via [world-atlas](https://github.com/topojson/world-atlas), converted to equirectangular SVG paths. The converter lives outside this repo and is only needed if the basemap changes — which it essentially never does. Public-domain geometry is deliberate: the Wikipedia and amCharts world SVGs are CC-BY-SA or CC-BY, and share-alike on a published page is not an obligation to acquire by accident.

## Deliberate omissions from the CPACC seed list

The outline names instruments but does not assert which countries they bind. 

- **United States → CRPD.** The US signed the CRPD but the Senate did not ratify it, so it is not recorded as applying.
- **United Kingdom → EU Charter of Fundamental Rights.** The Charter does not form part of UK domestic law after the Brexit transition period.
- **"Ontario's Disabilities Act 2001"** is recorded as the *Ontarians with Disabilities Act, 2001* (ODA). The better-known *Accessibility for Ontarians with Disabilities Act* is 2005 — a different statute, and a good first candidate to add.

Absence is safe here by design: an unmarked country reads as "no entry in this dataset," never "no law." That property is load-bearing, not decorative
