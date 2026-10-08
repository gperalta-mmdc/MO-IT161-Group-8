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

/* Popup with the full details of one requisition (Requisition and Approvals pages). */
function showRequisitionDetails(requisition) {
  const details = [
    ["Requisition ID", requisition.id],
    ["Requested By", requisition.requestedBy],
    ["Department", requisition.department],
    ["Date Submitted", requisition.dateSubmitted],
    ["Status", requisition.status],
    ["Reason for Request", requisition.reason || "—"],
  ];

  // Decision details only exist once someone has approved or rejected it
  if (requisition.decidedBy) {
    details.push(
      ["Decided By", requisition.decidedBy],
      ["Date Decided", requisition.dateDecided || "—"],
      ["Approver Remarks", requisition.remarks || "—"],
    );
  }

  if (requisition.poId) {
    details.push(["Purchase Order", requisition.poId]);
  }

  const rows = requisition.items.map((item, i) => [
    i + 1,
    item.description,
    item.quantity,
    item.unit,
  ]);

  showTablePopup(
    "Requisition Details",
    ["#", "Item / Description", "Quantity", "Unit"],
    rows,
    details,
    "No items listed.",
  );
}

/* Popup with the full details of one purchase order (Purchase Orders page). */
function showPurchaseOrderDetails(purchaseOrder) {
  const shipTo =
    [purchaseOrder.shipToName, purchaseOrder.shipToAddress]
      .filter(Boolean)
      .join(", ") || "—";

  const details = [
    ["PO Number", purchaseOrder.id],
    ["Requisition", purchaseOrder.requisitionId || "—"],
    ["Vendor", purchaseOrder.vendor],
    ["Order Date", purchaseOrder.dateCreated],
    ["Expected Delivery", purchaseOrder.expectedDelivery || "—"],
    ["Requisitioner", purchaseOrder.requisitioner],
    ["Department", purchaseOrder.department || "—"],
    ["Status", purchaseOrder.status],
    ["Ship To", shipTo],
    ["Ship-To Phone", purchaseOrder.shipToPhone || "—"],
    ["Ship Via", purchaseOrder.shipVia || "—"],
    ["F.O.B.", purchaseOrder.fob || "—"],
    ["Shipping Terms", purchaseOrder.shippingTerms || "—"],
    ["Notes", purchaseOrder.notes || "—"],
  ];

  const rows = (purchaseOrder.items || []).map((item, i) => [
    item.itemNo || i + 1,
    item.description,
    item.quantity,
    formatPeso(item.unitPrice),
    formatPeso(item.lineTotal),
  ]);

  // Totals go at the bottom of the table, like an invoice
  rows.push(["", "", "", "Subtotal", formatPeso(purchaseOrder.subtotal)]);
  rows.push([
    "",
    "",
    "",
    "Tax (" + (purchaseOrder.taxRate || 0) + "%)",
    formatPeso(purchaseOrder.tax),
  ]);
  rows.push(["", "", "", "Shipping", formatPeso(purchaseOrder.shipping)]);
  rows.push(["", "", "", "Total", formatPeso(purchaseOrder.total)]);

  showTablePopup(
    "Purchase Order Details",
    ["Item No.", "Item / Description", "Qty", "Unit Price", "Line Total"],
    rows,
    details,
  );
}

/* Popup with the details of one delivery receipt (Delivery Receipt Log). */
function showDeliveryDetails(delivery) {
  const purchaseOrder = getPurchaseOrders().find(
    (po) => po.id === delivery.poId,
  );

  const details = [
    ["DR Number", delivery.id],
    ["PO Number", delivery.poId],
    ["Vendor", purchaseOrder ? purchaseOrder.vendor : "—"],
    ["Date Received", delivery.dateReceived],
    ["Received By", delivery.receivedBy],
    ["Condition", delivery.condition],
    ["Remarks", delivery.remarks || "—"],
    [
      "Proof of Delivery",
      delivery.proofFileName
        ? delivery.proofFileName + " (file name only)"
        : "None attached",
    ],
  ];

  // What was ordered on the PO, for checking against what arrived
  const rows =
    purchaseOrder && purchaseOrder.items
      ? purchaseOrder.items.map((item, i) => [
          item.itemNo || i + 1,
          item.description,
          item.quantity,
        ])
      : [];

  showTablePopup(
    "Delivery Receipt Details",
    ["Item No.", "Item / Description (as ordered)", "Qty Ordered"],
    rows,
    details,
    "No item list found for this purchase order.",
  );
}
