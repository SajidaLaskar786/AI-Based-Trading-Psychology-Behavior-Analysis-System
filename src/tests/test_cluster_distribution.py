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

import pandas as pd

df = pd.read_csv(
    "data/processed/labeled_traders.csv"
)

print("\nTrader Type Distribution:\n")

print(
    df["trader_type"].value_counts()
)


from reporting.report_generator import generate_report

generate_report(0)
generate_report(10)
generate_report(50)
generate_report(100)