"""
Water Inrush Source Identification Model — CLSSA-XGBoost + SHAP
================================================================
Based on: "Identification model of mine water inrush source based on XGBoost and SHAP"
           Bencong Kou & Tingxin Wen, Scientific Reports (2025) 15:140

Implements:
  1. CLSSA — Tent Chaos mapping + Levy Flight improved Sparrow Search Algorithm
  2. XGBoost multi-class classifier (G1 / G2 / G3)
  3. SHAP global & local interpretability
  4. Synthetic training data seeded on Xinzhuangzi Mine hydrochemical ranges
  5. CSV upload path for real-world data replacement

Features (8 hydrochemical discriminants):
  X1 = Ca2+    X2 = Mg2+    X3 = K+Na+
  X4 = HCO3-   X5 = Cl-     X6 = SO42-
  X7 = Hardness  X8 = pH

Classes:
  G1 = Ordovician Limestone Water
  G2 = Tai-grey Water (Carboniferous Taiyuan limestone)
  G3 = Coal Series Sandstone Water
"""

import os
import math
import warnings
import numpy as np
import pandas as pd
import joblib
import shap
import xgboost as xgb
from typing import Dict, List, Any, Optional

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────
# FEATURE DEFINITIONS
# ─────────────────────────────────────────────────────────────

FEATURE_NAMES = ["Ca2+", "Mg2+", "K+Na+", "HCO3-", "Cl-", "SO42-", "Hardness", "pH"]
FEATURE_KEYS  = ["ca", "mg", "k_na", "hco3", "cl", "so4", "hardness", "ph"]

CLASS_LABELS = {
    0: "G1 (Ordovician Limestone Water)",
    1: "G2 (Tai-grey Water)",
    2: "G3 (Coal Series Sandstone Water)"
}
CLASS_SHORT = {0: "G1", 1: "G2", 2: "G3"}


# ─────────────────────────────────────────────────────────────
# 1. SYNTHETIC DATA GENERATOR
#    Ranges calibrated from Table 1 and Fig 9 of the paper
# ─────────────────────────────────────────────────────────────

def _rnd(lo: float, hi: float, rng: np.random.Generator) -> float:
    return float(rng.uniform(lo, hi))


def generate_synthetic_samples(n_g1: int = 60, n_g2: int = 60, n_g3: int = 60, seed: int = 42) -> pd.DataFrame:
    """
    Generate realistic hydrochemical samples for three water inrush classes.

    Ranges based on Xinzhuangzi Mine data (paper Table 1 + SHAP Fig 9 analysis):
      G1: low HCO3, low K+Na, high pH (>8.5)
      G2: high Hardness, moderate HCO3, moderate pH (7-7.5)
      G3: very high K+Na, very high HCO3, moderate-high pH (7.8-8.5)
    """
    rng = np.random.default_rng(seed)
    rows = []

    for _ in range(n_g1):
        rows.append({
            "Ca2+":     _rnd(0.15, 1.20, rng),
            "Mg2+":     _rnd(0.35, 1.10, rng),
            "K+Na+":    _rnd(1.20, 5.50, rng),
            "HCO3-":    _rnd(0.70, 1.50, rng),
            "Cl-":      _rnd(0.70, 3.50, rng),
            "SO42-":    _rnd(0.00, 0.15, rng),
            "Hardness": _rnd(2.00, 5.50, rng),
            "pH":       _rnd(8.60, 9.60, rng),
            "label": 0
        })

    for _ in range(n_g2):
        rows.append({
            "Ca2+":     _rnd(3.50, 6.00, rng),
            "Mg2+":     _rnd(0.80, 2.20, rng),
            "K+Na+":    _rnd(1.50, 3.50, rng),
            "HCO3-":    _rnd(5.50, 8.50, rng),
            "Cl-":      _rnd(0.55, 1.00, rng),
            "SO42-":    _rnd(0.40, 1.20, rng),
            "Hardness": _rnd(12.0, 22.0, rng),
            "pH":       _rnd(6.90, 7.50, rng),
            "label": 1
        })

    for _ in range(n_g3):
        rows.append({
            "Ca2+":     _rnd(0.10, 0.80, rng),
            "Mg2+":     _rnd(0.10, 0.50, rng),
            "K+Na+":    _rnd(25.0, 45.0, rng),
            "HCO3-":    _rnd(20.0, 42.0, rng),
            "Cl-":      _rnd(0.55, 0.90, rng),
            "SO42-":    _rnd(0.00, 0.30, rng),
            "Hardness": _rnd(0.80, 3.50, rng),
            "pH":       _rnd(7.80, 8.60, rng),
            "label": 2
        })

    df = pd.DataFrame(rows)
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    return df


# ─────────────────────────────────────────────────────────────
# 2. CLSSA ALGORITHM
#    Tent Chaos Mapping + Levy Flight + Sparrow Search
# ─────────────────────────────────────────────────────────────

class CLSSA:
    """
    Improved Sparrow Search Algorithm with:
      - Tent Chaotic Population Initialization (global coverage)
      - Levy Flight position update for joiners (escape local optima)

    Optimizes: XGBoost hyperparameters [n_estimators, max_depth, learning_rate]
    """

    def __init__(
        self,
        pop_size: int = 60,
        max_iter: int = 100,
        finder_ratio: float = 0.70,
        scout_ratio: float = 0.20,
        alert_value: float = 0.80,
        alpha: float = 0.50,
        beta: float = 1.50,
        seed: int = 42
    ):
        self.pop_size    = pop_size
        self.max_iter    = max_iter
        self.n_finders   = max(1, int(pop_size * finder_ratio))
        self.n_scouts    = max(1, int(pop_size * scout_ratio))
        self.alert_value = alert_value
        self.alpha       = alpha
        self.beta        = beta
        self.rng         = np.random.default_rng(seed)

        # Bounds: [n_estimators, max_depth, learning_rate]
        self.lb  = np.array([20,  2, 0.01])
        self.ub  = np.array([300, 10, 0.50])
        self.dim = 3

        self.best_pos: Optional[np.ndarray] = None
        self.best_fit: float = float("inf")
        self.fitness_curve: List[float] = []

    def _tent_chaos(self, size: int) -> np.ndarray:
        x = float(self.rng.random())
        seq = np.zeros((size, self.dim))
        for i in range(size):
            seq[i, :] = x
            if x < self.alpha:
                x = x / self.alpha
            else:
                x = (1.0 - x) / (1.0 - self.alpha)
            x = float(np.clip(x, 1e-9, 1.0 - 1e-9))
        perturb = self.rng.random((size, self.dim)) * 0.05
        seq = np.clip(seq + perturb, 0, 1)
        return seq

    def _chaos_init(self) -> np.ndarray:
        chaos = self._tent_chaos(self.pop_size)
        return self.lb + chaos * (self.ub - self.lb)

    def _levy(self) -> np.ndarray:
        beta = self.beta
        num = math.gamma(1 + beta) * math.sin(math.pi * beta / 2)
        den = math.gamma((1 + beta) / 2) * beta * (2 ** ((beta - 1) / 2))
        sigma_u = (num / den) ** (1.0 / beta)
        u = self.rng.normal(0, sigma_u, self.dim)
        v = self.rng.normal(0, 1, self.dim)
        return 0.05 * u / (np.abs(v) ** (1.0 / beta))

    def _fitness(self, pos: np.ndarray, X_tr: np.ndarray, y_tr: np.ndarray) -> float:
        from sklearn.model_selection import cross_val_score
        n_est = max(10, int(round(pos[0])))
        depth = max(1, int(round(pos[1])))
        lr    = float(np.clip(pos[2], 0.001, 1.0))
        clf = xgb.XGBClassifier(
            n_estimators=n_est,
            max_depth=depth,
            learning_rate=lr,
            objective="multi:softprob",
            num_class=3,
            use_label_encoder=False,
            eval_metric="mlogloss",
            verbosity=0,
            random_state=42
        )
        scores = cross_val_score(clf, X_tr, y_tr, cv=3, scoring="f1_macro", n_jobs=-1)
        return float(1.0 - scores.mean())

    def optimize(self, X_tr: np.ndarray, y_tr: np.ndarray) -> Dict[str, Any]:
        print("[CLSSA] Initialising population with Tent chaos mapping...")
        pop = self._chaos_init()
        pop = np.clip(pop, self.lb, self.ub)
        fit = np.array([self._fitness(p, X_tr, y_tr) for p in pop])

        best_idx = int(np.argmin(fit))
        self.best_pos = pop[best_idx].copy()
        self.best_fit = float(fit[best_idx])
        print(f"[CLSSA] Init best F1 = {1 - self.best_fit:.4f}")

        for t in range(self.max_iter):
            order = np.argsort(fit)
            pop, fit = pop[order], fit[order]
            R2 = float(self.rng.random())

            for i in range(self.n_finders):
                if R2 < self.alert_value:
                    Q = float(self.rng.random())
                    pop[i] = pop[i] * np.exp(-i / (Q * self.max_iter + 1e-9))
                else:
                    pop[i] = pop[i] + self.rng.normal(0, 1, self.dim)

            best_pos_now = pop[0].copy()
            for i in range(self.n_finders, self.pop_size):
                if i > self.pop_size // 2:
                    pop[i] = self.rng.normal(0, 1, self.dim) * np.exp(
                        (pop[-1] - pop[i]) / (i ** 2 + 1e-9)
                    )
                else:
                    levy_step = self._levy()
                    pop[i] = best_pos_now + levy_step * (pop[i] - best_pos_now)

            scout_idx = self.rng.choice(self.pop_size, self.n_scouts, replace=False)
            for idx in scout_idx:
                if fit[idx] > fit[0]:
                    pop[idx] = pop[0] + self.rng.normal(0, 1, self.dim) * (
                        pop[idx] - pop[0]
                    ) / (fit[idx] - fit[0] + 1e-9)
                else:
                    pop[idx] = pop[idx] + self.rng.random(self.dim) * 2 - 1

            pop = np.clip(pop, self.lb, self.ub)

            for i in range(self.pop_size):
                f = self._fitness(pop[i], X_tr, y_tr)
                fit[i] = f
                if f < self.best_fit:
                    self.best_fit = f
                    self.best_pos = pop[i].copy()

            self.fitness_curve.append(self.best_fit)
            if (t + 1) % 10 == 0:
                print(f"[CLSSA] Iter {t+1:3d}/{self.max_iter}  best_F1={1 - self.best_fit:.4f}")

        best_ne    = max(10, int(round(self.best_pos[0])))
        best_depth = max(1, int(round(self.best_pos[1])))
        best_lr    = float(np.clip(self.best_pos[2], 0.001, 1.0))

        print(f"\n[CLSSA] Done.  F1={1-self.best_fit:.4f}  NE={best_ne}  TD={best_depth}  LR={best_lr:.4f}")
        return {
            "n_estimators":  best_ne,
            "max_depth":     best_depth,
            "learning_rate": best_lr,
            "best_f1":       round(1 - self.best_fit, 4),
            "fitness_curve": [round(1 - v, 4) for v in self.fitness_curve]
        }


# ─────────────────────────────────────────────────────────────
# 3. CLSSA-XGBOOST TRAINER
# ─────────────────────────────────────────────────────────────

def train_water_inrush_model(
    df: Optional[pd.DataFrame] = None,
    run_clssa: bool = True,
    clssa_pop: int = 60,
    clssa_iter: int = 50,
    save_dir: Optional[str] = None,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Full training pipeline:
      1. Use provided df or generate synthetic data
      2. CLSSA hyperparameter optimisation (optional)
      3. Train XGBoost on optimal params
      4. SHAP explainer fitting
      5. Save model + explainer + scaler

    Args:
      df        : DataFrame with FEATURE_NAMES + 'label' (0/1/2).
                  If None, synthetic data is auto-generated.
      run_clssa : Run CLSSA optimisation (True) or use paper defaults (False)
      save_dir  : Directory to save .pkl files
      seed      : Random seed

    Returns:
      dict with training metrics, optimal params, and SHAP global importances
    """
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing   import StandardScaler
    from sklearn.metrics         import (
        precision_score, recall_score, f1_score, classification_report
    )

    if df is None:
        print("[Train] Generating synthetic Xinzhuangzi-like samples...")
        df = generate_synthetic_samples(n_g1=60, n_g2=60, n_g3=60, seed=seed)

    X = df[FEATURE_NAMES].values.astype(float)
    y = df["label"].values.astype(int)
    print(f"[Train] Dataset: {len(X)} samples  G1={sum(y==0)}  G2={sum(y==1)}  G3={sum(y==2)}")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_tr, X_te, y_tr, y_te = train_test_split(
        X_scaled, y, test_size=0.20, random_state=seed, stratify=y
    )

    if run_clssa:
        optimizer = CLSSA(pop_size=clssa_pop, max_iter=clssa_iter, seed=seed)
        opt_result = optimizer.optimize(X_tr, y_tr)
        n_est = opt_result["n_estimators"]
        depth = opt_result["max_depth"]
        lr    = opt_result["learning_rate"]
        fitness_curve = opt_result["fitness_curve"]
    else:
        n_est, depth, lr = 43, 3, 0.3814
        fitness_curve = []
        opt_result = {
            "n_estimators": n_est, "max_depth": depth,
            "learning_rate": lr, "best_f1": None, "fitness_curve": []
        }
        print(f"[Train] Paper defaults: NE={n_est}, TD={depth}, LR={lr}")

    print(f"\n[Train] Training XGBoost  NE={n_est}  depth={depth}  LR={lr:.4f}...")
    model = xgb.XGBClassifier(
        n_estimators=n_est,
        max_depth=depth,
        learning_rate=lr,
        objective="multi:softprob",
        num_class=3,
        use_label_encoder=False,
        eval_metric="mlogloss",
        verbosity=0,
        random_state=seed
    )
    model.fit(X_tr, y_tr)

    y_pred = model.predict(X_te)
    prec   = precision_score(y_te, y_pred, average="macro", zero_division=0)
    rec    = recall_score(y_te, y_pred, average="macro", zero_division=0)
    f1     = f1_score(y_te, y_pred, average="macro", zero_division=0)

    print(f"\n[Result]  Precision={prec*100:.2f}%  Recall={rec*100:.2f}%  F1={f1*100:.2f}%")
    print(classification_report(y_te, y_pred,
          target_names=["G1-Ordovician", "G2-Taigrey", "G3-CoalSeries"]))

    print("[SHAP] Fitting TreeExplainer...")
    explainer = shap.TreeExplainer(model)
    shap_vals = explainer.shap_values(X_te)

    global_importance = {}
    for ci in range(3):
        mean_abs = np.abs(shap_vals[ci]).mean(axis=0)
        global_importance[CLASS_SHORT[ci]] = {
            feat: float(round(v, 4))
            for feat, v in zip(FEATURE_NAMES, mean_abs)
        }

    if save_dir is None:
        save_dir = os.path.dirname(os.path.abspath(__file__))

    paths = {
        "model":     os.path.join(save_dir, "water_inrush_model.pkl"),
        "explainer": os.path.join(save_dir, "water_inrush_explainer.pkl"),
        "scaler":    os.path.join(save_dir, "water_inrush_scaler.pkl"),
    }
    joblib.dump(model,     paths["model"])
    joblib.dump(explainer, paths["explainer"])
    joblib.dump(scaler,    paths["scaler"])
    print(f"[Saved] {paths['model']}")
    print(f"[Saved] {paths['explainer']}")
    print(f"[Saved] {paths['scaler']}")

    return {
        "precision":      round(prec * 100, 2),
        "recall":         round(rec  * 100, 2),
        "f1":             round(f1   * 100, 2),
        "optimal_params": {
            "n_estimators":  n_est,
            "max_depth":     depth,
            "learning_rate": round(lr, 4)
        },
        "fitness_curve": fitness_curve,
        "global_shap":   global_importance,
        "model_path":    paths["model"],
        "clssa_used":    run_clssa
    }


# ─────────────────────────────────────────────────────────────
# 4. INFERENCE  (single sample prediction)
# ─────────────────────────────────────────────────────────────

class WaterInrushPredictor:
    """Loads saved model/explainer/scaler and provides prediction + SHAP API."""

    def __init__(self, base_dir: Optional[str] = None):
        if base_dir is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))

        def _load(name: str):
            path = os.path.join(base_dir, name)
            return joblib.load(path) if os.path.exists(path) else None

        self.model     = _load("water_inrush_model.pkl")
        self.explainer = _load("water_inrush_explainer.pkl")
        self.scaler    = _load("water_inrush_scaler.pkl")
        self.ready     = self.model is not None and self.scaler is not None

    def predict(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Predict water inrush source and return SHAP local explanation.

        Args:
          features: dict with keys matching FEATURE_KEYS
            e.g. {"ca": 0.32, "mg": 0.48, "k_na": 2.15,
                   "hco3": 0.90, "cl": 1.15, "so4": 0.03,
                   "hardness": 2.24, "ph": 9.30}

        Returns:
          {
            predicted_class, predicted_class_short, class_index,
            probabilities, confidence, shap_values, shap_baseline, key_features
          }
        """
        if not self.ready:
            raise RuntimeError("Model not loaded. Run train_water_inrush_model() first.")

        x_raw    = np.array([[features.get(k, 0.0) for k in FEATURE_KEYS]], dtype=float)
        x_scaled = self.scaler.transform(x_raw)
        proba    = self.model.predict_proba(x_scaled)[0]
        cls_idx  = int(np.argmax(proba))

        shap_result   = {}
        key_features  = []
        baseline      = None

        if self.explainer is not None:
            sv_raw = self.explainer.shap_values(x_scaled)
            expected = self.explainer.expected_value

            # SHAP >=0.41 returns ndarray shape (n_samples, n_features, n_classes)
            # Older SHAP returns list of n_classes arrays each (n_samples, n_features)
            if isinstance(sv_raw, np.ndarray) and sv_raw.ndim == 3:
                # shape: (1, n_features, 3)
                sv_list = [sv_raw[0, :, c] for c in range(3)]   # each: (n_features,)
            elif isinstance(sv_raw, list):
                sv_list = [sv_raw[c][0] for c in range(3)]      # each: (n_features,)
            else:
                # 2D fallback — binary or unexpected
                sv_list = [sv_raw[0] for _ in range(3)]

            if hasattr(expected, "__len__"):
                baseline = float(expected[cls_idx])
            else:
                baseline = float(expected)

            for c in range(3):
                shap_result[CLASS_SHORT[c]] = {
                    feat: float(round(v, 4))
                    for feat, v in zip(FEATURE_NAMES, sv_list[c])
                }

            sv_pred = sv_list[cls_idx]
            key_features = sorted([
                {
                    "feature":   feat,
                    "shap":      float(round(sv_val, 4)),
                    "value":     float(round(features.get(k, 0.0), 4)),
                    "direction": "positive" if sv_val > 0 else "negative"
                }
                for feat, k, sv_val in zip(FEATURE_NAMES, FEATURE_KEYS, sv_pred)
            ], key=lambda d: abs(d["shap"]), reverse=True)

        return {
            "predicted_class":       CLASS_LABELS[cls_idx],
            "predicted_class_short": CLASS_SHORT[cls_idx],
            "class_index":           cls_idx,
            "probabilities": {
                CLASS_SHORT[i]: round(float(p) * 100, 2) for i, p in enumerate(proba)
            },
            "confidence":    round(float(proba[cls_idx]) * 100, 2),
            "shap_values":   shap_result,
            "shap_baseline": round(baseline, 4) if baseline is not None else None,
            "key_features":  key_features,
        }

    def global_shap_importance(self, df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
        """Compute global SHAP feature importance. Uses synthetic demo data if df is None."""
        if not self.ready:
            raise RuntimeError("Model not loaded.")
        if df is None:
            df = generate_synthetic_samples(n_g1=20, n_g2=20, n_g3=20)

        X_scaled = self.scaler.transform(df[FEATURE_NAMES].values.astype(float))
        sv_raw = self.explainer.shap_values(X_scaled)

        # Handle both SHAP output shapes
        if isinstance(sv_raw, np.ndarray) and sv_raw.ndim == 3:
            # shape: (n_samples, n_features, n_classes)
            sv_list = [sv_raw[:, :, c] for c in range(3)]
        elif isinstance(sv_raw, list):
            sv_list = sv_raw  # list of (n_samples, n_features)
        else:
            sv_list = [sv_raw for _ in range(3)]

        result = {}
        for c in range(3):
            mean_abs = np.abs(sv_list[c]).mean(axis=0)
            result[CLASS_SHORT[c]] = sorted(
                [{"feature": f, "importance": float(round(v, 4))}
                 for f, v in zip(FEATURE_NAMES, mean_abs)],
                key=lambda x: x["importance"], reverse=True
            )

        overall = np.array([np.abs(sv_list[c]).mean(axis=0) for c in range(3)]).mean(axis=0)
        result["overall"] = sorted(
            [{"feature": f, "importance": float(round(v, 4))}
             for f, v in zip(FEATURE_NAMES, overall)],
            key=lambda x: x["importance"], reverse=True
        )
        return result


# ─────────────────────────────────────────────────────────────
# 5. ENTRY POINT
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print(" CLSSA-XGBoost  Water Inrush Source Identification")
    print("=" * 60)

    results = train_water_inrush_model(
        df=None, run_clssa=True, clssa_pop=30, clssa_iter=20
    )
    print(f"\n[Summary] P={results['precision']}%  R={results['recall']}%  F1={results['f1']}%")
    print(f"  Optimal params: {results['optimal_params']}")

    predictor = WaterInrushPredictor()
    importance = predictor.global_shap_importance()
    print("\n[SHAP] Top 5 global features:")
    for item in importance.get("overall", [])[:5]:
        print(f"  {item['feature']:12s}  {item['importance']:.4f}")

    # Test — Sample 1 from Table 1 (G1)
    pred = predictor.predict({
        "ca": 0.32, "mg": 0.48, "k_na": 2.15,
        "hco3": 0.90, "cl": 1.15, "so4": 0.03,
        "hardness": 2.24, "ph": 9.30
    })
    print(f"\n[Test Prediction]")
    print(f"  Predicted  : {pred['predicted_class']}")
    print(f"  Confidence : {pred['confidence']}%")
    for kf in pred["key_features"][:3]:
        print(f"  {kf['feature']:12s}  SHAP={kf['shap']:+.4f}  ({kf['direction']})")
