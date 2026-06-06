from report_generator import generate_report

generate_report(
    trader_id=1,
    trader_type="Disciplined Trader",
    top_features=[
        "Time Between Trades",
        "Trading Frequency",
        "Average Holding Period",
        "Holding Consistency",
        "Position Size Consistency"
    ]
)