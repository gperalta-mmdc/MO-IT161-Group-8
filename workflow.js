const STORAGE_KEYS = {
  requisitions: "procureit_requisitions",
  purchaseOrders: "procureit_purchaseOrders",
  deliveries: "procureit_deliveries",
  counters: "procureit_counters",
};

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

/* ----- Requisition page (requisition.html only) ----- */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("requisition-form")) {
    setupRequisitionPage();
  }
});

function setupRequisitionPage() {
  renderRequisitionsTable(); // shows anything saved from a previous visit

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
    form.reset();
    showMessage(requisition.id + " has been submitted.");
  });

  // View / Print / Withdraw buttons in the Submitted Requisitions table
  // (one listener on the table body, since rows are added dynamically)
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
    showPopup();
  });
}

/* Reads the 5 item rows and returns an array of { description, quantity, unit }.
   Returns null (and shows a message) if a partly-filled row is incomplete. */
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
      items.push({
        description: description,
        quantity: Number(quantity),
        unit: unit,
      });
    }
  }

  return items;
}

/* Rebuilds the Submitted Requisitions table from what's in storage. */
function renderRequisitionsTable() {
  const tableBody = document.getElementById("requisitions-table-body");
  const requisitions = getRequisitions();

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
