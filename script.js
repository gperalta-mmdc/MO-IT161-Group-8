/* ==========================================================

  SHARED FUNCTIONS (reusable on every page)
     1  Page Setup (DOMContentLoaded)
     2  Highlight sidebar nav link for the current page
     3  Header button elements
     4  Show date on dashboard
     5  Card menus
     6  Popup notification - lower right corner
     7  Generic popup screen - placeholder

  PAGE-SPECIFIC FUNCTIONS (only used on one page)
     1  Login page (index.html only)
     2  Purchase Requisition page (requisition.html only)
     3  Invoice Processing page (Invoice Processing.html only)
     4  Vendor Management page (Vendor Management.html only)
   ========================================================== */

/* PART 1 - SHARED FUNCTIONS */

document.addEventListener("DOMContentLoaded", () => {
  highlightActiveNavLink();
  setupHeaderButtons();
  showTodayDate();
  setupCardMenus();

  /* ----- index.html only -----*/
  if (document.getElementById("login-form")) {
    setupLoginForm();
    setupLoginLinks();
  }

  /* ----- for requisition.html only -----*/
  if (document.getElementById("requisition-form")) {
    setupRequisitionForm();
    setupRequisitionTable();
  }

  /* ----- for Invoice Processing.html only -----*/
  if (document.getElementById("invoice-form")) {
    setupInvoiceForm();
    setupInvoiceReviewTable();
    setupInvoiceDecisionForm();
  }

  /* ----- for Vendor Management.html only -----*/
  if (document.getElementById("vendor-form")) {
    setupVendorForm();
    setupVendorTable();
    setupVendorDocumentsTable();
  }
});

/* Highlight sidebar nav link for the current page */
function highlightActiveNavLink() {
  const currentPage = window.location.pathname.split("/").pop();
  const navLinks = document.querySelectorAll(".navigation ul li a");

  navLinks.forEach((link) => {
    const linkPage = link.getAttribute("href");
    if (linkPage === currentPage) {
      link.classList.add("active-link");
    }
  });
}

/* ----- Header button elements ----- */
function setupHeaderButtons() {
  const notifBtn = document.getElementById("notifBtn");
  const editProfileBtn = document.getElementById("editProfileBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const downloadReportBtn = document.getElementById("downloadReportBtn");
  const viewSummaryBtn = document.getElementById("viewSummaryBtn");

  if (notifBtn) {
    notifBtn.addEventListener("click", () => {
      showMessage("You have new notifications.");
    });
  }

  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      showPopup();
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      showPopup();
    });
  }

  if (downloadReportBtn) {
    downloadReportBtn.addEventListener("click", () => {
      showMessage("Preparing report download...");
    });
  }

  if (viewSummaryBtn) {
    viewSummaryBtn.addEventListener("click", () => {
      showPopup();
    });
  }
}

/* ----- Show date on dashboard ----- */
function showTodayDate() {
  const dateLabel = document.getElementById("today-label");

  if (dateLabel) {
    dateLabel.textContent = "Today is " + new Date().toDateString();
  }
}

/* ----- Card menus ----- */
function setupCardMenus() {
  const menuButtons = document.querySelectorAll(".card-menu-btn");
  const dismissButtons = document.querySelectorAll(".dismiss-btn");

  menuButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".card");
      const menu = card.querySelector(".card-menu");
      const wasOpen = menu.classList.contains("show");

      closeAllMenus(); // close any menu that is open
      if (!wasOpen) {
        menu.classList.add("show"); // open this one (unless it was just closed)
      }
    });
  });

  dismissButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".card");
      card.remove();
    });
  });

  // Clicking anywhere that is not a menu button or a menu closes the menus
  document.addEventListener("click", (event) => {
    const clickedMenuButton = event.target.closest(".card-menu-btn");
    const clickedInsideMenu = event.target.closest(".card-menu");

    if (!clickedMenuButton && !clickedInsideMenu) {
      closeAllMenus();
    }
  });
}

function closeAllMenus() {
  const menus = document.querySelectorAll(".card-menu");
  menus.forEach((menu) => {
    menu.classList.remove("show");
  });
}

/* ----- Popup notification - lower right corner ----- */
function showMessage(text) {
  // Remove the previous message first so they don't pile up
  const oldMessage = document.querySelector(".popup-message");
  if (oldMessage) {
    oldMessage.remove();
  }

  const message = document.createElement("div");
  message.className = "popup-message";
  message.textContent = text;
  document.body.appendChild(message);

  setTimeout(() => {
    message.remove();
  }, 3000);
}

/* ----- Generic popup screen- placeholder ----- */
function showPopup() {
  closePopup(); // remove the previous popup first

  const overlay = document.createElement("div");
  overlay.id = "popup-overlay";
  overlay.className = "popup-overlay";

  const box = document.createElement("div");
  box.className = "popup-box";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn-content";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", closePopup);
  box.appendChild(closeBtn);

  // Clicking the dark background (outside the box) also closes the popup
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closePopup();
    }
  });

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function closePopup() {
  const overlay = document.getElementById("popup-overlay");
  if (overlay) {
    overlay.remove();
  }
}

/* PART 2 - PAGE-SPECIFIC FUNCTIONS */

/* ----- Login page (index.html only) ----- */
function setupLoginForm() {
  const form = document.getElementById("login-form");
  const department = document.getElementById("loginDepartment");

  form.addEventListener("submit", (event) => {
    if (department.selectedIndex === 0) {
      event.preventDefault(); // stop the page from navigating to dashboard.html
      showMessage("Please select a department.");
    }
  });
}

function setupLoginLinks() {
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  const contactAdminLink = document.getElementById("contactAdminLink");

  forgotPasswordLink.addEventListener("click", (event) => {
    event.preventDefault(); // href="#" would otherwise jump to the top of the page
    showMessage("Password reset is not implemented yet.");
  });

  contactAdminLink.addEventListener("click", (event) => {
    event.preventDefault();
    showMessage("Contact your administrator screen not implemented yet.");
  });
}

/* ----- Purchase Requisition page (requisition.html only)----- */
function setupRequisitionForm() {
  const form = document.getElementById("requisition-form");
  const viewBtn = document.getElementById("viewRequisitionBtn");
  const submitBtn = document.getElementById("submitRequisitionBtn");

  viewBtn.addEventListener("click", () => {
    showPopup();
  });

  submitBtn.addEventListener("click", () => {
    const requestedBy = document.getElementById("requestedBy").value;
    const department = document.getElementById("department");
    const itemInputs = document.querySelectorAll(".item-desc");

    // Check if at least one item description was typed in
    let hasItem = false;
    itemInputs.forEach((input) => {
      if (input.value.trim() !== "") {
        hasItem = true;
      }
    });

    // Stop at the first problem and tell the user what is missing
    if (requestedBy.trim() === "") {
      showMessage("Please enter who is requesting.");
      return;
    }

    if (department.selectedIndex === 0) {
      showMessage("Please select a department.");
      return;
    }

    if (hasItem === false) {
      showMessage("Please list at least one item.");
      return;
    }

    showMessage("Requisition submitted for approval.");
    form.reset(); // clear the form
  });
}

/* ----- Buttons inside the Submitted Requisitions table ----- */
function setupRequisitionTable() {
  const viewButtons = document.querySelectorAll(".js-view");
  const printButtons = document.querySelectorAll(".js-print");
  const withdrawButtons = document.querySelectorAll(".js-withdraw");
  const viewAllBtn = document.getElementById("viewAllBtn");

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPopup();
    });
  });

  printButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("tr");
      const id = row.cells[0].textContent.trim();
      showMessage("Printing " + id + "...");
    });
  });

  withdrawButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("tr");
      const id = row.cells[0].textContent.trim();
      const statusCell = row.cells[5];
      const status = statusCell.textContent.trim();

      // Only a pending requisition can be withdrawn
      if (status === "Pending") {
        statusCell.textContent = "Withdrawn";
        showMessage(id + " has been withdrawn.");
      } else {
        showMessage(id + " cannot be withdrawn (status: " + status + ").");
      }
    });
  });

  viewAllBtn.addEventListener("click", () => {
    showPopup();
  });
}

/* ----- Invoice Processing page (Invoice Processing.html only) ----- */
function setupInvoiceForm() {
  const submitBtn = document.getElementById("submitInvoiceBtn");
  const invoiceNumber = document.getElementById("invoiceNumber");
  const invoiceVendor = document.getElementById("invoiceVendor");
  const invoicePO = document.getElementById("invoicePO");
  const invoiceAmount = document.getElementById("invoiceAmount");
  const form = document.getElementById("invoice-form");

  submitBtn.addEventListener("click", () => {
    // Stop at the first problem and tell the user what is missing
    if (invoiceNumber.value.trim() === "") {
      showMessage("Please enter the invoice number.");
      return;
    }

    if (invoiceVendor.selectedIndex === 0) {
      showMessage("Please select a vendor.");
      return;
    }

    if (invoicePO.selectedIndex === 0) {
      showMessage("Please select the matched purchase order.");
      return;
    }

    if (invoiceAmount.value.trim() === "" || Number(invoiceAmount.value) <= 0) {
      showMessage("Please enter a valid invoice amount.");
      return;
    }

    showMessage(invoiceNumber.value.trim() + " submitted for approval.");
    form.reset(); // clear the form
  });
}

/* ----- Buttons inside the Invoices Awaiting Review table ----- */
function setupInvoiceReviewTable() {
  const reviewButtons = document.querySelectorAll(".js-review-invoice");

  reviewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPopup();
    });
  });
}

/* ----- Approve / Reject Invoice form ----- */
function setupInvoiceDecisionForm() {
  const invoiceNumberInput = document.getElementById("decisionInvoiceNumber");
  const approveBtn = document.getElementById("approveInvoiceBtn");
  const rejectBtn = document.getElementById("rejectInvoiceBtn");

  approveBtn.addEventListener("click", () => {
    const id = invoiceNumberInput.value.trim();

    if (id === "") {
      showMessage("Please enter the invoice number.");
      return;
    }

    showMessage(id + " approved for payment.");
    invoiceNumberInput.value = "";
  });

  rejectBtn.addEventListener("click", () => {
    const id = invoiceNumberInput.value.trim();

    if (id === "") {
      showMessage("Please enter the invoice number.");
      return;
    }

    showMessage(id + " rejected and returned to vendor.");
    invoiceNumberInput.value = "";
  });
}

/* ----- Vendor Management page (Vendor Management.html only) ----- */
function setupVendorForm() {
  const addBtn = document.getElementById("addVendorBtn");
  const vendorName = document.getElementById("vendorName");
  const vendorCategory = document.getElementById("vendorCategory");
  const contactPerson = document.getElementById("contactPerson");
  const vendorEmail = document.getElementById("vendorEmail");
  const form = document.getElementById("vendor-form");

  addBtn.addEventListener("click", () => {
    // Stop at the first problem and tell the user what is missing
    if (vendorName.value.trim() === "") {
      showMessage("Please enter the vendor name.");
      return;
    }

    if (vendorCategory.selectedIndex === 0) {
      showMessage("Please select a category.");
      return;
    }

    if (contactPerson.value.trim() === "") {
      showMessage("Please enter a contact person.");
      return;
    }

    if (vendorEmail.value.trim() === "") {
      showMessage("Please enter the vendor's email address.");
      return;
    }

    showMessage(vendorName.value.trim() + " added to the vendor directory.");
    form.reset(); // clear the form
  });
}

/* ----- Buttons inside the Vendor Directory table ----- */
function setupVendorTable() {
  const viewButtons = document.querySelectorAll(".js-view-vendor");
  const editButtons = document.querySelectorAll(".js-edit-vendor");

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPopup();
    });
  });

  editButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPopup();
    });
  });
}

/* ----- Buttons inside the Vendor Documents Expiring Soon table ----- */
function setupVendorDocumentsTable() {
  const renewButtons = document.querySelectorAll(".js-renew-document");

  renewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("tr");
      const vendor = row.cells[0].textContent.trim();
      showMessage("Renewal request sent for " + vendor + ".");
    });
  });
}
