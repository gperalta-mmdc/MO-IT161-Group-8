document.addEventListener('DOMContentLoaded', () => {setupInventoryPage();
});

function setupInventoryPage() {
    setupInventoryFilters();

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