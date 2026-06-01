---
name: network-patterns
description: Principal-level networking patterns — OSI / TCP-IP layering, IP addressing + CIDR design, routing, DNS, TLS, load balancing, CDN, service mesh, network security (firewalls / WAF / DDoS / segmentation), zero-trust networking, and the operational discipline that keeps packets flowing reliably + securely across single-region, multi-region, and hybrid topologies.
auto_activate: true
---

# Network Patterns

## Purpose

Design and operate networks — whether VPCs in the cloud, hybrid
links between cloud and on-prem, service-to-service traffic inside
a Kubernetes cluster, edge / CDN architectures, or branch /
campus / data centre LANs — with the layered discipline that
distinguishes "the network works" from "the network has a
documented contract, observable behaviour, defined failure
modes, and explicit security boundaries".

Networking failures are insidious: latency tails that show up
under load, intermittent DNS resolution, asymmetric routing,
MTU black holes, certificate expiry at 02:00, accidental
exposure of a database behind a misconfigured security group,
NAT exhaustion under burst traffic, ARP storms during failover.
A principal-level approach turns the network from "mysterious"
into "instrumented, modelled, and defended".

The skill activates on network design (greenfield VPC,
multi-region peering, hybrid connectivity), network changes
(routing table modification, security group / NSG change, DNS
zone updates), incidents involving network behaviour, TLS
certificate / PKI work, load-balancer / proxy configuration,
service mesh introduction, zero-trust architecture rollouts,
network security review, BGP / Anycast / GeoDNS design, and CDN
strategy debates.

## Standards Cited

- **RFC 791 (IPv4) + RFC 8200 (IPv6)** — the foundational IP
  protocols
- **RFC 1918** — private IPv4 address spaces (10/8, 172.16/12,
  192.168/16)
- **RFC 4632** — Classless Inter-Domain Routing (CIDR)
- **RFC 9293 (TCP, 2022 update)** — Transmission Control Protocol
- **RFC 9000 (QUIC) + RFC 9114 (HTTP/3)** — modern transport +
  HTTP
- **RFC 1034 / 1035 (DNS) + RFC 8499 (DNS terminology, 2019)** —
  DNS protocol
- **RFC 8446 (TLS 1.3)** — current TLS
- **RFC 6749 / 6750 (OAuth 2.0)** — token-based authorisation
  semantics relevant to network identity boundaries
- **RFC 7519 (JWT)** — JSON Web Tokens
- **NIST SP 800-207 (Zero Trust Architecture, 2020)** — the
  canonical zero-trust reference
- **NIST SP 800-53 Rev 5 + CSF 2.0 (2024)** — control catalogue +
  cybersecurity framework
- **CIS Controls v8.1** — operational security controls including
  network-layer guidance
- **PCI-DSS v4.0 Requirement 1** — network segmentation for
  cardholder data environment
- **ISO/IEC 27033** — network security guidance (5-part series)
- **BCP 38 (RFC 2827)** — ingress filtering for source-address
  spoofing prevention
- **BCP 84 (RFC 8704)** — extension of BCP 38 for multihomed
  networks
- **The Bird Book — "TCP/IP Illustrated" (Stevens / Fall, multiple
  volumes)** — foundational reference
- **"Computer Networking: A Top-Down Approach" (Kurose + Ross,
  8th ed)** — academic + practitioner reference
- **"Site Reliability Engineering" (Beyer et al)** — SLO framework
  applied to network reliability

## When to Fire

Auto-engage on these signals:

- Greenfield VPC / VNet design — CIDR allocation, subnet tiering,
  routing
- Multi-region peering / hub-and-spoke design (Transit Gateway,
  Shared VPC, vWAN)
- Hybrid cloud / on-prem connectivity (Direct Connect, Cloud
  Interconnect, ExpressRoute, VPN, SD-WAN)
- Internet ingress strategy (ALB / NLB / GLB; Cloud Load Balancer;
  Front Door; CloudFront; Cloudflare; Fastly; Akamai)
- Service mesh introduction (Istio, Linkerd, Consul, AWS App Mesh,
  Cilium)
- DNS architecture (Route 53, Cloud DNS, Azure DNS; private DNS
  zones; split-horizon)
- TLS / certificate management (ACM, Let's Encrypt, Cloudflare,
  cert-manager)
- Network security review (firewall rules, security groups, NSGs,
  WAF, DDoS posture)
- Zero-trust rollout (BeyondCorp / NIST SP 800-207; Cloudflare
  Access; Tailscale; Twingate)
- BGP / Anycast / GeoDNS / latency-based routing
- Incident involving DNS, TLS, routing, MTU, ARP, NAT
- PCI-DSS scope reduction via segmentation
- HIPAA network isolation
- Performance tuning (TCP window, keepalives, HTTP/2 vs HTTP/3,
  connection pooling)
- Mobile / IoT connectivity patterns (cellular, LoRaWAN, NB-IoT)
- IPv6 enablement / dual-stack

## Core Patterns

### The Layered Model (OSI + TCP/IP)

Network design + debugging proceeds layer-by-layer. The OSI 7-
layer model is the teaching aid; TCP/IP 4-layer is the operational
reality.

| OSI | TCP/IP | Examples | Common failures |
| --- | --- | --- | --- |
| 7 Application | Application | HTTP, gRPC, SSH, SMTP, DNS | Application bugs, protocol mismatches |
| 6 Presentation | Application | TLS, encoding | Cert expiry, cipher mismatch |
| 5 Session | Application | RPC, NetBIOS | Session affinity / sticky-session issues |
| 4 Transport | Transport | TCP, UDP, QUIC | RST storms, port exhaustion, NAT timeouts |
| 3 Network | Internet | IP, ICMP, BGP | Routing loops, asymmetric routing, MTU |
| 2 Data Link | Link | Ethernet, ARP, VLAN | ARP storms, VLAN misconfigs, flapping |
| 1 Physical | Link | Cables, radio, optics | Cable cuts, optic failures, bit errors |

When a network problem surfaces, march down the layers: is the
cable up? ARP resolving? Routes correct? TCP handshake completing?
TLS negotiating? HTTP returning the expected status? The same
discipline applies whether you're in a VPC console or a wiring
closet.

### CIDR Planning

A new VPC's CIDR allocation is one of those decisions that's
trivial in the moment and painful for years if wrong. Rules:

- **Never overlap** with any other VPC / VNet you might ever peer
  with (including future M&A targets)
- **Reserve generously** — /16 per region per environment is the
  comfortable baseline (65,536 addresses); /20 if you're space-
  constrained (4,096)
- **Plan subnet tiers** before allocating:
  - Public (load balancers, NAT, bastions) — small, /24 per AZ
  - Private (compute) — medium, /22 per AZ
  - Data (databases) — small, /24 per AZ
  - Reserved (future growth, observability, EKS pods, etc.)
- **Avoid RFC 1918 collisions** with on-prem (most orgs already
  use 10.0.0.0/16 somewhere; reach into 10.x.x.x/16 with offset
  in the second octet to a deliberately chosen range)
- **IPv6** — dual-stack is the modern direction; allocate /56 or
  /48 per VPC; future-proofs against IPv4 exhaustion + most
  modern cloud services support IPv6

### Routing

Cloud and on-prem routing patterns:
- **Default route** (0.0.0.0/0) for internet egress — through NAT
  Gateway, internet gateway, or proxy
- **Specific routes** for peered networks
- **Black hole** routes intentionally to drop forbidden traffic
- **Transit Gateway / Shared VPC / vWAN** for hub-and-spoke
  multi-account / multi-region routing
- **BGP** for hybrid (Direct Connect, ExpressRoute, Cloud
  Interconnect) — communities to control preference + propagation

Common failures:
- **Asymmetric routing** — traffic goes out via one path, returns
  via another, stateful firewalls drop it
- **Black hole MTU** — large packet sent, ICMP-unreachable
  filtered, no fragmentation, connection hangs
- **Route table missing** — added a subnet, forgot to associate
  with a route table, no internet
- **Routing loops** — count-to-infinity, requires careful BGP /
  OSPF metric design

### DNS

DNS is everywhere on the failure path. A few non-negotiable
patterns:

- **Authoritative + recursive separation** — for serious DNS,
  authoritative servers (your zone owner) and recursive resolvers
  (for clients) are separate
- **Private DNS zones** for internal service discovery — Route 53
  Private Hosted Zones, Cloud DNS Private Zones, Azure Private
  DNS Zones; do NOT leak internal names publicly
- **Split-horizon DNS** — same name resolves to different IPs
  depending on requester (internal vs external)
- **TTL discipline** — short TTL for things you might want to fail
  over (60s for failover-eligible records, longer for stable
  records); too-short TTLs hurt cache hit rate and resolver load
- **CNAME chains** — keep them shallow; each hop is latency
- **DNSSEC** — for high-stakes zones; protects against cache
  poisoning + on-path attacks; comes with operational complexity
- **CAA records** — restrict which CAs can issue certs for your
  domain; cheap insurance against misissuance
- **Health-checked DNS** (Route 53 / Cloud DNS HCS / Traffic
  Manager) — failover routing based on health checks

Common DNS failures:
- TTL too long — failover takes 30 min instead of 30 sec
- Forgotten CNAME pointing at a now-deleted resource — domain
  hijacking via subdomain takeover
- Cert mis-issuance because CAA was missing
- Recursion loops between split-horizon zones

### TLS + PKI

- **TLS 1.3 minimum** for new deployments (RFC 8446); deprecate
  1.2 over time; never 1.0/1.1
- **Automated cert renewal** — ACM, Let's Encrypt, cert-manager;
  no manual renewals ever (humans miss them)
- **Cert chain validation** — every chain validated, intermediates
  bundled correctly; missing intermediate is a common silent
  failure that breaks some clients
- **OCSP stapling** for revocation
- **mTLS** between services in zero-trust architectures
- **HSTS** for all HTTPS sites (`Strict-Transport-Security`)
- **Cipher suites** — modern set only; disable RSA key exchange,
  CBC modes, anything pre-AEAD
- **Cert transparency monitoring** — Censys, crt.sh; alert on
  rogue cert issuance for your domains

### Load Balancing

| Type | When |
| --- | --- |
| **L4 (TCP / UDP)** — NLB, GLB, Cloud LB TCP | High throughput; TLS pass-through; non-HTTP protocols |
| **L7 (HTTP) ALB, Application LB, Front Door** | HTTP routing, host / path-based, header inspection |
| **Edge / CDN** — CloudFront + ALB origin, Cloud CDN + LB origin, Cloudflare | Global, edge-cached, DDoS-protected ingress |
| **Internal LB** — service-to-service within VPC | Microservice load balancing inside VPC |
| **Service mesh sidecar** — Istio, Linkerd, Consul, Cilium | L7 routing + mTLS + observability within K8s |
| **Anycast** | Global load distribution via BGP advertisement |

Health checks at every layer, with thresholds matched to the
workload. Premature health-check failures cause flapping; lax
checks let bad instances serve traffic.

### CDN + Edge

- **Static asset caching** — long TTLs (e.g., 1 year) with
  content-hash versioning in URLs (`/static/app.abc123.js`)
- **HTML / API caching** — short TTLs or none; consider stale-
  while-revalidate
- **Compression** — Brotli + gzip; offload from origin
- **HTTP/2 + HTTP/3** at the edge
- **Image transformation at edge** — responsive sizes, WebP /
  AVIF
- **Edge compute** — Lambda@Edge, CloudFront Functions, Cloud
  Workers, Cloudflare Workers; for personalisation, A/B routing,
  auth checks
- **Origin shield / regional cache layer** — reduces origin load
  for cache misses

### Network Security

| Layer | Control |
| --- | --- |
| **L3/4 firewall** | Security Group (AWS), NSG (Azure), VPC Firewall (GCP) — stateful, instance/subnet-attached |
| **L3/4 ACL** | Network ACL (subnet-level, stateless) |
| **L7 WAF** | AWS WAF, Cloud Armor, Azure WAF, Cloudflare WAF — OWASP Core Rule Set + custom rules |
| **DDoS** | Shield Standard (free) + Shield Advanced; Cloud Armor; Front Door |
| **IDS/IPS** | GuardDuty, Cloud IDS, Defender, Snort/Suricata for self-hosted |
| **Secrets / certs in transit** | mTLS everywhere; HTTPS everywhere; no plaintext on the wire |
| **Segmentation** | Per-tier subnets, per-service security groups; PCI / HIPAA scope-reduction patterns |

### Zero-Trust Networking (NIST SP 800-207)

The premise: network location ≠ trust. Every request authenticated
+ authorised; encrypted transport; least-privilege access; logged
+ monitored. Implementations:

- **BeyondCorp** model (Google) — context-aware access decisions
  at proxy
- **Identity-aware proxies** — Cloudflare Access, Tailscale,
  Twingate, AWS Verified Access, Cloud IAP, Azure App Proxy
- **mTLS service mesh** — Istio, Linkerd, Cilium, App Mesh; every
  service identity verified
- **Microsegmentation** — per-workload network policy (Calico,
  Cilium NetworkPolicy)

### Service Mesh — When + When Not

A service mesh adds L7 routing, mTLS, observability, traffic
shaping, circuit breaking, retry/timeout policy at the platform
layer rather than application layer.

| When to adopt | When NOT to |
| --- | --- |
| > 10 microservices | Monolith or few services |
| Polyglot stack (no shared library) | All-Java or all-Go with shared client libs |
| Strict zero-trust mTLS requirement | Cleartext within VPC is acceptable |
| Need fine-grained L7 routing / canary | Layer-7 routing already at LB |
| Compliance demand for verifiable identity | No such demand |

Cost: operational complexity, sidecar resource overhead (~10-20%
CPU/mem per pod), debugging complexity. Pay it when the benefit
materialises, not because mesh is trendy.

### Performance

| Lever | Effect |
| --- | --- |
| **HTTP/2 / HTTP/3** | Multiplexing, header compression, faster handshakes |
| **TCP BBR / CUBIC tuning** | Higher throughput on long-fat networks |
| **Keep-alive + connection pooling** | Eliminates handshake overhead |
| **Brotli / gzip compression** | Smaller payloads |
| **CDN edge caching** | Reduce origin trips, lower latency |
| **Connection coalescing** | Fewer connections per origin |
| **TCP window tuning** | Throughput on high-BDP paths |
| **MTU optimisation** | Avoid fragmentation; jumbo frames where supported |
| **Anycast** | Lowest-latency replica per client |

### Operational Patterns

- **Observability** — flow logs (VPC Flow Logs, NSG flow logs,
  Cloud VPC Flow Logs) + L7 access logs + traces; per
  `observability.md`
- **Network ACLs as audit** — explicit denies + logging for
  suspicious traffic
- **Drift detection** — IaC (Terraform plan + automation) + cloud
  config drift detection (AWS Config, GCP Asset Inventory)
- **Change windows + canaries** — network changes have big blast
  radius; test in staging, deploy with canary, have rollback
  ready
- **Documentation** — network topology diagrams kept current
  (Lucidchart, draw.io, AWS Solutions Diagrams, Hava); ARP/MAC/
  IP tables for on-prem

## Anti-Patterns

- **Default VPC for production.** AWS / GCP / Azure default VPCs
  have permissive settings. Always custom-build.
- **0.0.0.0/0 inbound on a database security group.** Self-
  evident, still happens.
- **Wildcard inbound 0.0.0.0/0 on SSH/RDP.** Bastion behind
  identity-aware proxy or VPN; never direct SSH from internet.
- **DNS records pointing at deleted resources.** Subdomain
  takeover vulnerability.
- **Long TTL on records you might fail over.** Pre-set TTL to
  60s before any planned failover; restore long TTL after.
- **Cert pinning without an update path.** Cert rotation breaks
  every client.
- **Mixed-mode HTTP/HTTPS.** Content security errors + mixed-
  content blocks.
- **No rate limit at edge.** Application gets DDoS'd; expensive
  recovery.
- **NAT Gateway as the only egress.** Egress traffic charged at
  $0.045/GB; use VPC Endpoints / Private Link for cloud-internal
  destinations.
- **Single AZ NAT Gateway with cross-AZ workloads.** Cross-AZ
  data charges + single-point-of-failure.
- **Untagged / undocumented routes.** Forensics nightmare.
- **MTU 9001 jumbo frames without end-to-end support.** Black-
  hole MTU; some hops drop, ICMP gets filtered, mysterious
  hangs.
- **No flow logs.** Forensic investigation becomes impossible.
- **Trust the perimeter.** "We're behind the firewall" — until
  one compromised instance walks laterally through every other.
- **Manual cert renewals.** Predictable expiry incident.
- **One huge VPC.** Blast radius + CIDR exhaustion; multi-account
  with peering / Transit Gateway is the modern default.
- **Skipping IPv6.** Increasingly customer-required; cellular
  networks are IPv6-only; AWS / GCP / Azure all charge for IPv4.

## Verification Checklist

- [ ] CIDR allocations documented, non-overlapping with all
      peerable networks
- [ ] Subnet tiers: public / private / data separated per AZ
- [ ] Multi-AZ NAT or VPC Endpoints used to avoid cross-AZ NAT
      cost
- [ ] No database / data-tier instance has public-IP or
      0.0.0.0/0 ingress
- [ ] Bastion / SSH access via identity-aware proxy or VPN, not
      direct internet
- [ ] WAF + DDoS protection in front of customer-facing ingress
- [ ] DNS TTLs sized for failover requirements
- [ ] DNSSEC + CAA configured for production domains
- [ ] TLS 1.3 minimum; cert auto-renewal via ACM / Let's Encrypt
      / cert-manager
- [ ] mTLS or equivalent for service-to-service inside the
      perimeter where compliance requires
- [ ] Flow logs + WAF logs + L7 access logs centralised
- [ ] IaC for all network config; drift detection enabled
- [ ] Route tables documented; no orphan routes
- [ ] Health checks on every load balancer tuned for the workload
- [ ] CDN in front of customer-facing assets; cache-control
      strategy documented
- [ ] Zero-trust architecture roadmap documented for tier-1
      assets
- [ ] Network topology diagrams kept current
- [ ] Failover / DR network tested annually

## Cross-References

- `cloud-architecture` — VPC topology fits inside the cloud
  architecture skill's framework
- `datacenter-ops` — on-prem networking + colocation
- `security.md` + `iso27001-controls` + `owasp-asvs` —
  network-layer controls
- `gdpr-ccpa-compliance` — cross-border transfer mechanisms
- `pci-dss-patterns` — segmentation for cardholder data
- `observability-patterns` — flow log + L7 log pipelines
- `runbook-template.md` — network incident response
- `rate-limiting.md` — application-layer companion to edge rate
  limiting
- `circuit-breaker.md`, `graceful-degradation.md` — resilience
  in the presence of network failures
- `secrets-management.md` — vault-based cert + key management

## Why This Skill Exists

Without principal-level network discipline, organisations:

- Hit subtle production failures whose root cause takes days to
  find (asymmetric routing, MTU black holes, intermittent DNS)
- Pay surprise egress bills from chatty cross-AZ microservices
- Get breached via misconfigured security groups, exposed
  databases, or lateral movement from a single compromised
  workload
- Fail compliance audits on segmentation, encryption-in-transit,
  or network-control evidence
- Discover at incident time that DNS TTLs were 24h and failover
  is a day-long event
- Wake up to cert-expiry outages at 02:00 because nobody
  renewed manually
- Spend a fortune on bandwidth that a CDN would have eliminated
- Suffer reputation hits from preventable DDoS impact

With principal-grade networking:
- The network is designed once with documented CIDR, routing,
  DNS, TLS strategy and re-validated on changes
- Failure modes are anticipated, instrumented, and handled
- Compliance evidence (flow logs, segmentation, encryption,
  WAF) is by-product, not a scramble
- Costs are predictable and optimised at the topology level
- New services slot into a known pattern, not into chaos

The cost of doing networks well is upfront design, IaC,
documentation, and operational rigor. The cost of doing
networks poorly is intermittent failures whose post-mortem says
"this should never have been deployed this way" and a slow
erosion of confidence in the platform.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Security group with `0.0.0.0/0` ingress on a non-public-facing service (least-privilege weakening)
- CIDR overlap between two VPCs / accounts (peering / Transit Gateway routing breakage waiting to happen)
- DNS TTL > 5 min on a service expected to fail over (RPO/RTO weakening)
- TLS termination at the wrong boundary (e.g., terminated at ALB but backend speaks HTTP across VPC peer)
- New service deployed without flow logs enabled (compliance + forensic gap)
- Load balancer health check checking only `/` (200 = healthy) without dependency check (false-positive healthy)
- Service mesh sidecar added without circuit breaker / timeout / retry config (per `~/.claude/rules/common/circuit-breaker.md`)
- CDN cache key collision causing cross-tenant content leak
- WAF rule disabled "temporarily" without expiry date (per `~/.claude/rules/common/feature-flags.md` lifecycle)
- Cross-region traffic without explicit cost forecast (data-transfer cost amplification)
- Zero-trust posture relaxed for "internal" service (lateral movement risk)

**Refinement candidates**:
- New topology pattern row when a new connectivity shape emerges (e.g., Cloud WAN, AWS VPC Lattice)
- New WAF / NACL template when a new attack class is observed in traffic
- New cross-reference when a sister skill (cloud-architecture, security-review, observability-patterns) adds a network gate
- Tightening of the TLS / cipher allowlist when a new vulnerability deprecates a previously-acceptable suite
