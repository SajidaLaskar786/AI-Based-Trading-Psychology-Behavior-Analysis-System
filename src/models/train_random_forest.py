import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

from sklearn.metrics import (
    accuracy_score,
    classification_report
)

import joblib

# ====================================
# Load Data
# ====================================

df = pd.read_csv(
    "data/processed/labeled_traders.csv"
)

# ====================================
# Features
# ====================================

X = df.drop(
    columns=[
        "trader_id",
        "cluster",
        "trader_type"
    ]
)

# ====================================
# Target
# ====================================

y = df["trader_type"]

# ====================================
# Train Test Split
# ====================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# ====================================
# Model
# ====================================

model = RandomForestClassifier(
    n_estimators=200,
    max_depth=8,
    random_state=42
)

model.fit(
    X_train,
    y_train
)

# ====================================
# Evaluation
# ====================================

preds = model.predict(
    X_test
)

acc = accuracy_score(
    y_test,
    preds
)

print("\nAccuracy:", acc)

print(
    classification_report(
        y_test,
        preds
    )
)

# ====================================
# Save Model
# ====================================

joblib.dump(
    model,
    "models/random_forest.pkl"
)

print(
    "\nModel Saved Successfully"
)