
const CLEANING_API = "https://retail-sales-data-analytics-mdbk.onrender.com";

function cleaningNumber(value) {
    return Number(value || 0).toLocaleString("en-GB");
}

function setCleaningStatus(message, type = "") {
    const element = document.getElementById("qualityStatus");
    if (!element) return;

    element.textContent = message;
    element.className = `status-message ${type}`;
}

async function loadCleaningData() {
    setCleaningStatus("Loading data quality information...", "loading");

    try {
        const response = await fetch(`${CLEANING_API}/api/cleaning`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to load cleaning data.");
        }

        document.getElementById("cleanRows").textContent =
            cleaningNumber(data.rows);

        document.getElementById("cleanColumns").textContent =
            cleaningNumber(data.columns);

        document.getElementById("missingValues").textContent =
            cleaningNumber(data.total_missing_values);

        document.getElementById("duplicateRows").textContent =
            cleaningNumber(data.duplicate_rows);

        renderColumnTable(data.column_details || []);

        setCleaningStatus("Data quality assessment loaded successfully.", "success");

    } catch (error) {
        console.error("Cleaning error:", error);
        setCleaningStatus(error.message, "error");
    }
}

function renderColumnTable(columns) {
    const table = document.getElementById("columnTable");

    if (!table) return;

    table.replaceChildren();

    if (!columns.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent = "No column information available.";

        row.appendChild(cell);
        table.appendChild(row);
        return;
    }

    columns.forEach(column => {
        const row = document.createElement("tr");

        [
            column.name,
            column.dtype,
            cleaningNumber(column.missing),
            cleaningNumber(column.unique)
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = String(value ?? "");
            row.appendChild(cell);
        });

        table.appendChild(row);
    });
}

async function applyCleaning(action) {
    if (!["remove_duplicates", "fill_missing"].includes(action)) {
        setCleaningStatus("Invalid cleaning operation.", "error");
        return;
    }

    const message = action === "remove_duplicates"
        ? "Remove duplicate records from the dataset?"
        : "Fill missing values using median or Unknown values?";

    if (!window.confirm(message)) return;

    setCleaningStatus("Applying data cleaning...", "loading");

    try {
        const response = await fetch(`${CLEANING_API}/api/cleaning/apply`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ action })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Cleaning operation failed.");
        }

        setCleaningStatus(
            `${result.message} Removed duplicates: ${cleaningNumber(result.removed_duplicates)}. Filled values: ${cleaningNumber(result.filled_values)}.`,
            "success"
        );

        await loadCleaningData();

    } catch (error) {
        console.error("Apply cleaning error:", error);
        setCleaningStatus(error.message, "error");
    }
}

window.loadCleaningData = loadCleaningData;
window.applyCleaning = applyCleaning;

document.addEventListener("DOMContentLoaded", loadCleaningData);
