/* ----- 4 Approvals Module (approvals.html only) ----- */

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
