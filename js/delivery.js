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

      purchaseOrder.status = "Cancelled";
      savePurchaseOrders(purchaseOrders);
      releaseRequisitionFromPo(purchaseOrder);
      renderPendingDeliveryTable();
      renderCancelledPurchaseOrdersTable(false);
      populateDeliveryPoOptions();
      showMessage(purchaseOrder.id + " has been cancelled.");
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
