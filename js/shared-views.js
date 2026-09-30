/* Shows every Pending, Approved and Rejected requisition in a popup. */
function showRequisitionHistory() {
  const role = localStorage.getItem("procureit-role");
  const loggedInName = localStorage.getItem("procureit-name");
  const shownStatuses = ["Pending", "Approved", "Rejected"];

  const rows = getRequisitions()
    .filter((r) => shownStatuses.includes(r.status))
    // same rule rbac.js uses: requisitioners only see their own requests
    .filter((r) => role !== "requisitioner" || r.requestedBy === loggedInName)
    .map((r) => [
      r.id,
      r.requestedBy,
      r.department,
      r.dateSubmitted,
      r.status,
      r.decidedBy || "—",
      r.dateDecided || "—",
    ])
    .reverse(); // newest first

  showTablePopup(
    "Requisition History",
    [
      "Requisition ID",
      "Requested By",
      "Department",
      "Date Submitted",
      "Status",
      "Decided By",
      "Date Decided",
    ],
    rows,
  );
}

/* Approvals page: every Approved / Rejected requisition, with remarks. */
function showApprovalHistory() {
  const rows = getRequisitions()
    .filter((r) => r.status === "Approved" || r.status === "Rejected")
    .sort((a, b) => (b.dateDecided || "").localeCompare(a.dateDecided || ""))
    .map((r) => [
      r.id,
      r.requestedBy,
      r.department,
      r.status,
      r.decidedBy || "—",
      r.dateDecided || "—",
      r.remarks || "—",
    ]);

  showTablePopup(
    "Approval History",
    [
      "Requisition ID",
      "Requested By",
      "Department",
      "Decision",
      "Decided By",
      "Date Decided",
      "Remarks",
    ],
    rows,
  );
}

/* Purchase Orders page: every PO whatever its status (Active, Delivered, Cancelled). */
function showPurchaseOrderHistory() {
  const rows = getPurchaseOrders()
    .map((po) => [
      po.id,
      po.requisitionId || "—",
      po.vendor,
      po.dateCreated,
      po.requisitioner,
      po.status,
      formatPeso(po.total),
    ])
    .reverse(); // newest first

  showTablePopup(
    "Purchase Order History",
    [
      "PO #",
      "Requisition ID",
      "Vendor",
      "Date",
      "Requisitioner",
      "Status",
      "Total",
    ],
    rows,
  );
}

/* Delivery page: every delivery receipt recorded so far. */
function showDeliveryHistory() {
  const purchaseOrders = getPurchaseOrders();
  const rows = getDeliveries()
    .map((d) => {
      const po = purchaseOrders.find((p) => p.id === d.poId);
      return [
        d.id,
        d.poId,
        po ? po.vendor : "—",
        d.dateReceived,
        d.condition,
        d.receivedBy,
        d.remarks || "—",
      ];
    })
    .reverse(); // newest first

  showTablePopup(
    "Delivery Receipt History",
    [
      "DR Number",
      "PO Number",
      "Vendor",
      "Date Received",
      "Condition",
      "Received By",
      "Remarks",
    ],
    rows,
  );
}

/* Delivery page: cancelled purchase orders only. */
function showCancelledOrdersHistory() {
  const rows = getPurchaseOrders()
    .filter((po) => po.status === "Cancelled")
    .map((po) => [
      po.id,
      po.requisitionId || "—",
      po.vendor,
      po.dateCreated,
      po.requisitioner,
      formatPeso(po.total),
    ])
    .reverse();

  showTablePopup(
    "Cancelled Orders History",
    ["PO #", "Requisition ID", "Vendor", "Date", "Requisitioner", "Total"],
    rows,
  );
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
