/* ==========================================================

  FUNCTIONS 
     1  Storage Configuration and Base Data Helpers
     2  ID Generation and Utility Functions
     3  Requisition Module (requisition.html)
     4  Approvals Module (approvals.html)
     5  Purchase Orders Module (purchase-order.html)
     6  Purchase Order Detail Module (purchase-order-detail.html)
     7  Delivery Receipts Module (delivery.html)

   ========================================================== */

const STORAGE_KEYS = {
  requisitions: "procureit_requisitions",
  purchaseOrders: "procureit_purchaseOrders",
  deliveries: "procureit_deliveries",
  counters: "procureit_counters",
};

/* ----- 1 Storage Configuration and Base Data Helpers ----- */
/* ----- Generic get/save, shared by all three record types ----- */

function getRecords(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Could not read " + storageKey + " from storage:", error);
    return [];
  }
}

function saveRecords(storageKey, records) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error("Could not save " + storageKey + " to storage:", error);
    return false;
  }
}

/* ----- Requisitions ----- */

function getRequisitions() {
  return getRecords(STORAGE_KEYS.requisitions);
}

function saveRequisitions(requisitions) {
  return saveRecords(STORAGE_KEYS.requisitions, requisitions);
}

/* ----- Purchase Orders ----- */

function getPurchaseOrders() {
  return getRecords(STORAGE_KEYS.purchaseOrders);
}

function savePurchaseOrders(purchaseOrders) {
  return saveRecords(STORAGE_KEYS.purchaseOrders, purchaseOrders);
}

/* ----- 2 ID Generation & Utility Functions ----- */
/* ----- Delivery Receipts (used in a later step) ----- */

function getDeliveries() {
  return getRecords(STORAGE_KEYS.deliveries);
}

function saveDeliveries(deliveries) {
  return saveRecords(STORAGE_KEYS.deliveries, deliveries);
}

/* ----- ID generation ----- */

const ID_PREFIXES = {
  requisition: "REQ",
  purchaseOrder: "PO",
  delivery: "DR",
};

function generateId(type) {
  const prefix = ID_PREFIXES[type];

  if (!prefix) {
    console.error('generateId: unknown type "' + type + '"');
    return null;
  }

  let counters;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.counters);
    counters = raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Could not read counters from storage:", error);
    counters = {};
  }

  const current = counters[type] || 1000; // first ID will be 1001
  const next = current + 1;
  counters[type] = next;

  try {
    localStorage.setItem(STORAGE_KEYS.counters, JSON.stringify(counters));
  } catch (error) {
    console.error("Could not save counters to storage:", error);
  }

  return prefix + "-" + next;
}

/* Shows what the next ID would be */
function peekNextId(type) {
  const prefix = ID_PREFIXES[type];
  if (!prefix) return "";

  let counters;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.counters);
    counters = raw ? JSON.parse(raw) : {};
  } catch (error) {
    counters = {};
  }

  const current = counters[type] || 1000;
  return prefix + "-" + (current + 1);
}

/* Returns today's date as YYYY-MM-DD */
function getTodayIso() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return yyyy + "-" + mm + "-" + dd;
}

/* ----- 3 Requisition Module (requisition.html only) ----- */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("requisition-form")) {
    setupRequisitionPage();
  }
});

function setupRequisitionPage() {
  renderRequisitionsTable(); // shows anything saved from a previous visit
  fillRequestedBy();

  document.getElementById("requisitionIdPreview").value =
    peekNextId("requisition");
  const form = document.getElementById("requisition-form");
  const viewBtn = document.getElementById("viewRequisitionBtn");
  const submitBtn = document.getElementById("submitRequisitionBtn");
  const tableBody = document.getElementById("requisitions-table-body");

  // "View Requisition" - preview what's currently typed in, before submitting
  viewBtn.addEventListener("click", () => {
    const items = collectRequisitionItems();
    if (items === null) return; // collectRequisitionItems already showed the message
    showMessage(
      "Previewing " + items.length + " item(s) for this requisition.",
    );
  });

  // "Submit Requisition"
  submitBtn.addEventListener("click", () => {
    const requestedBy = document.getElementById("requestedBy").value.trim();
    const department = document.getElementById("department");
    const dateSubmitted = document.getElementById("requisitionDate").value;
    const reason = document.getElementById("requisitionReason").value.trim();

    if (requestedBy === "") {
      showMessage("Please enter the requestor's name.");
      return;
    }

    if (department.selectedIndex === 0) {
      showMessage("Please select a department.");
      return;
    }

    if (dateSubmitted === "") {
      showMessage("Please select the date submitted.");
      return;
    }

    const items = collectRequisitionItems();
    if (items === null) return;

    if (items.length === 0) {
      showMessage("Please list at least one item.");
      return;
    }

    const requisition = {
      id: generateId("requisition"),
      requestedBy: requestedBy,
      department: department.value,
      dateSubmitted: dateSubmitted,
      items: items,
      reason: reason,
      status: "Pending",
    };

    const requisitions = getRequisitions();
    requisitions.push(requisition);
    saveRequisitions(requisitions);

    renderRequisitionsTable();
    document.getElementById("requisitionIdPreview").value =
      peekNextId("requisition");
    showMessage(requisition.id + " has been submitted.");
  });

  //* View / Print / Withdraw buttons in the Submitted Requisitions table *//
  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const row = button.closest("tr");
    const id = row.getAttribute("data-id");
    const requisitions = getRequisitions();
    const requisition = requisitions.find((r) => r.id === id);
    if (!requisition) return;

    if (button.classList.contains("js-view")) {
      showMessage(
        requisition.id +
          " — " +
          requisition.requestedBy +
          " (" +
          requisition.department +
          "), " +
          requisition.items.length +
          " item(s), " +
          requisition.status +
          ".",
      );
    } else if (button.classList.contains("js-print")) {
      showMessage("Printing " + requisition.id + "...");
    } else if (button.classList.contains("js-withdraw")) {
      const remaining = requisitions.filter((r) => r.id !== id);
      saveRequisitions(remaining);
      renderRequisitionsTable();
      showMessage(requisition.id + " has been withdrawn.");
    }
  });

  // "View All Requests" - generic placeholder, same as other pages' "View History" buttons
  const viewAllBtn = document.getElementById("viewAllBtn");
  viewAllBtn.addEventListener("click", () => {
    showRequisitionHistory();
  });
}

/* Reads the 5 item rows and returns an array of { description, quantity, unit } */
function collectRequisitionItems() {
  const descInputs = document.querySelectorAll(".item-desc");
  const qtyInputs = document.querySelectorAll(".item-qty");
  const unitInputs = document.querySelectorAll(".item-unit");
  const items = [];

  for (let i = 0; i < descInputs.length; i++) {
    const description = descInputs[i].value.trim();
    const quantity = qtyInputs[i].value;
    const unit = unitInputs[i].value.trim();
    const hasAny = description !== "" || quantity !== "" || unit !== "";

    if (hasAny) {
      if (description === "" || quantity === "" || unit === "") {
        showMessage(
          "Please complete item " +
            (i + 1) +
            " (description, quantity, and unit).",
        );
        return null;
      }

      const quantityNumber = Number(quantity);
      if (!Number.isInteger(quantityNumber) || quantityNumber < 1) {
        showMessage(
          "Quantity for item " +
            (i + 1) +
            " must be a whole number of 1 or more.",
        );
        return null;
      }

      items.push({
        description: description,
        quantity: quantityNumber,
        unit: unit,
      });
    }
  }

  return items;
}

/* Rebuilds the Submitted Requisitions table from what's in storage. */
function renderRequisitionsTable() {
  const tableBody = document.getElementById("requisitions-table-body");
  const role = localStorage.getItem("procureit-role");
  const loggedInName = localStorage.getItem("procureit-name");
  const requisitions = getRequisitions()
    .filter((r) => r.status === "Pending")
    .filter((r) => role !== "requisitioner" || r.requestedBy === loggedInName);

  tableBody.innerHTML = "";

  requisitions.forEach((requisition) => {
    const row = document.createElement("tr");
    row.setAttribute("data-id", requisition.id);
    row.innerHTML =
      "<td>" +
      requisition.id +
      "</td>" +
      "<td>" +
      requisition.requestedBy +
      "</td>" +
      "<td>" +
      requisition.department +
      "</td>" +
      "<td>" +
      requisition.items.length +
      "</td>" +
      "<td>" +
      requisition.dateSubmitted +
      "</td>" +
      "<td>" +
      requisition.status +
      "</td>" +
      '<td><div class="btn-action">' +
      '<button class="btn-content js-view" type="button">View Request</button>' +
      '<button class="btn-content js-print" type="button">Print</button>' +
      '<button class="withraw-btn js-withdraw" type="button">Withdraw</button>' +
      "</div></td>";
    tableBody.appendChild(row);
  });
}

/* ----- Approvals page (approvals.html only) ----- */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("pending-approvals-table-body")) {
    setupApprovalsPage();
  }
});

function setupApprovalsPage() {
  renderPendingApprovalsTable();
  renderApprovalHistoryTable();

  const pendingTableBody = document.getElementById(
    "pending-approvals-table-body",
  );
  const viewHistoryBtn = document.getElementById("viewHistoryBtn");

  // View / Approve / Reject buttons in the awaiting-decision table
  pendingTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const row = button.closest("tr");
    const id = row.getAttribute("data-id");
    const requisitions = getRequisitions();
    const requisition = requisitions.find((r) => r.id === id);
    if (!requisition) return;

    if (button.classList.contains("js-view-approval")) {
      showMessage(
        requisition.id +
          " — " +
          requisition.requestedBy +
          " (" +
          requisition.department +
          "), " +
          requisition.items.length +
          " item(s), " +
          requisition.status +
          ".",
      );
      return;
    }

    if (
      !button.classList.contains("js-approve") &&
      !button.classList.contains("js-reject")
    ) {
      return;
    }

    const remarksInput = row.querySelector(".decision-remarks");
    const remarks = remarksInput ? remarksInput.value.trim() : "";
    const loggedInName = localStorage.getItem("procureit-name") || "System";

    requisition.status = button.classList.contains("js-approve")
      ? "Approved"
      : "Rejected";
    requisition.decidedBy = loggedInName;
    requisition.dateDecided = getTodayIso();
    requisition.remarks = remarks;

    saveRequisitions(requisitions);
    renderPendingApprovalsTable();
    renderApprovalHistoryTable();
    showMessage(
      requisition.id + " has been " + requisition.status.toLowerCase() + ".",
    );
  });

  // "View History" button above the Approval History table
  if (viewHistoryBtn) {
    viewHistoryBtn.addEventListener("click", () => {
      showApprovalHistory();
    });
  }
}

/* Rebuilds the "Requisitions Awaiting Your Decision" table from storage. */
function renderPendingApprovalsTable() {
  const tableBody = document.getElementById("pending-approvals-table-body");
  const pending = getRequisitions().filter((r) => r.status === "Pending");

  tableBody.innerHTML = "";

  pending.forEach((requisition) => {
    const row = document.createElement("tr");
    row.setAttribute("data-id", requisition.id);
    row.innerHTML =
      "<td>" +
      requisition.id +
      "</td>" +
      "<td>" +
      requisition.requestedBy +
      "</td>" +
      "<td>" +
      requisition.department +
      "</td>" +
      '<td><div class="btn-action">' +
      '<button type="button" class="btn-content js-view-approval">View Requisition</button>' +
      "</div></td>" +
      "<td>" +
      requisition.dateSubmitted +
      "</td>" +
      '<td><form class="decision-form">' +
      '<label class="content-label">Remarks</label>' +
      '<input type="text" class="decision-remarks" placeholder="Optional remarks" />' +
      "<br /><br />" +
      '<button type="button" class="approve-btn js-approve">Approve</button>' +
      '<button type="button" class="reject-btn js-reject">Reject</button>' +
      "</form></td>";
    tableBody.appendChild(row);
  });
}

/* Rebuilds the Approval History table from storage */
function renderApprovalHistoryTable() {
  const tableBody = document.getElementById("approval-history-table-body");
  const decided = getRequisitions()
    .filter((r) => r.status === "Approved" || r.status === "Rejected")
    .sort((a, b) => (b.dateDecided || "").localeCompare(a.dateDecided || ""));

  tableBody.innerHTML = "";

  decided.forEach((requisition) => {
    const row = document.createElement("tr");
    row.innerHTML =
      "<td>" +
      requisition.id +
      "</td>" +
      "<td>" +
      requisition.department +
      "</td>" +
      "<td>" +
      requisition.status +
      "</td>" +
      "<td>" +
      (requisition.decidedBy || "—") +
      "</td>" +
      "<td>" +
      (requisition.dateDecided || "—") +
      "</td>";
    tableBody.appendChild(row);
  });
}

/* ----- 5 Purchase Orders Module (purchase-order.html only) ----- */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("approved-requisitions-table-body")) {
    setupPurchaseOrderPage();
  }
});

function setupPurchaseOrderPage() {
  renderApprovedRequisitionsTable();
  renderActivePurchaseOrdersTable();
  renderCancelledPurchaseOrdersTable();

  const approvedTableBody = document.getElementById(
    "approved-requisitions-table-body",
  );
  const activeTableBody = document.getElementById("active-pos-table-body");
  const viewHistoryBtn = document.getElementById("viewHistoryBtn");

  // "Cancel Order" for an approved requisition awaiting a purchase order
  approvedTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || !button.classList.contains("js-cancel-po")) return;

    const row = button.closest("tr");
    const id = row.getAttribute("data-id");
    const requisitions = getRequisitions();
    const requisition = requisitions.find((r) => r.id === id);
    if (!requisition) return;

    requisition.status = "Cancelled";
    saveRequisitions(requisitions);
    renderApprovedRequisitionsTable();
    renderCancelledPurchaseOrdersTable();
    showMessage(requisition.id + " has been cancelled.");
  });

  // View / Cancel Order for an already-created purchase order
  activeTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const row = button.closest("tr");
    const id = row.getAttribute("data-id");
    const purchaseOrders = getPurchaseOrders();
    const purchaseOrder = purchaseOrders.find((po) => po.id === id);
    if (!purchaseOrder) return;

    if (button.classList.contains("js-view-po")) {
      showMessage(
        purchaseOrder.id +
          " — " +
          purchaseOrder.vendor +
          ", total " +
          purchaseOrder.total +
          ", status " +
          purchaseOrder.status +
          ".",
      );
      return;
    }

    if (button.classList.contains("js-cancel-po")) {
      purchaseOrder.status = "Cancelled";
      savePurchaseOrders(purchaseOrders);
      releaseRequisitionFromPo(purchaseOrder);
      renderApprovedRequisitionsTable();
      renderActivePurchaseOrdersTable();
      renderCancelledPurchaseOrdersTable();
      showMessage(purchaseOrder.id + " has been cancelled.");
    }
  });

  if (viewHistoryBtn) {
    viewHistoryBtn.addEventListener("click", () => {
      showPurchaseOrderHistory();
    });
  }
}

/* Rebuilds the Approved Requisitions table: Approved requisitions with no PO yet. */
function renderApprovedRequisitionsTable() {
  const tableBody = document.getElementById("approved-requisitions-table-body");
  const approved = getRequisitions().filter(
    (r) => r.status === "Approved" && !r.poId,
  );

  tableBody.innerHTML = "";

  approved.forEach((requisition) => {
    const row = document.createElement("tr");
    row.setAttribute("data-id", requisition.id);
    row.innerHTML =
      "<td>" +
      requisition.id +
      "</td>" +
      "<td>" +
      requisition.department +
      "</td>" +
      "<td>" +
      requisition.status +
      "</td>" +
      "<td>" +
      (requisition.decidedBy || "—") +
      "</td>" +
      "<td>" +
      (requisition.dateDecided || "—") +
      "</td>" +
      '<td><div class="btn-action">' +
      '<a href="purchase-order-detail.html?reqId=' +
      encodeURIComponent(requisition.id) +
      '" class="approve-btn">Create Purchase Order</a>' +
      '<button type="button" class="reject-btn js-cancel-po">Cancel Order</button>' +
      "</div></td>";
    tableBody.appendChild(row);
  });
}

/* Rebuilds the active (non-cancelled) Purchase Orders table. */
function renderActivePurchaseOrdersTable() {
  const tableBody = document.getElementById("active-pos-table-body");
  const active = getPurchaseOrders().filter((po) => po.status === "Active");

  tableBody.innerHTML = "";

  active.forEach((purchaseOrder) => {
    const row = document.createElement("tr");
    row.setAttribute("data-id", purchaseOrder.id);
    row.innerHTML =
      "<td>" +
      purchaseOrder.id +
      "</td>" +
      "<td>" +
      purchaseOrder.vendor +
      "</td>" +
      "<td>" +
      purchaseOrder.dateCreated +
      "</td>" +
      "<td>" +
      purchaseOrder.requisitioner +
      "</td>" +
      "<td>" +
      purchaseOrder.status +
      "</td>" +
      "<td>" +
      purchaseOrder.total +
      "</td>" +
      '<td><div class="btn-action">' +
      '<button type="button" class="btn-content js-view-po">View</button>' +
      '<button type="button" class="reject-btn js-cancel-po">Cancel Order</button>' +
      "</div></td>";
    tableBody.appendChild(row);
  });
}

/* Rebuilds the Cancelled Orders table */
function renderCancelledPurchaseOrdersTable(includeRequisitions = true) {
  const tableBody = document.getElementById("cancelled-pos-table-body");
  const cancelledPOs = getPurchaseOrders().filter(
    (po) => po.status === "Cancelled",
  );
  const cancelledRequisitions = getRequisitions().filter(
    (r) => r.status === "Cancelled",
  );

  tableBody.innerHTML = "";

  cancelledPOs.forEach((purchaseOrder) => {
    const row = document.createElement("tr");
    row.innerHTML =
      "<td>" +
      purchaseOrder.id +
      "</td>" +
      "<td>" +
      purchaseOrder.vendor +
      "</td>" +
      "<td>" +
      purchaseOrder.dateCreated +
      "</td>" +
      "<td>" +
      purchaseOrder.requisitioner +
      "</td>" +
      "<td>" +
      purchaseOrder.status +
      "</td>" +
      "<td>" +
      purchaseOrder.total +
      "</td>";
    tableBody.appendChild(row);
  });

  if (!includeRequisitions) return;

  // No PO was ever created for these, so vendor and total don't exist yet
  cancelledRequisitions.forEach((requisition) => {
    const row = document.createElement("tr");
    row.innerHTML =
      "<td>" +
      requisition.id +
      "</td>" +
      "<td>—</td>" +
      "<td>" +
      requisition.dateSubmitted +
      "</td>" +
      "<td>" +
      requisition.requestedBy +
      "</td>" +
      "<td>" +
      requisition.status +
      "</td>" +
      "<td>—</td>";
    tableBody.appendChild(row);
  });
}

/* ----- 6 Purchase Order Detail Module (purchase-order-detail.html only) ----- */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("po-form")) {
    setupPurchaseOrderDetailPage();
  }
});

function setupPurchaseOrderDetailPage() {
  const form = document.getElementById("po-form");
  const calculateBtn = document.getElementById("calculatePoBtn");
  const saveBtn = document.getElementById("savePoBtn");
  const clearBtn = document.getElementById("clearPoBtn");
  const requisitionSelect = document.getElementById("poRequisition");

  document.getElementById("poNumber").value = peekNextId("purchaseOrder");
  const preselectId = getQueryParam("reqId");
  populatePoRequisitionOptions(preselectId);

  requisitionSelect.addEventListener("change", () => {
    applyRequisitionPrefill(requisitionSelect.value);
  });

  // "Calculate Total" button
  calculateBtn.addEventListener("click", () => {
    if (calculatePoTotals()) {
      showMessage("Totals updated.");
    }
  });

  // "Save Purchase Order" button
  saveBtn.addEventListener("click", () => {
    const requisitionSelectEl = document.getElementById("poRequisition");
    const poDate = document.getElementById("poDate");
    const requisitioner = document.getElementById("poRequisitioner");
    const department = document.getElementById("poDepartment");
    const vendor = document.getElementById("poVendor");
    const shipToName = document.getElementById("shipToName");
    const shipToAddress = document.getElementById("shipToAddress");
    const descInputs = document.querySelectorAll(".po-item-desc");
    const qtyInputs = document.querySelectorAll(".po-qty");
    const priceInputs = document.querySelectorAll(".po-price");

    if (requisitionSelectEl.selectedIndex === 0) {
      showMessage("Please select a requisition.");
      return;
    }

    if (poDate.value === "") {
      showMessage("Please select the order date.");
      return;
    }

    if (requisitioner.value.trim() === "") {
      showMessage("Please enter the requisitioner.");
      return;
    }

    if (department.selectedIndex === 0) {
      showMessage("Please select a department.");
      return;
    }

    if (vendor.selectedIndex === 0) {
      showMessage("Please select a vendor.");
      return;
    }

    if (shipToName.value.trim() === "") {
      showMessage("Please enter the ship-to name.");
      return;
    }

    if (shipToAddress.value.trim() === "") {
      showMessage("Please enter the ship-to address.");
      return;
    }

    if (document.getElementById("shipVia").selectedIndex === 0) {
      showMessage("Please select a Ship Via option.");
      return;
    }

    if (document.getElementById("fob").selectedIndex === 0) {
      showMessage("Please select an F.O.B. option.");
      return;
    }

    if (document.getElementById("shippingTerms").selectedIndex === 0) {
      showMessage("Please select the shipping terms.");
      return;
    }

    // Check each item row: a row with anything typed in it must be complete
    let itemCount = 0;
    for (let i = 0; i < descInputs.length; i++) {
      const hasDesc = descInputs[i].value.trim() !== "";
      const hasQty = Number(qtyInputs[i].value) > 0;
      const hasPrice = Number(priceInputs[i].value) > 0;

      if (hasDesc || hasQty || hasPrice) {
        if (!hasDesc) {
          showMessage("Please enter a description for item " + (i + 1) + ".");
          return;
        }
        if (!hasQty || !hasPrice) {
          showMessage(
            "Please enter a quantity and unit price for item " + (i + 1) + ".",
          );
          return;
        }
        itemCount++;
      }
    }

    if (itemCount === 0) {
      showMessage("Please list at least one item.");
      return;
    }

    // Make sure the totals are up to date before saving
    if (!calculatePoTotals()) {
      return;
    }

    const requisitions = getRequisitions();
    const requisition = requisitions.find(
      (r) => r.id === requisitionSelectEl.value,
    );
    if (!requisition) {
      showMessage(
        "That requisition is no longer available. Please choose another.",
      );
      populatePoRequisitionOptions();
      return;
    }

    const purchaseOrder = {
      id: generateId("purchaseOrder"),
      requisitionId: requisition.id,
      dateCreated: poDate.value,
      requisitioner: requisitioner.value.trim(),
      department: department.value,
      vendor: vendor.value,
      shipToName: shipToName.value.trim(),
      shipToAddress: shipToAddress.value.trim(),
      shipToPhone: document.getElementById("shipToPhone").value.trim(),
      shipVia: document.getElementById("shipVia").value,
      fob: document.getElementById("fob").value,
      shippingTerms: document.getElementById("shippingTerms").value,
      expectedDelivery: document.getElementById("expectedDelivery").value,
      items: collectPoItemLines(),
      subtotal: document.getElementById("poSubtotal").value,
      taxRate: document.getElementById("poTaxRate").value,
      tax: document.getElementById("poTax").value,
      shipping: document.getElementById("poShipping").value,
      total: document.getElementById("poTotal").value,
      notes: document.getElementById("poNotes").value.trim(),
      status: "Active",
    };

    // Link the requisition to this PO so it drops off the awaiting-PO list
    requisition.poId = purchaseOrder.id;
    saveRequisitions(requisitions);

    const purchaseOrders = getPurchaseOrders();
    purchaseOrders.push(purchaseOrder);
    savePurchaseOrders(purchaseOrders);

    showMessage(
      "Purchase order " +
        purchaseOrder.id +
        " for " +
        vendor.value +
        " saved. Total: " +
        purchaseOrder.total +
        ".",
    );
    form.reset();
    document.getElementById("poNumber").value = peekNextId("purchaseOrder");
    populatePoRequisitionOptions();
  });

  // "Clear Form" button
  clearBtn.addEventListener("click", () => {
    form.reset();
    document.getElementById("poNumber").value = peekNextId("purchaseOrder");
    populatePoRequisitionOptions();
    showMessage("Form cleared.");
  });
}

/* Fills the requisition dropdown with Approved requisitions */
function populatePoRequisitionOptions(preselectId) {
  const select = document.getElementById("poRequisition");
  const eligible = getRequisitions().filter(
    (r) => r.status === "Approved" && !r.poId,
  );

  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.textContent = "-- Select Approved Requisition --";
  select.appendChild(placeholder);

  eligible.forEach((requisition) => {
    const option = document.createElement("option");
    option.value = requisition.id;
    option.textContent =
      requisition.id +
      " — " +
      requisition.department +
      " — " +
      requisition.requestedBy;
    select.appendChild(option);
  });

  if (preselectId) {
    select.value = preselectId;
    applyRequisitionPrefill(preselectId);
  }
}

/* Prefills Requisitioner, Department, and item rows from the selected requisition. */
function applyRequisitionPrefill(requisitionId) {
  const requisition = getRequisitions().find((r) => r.id === requisitionId);
  if (!requisition) return;

  document.getElementById("poRequisitioner").value = requisition.requestedBy;
  document.getElementById("poDepartment").value = requisition.department;

  const itemNoInputs = document.querySelectorAll(".po-item-no");
  const descInputs = document.querySelectorAll(".po-item-desc");
  const qtyInputs = document.querySelectorAll(".po-qty");
  const priceInputs = document.querySelectorAll(".po-price");
  const lineTotals = document.querySelectorAll(".po-line-total");

  // Clear all 5 rows first, then fill in what the requisition listed.
  for (let i = 0; i < descInputs.length; i++) {
    itemNoInputs[i].value = "";
    descInputs[i].value = "";
    qtyInputs[i].value = "";
    priceInputs[i].value = "";
    lineTotals[i].value = "0.00";
  }

  requisition.items.forEach((item, i) => {
    if (i >= descInputs.length) return; // safety; requisitions max out at 5 anyway
    descInputs[i].value = item.description;
    qtyInputs[i].value = item.quantity;
  });

  calculatePoTotals();
}

/* Reads one query string parameter from the current page URL. */
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/* Reads the item rows and returns the completed lines, for saving to storage. */
function collectPoItemLines() {
  const itemNos = document.querySelectorAll(".po-item-no");
  const descs = document.querySelectorAll(".po-item-desc");
  const qtys = document.querySelectorAll(".po-qty");
  const prices = document.querySelectorAll(".po-price");
  const lineTotals = document.querySelectorAll(".po-line-total");
  const items = [];

  for (let i = 0; i < descs.length; i++) {
    const description = descs[i].value.trim();
    const quantity = Number(qtys[i].value);
    const unitPrice = Number(prices[i].value);

    if (description !== "" && quantity > 0 && unitPrice > 0) {
      items.push({
        itemNo: itemNos[i].value.trim(),
        description: description,
        quantity: quantity,
        unitPrice: unitPrice,
        lineTotal: lineTotals[i].value,
      });
    }
  }

  return items;
}

/* ----- 7 Delivery Receipts Module (delivery.html only) ----- */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("pending-delivery-table-body")) {
    setupDeliveryPage();
  }
});

function setupDeliveryPage() {
  renderPendingDeliveryTable();
  renderDeliveryLogTable();
  renderCancelledPurchaseOrdersTable(false); // same function purchase-order.html uses

  populateDeliveryPoOptions();
  document.getElementById("drNumber").value = peekNextId("delivery");

  const pendingTableBody = document.getElementById(
    "pending-delivery-table-body",
  );
  const logTableBody = document.getElementById("delivery-log-table-body");
  const deliveryPoSelect = document.getElementById("deliveryPO");
  const deliveryForm = document.getElementById("delivery-form");
  const saveDeliveryBtn = document.getElementById("saveDeliveryBtn");
  const cancelDeliveryBtn = document.getElementById("cancelDeliveryBtn");
  const viewDeliveryHistoryBtn = document.getElementById(
    "viewDeliveryHistoryBtn",
  );
  const viewCancelledOrdersBtn = document.getElementById(
    "viewCancelledOrdersBtn",
  );

  // Record Delivery / Cancel Order buttons in the awaiting-delivery table
  pendingTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const row = button.closest("tr");
    const poId = row.getAttribute("data-id");
    deliveryPoSelect.value = poId;
    document.getElementById("receivedBy").focus();
  });

  // "View" buttons inside the Delivery Receipt Log table
  logTableBody.addEventListener("click", (event) => {
    const button = event.target.closest(".js-view-delivery-log");
    if (!button) return;

    const row = button.closest("tr");
    const id = row.getAttribute("data-id");
    const delivery = getDeliveries().find((d) => d.id === id);
    if (!delivery) return;

    showMessage(
      delivery.id +
        " — " +
        delivery.condition +
        ", received by " +
        delivery.receivedBy +
        " on " +
        delivery.dateReceived +
        ".",
    );
  });

  // "Save Delivery Receipt" button
  saveDeliveryBtn.addEventListener("click", () => {
    const poId = deliveryPoSelect.value;
    const dateReceived = document.getElementById("deliveryDateReceived").value;
    const receivedBy = document.getElementById("receivedBy");
    const condition = document.getElementById("deliveryCondition");
    const remarksInput = document.getElementById("deliveryRemarks");

    if (deliveryPoSelect.selectedIndex === 0) {
      showMessage("Please select a purchase order.");
      return;
    }

    if (dateReceived === "") {
      showMessage("Please select the date received.");
      return;
    }

    if (receivedBy.value.trim() === "") {
      showMessage("Please enter who received the delivery.");
      return;
    }

    if (condition.selectedIndex === 0) {
      showMessage("Please select the condition of goods.");
      return;
    }

    const purchaseOrders = getPurchaseOrders();
    const purchaseOrder = purchaseOrders.find((po) => po.id === poId);
    if (!purchaseOrder) {
      showMessage("That purchase order is no longer available.");
      populateDeliveryPoOptions();
      return;
    }

    const delivery = {
      id: generateId("delivery"),
      poId: poId,
      dateReceived: dateReceived,
      receivedBy: receivedBy.value.trim(),
      condition: condition.value,
      remarks: remarksInput.value.trim(),
    };

    // Only a complete, good-condition delivery closes the PO.
    const isComplete = condition.value.startsWith("Complete");
    if (isComplete) {
      purchaseOrder.status = "Delivered";
      savePurchaseOrders(purchaseOrders);
    }

    const deliveries = getDeliveries();
    deliveries.push(delivery);
    saveDeliveries(deliveries);

    showMessage(
      delivery.id +
        " recorded for " +
        purchaseOrder.id +
        (isComplete ? "." : ". The order stays open for the remaining items."),
    );

    deliveryForm.reset();
    document.getElementById("drNumber").value = peekNextId("delivery");
    renderPendingDeliveryTable();
    renderDeliveryLogTable();
    populateDeliveryPoOptions();
  });

  // "Cancel / Return Delivery" button
  cancelDeliveryBtn.addEventListener("click", () => {
    deliveryForm.reset();
    document.getElementById("drNumber").value = peekNextId("delivery");
    populateDeliveryPoOptions();
    showMessage("Delivery entry cleared.");
  });

  if (viewDeliveryHistoryBtn) {
    viewDeliveryHistoryBtn.addEventListener("click", () => {
      showDeliveryHistory();
    });
  }

  if (viewCancelledOrdersBtn) {
    viewCancelledOrdersBtn.addEventListener("click", () => {
      showCancelledOrdersHistory();
    });
  }
}

/* Rebuilds the Purchase Orders Awaiting Delivery table: Active POs not yet delivered. */
function renderPendingDeliveryTable() {
  const tableBody = document.getElementById("pending-delivery-table-body");
  const pending = getPurchaseOrders().filter((po) => po.status === "Active");

  tableBody.innerHTML = "";

  pending.forEach((purchaseOrder) => {
    const row = document.createElement("tr");
    row.setAttribute("data-id", purchaseOrder.id);
    row.innerHTML =
      "<td>" +
      purchaseOrder.id +
      "</td>" +
      "<td>" +
      purchaseOrder.vendor +
      "</td>" +
      "<td>" +
      (purchaseOrder.expectedDelivery || "—") +
      "</td>" +
      '<td><select class="delivery-status-select">' +
      "<option>Open</option><option>Sent to Vendor</option>" +
      "<option>Acknowledged</option><option>In Transit</option>" +
      "</select></td>" +
      '<td><div class="btn-action">' +
      '<button type="button" class="btn-content js-record-delivery">Record Delivery</button>' +
      '<button type="button" class="reject-btn js-cancel-delivery-po">Cancel Order</button>' +
      "</div></td>";
    tableBody.appendChild(row);
  });
}

/* Fills the "Purchase Order" dropdown on the Record Delivery Receipt form
   with Active purchase orders not yet delivered. */
function populateDeliveryPoOptions() {
  const select = document.getElementById("deliveryPO");
  const eligible = getPurchaseOrders().filter((po) => po.status === "Active");

  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.textContent = "-- Select Purchase Order --";
  select.appendChild(placeholder);

  eligible.forEach((purchaseOrder) => {
    const option = document.createElement("option");
    option.value = purchaseOrder.id;
    option.textContent = purchaseOrder.id + " — " + purchaseOrder.vendor;
    select.appendChild(option);
  });
}

/* Rebuilds the Delivery Receipt Log table from storage. */
function renderDeliveryLogTable() {
  const tableBody = document.getElementById("delivery-log-table-body");
  const deliveries = getDeliveries();
  const purchaseOrders = getPurchaseOrders();

  tableBody.innerHTML = "";

  deliveries.forEach((delivery) => {
    const purchaseOrder = purchaseOrders.find((po) => po.id === delivery.poId);
    const vendor = purchaseOrder ? purchaseOrder.vendor : "—";

    const row = document.createElement("tr");
    row.setAttribute("data-id", delivery.id);
    row.innerHTML =
      "<td>" +
      delivery.id +
      "</td>" +
      "<td>" +
      delivery.poId +
      "</td>" +
      "<td>" +
      vendor +
      "</td>" +
      "<td>" +
      delivery.dateReceived +
      "</td>" +
      "<td>" +
      delivery.condition +
      "</td>" +
      "<td>" +
      delivery.receivedBy +
      "</td>" +
      '<td><div class="btn-action">' +
      '<button type="button" class="btn-content js-view-delivery-log">View</button>' +
      "</div></td>";
    tableBody.appendChild(row);
  });
}
