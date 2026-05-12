import json
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss
import os

with open("historical_dataset.json") as f:
    dataset = json.load(f)

mu1 = np.array([d["mu1_raw"] for d in dataset]).reshape(-1, 1)
mu2 = np.array([d["mu2_raw"] for d in dataset]).reshape(-1, 1)
mu3 = np.array([d["mu3_raw"] for d in dataset]).reshape(-1, 1)
y   = np.array([d["true_outcome"] for d in dataset])

params = {}
for name, mu in [("agent1", mu1), ("agent2", mu2), ("agent3", mu3)]:
    clf = LogisticRegression(solver="lbfgs")
    clf.fit(mu, y)
    a = float(clf.coef_[0][0])
    b = float(clf.intercept_[0])

    mu_cal = 1 / (1 + np.exp(-(a * mu.flatten() + b)))
    brier_raw = brier_score_loss(y, mu.flatten())
    brier_cal = brier_score_loss(y, mu_cal)

    params[name] = {"a": a, "b": b}
    print(f"{name}: a={a:.4f}, b={b:.4f} | Brier raw={brier_raw:.4f} → calibrated={brier_cal:.4f}")

with open("platt_params.json", "w") as f:
    json.dump(params, f, indent=2)

print("\nSaved to platt_params.json")
