"""
JAL DRISHTI — Flask Backend
Exposes three endpoints:
  POST /upload-data  — upload and validate a CSV dataset
  POST /predict      — run ML prediction for a village
  GET  /get-results  — retrieve last prediction results
"""
import io
import sys
import os

# Allow running as `python backend/app.py` from workspace root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

from backend.ml.predictor import train_and_predict
from backend.ml.suggestions import generate

app = Flask(__name__)
CORS(app)  # Allow requests from the frontend HTML file

# ---------------------------------------------------------------------------
# In-memory store — no database needed
# ---------------------------------------------------------------------------
store = {
    "dataframe": None,    # pandas DataFrame after a successful upload
    "last_results": None, # dict from the last /predict call
}

REQUIRED_COLUMNS = {"village", "rainfall", "temperature", "groundwater_level", "crop_type"}

# ---------------------------------------------------------------------------
# POST /upload-data
# ---------------------------------------------------------------------------
@app.route("/upload-data", methods=["POST"])
def upload_data():
    """Accept a multipart CSV file, validate columns, store in memory."""
    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    try:
        content = file.read().decode("utf-8")
        df = pd.read_csv(io.StringIO(content))
    except Exception as e:
        return jsonify({"error": f"Could not parse CSV: {str(e)}"}), 400

    # Validate required columns
    missing = REQUIRED_COLUMNS - set(df.columns.str.strip().str.lower())
    if missing:
        return jsonify({"error": f"Missing columns: {sorted(missing)}"}), 400

    # Normalise column names to lowercase
    df.columns = df.columns.str.strip().str.lower()

    if len(df) == 0:
        return jsonify({"error": "File is empty — no data rows found"}), 400

    store["dataframe"] = df
    return jsonify({"message": "Data uploaded successfully", "rows": len(df)}), 200


# ---------------------------------------------------------------------------
# POST /predict
# ---------------------------------------------------------------------------
@app.route("/predict", methods=["POST"])
def predict():
    """Train model on uploaded data and return groundwater forecasts."""
    if store["dataframe"] is None:
        return jsonify({"error": "No dataset uploaded. Please upload a CSV first."}), 400

    body = request.get_json(silent=True) or {}
    village = body.get("village", "").strip()
    days = body.get("days")

    if not village:
        return jsonify({"error": "Missing required field: village"}), 400

    if days is None:
        return jsonify({"error": "Missing required field: days"}), 400

    try:
        days = int(days)
    except (ValueError, TypeError):
        return jsonify({"error": "days must be an integer"}), 400

    if not (7 <= days <= 15):
        return jsonify({"error": "Days must be between 7 and 15"}), 400

    df = store["dataframe"]
    if village not in df["village"].values:
        return jsonify({"error": f"Village '{village}' not found in dataset"}), 400

    village_rows = df[df["village"] == village]
    if len(village_rows) < 2:
        return jsonify({"error": "Not enough data rows for village to train model"}), 400

    # Use the most common crop_type for this village
    crop_type = village_rows["crop_type"].mode()[0]

    predictions = train_and_predict(df, village, days)

    # Determine highest risk level (Critical > Warning > Safe)
    risk_order = {"Critical": 2, "Warning": 1, "Safe": 0}
    highest_risk = max(predictions, key=lambda p: risk_order[p["risk_level"]])["risk_level"]

    suggestions = generate(predictions, crop_type)

    result = {
        "village": village,
        "predictions": predictions,
        "suggestions": suggestions,
        "highest_risk": highest_risk,
        "crop_type": crop_type,
    }
    store["last_results"] = result
    return jsonify(result), 200


# ---------------------------------------------------------------------------
# GET /get-results
# ---------------------------------------------------------------------------
@app.route("/get-results", methods=["GET"])
def get_results():
    """Return the most recently computed prediction results."""
    return jsonify({"results": store["last_results"]}), 200


# ---------------------------------------------------------------------------
# GET /villages  (bonus — lets the frontend populate the dropdown)
# ---------------------------------------------------------------------------
@app.route("/villages", methods=["GET"])
def get_villages():
    """Return list of unique village names from the uploaded dataset."""
    if store["dataframe"] is None:
        return jsonify({"villages": []}), 200
    villages = sorted(store["dataframe"]["village"].unique().tolist())
    return jsonify({"villages": villages}), 200


if __name__ == "__main__":
    print("Starting JAL DRISHTI backend on http://localhost:5000")
    app.run(debug=True, port=5000)
