import pandas as pd
import os
import joblib

from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

# =====================================
# Load Features
# =====================================

df = pd.read_csv(
    "data/processed/trader_features.csv"
)

# Remove trader_id
X = df.drop(
    columns=["trader_id"]
)

# =====================================
# Scale Features
# =====================================

scaler = StandardScaler()

X_scaled = scaler.fit_transform(X)

# =====================================
# Train KMeans
# =====================================

kmeans = KMeans(
    n_clusters=4,
    random_state=42,
    n_init=10
)

clusters = kmeans.fit_predict(X_scaled)

# Add cluster labels
df["cluster"] = clusters

# =====================================
# Save Outputs
# =====================================

os.makedirs(
    "models",
    exist_ok=True
)

joblib.dump(
    scaler,
    "models/scaler.pkl"
)

joblib.dump(
    kmeans,
    "models/kmeans_model.pkl"
)

df.to_csv(
    "data/processed/clustered_traders.csv",
    index=False
)

print("KMeans Training Complete")

print("\nCluster Counts:")

print(
    df["cluster"].value_counts()
)

print("\nShape:")

print(df.shape)



df = pd.read_csv(
    "data/processed/clustered_traders.csv"
)

print(
    df.groupby("cluster").mean()
)

pd.set_option("display.max_columns", None)

print(
    df.groupby("cluster")
      .mean(numeric_only=True)
      .round(2)
)


cluster_mapping = {
    0: "Emotional Trader",
    1: "Disciplined Trader",
    2: "Overtrader",
    3: "Aggressive Trader"
}

df["trader_type"] = df["cluster"].map(cluster_mapping)

df.to_csv(
    "data/processed/labeled_traders.csv",
    index=False
)

print("Labels Saved Successfully")