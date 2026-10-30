
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function showUploadStatus(message, type = "") {
    const status = document.getElementById("uploadStatus");

    if (!status) return;

    status.textContent = message;
    status.className = `upload-status ${type}`;
}

function validateCSV(file) {
    if (!file) return "Please select a CSV file.";

    if (!file.name.toLowerCase().endsWith(".csv")) {
        return "Please select a valid CSV file.";
    }

    if (file.size === 0) {
        return "The selected file is empty.";
    }

    if (file.size > MAX_FILE_SIZE) {
        return "File size exceeds the 10 MB limit.";
    }

    return null;
}

function handleFileSelection() {
    const fileInput = document.getElementById("csvFile");
    const fileName = document.getElementById("fileName");

    if (!fileInput || !fileName) return;

    const file = fileInput.files[0];

    if (!file) {
        fileName.textContent = "No file selected";
        return;
    }

    const error = validateCSV(file);

    if (error) {
        fileName.textContent = error;
        showUploadStatus(error, "error");
        fileInput.value = "";
        return;
    }

    fileName.textContent = `Selected file: ${file.name}`;
    showUploadStatus("File selected. Ready to upload.", "success");
}

async function updateHomepageMetrics() {
    try {
        const response = await fetch(
            `${window.API_BASE}/api/dashboard`
        );

        if (!response.ok) {
            throw new Error("Unable to load dashboard metrics.");
        }

        const data = await response.json();
        const metrics = data.metrics;

        const elements = {
            totalRecords: metrics.total_records,
            totalColumns: metrics.total_numeric_columns,
            totalRevenue: metrics.total_revenue,
            totalQuantity: metrics.total_quantity
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);

            if (element) {
                element.textContent = Number(value).toLocaleString("en-GB");
            }
        });

    } catch (error) {
        console.error("Metric update error:", error);
    }
}

async function uploadCSV() {
    const fileInput = document.getElementById("csvFile");
    const uploadButton = document.getElementById("uploadButton");

    if (!fileInput) {
        showUploadStatus("File input was not found.", "error");
        return;
    }

    const file = fileInput.files[0];
    const validationError = validateCSV(file);

    if (validationError) {
        showUploadStatus(validationError, "error");
        return;
    }

    if (!window.API_BASE) {
        showUploadStatus("Backend configuration is missing.", "error");
        return;
    }

    if (uploadButton) {
        uploadButton.disabled = true;
        uploadButton.textContent = "Uploading...";
    }

    showUploadStatus("Connecting to server and uploading CSV...", "loading");

    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
            `${window.API_BASE}/api/upload`,
            {
                method: "POST",
                body: formData
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "CSV upload failed.");
        }

        sessionStorage.setItem(
            "retailDataset",
            JSON.stringify({
                fileName: file.name,
                rows: result.rows,
                columns: result.columns,
                columnNames: result.column_names
            })
        );

        showUploadStatus(
            `Upload successful! ${result.rows.toLocaleString("en-GB")} records and ${result.columns} columns loaded.`,
            "success"
        );

        await updateHomepageMetrics();

        document.dispatchEvent(
            new CustomEvent("datasetUploaded", {
                detail: result
            })
        );

    } catch (error) {
        console.error("CSV upload error:", error);

        showUploadStatus(
            error.message || "Unable to connect to the backend.",
            "error"
        );

    } finally {
        if (uploadButton) {
            uploadButton.disabled = false;
            uploadButton.textContent = "Upload Dataset";
        }
    }
}

window.uploadCSV = uploadCSV;

document.addEventListener("DOMContentLoaded", function () {
    const fileInput = document.getElementById("csvFile");

    if (fileInput) {
        fileInput.addEventListener("change", handleFileSelection);
    }
});
