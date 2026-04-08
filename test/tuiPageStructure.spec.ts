/**
 * TUI page structure tests — cycle 0013.
 *
 * Verify that the app frame migration produces per-page modules
 * with independent models, updates, and keymaps.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PAGES_DIR = path.join(ROOT, "src", "tui", "pages");
const MAIN_PATH = path.join(ROOT, "src", "tui", "main.ts");

// ─── Agent PQ 1: Each page has its own init, update, keyMap

test("pages directory exists with per-page modules", () => {
  assert.ok(fs.existsSync(PAGES_DIR), "src/tui/pages/ should exist");
  const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith(".ts"));
  assert.ok(files.length >= 4, `Expected at least 4 page files, got ${String(files.length)}`);
});

test("connectPage exports page definition", async () => {
  const mod = await import("../src/tui/pages/connectPage.ts");
  assert.ok("connectPage" in mod, "Should export connectPage");
});

test("navigatorPage exports page definition", async () => {
  const mod = await import("../src/tui/pages/navigatorPage.ts");
  assert.ok("navigatorPage" in mod, "Should export navigatorPage");
});

test("worldlinePage exports page definition", async () => {
  const mod = await import("../src/tui/pages/worldlinePage.ts");
  assert.ok("worldlinePage" in mod, "Should export worldlinePage");
});

test("inspectorPage exports page definition", async () => {
  const mod = await import("../src/tui/pages/inspectorPage.ts");
  assert.ok("inspectorPage" in mod, "Should export inspectorPage");
});

// ─── Agent PQ 2: Global model eliminated

test("main.ts does not export a monolithic Model interface", () => {
  const content = fs.readFileSync(MAIN_PATH, "utf-8");
  assert.ok(
    !content.includes("interface Model {"),
    "main.ts should not contain the monolithic Model interface",
  );
});

test("main.ts does not contain updateAllPages", () => {
  const content = fs.readFileSync(MAIN_PATH, "utf-8");
  assert.ok(
    !content.includes("updateAllPages"),
    "main.ts should not contain the updateAllPages pattern",
  );
});

// ─── Agent PQ 3: Domain logic vs framework plumbing by file boundary

test("main.ts is under 120 lines", () => {
  const content = fs.readFileSync(MAIN_PATH, "utf-8");
  const lineCount = content.split("\n").length;
  assert.ok(
    lineCount <= 120,
    `main.ts should be under 120 lines (app shell only), got ${String(lineCount)}`,
  );
});

// ─── User PQ 1-3: Framework features enabled

test("app frame enables command palette", () => {
  const content = fs.readFileSync(MAIN_PATH, "utf-8");
  assert.ok(
    content.includes("enableCommandPalette"),
    "App frame should enable command palette",
  );
});
