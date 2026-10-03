#!/usr/bin/env node
// Checks data.json against the rules documented in README.md and
// docs/CONTEXT.md before it ships — there's no staging step before Pages.
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TIERS = new Set(["international", "regional", "national", "subnational"]);
const SOURCES = new Set(["cpacc-outline", "primary"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

function validate(data, geometry) {
  const errors = [];
  const err = (msg) => errors.push(msg);

  for (const [key, inst] of Object.entries(data.instruments)) {
    if (!inst.name) err(`instruments.${key}: missing name`);
    if (!TIERS.has(inst.tier)) err(`instruments.${key}: invalid tier "${inst.tier}"`);
  }

  const today = new Date().toISOString().slice(0, 10);

  for (const [code, j] of Object.entries(data.jurisdictions)) {
    if (!j.name) err(`jurisdictions.${code}: missing name`);

    if (j.parent && !data.jurisdictions[j.parent]) {
      err(`jurisdictions.${code}: parent "${j.parent}" does not exist`);
    }
    if (j.shape && !geometry.shapes[j.shape]) {
      err(`jurisdictions.${code}: shape "${j.shape}" not in geometry.json`);
    }

    const seen = new Set();
    for (const a of j.applies || []) {
      const where = `jurisdictions.${code}.applies[${a.instrument}]`;

      if (!data.instruments[a.instrument]) {
        err(`${where}: unknown instrument`);
      }
      if (seen.has(a.instrument)) err(`${where}: duplicate entry for this instrument`);
      seen.add(a.instrument);

      if (!SOURCES.has(a.source)) err(`${where}: invalid source "${a.source}"`);

      if (!a.verifiedOn || !DATE_RE.test(a.verifiedOn)) {
        err(`${where}: verifiedOn missing or not YYYY-MM-DD`);
      } else if (a.verifiedOn > today) {
        err(`${where}: verifiedOn is in the future`);
      }

      if (a.source === "primary") {
        if (!a.sourceUrl) err(`${where}: source is "primary" but sourceUrl is missing`);
        if (!a.evidence) err(`${where}: source is "primary" but evidence is missing`);
      } else if (a.source === "cpacc-outline") {
        if (a.evidence) err(`${where}: evidence set but source is "cpacc-outline"`);
      }
    }
  }

  // parent chains must terminate — resolve() in app.js only guards this at
  // runtime, so catch a cycle here before it ships.
  for (const code of Object.keys(data.jurisdictions)) {
    const path = new Set();
    let cur = code;
    while (cur) {
      if (path.has(cur)) {
        err(`jurisdictions.${code}: parent cycle (${[...path, cur].join(" -> ")})`);
        break;
      }
      path.add(cur);
      cur = data.jurisdictions[cur] && data.jurisdictions[cur].parent;
    }
  }

  return errors;
}

function main() {
  const data = readJson("data.json");
  const geometry = readJson("geometry.json");
  const errors = validate(data, geometry);

  if (errors.length) {
    console.error(`data.json: ${errors.length} problem(s)\n`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log("data.json: OK");
}

main();
