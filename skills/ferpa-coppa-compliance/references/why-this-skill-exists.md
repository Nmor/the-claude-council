# ferpa-coppa-compliance: Why This Skill Exists

> The enforcement record and the cost of retrofitting student-privacy controls. Pointed at by the
> SKILL.md row "Why This Skill Exists".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Why This Skill Exists

Edtech is now a $300B+ global industry with deep penetration into US K-12 + higher-ed. Every
classroom is a multi-tenant environment where students under 13 (COPPA), students 13-17 (CT / NY /
SOPIPA), and adult students (FERPA) coexist. Get the regulatory shape wrong and the consequences run
from federal investigation (ED OPP) + FTC consent decree + state attorney-general enforcement to
district contract termination + reputational collapse + class-action lawsuit. Recent enforcement
examples:

- **2023**: Edmodo $6M FTC settlement for COPPA violations + behavioural ads to children
- **2024**: Bark Technologies FTC settlement (parental monitoring app + COPPA)
- **2024**: NY OAG action against edtech vendor for §2-d Parent Bill of Rights non-distribution
- **2024**: Texas AG investigation into AI-tutoring vendor for student-work training without DPA
  amendment
- **2025**: COPPA Final Rule signals FTC's elevated scrutiny — biometric + AI + ads

Engineering's job: encode the regulatory shape in the data model + access controls + workflows so
the platform CANNOT accidentally violate. The cost of doing this from day one is one-quarter of an
engineer; the cost of retrofitting after a state-AG inquiry is
product-development-paused-for-six-months + outside counsel.
