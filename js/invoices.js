/* ----- Invoice Processing Module (invoices.html only) ----- */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("invoice-pending-table-body")) {
    setupInvoicePage();
  }
});

/* Loads everything the page needs from the server, then redraws it */
async function refreshInvoicePage() {
  const results = await Promise.allSettled([
    loadInvoices(),
    loadVendors(),
    loadDeliveries(),
  ]);

  if (results.some((result) => result.status === "rejected")) {
    console.error("Could not load some invoice page data:", results);
    showMessage("Could not load all data from the server.");
  }

  renderInvoiceTables();
  populateInvoiceVendorOptions();
  populateInvoicePoOptions();
  populateInvoiceDeliveryOptions("");

  if (typeof setupRoleAccess === "function") {
    setupRoleAccess();
  }
}

function setupInvoicePage() {
  refreshInvoicePage();

  const pendingTableBody = document.getElementById("invoice-pending-table-body");
  const invoiceForm = document.getElementById("invoice-record-form");
  const poSelect = document.getElementById("invoicePO");
  const vendorSelect = document.getElementById("invoiceVendor");
  const submitBtn = document.getElementById("submitInvoiceBtn");
  const approveBtn = document.getElementById("approveInvoiceBtn");
  const rejectBtn = document.getElementById("rejectInvoiceBtn");
  const viewHistoryBtn = document.getElementById("viewInvoiceBtn");

  // "Review Invoice" in the awaiting-review table fills in the decision form
  pendingTableBody.addEventListener("click", (event) => {
    const button = event.target.closest(".js-review-invoice");
    if (!button) return;

    const row = button.closest("tr");
    document.getElementById("decisionInvoiceNumber").value =
      row.getAttribute("data-id");
    document.getElementById("decisionRemarks").focus();
  });

  // Picking a PO lists its delivery receipts and suggests its vendor
  poSelect.addEventListener("change", () => {
    const poId = poSelect.selectedIndex === 0 ? "" : poSelect.value;
    populateInvoiceDeliveryOptions(poId);

    const purchaseOrder = getPurchaseOrders().find((po) => po.id === poId);
    if (purchaseOrder) {
      for (let i = 0; i < vendorSelect.options.length; i++) {
        if (vendorSelect.options[i].value === purchaseOrder.vendor) {
          vendorSelect.selectedIndex = i;
          break;
        }
      }
    }
  });

  // "Submit for Approval" button
  submitBtn.addEventListener("click", async () => {
    const invoiceDate = document.getElementById("invoiceDate").value;
    const amount = document.getElementById("invoiceAmount").value;
    const deliverySelect = document.getElementById("invoiceDeliveryReceipt");
    const remarks = document.getElementById("invoiceRemarks");
    const fileInput = document.getElementById("invoiceFile");

    if (vendorSelect.selectedIndex === 0) {
      showMessage("Please select a vendor.");
      return;
    }

    if (poSelect.selectedIndex === 0) {
      showMessage("Please select the matched purchase order.");
      return;
    }

    if (invoiceDate === "") {
      showMessage("Please select the invoice date.");
      return;
    }

    if (amount.trim() === "" || Number(amount) <= 0) {
      showMessage("Please enter a valid invoice amount.");
      return;
    }

    const invoice = {
      vendor: vendorSelect.value,
      poId: poSelect.value,
      deliveryReceipt:
        deliverySelect.selectedIndex === 0 ? "" : deliverySelect.value,
      invoiceDate: invoiceDate,
      amount: Number(amount),
      remarks: remarks.value.trim(),
      invoiceFileName:
        fileInput && fileInput.files.length ? fileInput.files[0].name : "",
    };

    // Send the invoice to the server to be stored in the database
    submitBtn.disabled = true;
    let saved;
    try {
      saved = await createInvoice(invoice);
    } catch (error) {
      showMessage(error.message);
      return;
    } finally {
      submitBtn.disabled = false;
    }

    showMessage(saved.id + " submitted for approval.");
    invoiceForm.reset();
    populateInvoiceDeliveryOptions("");
    renderInvoiceTables();
  });

  approveBtn.addEventListener("click", () => {
    decideInvoice("Approved for Payment");
  });

  rejectBtn.addEventListener("click", () => {
    decideInvoice("Rejected");
  });

  // "View History" scrolls down to the history log
  if (viewHistoryBtn) {
    viewHistoryBtn.addEventListener("click", () => {
      const historyBody = document.getElementById("invoice-history-table-body");
      historyBody.closest("fieldset").scrollIntoView({ behavior: "smooth" });
    });
  }
}

/* Approve or reject the invoice typed into the decision form */
async function decideInvoice(status) {
  const numberInput = document.getElementById("decisionInvoiceNumber");
  const remarksInput = document.getElementById("decisionRemarks");
  const id = numberInput.value.trim().toUpperCase();

  if (id === "") {
    showMessage("Please enter the invoice number.");
    return;
  }

  const invoice = getInvoices().find((item) => item.id === id);
  if (!invoice) {
    showMessage(id + " was not found.");
    return;
  }

  if (invoice.status !== "Pending Review") {
    showMessage(id + " has already been decided (" + invoice.status + ").");
    return;
  }

  try {
    await updateInvoice(id, {
      status: status,
      remarks: remarksInput.value.trim(),
    });
  } catch (error) {
    showMessage(error.message);
    return;
  }

  showMessage(
    id +
      (status === "Rejected"
        ? " rejected and returned to vendor."
        : " approved for payment."),
  );
  numberInput.value = "";
  remarksInput.value = "";
  renderInvoiceTables();
}

/* Rebuilds the Awaiting Review table and the History Log from the loaded invoices */
function renderInvoiceTables() {
  const pendingBody = document.getElementById("invoice-pending-table-body");
  const historyBody = document.getElementById("invoice-history-table-body");

  pendingBody.innerHTML = "";
  historyBody.innerHTML = "";

  getInvoices().forEach((invoice) => {
    const baseCells = [
      invoice.id,
      invoice.vendor,
      invoice.poId,
      invoice.deliveryReceipt || "—",
      formatInvoiceAmount(invoice.amount),
    ];

    if (invoice.status === "Pending Review") {
      const row = buildInvoiceRow(
        invoice.id,
        baseCells.concat([invoice.invoiceDate, invoice.status]),
      );

      const actionCell = document.createElement("td");
      const wrapper = document.createElement("div");
      wrapper.className = "btn-action";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn-content js-review-invoice";
      button.textContent = "Review Invoice";
      wrapper.appendChild(button);
      actionCell.appendChild(wrapper);
      row.appendChild(actionCell);

      pendingBody.appendChild(row);
    } else {
      historyBody.appendChild(
        buildInvoiceRow(
          invoice.id,
          baseCells.concat([
            invoice.status,
            invoice.updatedAt ? String(invoice.updatedAt).slice(0, 10) : "—",
          ]),
        ),
      );
    }
  });

  if (pendingBody.children.length === 0) {
    addEmptyInvoiceRow(pendingBody, 8, "No invoices awaiting review.");
  }
  if (historyBody.children.length === 0) {
    addEmptyInvoiceRow(historyBody, 7, "No processed invoices yet.");
  }
}

/* One table row made of plain-text cells (so typed text can never be read as HTML) */
function buildInvoiceRow(id, cells) {
  const row = document.createElement("tr");
  row.setAttribute("data-id", id);
  cells.forEach((text) => {
    const cell = document.createElement("td");
    cell.textContent = text;
    row.appendChild(cell);
  });
  return row;
}

function addEmptyInvoiceRow(tableBody, columns, text) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = columns;
  cell.textContent = text;
  row.appendChild(cell);
  tableBody.appendChild(row);
}

function formatInvoiceAmount(amount) {
  return Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* Vendor dropdown: active vendors, plus any vendor already named on a purchase order */
function populateInvoiceVendorOptions() {
  const select = document.getElementById("invoiceVendor");
  const names = [];

  getVendors()
    .filter((vendor) => vendor.status === "Active")
    .forEach((vendor) => names.push(vendor.name));
  getPurchaseOrders().forEach((po) => {
    if (po.vendor && !names.includes(po.vendor)) names.push(po.vendor);
  });

  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.textContent = "-- Select Vendor --";
  select.appendChild(placeholder);

  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

/* Purchase order dropdown: every PO that has not been cancelled */
function populateInvoicePoOptions() {
  const select = document.getElementById("invoicePO");
  const eligible = getPurchaseOrders().filter((po) => po.status !== "Cancelled");

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

/* Delivery receipt dropdown: only the receipts recorded for the chosen PO */
function populateInvoiceDeliveryOptions(poId) {
  const select = document.getElementById("invoiceDeliveryReceipt");

  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.textContent = "-- Select Delivery Receipt (optional) --";
  select.appendChild(placeholder);

  if (poId === "") return;

  getDeliveries()
    .filter((delivery) => delivery.poId === poId)
    .forEach((delivery) => {
      const option = document.createElement("option");
      option.value = delivery.id;
      option.textContent =
        delivery.id + " — received " + delivery.dateReceived;
      select.appendChild(option);
    });
}
