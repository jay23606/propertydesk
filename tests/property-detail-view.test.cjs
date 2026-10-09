const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("property detail model selects only records linked to the requested property", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-details-model.js"),
      "utf8",
    ),
    context,
  );
  const property = { id: "property-1", address: "1 Oak St" };
  const account = {
    id: "account-1",
    property_id: property.id,
    status: "closed",
  };
  const document = { id: "doc-1", property_id: property.id };
  const state = {
    properties: [property],
    accounts: [account, { id: "elsewhere", property_id: "property-2" }],
    documents: [document, { id: "other-doc", property_id: "property-2" }],
    workspaceMembers: [{ member_user_id: "member-1" }],
    propertyHolders: [{ property_id: property.id, member_user_id: "member-1" }],
  };
  const model = context.window.PropertyDeskPropertyDetailsModel.create({
    getProperties: () => state.properties,
    getAccounts: () => state.accounts,
    getDocuments: () => state.documents,
    getWorkspaceMembers: () => state.workspaceMembers,
    getPropertyHolders: () => state.propertyHolders,
    propertyAddress: (value) => value.address,
  });

  const detailData = model.buildPropertyDetailData(property.id);
  assert.equal(detailData.property, property);
  assert.equal(detailData.propertyAddressText, property.address);
  assert.equal(detailData.hasActiveAccount, false);
  assert.equal(detailData.accounts.length, 1);
  assert.equal(detailData.accounts[0], account);
  assert.equal(detailData.propertyDocs.length, 1);
  assert.equal(detailData.propertyDocs[0], document);
  assert.equal(detailData.workspaceMembers, state.workspaceMembers);
  assert.equal(detailData.propertyHolders, state.propertyHolders);
  assert.equal(model.buildPropertyDetailData("missing"), null);
});

test("property and account detail modules expose separate workflows", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of ["property-details.js", "account-details.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }

  const property = context.window.PropertyDeskPropertyDetails.create({});
  const account = context.window.PropertyDeskAccountDetails.create({});
  assert.equal(typeof property.openPropertyDetails, "function");
  assert.equal(typeof account.openAccountDetails, "function");
});

test("opening a property delegates modal markup and preserves scoped details", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "property-documents-view.js",
    "property-details-account-table.js",
    "property-details-view.js",
    "property-details-model.js",
    "property-details.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const property = { id: "property-1", name: "<Oak House>", archived_at: null };
  const account = {
    id: "account-1",
    property_id: property.id,
    account_type: "note",
    status: "active",
    name: "<Private Note>",
    party_name: "Buyer",
    payment_amount: 500,
    payment_frequency: "monthly",
  };
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) {
      elements.set(id, { textContent: "", innerHTML: "", disabled: false });
    }
    return elements.get(id);
  };
  const opened = [];
  const activityCalls = [];
  const documentsView = context.window.PropertyDeskPropertyDocumentsView.create(
    {
      fmtDate: (value) => value,
      esc: (value) =>
        String(value ?? "")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;"),
    },
  );
  const detailsView = context.window.PropertyDeskPropertyDetailsView.create({
    money: (value) => `$${Number(value).toFixed(2)}`,
    fmtDate: (value) => value,
    esc: (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char],
      ),
    prettyType: (value) => value,
    paymentFrequencyLabel: () => "Monthly",
    propertyDocumentsHTML: documentsView.propertyDocumentsHTML,
    propertyAccountsHTML:
      context.window.PropertyDeskPropertyDetailsAccountTable.create({
        money: (value) => `$${Number(value).toFixed(2)}`,
        esc: (value) =>
          String(value ?? "").replace(
            /[&<>"']/g,
            (char) =>
              ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
              })[char],
          ),
        prettyType: (value) => value,
        paymentFrequencyLabel: () => "Monthly",
        accountBalance: () => 9000,
      }).propertyAccountsHTML,
  });
  const state = {
    auditRequestId: 0,
    selectedPropertyId: null,
    properties: [property],
    accounts: [account, { id: "elsewhere", property_id: "property-2" }],
    documents: [
      {
        id: "doc-1",
        property_id: property.id,
        file_name: "<agreement>.pdf",
        created_at: "2026-10-01",
        content_type: "application/pdf",
      },
      { id: "other-doc", property_id: "property-2", file_name: "other.pdf" },
    ],
    workspaceMembers: [
      { member_user_id: "member-1", display_name: "<Manager>" },
    ],
    propertyHolders: [{ property_id: property.id, member_user_id: "member-1" }],
  };
  const propertyAddress = () => "Oak House address";
  const { buildPropertyDetailData } =
    context.window.PropertyDeskPropertyDetailsModel.create({
      getProperties: () => state.properties,
      getAccounts: () => state.accounts,
      getDocuments: () => state.documents,
      getWorkspaceMembers: () => state.workspaceMembers,
      getPropertyHolders: () => state.propertyHolders,
      propertyAddress,
    });
  const feature = context.window.PropertyDeskPropertyDetails.create({
    $,
    state,
    buildPropertyDetailData,
    openModal: (id) => opened.push(id),
    renderPropertyActivity: (...args) => {
      activityCalls.push(args);
      return {
        incomeTotal: 600,
        expenseTotal: 75,
        html: "<section>Recent activity</section>",
      };
    },
    propertyDetailsHTML: detailsView.propertyDetailsHTML,
  });

  feature.openPropertyDetails(property.id);

  assert.equal(activityCalls.length, 1);
  assert.equal(activityCalls[0][0], property.id);
  assert.deepEqual(activityCalls[0][1], [account]);
  assert.equal(
    elements.get("property-detail-title").textContent,
    property.name,
  );
  assert.equal(
    elements.get("property-detail-address").textContent,
    "Oak House address",
  );
  assert.equal(elements.get("property-detail-add-income").disabled, false);
  assert.equal(
    elements.get("property-archive-toggle").textContent,
    "Archive property",
  );
  const html = elements.get("property-detail-content").innerHTML;
  assert.match(html, /&lt;Private Note&gt;/);
  assert.match(html, /&lt;Manager&gt;/);
  assert.match(html, /&lt;agreement&gt;\.pdf/);
  assert.match(html, /\$600\.00/);
  assert.match(html, /Recent activity/);
  assert.doesNotMatch(html, /other\.pdf/);
  assert.deepEqual(opened, ["property-detail-modal"]);
});

test("Properties table templates escape untrusted labels and render visible totals", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-status-utils.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-portfolio-table.js"),
      "utf8",
    ),
    context,
  );
  const escapeHTML = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const table = context.window.PropertyDeskPropertyPortfolioTable.create({
    esc: escapeHTML,
    money: (value) => `$${Number(value).toFixed(2)}`,
    paymentFrequencyLabel: () => "Monthly",
    isActiveAccount:
      context.window.PropertyDeskAccountStatusUtils.isActiveAccount,
  });

  assert.deepEqual(Object.keys(table).sort(), [
    "accountRowHTML",
    "emptyPropertyRowHTML",
    "totalsRowHTML",
  ]);
  const addressHTML = table.emptyPropertyRowHTML(
    { id: "<property>", notes: "<repair>" },
    "<10 Oak St>",
  );
  assert.match(addressHTML, /&lt;property&gt;/);
  assert.match(addressHTML, /&lt;repair&gt;/);
  assert.doesNotMatch(addressHTML, /<repair>/);

  const totalsHTML = table.totalsRowHTML({
    unpaidDue: 50,
    scheduledPayment: 125,
    loanBalance: 1000,
    loanCount: 1,
  });
  assert.match(totalsHTML, /\$50\.00/);
  assert.match(totalsHTML, /\$125\.00/);
  assert.match(totalsHTML, /\$1000\.00/);
});
