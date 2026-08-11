// Accessibility Law World Map.

const state = { filter: "", selected: null };
let data, geometry;

const el = {
  coverage: document.getElementById("coverage"),
  filter: document.getElementById("filter"),
  status: document.getElementById("status"),
  map: document.getElementById("map"),
  panel: document.getElementById("panel"),
  panelBody: document.getElementById("panel-body"),
  rows: document.getElementById("rows"),
  emptyRows: document.getElementById("empty-rows"),
};

const TIER_ORDER = ["international", "regional", "national", "subnational"];

/* ---------------------------------------------------------------- load ---- */

// A malformed data.json is a *deployed* malformed dataset on Pages, with no
// staging step in between — so failure has to say so rather than render a blank
// world, which would read as "no law anywhere"
init();

async function init() {
  try {
    const [d, g] = await Promise.all([
      fetchJson("./data.json"),
      fetchJson("./geometry.json"),
    ]);
    data = d;
    geometry = g;
  } catch (err) {
    fail(err);
    return;
  }

  renderCoverage();
  renderMap();
  render();
  wireEvents();
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json(); // throws on malformed JSON, caught by init()
}

function fail(err) {
  el.coverage.textContent = "Could not load the dataset.";
  el.map.innerHTML =
    `<p class="error"><strong>Could not load the dataset.</strong> ` +
    `Nothing on this page is showing law data right now. ` +
    `Technical detail: ${escapeHtml(err.message)}</p>`;
  el.panelBody.innerHTML =
    `<p class="empty">Unavailable until the dataset loads.</p>`;
  // Hide every control and surface that would otherwise imply working data.
  for (const sel of [".controls", ".legend", ".table-section"]) {
    document.querySelector(sel).hidden = true;
  }
}

/* ------------------------------------------------------------ resolution -- */

// Own applicabilities plus every ancestor's, marked with where they came from.
// Nothing is duplicated into a child 
function resolve(code, seen = new Set()) {
  if (seen.has(code)) return []; // guards a malformed parent cycle
  seen.add(code);

  const j = data.jurisdictions[code];
  if (!j) return [];

  const own = (j.applies || []).map((a) => ({ ...a, via: null }));
  if (!j.parent) return own;

  const parent = data.jurisdictions[j.parent];
  const inherited = resolve(j.parent, seen).map((a) => ({
    ...a,
    via: a.via || (parent ? parent.name : j.parent),
  }));
  return [...own, ...inherited];
}

const childrenOf = (code) =>
  Object.entries(data.jurisdictions)
    .filter(([, j]) => j.parent === code)
    .map(([c, j]) => ({ code: c, name: j.name }));

const byTier = (a, b) =>
  TIER_ORDER.indexOf(data.instruments[a.instrument].tier) -
  TIER_ORDER.indexOf(data.instruments[b.instrument].tier);

/* ----------------------------------------------------------------- dates -- */

// report age - No threshold, no warning.
function age(iso) {
  const then = new Date(iso + "T00:00:00");
  const months =
    (new Date().getFullYear() - then.getFullYear()) * 12 +
    (new Date().getMonth() - then.getMonth());
  if (months < 1) return "this month";
  if (months === 1) return "1 month ago";
  if (months < 24) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

/* ------------------------------------------------------------------- map -- */

const SVG_NS = "http://www.w3.org/2000/svg";

function renderMap() {
  const covered = Object.entries(data.jurisdictions)
    .filter(([, j]) => j.shape && geometry.shapes[j.shape])
    .sort((a, b) => a[1].name.localeCompare(b[1].name)); // explicit, stable tab order

  const coveredShapes = new Set(covered.map(([, j]) => j.shape));

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${geometry.width} ${geometry.height}`);
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", "World map of covered jurisdictions");

  svg.appendChild(hatchPattern());

  // Every uncovered country as one inert path. Not focusable, not announced,
  // not clickable — geographic context only 
  const basemap = document.createElementNS(SVG_NS, "path");
  basemap.setAttribute("class", "basemap");
  basemap.setAttribute("aria-hidden", "true");
  basemap.setAttribute("fill", "url(#hatch)");
  basemap.setAttribute(
    "d",
    Object.entries(geometry.shapes)
      .filter(([id]) => !coveredShapes.has(id))
      .map(([, d]) => d)
      .join("")
  );
  svg.appendChild(basemap);

  for (const [code, j] of covered) {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "jur");
    g.setAttribute("role", "button");
    g.setAttribute("tabindex", "0");
    g.setAttribute("aria-pressed", "false");
    g.setAttribute("aria-label", j.name);
    g.dataset.code = code;

    // Halo sits under the fill so the focus ring reads as light-outside,
    // dark-inside on any ground.
    const halo = document.createElementNS(SVG_NS, "path");
    halo.setAttribute("class", "halo");
    halo.setAttribute("d", geometry.shapes[j.shape]);
    g.appendChild(halo);

    const fill = document.createElementNS(SVG_NS, "path");
    fill.setAttribute("class", "fill");
    fill.setAttribute("d", geometry.shapes[j.shape]);
    g.appendChild(fill);

    g.addEventListener("click", () => select(code));
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select(code);
      }
    });
    svg.appendChild(g);
  }

  el.map.replaceChildren(svg);
}

function hatchPattern() {
  const defs = document.createElementNS(SVG_NS, "defs");
  const pattern = document.createElementNS(SVG_NS, "pattern");
  pattern.setAttribute("id", "hatch");
  pattern.setAttribute("width", "6");
  pattern.setAttribute("height", "6");
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("patternTransform", "rotate(45)");
  const ground = document.createElementNS(SVG_NS, "rect");
  ground.setAttribute("width", "6");
  ground.setAttribute("height", "6");
  ground.setAttribute("class", "hatch-ground");
  pattern.appendChild(ground);
  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("y2", "6");
  line.setAttribute("class", "hatch-line");
  pattern.appendChild(line);
  defs.appendChild(pattern);
  return defs;
}

/* ---------------------------------------------------------------- render -- */

function renderCoverage() {
  const jCount = Object.keys(data.jurisdictions).length;
  const iCount = Object.keys(data.instruments).length;
  const total = Object.values(data.jurisdictions)
    .reduce((n, j) => n + (j.applies || []).length, 0);
  const verified = Object.values(data.jurisdictions)
    .flatMap((j) => j.applies || [])
    .filter((a) => a.source === "primary").length;

  el.coverage.textContent =
    `${jCount} jurisdictions · ${iCount} instruments · ${total} entries, ` +
    `of which ${verified} checked against a primary source.`;
}

const matches = (name) =>
  name.toLowerCase().includes(state.filter.trim().toLowerCase());

function render() {
  renderRows();
  renderPanel();
  syncMap();
}

function syncMap() {
  for (const g of el.map.querySelectorAll(".jur")) {
    const code = g.dataset.code;
    const shown = matches(data.jurisdictions[code].name);
    g.classList.toggle("dim", !shown);
    // Filtered-out shapes leave the tab order; opacity alone would be a
    // colour-only signal.
    g.setAttribute("tabindex", shown ? "0" : "-1");
    g.setAttribute("aria-hidden", shown ? "false" : "true");
    g.setAttribute("aria-pressed", String(state.selected === code));
  }
}

function renderRows() {
  const rows = [];
  for (const [code, j] of Object.entries(data.jurisdictions)) {
    if (!matches(j.name)) continue;
    for (const a of (j.applies || []).slice().sort(byTier)) {
      rows.push({ code, jurisdiction: j.name, ...a });
    }
  }

  el.rows.replaceChildren(
    ...rows.map((r) => {
      const inst = data.instruments[r.instrument];
      const tr = document.createElement("tr");
      tr.dataset.code = r.code;
      if (r.code === state.selected) tr.setAttribute("aria-current", "true");

      const th = document.createElement("th");
      th.scope = "row";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "row-select";
      btn.textContent = r.jurisdiction;
      btn.addEventListener("click", () => select(r.code));
      th.appendChild(btn);
      tr.appendChild(th);

      tr.appendChild(cell(tierChip(inst.tier)));
      tr.appendChild(cell(document.createTextNode(inst.name)));
      tr.appendChild(cell(sourceChip(r)));

      const verified = document.createElement("td");
      verified.className = "num";
      verified.append(
        Object.assign(document.createElement("time"), {
          dateTime: r.verifiedOn,
          textContent: r.verifiedOn,
        }),
        Object.assign(document.createElement("span"), {
          className: "age",
          textContent: age(r.verifiedOn),
        })
      );
      tr.appendChild(verified);
      return tr;
    })
  );

  el.emptyRows.hidden = rows.length > 0;
  return rows.length;
}

function cell(node) {
  const td = document.createElement("td");
  td.appendChild(node);
  return td;
}

function tierChip(tier) {
  const span = document.createElement("span");
  span.className = `chip tier tier-${tier}`;
  span.textContent = tier;
  return span;
}

function sourceChip(a) {
  if (a.source === "primary" && a.sourceUrl) {
    const link = document.createElement("a");
    link.className = "chip source verified";
    link.href = a.sourceUrl;
    link.rel = "noopener";
    link.textContent = "verified";
    link.append(
      Object.assign(document.createElement("span"), {
        className: "visually-hidden",
        textContent: ` — open the primary source for ${a.instrument}`,
      })
    );
    return link;
  }
  const span = document.createElement("span");
  span.className = "chip source outline";
  span.textContent = a.source === "primary" ? "verified" : "per CPACC outline";
  return span;
}

function renderPanel() {
  // The panel's own controls (Clear, and the links to child jurisdictions) are
  // destroyed by this re-render. 
  const hadFocusInPanel = el.panel.contains(document.activeElement);
  renderPanelBody();
  if (hadFocusInPanel && document.activeElement === document.body) {
    el.panel.focus();
  }
}

function renderPanelBody() {
  if (!state.selected) {
    el.panelBody.innerHTML =
      `<p class="empty">Select a jurisdiction on the map, or a row in the ` +
      `table, to see what applies there.</p>`;
    return;
  }

  const code = state.selected;
  const j = data.jurisdictions[code];
  const applicabilities = resolve(code).sort(byTier);

  const frag = document.createDocumentFragment();

  const head = document.createElement("div");
  head.className = "panel-head";
  head.innerHTML =
    `<h3>${escapeHtml(j.name)}</h3>` +
    `<button type="button" class="clear" id="clear">Clear<span class="visually-hidden"> selection</span></button>`;
  frag.appendChild(head);

  const list = document.createElement("ul");
  list.className = "instruments";
  for (const a of applicabilities) {
    const inst = data.instruments[a.instrument];
    const li = document.createElement("li");
    li.append(
      Object.assign(document.createElement("span"), {
        className: "instrument-name",
        textContent: inst.name,
      }),
      tierChip(inst.tier),
      sourceChip(a)
    );
    if (a.via) {
      li.append(
        Object.assign(document.createElement("span"), {
          className: "via",
          textContent: `via ${a.via}`,
        })
      );
    }
    li.append(
      Object.assign(document.createElement("span"), {
        className: "verified-on",
        textContent: `verified ${a.verifiedOn} · ${age(a.verifiedOn)}`,
      })
    );
    list.appendChild(li);
  }
  frag.appendChild(list);

  const kids = childrenOf(code);
  if (kids.length) {
    const wrap = document.createElement("div");
    wrap.className = "children";
    wrap.appendChild(
      Object.assign(document.createElement("h4"), {
        textContent: "Jurisdictions inside " + j.name,
      })
    );
    for (const kid of kids) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "child";
      btn.textContent = kid.name;
      btn.addEventListener("click", () => select(kid.code));
      wrap.appendChild(btn);
    }
    frag.appendChild(wrap);
  }

  if (!j.shape) {
    frag.appendChild(
      Object.assign(document.createElement("p"), {
        className: "note",
        textContent: "Not shown on the map — the basemap has country outlines only.",
      })
    );
  }

  // For jurisdictions whose outline surprises people, e.g. France reaching into
  // South America because French Guiana is one of its departments.
  if (j.note) {
    frag.appendChild(
      Object.assign(document.createElement("p"), {
        className: "note",
        textContent: j.note,
      })
    );
  }

  el.panelBody.replaceChildren(frag);
  // Clear removes its own button, so it hands focus back to the shape it came
  // from — the closest thing to an opener this non-modal panel has.
  document.getElementById("clear").addEventListener("click", () => {
    const previous = state.selected;
    state.selected = null;
    render();
    const shape = el.map.querySelector(`.jur[data-code="${previous}"]`);
    (shape && shape.getAttribute("tabindex") === "0" ? shape : el.filter).focus();
    announce("Selection cleared.");
  });
}

/* -------------------------------------------------------------- behaviour -- */

// selection announces itself and does not move focus.
function select(code) {
  state.selected = code;
  render();

  const applicabilities = resolve(code);
  const own = applicabilities.filter((a) => !a.via).length;
  const inherited = applicabilities.length - own;
  const j = data.jurisdictions[code];

  announce(
    `${j.name}. ${count(applicabilities.length, "instrument", "instruments")}` +
      (inherited ? `, ${inherited} inherited from ${j.parent ? data.jurisdictions[j.parent].name : "a parent"}` : "") +
      "."
  );
}

function announce(message) {
  el.status.textContent = message;
}

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function wireEvents() {
  el.filter.addEventListener("input", () => {
    const focused = document.activeElement;
    state.filter = el.filter.value;

    const shown = renderRows();
    renderPanel();
    syncMap();

    // If the focused shape just left the tab order, focus would fall to <body>
    // and a screen reader user would silently lose their place. Non-negotiable.
    if (
      focused &&
      focused.classList.contains("jur") &&
      focused.getAttribute("tabindex") === "-1"
    ) {
      el.filter.focus();
    }

    announce(
      state.filter.trim()
        ? `${count(shown, "entry", "entries")} for “${state.filter.trim()}”.`
        : `Filter cleared. ${count(shown, "entry", "entries")}.`
    );
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !state.selected) return;
    state.selected = null;
    render(); // focus deliberately stays put
    announce("Selection cleared.");
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
