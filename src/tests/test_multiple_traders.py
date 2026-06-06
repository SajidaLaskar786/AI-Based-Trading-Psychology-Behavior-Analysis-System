import sys
import os

sys.path.append(
    os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            ".."
        )
    )
)

from reporting.report_generator import generate_report

for trader_id in [0, 10, 25, 50, 100]:
    generate_report(trader_id)


import pandas as pd

df = pd.read_csv(
    "data/processed/labeled_traders.csv"
)

print(
    df.groupby("trader_type")
      .head(3)[["trader_id", "trader_type"]]
)