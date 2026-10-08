const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("service worker caches a cloned shell response within the fetch lifetime", async () => {
  let fetchHandler;
  let eventDispatchFinished = false;
  let waitUntilPromise;
  let responsePromise;
  let cachedBody = "";
  let cachedKey;
  let fetchedURL;
  const self = {
    registration: { scope: "https://propertydesk.test/" },
    location: { origin: "https://propertydesk.test" },
    addEventListener(type, handler) {
      if (type === "fetch") fetchHandler = handler;
    },
  };
  const caches = {
    async open() {
      return {
        async put(key, response) {
          cachedKey = key.url || key;
          cachedBody = await response.text();
        },
      };
    },
    async match() {
      return null;
    },
  };
  const context = vm.createContext({
    self,
    caches,
    URL,
    Response,
    fetch: async (request) => {
      fetchedURL = request.url || request;
      return new Response("shell asset");
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8"),
    context,
  );

  fetchHandler({
    request: {
      method: "GET",
      mode: "cors",
      url: "https://propertydesk.test/app.js?v=feature-modules-r23",
    },
    waitUntil(promise) {
      assert.equal(
        eventDispatchFinished,
        false,
        "waitUntil must be called during fetch dispatch",
      );
      waitUntilPromise = promise;
    },
    respondWith(promise) {
      responsePromise = promise;
    },
  });
  eventDispatchFinished = true;

  const response = await responsePromise;
  await waitUntilPromise;
  assert.equal(await response.text(), "shell asset");
  assert.equal(cachedBody, "shell asset");
  assert.equal(cachedKey, "https://propertydesk.test/app.js");
  assert.equal(
    fetchedURL,
    "https://propertydesk.test/app.js?v=feature-modules-r23",
  );
});

test("versioned shell assets fall back to their canonical precache entry offline", async () => {
  let fetchHandler;
  let responsePromise;
  let matchedKey;
  const self = {
    registration: { scope: "https://propertydesk.test/" },
    location: { origin: "https://propertydesk.test" },
    addEventListener(type, handler) {
      if (type === "fetch") fetchHandler = handler;
    },
  };
  const caches = {
    async open() {
      return { async put() {} };
    },
    async match(key) {
      matchedKey = key;
      return new Response("cached shell asset");
    },
  };
  const context = vm.createContext({
    self,
    caches,
    URL,
    Response,
    fetch: async () => {
      throw new Error("offline");
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8"),
    context,
  );

  fetchHandler({
    request: {
      method: "GET",
      mode: "cors",
      url: "https://propertydesk.test/app.js?v=feature-modules-r23",
    },
    waitUntil() {},
    respondWith(promise) {
      responsePromise = promise;
    },
  });

  assert.equal(await (await responsePromise).text(), "cached shell asset");
  assert.equal(matchedKey, "https://propertydesk.test/app.js");
});

test("service worker ignores config, workspace data, and cross-origin requests", () => {
  let fetchHandler;
  const self = {
    registration: { scope: "https://propertydesk.test/" },
    location: { origin: "https://propertydesk.test" },
    addEventListener(type, handler) {
      if (type === "fetch") fetchHandler = handler;
    },
  };
  const context = vm.createContext({
    self,
    caches: {},
    URL,
    Response,
    fetch: async () => new Response("should not fetch"),
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8"),
    context,
  );

  for (const url of [
    "https://propertydesk.test/config.js?v=public-config",
    "https://propertydesk.test/rest/v1/pd_properties",
    "https://project.supabase.co/auth/v1/user",
  ]) {
    let intercepted = false;
    fetchHandler({
      request: { method: "GET", mode: "cors", url },
      waitUntil() {
        intercepted = true;
      },
      respondWith() {
        intercepted = true;
      },
    });
    assert.equal(
      intercepted,
      false,
      `${url} must stay outside the shell cache`,
    );
  }
});

test("service worker falls back to the cached app shell for offline navigation", async () => {
  let fetchHandler;
  let responsePromise;
  let matchedKey;
  const self = {
    registration: { scope: "https://propertydesk.test/" },
    location: { origin: "https://propertydesk.test" },
    addEventListener(type, handler) {
      if (type === "fetch") fetchHandler = handler;
    },
  };
  const caches = {
    async open() {
      return { async put() {} };
    },
    async match(key) {
      matchedKey = key;
      return new Response("cached offline app shell");
    },
  };
  const context = vm.createContext({
    self,
    caches,
    URL,
    Response,
    fetch: async () => {
      throw new Error("offline");
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8"),
    context,
  );

  fetchHandler({
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://propertydesk.test/",
    },
    respondWith(promise) {
      responsePromise = promise;
    },
  });

  const response = await responsePromise;
  assert.equal(matchedKey, "./index.html");
  assert.equal(await response.text(), "cached offline app shell");
});
