/* ----- 7 Delivery Receipts Module (delivery.html only) ----- */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("pending-delivery-table-body")) {
    startPage(setupDeliveryPage);
  }
});

const DR_PLACEHOLDER = "Assigned on save"; // the server assigns the real DR number

async function refreshDeliveryLog() {
  try {
    await loadDeliveries();
    renderDeliveryLogTable();
    setupRoleAccess();
  } catch (error) {
    console.error("Could not load delivery receipts:", error);
    showMessage("Could not load delivery receipts from the server.");
  }
}

function setupDeliveryPage() {
  renderPendingDeliveryTable();
  refreshDeliveryLog();
  renderCancelledPurchaseOrdersTable(false);

  populateDeliveryPoOptions();
  document.getElementById("drNumber").value = DR_PLACEHOLDER;

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
  pendingTableBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const row = button.closest("tr");
    const poId = row.getAttribute("data-id");

    // "Record Delivery": preselects that PO in the form below
    if (button.classList.contains("js-record-delivery")) {
      deliveryPoSelect.value = poId;
      document.getElementById("receivedBy").focus();
      return;
    }

    // "Cancel Order": moves the PO to the Cancelled Orders table
    if (button.classList.contains("js-cancel-delivery-po")) {
      const purchaseOrders = getPurchaseOrders();
      const purchaseOrder = purchaseOrders.find((po) => po.id === poId);
      if (!purchaseOrder) return;

      button.disabled = true;
      try {
        // The server cancels the order and frees its requisition
        await cancelPurchaseOrder(poId);
        showMessage(poId + " has been cancelled.");
      } catch (error) {
        showMessage(error.message);
        await reloadOrderData();
      }
      renderPendingDeliveryTable();
      renderCancelledPurchaseOrdersTable(false);
      populateDeliveryPoOptions();
    }
  });

  // "View" buttons inside the Delivery Receipt Log table
  logTableBody.addEventListener("click", (event) => {
    const button = event.target.closest(".js-view-delivery-log");
    if (!button) return;

    const row = button.closest("tr");
    const id = row.getAttribute("data-id");
    const delivery = getDeliveries().find((d) => d.id === id);
    if (!delivery) return;

    showDeliveryDetails(delivery);
  });

  // "Save Delivery Receipt" button
  saveDeliveryBtn.addEventListener("click", async () => {
    const poId = deliveryPoSelect.value;
    const dateReceived = document.getElementById("deliveryDateReceived").value;
    const receivedBy = document.getElementById("receivedBy");
    const condition = document.getElementById("deliveryCondition");
    const remarksInput = document.getElementById("deliveryRemarks");
    const proofInput = document.getElementById("deliveryProof");

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
      poId: poId,
      dateReceived: dateReceived,
      receivedBy: receivedBy.value.trim(),
      condition: condition.value,
      remarks: remarksInput.value.trim(),
      proofFileName:
        proofInput && proofInput.files.length ? proofInput.files[0].name : "",
    };

    // Send the receipt to the server to be stored in the database
    saveDeliveryBtn.disabled = true;
    let saved;
    try {
      saved = await createDelivery(delivery);
    } catch (error) {
      showMessage(error.message);
      await loadPurchaseOrders().catch(() => {});
      renderPendingDeliveryTable();
      populateDeliveryPoOptions();
      return;
    } finally {
      saveDeliveryBtn.disabled = false;
    }

    // The server closes the PO when the delivery is complete and in good condition
    await loadPurchaseOrders().catch(() => {});
    const updatedPo = getPurchaseOrders().find((po) => po.id === poId);
    const isComplete = Boolean(updatedPo) && updatedPo.status === "Delivered";

    showMessage(
      saved.id +
        " recorded for " +
        purchaseOrder.id +
        (isComplete ? "." : ". The order stays open for the remaining items."),
    );

    deliveryForm.reset();
    document.getElementById("drNumber").value = DR_PLACEHOLDER;
    await refreshDeliveryLog();
    renderPendingDeliveryTable();
    populateDeliveryPoOptions();
  });

  // "Cancel / Return Delivery" button
  cancelDeliveryBtn.addEventListener("click", () => {
    deliveryForm.reset();
    document.getElementById("drNumber").value = DR_PLACEHOLDER;
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
  // "View Summary" at the top: receipts and cancelled orders together
  const viewDeliverySummaryBtn = document.getElementById(
    "viewDeliverySummaryBtn",
  );
  if (viewDeliverySummaryBtn) {
    viewDeliverySummaryBtn.addEventListener("click", () => {
      showDeliverySummary();
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
      tds(
        purchaseOrder.id,
        purchaseOrder.vendor,
        purchaseOrder.expectedDelivery || "—",
      ) +
      '<td><select class="form-select form-select-sm delivery-status-select" aria-label="Delivery status">' +
      "<option>Open</option><option>Sent to Vendor</option>" +
      "<option>Acknowledged</option><option>In Transit</option>" +
      "</select></td>" +
      '<td><div class="btn-action d-flex flex-wrap gap-2">' +
      '<button type="button" class="btn btn-sm btn-primary js-record-delivery">Record Delivery</button>' +
      '<button type="button" class="btn btn-sm btn-outline-danger js-cancel-delivery-po">Cancel Order</button>' +
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
      tds(
        delivery.id,
        delivery.poId,
        vendor,
        delivery.dateReceived,
        delivery.condition,
        delivery.receivedBy,
      ) +
      '<td><div class="btn-action">' +
      '<button type="button" class="btn btn-sm btn-outline-primary js-view-delivery-log">View</button>' +
      "</div></td>";
    tableBody.appendChild(row);
  });
}
