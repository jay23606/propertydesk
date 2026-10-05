const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
test("navigation owns page routing and workspace settings navigation", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "navigation.js"), "utf8"),
    context,
  );
  const handlers = new Map();
  const classes = new Set();
  const makeElement = (id, dataset = {}) => ({
    id,
    dataset,
    textContent: "",
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(`${id}:${name}`);
        else classes.delete(`${id}:${name}`);
      },
    },
    addEventListener(name, handler) {
      handlers.set(`${id}:${name}`, handler);
    },
  });
  const propertiesPage = makeElement("page-properties");
  const workspacePage = makeElement("page-workspace");
  const reportsPage = makeElement("page-reports");
  const propertiesLink = makeElement("properties-link", { view: "properties" });
  const reportsLink = makeElement("reports-link", { view: "reports" });
  const workspaceLink = makeElement("workspace-link", { view: "workspace" });
  const gotoLink = makeElement("goto-link", { goto: "reports" });
  const userMenu = makeElement("user-menu");
  const selectors = {
    ".page": [propertiesPage, workspacePage, reportsPage],
    ".nav-link": [propertiesLink, reportsLink, workspaceLink],
    "[data-goto]": [gotoLink],
  };
  const documentRef = {
    querySelectorAll: (selector) => selectors[selector] || [],
  };
  const routes = [];
  const state = { view: "properties" };
  const crumb = { textContent: "" };
  const feature = context.window.PropertyDeskNavigation.create({
    $: (id) =>
      id === "page-crumb" ? crumb : id === "user-menu" ? userMenu : null,
    state,
    renderWorkspaceSettings: () => routes.push("workspace-settings"),
    documentRef,
    windowRef: { scrollTo: () => routes.push("scroll") },
  });

  feature.attachEvents();
  handlers.get("workspace-link:click")();
  assert.equal(state.view, "workspace");
  assert.equal(crumb.textContent, "Workspace");
  assert.ok(classes.has("page-properties:active") === false);
  assert.ok(classes.has("page-workspace:active"));
  assert.ok(classes.has("page-reports:active") === false);
  assert.ok(classes.has("workspace-link:active"));
  assert.deepEqual(routes.slice(0, 2), ["workspace-settings", "scroll"]);

  handlers.get("goto-link:click")();
  assert.equal(state.view, "reports");
  handlers.get("user-menu:click")();
  assert.equal(state.view, "workspace");
  assert.deepEqual(routes.slice(-2), ["workspace-settings", "scroll"]);
});


test("theme controller synchronizes toggles and persists theme changes", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "theme-controller.js"), "utf8"),
    context,
  );
  const handlers = new Map();
  const attributes = {};
  const labels = [];
  const icons = [];
  const makeToggle = (id) => ({
    setAttribute(name, value) {
      attributes[`${id}:${name}`] = value;
    },
    addEventListener(name, handler) {
      handlers.set(`${id}:${name}`, handler);
    },
    querySelector(selector) {
      return selector === ".theme-label"
        ? labels[id]
        : selector === ".theme-icon"
          ? icons[id]
          : null;
    },
  });
  const toggles = [makeToggle(0), makeToggle(1)];
  labels.push({ textContent: "" }, { textContent: "" });
  icons.push({ textContent: "" }, { textContent: "" });
  const meta = { setAttribute: (name, value) => (attributes[`meta:${name}`] = value) };
  const documentRef = {
    documentElement: { dataset: { theme: "dark" } },
    querySelector: (selector) => selector === 'meta[name="theme-color"]' ? meta : null,
    querySelectorAll: (selector) => selector === "[data-theme-toggle]" ? toggles : [],
  };
  const storageWrites = [];
  const theme = context.window.PropertyDeskTheme.create({
    documentRef,
    windowRef: {},
    storage: { setItem: (...args) => storageWrites.push(args) },
  });

  theme.attachEvents();
  assert.equal(attributes["0:aria-label"], "Switch to light mode");
  assert.equal(attributes["0:aria-pressed"], "true");
  assert.equal(labels[0].textContent, "Light mode");
  assert.equal(icons[0].textContent, "☼");
  assert.equal(attributes["meta:content"], "#151b17");

  handlers.get("0:click")();
  assert.equal(documentRef.documentElement.dataset.theme, "light");
  assert.equal(attributes["meta:content"], "#f6f7f4");
  assert.equal(attributes["1:aria-label"], "Switch to dark mode");
  assert.equal(labels[1].textContent, "Dark mode");
  assert.equal(icons[1].textContent, "☾");
  assert.deepEqual(storageWrites, [["propertydesk-theme", "light"]]);
});


test("navigation feature loads before app startup and is precached", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/navigation.js") < html.indexOf("app.js"),
    "navigation should load before the app coordinator",
  );
  assert.match(worker, /'\.\/features\/navigation\.js'/);
});


test("theme controller loads before app startup and is precached", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(html.indexOf("features/theme-controller.js") < html.indexOf("app.js"));
  assert.match(worker, /'\.\/features\/theme-controller\.js'/);
  assert.match(fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8"), /PropertyDeskAppShellWorkflow\.create/);
});


test("local browser scripts exist and are precached except runtime config", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const shellFiles = new Set(
    [...worker.matchAll(/['"]\.\/([^'"]+)['"]/g)].map((match) => match[1]),
  );
  assert.equal(shellFiles.has("config.js"), false, "runtime Supabase config should stay outside the cache");
  const localScripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)]
    .map((match) => match[1].split(/[?#]/, 1)[0])
    .filter((src) => src.endsWith(".js") && !/^https?:\/\//i.test(src));

  for (const src of localScripts) {
    if (src === "config.js") continue;
    assert.ok(fs.existsSync(path.join(root, src)), `${src} should exist`);
    assert.ok(shellFiles.has(src), `${src} should be precached`);
  }
});
