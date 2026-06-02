---
name: mlops-patterns
description: Principal-level MLOps — feature stores, model registry, training pipelines, deployment patterns (online / batch / streaming), monitoring (drift, performance, fairness), CI/CD for models, A/B testing, rollback discipline. Treat models as software artefacts with full lifecycle management.
---

# MLOps Patterns

## Purpose

MLOps is the engineering discipline that takes a model from notebook to production and keeps it healthy across the long lifecycle of retraining, monitoring, drift, A/B testing, and eventual deprecation. Without MLOps, ML teams burn 60-80% of their time on glue code, debugging environment drift, manually retraining, chasing data quality issues, and explaining why the model's offline metrics no longer match production behaviour. With MLOps, models are software artefacts subject to the same discipline as any other production system: versioned in a registry, tested via CI, deployed via blue/green or canary, monitored via metrics + drift detectors, rolled back on regression. The discipline is operational, not statistical; the result is reliable ML systems that scale to many models and many teams.

This skill governs the platform-side ML lifecycle: feature stores, training pipelines, model registry, packaging, deployment patterns, real-time vs batch inference, monitoring (data drift, prediction drift, performance drift, fairness drift), A/B testing, retraining triggers, and the cost / latency / safety controls that production ML demands.

## Standards Cited

- **Google "Rules of Machine Learning" (Zinkevich, ongoing)** — 43 operational ML rules
- **Google "Hidden Technical Debt in Machine Learning Systems" (Sculley et al., NeurIPS 2015)** — landmark paper on ML system debt
- **Microsoft "Software Engineering for Machine Learning" (Amershi et al., 2019)** — engineering practices
- **ML Test Score (Breck et al., 2017)** — operational ML testing rubric
- **Continuous Delivery for Machine Learning (Sato + Wider + Windheuser, 2019, ThoughtWorks)** — CD4ML framework
- **MLflow + Weights & Biases + Neptune + DVC** — standard tools
- **Kubeflow / Vertex AI / SageMaker / Databricks** — managed platforms
- **Feast + Tecton + Hopsworks** — feature stores
- **NIST AI RMF 1.0 (2023) + EU AI Act + Anthropic Responsible Scaling Policy**

## When to Fire

- Promoting a model from notebook to production
- Building or refactoring training pipeline
- Designing feature store or registry
- Deployment architecture decisions (online / batch / streaming)
- Setting up model monitoring + drift detection
- A/B testing infrastructure for ML
- Retraining cadence + trigger policy
- Cost optimisation for inference workloads
- Compliance / governance program for ML systems

## Core Patterns

### Pattern 1: The ML platform stack

```text
┌────────────────────────────────────────────────────────────┐
│  Use cases (recommender, fraud, churn, ranker, LLM agent)  │
├────────────────────────────────────────────────────────────┤
│  Serving: REST / gRPC / batch / streaming                  │
│  → Triton / TorchServe / KServe / TF Serving / Lambda      │
├────────────────────────────────────────────────────────────┤
│  Model registry (versioned artefacts + metadata)           │
│  → MLflow / SageMaker Model Registry / Vertex Registry     │
├────────────────────────────────────────────────────────────┤
│  Training orchestration (pipelines, distributed)           │
│  → Kubeflow / Airflow / Step Functions / Dagster / Vertex  │
├────────────────────────────────────────────────────────────┤
│  Experiment tracking (runs, metrics, params, artefacts)    │
│  → MLflow / W&B / Neptune / Comet                          │
├────────────────────────────────────────────────────────────┤
│  Feature store (offline + online consistency)              │
│  → Feast / Tecton / Hopsworks / SageMaker Feature Store    │
├────────────────────────────────────────────────────────────┤
│  Data lake + warehouse + streaming                         │
│  → S3 / GCS + Snowflake / BigQuery / Databricks + Kafka    │
├────────────────────────────────────────────────────────────┤
│  Observability + monitoring                                │
│  → Prometheus / Grafana / Datadog + custom drift detectors │
└────────────────────────────────────────────────────────────┘
```

Don't build all layers yourself. For most teams: cloud-managed (SageMaker, Vertex, Databricks ML) handles 80% of needs at lower TCO than custom Kubeflow.

### Pattern 2: Feature store — train/serve consistency

```python
from feast import FeatureStore, Entity, FeatureView, Field
from feast.types import Float64, Int64

user = Entity(name="user_id", value_type=Int64)

user_features = FeatureView(
    name="user_features",
    entities=[user],
    ttl=timedelta(days=7),
    schema=[
        Field(name="lifetime_orders", dtype=Int64),
        Field(name="avg_order_value_30d", dtype=Float64),
        Field(name="days_since_signup", dtype=Int64),
        Field(name="churn_risk_score", dtype=Float64),
    ],
    source=user_features_source,
)

# Training: get features at historical timestamps
training_df = store.get_historical_features(
    entity_df=labels_df,  # contains user_id + event_timestamp + label
    features=["user_features:lifetime_orders", "user_features:avg_order_value_30d"],
).to_df()

# Serving: get features for online inference
features = store.get_online_features(
    features=["user_features:lifetime_orders", "user_features:avg_order_value_30d"],
    entity_rows=[{"user_id": user_id}],
).to_dict()
```

The feature store solves training-serving skew: the SAME logic computes features for offline training and online inference. Point-in-time correctness is critical — training features must reflect what would have been known at decision time, not after.

### Pattern 3: Training pipeline as code

```python
# Kubeflow Pipelines / Vertex AI Pipelines / Dagster / Prefect
@pipeline(name="churn_model_training")
def train_churn_model_pipeline(
    snapshot_date: str,
    model_version: str,
):
    raw_data = extract_data_task(snapshot_date=snapshot_date)
    validated_data = validate_data_task(raw_data, schema_path="schema/v3.yaml")
    features = compute_features_task(validated_data, feature_view="user_features")
    train_set, val_set, test_set = split_task(features, strategy="temporal")

    model = train_model_task(
        train_set=train_set,
        val_set=val_set,
        hyperparameters={"max_depth": 6, "n_estimators": 1500, "learning_rate": 0.03},
    )

    metrics = evaluate_task(model, test_set)
    fairness_audit = fairness_task(model, test_set, protected_attrs=["region", "tenure_bucket"])
    register = register_model_task(
        model=model,
        version=model_version,
        metrics=metrics,
        fairness=fairness_audit,
        approval_required=True,
    )
    return register
```

Pipeline-as-code provides:

- Reproducibility (snapshot_date + code commit + hyperparameters fully determine outputs)
- Lineage (each artefact traced back to its inputs)
- Scheduled retraining (daily/weekly/monthly cadence)
- On-demand retraining (drift detector triggers run)

### Pattern 4: Deployment patterns

| Pattern | When | Trade-offs |
| --- | --- | --- |
| **Batch scoring** | Daily/hourly scoring of all users; no real-time decision | Simple; cheap; high latency |
| **Online REST** | Per-request inference; latency < 100ms typical | Standard; requires load balancing + autoscale |
| **Online gRPC** | Lower latency; type-safe; service-to-service | Faster than REST; more dependency on tooling |
| **Streaming** | Inference on Kafka / Kinesis events | High throughput; harder error handling |
| **Edge / on-device** | Mobile, IoT, offline | Model compression mandatory; quantisation; ONNX/CoreML/TFLite |
| **Embedded in DB** (BigQuery ML, Postgres pgml) | When data is in warehouse and you score in-place | Limited model types; vendor lock-in |
| **Shadow mode** | Run new model alongside production; compare; don't act | First step of rollout |
| **Canary** | Route X% of traffic to new model; observe; ramp | Safe rollout |
| **A/B test** | Random users see different models; measure business metric | Statistical rigour required |
| **Multi-arm bandit** | Adaptive routing; exploit best-performing model | More complex; requires reward signal |

### Pattern 5: Model monitoring (the four drifts)

```yaml
monitoring_signals:
  data_drift:
    description: Distribution of input features changes from training
    detector: Kolmogorov-Smirnov / Population Stability Index per feature
    threshold: PSI > 0.25 = significant drift; PSI > 0.10 = warning
    action: Alert; investigate; consider retrain

  prediction_drift:
    description: Distribution of model outputs changes
    detector: KS / EMD on prediction distribution
    threshold: Output mean shifts > 2 sigma; or distribution KL > 0.5
    action: Alert; pair with data_drift; root cause

  performance_drift:
    description: Model accuracy / AUC / business metric degrades
    detector: Rolling window AUC on labelled data; CUSUM on residuals
    threshold: AUC drops > 5% from baseline over 14 days
    action: Page on-call; retrain; consider rollback

  fairness_drift:
    description: Group disparities widen
    detector: TPR / FPR / acceptance-rate per protected group; monitor disparity
    threshold: Disparity grows beyond pre-commit fairness budget
    action: Compliance review; retrain with fairness constraints

operational_signals:
  - prediction_latency_p95_ms
  - prediction_qps
  - error_rate
  - feature_freshness_minutes  # how stale are features?
  - feature_null_rate          # are upstream pipelines broken?
  - model_version_in_serving
  - prediction_logging_completeness
  - cost_per_1k_predictions_usd
```

### Pattern 6: CI/CD for models

```yaml
ml_ci_pipeline:
  on_pull_request:
    - lint: black + ruff + mypy
    - unit_tests: pytest tests/unit/
    - data_validation_tests: pytest tests/data/
    - small_training_run: train on sample (1000 rows); verify no errors
    - model_quality_tests: load latest model; verify inference shape + sanity preds

  on_merge_to_main:
    - full_training_run: on full data
    - automated_evaluation:
        - holdout metrics within tolerance of baseline
        - fairness metrics within budget
        - inference latency below SLO
    - register_candidate: tag as "candidate" in registry
    - require_human_approval: yes (for high-risk models per EU AI Act)

  on_deploy_approval:
    - shadow_deploy: route prod traffic; do not act on predictions
    - canary_deploy: 1% → 10% → 50% → 100% over 1 week
    - monitoring_gates: drift, perf, fairness must stay green at each stage
    - automatic_rollback: on regression > tolerance

  scheduled:
    - daily_retraining: if drift detected OR weekly cadence
    - monthly_fairness_audit
    - quarterly_model_card_refresh
```

### Pattern 7: Retraining triggers

```python
def should_retrain(monitoring: dict) -> tuple[bool, str]:
    if monitoring["data_drift_psi_p95"] > 0.25:
        return True, "data_drift_severe"
    if monitoring["performance_auc_7d"] < monitoring["baseline_auc"] - 0.05:
        return True, "performance_degradation"
    if monitoring["days_since_last_train"] > 30:
        return True, "scheduled_freshness"
    if monitoring["new_label_count"] > 100_000:
        return True, "sufficient_new_labels"
    if monitoring["fairness_disparity_growth"] > 0.05:
        return True, "fairness_drift"
    return False, "no_trigger"
```

Don't retrain on a fixed cadence alone — retrain when SIGNALS demand it. Otherwise compute waste compounds.

### Pattern 8: Rollback discipline

```yaml
rollback_protocol:
  triggers:
    - error_rate > 2x baseline sustained 5 min
    - prediction_latency_p99 > SLO sustained 5 min
    - business_metric_degradation > pre_commit_threshold
    - fairness_breach detected
    - feature_pipeline_broken

  rollback_steps:
    1. detect: monitoring alert + on-call paged
    2. classify: incident severity
    3. decide: rollback vs hold vs roll-forward
    4. execute: revert to previous model version via registry pointer flip
    5. verify: monitoring returns to baseline
    6. comms: status page + internal slack
    7. post_mortem: within 5 business days

  rollback_time_target_minutes: 5
```

Every production model MUST have a pre-tested rollback path. The "we'll figure it out if it breaks" approach destroys customer trust during the inevitable first incident.

## Anti-Patterns

### Anti-pattern 1: Notebook-to-production via copy-paste

Data scientist's notebook imported to production handler. No tests, no versioning, no reproducibility. The model that scored 0.87 in the notebook scores 0.72 in production due to environment differences.

### Anti-pattern 2: No feature store, train-serve skew

Training features computed via Pandas + offline SQL; serving features computed via real-time stream. Subtle differences in null handling, time zones, default values. Production accuracy silently lower than offline metrics.

### Anti-pattern 3: Manual deployment

Engineer SSHs into prod box, copies a pickle file, restarts the service. No versioning, no audit, no rollback. Standard practice in 2014; malpractice in 2026.

### Anti-pattern 4: No monitoring after deployment

Model deployed. Six months later, accuracy is 40% lower than launch, but nobody noticed because no monitoring was in place. Drift wasn't detected; retraining wasn't triggered.

### Anti-pattern 5: Ignoring label delay

Fraud model trained on data from 90 days ago because that's when labels mature. Deployed today. Drift detector compares today's input distribution to 90-day-old training distribution — false positive drift alerts. Properly account for label delay in drift detection.

### Anti-pattern 6: Conflating prediction logging with feature logging

Only logging model outputs but not the input features. Six months later you can't reproduce a misprediction because the features that produced it aren't available. Log BOTH (sample if volume is too high).

### Anti-pattern 7: Catastrophic A/B test design

A/B test results show treatment beats control 0.5% on click-through rate. P-value 0.04. Ship. Reality: multiple comparisons across 8 metrics, peeking at results daily, no proper sample-size calculation. False positive ships; production metric doesn't move.

### Anti-pattern 8: No fairness monitoring

Hiring model live for 18 months. Plaintiff lawsuit. Discovery shows protected-attribute disparities grew steadily. Pre-commit fairness budget + monitoring would have flagged at month 3.

### Anti-pattern 9: Same model behind every prediction

Different user segments have different needs. Single monolithic model under-serves the minorities. Segment-aware models or ensembles often work better.

## Verification Checklist

- [ ] Feature store in place; same logic train + serve
- [ ] Training pipeline as code, version controlled
- [ ] Model registry with version + metadata + artefacts
- [ ] Models versioned with semver-style tags
- [ ] CI pipeline runs on every PR
- [ ] Automated evaluation gates with tolerance bands
- [ ] Shadow + canary + full deploy stages
- [ ] Monitoring covers: data drift, prediction drift, performance, fairness, ops
- [ ] Rollback path tested in non-prod
- [ ] Retraining triggers documented + automated
- [ ] Cost per 1k predictions tracked + budgeted
- [ ] Inference latency p99 within SLO
- [ ] Feature freshness monitored
- [ ] Model cards published + maintained per `~/.claude/rules/common/task-intake-due-diligence.md` Q24
- [ ] Fairness audit on cadence; results reviewed by ethics committee
- [ ] A/B test design pre-registered (sample size, primary metric, stop rule)
- [ ] On-call runbook for ML incidents
- [ ] EU AI Act risk classification documented + appropriate controls in place

## Cross-References

- `~/.claude/skills/ml-model-selection/SKILL.md` — model choice upstream of deployment
- `~/.claude/skills/rag-design/SKILL.md` — RAG-specific deployment patterns
- `~/.claude/skills/fine-tuning-workflows/SKILL.md` — fine-tuning operational concerns
- `~/.claude/skills/observability-patterns/SKILL.md` — general observability that ML monitoring layers onto
- `~/.claude/skills/cost-aware-llm-pipeline/SKILL.md` — cost discipline for LLM workloads
- `~/.claude/skills/aws-serverless-patterns/SKILL.md` — Lambda deployment for low-cost inference
- `~/.claude/rules-library/common/runbook-template.md` — incident response
- `~/.claude/rules-library/common/deploy-failures-become-checks.md` — every ML deploy failure becomes a pre-deploy check

## Why This Skill Exists

The 2015 Google "Hidden Technical Debt in Machine Learning Systems" paper identified the core problem: in production ML, the model code is 5% of the system. The other 95% — feature stores, pipelines, monitoring, retraining, rollback — determines whether ML actually works at scale. Without MLOps discipline:

- Models silently degrade over months
- Training pipelines break and nobody notices for weeks
- Production accuracy diverges from offline metrics with no diagnosis
- Compliance audits fail (no lineage, no model cards, no fairness monitoring)
- Cost balloons (idle GPUs, redundant retraining, oversized inference fleets)
- Incidents have no rollback path

MLOps maturity is the difference between teams that ship 1 model and rebuild it constantly versus teams that ship 50 models and maintain them sustainably. The investment in platform infrastructure pays back across every subsequent model. The team that builds the platform first ships more, ships faster, and sleeps better.

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

- Training pipeline runs locally but not in CI (training-serving skew waiting to happen)
- Model artifact deployed without registry entry (lineage gap)
- Feature store absent — features re-engineered per model (DRY weakening + serving skew)
- Online + batch features computed differently (training-serving skew)
- Drift monitoring absent on deployed model (silent quality decay)
- Rollback to previous model version untested (rollback drill gap)
- A/B experiment running without guardrail metrics (latency / cost / fairness)
- Model card / datasheet absent on shipped model
- GPU fleet idle but reserved capacity not adjusted (FinOps waste)
- Retraining triggers not defined (no calendar, no drift threshold)

**Refinement candidates**:

- New deployment-pattern row when a new serving infra ships (e.g., vLLM, Triton)
- New cross-reference when a sister skill (ml-model-selection, rag-design, observability-patterns) adds a MLOps gate
- New rollback template per model class (online inference, batch scoring, recommendation)
- Tightening of the drift-monitoring policy when silent-decay incident recurs
