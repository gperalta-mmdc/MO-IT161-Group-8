document.addEventListener('DOMContentLoaded', () => {setupInventoryPage();
});

function setupInventoryPage() {
    setupInventoryFilters();
    setupAssignAsset();

    const addAssetBtn = document.getElementById("add-asset-btn")
    const removeAssetBtn = document.getElementById("remove-asset-btn")

    if (addAssetBtn) {
        addAssetBtn.addEventListener("click",() =>{
            showPopup("Add Assets", "Add New Equipment / Company Assets Here.")
        });
    }

    if (removeAssetBtn) {
        removeAssetBtn.addEventListener("click", () => {
            showPopup("Delete Asset", "Remove Equipment / Company Asset from Distribution")
        })
    }
}

function setupInventoryFilters () {
    const searchInput=document.getElementById("asset-search");
    const statusFilter = document.getElementById("status-filter");

    function applyFilters() {
        const searchText = searchInput.value.trim().toLowerCase();
        const wantedStatus = statusFilter.value;
        const rows = document.querySelectorAll("#asset-table-body tr");

        rows.forEach((row) => {
            const rowText = Array.from(row.cells)
            .slice (0, 4)
            .map((cell) => cell.textContent)
            .join(" ")
            .toLowerCase();

            const statusSelect = row.querySelector("select");
            if (!statusSelect) return;
            const rowStatus = statusSelect.value;

            const matchesSearch = rowText.includes(searchText);
            const matchesStatus = wantedStatus === "all" || rowStatus === wantedStatus;

            row.hidden = !(matchesSearch && matchesStatus);
        });
    }

    searchInput.addEventListener("input", applyFilters);
    statusFilter.addEventListener("change", applyFilters)

}

/* ----- assign user ----- */
function setupAssignAsset() {
    const inventoryBody = document.getElementById("asset-table-body");
    if(!inventoryBody) return;

    inventoryBody.addEventListener("click", (event) => {
        const button = event.target.closest(".js-assign-asset");
        if (!button) return;
        
        const row = button.closest("tr")
        showAssignform(row);
    });
}

function showAssignform(row) {
    closePopup();

    const assetId = row.cells[0].textContent.trim();
    const manufacturer = row.cells[1].textContent.trim();
    const equipment = row.cells[2].textContent.trim();
    const serial = row.cells[3].textContent.trim();

    const overlay = document.createElement("div");
    overlay.id = "popup-overlay"
    overlay.className = "popup-overlay";

    const box = document.createElement("div")
    box.className ="popup-box";

    const title = document.createElement("h2")
    title.textContent = "Assign " + equipment;
    box.appendChild(title);

    /*---Employee Nmea---*/

    const nameLabel = document.createElement("label");
    nameLabel.className = "content-label";
    nameLabel.textContent = "Employee name"
    const nameInput = document.createElement("input")
    nameInput.type = "text";
    nameInput.placeholder = "Enter Name";
    nameLabel.appendChild(nameInput);
    box.appendChild(nameLabel);

    /*---Department---*/

    const deptLabel = document.createElement("label")
    deptLabel.className = "content-label";
    deptLabel.textContent = "Department";
    const deptSelect = document.createElement("select");
    const departments = [
        "--Select Department--",
        "IT",
        "Human Resources",
        "Marketing",
        "Sales",
        "Leadership",

];
departments.forEach((name) => {
    const option = document.createElement("option")
    option.textContent = name;
    deptSelect.appendChild(option);
});
deptLabel.appendChild(deptSelect);
box.appendChild(deptLabel);

/*--Button--*/
const buttonRow = document.createElement("div");
buttonRow.className = "btn-contentgroup";

const cancelBtn = document.createElement("button");
cancelBtn.type = "button";
cancelBtn.className = "btn-content";
cancelBtn.textContent = "Cancel";
cancelBtn.addEventListener("click", closePopup);

const assignBtn = document.createElement("button");
assignBtn.type = "button";
assignBtn.className = "approve-btn";
assignBtn.textContent = "assign";
assignBtn.addEventListener("click", () => {
    const employeeName = nameInput.value.trim();

    /*Kapag kulang*/

    if (employeeName === "") {
        showMessage("Please enter the employee name.")
        return;
    }
    if (deptSelect.selectedIndex === 0) {
        showMessage ("Please select department.");
        return;
    }

    /*dagdag table row*/

    const assignmentsBody = document.querySelector("#assignments-table tbody");
    const newRow = assignmentsBody.insertRow();

    [assetId, manufacturer, equipment, serial, employeeName, deptSelect.value]
    .forEach((text) => {
        newRow.insertCell().textContent = text;
    });

    /* Remove from Inventory */

    row.remove();

    closePopup();
    showMessage(equipment + " assigned to " + employeeName + ".");
    });

    buttonRow.append(cancelBtn, assignBtn);
    box.appendChild(buttonRow);
    
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closePopup();
    });

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    nameInput.focus();
}
