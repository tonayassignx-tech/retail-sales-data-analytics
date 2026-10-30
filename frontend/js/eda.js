
/* =========================================
   RETAIL SALES DATA ANALYTICS
   EXPLORATORY DATA ANALYSIS MODULE
========================================= */

// Flask API URL
const API_BASE = "https://retail-sales-data-analytics-mdbk.onrender.com";


// =========================================
// 1. LOAD EXPLORATORY DATA ANALYSIS
// =========================================

async function loadEDA() {

    const status = document.getElementById("edaStatus");

    status.textContent = "Analysing dataset...";

    try {

        const response = await fetch(`${API_BASE}/api/eda`);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Analysis failed.");
        }

        const numeric = data.numeric_statistics || {};
        const categorical = data.categorical_analysis || {};

        const numericColumns = Object.keys(numeric);
        const categoricalColumns = Object.keys(categorical);

        // Update overview cards
        document.getElementById("edaRows").textContent =
            data.rows.toLocaleString();

        document.getElementById("edaColumns").textContent =
            data.columns;

        document.getElementById("numericCount").textContent =
            numericColumns.length;

        document.getElementById("categoricalCount").textContent =
            categoricalColumns.length;


        // Generate statistical tables
        generateStatistics(numeric);

        // Generate categorical frequency tables
        generateCategorical(categorical, data.rows);

        // Generate dataset summary
        generateSummary(
            data,
            numericColumns,
            categoricalColumns
        );

        status.textContent = "Exploratory analysis completed successfully.";

    }

    catch (error) {

        status.textContent = error.message;

        document.getElementById("statisticsTable").innerHTML = `
            <tr>
                <td colspan="7">${escapeHTML(error.message)}</td>
            </tr>
        `;

        document.getElementById("categoricalResults").textContent =
            error.message;

        document.getElementById("analysisSummary").textContent =
            "Unable to generate analysis.";

    }

}


// =========================================
// 2. GENERATE DESCRIPTIVE STATISTICS
// =========================================

function generateStatistics(numeric) {

    const table = document.getElementById("statisticsTable");

    table.replaceChildren();

    const columns = Object.keys(numeric);

    if (columns.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="7">No numerical variables found.</td>
            </tr>
        `;

        return;
    }

    columns.forEach(column => {

        const stats = numeric[column];

        const measures = [
            ["Count", stats.count],
            ["Mean", stats.mean],
            ["Std. Deviation", stats.std],
            ["Minimum", stats.min],
            ["Maximum", stats.max]
        ];

        measures.forEach(([label, value]) => {

            const row = document.createElement("tr");

            const values = [
                label,
                column,
                formatNumber(value),
                formatNumber(stats.mean),
                formatNumber(stats.std),
                formatNumber(stats.min),
                formatNumber(stats.max)
            ];

            values.forEach((item, index) => {

                const cell = document.createElement("td");

                cell.textContent = item;

                if (index === 0) {
                    cell.style.fontWeight = "600";
                }

                row.appendChild(cell);

            });

            table.appendChild(row);

        });

    });

}


// =========================================
// 3. GENERATE CATEGORICAL FREQUENCIES
// =========================================

function generateCategorical(categorical, totalRows) {

    const container = document.getElementById("categoricalResults");

    container.replaceChildren();

    const columns = Object.keys(categorical);

    if (columns.length === 0) {

        container.textContent =
            "No categorical variables found in the dataset.";

        return;
    }

    columns.forEach(column => {

        const frequencies = categorical[column];

        const block = document.createElement("div");

        block.className = "frequency-block";

        const heading = document.createElement("h4");

        heading.textContent = column;

        block.appendChild(heading);

        const table = document.createElement("table");

        table.className = "data-table";

        const thead = document.createElement("thead");

        const headerRow = document.createElement("tr");

        ["Category", "Frequency", "Percentage"].forEach(title => {

            const th = document.createElement("th");

            th.textContent = title;

            headerRow.appendChild(th);

        });

        thead.appendChild(headerRow);

        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        Object.entries(frequencies).forEach(([category, count]) => {

            const row = document.createElement("tr");

            const percentage = totalRows > 0
                ? ((count / totalRows) * 100).toFixed(2)
                : "0.00";

            [category, count.toLocaleString(), percentage + "%"]
                .forEach(value => {

                    const cell = document.createElement("td");

                    cell.textContent = value;

                    row.appendChild(cell);

                });

            tbody.appendChild(row);

        });

        table.appendChild(tbody);

        block.appendChild(table);

        container.appendChild(block);

    });

}


// =========================================
// 4. GENERATE DATASET SUMMARY
// =========================================

function generateSummary(data, numeric, categorical) {

    const summary = document.getElementById("analysisSummary");

    summary.replaceChildren();

    const statements = [
        `The dataset contains ${data.rows.toLocaleString()} records.`,
        `A total of ${data.columns} variables are available.`,
        `${numeric.length} numerical variables were identified.`,
        `${categorical.length} categorical variables were identified.`
    ];

    statements.forEach(statement => {

        const paragraph = document.createElement("p");

        paragraph.textContent = "• " + statement;

        paragraph.style.marginBottom = "10px";

        summary.appendChild(paragraph);

    });

    if (numeric.length > 0) {

        const note = document.createElement("p");

        note.textContent =
            "Descriptive statistics provide an overview of the " +
            "central tendency and dispersion of numerical variables.";

        summary.appendChild(note);

    }

    if (categorical.length > 0) {

        const note = document.createElement("p");

        note.textContent =
            "Categorical frequency distributions help identify " +
            "the most common categories in the dataset.";

        summary.appendChild(note);

    }

}


// =========================================
// 5. FORMAT NUMBERS
// =========================================

function formatNumber(value) {

    if (value === null || value === undefined ||
        !Number.isFinite(Number(value))) {

        return "N/A";

    }

    return Number(value).toLocaleString("en-GB", {
        maximumFractionDigits: 2
    });

}


// =========================================
// 6. INITIALISE EDA PAGE
// =========================================

document.addEventListener("DOMContentLoaded", function () {

    loadEDA();

});
