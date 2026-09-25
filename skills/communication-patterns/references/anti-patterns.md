# communication-patterns: Anti-Patterns

> The fifteen communication anti-patterns and the named correction for each. Pointed at by the
> SKILL.md row "Anti-Patterns".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Anti-Patterns

### Anti-Pattern 1: Burying the Lede

Building up to the answer through paragraphs of context. The
senior reader skims, gives up, and either acts wrongly or
delegates the read to someone else. Your insight is lost.

**Correction**: lead with answer. Move context to where it's
needed.

### Anti-Pattern 2: Walls of Text

Long paragraphs with no headings, no white space, no visual
hierarchy. Reading effort = quitting probability.

**Correction**: scannable structure. Headings every 200-400
words. Short paragraphs. Bulleted lists when structure helps
(but not when narrative would).

### Anti-Pattern 3: Jargon Without Translation

Acronyms and technical terms without definition. Signals
in-group membership; excludes anyone newer.

**Correction**: define acronyms on first use. Plain-language
alternative when possible. Glossary if needed.

### Anti-Pattern 4: PowerPoint as Document

Slide deck shipped as a "document" — bullet points, text-heavy
slides, no narrative spine. Half the slides have a single bullet
point; half have ten. Nobody knows what's important.

**Correction**: if the artefact is read async, write a memo.
Slides are for live presentation only.

### Anti-Pattern 5: Email Threading Hell

15-message thread with quoted-quoted-quoted content, no
summary, no clear ask. Late-joiners can't follow; eventual
decision is buried.

**Correction**: TL;DR at the top. Move long discussions to a
doc. Summarise + reset every 5 messages. Name the decision
needed.

### Anti-Pattern 6: Sandwich Feedback (Misused)

"You're great → here's a major problem → you're great" delivered
in a way that signals the criticism is not serious + the praise
is hollow.

**Correction**: separate the praise + critique conversations.
Or deliver the critique directly + skip the bread. People can
tell when bread is performative.

### Anti-Pattern 7: Manipulation Disguised as Communication

Using rhetorical techniques (anchoring, reciprocity, scarcity)
to push people to decisions they wouldn't otherwise make. Short-
term wins, long-term trust loss when noticed.

**Correction**: use rhetoric to help good ideas land, never to
make bad ideas seem good. Test: would you be comfortable if the
recipient saw your private notes about how you framed this?

### Anti-Pattern 8: Slide Vomit

Slides packed with every detail because "we should put X in
case someone asks." Result: cognitive overload, no key message,
audience disengages.

**Correction**: one idea per slide. Backup slides for FAQ. Lean
on the appendix.

### Anti-Pattern 9: Ignoring Channel + Time

DM-ing your CTO at 9 PM about a non-urgent matter. Slack-DM-ing
sensitive personnel news. Bringing up restructuring on a board
meeting agenda without pre-wire.

**Correction**: match medium + time to content sensitivity +
recipient's context.

### Anti-Pattern 10: Performative Listening

Maintaining eye contact, nodding, mm-hmming — while actually
preparing your response. Recipients usually notice.

**Correction**: genuine listening. Stop thinking. Process what
they're saying. Take a beat before responding.

### Anti-Pattern 11: Tone Mismatch

Casual jokes in a crisis update; formal corporate-speak in a
team retro; hyped marketing tone in a postmortem. The mismatch
is jarring + erodes trust.

**Correction**: explicit tone choice up front. Match audience +
content + moment.

### Anti-Pattern 12: Apology Theatre

"I'm sorry IF anyone was offended" / "I'm sorry that the data
was lost — these things happen" — apologies that don't
acknowledge the harm or the responsibility. Worse than no
apology.

**Correction**: specific, owning the impact, no "if", no
"but". "We lost X. That was our failure. Here's how we're
fixing it + preventing recurrence."

### Anti-Pattern 13: Defensive Posture

Treating questions as attacks; pre-empting criticism with
defensive framing. Signals you're not confident in the content

- invites more aggressive questioning.

**Correction**: receive questions as gifts. "Great question.
Let me think." Or "I don't know — let me find out + come back."

### Anti-Pattern 14: Curse of Knowledge

Writing for yourself + your daily collaborators. Missing the
fact that the audience doesn't share your context.

**Correction**: iterative readability testing. Hand to someone
outside your bubble. Listen to where they stumble.

### Anti-Pattern 15: Telling People What to Think Instead of

Helping Them See

Skipping the SCQA setup that lets the audience reach your
conclusion alongside you. Asserting + insisting; pushing.

**Correction**: lead them to the conclusion. Show the evidence.
Let them assemble it. They'll own it harder if they reach it
with you.
