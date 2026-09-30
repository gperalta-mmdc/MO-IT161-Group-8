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
          formatPeso(purchaseOrder.total) +
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

/* Rebuilds the Approved Requisitions table */
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
      formatPeso(purchaseOrder.total) +
      "</td>" +
      '<td><div class="btn-action">' +
      '<button type="button" class="btn-content js-view-po">View</button>' +
      '<button type="button" class="reject-btn js-cancel-po">Cancel Order</button>' +
      "</div></td>";
    tableBody.appendChild(row);
  });
}
