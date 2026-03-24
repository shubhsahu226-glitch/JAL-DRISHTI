# 💧 JAL DRISHTI – AI-Powered Water Crisis Predictor

> Predict groundwater scarcity in rural villages using ML — 100% free, open-source, runs entirely on a local laptop. No paid APIs. No cloud. No build step.

---

## Features

- Upload any CSV dataset with village environmental data
- AI prediction (Linear Regression) for groundwater levels over 7–15 days
- Risk classification: Safe / Warning / Critical with colour-coded alerts
- Smart rule-based recommendations (drip irrigation, crop switching, etc.)
- Interactive forecast chart (Chart.js)
- Village map with colour-coded markers (Leaflet.js + OpenStreetMap)
- Downloadable CSV prediction report
- Clean English dashboard UI with sidebar navigation

---

## Project Structure

```
jal-drishti/
├── backend/
│   ├── app.py              ← Flask API (4 endpoints)
│   ├── requirements.txt    ← Python dependencies
│   └── ml/
│       ├── classifier.py   ← Risk classifier (Safe / Warning / Critical)
│       ├── predictor.py    ← scikit-learn Linear Regression model
│       └── suggestions.py  ← Rule-based recommendation engine
├── data/
│   ├── sample_data.csv     ← 52-row sample dataset (5 villages)
│   └── demo_data.csv       ← 60-row demo dataset showing all risk levels
├── frontend/
│   ├── index.html          ← Full dashboard UI (HTML + CSS)
│   └── app.js              ← All JavaScript logic
└── tests/
    ├── test_classifier.py
    ├── test_suggestions.py
    ├── test_predictor.py
    └── test_app.py
```

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r backend/requirements.txt
```

Requires Python 3.9+. Installs: Flask, flask-cors, pandas, scikit-learn, hypothesis, pytest.

### 2. Start the backend

Run from the **project root** (not from inside `backend/`):

```bash
python backend/app.py
```

You should see:
```
Starting JAL DRISHTI backend on http://localhost:5000
```

### 3. Open the frontend

Open `frontend/index.html` directly in your browser — double-click it or drag it into Chrome/Firefox.

No web server needed. It's plain HTML + JS.

---

## How to Use

1. Click **Data Upload** in the sidebar and select `data/demo_data.csv`
2. Go back to **Regional Overview** (Dashboard)
3. Select a village from the dropdown (e.g. Chandpur for Critical risk)
4. Drag the slider to set forecast days (7–15)
5. Click **Predict Water Levels**
6. View the chart, risk badge, alert banner, map marker, and recommendations
7. Click **Download Report** to export results as CSV

---

## Demo Dataset

`data/demo_data.csv` — 60 rows across 5 villages, designed to show all risk levels:

| Village     | Risk Level |
|-------------|------------|
| Krishnapur  | Safe       |
| Rampur      | Warning    |
| Sundarpur   | Warning    |
| Devpur      | Critical   |
| Chandpur    | Critical   |

---

## CSV Format

| Column            | Type   | Example |
|-------------------|--------|---------|
| village           | string | Rampur  |
| rainfall          | float  | 120.5   |
| temperature       | float  | 28.3    |
| groundwater_level | float  | 12.5    |
| crop_type         | string | rice    |

---

## API Endpoints

| Method | Endpoint     | Description                           |
|--------|--------------|---------------------------------------|
| POST   | /upload-data | Upload CSV (multipart/form-data)      |
| POST   | /predict     | Run prediction `{"village", "days"}`  |
| GET    | /get-results | Fetch last prediction result          |
| GET    | /villages    | List uploaded village names           |

---

## Risk Levels

| Level    | Groundwater Depth | Indicator     |
|----------|--------------------|---------------|
| Safe     | > 10 m             | 🟢 Green      |
| Warning  | 5 – 10 m           | 🟡 Yellow     |
| Critical | < 5 m              | 🔴 Red        |

---

## Running Tests

```bash
python -m pytest tests/ -v
```

34 tests covering the classifier, suggestion engine, predictor, and all API endpoints.

---

## Tech Stack

| Layer    | Technology                       |
|----------|----------------------------------|
| Backend  | Python 3, Flask, flask-cors      |
| ML       | scikit-learn (Linear Regression) |
| Data     | pandas                           |
| Frontend | Plain HTML + JavaScript          |
| Charts   | Chart.js (CDN)                   |
| Maps     | Leaflet.js + OpenStreetMap (CDN) |
| Tests    | pytest + hypothesis              |

---

## License

MIT — free to use, modify, and distribute.
