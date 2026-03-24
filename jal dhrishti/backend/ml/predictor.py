from datetime import date, timedelta

import pandas as pd
from sklearn.linear_model import LinearRegression

from backend.ml.classifier import classify


def train_and_predict(df: pd.DataFrame, village: str, days: int) -> list[dict]:
    """Train a Linear Regression model on village data and predict future groundwater levels.

    Args:
        df: Full dataset as a pandas DataFrame.
        village: Village name to filter on.
        days: Number of future days to forecast (7–15).

    Returns:
        List of dicts with keys: date (ISO str), groundwater_level (float), risk_level (str).
    """
    village_df = df[df["village"] == village].copy().reset_index(drop=True)

    # Assign a sequential day index to training rows
    village_df["day_index"] = range(len(village_df))

    features = ["rainfall", "temperature", "day_index"]
    target = "groundwater_level"

    X_train = village_df[features].values
    y_train = village_df[target].values

    model = LinearRegression()
    model.fit(X_train, y_train)

    # Use the mean of rainfall and temperature as a stable baseline for extrapolation
    mean_rainfall = village_df["rainfall"].mean()
    mean_temperature = village_df["temperature"].mean()
    last_day_index = len(village_df) - 1

    tomorrow = date.today() + timedelta(days=1)
    predictions = []

    for i in range(1, days + 1):
        future_day_index = last_day_index + i
        X_future = [[mean_rainfall, mean_temperature, future_day_index]]
        level = float(model.predict(X_future)[0])
        forecast_date = (tomorrow + timedelta(days=i - 1)).isoformat()
        predictions.append({
            "date": forecast_date,
            "groundwater_level": round(level, 2),
            "risk_level": classify(level),
        })

    return predictions
