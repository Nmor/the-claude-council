# communication-patterns: Structure and audience

> Answer-first structure and who you are writing for: Pyramid Principle, SCQA, audience analysis,
> curse of knowledge. Pointed at by the SKILL.md rows "Pattern 1" through "Pattern 4".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 1: The Pyramid Principle — Answer First

Minto's framework, used universally at top consulting firms +
increasingly across tech. The structure:

```text
        Governing thought (the answer)
       /              |              \
   Argument 1     Argument 2     Argument 3
   (MECE)         (MECE)         (MECE)
   /    \         /    \         /    \
 sub-1  sub-2   sub-1  sub-2   sub-1  sub-2
```

Rules:

1. **Lead with the answer.** The reader / listener should know
   your conclusion within the first sentence (writing) or 30
   seconds (speaking).
2. **Supporting arguments are MECE** — Mutually Exclusive,
   Collectively Exhaustive. No overlap, no gaps.
3. **Each level summarises the level below.** The governing
   thought = summary of the three arguments. Each argument =
   summary of its sub-points.
4. **Three or so per level.** Five is the absolute max for
   working memory.

The opposite — burying the lede, building up to the answer with
context first — is universal in scientific writing and academic
prose. It's the wrong structure for decision-makers, who want the
answer + the option to drill down.

For senior audiences, lead-with-answer is non-negotiable. They
will skim past your buildup and either miss your point or
penalise you for wasting their time.

## Pattern 2: SCQA — Situation, Complication, Question, Answer

Minto's storytelling opener for any document or presentation:

- **Situation**: a stable state the audience already accepts.
  "Our SaaS has grown 40% YoY for three years."
- **Complication**: something that disrupts the stable state.
  "Q3 growth slowed to 12% and churn ticked up 200bps."
- **Question**: what the audience now needs to know. "Is this a
  blip or a structural slowdown?"
- **Answer**: your governing thought. "The slowdown is
  structural — driven by enterprise saturation in segment A —
  and we recommend pivoting Q4 GTM to mid-market segment B."

SCQA earns the right to your governing thought by establishing
the question the audience cares about. Without it, "lead with the
answer" can feel like an out-of-nowhere assertion.

## Pattern 3: Audience Analysis Discipline

Before drafting, answer:

1. **Who is the audience?** Name them. Role. Seniority. Domain
   expertise. Prior context with the topic.
2. **What do they already know?** Don't repeat what they have.
3. **What do they need to do?** Decision? Approval? Action?
   Just stay informed?
4. **What do they care about?** Time, revenue, risk, status,
   their team's wellbeing — different audiences weight
   differently.
5. **What's their attention budget?** A board member: 8 minutes.
   A peer engineer: 30 minutes. A new hire reading onboarding
   docs: as long as it takes.
6. **What's their emotional state?** Anxious about a missed
   target? Excited about a launch? Hostile to a change?

The output of this analysis determines structure, length, depth,
tone, vocabulary, channel, and timing. Every choice traces back
to who's receiving the message.

## Pattern 4: The Curse of Knowledge

Steven Pinker's central style insight (also Heath + Heath): once
you know something, you struggle to remember what it was like to
not know it. You forget what jargon you've absorbed, what
context you've accumulated, what assumptions are non-obvious.
The result is writing that's incomprehensible to anyone who
hasn't been in the same conversation you've been in for the past
three months.

The cure is **iterative readability testing**. Hand the draft to
someone who's NOT in your daily orbit. Watch where they get
confused. Rewrite from there. The first reader is a gift; treat
their confusion as signal about your draft, not their
competence.
