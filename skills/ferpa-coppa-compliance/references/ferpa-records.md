# ferpa-coppa-compliance: Ferpa records

> FERPA scope and the record classes it governs, plus PPRA survey consent. Pointed at by the
> SKILL.md rows "Pattern 1", "Pattern 6" and "Pattern 9".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 1: FERPA scope — who is the regulated entity?

FERPA applies to EDUCATIONAL AGENCIES + INSTITUTIONS that receive federal funding from the US
Department of Education. Almost every public K-12 school, public university, and most private
non-profit colleges fall under FERPA. Private K-12 schools that don't receive federal funding are
typically OUTSIDE FERPA but may be subject to state-law equivalents.

The engineering question: are YOU a covered entity, or are you a SERVICE PROVIDER to a covered
entity?

| Role | Compliance posture |
| --- | --- |
| **Covered entity** (school, university) | Direct FERPA obligations; must comply with all rules; designate a FERPA Officer |
| **School Official** (vendor with legitimate educational interest) | Operates under the school's FERPA shield via a contract; school remains accountable; vendor functions as the school's outsourced operator |
| **Studies Exception** vendor (research) | Limited disclosure permitted under §99.31(a)(6) for educational studies; tight controls |
| **Audit/Evaluation** vendor (§99.35) | Federal/state auditors; specific exception |
| **Generic SaaS** | NOT FERPA-protected; school cannot share educational records with you without parent/eligible-student consent |

For an edtech vendor, the canonical path is to become a "School Official" via a Data Privacy
Agreement (DPA). Without that contract, the school cannot legally share student PII with you.

## Pattern 6: Educational record vs directory information

FERPA defines two record classes:

**Educational records** (FERPA-protected, requires consent):

- Grades, transcripts, GPA, class rank
- Disciplinary records
- Attendance records
- Special-education / IDEA records (also IDEA-protected)
- Counseling notes (if kept and shared)
- Test scores (state assessment, AP, SAT — exception: ETS as test publisher has own status)

**Directory information** (FERPA-permitted disclosure WITHOUT consent if the institution has
properly designated + notified):

- Name, address, telephone, email
- Date + place of birth
- Major field of study
- Dates of attendance
- Degrees + awards received
- Most recent previous school attended
- Photographs
- Participation in officially recognized activities + sports
- Weight + height of athletes

**Critical**: a school's directory-information designation must be PUBLISHED ANNUALLY to parents +
eligible students, who must have the opportunity to OPT OUT. After opt-out, treat as full
educational record.

NEVER assume an LEA's directory definition matches yours. Code defensive: store directory-info flag
per student; respect opt-out.

## Pattern 9: PPRA — surveys + physical exams

PPRA (20 USC §1232h) requires parental consent BEFORE students participate in surveys / analyses /
evaluations funded by ED that reveal information about:

1. Political affiliations + beliefs
2. Mental or psychological problems
3. Sex behavior or attitudes
4. Illegal, anti-social, self-incriminating, or demeaning behavior
5. Critical appraisals of family
6. Privileged relationships (lawyer, doctor, minister)
7. Religious practices + beliefs
8. Income (other than required for program eligibility)

Engineering: if your platform conducts surveys / SEL (social-emotional learning) assessments /
mental-health screeners in schools, build the PPRA workflow: parent notice → opt-out OR opt-in
(depending on funding source) → audit log of consent state per student per survey instance.
