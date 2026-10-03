# Accessibility Legislation Map

Which legislation covers specific area in map. Seeded from the CPACC Content Outline, Domain III. **Not legal advice**, and coverage is partial by design.

## Running it

```bash
python3 -m http.server 8731
```

Then open `http://localhost:8731`. - Hard-refresh after each deploy; Pages caches assets.

**Updating the data later** is: edit `data.json`, `node scripts/validate-data.js`, commit, push. The live site should refresh with new data.

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
- **Both Ontario statutes were `cpacc-outline`, unverified against a primary source, until 2026-09-30.** e-Laws (`ontario.ca/laws/...`) requires JavaScript to render, with no server-rendered path, public API, or PDF export found anywhere on `ontario.ca`, the legacy `e-laws.gov.on.ca` domain, the Legislative Assembly's site, Ontario's official publishing site, or its open-data catalog — that route is still dead. CanLII's consolidated text is reachable only by a real, manually-authorized browser session (automated fetches are blocked there too), and that text confirms what secondary reporting had suggested: ODA 2001 was never actually repealed — AODA 2005's repeal of it takes effect only on a proclamation date that has never been set. Both entries are now `primary`, quoting the statute text itself. See [docs/plans/verify-cpacc-sources.md](docs/plans/verify-cpacc-sources.md), ADR-0011, and ADR-0014.

As of 2026-09-12, 17 of 19 entries in `data.json` were `primary` — see that plan for the full source-by-source record, including where an official site required a fallback (EUR-Lex, ACHPR, the US Code site, and Ontario's Legislative Assembly all block automated fetches; each was routed around except Ontario's own e-Laws, which has no working route at all).

As of 2026-09-13, the dataset covers 12 jurisdictions, 20 instruments, and 42 entries, of which 40 are `primary` — see [docs/plans/research-new-accessibility-legislation.md](docs/plans/research-new-accessibility-legislation.md) for the record of what was researched and added (Australia, Germany, India, Brazil, Japan, plus new instruments for the original seven jurisdictions), what was tried and left unresolved (France's Loi n° 2005-102, blocked by a Cloudflare challenge; India's Rights of Persons with Disabilities Act 2016, whose portal returned no fetchable statute text after seven distinct attempts), and [docs/research-log.md](docs/research-log.md) for every source URL checked along the way.

Also as of 2026-09-13, all five newly researched jurisdictions — Australia, Brazil, Germany, India, and Japan — are wired into the map itself (`shape` added, keyboard and contrast pass confirmed for each), bringing map coverage to 11 of the 12 jurisdictions in the dataset (Ontario has no shape of its own, same as always — it's reached only through Canada). India's outline carries a `note`: Natural Earth's boundary conventions around Jammu and Kashmir and Arunachal Pradesh stop short of India's full territorial claim in the north and follow India's line (not China's) in the northeast, so the panel says plainly that this reflects a cartographic convention, not a position on either dispute. Screen-reader confirmation for the new shapes is still Chris's to do — see the plan's Phase 2 Tracking table.

As of 2026-09-30, both Ontario entries (`oda2001`, `aoda2005`) moved from `cpacc-outline` to `primary`, verified against CanLII's consolidated text — see ADR-0014. All 42 entries in `data.json` are now `primary`. `scripts/validate-data.js` also landed this session, checking `data.json` for broken instrument/parent/shape references, missing `verifiedOn`/`evidence`, and parent-chain cycles before commit.

## Incomplete ##

This is an ongoing work. Unmarked countries means we have missing entries in the dataaset, never "no law". See it as continuing work to fill in the data. 