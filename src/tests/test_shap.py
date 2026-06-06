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

from explainability.shap_explainer import explain_trader

for trader_id in [1, 3, 5, 7]:

    prediction, features = explain_trader(
        trader_id - 1
    )

    print("\n===================")
    print("Trader:", trader_id)
    print("Type:", prediction)
    print("Features:", features)