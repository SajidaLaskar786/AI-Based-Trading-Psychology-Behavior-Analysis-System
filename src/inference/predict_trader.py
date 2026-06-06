import pandas as pd
import joblib

# Load model
model = joblib.load("models/random_forest.pkl")

# Load trader features
df = pd.read_csv(
    "data/processed/trader_features.csv"
)

# Example: take first trader
sample = df.iloc[[0]]

trader_id = sample["trader_id"].values[0]

X = sample.drop(
    columns=["trader_id"]
)

# Prediction
prediction = model.predict(X)[0]

# Confidence
confidence = (
    model.predict_proba(X).max() * 100
)

print("\nTrader ID:", trader_id)
print("Trader Type:", prediction)
print("Confidence:", round(confidence, 2), "%")

print(model.classes_)
print(model.predict_proba(X))