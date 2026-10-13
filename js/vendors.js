/* ----- Vendor Management Module (vendors.html only) ----- */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("vendor-table-body")) {
    setupVendorPage();
  }
});

let editingVendorId = null; // null = adding a new vendor, otherwise the ID being edited

/* Loads the vendors from the server, then redraws the directory */
async function refreshVendorPage() {
  try {
    await loadVendors();
  } catch (error) {
    console.error("Could not load vendors:", error);
    showMessage("Could not load vendors from the server.");
  }

  renderVendorTable();

  if (typeof setupRoleAccess === "function") {
    setupRoleAccess();
  }
}

function setupVendorPage() {
  refreshVendorPage();

  const tableBody = document.getElementById("vendor-table-body");
  const saveBtn = document.getElementById("addVendorBtn");
  const cancelEditBtn = document.getElementById("cancelVendorEditBtn");

  // View / Edit buttons in the Vendor Directory
  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const row = button.closest("tr");
    const vendor = getVendors().find((v) => v.id === row.getAttribute("data-id"));
    if (!vendor) return;

    if (button.classList.contains("js-view-vendor")) {
      showVendorDetails(vendor);
    }

    if (button.classList.contains("js-edit-vendor")) {
      startVendorEdit(vendor);
    }
  });

  // "Request Renewal" buttons in the Documents Expiring Soon table
  document.querySelectorAll(".js-renew-document").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("tr");
      const vendor = row.cells[0].textContent.trim();
      showMessage("Renewal request sent for " + vendor + ".");
    });
  });

  cancelEditBtn.addEventListener("click", () => {
    endVendorEdit();
    showMessage("Edit cancelled.");
  });

  // "Add Vendor" / "Save Changes" button
  saveBtn.addEventListener("click", async () => {
    const name = document.getElementById("vendorName");
    const category = document.getElementById("vendorCategory");
    const contactPerson = document.getElementById("contactPerson");
    const email = document.getElementById("vendorEmail");
    const phone = document.getElementById("vendorPhone");
    const address = document.getElementById("vendorAddress");
    const tin = document.getElementById("vendorTin");
    const status = document.getElementById("vendorStatus");

    if (name.value.trim() === "") {
      showMessage("Please enter the vendor name.");
      return;
    }

    if (category.selectedIndex === 0) {
      showMessage("Please select a category.");
      return;
    }

    if (contactPerson.value.trim() === "") {
      showMessage("Please enter a contact person.");
      return;
    }

    if (email.value.trim() === "") {
      showMessage("Please enter the vendor's email address.");
      return;
    }

    const duplicate = getVendors().some(
      (v) =>
        v.name.toLowerCase() === name.value.trim().toLowerCase() &&
        v.id !== editingVendorId,
    );
    if (duplicate) {
      showMessage(name.value.trim() + " is already in the vendor directory.");
      return;
    }

    const vendor = {
      name: name.value.trim(),
      category: category.value,
      contactPerson: contactPerson.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      address: address.value.trim(),
      tin: tin.value.trim(),
      status: status.value,
    };

    // Send the vendor to the server to be stored in the database
    saveBtn.disabled = true;
    let saved;
    try {
      if (editingVendorId) {
        saved = await updateVendor(editingVendorId, vendor);
      } else {
        saved = await createVendor(vendor);
      }
    } catch (error) {
      showMessage(error.message);
      return;
    } finally {
      saveBtn.disabled = false;
    }

    showMessage(
      saved.id + (editingVendorId ? " updated." : " added to the directory."),
    );
    endVendorEdit();
    renderVendorTable();
  });
}

/* Puts a vendor's details into the form so they can be changed */
function startVendorEdit(vendor) {
  editingVendorId = vendor.id;

  document.getElementById("vendorName").value = vendor.name;
  document.getElementById("vendorCategory").value = vendor.category;
  document.getElementById("contactPerson").value = vendor.contactPerson;
  document.getElementById("vendorEmail").value = vendor.email;
  document.getElementById("vendorPhone").value = vendor.phone || "";
  document.getElementById("vendorAddress").value = vendor.address || "";
  document.getElementById("vendorTin").value = vendor.tin || "";
  document.getElementById("vendorStatus").value = vendor.status;

  document.getElementById("vendor-form-legend").textContent =
    "Edit Vendor (" + vendor.id + ")";
  document.getElementById("addVendorBtn").textContent = "Save Changes";
  document.getElementById("cancelVendorEditBtn").hidden = false;

  document
    .getElementById("vendor-record-form")
    .closest("fieldset")
    .scrollIntoView({ behavior: "smooth" });
}

/* Back to "Add New Vendor" mode with an empty form */
function endVendorEdit() {
  editingVendorId = null;

  document.getElementById("vendor-record-form").reset();
  document.getElementById("vendor-form-legend").textContent = "Add New Vendor";
  document.getElementById("addVendorBtn").textContent = "Add Vendor";
  document.getElementById("cancelVendorEditBtn").hidden = true;
}

/* Rebuilds the Vendor Directory table from the loaded vendors */
function renderVendorTable() {
  const tableBody = document.getElementById("vendor-table-body");
  tableBody.innerHTML = "";

  getVendors().forEach((vendor) => {
    const row = document.createElement("tr");
    row.setAttribute("data-id", vendor.id);

    [
      vendor.id,
      vendor.name,
      vendor.category,
      vendor.contactPerson,
      vendor.status,
    ].forEach((text) => {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.appendChild(cell);
    });

    const actionCell = document.createElement("td");
    const wrapper = document.createElement("div");
    wrapper.className = "btn-action";

    const viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.className = "btn-content js-view-vendor";
    viewButton.textContent = "View";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "btn-content js-edit-vendor";
    editButton.textContent = "Edit";

    wrapper.appendChild(viewButton);
    wrapper.appendChild(editButton);
    actionCell.appendChild(wrapper);
    row.appendChild(actionCell);

    tableBody.appendChild(row);
  });

  if (tableBody.children.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "No vendors yet. Add one using the form below.";
    row.appendChild(cell);
    tableBody.appendChild(row);
  }
}

/* Opens the popup screen and fills it with one vendor's details */
function showVendorDetails(vendor) {
  showPopup();

  const box = document.querySelector("#popup-overlay .popup-box");
  if (!box) return;

  const details = document.createElement("div");
  details.style.textAlign = "left";
  details.style.marginBottom = "15px";

  const title = document.createElement("h3");
  title.textContent = vendor.name;
  details.appendChild(title);

  [
    ["Vendor ID", vendor.id],
    ["Category", vendor.category],
    ["Contact Person", vendor.contactPerson],
    ["Email", vendor.email],
    ["Phone", vendor.phone || "—"],
    ["Address", vendor.address || "—"],
    ["TIN", vendor.tin || "—"],
    ["Status", vendor.status],
  ].forEach((pair) => {
    const line = document.createElement("p");
    const label = document.createElement("strong");
    label.textContent = pair[0] + ": ";
    line.appendChild(label);
    line.appendChild(document.createTextNode(pair[1]));
    details.appendChild(line);
  });

  box.insertBefore(details, box.firstChild);
}
