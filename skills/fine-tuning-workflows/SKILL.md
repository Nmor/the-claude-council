---
name: fine-tuning-workflows
description: Principal-level fine-tuning lifecycle — when fine-tuning beats prompting + RAG, dataset curation, instruction tuning vs preference optimisation (SFT / DPO / RLHF), parameter-efficient methods (LoRA / QLoRA / adapters), evaluation, safety re-tuning, deployment, monitoring, and the cost / benefit framework for choosing between fine-tuning, RAG, and base-model usage.
---

# Fine-Tuning Workflows

> Fine-tuning is the heaviest tool in the LLM toolbox — costly to
> do, costlier to maintain, and irreversible in the sense that the
> base model evolves under you. Use it when prompting + RAG have
> demonstrably plateaued, not before. Then do it properly.

## Purpose

Fine-tuning adjusts a model's weights on a curated dataset to make
it better at a specific behaviour: a domain vocabulary, an output
schema, a writing style, a structured reasoning pattern, a
classification task at lower cost than a frontier model. Done
well, a fine-tuned smaller model can match or beat a much larger
prompted model on the target task at a fraction of the inference
cost. Done poorly — sloppy data, wrong objective, no eval — it
produces a model that LOOKS better on the training distribution
and fails silently on real traffic.

This skill names the decision framework, the dataset discipline,
the training-time choices, the evaluation gates, the safety
re-tuning steps, the deployment pattern, and the maintenance
overhead that every fine-tuning project incurs.

NOT in scope: pretraining new foundation models from scratch
(rare; specialised teams only); zero-shot prompt engineering (see
`prompt-engineering`); retrieval-augmentation (see `rag-design`);
classical ML model training (see `ml-model-selection`).

## Standards Cited

- **Ouyang L., et al. (2022)** — "Training language models to
  follow instructions with human feedback" (InstructGPT — the SFT
  + RM + PPO recipe), NeurIPS
- **Rafailov R., et al. (2023)** — "Direct Preference Optimization:
  Your Language Model is Secretly a Reward Model" (DPO), NeurIPS
- **Hu E., et al. (2021)** — "LoRA: Low-Rank Adaptation of Large
  Language Models", ICLR 2022
- **Dettmers T., et al. (2023)** — "QLoRA: Efficient Finetuning of
  Quantized LLMs", NeurIPS
- **Houlsby N., et al. (2019)** — "Parameter-Efficient Transfer
  Learning for NLP" (Adapters), ICML
- **Wei J., et al. (2022)** — "Finetuned Language Models are
  Zero-Shot Learners" (FLAN — instruction tuning at scale), ICLR
- **OpenAI Fine-Tuning Guide** — supervised fine-tuning + DPO API,
  best practices on dataset size, evaluation, JSON schema
- **Anthropic Fine-Tuning (Claude Haiku on Bedrock)** — supported
  surfaces, eval expectations, safety re-tuning guidance
- **Hugging Face TRL + PEFT documentation** — open-source SFT /
  DPO / LoRA implementations
- **NIST AI RMF 1.0 (2023)** + **NIST GAI Profile (2024)** —
  measurement of generative AI risk
- **EU AI Act (Reg 2024/1689) Articles 51-55** — general-purpose AI
  model obligations; fine-tuners inherit obligations when
  modifications are substantial
- **ISO/IEC 42001:2023** — AI management system requirements
- **MLflow / W&B / Neptune** — experiment tracking
- **Anthropic Responsible Scaling Policy + OpenAI Preparedness
  Framework** — model safety eval expectations

## When to Fire

- Prompting + RAG + careful model selection has hit a quality
  ceiling on a measurable target metric
- Inference cost / latency is the bottleneck and a smaller
  fine-tuned model can plausibly close the gap
- A persistent style / format / tone requirement that no prompt
  reliably enforces
- A domain vocabulary the base model lacks (specialised legal,
  medical, scientific, internal product taxonomy)
- A regulated output schema that requires structural certainty
  beyond what JSON-mode + validation alone deliver
- A model migration where a fine-tuned model needs to be ported
  to a new base
- Post-incident: a safety failure that wasn't caught by prompt
  guardrails and needs targeted re-tuning

Pairs with `prompt-engineering` (the baseline to beat),
`rag-design` (the alternative to fine-tuning for fact-grounding),
`ml-model-selection` (base model choice + sizing),
`mlops-patterns` (training pipeline, model registry, deployment,
monitoring), `audit-logging.md` (training-data provenance),
`gdpr-ccpa.md` (lawful basis + minimisation of training PII),
`data-retention.md` (training corpus lifecycle),
`task-intake-due-diligence.md` Q24 (AI ethics).

## Core Patterns

### Pattern 1: The decision framework — try cheaper tools first

```
┌──────────────────────────────────────────────────────────────────┐
│ Question                          Action                          │
├──────────────────────────────────────────────────────────────────┤
│ Can prompt engineering            → Improve the prompt (try this │
│ + few-shot solve it?                first; cheapest)             │
├──────────────────────────────────────────────────────────────────┤
│ Is the gap factual / grounding?   → RAG, not fine-tuning         │
├──────────────────────────────────────────────────────────────────┤
│ Is it style / format / behaviour  → Few-shot + structured        │
│ but only sometimes?                 output before fine-tuning    │
├──────────────────────────────────────────────────────────────────┤
│ Is it style / format / behaviour  → Fine-tune (likely SFT)       │
│ consistently across high volume?                                  │
├──────────────────────────────────────────────────────────────────┤
│ Is cost the only driver and        → Distil into a smaller model  │
│ quality matches a smaller model?                                  │
├──────────────────────────────────────────────────────────────────┤
│ Do humans prefer one style over    → Preference optimisation     │
│ another, but no exact target?        (DPO / KTO / RLHF)          │
└──────────────────────────────────────────────────────────────────┘
```

Default presumption: don't fine-tune. The cost is real (compute,
dataset curation, eval harness, ongoing monitoring, base-model
migration when the vendor deprecates). Earn the right to
fine-tune by demonstrating prompt + RAG have plateaued.

### Pattern 2: Three training objectives — pick the right one

| Objective | Use when | Data shape |
| --- | --- | --- |
| **SFT** (Supervised Fine-Tuning) | You have known-good (input, output) pairs | `{messages: [{role, content}, ...]}` JSONL |
| **DPO** (Direct Preference Optimization) | You have (input, chosen, rejected) triplets | `{prompt, chosen, rejected}` JSONL |
| **RLHF** (Reward Model + PPO) | DPO insufficient AND you can train a reward model on rich human feedback | Pairs + reward labels |
| **KTO** (Kahneman-Tversky Optimization) | Only binary (good/bad) labels per output, not pairs | `{prompt, completion, desirable: bool}` |
| **Continued pretraining** | Domain corpus shift (new vocabulary) | Raw text in target domain |

Most production fine-tunes are SFT. DPO is the next-most-common
when SFT models are competent but stylistically inconsistent.
RLHF is rarely the right choice outside foundation labs — the
operational complexity dwarfs the marginal quality gain over DPO.

### Pattern 3: Dataset curation — quality dominates quantity

Empirical lesson from FLAN, LIMA, Tülu, and every replication: a
small, clean, diverse dataset beats a large noisy one.

Targets:

- **Minimum useful SFT size**: 100-1000 high-quality examples for
  narrow tasks; 1000-10000 for general instruction tuning
- **DPO**: 500-5000 preference pairs
- **Coverage**: every important sub-task, every important style,
  every refusal case, every edge case
- **Diversity**: vary length, complexity, domain, phrasing
- **Cleanliness**: every example reviewed by a human; no scraped-
  -then-unfiltered data; no PII leakage
- **Provenance**: each example has a source, consent / license
  basis, and creation timestamp (per `audit-logging.md` +
  `gdpr-ccpa.md`)

Curation pipeline:

```python
@dataclass
class TrainingExample:
    id: str
    messages: list[dict]      # SFT
    chosen: str | None        # DPO
    rejected: str | None      # DPO
    source: str               # "expert-written", "human-corrected",
                              # "synthetic-curated", "user-feedback"
    license: str              # CC0, CC-BY, internal, etc.
    pii_redacted: bool
    reviewer_id: str
    review_date: datetime
    task_tags: list[str]      # ["refund-policy", "tone-formal", ...]


def filter_dataset(raw: list[TrainingExample]) -> list[TrainingExample]:
    return [
        ex for ex in raw
        if ex.pii_redacted
        and ex.reviewer_id is not None
        and ex.license in ALLOWED_LICENSES
        and not is_duplicate(ex, raw)
        and passes_quality_threshold(ex)
    ]
```

### Pattern 4: Eval set — separate from training, frozen, adversarial

Build the evaluation set FIRST, before the training set. Without
a frozen eval, "did fine-tuning help?" is unanswerable.

Three eval cuts:

1. **Held-out distribution** — same task as training, no overlap
   with training examples. Detects overfitting.
2. **Out-of-distribution** — adjacent tasks the model should still
   handle. Detects catastrophic forgetting (the model learned the
   target task but lost general capability).
3. **Adversarial / safety** — refusal triggers, prompt-injection,
   PII probes, harmful content requests. Detects safety
   regression.

Eval metrics:

- Exact-match / F1 for classification or structured-output tasks
- BLEU / ROUGE / BERTScore for free-form (with caveats; pair with
  human ratings)
- LLM-as-judge for subjective quality (use a stronger model;
  validate the judge with human spot-checks)
- Safety / harmfulness rates from a red-team probe set
- Calibration / refusal-correctness rates

### Pattern 5: Parameter-efficient fine-tuning (LoRA / QLoRA)

Full fine-tuning of a frontier model is unaffordable for most
teams. **LoRA** injects small low-rank matrices into attention
layers and trains only those — 1000x fewer trainable parameters,
near-identical quality on most tasks. **QLoRA** quantises the
base model to 4-bit while training LoRA adapters, fitting a 70B
model into a single 48GB GPU.

```python
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM

base = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.1-8B-Instruct",
    quantization_config=bnb_4bit_config,  # QLoRA
)

lora_config = LoraConfig(
    r=16,                          # rank
    lora_alpha=32,                 # scaling
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

model = get_peft_model(base, lora_config)
model.print_trainable_parameters()
# trainable params: 16,777,216 / total: 8,030,261,248 (0.21%)
```

Benefits beyond cost:

- **Adapter swapping**: store many task-specific LoRAs, each ~50MB,
  load per request
- **Composability**: stack LoRAs for multi-task models
- **Reversibility**: drop the adapter to recover base behaviour

### Pattern 6: Hyperparameter starting points

For SFT-LoRA on a 7-13B instruct base:

| Hyperparameter | Starting value | Notes |
| --- | --- | --- |
| Learning rate | 1e-4 to 2e-4 (LoRA) | 10x lower than full fine-tune |
| Batch size | 16-64 effective (with gradient accumulation) | Memory permitting |
| Epochs | 1-3 | Overfit risk rises sharply past 3 |
| LoRA rank `r` | 8-32 | Higher rank = more capacity, more compute |
| LoRA alpha | 2 × rank | Convention |
| LoRA dropout | 0.0 to 0.1 | Mild regularisation |
| Max seq len | 2048-8192 | Pad / truncate consistently |
| Warmup steps | 3-5% of total | Critical for stability |
| Scheduler | Cosine with warmup | Reliable default |
| Weight decay | 0.0 (LoRA) | Per QLoRA paper |

Run a small hyperparameter sweep on a fast subset before
committing to a full run. Log everything to MLflow / W&B.

### Pattern 7: Avoid catastrophic forgetting

Fine-tuning on a narrow task can damage the model's general
capability. Mitigations:

1. **Mix general data**: include 10-30% of general
   instruction-following data alongside the target-task data
2. **Low learning rate + few epochs**
3. **LoRA over full fine-tune** (the base weights are frozen)
4. **Eval on the out-of-distribution cut every N steps**
5. **Early stopping** when OOD eval starts dropping

### Pattern 8: Safety re-tuning

Fine-tuning can degrade safety classifiers, refusal behaviour,
and alignment in ways that aren't visible without targeted eval.
Steps:

- Include the foundation model vendor's safety eval set (when
  available) in the held-out cut
- Include explicit refusal examples in the SFT data, especially
  if your task is narrow (otherwise the model learns to comply
  with everything)
- Run a red-team probe set: prompt injections, jailbreak attempts,
  PII extraction, harmful content requests
- If the model degrades on safety, follow up with a DPO step
  using (safe, unsafe) preference pairs
- Document the safety eval results alongside the model in the
  registry (per `mlops-patterns`)

### Pattern 9: Versioning + registry + deployment

A fine-tuned model is a software artefact:

- **Versioning**: `{task}_{base_model}_{date}_{hash}` —
  deterministic IDs
- **Registry entry**: training dataset hash, hyperparameters,
  eval results, safety eval results, lineage to base model
  version, training compute used
- **Lineage**: when the base model is upgraded, the registry
  entry shows what's stale
- **Deployment**: shadow → canary → production per
  `mlops-patterns`
- **Rollback**: previous version stays warm for N days

### Pattern 10: Monitoring fine-tuned models

Production monitoring (per `mlops-patterns`):

- **Performance drift**: target-task metric vs baseline; trip
  on > X% degradation
- **Distribution drift**: input distribution shift indicates
  the world has moved (per `mlops-patterns` four-drifts)
- **Safety drift**: weekly red-team probe vs registry baseline
- **Cost / latency**: per-request economics
- **User feedback**: thumbs / explicit corrections funnel back
  into the next training round

### Pattern 11: Synthetic data — useful, dangerous

Generating training data from a stronger model (often called
distillation when paired with smaller-base SFT) is increasingly
common and increasingly fraught:

- **Quality**: the student inherits the teacher's mistakes and
  biases. Human review is non-negotiable.
- **License**: the teacher model's TOS may forbid training
  competitive models on its outputs — check carefully
- **Mode collapse**: synthetic data tends to be homogeneous;
  mix with human data
- **Detection**: vendors increasingly fingerprint outputs;
  unauthorised distillation can be tracked

When synthetic data is appropriate: prototyping, scarcity in
edge cases, augmentation alongside human data — always with
licence review and reviewer-in-the-loop.

### Pattern 12: When the base model is deprecated

Vendors deprecate base models on 12-24 month cycles. A
fine-tuned model is bound to its base. Plan:

- Track the vendor's deprecation calendar
- Keep the training pipeline + dataset reproducible — retraining
  on a new base must be a single-command operation
- Re-evaluate on the new base; the relative gap from fine-tuning
  may shrink if the new base is stronger
- Sometimes the answer is "the new base obsoletes the fine-tune;
  switch to prompting"

## Anti-Patterns

| Anti-pattern | Why bad | Fix |
| --- | --- | --- |
| "Let's just fine-tune it" without trying prompt + RAG | Massive cost for unmeasured gain | Quantitative baseline first |
| Train on user transcripts without PII review | Privacy violation, GDPR breach | Redact + reviewer-in-the-loop |
| Train + deploy with no eval set | Can't tell if fine-tune helped | Frozen eval set with adversarial cut |
| Full fine-tune on a frontier model | $$$, often beaten by LoRA + smaller base | LoRA / QLoRA with appropriate base |
| Single train run, no hyperparameter sweep | Random luck dominates | Small sweep on subset before full run |
| One epoch of overfit data, deployed | Catastrophic forgetting + overfit | Mix general data + early stopping |
| Skip safety eval | Targeted task succeeds, refusal regresses, user harm | Vendor + custom safety probes mandatory |
| Synthetic data, no human review | Inherits teacher's flaws, possible licence violation | Reviewer-in-the-loop + licence audit |
| No model registry / lineage | Can't reproduce, can't migrate to new base | MLflow / W&B with full lineage |
| Deploy without canary | Production regression on first request | Shadow → canary → full per mlops-patterns |
| Compare to base model on training distribution only | Fine-tune always wins on training data | Held-out + OOD + adversarial eval |
| Re-train on every feedback batch | Drift, instability, expensive | Scheduled retraining with triggers |
| Treat fine-tune as a one-time event | Base moves; world drifts; eval rots | Lifecycle with monitoring + retraining policy |

## Verification Checklist

- [ ] Baseline established: best prompt + RAG performance on
      target metric, documented
- [ ] Decision rationale recorded: WHY fine-tune over the
      alternatives, with numbers
- [ ] Dataset curated with per-example provenance, license, PII
      review, reviewer ID
- [ ] Eval set frozen BEFORE training; held-out + OOD +
      adversarial cuts present
- [ ] Hyperparameter sweep run on subset; selected config logged
- [ ] LoRA / QLoRA used unless full fine-tune is justified
- [ ] Training run logged to MLflow / W&B with dataset hash,
      hyperparameters, base model version, compute consumed
- [ ] Eval metrics computed on held-out, OOD, and safety cuts
- [ ] Safety eval shows no regression vs base; DPO follow-up if
      needed
- [ ] Catastrophic forgetting check passed on OOD cut
- [ ] Model registry entry created with lineage to base model
- [ ] Shadow + canary deployment plan executed per
      `mlops-patterns`
- [ ] Monitoring set up: performance drift, distribution drift,
      safety probes, cost + latency
- [ ] Retraining trigger criteria defined (drift > X, weekly
      schedule, user feedback volume)
- [ ] Base-model deprecation calendar tracked; retrain plan
      documented
- [ ] License + compliance reviewed for training data + synthetic
      data origins
- [ ] EU AI Act Article 51-55 obligations assessed when
      fine-tune is "substantial modification"

## Cross-References

- `prompt-engineering` — the baseline fine-tuning must beat
- `rag-design` — usually the right answer when "fine-tuning"
  is being considered for fact grounding
- `ml-model-selection` — base model choice; sizing the smaller
  model for cost-driven fine-tunes
- `mlops-patterns` — training pipelines, model registry,
  deployment, drift monitoring, rollback discipline
- `cost-aware-llm-pipeline` — comparing fine-tuned-smaller-model
  cost vs frontier-prompted cost
- `audit-logging.md` — training data provenance + consent
- `gdpr-ccpa.md` — lawful basis, PII minimisation in training
  corpora, right to be forgotten across model weights
- `data-retention.md` — training corpus retention policy
- `security.md` A03 — prompt injection persistence after
  fine-tuning
- `feature-flags.md` — gradual rollout of fine-tuned model
- `observability.md` — fine-tuned model production telemetry
- `task-intake-due-diligence.md` Q24 — AI ethics; Q11 — compliance;
  Q16 — cost forecasting

## Why This Skill Exists

Fine-tuning is the heaviest tool in the LLM toolbox. It's also
the one most often reached for when a lighter tool would do
better. Recurring failure pattern: team tries a quick prompt,
sees the gap, decides to fine-tune, spends three months on data
curation, ships a model that's slightly better on the training
distribution and worse on everything else, then maintains it for
two years because nobody wants to admit the project should have
been prompt engineering plus retrieval.

The discipline this skill describes — try cheaper tools first,
build the eval set before the training set, prefer LoRA over full
fine-tune, mix general data to fight forgetting, run safety
re-tuning, register the model with full lineage, deploy via
shadow + canary, monitor for drift, plan for base-model
deprecation — is the difference between a fine-tune that earns
its keep and a fine-tune that becomes technical debt. None of
the discipline is exotic; it's mlops applied to a slightly more
specialised artefact.

The cost: a real evaluation harness, dataset review, training
infrastructure, monitoring, and a retraining cadence. The benefit
when fine-tuning is actually the right call: a smaller, cheaper,
more reliable model that consistently produces the behaviour you
need without prompt acrobatics. The benefit when fine-tuning is
NOT the right call and this discipline catches that early: weeks
or months of avoided work, redirected to the lighter tool that
would have solved the problem.

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
- Fine-tuning chosen before prompt + RAG ceiling demonstrated (premature fine-tune)
- SFT / DPO / RLHF chosen without explicit data-quality investment (garbage-in-garbage-out)
- Training data not vetted for PII / copyright / license (per `~/.claude/rules-library/common/gdpr-ccpa.md`)
- LoRA / QLoRA adapter merged into base without ablation (regression risk)
- Eval suite identical to training data (test-set leakage)
- Safety re-tune skipped after capability fine-tune (jailbreak surface re-opened)
- Catastrophic forgetting unmonitored (base model capabilities lost)
- Inference-time serving infra not capacity-planned for the new model size
- Fine-tuned model deployed without rollback path
- Cost-of-ownership not compared to API-based equivalent (FinOps blind spot)

**Refinement candidates**:
- New decision-tree row when prompting / RAG / fine-tuning trade-off shifts (e.g., long-context models reduce fine-tune need)
- New cross-reference when a sister skill (prompt-engineering, rag-design, mlops-patterns, ml-model-selection) adds a fine-tune gate
- New safety-eval template when a new jailbreak class emerges
- Tightening of the data-quality bar when low-quality-corpus failure recurs
