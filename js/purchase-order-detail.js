/* ----- 6 Purchase Order Detail Module (purchase-order-detail.html only) ----- */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("po-form")) {
    setupPurchaseOrderDetailPage();
  }
});

function setupPurchaseOrderDetailPage() {
  const form = document.getElementById("po-form");
  const calculateBtn = document.getElementById("calculatePoBtn");
  const saveBtn = document.getElementById("savePoBtn");
  const clearBtn = document.getElementById("clearPoBtn");
  const requisitionSelect = document.getElementById("poRequisition");

  document.getElementById("poNumber").value = peekNextId("purchaseOrder");
  const preselectId = getQueryParam("reqId");
  populatePoRequisitionOptions(preselectId);

  requisitionSelect.addEventListener("change", () => {
    applyRequisitionPrefill(requisitionSelect.value);
  });

  // "Calculate Total" button
  calculateBtn.addEventListener("click", () => {
    if (calculatePoTotals()) {
      showMessage("Totals updated.");
    }
  });

  // "Save Purchase Order" button
  saveBtn.addEventListener("click", () => {
    const requisitionSelectEl = document.getElementById("poRequisition");
    const poDate = document.getElementById("poDate");
    const requisitioner = document.getElementById("poRequisitioner");
    const department = document.getElementById("poDepartment");
    const vendor = document.getElementById("poVendor");
    const shipToName = document.getElementById("shipToName");
    const shipToAddress = document.getElementById("shipToAddress");
    const descInputs = document.querySelectorAll(".po-item-desc");
    const qtyInputs = document.querySelectorAll(".po-qty");
    const priceInputs = document.querySelectorAll(".po-price");

    if (requisitionSelectEl.selectedIndex === 0) {
      showMessage("Please select a requisition.");
      return;
    }

    if (poDate.value === "") {
      showMessage("Please select the order date.");
      return;
    }

    if (requisitioner.value.trim() === "") {
      showMessage("Please enter the requisitioner.");
      return;
    }

    if (department.selectedIndex === 0) {
      showMessage("Please select a department.");
      return;
    }

    if (vendor.selectedIndex === 0) {
      showMessage("Please select a vendor.");
      return;
    }

    if (shipToName.value.trim() === "") {
      showMessage("Please enter the ship-to name.");
      return;
    }

    if (shipToAddress.value.trim() === "") {
      showMessage("Please enter the ship-to address.");
      return;
    }

    if (document.getElementById("shipVia").selectedIndex === 0) {
      showMessage("Please select a Ship Via option.");
      return;
    }

    if (document.getElementById("fob").selectedIndex === 0) {
      showMessage("Please select an F.O.B. option.");
      return;
    }

    if (document.getElementById("shippingTerms").selectedIndex === 0) {
      showMessage("Please select the shipping terms.");
      return;
    }

    // Check each item row: a row with anything typed in it must be complete
    let itemCount = 0;
    for (let i = 0; i < descInputs.length; i++) {
      const hasDesc = descInputs[i].value.trim() !== "";
      const hasQty = Number(qtyInputs[i].value) > 0;
      const hasPrice = Number(priceInputs[i].value) > 0;

      if (hasDesc || hasQty || hasPrice) {
        if (!hasDesc) {
          showMessage("Please enter a description for item " + (i + 1) + ".");
          return;
        }
        if (!hasQty || !hasPrice) {
          showMessage(
            "Please enter a quantity and unit price for item " + (i + 1) + ".",
          );
          return;
        }
        itemCount++;
      }
    }

    if (itemCount === 0) {
      showMessage("Please list at least one item.");
      return;
    }

    // Make sure the totals are up to date before saving
    if (!calculatePoTotals()) {
      return;
    }

    const requisitions = getRequisitions();
    const requisition = requisitions.find(
      (r) => r.id === requisitionSelectEl.value,
    );
    if (!requisition) {
      showMessage(
        "That requisition is no longer available. Please choose another.",
      );
      populatePoRequisitionOptions();
      return;
    }

    const purchaseOrder = {
      id: generateId("purchaseOrder"),
      requisitionId: requisition.id,
      dateCreated: poDate.value,
      requisitioner: requisitioner.value.trim(),
      department: department.value,
      vendor: vendor.value,
      shipToName: shipToName.value.trim(),
      shipToAddress: shipToAddress.value.trim(),
      shipToPhone: document.getElementById("shipToPhone").value.trim(),
      shipVia: document.getElementById("shipVia").value,
      fob: document.getElementById("fob").value,
      shippingTerms: document.getElementById("shippingTerms").value,
      expectedDelivery: document.getElementById("expectedDelivery").value,
      items: collectPoItemLines(),
      subtotal: document.getElementById("poSubtotal").value,
      taxRate: document.getElementById("poTaxRate").value,
      tax: document.getElementById("poTax").value,
      shipping: document.getElementById("poShipping").value,
      total: document.getElementById("poTotal").value,
      notes: document.getElementById("poNotes").value.trim(),
      status: "Active",
    };

    // Link the requisition to this PO so it drops off the awaiting-PO list
    requisition.poId = purchaseOrder.id;
    saveRequisitions(requisitions);

    const purchaseOrders = getPurchaseOrders();
    purchaseOrders.push(purchaseOrder);
    savePurchaseOrders(purchaseOrders);

    showMessage(
      "Purchase order " +
        purchaseOrder.id +
        " for " +
        vendor.value +
        " saved. Total: " +
        purchaseOrder.total +
        ".",
    );
    form.reset();
    document.getElementById("poNumber").value = peekNextId("purchaseOrder");
    populatePoRequisitionOptions();
  });

  // "Clear Form" button
  clearBtn.addEventListener("click", () => {
    form.reset();
    document.getElementById("poNumber").value = peekNextId("purchaseOrder");
    populatePoRequisitionOptions();
    showMessage("Form cleared.");
  });
}

/* Fills the requisition dropdown with Approved requisitions */
function populatePoRequisitionOptions(preselectId) {
  const select = document.getElementById("poRequisition");
  const eligible = getRequisitions().filter(
    (r) => r.status === "Approved" && !r.poId,
  );

  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.textContent = "-- Select Approved Requisition --";
  select.appendChild(placeholder);

  eligible.forEach((requisition) => {
    const option = document.createElement("option");
    option.value = requisition.id;
    option.textContent =
      requisition.id +
      " — " +
      requisition.department +
      " — " +
      requisition.requestedBy;
    select.appendChild(option);
  });

  if (preselectId) {
    select.value = preselectId;
    applyRequisitionPrefill(preselectId);
  }
}

/* Prefills Requisitioner, Department, and item rows from the selected requisition. */
function applyRequisitionPrefill(requisitionId) {
  const requisition = getRequisitions().find((r) => r.id === requisitionId);
  if (!requisition) return;

  document.getElementById("poRequisitioner").value = requisition.requestedBy;
  document.getElementById("poDepartment").value = requisition.department;

  const itemNoInputs = document.querySelectorAll(".po-item-no");
  const descInputs = document.querySelectorAll(".po-item-desc");
  const qtyInputs = document.querySelectorAll(".po-qty");
  const priceInputs = document.querySelectorAll(".po-price");
  const lineTotals = document.querySelectorAll(".po-line-total");

  // Clear all 5 rows first, then fill in what the requisition listed.
  for (let i = 0; i < descInputs.length; i++) {
    itemNoInputs[i].value = "";
    descInputs[i].value = "";
    qtyInputs[i].value = "";
    priceInputs[i].value = "";
    lineTotals[i].value = "0.00";
  }

  requisition.items.forEach((item, i) => {
    if (i >= descInputs.length) return; // safety; requisitions max out at 5 anyway
    descInputs[i].value = item.description;
    qtyInputs[i].value = item.quantity;
  });

  calculatePoTotals();
}

/* Reads one query string parameter from the current page URL. */
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/* Reads the item rows and returns the completed lines, for saving to storage. */
function collectPoItemLines() {
  const itemNos = document.querySelectorAll(".po-item-no");
  const descs = document.querySelectorAll(".po-item-desc");
  const qtys = document.querySelectorAll(".po-qty");
  const prices = document.querySelectorAll(".po-price");
  const lineTotals = document.querySelectorAll(".po-line-total");
  const items = [];

  for (let i = 0; i < descs.length; i++) {
    const description = descs[i].value.trim();
    const quantity = Number(qtys[i].value);
    const unitPrice = Number(prices[i].value);

    if (description !== "" && quantity > 0 && unitPrice > 0) {
      items.push({
        itemNo: itemNos[i].value.trim(),
        description: description,
        quantity: quantity,
        unitPrice: unitPrice,
        lineTotal: lineTotals[i].value,
      });
    }
  }

  return items;
}
