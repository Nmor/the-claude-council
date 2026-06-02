---
name: ml-model-selection
description: Principal-level model selection framework — match problem class to model family (linear / tree / kernel / neural / foundation), evaluate via cross-validation with proper data splits, factor in inference cost + latency + interpretability + compliance constraints, and avoid the common traps that produce strong offline metrics but weak production performance.
---

# ML Model Selection

## Purpose

Model selection is the deliberate choice of which model family, training procedure, and hyperparameter regime best fits a given problem given constraints on data, compute, latency, interpretability, cost, and risk. The naive approach — "use a transformer for everything" or "just AutoML it" — wastes capital and produces fragile systems. Principal-level model selection starts from the problem (supervised classification? regression? sequence prediction? ranking? anomaly detection? recommendation? generation?), inventories available data (size, quality, distribution, drift), enumerates candidate model families with their characteristic trade-offs, runs disciplined cross-validation with leak-free splits, and reports results with confidence intervals + qualitative caveats. The output is not just "we chose XGBoost" — it's a defensible recommendation with documented rejection rationale for the alternatives.

## Standards Cited

- **Hastie, Tibshirani, Friedman "The Elements of Statistical Learning" 2e (2009, Springer)** — canonical statistical-learning reference
- **Goodfellow, Bengio, Courville "Deep Learning" (2016, MIT Press)** — neural-network foundations
- **Murphy "Probabilistic Machine Learning" (Vol I + II, 2022-2023, MIT Press)** — modern probabilistic + deep learning text
- **Géron "Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow" 3e** — applied workflow
- **NIST AI Risk Management Framework (AI RMF 1.0, 2023)** — governance + measurement
- **scikit-learn user guide + API stability policy** — sklearn API contract
- **MLflow + Weights & Biases experiment tracking conventions**
- **Kaggle competition methodology + grand-master playbooks** — empirical best practices
- **ACM FAccT (Fairness Accountability Transparency) proceedings** — fairness criteria
- **EU AI Act + Anthropic Responsible Scaling Policy** — high-risk-system thresholds

## When to Fire

- New supervised / unsupervised / reinforcement-learning problem requires a model choice
- Existing model in production is underperforming and needs replacement
- Cost / latency requirements changed (smaller model needed; larger budget for bigger model)
- Compliance changes (EU AI Act high-risk classification, financial regulation)
- Data distribution shift requires model re-architecture
- Foundation-model-vs-classical-ML evaluation for a workload
- Buy-vs-build decision for ML capabilities

## Core Patterns

### Pattern 1: Match problem class to model family

| Problem Class | Default Choice | When To Deviate |
| --- | --- | --- |
| **Tabular classification/regression** (< 100K rows, structured features) | Gradient-boosted trees (XGBoost / LightGBM / CatBoost) | Use logistic regression for interpretability; use linear/ridge for small-data |
| **Tabular at scale** (1M+ rows, deep feature interactions) | Gradient boosting still wins typically; TabNet / FT-Transformer for very wide feature spaces | Deep nets only if you have very wide data + GPU budget |
| **Image classification** | Pretrained CNN (ResNet / EfficientNet / ConvNeXt) fine-tuned | Vision Transformer (ViT) if very large dataset (>1M images) |
| **Object detection** | YOLO v8/v9, DETR, Faster R-CNN | Two-stage (Faster R-CNN) for precision; single-stage (YOLO) for speed |
| **Text classification** (short, well-defined labels) | Fine-tuned BERT-family encoder OR few-shot with Claude/GPT | Distilled BERT for cost/latency constraints |
| **Text generation / chat / Q&A** | Foundation model (Claude, GPT, Llama, Mistral) | Fine-tune small model if extreme cost sensitivity AND domain narrow |
| **Sequence prediction** (time series) | Gradient boosting on engineered features OR Temporal Fusion Transformer / NeuralForecast | Classical ARIMA / Prophet if simple seasonality |
| **Recommendation** | Two-tower neural retrieval + LightGBM re-ranker | Matrix factorisation for cold-start / interpretability |
| **Anomaly detection** | Isolation Forest / Autoencoder for unstructured; statistical methods (Tukey, Z-score) for tabular | Domain-specific (CUSUM for time series) |
| **Clustering / segmentation** | K-Means / HDBSCAN / Gaussian Mixture | UMAP + clustering for high-dimensional |
| **Reinforcement learning** | PPO / SAC for continuous; DQN family for discrete | Offline RL (CQL / IQL) when collection is expensive |

The default for tabular ML in 2026 remains gradient-boosted trees. They handle missingness, mixed types, non-linearity, interactions, and produce calibrated probabilities with little tuning. Deep learning for tabular is rarely worth the engineering overhead unless you genuinely have wide data or strong feature-interaction priors.

### Pattern 2: Disciplined evaluation

```python
from sklearn.model_selection import StratifiedKFold, TimeSeriesSplit
import numpy as np

def evaluate_model(model_factory, X, y, problem_type: str, groups=None):
    if problem_type == "classification_iid":
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    elif problem_type == "time_series":
        cv = TimeSeriesSplit(n_splits=5, gap=1)
    elif problem_type == "grouped":
        from sklearn.model_selection import GroupKFold
        cv = GroupKFold(n_splits=5)
    else:
        raise ValueError("specify problem_type")

    scores = []
    for fold_id, (train_idx, val_idx) in enumerate(cv.split(X, y, groups)):
        X_tr, X_va = X[train_idx], X[val_idx]
        y_tr, y_va = y[train_idx], y[val_idx]
        model = model_factory()
        model.fit(X_tr, y_tr)
        preds = model.predict_proba(X_va)[:, 1] if hasattr(model, "predict_proba") else model.predict(X_va)
        scores.append({
            "fold": fold_id,
            "auc": compute_auc(y_va, preds),
            "calibration_brier": compute_brier(y_va, preds),
            "f1_at_best_threshold": compute_f1(y_va, preds),
        })
    return {
        "mean_auc": np.mean([s["auc"] for s in scores]),
        "auc_ci_95": np.percentile([s["auc"] for s in scores], [2.5, 97.5]),
        "scores": scores,
    }
```

Key discipline:

- **NEVER fit on test**. Hold out a final test set used only ONCE at the end.
- **Match the split to the data generating process**. IID → stratified k-fold; time series → forward-walking; grouped (multiple rows per user) → group k-fold to avoid leakage.
- **Report confidence intervals**, not single point metric. If a model is 0.873 ± 0.012 AUC and the alternative is 0.879 ± 0.014, the difference is within noise.
- **Calibration matters as much as discrimination**. AUC tells you ranking; Brier score tells you whether predicted probabilities are well-calibrated. Production systems often need calibrated probabilities (for decision thresholds), not just rankings.

### Pattern 3: Beyond accuracy — the multi-objective lens

```yaml
model_evaluation:
  primary_metric:
    name: AUC-ROC
    candidate_A_xgboost: 0.873 [0.861, 0.885]
    candidate_B_logistic: 0.838 [0.826, 0.850]
    candidate_C_neural: 0.881 [0.864, 0.898]

  secondary_metrics:
    calibration_brier:
      xgboost: 0.142
      logistic: 0.156
      neural: 0.148

    f1_at_optimal_threshold:
      xgboost: 0.682
      logistic: 0.621
      neural: 0.687

  operational_metrics:
    inference_latency_p99_ms:
      xgboost: 12
      logistic: 2
      neural: 87

    training_cost_per_run_usd:
      xgboost: 4
      logistic: 0.20
      neural: 280

    monthly_compute_cost_at_production_qps_usd:
      xgboost: 240
      logistic: 18
      neural: 4800

  qualitative:
    interpretability:
      xgboost: medium (SHAP feature attribution)
      logistic: high (coefficients directly meaningful)
      neural: low (post-hoc explanation tools approximate)

    fairness_audit:
      xgboost: passes 4_5_demographic_parity
      logistic: passes 4_5_demographic_parity
      neural: marginal on 1_of_5 protected attributes

    robustness_to_distribution_shift:
      xgboost: tested on holdout 3-month gap; -2% AUC degradation
      logistic: tested same; -3% AUC degradation
      neural: tested same; -8% AUC degradation

  decision: xgboost
  rejection_rationale:
    logistic: 3.5% AUC short of xgboost; insufficient for use-case
    neural: marginal accuracy gain, 20× inference cost, fairness concern, robustness concern
```

Multi-objective evaluation prevents the "neural net wins by 0.8% AUC, we ship neural net" trap. The 0.8% gain is often within noise; the cost / latency / interpretability penalty is permanent.

### Pattern 4: Foundation models vs classical ML

| Workload | Use Foundation Model | Use Classical ML |
| --- | --- | --- |
| **Open-ended generation** | Yes (Claude, GPT) | No |
| **Few-shot classification on natural language** | Yes (prompted) | If you have >10K labels, classical can win on cost |
| **Structured extraction from text** | Yes (with structured output) | NER + rules if narrow domain + high volume |
| **Q&A over documents** | Yes (RAG over chunks) | No |
| **Tabular regression / classification** | Almost never | Yes |
| **Time series forecasting** | Some emerging (TimeGPT, Chronos); evaluate | Often classical still wins |
| **Computer vision** | CLIP for zero-shot; large vision models | Classical CNN / YOLO for production specialised tasks |

Foundation models excel at TASKS WITH LANGUAGE / NATURAL DATA + LOW VOLUME / HIGH DIVERSITY. Classical ML excels at WELL-DEFINED REPEATABLE PROBLEMS + HIGH VOLUME / NARROW DOMAIN. Picking the wrong side wastes 10-100x on cost.

### Pattern 5: Sample size + complexity matching

Generalisation requires N (data) >> p (parameters). Rough heuristics:

| Data Size | Recommended Model Complexity |
| --- | --- |
| < 1,000 labelled examples | Logistic / Ridge / Lasso; or pre-trained foundation model + few-shot |
| 1,000-10,000 | Tree ensemble (RF, XGBoost); pre-trained CNN/Transformer fine-tune |
| 10,000-100,000 | Tree ensemble; medium-depth neural nets; LLM fine-tune feasible |
| 100,000-1M | Tree ensemble (still!); deeper nets; LLM fine-tune cheap |
| > 1M | Deep learning becomes competitive; tabular still favours trees often |

Over-parameterised models on small data overfit catastrophically. Under-parameterised models on big data leave performance on the table.

## Anti-Patterns

### Anti-pattern 1: Leakage during cross-validation

Computing features (mean, std, target encoding) on the FULL dataset, then splitting into folds. The folds now contain information from each other; CV scores are optimistic by 5-15 AUC points. Fix: compute features WITHIN each fold's training partition only.

### Anti-pattern 2: Choosing the model that won 1 hyperparameter search

You ran 200 trials of XGBoost on the validation set; selected the best one. The "best" trial is partially noise — it overfit your validation set via 200 trials of multiple-comparisons. Always evaluate the FINAL chosen hyperparameters on a held-out test set you have not seen.

### Anti-pattern 3: Ignoring class imbalance

99% negative class. Model predicts all-negative: 99% accuracy. Useless. Use precision/recall, F1, PR-AUC, lift charts. Set class weights or use SMOTE / under-sampling as appropriate.

### Anti-pattern 4: Not comparing to a baseline

If you don't know what "predict the majority class" or "predict the mean" scores, you don't know whether your model is doing anything. Always include trivial baseline.

### Anti-pattern 5: Optimising for benchmark, not business metric

Benchmark says model A is best (AUC). Business cares about precision-at-top-100 (since downstream cost is per-prediction). Model B is worse on AUC but better on precision-at-top-100. Ship B. The eval metric must match the deployment objective.

### Anti-pattern 6: Foundation model for everything

"Just call Claude" for a 10M-row tabular fraud detection task. Cost: $30,000/day. XGBoost: $5/day, better accuracy. Foundation models cost ~100-1000× per inference vs deployed tree models.

### Anti-pattern 7: Ignoring fairness audit until last minute

Model in production six months. Regulator audit reveals 8% false-positive rate gap across protected groups. Model recall / retrain / litigation. Run fairness audits at validation time, not in production.

### Anti-pattern 8: Not measuring training-serving skew

Feature X is computed via batch SQL pipeline at training time; via real-time stream at serving time. Subtle difference in NULL handling. Production prediction quality degrades silently. Validate that training-time and serving-time features produce identical values for the same input.

## Verification Checklist

- [ ] Problem class identified explicitly (classification, regression, sequence, etc.)
- [ ] At least 3 candidate model families enumerated with trade-off summary
- [ ] Data size + dimensionality + class balance documented
- [ ] Train / validation / test split appropriate to data generating process
- [ ] Feature computation done INSIDE each fold (no leakage)
- [ ] Baseline (trivial predictor) score reported
- [ ] Primary metric matches business objective
- [ ] Confidence intervals reported, not just point estimates
- [ ] Calibration assessed (Brier score, reliability diagram)
- [ ] Fairness audit across protected attributes
- [ ] Inference latency + cost measured at production QPS
- [ ] Interpretability requirements satisfied (SHAP / coefficients / RuleFit)
- [ ] Robustness to distribution shift evaluated (temporal holdout)
- [ ] Final hyperparameters evaluated on TEST set ONCE
- [ ] Rejection rationale for non-chosen alternatives documented
- [ ] EU AI Act risk classification documented if applicable
- [ ] Model card produced (per `~/.claude/rules/common/task-intake-due-diligence.md` Q24)

## Cross-References

- `~/.claude/skills/mlops-patterns/SKILL.md` — production deployment infrastructure
- `~/.claude/skills/rag-design/SKILL.md` — when foundation-model RAG is the right architecture
- `~/.claude/skills/prompt-engineering/SKILL.md` — when prompted foundation model is the right choice
- `~/.claude/skills/fine-tuning-workflows/SKILL.md` — when fine-tuning a small model wins
- `~/.claude/skills/cost-aware-llm-pipeline/SKILL.md` — cost-aware routing among models
- `~/.claude/skills/observability-patterns/SKILL.md` — monitoring deployed models
- `~/.claude/rules/common/task-intake-due-diligence.md` Q24 (AI/ML ethics)

## Why This Skill Exists

The empirical record on model selection mistakes is consistent:

- **Wrong baseline**: teams optimise complex deep models when logistic regression would have served, paying 100× cost for 1% accuracy gain
- **Leakage**: SimpleAI 2024 study of 75 ML papers found 60% had some form of data leakage; production deployments crash relative to leaky CV scores
- **Benchmark-business gap**: Kaggle-winning solutions often fail in production because the Kaggle metric ≠ the business metric
- **Foundation model FOMO**: companies pay enterprise LLM bills for tasks that could run for pennies on classical models
- **Ignored fairness**: high-profile cases (Apple Card credit limits, COMPAS recidivism, healthcare risk scores) have produced regulatory and reputational fallout

Principal-level model selection is the antidote: match problem to model family, evaluate disciplined, report multi-objective, document rejection rationale. The patient analyst who runs the baseline first ships smaller, cheaper, more interpretable models that outperform the team that jumped to a transformer.

In a world where compute is cheap but engineering attention is scarce, the discipline of choosing the right model — and rejecting the wrong one — compounds productivity.

## Standards Cited

- **NIST AI RMF 1.0** — AI risk management framework (Govern / Map /
  Measure / Manage functions; MEASURE 2 covers model evaluation)
- **NIST SP 800-218A SSDF for AI** — Secure Software Development
  Framework profile for AI models (§PW.4, §PW.6, §PW.8)
- **NIST SP 800-53 Rev 5 §SI-4, §SI-7** — Information system
  monitoring + software integrity (applies to model + dataset
  artifacts)
- **ISO/IEC 23053:2022 §7** — Framework for AI systems using ML
- **ISO/IEC 23894:2023** — AI risk management
- **ISO/IEC 42001:2023** — AI management system requirements
- **OWASP Top 10 for LLM Applications (2025)** — LLM01 Prompt
  Injection, LLM02 Sensitive Information Disclosure, LLM06
  Excessive Agency, LLM09 Misinformation, LLM10 Unbounded
  Consumption
- **OWASP ML Top 10 (2023)** — ML01-ML10 (adversarial inputs,
  data poisoning, model inversion, etc.)
- **CWE-1039** — Automated recognition mechanism with inadequate
  detection or handling of adversarial input perturbations
- **CWE-1426** — Improper validation of generative AI output
- **EU AI Act (Regulation 2024/1689)** — risk-based obligations
  for general-purpose AI models + high-risk systems
- **`~/.claude/rules/common/council-triggers.md`** (Division 15) — bias,
  fairness, dataset provenance, human-in-the-loop gates

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Transformer / deep model chosen without comparing against linear / tree baseline (over-engineering)
- Cross-validation done with leaky splits (test data leaked into training — false-positive accuracy)
- Single metric reported (accuracy alone — class-imbalance hides false-positive cost)
- Fairness metrics not measured across demographic axes (per `~/.claude/rules-library/common/security.md` AI ethics)
- Inference latency / cost not benchmarked against SLO (model picked on accuracy only)
- Interpretability not considered when the use case is regulated (e.g., credit scoring)
- Model card / datasheet absent (per `~/.claude/rules/common/task-intake-due-diligence.md` Q24)
- Re-training cadence not defined (concept drift unmonitored)
- Hyperparameter tuning on test set (test-set leakage)
- Dataset provenance + licensing not documented

**Refinement candidates**:

- New model-family row when a new architecture becomes broadly applicable
- New cross-reference when a sister skill (mlops-patterns, rag-design, fine-tuning-workflows) adds a selection gate
- New fairness-metric row when a recurring bias class emerges in production
- Tightening of the baseline-first rule when over-engineering recurs
