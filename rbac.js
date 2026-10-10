/* Demo login accounts */
const DEMO_ACCOUNTS = {
  staffprocureit: {
    password: "staff123",
    role: "requisitioner",
    name: "Peter Parker",
    department: "IT Staff",
  },
  approverprocureit: {
    password: "approver123",
    role: "approver",
    name: "Bruce Wayne",
    department: "IT Supervisor",
  },
  managerprocureit: {
    password: "manager123",
    role: "purchasing",
    name: "Tony Stark",
    department: "Purchasing Manager",
  },
};

/* Handles login form submission */
function setupLoginForm(formId = "login-form") {
  const loginForm = document.getElementById(formId);
  if (!loginForm) return;

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const usernameInput = document.getElementById("username").value.trim();
    const passwordInput = document.getElementById("password").value;
    const errorElement = document.getElementById("login-error");

    // Retrieve account directly by key from DEMO_ACCOUNTS object
    const account = DEMO_ACCOUNTS[usernameInput];

    if (account && account.password === passwordInput) {
      // Store user info in localStorage
      localStorage.setItem("procureit-role", account.role);
      localStorage.setItem("procureit-name", account.name);
      localStorage.setItem("procureit-department", account.department);

      // Redirect to the main application page
      window.location.href = "dashboard.html";
    } else {
      // Display error message
      if (errorElement) {
        errorElement.textContent = "Invalid username or password.";
        errorElement.style.display = "block";
      }
    }
  });
}

// Automatically initialize when index.html loads
document.addEventListener("DOMContentLoaded", () => {
  setupLoginForm();
});

/* Sets UI restrictions based on user role */
function setupRoleAccess() {
  const allowedRoles = ["requisitioner", "approver", "purchasing"];
  const pagePermissions = {
    "approvals.html": ["approver", "purchasing"],
    "purchase-order.html": ["purchasing"],
    "purchase-order-detail.html": ["purchasing"],
    "delivery.html": ["purchasing"],
    "invoices.html": ["purchasing"],
    "vendors.html": ["approver", "purchasing"],
    "inventory.html": ["approver", "purchasing"],
  };

  document.querySelectorAll("a[href]").forEach((link) => {
    const destination = link.getAttribute("href");
    const permittedRoles = pagePermissions[destination];
    if (permittedRoles) link.dataset.roleAccess = permittedRoles.join(" ");
  });

  const role = localStorage.getItem("procureit-role");
  const page = window.location.pathname.split("/").pop();

  if (!allowedRoles.includes(role)) {
    if (page && page !== "index.html") window.location.href = "index.html";
    return;
  }

  const applyRole = (selectedRole) => {
    document.querySelectorAll("[data-role-access]").forEach((element) => {
      const permitted = element.dataset.roleAccess
        .split(/\s+/)
        .includes(selectedRole);
      element.classList.toggle("role-restricted", !permitted);
      element.classList.toggle(
        "nav-restricted",
        !permitted && element.closest(".navigation") !== null,
      );
      element.classList.toggle("rbac-disabled", !permitted);
      element.setAttribute("aria-disabled", String(!permitted));
      const links = element.matches("a")
        ? [element]
        : element.querySelectorAll("a");
      links.forEach((link) => {
        if (!permitted) link.dataset.roleBlocked = "true";
        else delete link.dataset.roleBlocked;
      });
    });

    const roleName = selectedRole === "purchasing" ? "Purchasing Manager" : selectedRole;
    const bannerCopy =
      page === "approvals.html" && selectedRole === "requisitioner"
        ? "You are signed in as requisitioner. Only Approvers and Purchasing Managers have authority to approve or reject requisitions. Approval actions below are grayed out."
        : pagePermissions[page] && !pagePermissions[page].includes(selectedRole)
          ? ["purchase-order.html", "purchase-order-detail.html"].includes(page)
            ? `You are signed in as ${roleName}. Only the Purchasing Manager has permission to generate, authorize, and issue purchase orders. Action buttons are disabled.`
            : ["delivery.html", "invoices.html"].includes(page)
              ? `You are signed in as ${roleName}. Only the Purchasing Manager can access Delivery Receipts and Invoice Processing. Actions are disabled.`
              : `You are signed in as ${roleName}. Only Approvers and Purchasing Managers can access Vendor Management and Inventory and Asset Tagging. Actions are disabled.`
          : null;
    let banner = document.querySelector(".rbac-banner");
    if (bannerCopy) {
      if (!banner) {
        banner = document.createElement("div");
        banner.className = "rbac-banner";
        banner.setAttribute("role", "status");
        const insertionPoint =
          document.querySelector(".workflow-stepper") ||
          document.querySelector(".content hr");
        insertionPoint?.insertAdjacentElement("afterend", banner);
      }
      banner.textContent = bannerCopy;
    } else if (banner) {
      banner.remove();
    }

    const restrictedPage = Boolean(
      pagePermissions[page] && !pagePermissions[page].includes(selectedRole),
    );
    if (restrictedPage) {
      const content = document.querySelector(".content");
      content
        ?.querySelectorAll("button, input, select, textarea")
        .forEach((control) => {
          control.disabled = true;
          control.classList.add("rbac-disabled");
          control.dataset.rbacLocked = "true";
        });
      content?.querySelectorAll("a[href]").forEach((link) => {
        if (!link.closest(".navigation")) {
          link.classList.add("rbac-disabled");
          link.setAttribute("aria-disabled", "true");
          link.dataset.roleBlocked = "true";
        }
      });
    } else {
      document
        .querySelectorAll('.content [data-rbac-locked="true"]')
        .forEach((control) => {
          control.disabled = false;
          control.classList.remove("rbac-disabled");
          control.removeAttribute("aria-disabled");
          delete control.dataset.rbacLocked;
        });
      document
        .querySelectorAll('.content a[data-role-blocked="true"]')
        .forEach((link) => {
          link.classList.remove("rbac-disabled");
          link.removeAttribute("aria-disabled");
          delete link.dataset.roleBlocked;
        });
    }
  };

  applyRole(role);

  document.addEventListener("click", (event) => {
    if (event.target.closest('a[data-role-blocked="true"]')) {
      event.preventDefault();
    }
  });
}

/* Show the logged-in user's name/department */
function applyLoggedInProfile() {
  const name = localStorage.getItem("procureit-name");
  const department = localStorage.getItem("procureit-department");
  const nameEl = document.querySelector(".profile-name");
  const deptEl = document.querySelector(".profile-department");

  if (name && nameEl) nameEl.textContent = "Hello, " + name;
  if (department && deptEl) deptEl.textContent = department;
}

/* Clear the session when any "Log Out" button is used */
function setupLogout() {
  document.querySelectorAll('form[action="index.html"]').forEach((form) => {
    form.addEventListener("submit", () => {
      localStorage.removeItem("procureit-role");
      localStorage.removeItem("procureit-name");
      localStorage.removeItem("procureit-department");
    });
  });
}
