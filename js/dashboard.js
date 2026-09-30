/* ----- Dashboard page (dashboard.html only) ----- */

document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".dashboard-stepper")) {
    setupDashboardCounts();
  }
});

function setupDashboardCounts() {
  const requisitions = getRequisitions();
  const purchaseOrders = getPurchaseOrders();

  const pending = requisitions.filter((r) => r.status === "Pending").length;
  const approved = requisitions.filter((r) => r.status === "Approved");
  const awaitingPo = approved.filter((r) => !r.poId).length;
  const activePOs = purchaseOrders.filter((po) => po.status === "Active");
  const poVolume = purchaseOrders
    .filter((po) => po.status !== "Cancelled")
    .reduce((sum, po) => sum + Number(po.total || 0), 0);

  // Dashboard cards
  setCardCount("Purchase Requisition", requisitions.length);
  setCardCount("Approvals", pending);
  setCardCount("Purchase Orders", awaitingPo);
  setCardCount("Delivery Receipts", activePOs.length);

  // Workflow Summary modal
  setSummaryMetric(
    "Total Requisitions",
    requisitions.length,
    pending + " pending review",
  );
  setSummaryMetric(
    "Approved Requisitions",
    approved.length,
    awaitingPo + " ready for PO creation",
  );
  setSummaryMetric("Active Purchase Orders", activePOs.length);
  setSummaryMetric("Total PO Volume", formatPeso(poVolume));
}

/* Finds the dashboard card whose <h3> matches cardTitle and updates its count. */
function setCardCount(cardTitle, count) {
  const cards = document.querySelectorAll(".card");
  for (const card of cards) {
    const heading = card.querySelector("h3");
    if (heading && heading.textContent.trim() === cardTitle) {
      const countSpan = card.querySelector(".card-count");
      if (countSpan) countSpan.textContent = count;
      return;
    }
  }
}

/* Finds the Workflow Summary metric by its label and updates value (and note). */
function setSummaryMetric(label, value, note) {
  const metrics = document.querySelectorAll(".workflow-metric");
  for (const metric of metrics) {
    const labelEl = metric.querySelector(".workflow-metric-label");
    if (labelEl && labelEl.textContent.trim() === label) {
      metric.querySelector("strong").textContent = value;
      if (note !== undefined) {
        metric.querySelector(".workflow-metric-note").textContent = note;
      }
      return;
    }
  }
}
