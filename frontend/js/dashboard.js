
const API_BASE = "https://retail-sales-data-analytics-mdbk.onrender.com";

let revenueChart = null;
let categoryChart = null;
let numericChart = null;

// Format numbers for display
function formatNumber(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return "0";
    }

    return Number(value).toLocaleString("en-GB", {
        maximumFractionDigits: 2
    });
}

// Display dashboard status
function setDashboardStatus(message, type = "info") {
    const status = document.getElementById("dashboardStatus");

    if (status) {
        status.textContent = message;
        status.className = `status-message ${type}`;
    }
}

// Fetch dashboard and EDA data
async function loadDashboardData() {
    setDashboardStatus("Loading dashboard data...", "loading");

    try {
        const [dashboardResponse, edaResponse] = await Promise.all([
            fetch(`${API_BASE}/api/dashboard`),
            fetch(`${API_BASE}/api/eda`)
        ]);

        if (!dashboardResponse.ok || !edaResponse.ok) {
            throw new Error(
                "Unable to retrieve data. Please upload a CSV file first."
            );
        }

        const dashboardData = await dashboardResponse.json();
        const edaData = await edaResponse.json();

        updateDashboardMetrics(dashboardData.metrics);
        renderRevenueChart(dashboardData.charts.revenue_distribution);
        renderCategoryChart(edaData.categorical_analysis);
        renderNumericChart(edaData.numeric_statistics);
        updateDashboardSummary(dashboardData, edaData);

        setDashboardStatus("Dashboard updated successfully.", "success");

    } catch (error) {
        console.error("Dashboard error:", error);
        setDashboardStatus(error.message, "error");
    }
}

// Update KPI cards
function updateDashboardMetrics(metrics) {
    document.getElementById("dashRecords").textContent =
        formatNumber(metrics.total_records);

    document.getElementById("dashRevenue").textContent =
        formatNumber(metrics.total_revenue);

    document.getElementById("dashQuantity").textContent =
        formatNumber(metrics.total_quantity);

    document.getElementById("dashVariables").textContent =
        formatNumber(metrics.total_numeric_columns);
}

// Chart 1: Revenue distribution
function renderRevenueChart(chartData) {
    const canvas = document.getElementById("revenueChart");

    if (!canvas || !chartData) return;

    if (revenueChart) {
        revenueChart.destroy();
    }

    revenueChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: chartData.labels,
            datasets: [{
                label: "Revenue",
                data: chartData.values,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: "Minimum, Average and Maximum"
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Chart 2: Categorical frequency

function renderCategoryChart(categoricalData) {
    const canvas = document.getElementById("categoryChart");

    if (!canvas || !categoricalData) return;

    if (categoryChart) {
        categoryChart.destroy();
    }

    // Prefer Product Category, then Gender.
    // Avoid high-cardinality fields such as Customer ID and Date.
    let selectedCategory = "Product Category";

    if (!categoricalData[selectedCategory]) {
        selectedCategory = "Gender";
    }

    if (!categoricalData[selectedCategory]) {
        selectedCategory = Object.keys(categoricalData).find(
            key => Object.keys(categoricalData[key]).length <= 15
        );
    }

    if (!selectedCategory) {
        console.warn("No suitable categorical variable found.");
        return;
    }

    const frequencies = categoricalData[selectedCategory];

    categoryChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: Object.keys(frequencies),
            datasets: [{
                label: "Number of Records",
                data: Object.values(frequencies),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Distribution by ${selectedCategory}`
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}


// Chart 3: Numeric variable comparison
function renderNumericChart(numericStatistics) {
    const canvas = document.getElementById("numericChart");

    if (!canvas) return;

    if (numericChart) {
        numericChart.destroy();
    }

    if (!numericStatistics || Object.keys(numericStatistics).length === 0) {
        return;
    }

    const labels = Object.keys(numericStatistics);
    const values = labels.map(
        column => numericStatistics[column].mean
    );

    numericChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Mean Value",
                data: values,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: "Average Values of Numeric Variables"
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Generate dashboard summary
function updateDashboardSummary(dashboardData, edaData) {
    const summary = document.getElementById("dashboardSummary");

    if (!summary) return;

    const metrics = dashboardData.metrics;

    summary.innerHTML = `
        <p>
            The dataset contains
            <strong>${formatNumber(metrics.total_records)}</strong>
            records and
            <strong>${formatNumber(metrics.total_numeric_columns)}</strong>
            numeric variables.
        </p>

        <p>
            Total revenue recorded:
            <strong>${formatNumber(metrics.total_revenue)}</strong>.
        </p>

        <p>
            Total quantity recorded:
            <strong>${formatNumber(metrics.total_quantity)}</strong>.
        </p>

        <p>
            The categorical chart displays the frequency of values
            in the first available categorical variable.
        </p>

        <p>
            The numeric chart compares the mean values of available
            numeric variables. Variables with different measurement
            scales should be interpreted separately.
        </p>
    `;
}

// Load dashboard when the page opens
document.addEventListener("DOMContentLoaded", function () {
    loadDashboardData();
});
