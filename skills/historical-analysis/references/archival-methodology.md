# historical-analysis: Archival methodology

> Core Pattern 3: respect des fonds, the ISAD(G) multi-level description hierarchy, finding aids,
> and the engineering equivalents. Pointed at by the "Archival methodology" row of the SKILL.md
> routing table.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## 3. Archival methodology + ISAD(G)

Archives are not libraries. They are organised by provenance (the *fonds* — the records of one
creating entity, kept together to preserve their organic relationships), not by subject. The
principle is **respect des fonds** (Natalis de Wailly, 1841): keep records of one creator together;
do not interfile by topic.

ISAD(G) 2nd edition defines the multi-level description hierarchy:

| Level | Example |
| --- | --- |
| **Fonds** | "Records of the Acme Corporation, 1923-1998" |
| **Sub-fonds** | "Acme Corporation, Engineering Division records, 1947-1998" |
| **Series** | "Engineering project files, 1947-1998" |
| **Sub-series** | "Engineering project files, mainframe era, 1947-1972" |
| **File** | "Project Falcon design files, 1968-1971" |
| **Item** | "Falcon system architecture diagram, 14 March 1969" |

Finding aids (now usually EAD3-encoded) describe at multiple levels. Researchers navigate top-down:
identify the fonds, narrow to series, request specific files. Skipping the hierarchy ("just give me
anything on X") misses the structural context that gives individual documents meaning.

Engineering equivalents: a service's `audits/` directory, a project's `docs/adr/` folder, a
repository's commit history are *fonds* — organised by creator, preserving organic relationships,
requiring multi-level navigation.
