
window.API_BASE = "https://retail-sales-data-analytics-mdbk.onrender.com";

function formatNumber(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return "0";
    }

    return Number(value).toLocaleString("en-GB", {
        maximumFractionDigits: 2
    });
}

function updateHomepageMetrics(metrics) {
    const records = document.getElementById("totalRecords");
    const columns = document.getElementById("totalColumns");
    const revenue = document.getElementById("totalRevenue");
    const quantity = document.getElementById("totalQuantity");

    if (records) records.textContent = formatNumber(metrics.total_records);
    if (columns) columns.textContent = formatNumber(metrics.total_numeric_columns);
    if (revenue) revenue.textContent = formatNumber(metrics.total_revenue);
    if (quantity) quantity.textContent = formatNumber(metrics.total_quantity);
}

async function loadDashboard() {
    try {
        const response = await fetch(`${window.API_BASE}/api/dashboard`);

        if (!response.ok) {
            console.info("No dataset uploaded or dashboard unavailable.");
            return;
        }

        const data = await response.json();
        updateHomepageMetrics(data.metrics);

    } catch (error) {
        console.error("Dashboard loading error:", error);
    }
}

async function checkBackend() {
    try {
        const response = await fetch(`${window.API_BASE}/`);

        if (!response.ok) {
            throw new Error("Backend unavailable.");
        }

        const data = await response.json();
        console.log("Backend connected:", data);

        return true;

    } catch (error) {
        console.error("Backend connection error:", error);
        return false;
    }
}

function restoreUploadInformation() {
    try {
        const savedData = sessionStorage.getItem("retailDataset");

        if (!savedData) return;

        const dataset = JSON.parse(savedData);
        const fileName = document.getElementById("fileName");

        if (fileName && dataset.fileName) {
            fileName.textContent = `Last uploaded file: ${dataset.fileName}`;
        }

    } catch (error) {
        console.error("Unable to restore upload information:", error);
    }
}

document.addEventListener("datasetUploaded", function () {
    loadDashboard();
});

document.addEventListener("DOMContentLoaded", async function () {
    restoreUploadInformation();

    const backendAvailable = await checkBackend();

    if (backendAvailable) {
        await loadDashboard();
    }
});
