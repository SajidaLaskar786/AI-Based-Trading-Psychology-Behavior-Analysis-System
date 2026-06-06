import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os

# Create directory
os.makedirs("data/raw", exist_ok=True)

np.random.seed(42)
random.seed(42)

NUM_TRADERS = 200

data = []
trade_id = 1

personalities = [
    "Disciplined",
    "Aggressive",
    "Overtrader",
    "Emotional"
]

for trader_id in range(1, NUM_TRADERS + 1):

    personality = random.choice(personalities)

    num_trades = random.randint(40, 180)

    current_date = datetime(2023, 1, 1)

    previous_trade_result = 0

    for _ in range(num_trades):

        # -------------------------
        # Position Size
        # -------------------------

        if personality == "Disciplined":

            base_position = np.random.uniform(8000, 18000)

            if previous_trade_result < 0:
                position_multiplier = np.random.uniform(0.9, 1.1)
            else:
                position_multiplier = np.random.uniform(0.95, 1.15)

            holding_days = random.randint(5, 30)

            trade_gap = random.randint(3, 10)

        elif personality == "Aggressive":

            base_position = np.random.uniform(15000, 60000)

            position_multiplier = np.random.uniform(0.8, 1.8)

            holding_days = random.randint(2, 15)

            trade_gap = random.randint(1, 7)

        elif personality == "Overtrader":

            base_position = np.random.uniform(5000, 20000)

            position_multiplier = np.random.uniform(0.9, 1.3)

            holding_days = random.randint(1, 5)

            trade_gap = random.randint(0, 2)

        else:  # Emotional

            base_position = np.random.uniform(8000, 30000)

            if previous_trade_result < 0:
                position_multiplier = np.random.uniform(1.2, 2.5)
            else:
                position_multiplier = np.random.uniform(0.8, 1.4)

            holding_days = random.randint(1, 10)

            trade_gap = random.randint(0, 5)

        buy_value = base_position * position_multiplier

        # -------------------------
        # Trade Outcome
        # -------------------------

        market_return = np.random.normal(0.01, 0.05)

        skill_factor = {
            "Disciplined": np.random.normal(0.015, 0.02),
            "Aggressive": np.random.normal(0.005, 0.05),
            "Overtrader": np.random.normal(0.0, 0.03),
            "Emotional": np.random.normal(-0.005, 0.04)
        }[personality]

        pnl_pct = market_return + skill_factor

        sell_value = buy_value * (1 + pnl_pct)

        pnl = sell_value - buy_value

        quantity = random.randint(1, 100)

        buy_date = current_date
        sell_date = buy_date + timedelta(days=holding_days)

        symbol = random.choice([
            "AAPL",
            "MSFT",
            "NVDA",
            "GOOGL",
            "META",
            "AMZN",
            "TSLA",
            "NFLX",
            "AMD",
            "INTC"
        ])

        data.append({
            "trade_id": trade_id,
            "trader_id": trader_id,
            "symbol": symbol,
            "buy_date": buy_date.date(),
            "sell_date": sell_date.date(),
            "buy_value": round(buy_value, 2),
            "sell_value": round(sell_value, 2),
            "quantity": quantity,
            "pnl": round(pnl, 2)
        })

        previous_trade_result = pnl

        trade_id += 1

        current_date += timedelta(days=trade_gap)

df = pd.DataFrame(data)

# Save file
file_path = "data/raw/synthetic_trading_data.csv"
df.to_csv(file_path, index=False)


print("Dataset Generated Successfully")
print("Total Trades:", len(df))
print("Total Traders:", df['trader_id'].nunique())

#print(df.head())
print(df.shape)
