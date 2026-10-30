
import os
import io
import logging

import numpy as np
import pandas as pd

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename


# =========================================================
# APPLICATION CONFIGURATION
# =========================================================

app = Flask(__name__)

app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

# Allow GitHub Pages and local development environments.
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "https://tonayassignx-tech.github.io",
                "http://localhost:5500",
                "http://127.0.0.1:5500",
                "http://localhost:8000",
                "http://127.0.0.1:8000",
                "null"
            ]
        }
    }
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory dataset for the demonstration application.
retail_data = None
uploaded_filename = None


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def clean_value(value):
    """Convert NumPy and Pandas values into JSON-safe values."""

    if value is None:
        return None

    if isinstance(value, (np.integer,)):
        return int(value)

    if isinstance(value, (np.floating,)):
        if np.isnan(value) or np.isinf(value):
            return None
        return float(value)

    if isinstance(value, (np.bool_,)):
        return bool(value)

    if pd.isna(value):
        return None

    return value


def json_error(message, status_code=400):
    return jsonify({"error": message}), status_code


def require_dataset():
    """Check whether a dataset has been uploaded."""

    if retail_data is None or retail_data.empty:
        return False

    return True


def get_numeric_columns():
    """Return numerical columns from the uploaded dataset."""

    if not require_dataset():
        return []

    return retail_data.select_dtypes(
        include=np.number
    ).columns.tolist()


def find_revenue_column():
    """Identify the most likely revenue column."""

    if not require_dataset():
        return None

    preferred_names = [
        "total amount",
        "total revenue",
        "revenue",
        "sales amount",
        "sales",
        "amount",
        "total"
    ]

    columns = {
        str(column).strip().lower(): column
        for column in retail_data.columns
    }

    for name in preferred_names:
        if name in columns:
            column = columns[name]

            if pd.api.types.is_numeric_dtype(retail_data[column]):
                return column

    for column in retail_data.columns:
        name = str(column).lower()

        if (
            "revenue" in name
            or "sales" in name
            or "amount" in name
        ):
            if pd.api.types.is_numeric_dtype(retail_data[column]):
                return column

    return None


def find_quantity_column():
    """Identify the most likely quantity column."""

    if not require_dataset():
        return None

    preferred_names = [
        "quantity",
        "units sold",
        "units",
        "qty"
    ]

    columns = {
        str(column).strip().lower(): column
        for column in retail_data.columns
    }

    for name in preferred_names:
        if name in columns:
            column = columns[name]

            if pd.api.types.is_numeric_dtype(retail_data[column]):
                return column

    for column in retail_data.columns:
        name = str(column).lower()

        if (
            "quantity" in name
            or "units" in name
            or name == "qty"
        ):
            if pd.api.types.is_numeric_dtype(retail_data[column]):
                return column

    return None


# =========================================================
# HOME / HEALTH CHECK
# =========================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "message": "Retail Sales Data Analytics API",
        "status": "Running",
        "version": "1.0"
    })


@app.route("/health", methods=["GET"])
def health():

    return jsonify({
        "status": "healthy",
        "dataset_loaded": require_dataset()
    })


# =========================================================
# CSV UPLOAD
# =========================================================

@app.route("/api/upload", methods=["POST"])
def upload_csv():

    global retail_data, uploaded_filename

    if "file" not in request.files:
        return json_error("No file was provided.")

    file = request.files["file"]

    if file.filename == "":
        return json_error("Please select a CSV file.")

    filename = secure_filename(file.filename)

    if not filename.lower().endswith(".csv"):
        return json_error("Only CSV files are supported.")

    try:

        file_content = file.read()

        if not file_content:
            return json_error("The uploaded file is empty.")

        # Read CSV from memory.
        dataframe = pd.read_csv(
            io.BytesIO(file_content)
        )

        if dataframe.empty:
            return json_error("The CSV file contains no records.")

        if len(dataframe.columns) == 0:
            return json_error("The CSV file has no columns.")

        # Remove accidental whitespace from column names.
        dataframe.columns = [
            str(column).strip()
            for column in dataframe.columns
        ]

        if dataframe.columns.duplicated().any():
            return json_error(
                "The CSV contains duplicate column names."
            )

        if len(dataframe) > 100000:
            return json_error(
                "The dataset exceeds the 100,000-row demonstration limit."
            )

        # Store dataset only after successful validation.
        retail_data = dataframe
        uploaded_filename = filename

        logger.info(
            "Dataset uploaded: %s, rows=%s, columns=%s",
            filename,
            len(dataframe),
            len(dataframe.columns)
        )

        return jsonify({
            "message": "Dataset uploaded successfully.",
            "filename": filename,
            "rows": int(len(dataframe)),
            "columns": int(len(dataframe.columns)),
            "column_names": dataframe.columns.tolist()
        }), 200

    except UnicodeDecodeError:

        return json_error(
            "Unable to read the CSV encoding. Please save the file as UTF-8."
        )

    except pd.errors.EmptyDataError:

        return json_error("The CSV file contains no readable data.")

    except pd.errors.ParserError:

        return json_error(
            "The CSV file has an invalid format or inconsistent columns."
        )

    except Exception as error:

        logger.exception("CSV upload failed")

        return json_error(
            f"Unable to process the CSV file: {str(error)}",
            500
        )


# =========================================================
# DATA CLEANING
# =========================================================

@app.route("/api/cleaning", methods=["GET"])
def get_cleaning_data():

    if not require_dataset():
        return json_error("Please upload a dataset first.")

    try:

        missing_values = int(
            retail_data.isnull().sum().sum()
        )

        duplicate_rows = int(
            retail_data.duplicated().sum()
        )

        column_details = []

        for column in retail_data.columns:

            column_details.append({
                "name": str(column),
                "dtype": str(retail_data[column].dtype),
                "missing": int(
                    retail_data[column].isnull().sum()
                ),
                "unique": int(
                    retail_data[column].nunique(dropna=True)
                )
            })

        return jsonify({
            "rows": int(len(retail_data)),
            "columns": int(len(retail_data.columns)),
            "total_missing_values": missing_values,
            "duplicate_rows": duplicate_rows,
            "column_details": column_details
        })

    except Exception as error:

        logger.exception("Cleaning assessment failed")

        return json_error(str(error), 500)


@app.route("/api/cleaning/apply", methods=["POST"])
def apply_cleaning():

    global retail_data

    if not require_dataset():
        return json_error("Please upload a dataset first.")

    try:

        data = request.get_json(silent=True) or {}

        remove_duplicates = data.get(
            "remove_duplicates",
            False
        )

        fill_missing = data.get(
            "fill_missing",
            False
        )

        action = data.get("action")

        if action == "remove_duplicates":
            remove_duplicates = True

        elif action == "fill_missing":
            fill_missing = True

        if not isinstance(remove_duplicates, bool):
            return json_error(
                "remove_duplicates must be true or false."
            )

        if not isinstance(fill_missing, bool):
            return json_error(
                "fill_missing must be true or false."
            )

        original_rows = len(retail_data)

        removed_duplicates = 0
        filled_values = 0

        if remove_duplicates:

            before = len(retail_data)

            retail_data = retail_data.drop_duplicates().copy()

            removed_duplicates = before - len(retail_data)

        if fill_missing:

            for column in retail_data.columns:

                missing_count = int(
                    retail_data[column].isnull().sum()
                )

                if missing_count == 0:
                    continue

                if pd.api.types.is_numeric_dtype(
                    retail_data[column]
                ):

                    median_value = retail_data[column].median()

                    if pd.notna(median_value):
                        retail_data[column] = (
                            retail_data[column].fillna(median_value)
                        )

                else:

                    retail_data[column] = (
                        retail_data[column].fillna("Unknown")
                    )

                filled_values += missing_count

        return jsonify({
            "message": "Data cleaning completed successfully.",
            "original_rows": int(original_rows),
            "remaining_rows": int(len(retail_data)),
            "removed_duplicates": int(removed_duplicates),
            "filled_values": int(filled_values),
            "total_missing_values": int(
                retail_data.isnull().sum().sum()
            ),
            "duplicate_rows": int(
                retail_data.duplicated().sum()
            )
        })

    except Exception as error:

        logger.exception("Data cleaning failed")

        return json_error(str(error), 500)


# =========================================================
# EXPLORATORY DATA ANALYSIS
# =========================================================

@app.route("/api/eda", methods=["GET"])
def exploratory_data_analysis():

    if not require_dataset():
        return json_error("Please upload a dataset first.")

    try:

        numeric_columns = get_numeric_columns()

        # Numerical descriptive statistics.
        numeric_statistics = {}

        if numeric_columns:

            statistics = retail_data[
                numeric_columns
            ].describe()

            for column in numeric_columns:

                numeric_statistics[column] = {
                    key: clean_value(value)
                    for key, value in statistics[column].items()
                }

        # Categorical frequency distributions.
        categorical_analysis = {}

        categorical_columns = retail_data.select_dtypes(
            include=["object", "category", "bool"]
        ).columns.tolist()

        for column in categorical_columns:

            frequencies = (
                retail_data[column]
                .dropna()
                .astype(str)
                .value_counts()
                .head(10)
            )

            categorical_analysis[column] = {
                str(key): int(value)
                for key, value in frequencies.items()
            }

        return jsonify({
            "rows": int(len(retail_data)),
            "columns": int(len(retail_data.columns)),
            "numeric_statistics": numeric_statistics,
            "categorical_analysis": categorical_analysis
        })

    except Exception as error:

        logger.exception("EDA failed")

        return json_error(str(error), 500)


# =========================================================
# DASHBOARD METRICS AND VISUALISATIONS
# =========================================================

@app.route("/api/dashboard", methods=["GET"])
def dashboard():

    if not require_dataset():
        return json_error("Please upload a dataset first.")

    try:

        numeric_columns = get_numeric_columns()

        revenue_column = find_revenue_column()
        quantity_column = find_quantity_column()

        total_revenue = 0
        total_quantity = 0

        if revenue_column is not None:

            total_revenue = float(
                retail_data[revenue_column].sum()
            )

        if quantity_column is not None:

            total_quantity = float(
                retail_data[quantity_column].sum()
            )

        revenue_values = []

        if revenue_column is not None:

            revenue_series = retail_data[
                revenue_column
            ].dropna()

            if not revenue_series.empty:

                revenue_values = [
                    float(revenue_series.min()),
                    float(revenue_series.mean()),
                    float(revenue_series.max())
                ]

        return jsonify({

            "metrics": {

                "total_records": int(len(retail_data)),

                "total_numeric_columns": int(
                    len(numeric_columns)
                ),

                "total_revenue": clean_value(total_revenue),

                "total_quantity": clean_value(total_quantity)
            },

            "charts": {

                "revenue_distribution": {

                    "labels": [
                        "Minimum",
                        "Average",
                        "Maximum"
                    ],

                    "values": revenue_values

                }

            }

        })

    except Exception as error:

        logger.exception("Dashboard calculation failed")

        return json_error(str(error), 500)


# =========================================================
# INSIGHTS AND BUSINESS RECOMMENDATIONS
# =========================================================

@app.route("/api/insights", methods=["GET"])
def generate_insights():

    if not require_dataset():
        return json_error("Please upload a dataset first.")

    try:

        numeric_columns = get_numeric_columns()

        findings = []
        recommendations = []

        missing_values = int(
            retail_data.isnull().sum().sum()
        )

        duplicate_rows = int(
            retail_data.duplicated().sum()
        )

        # Generate numerical findings.
        for column in numeric_columns:

            series = retail_data[column].dropna()

            if series.empty:
                continue

            mean_value = float(series.mean())
            maximum_value = float(series.max())

            findings.append(
                f"{column}: Average is {mean_value:.2f}, "
                f"with a maximum of {maximum_value:.2f}."
            )

        # Data quality observations.
        if missing_values > 0:

            recommendations.append(
                f"Review and address the {missing_values} "
                "missing values before relying on the dataset."
            )

        if duplicate_rows > 0:

            recommendations.append(
                f"Review the {duplicate_rows} duplicate records "
                "and remove confirmed duplicates where appropriate."
            )

        if missing_values == 0 and duplicate_rows == 0:

            recommendations.append(
                "Continue monitoring sales performance and "
                "product-level trends."
            )

        # Revenue-based business recommendations.
        revenue_column = find_revenue_column()

        if revenue_column is not None:

            recommendations.append(
                "Monitor revenue performance regularly and "
                "compare sales results across reporting periods."
            )

        # Quantity-based recommendations.
        quantity_column = find_quantity_column()

        if quantity_column is not None:

            recommendations.append(
                "Use quantity patterns to support inventory "
                "planning and stock management decisions."
            )

        if not findings:

            findings.append(
                "No numerical variables were available for "
                "descriptive statistical analysis."
            )

        return jsonify({

            "findings": findings,

            "recommendations": recommendations,

            "data_quality": {

                "total_records": int(len(retail_data)),

                "total_columns": int(len(retail_data.columns)),

                "missing_values": missing_values,

                "duplicate_rows": duplicate_rows

            }

        })

    except Exception as error:

        logger.exception("Insight generation failed")

        return json_error(str(error), 500)


# =========================================================
# ERROR HANDLERS
# =========================================================

@app.errorhandler(413)
def file_too_large(error):

    return json_error(
        "Uploaded file exceeds the 10 MB limit.",
        413
    )


@app.errorhandler(404)
def not_found(error):

    return json_error(
        "Requested API endpoint was not found.",
        404
    )


@app.errorhandler(500)
def internal_server_error(error):

    logger.exception("Internal server error")

    return json_error(
        "An internal server error occurred.",
        500
    )


# =========================================================
# LOCAL DEVELOPMENT
# =========================================================

if __name__ == "__main__":

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )
