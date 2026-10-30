
const INSIGHTS_API = "https://retail-sales-data-analytics-mdbk.onrender.com";

function insightFormat(value) {
    return Number(value || 0).toLocaleString("en-GB", {
        maximumFractionDigits: 2
    });
}

function setInsightStatus(message, type = "") {
    const element = document.getElementById("insightStatus");

    if (!element) return;

    element.textContent = message;
    element.className = `insight-status ${type}`;
}

function populateList(elementId, items, emptyMessage) {
    const element = document.getElementById(elementId);

    if (!element) return;

    element.replaceChildren();

    if (!items || !items.length) {
        const li = document.createElement("li");
        li.textContent = emptyMessage;
        element.appendChild(li);
        return;
    }

    items.forEach(item => {
        const li = document.createElement("li");
        li.textContent = String(item);
        element.appendChild(li);
    });
}

function populateRecommendations(items) {
    const container = document.getElementById("recommendationsList");

    if (!container) return;

    container.replaceChildren();

    if (!items || !items.length) {
        const paragraph = document.createElement("p");
        paragraph.textContent = "No recommendations available.";
        container.appendChild(paragraph);
        return;
    }

    items.forEach((item, index) => {
        const card = document.createElement("div");

        card.className = "recommendation-item";
        card.textContent = `${index + 1}. ${item}`;

        container.appendChild(card);
    });
}

async function loadInsights() {
    setInsightStatus("Generating analytical insights...", "loading");

    try {
        const [insightResponse, dashboardResponse, cleaningResponse] =
            await Promise.all([
                fetch(`${INSIGHTS_API}/api/insights`),
                fetch(`${INSIGHTS_API}/api/dashboard`),
                fetch(`${INSIGHTS_API}/api/cleaning`)
            ]);

        const [insights, dashboard, cleaning] = await Promise.all([
            insightResponse.json(),
            dashboardResponse.json(),
            cleaningResponse.json()
        ]);

        if (!insightResponse.ok) {
            throw new Error(insights.error || "Unable to load insights.");
        }

        if (!dashboardResponse.ok) {
            throw new Error(dashboard.error || "Unable to load dashboard metrics.");
        }

        if (!cleaningResponse.ok) {
            throw new Error(cleaning.error || "Unable to load data quality information.");
        }

        const metrics = dashboard.metrics;
        const quality = insights.data_quality;

        // KPI cards
        document.getElementById("insightRecords").textContent =
            insightFormat(metrics.total_records);

        document.getElementById("insightRevenue").textContent =
            insightFormat(metrics.total_revenue);

        document.getElementById("insightQuality").textContent =
            quality.missing_values === 0 && quality.duplicate_rows === 0
                ? "Good"
                : "Review";

        const findings = insights.findings || [];
        const recommendations = insights.recommendations || [];

        document.getElementById("insightCount").textContent =
            insightFormat(findings.length);

        // Findings
        populateList(
            "findingsList",
            findings,
            "No analytical findings available."
        );

        // Recommendations
        populateRecommendations(recommendations);

        // Data quality
        populateList("qualityList", [
            `Missing values: ${insightFormat(quality.missing_values)}`,
            `Duplicate records: ${insightFormat(quality.duplicate_rows)}`,
            `Total records: ${insightFormat(quality.total_records)}`,
            `Total columns: ${insightFormat(quality.total_columns)}`
        ], "No data quality information available.");

        // Business interpretation
        const interpretation = document.getElementById(
            "businessInterpretation"
        );

        if (interpretation) {
            interpretation.textContent =
                `The dataset contains ${insightFormat(metrics.total_records)} records. ` +
                `The recorded total revenue is ${insightFormat(metrics.total_revenue)} ` +
                `and total quantity is ${insightFormat(metrics.total_quantity)}. ` +
                `These results should be interpreted alongside the descriptive ` +
                `statistics and categorical distributions.`;
        }

        // Analytical summary
        const summary = document.getElementById("analyticalSummary");

        if (summary) {
            summary.textContent =
                `The analysis covers ${insightFormat(quality.total_records)} records ` +
                `and ${insightFormat(quality.total_columns)} variables. ` +
                `${findings.length} analytical findings and ` +
                `${recommendations.length} business recommendations were generated. ` +
                `The dataset contains ${insightFormat(quality.missing_values)} ` +
                `missing values and ${insightFormat(quality.duplicate_rows)} ` +
                `duplicate records.`;
        }

        setInsightStatus(
            "Insights and recommendations loaded successfully.",
            "success"
        );

    } catch (error) {
        console.error("Insights loading error:", error);
        setInsightStatus(error.message, "error");
    }
}

window.loadInsights = loadInsights;

document.addEventListener("DOMContentLoaded", loadInsights);
