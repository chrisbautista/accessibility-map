# Accessibility Legislation Map

Which legislation covers specific area in map. Seeded from the CPACC Content Outline, Domain III. **Not legal advice**, and coverage is partial by design.

## Running it

```bash
python3 -m http.server 8731
```

Then open `http://localhost:8731`. - Hard-refresh after each deploy; Pages caches assets.

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
- `verifiedOn` is when **this tool** last checked the claim .
- `shape` is an ISO 3166-1 numeric key into `geometry.json`. 
- `note` is optional prose shown in the panel, for outlines that surprise people — France carries one because its shape reaches into South America (French Guiana is one of its departments).
- `parent` nests a jurisdiction. Children inherit their ancestors' entries automatically


## Regenerating the basemap

The SVG map is derived from [Natural Earth](https://www.naturalearthdata.com/) 1:110m (public domain) via [world-atlas](https://github.com/topojson/world-atlas). 

## Deliberate omissions from the CPACC seed list

The outline names instruments but does not assert which countries they bind. 

- **United States → CRPD.** The US signed the CRPD but the Senate did not ratify it, so it is not recorded as applying.
- **United Kingdom → EU Charter of Fundamental Rights.** The Charter does not form part of UK domestic law after the Brexit transition period.
- **"Ontario's Disabilities Act 2001"** is recorded as the *Ontarians with Disabilities Act, 2001* (ODA). The better-known *Accessibility for Ontarians with Disabilities Act* is 2005 — a different statute, and a good first candidate to add.
- **Both Ontario statutes remain `cpacc-outline`, unverified against a primary source.** e-Laws (`ontario.ca/laws/...`) requires JavaScript to render, with no server-rendered path, public API, or PDF export found anywhere on `ontario.ca`, the legacy `e-laws.gov.on.ca` domain, the Legislative Assembly's site, Ontario's official publishing site, or its open-data catalog. Secondary reporting (Wikipedia, CanLII) suggests the older ODA 2001 was never actually repealed — AODA 2005's repeal of it takes effect only on a proclamation date that has never been set — but this tool doesn't record that as verified until it can quote the statute itself. See [docs/plans/verify-cpacc-sources.md](docs/plans/verify-cpacc-sources.md) and ADR-0011.

As of 2026-09-12, 17 of 19 entries in `data.json` are `primary` — see that plan for the full source-by-source record, including where an official site required a fallback (EUR-Lex, ACHPR, the US Code site, and Ontario's Legislative Assembly all block automated fetches; each was routed around except Ontario's own e-Laws, which has no working route at all).

## Incomplete ##

This is an ongoing work. Unmarked countries means we have missing entries in the dataaset, never "no law". See it as continuing work to fill in the data. 