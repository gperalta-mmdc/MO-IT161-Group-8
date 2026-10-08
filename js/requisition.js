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

  // "View Requisition" - shows what's currently typed in, before submitting
  viewBtn.addEventListener("click", () => {
    showRequisitionPreview();
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
    form.reset();
    fillRequestedBy();
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
      showRequisitionDetails(requisition);
    } else if (button.classList.contains("js-print")) {
      showMessage("Printing " + requisition.id + "...");
    } else if (button.classList.contains("js-withdraw")) {
      requisition.status = "Withdrawn";
      saveRequisitions(requisitions);
      renderRequisitionsTable();
      showMessage(requisition.id + " has been withdrawn.");
    }
  });

  //* "View History Button*//
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

/* Fills "Requested By" with the logged-in user.*/
function fillRequestedBy() {
  const input = document.getElementById("requestedBy");
  const name = localStorage.getItem("procureit-name");
  if (!input || !name) return;
  input.value = name;
  input.readOnly = localStorage.getItem("procureit-role") === "requisitioner";
}

/* Shows the requisition currently being filled in (not yet submitted). */
function showRequisitionPreview() {
  const items = collectRequisitionItems();
  if (items === null) return; // collectRequisitionItems already showed the message

  const department = document.getElementById("department");
  const details = [
    ["Requisition ID", document.getElementById("requisitionIdPreview").value],
    [
      "Requested By",
      document.getElementById("requestedBy").value.trim() || "—",
    ],
    ["Department", department.selectedIndex === 0 ? "—" : department.value],
    ["Date Submitted", document.getElementById("requisitionDate").value || "—"],
    [
      "Reason for Request",
      document.getElementById("requisitionReason").value.trim() || "—",
    ],
    ["Status", "Draft (not yet submitted)"],
  ];

  const rows = items.map((item, i) => [
    i + 1,
    item.description,
    item.quantity,
    item.unit,
  ]);

  showTablePopup(
    "Requisition Preview",
    ["#", "Item / Description", "Quantity", "Unit"],
    rows,
    details,
    "No items listed yet.",
  );
}
