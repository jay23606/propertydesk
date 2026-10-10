const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("account records and ledger entries use separate workspace workflows", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const appServices = fs.readFileSync(
    path.join(__dirname, "..", "features", "app-services.js"),
    "utf8",
  );
  const appServiceCatalog = fs.readFileSync(
    path.join(__dirname, "..", "features", "app-service-module-catalog.js"),
    "utf8",
  );
  const transactionComposition = fs.readFileSync(
    path.join(__dirname, "..", "features", "transaction-workspace-workflow.js"),
    "utf8",
  );
  const transactionSetup = fs.readFileSync(
    path.join(__dirname, "..", "features", "transaction-workspace-setup.js"),
    "utf8",
  );
  const accountDepositContextSetup = fs.readFileSync(
    path.join(__dirname, "..", "features", "account-deposit-context-setup.js"),
    "utf8",
  );

  assert.match(
    app,
    /PropertyDeskAppServices\.create\(\{[\s\S]*?modules: window\.PropertyDeskAppServiceModuleCatalog\.create\(\)/,
  );
  assert.match(
    appServiceCatalog,
    /workspaceRuntime: \{[\s\S]*?factory: window\.PropertyDeskWorkspaceRuntime[\s\S]*?repositories: \{[\s\S]*?transactions: window\.PropertyDeskTransactionRepository/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:Notifications|WorkspaceRuntime|WorkspaceFinancialContext|WorkspaceDepositContext)\.create\(/,
  );
  assert.match(
    appServices,
    /modules\.workspaceRuntime\.factory\.create\(\{[\s\S]*?repositories: modules\.workspaceRuntime\.repositories,[\s\S]*?workflows: modules\.workspaceRuntime\.workflows,/,
  );
  assert.match(appServices, /modules\.financialContext\.factory\.create\(/);
  assert.match(appServices, /modules\.depositContext\.factory\.create\(/);
  assert.match(
    app,
    /PropertyDeskFormOptions\.create\(\{[\s\S]*?modules: \{\s*domainOptions: window\.PropertyDeskDomainOptions,\s*transactionOptions: window\.PropertyDeskTransactionOptions,/,
  );
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace-runtime.js"),
      "utf8",
    ),
    /window\.PropertyDesk[A-Za-z]+\.create\(/,
  );
  assert.match(app, /PropertyDeskTransactionWorkspaceSetup\.create\(/);
  assert.match(
    transactionComposition,
    /workflows: \{ maintenance: transactionMaintenance, ledger: ledgerWorkflows \}/,
  );
  assert.doesNotMatch(app, /PropertyDeskLedgerEntryForms\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskTransactionViews\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDeskTransactionMaintenanceWorkflow\.create/,
  );
  assert.doesNotMatch(app, /PropertyDeskRecordEntryWorkflow\.create\(/);
  assert.match(app, /PropertyDeskAccountDepositWorkspaceSetup\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:DepositWorkspace|AccountDetailWorkspace)Workflow\.create\(/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDeskAccountDetail(?:Content|Action)Workflow\.create\(/,
  );
  assert.match(
    accountDepositContextSetup,
    /accountHistoryRepository: services\.accountHistoryRepository/,
  );
  assert.match(app, /PropertyDeskReportWorkspaceSetup\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDeskReport(?:Model|Views|Export)\.create\(/,
  );
  assert.match(
    app,
    /registerShell: \(\) =>\s*window\.PropertyDeskPwa\.registerShell\(\{\s*navigatorRef: window\.navigator,\s*windowRef: window,\s*logger: window\.console,/,
  );
  assert.match(app, /attachCreateActionEvents/);
  assert.match(
    app,
    /openAccountForProperty: propertyAccountForms\.openAccountForProperty/,
  );
  assert.doesNotMatch(app, /transactionMaintenance\.createActionHandlers\(/);
  assert.doesNotMatch(app, /entryWorkflow\./);
  assert.match(
    app,
    /attachAccountDetailActionEvents,\s*attachDepositAdjustmentEvents,/,
  );
  const ledgerEntryForms = fs.readFileSync(
    path.join(__dirname, "..", "features", "ledger-entry-forms.js"),
    "utf8",
  );
  assert.match(app, /PropertyDeskPropertyAccountFormsSetup\.create\(/);
  const propertyAccountForms = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "features",
      "property-account-forms-workflow.js",
    ),
    "utf8",
  );
  const propertyAccountFormsSetup = fs.readFileSync(
    path.join(__dirname, "..", "features", "property-account-forms-setup.js"),
    "utf8",
  );
  assert.match(
    propertyAccountForms,
    /workflows\.propertyForm\.create\(\{[\s\S]*?repository: property\.repository,/,
  );
  assert.match(
    propertyAccountForms,
    /workflows\.accountForm\.create\(\{[\s\S]*?repository: account\.repository,/,
  );
  assert.match(ledgerEntryForms, /attachLedgerEntryFormEvents/);
  assert.match(app, /accountRepository: repositories\.accounts/);
  assert.match(app, /propertyRepository: repositories\.properties/);
  assert.match(
    propertyAccountFormsSetup,
    /buildAccountPayload: workflows\.accountPayload\.build/,
  );
  assert.match(
    propertyAccountFormsSetup,
    /formModel: workflows\.accountFormModel\.create\([\s\S]*?workflows\.emailAddressUtils,/,
  );
  assert.match(app, /transactionRepository: repositories\.transactions/);
  assert.match(
    transactionSetup,
    /transactionPayloads: workflows\.transactionPayloads/,
  );
  assert.match(app, /PropertyDeskCreateActions\.create\(/);
  assert.match(app, /PropertyDeskTransactionWorkspaceSetup\.create\(/);
  assert.match(
    transactionComposition,
    /ledgerWorkflows\.workflow\.create\(\{[\s\S]*?entries: \{[\s\S]*?transactionRepository: \{\s*insertPayment: services\.transactionRepository\.insertPayment,\s*insertExpense: services\.transactionRepository\.insertExpense,\s*\},[\s\S]*?transactionPayloads: ledgerWorkflows\.transactionPayloads/,
  );
  assert.match(
    transactionComposition,
    /ledgerWorkflows\.workflow\.create\(\{[\s\S]*?views: \{[\s\S]*?sumOperatingExpenses: services\.sumOperatingExpenses/,
  );
  const ledgerWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "ledger-workflow.js"),
    "utf8",
  );
  assert.match(
    ledgerWorkflow,
    /workflows\.entryForms\.create\([\s\S]*?saveCorrection,/,
  );
  assert.match(
    ledgerWorkflow,
    /workflows\.views\.create\(\{[\s\S]*?sumOperatingExpenses,/,
  );
  assert.match(
    ledgerWorkflow,
    /createTransactionActionHandlers\(\{[\s\S]*?openPayment: ledgerEntryForms\.openPayment/,
  );
  assert.doesNotMatch(app, /PropertyDeskEntryWorkflow/);
});

test("app coordinator passes the amortization helper into account details", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const appServiceCatalog = fs.readFileSync(
    path.join(__dirname, "..", "features", "app-service-module-catalog.js"),
    "utf8",
  );
  const transactionComposition = fs.readFileSync(
    path.join(__dirname, "..", "features", "transaction-workspace-workflow.js"),
    "utf8",
  );
  const accountDepositContextSetup = fs.readFileSync(
    path.join(__dirname, "..", "features", "account-deposit-context-setup.js"),
    "utf8",
  );
  const appServices = fs.readFileSync(
    path.join(__dirname, "..", "features", "app-services.js"),
    "utf8",
  );
  assert.match(appServices, /modules\.financialContext\.factory\.create\(/);
  assert.match(appServiceCatalog, /window\.PropertyDeskPostedLedgerUtils/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:ScheduleUtils|LoanAmortizationUtils|DepositLedgerUtils)\.create\(/,
  );
  const financialWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "workspace-financial-context.js"),
    "utf8",
  );
  assert.match(
    appServiceCatalog,
    /workflows: \{\s*schedule: window\.PropertyDeskScheduleUtils,[\s\S]*?accountSummary: window\.PropertyDeskAccountFinancialSummary,/,
  );
  assert.match(financialWorkflow, /workflows\.loanSchedule\.create\(/);
  assert.match(financialWorkflow, /workflows\.schedule\.create\(/);
  assert.doesNotMatch(
    financialWorkflow,
    /window\.PropertyDesk[A-Za-z]+\.create\(/,
  );
  assert.doesNotMatch(
    financialWorkflow,
    /PropertyDeskDepositLedgerUtils\.create\(/,
  );
  assert.match(appServices, /modules\.depositContext\.factory\.create\(/);
  assert.match(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace-deposit-context.js"),
      "utf8",
    ),
    /workflows\.depositLedger\.create\([\s\S]*?workflows\.depositContext\.create\(/,
  );
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace-deposit-context.js"),
      "utf8",
    ),
    /window\.PropertyDesk[A-Za-z]+\.create\(/,
  );
  assert.match(app, /PropertyDeskAccountDepositWorkspaceSetup\.create/);
  assert.match(
    accountDepositContextSetup,
    /actions: \{[\s\S]*?repository: \{ close: services\.accountRepository\.close/,
  );
  assert.match(app, /amortizationSchedule,/);
  assert.match(app, /PropertyDeskPropertyWorkspaceSetup\.create\(/);
  assert.match(
    app,
    /workflows: window\.PropertyDeskPropertyAccountFormsModuleCatalog\.create\(\)/,
  );
  const formCatalog = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "features",
      "property-account-forms-module-catalog.js",
    ),
    "utf8",
  );
  assert.match(
    formCatalog,
    /propertyFormModules: \{\s*view: window\.PropertyDeskPropertyFormView,[\s\S]*?recordSaveMaintenance:\s*window\.PropertyDeskWorkspaceRecordSaveMaintenance,[\s\S]*?accountFormModules: \{\s*view: window\.PropertyDeskAccountFormView,[\s\S]*?recordSaveMaintenance:\s*window\.PropertyDeskWorkspaceRecordSaveMaintenance,/,
  );
  for (const filename of ["property-form.js", "account-form.js"]) {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "features", filename),
      "utf8",
    );
    assert.doesNotMatch(source, /window\.PropertyDesk[A-Za-z]+\.create\(/);
  }
  assert.match(
    financialWorkflow,
    /workflows\.accountFinancialContext\.create\(/,
  );
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-account-financial-context.js",
      ),
      "utf8",
    ),
    /window\.PropertyDesk[A-Za-z]+\.create\(/,
  );
  assert.doesNotMatch(
    financialWorkflow,
    /PropertyDeskDepositContext\.create\(/,
  );
  assert.match(appServices, /modules\.depositContext\.factory\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskOverviewWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskPropertyPortfolioWorkflow\.create\(/);
  assert.match(app, /attachPropertyGridEvents,\s*attachPropertyActionEvents,/);
  assert.doesNotMatch(app, /PropertyDeskPropertyScreenWorkflow\.create\(/);
  assert.match(app, /attachPropertyHolderEvents/);
  assert.match(app, /attachPropertyDetailEvents/);
  assert.match(app, /attachPropertyQuickActionEvents/);
  assert.match(app, /PropertyDeskPropertyWorkspaceSetup\.create\(/);
  assert.doesNotMatch(app, /attachPropertyViewEvents/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:PropertyQuickNote|PropertyManagement)\.create/,
  );
  assert.match(app, /PropertyDeskTransactionWorkspaceSetup\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskRecordEntryWorkflow\.create\(/);
  const ledgerWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "ledger-workflow.js"),
    "utf8",
  );
  assert.match(
    ledgerWorkflow,
    /workflows\.views\.create\(\{[\s\S]*?sumOperatingExpenses,/,
  );
  assert.doesNotMatch(app, /transactionMaintenance\.createActionHandlers\(/);
  assert.doesNotMatch(
    app,
    /window\.PropertyDeskAccountFormMaintenance\.create\(/,
  );
  assert.match(app, /PropertyDeskAccountDepositWorkspaceSetup\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskRecordMaintenance/);
  for (const filename of ["payment-entry-form.js", "expense-entry-form.js"]) {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "features", filename),
      "utf8",
    );
    assert.doesNotMatch(source, /pd_correct_transaction/);
  }
  assert.match(app, /PropertyDeskTransactionWorkspaceSetup\.create/);
  assert.match(app, /PropertyDeskAccountDepositWorkspaceSetup\.create/);
  assert.match(
    transactionComposition,
    /workflows: \{ maintenance: transactionMaintenance, ledger: ledgerWorkflows \}/,
  );
});

test("property workspace composes screens and shares detail actions", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const workflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "property-workspace-workflow.js"),
    "utf8",
  );
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  const creationOrder = [
    "const propertyDetails = detail.workflows.screen.create({",
    "const propertyOverview = workflows.overview.create({",
    "const properties = workflows.portfolio.create({",
  ].map((marker) => workflow.indexOf(marker));

  assert.ok(creationOrder.every((position) => position >= 0));
  assert.ok(creationOrder[0] < creationOrder[1]);
  assert.ok(creationOrder[1] < creationOrder[2]);
  assert.match(
    workflow,
    /openPropertyDetails: propertyDetails\.openPropertyDetails/,
  );
  assert.match(
    workflow,
    /content: detail\.content,[\s\S]*?workflows: \{[\s\S]*?contentModules: detail\.workflows\.contentModules,/,
  );
  assert.match(workflow, /workflows\.overview\.create\(\{\s*\$: overview\.\$/);
  assert.match(
    workflow,
    /workflows\.portfolio\.create\(\{\s*\$: portfolio\.\$/,
  );
  assert.doesNotMatch(workflow, /\.\.\.detail|\.\.\.overview|\.\.\.portfolio/);
  for (const script of [
    "features/property-detail-content-workflow.js",
    "features/property-detail-management-workflow.js",
    "features/property-screen-workflow.js",
    "features/property-workspace-workflow.js",
    "features/property-workspace-setup.js",
    "features/reminder-preview-setup.js",
    "features/import-workspace-setup.js",
    "features/backup-workspace-setup.js",
    "features/report-workspace-setup.js",
    "features/overview-property-summary-model.js",
    "features/overview-model.js",
    "features/overview-view.js",
    "features/overview.js",
    "features/overview-events.js",
    "features/overview-workflow.js",
    "features/property-portfolio-table.js",
    "features/property-portfolio-account-row-model.js",
    "features/property-portfolio-model.js",
    "features/property-views.js",
    "features/property-view-events.js",
    "features/property-quick-note.js",
    "features/property-portfolio-workflow.js",
  ]) {
    assert.ok(
      html.indexOf(script) >= 0 &&
        html.indexOf(script) < html.indexOf("app.js"),
      `${script} loads before the app composition root`,
    );
    assert.match(worker, new RegExp(`'\\./${script.replaceAll("/", "\\/")}'`));
  }
  assert.match(app, /PropertyDeskPropertyWorkspaceSetup\.create\(/);
  assert.ok(
    html.indexOf("features/property-workspace-setup.js") <
      html.indexOf("app.js"),
  );
  assert.match(worker, /\.\/features\/property-workspace-setup\.js/);
  assert.ok(
    app.indexOf("PropertyDeskAccountDepositWorkspaceSetup.create(") <
      app.indexOf("PropertyDeskPropertyWorkspaceSetup.create("),
  );
});

test("app passes reminder services into the app-shell coordinator", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const setup = fs.readFileSync(
    path.join(__dirname, "..", "features", "app-shell-setup.js"),
    "utf8",
  );
  assert.match(
    app,
    /PropertyDeskAppShellSetup\.create\(\{[\s\S]*?reminder: \{[\s\S]*?fmtDate,[\s\S]*?money,[\s\S]*?\},[\s\S]*?memberRepository:/,
  );
  assert.match(setup, /reminder: ui\.reminder/);
  assert.match(
    setup,
    /memberRepository: \{\s*addMember: services\.memberRepository\.addMember,\s*removeMember: services\.memberRepository\.removeMember,/,
  );
  assert.match(setup, /workspaceWorkflow: workflows\.workspace/);
  assert.match(
    app,
    /PropertyDeskReminderPreviewSetup\.create\(\{[\s\S]*?records: stateAccess\.reminderPreview,[\s\S]*?openModal: modal\.openModal,/,
  );
  assert.doesNotMatch(app, /PropertyDeskWorkspaceReminderWorkflow\.create\(/);
  assert.match(app, /previewReminderEmail,/);
  assert.match(app, /memberRepository: repositories\.workspaceMembers/);
});

test("app root composes shared state and workspace services directly", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const appServices = fs.readFileSync(
    path.join(__dirname, "..", "features", "app-services.js"),
    "utf8",
  );
  assert.match(appServices, /modules\.workspaceRuntime\.factory\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:BackendClient|AppState|WorkspaceData|WorkspaceRefresh)\.create\(/,
  );
  assert.match(app, /PropertyDeskAppServices\.create\(/);
  assert.match(appServices, /modules\.financialContext\.factory\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskAccountFinancialSummary\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskLedgerContext\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskDepositContext\.create\(/);
  assert.match(app, /PropertyDeskTransactionWorkspaceSetup\.create\(/);
  assert.match(app, /PropertyDeskAccountDepositWorkspaceSetup\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:Transaction|AccountDetails)Workflow\.create\(/,
  );
});
