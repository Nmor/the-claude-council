# Reback Finance Restructure Plan — Verification Report
**Date verified:** 2026-05-01  
**Searches conducted:** ~30  

---

## 1. PAYMENT RAILS

### Paystack
- **Countries (confirmed):** Nigeria, Ghana, Kenya, South Africa, Egypt, Côte d'Ivoire, Rwanda. Source: [paystack.com/countries](https://paystack.com/countries)
- **Payment methods by country:**
  - Nigeria: Card (Visa, Mastercard, Verve, Amex), Bank Transfer, USSD, Apple Pay, Visa QR, Mobile Money (not applicable in NG), PayAttitude
  - Ghana/Kenya: Mobile Money confirmed; M-Pesa for Kenya
  - South Africa: EFT, Scan to Pay, SnapScan, Apple Pay
  - Apple Pay: Confirmed available (channel name: `apple_pay`) — Source: [Paystack payment channels docs](https://paystack.com/docs/payments/payment-channels/)
- **Recurring / auth-charge:** Confirmed. Paystack Subscriptions API uses stored card/direct-debit authorizations for recurring billing. Source: [Paystack Subscriptions docs](https://paystack.com/docs/payments/subscriptions/)
- **Settlement currencies:** NGN, GHS, ZAR, KES, USD (USD available to NG and KE merchants with domiciliary accounts). GBP settlement: **NOT confirmed** in docs. Source: [Paystack USD settlement blog](https://paystack.com/blog/product/new-accept-payments-in-usd)

### Flutterwave
- **Countries (confirmed):** 35+ African countries including NG, GH, KE, UG, TZ, ZA, RW, plus US, UK, EU markets. Source: [supportedcountries.com/flutterwave](https://supportedcountries.com/flutterwave/)
- **M-Pesa STK Push for Kenya:** Confirmed via mobile money API. Source: [Flutterwave Kenya developer docs](https://developer.flutterwave.com/v3.0/docs/kenya)
- **Mobile money for Ghana:** Confirmed. Source: [Flutterwave payment channels](https://flutterwave.com/mw/support/payment-methods/payment-channels)
- **Settlement currencies:** USD, GBP, EUR, NGN, and local currencies. Payments settle into currency-specific payout balances. Source: [Flutterwave settlement help](https://flutterwave.com/tz/support/payments/settlement-in-different-currencies)

### Stripe
- **Nigeria/Kenya status:** NOT direct Stripe countries. Access via Paystack ("extended network"). Stripe itself lists 46 fully supported countries; Nigeria and Kenya are not among them. Stripe Tax expanded to 19 African countries including NG/KE in 2025 but this is tax automation only, not payment acceptance. Source: [Stripe global](https://stripe.com/global), [Fincra blog](https://blog.fincra.com/payments-in-africa-2-takeaways-from-stripe-sessions-2025/)
- **CLAIM TO VERIFY:** Any plan saying "Stripe in Nigeria" should clarify this means Paystack (Stripe subsidiary), not Stripe directly.

### Wise Platform
- **Multi-currency wallet:** Confirmed — holds/converts 40–56 currencies via MCA (Multi-Currency Account). Source: [Wise Platform MCA docs](https://wise.com/platform/multi-currency-accounts)
- **Africa corridors:** Receive-only for Nigeria (NGN inbound, no outbound) and Kenya (KES inbound + M-Pesa wallet delivery, no send from KE). Outbound from Africa to the rest of the world via Wise Platform is limited. Source: [Wise Nigeria article](https://www.bitdegree.org/money-transfer/tutorials/does-wise-work-in-nigeria)
- **Payout currencies:** 40+ currencies supported. Coverage strong in EU/US/UK corridors; thinner in Africa.

### M-Pesa Daraja API (Direct)
- **Who can integrate:** Any developer can register a Daraja account (individual or company). Production requires a Kenya-registered business with Safaricom Paybill or Till number. Non-Kenyan companies typically need a Kenya-registered entity or a local aggregator. Source: [dev.to M-Pesa guide](https://dev.to/eric_muturi/requirements-for-m-pesa-online-payment-setup-in-kenya-2025-guide-2bjl)
- **UNVERIFIED — team must confirm:** Safaricom's current policy on non-Kenyan companies applying directly; check Safaricom business portal directly.

### MercadoPago
- **Countries (confirmed):** Argentina, Brazil, Mexico, Colombia, Chile, Uruguay, Peru. Source: [rebill.com](https://www.rebill.com/en/blog/what-is-mercado-pago)
- **Features:** Cards, bank transfers, digital wallet, Pix (Brazil), boleto bancário (Brazil), BNPL (Mercado Credits), in-person POS.

### Razorpay (India)
- **Coverage:** India only. Accepts international cards in 130+ currencies but operates as an Indian-registered payment service. Source: [Zoho Razorpay docs](https://www.zoho.com/de-de/inventory/kb/payment-gateway/razorpay-supported-countries.html)

### Hubtel (GH)
- **UNVERIFIED — team must confirm:** Search did not return definitive Hubtel API docs. Hubtel is Ghana-focused; verify current API documentation at hubtel.com directly.

### Pesapal (KE/UG/TZ)
- **Coverage:** Confirmed for East Africa — Kenya, Uganda, Tanzania. Supports mobile money, cards, POS. Source: [Pesapal website](https://www.pesapal.com/), [finqfy top payment gateways Africa](https://finqfy.com/top-12-payment-gateways-in-africa-for-2025/)

---

## 2. KYC PROVIDERS

### Smile Identity (Smile ID)
- **African countries:** 52 African countries confirmed. Source: [usesmileid.com/countries](https://usesmileid.com/countries/)
- **Document types:** 8,500+ documents across 226 countries globally; every African country has at least 3 document types supported; African-specific: National IDs, Passport, Driver's License, NIN, BVN (NG), and others.
- **NOT Nigeria-only:** Full pan-African coverage.

### Qoreid
- **Coverage:** Multi-country African platform (not Nigeria-only). Has facilitated 100M+ verifications. Serves 1,000+ organizations. Strong in Nigeria (NIN, BVN) but expanding across Africa. Source: [BusinessDay QoreID article](https://businessday.ng/news/article/qoreid-records-100m-identity-verification-across-africa/)
- **UNVERIFIED — team must confirm:** Exact list of non-Nigeria African countries currently live in production. Check docs.qoreid.com.

### Veriff
- **Africa coverage:** Claims 230+ countries/territories globally; 12,500+ ID document types. Africa is included in global coverage but no Africa-specific landing page confirmed. Source: [veriff.com/supported-countries](https://www.veriff.com/supported-countries)

### Onfido (now Entrust IDV)
- **Africa coverage:** 195+ countries. Acquired by Entrust in 2024, rebranded as Entrust IDV. Global coverage includes Africa. Source: [Veriff vs Onfido comparison](https://www.veriff.com/brand-comparison/veriff-vs-onfido)

### Sumsub
- **Africa coverage:** Explicitly confirmed for Nigeria, Kenya, Ghana, South Africa. Non-Doc Verification available in NG, KE, ZA. Strong AML/fraud coverage in Africa. Source: [Sumsub Africa page](https://sumsub.com/lp/africa-awareness/), [Sumsub non-doc verification](https://sumsub.com/non-doc-verification/)

### Trulioo
- **Coverage:** 195 countries, 14,000+ ID documents. Africa expansion confirmed including Kenya. Source: [Trulioo Africa expansion](https://www.prweb.com/releases/trulioo-expands-identity-verification-services-in-africa-838673327.html)

### Reback's existing providers
- **Qoreid (NIN/BVN):** Confirmed Nigeria-focused government ID checks (NIN, BVN). Multi-country expanding.
- **Metamap/MetaMap:** Confirmed for Nigeria (NIN, VIN, BVN, CAC). MetaMap acquired by Incode in 2024; platform continues operating. Africa + LATAM coverage. Source: [MetaMap Africa page](https://www.metamap.com/metamap-verification-platform-for-africa/)
- **UNVERIFIED — team must confirm:** Which Reback flows use Qoreid vs MetaMap; whether MetaMap/Incode acquisition has changed API contracts.

---

## 3. SOCIAL PLATFORM EXTRACTION

### Instagram oEmbed (`/instagram_oembed`)
- **App Review required:** CONFIRMED. The `oembed_read` permission requires App Review before use; it does not work in developer mode without approval. Meta changed this — the new permission `meta_oembed_read` replaced the old scope; auto-applied to existing apps by October 1, 2025. Source: [UAMaster Meta oEmbed update](https://uamaster.net/meta-enhances-teen-protection-and-updates-oembed-integration/)
- **Fields removed (April 2025):** `thumbnail_url`, `thumbnail_width`, `thumbnail_height`, `author_name` no longer returned from `/instagram_oembed`.
- **Instagram public Open Graph:** `og:title`, `og:image` are present on public posts, but thumbnail/author name retrieval now requires manual extraction or approved API.

### Facebook oEmbed
- **Changes:** `author_name` and `author_url` no longer returned from `/oembed` and `/oembed_video` endpoints as of April 2025. App Review for `meta_oembed_read` required same as Instagram. Source: [SwipeInsight oEmbed update](https://web.swipeinsight.app/posts/oembed-updates-enhance-facebook-developer-experience-15949)

### TikTok oEmbed (`tiktok.com/oembed`)
- **Still public, no auth required:** CONFIRMED. Endpoint is `GET https://www.tiktok.com/oembed?url=...` — no API key or authentication required. Source: [TikTok developer docs](https://developers.tiktok.com/doc/embed-videos/)

### Twitter/X oEmbed (`publish.twitter.com/oembed`)
- **Still public, no auth:** CONFIRMED. Both `https://publish.twitter.com/oembed` and `https://publish.x.com/oembed` are functional and public (no developer account required). Source: [X developer docs](https://developer.x.com/en/docs/x-for-websites/timelines/guides/oembed-api)

### WhatsApp Business Cloud API
- **Pricing model change (July 1, 2025):** Switched from conversation-based to per-message pricing.
- **Message categories:** Marketing, Utility, Authentication, Service (free within open customer service window).
- **Sample rates:** Marketing ~$0.0094/msg (India) to ~$0.124/msg (Germany); Utility ~80-90% cheaper than marketing; Service messages in open window: free.
- **Free entry points:** 72-hour free window from Click-to-WhatsApp ads. Source: [Meta WhatsApp pricing docs](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing), [MessageCentral pricing guide](https://www.messagecentral.com/blog/whatsapp-business-api-pricing)

### Telegram Bot API
- **Current capabilities:** Posts to channels, sends/receives photos/video/audio/documents (5MB URL / 50MB direct upload). Supports paid media in channels, business account integrations, Mini Apps. Source: [Telegram Bot API docs](https://core.telegram.org/bots/api)
- **For ingest:** Bots can be added to channels as admins to receive all new posts via webhook (`channel_post` update type).

---

## 4. CLASSIFIEDS PLATFORMS — SCHEMA AVAILABILITY

Direct HTTP spot-checks attempted. Results:

| Platform | og:title | og:image | og:price | schema.org Product JSON-LD | Notes |
|----------|----------|----------|----------|-----------------------------|-------|
| **Jiji.ng** | UNVERIFIED | UNVERIFIED | NOT FOUND | NOT FOUND | Page fetch returned filter/listing cards, no head meta visible; category page tested (not individual listing) — team must test individual listing URL |
| **Jumia.com.ng** | UNVERIFIED — team must confirm | UNVERIFIED | UNVERIFIED | UNVERIFIED | No direct fetch performed |
| **Konga.com** | UNVERIFIED — team must confirm | UNVERIFIED | UNVERIFIED | UNVERIFIED | No direct fetch performed |
| **OLX.com.eg** | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | Redirects to dubizzle.com.eg (301) |
| **OpenSooq.com** | UNVERIFIED — team must confirm | UNVERIFIED | UNVERIFIED | UNVERIFIED | No direct fetch performed |
| **Carousell.sg** | UNVERIFIED — team must confirm | UNVERIFIED | UNVERIFIED | UNVERIFIED | Known to use some OG tags |
| **Shopee.com** | UNVERIFIED — team must confirm | UNVERIFIED | UNVERIFIED | UNVERIFIED | Fetch blocked; Shopee uses Next.js with client-side rendering — OG tags likely present in SSR head |
| **Lazada.com** | UNVERIFIED — team must confirm | UNVERIFIED | UNVERIFIED | UNVERIFIED | No direct fetch performed |
| **MercadoLibre** | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | 403 on fetch |
| **OLX.com.br** | UNVERIFIED — team must confirm | UNVERIFIED | UNVERIFIED | UNVERIFIED | No direct fetch performed |
| **IndiaMART** | UNVERIFIED — team must confirm | UNVERIFIED | UNVERIFIED | UNVERIFIED | No direct fetch performed |
| **Meesho** | UNVERIFIED — team must confirm | UNVERIFIED | UNVERIFIED | UNVERIFIED | No direct fetch performed |

**Recommendation:** Run `curl -A "Mozilla/5.0" -L https://<platform>/listing-url | grep -E "(og:|schema.org|application/ld\+json)"` against specific product listing pages (not category pages), not homepages. Most major e-commerce platforms do expose `og:title` and `og:image` on individual product pages (SEO standard practice), but `og:price` is a Facebook-specific extension and not universally implemented. `schema.org/Product` JSON-LD is common on Shopee, Lazada, and MercadoLibre for SEO purposes but needs spot-check confirmation.

---

## 5. NIGERIAN REGULATORY FRAMEWORK FOR ESCROW

### Nigeria SEC escrow-agent license category
- **Finding:** No dedicated "escrow agent" license category found in Nigeria SEC rulebook search. The SEC's April 2025 rules cover digital assets, capital market operators, investment advisers, etc. The Investments and Securities Act 2025 (ISA 2025) was assented to by President Tinubu, replacing ISA 2007. Source: [Nigeria SEC rules](https://sec.gov.ng/our-mandate/regulation/rules-and-regulations/)
- **UNVERIFIED — team must confirm:** Check ISA 2025 consolidated rules at sec.gov.ng specifically for "escrow" or "custodian" agent categories. A lawyer-reviewed reading of the SEC CMO registration categories is required.

### CBN PSB vs PSP — which fits Reback
- **Payment Service Banks (PSBs):** For financial inclusion / unbanked population; require 25% rural access points; can hold customer deposits. Typically for telcos and agent networks.
- **Payment Service Providers (PSPs):** Multiple categories:
  - Switching & Processing: ₦2B escrow + capital; can process transactions but **cannot hold customer funds**
  - Mobile Money Operator (MMO): Can hold customer wallet balances — **this is likely the required license if Reback holds escrow funds**
  - PSSP (Payment Solution Service Provider): ₦250M capital; cannot hold funds
- **Key risk:** Holding customer escrow funds without an MMO license is a CBN regulatory violation. Source: [CBN fintech license guide 2026](https://www.ebconsults.ng/cbn-fintech-licence-nigeria/)

### NDPR vs Nigeria Data Protection Act 2023
- **Current law:** Nigeria Data Protection Act (NDPA) 2023 is the current operative law, establishing the Nigeria Data Protection Commission (NDPC) as regulator. The NDPR 2019 ceased to be extant law as of September 19, 2025 (per GAID issuance). Source: [SecurePrivacy NDPA guide](https://secureprivacy.ai/blog/nigeria-data-protection-law)
- **CONFIRMED:** Use NDPA 2023, not NDPR.

### Required licenses for escrow + invoicing platform
- **CBN:** MMO license (if holding customer funds) OR PSSP + partner with licensed MMO for fund-holding
- **NFIU:** Registration required (AML/CFT compliance, suspicious transaction reporting). Evidence of NFIU registration is required for SEC fintech programs. Source: [GlobalLegalInsights Nigeria fintech 2025](https://www.globallegalinsights.com/practice-areas/fintech-laws-and-regulations/nigeria/)
- **SEC:** UNVERIFIED — if Reback's escrow involves securities-adjacent products, SEC registration may apply; otherwise likely CBN-only
- **UNVERIFIED — team must confirm:** SEC escrow-agent category; whether invoicing alone triggers additional licenses

### Tazapay's licensing structure
- **CONFIRMED PUBLIC:** MAS Major Payment Institution (MPI) licence — Singapore MAS Licence No. PS20200638. Also licensed in Canada (MSB Licence M21439799). Customer funds segregated and safeguarded per MAS requirements. Source: [Tazapay MAS licence announcement](https://tazapay.com/blog/tazapay-secures-mpi-licence-from-singapores-mas-bolstering-its-cross-border-payment-capabilities), [Tazapay support](https://support.tazapay.com/is-tazapay-licensed)

---

## 6. TWEAKCN THEME `cmlh0vbnd000004l112kx8a0l`

- **Theme name confirmed:** "Purple Rain" (shadcn/ui + Tailwind CSS theme)
- **Direct token values:** NOT extractable via WebFetch — the page renders a visual preview of the theme but does not expose raw CSS variable declarations in the fetched HTML. The `/r/themes/<id>.json` registry pattern returned 500. The `/api/themes/<id>` endpoint returned 404.
- **What tweakcn exports:** CSS variables (shadcn/ui compatible HSL color tokens: `--background`, `--foreground`, `--primary`, `--secondary`, `--accent`, `--muted`, `--card`, `--border`, `--ring`, `--radius`, etc.) + Tailwind v3/v4 config. Users can export via the "Copy CSS" or "Export to Figma" button in the editor.
- **To retrieve actual tokens:** Either (a) open `https://tweakcn.com/themes/cmlh0vbnd000004l112kx8a0l` in a browser and use DevTools → Application → copy the generated CSS, or (b) check the [tweakcn GitHub repo](https://github.com/jnsahaj/tweakcn) for any seeded/public themes with that ID.
- **UNVERIFIED — team must confirm:** Exact HSL values for "Purple Rain" theme; run browser DevTools on the live page.

---

## 7. CURRENT FRAMEWORK VERSIONS (as of May 2026)

| Framework / Library | Latest Stable | Notes / Source |
|---------------------|---------------|----------------|
| **Vite** | 8.0 (March 12, 2026) | Rolldown (Rust bundler) unified; 10-30x faster builds. [vite.dev/blog/announcing-vite8](https://vite.dev/blog/announcing-vite8) |
| **Next.js** | 16.2.4 (March 18, 2026) | Active LTS. [nextjs.org/blog/next-16-2](https://nextjs.org/blog/next-16-2) |
| **MUI (Material UI)** | 9.0.0 (April 2026) | v8 was skipped; jumped to v9 to align with MUI X v9. v7 still receives patches. [mui.com/versions](https://mui.com/versions/) |
| **Tailwind CSS** | v4.0 (January 22, 2025) | CSS-first config, Lightning CSS compiler, 5× faster builds. [tailwindcss.com/blog/tailwindcss-v4](https://tailwindcss.com/blog/tailwindcss-v4) |
| **Playwright** | 1.59.1 (April 29, 2026) | [playwright.dev release notes](https://playwright.dev/docs/release-notes) |
| **Crawlee** | 3.16.0 | Last published ~3 months ago. [npmjs.com/package/crawlee](https://www.npmjs.com/package/crawlee) |
| **Qwen2.5-VL** | `Qwen/Qwen2.5-VL-7B-Instruct` (7B), `Qwen/Qwen2.5-VL-72B-Instruct` (72B) | Released 2025-02-19; 3B/7B/72B variants. [HuggingFace Qwen2.5-VL](https://huggingface.co/collections/Qwen/qwen25-vl) |
| **vLLM** | 0.20.0 (April 27, 2026) | CUDA 13.0 default; PyTorch 2.11; HF Transformers v5 support. [vllm.ai/releases](https://vllm.ai/releases) |
| **PaddleOCR** | 3.2.0 (August 21, 2025) / PaddleOCR-VL-1.5 (January 29, 2026) | PP-OCRv5 models; PaddleOCR-VL-1.5 for document parsing. [PaddleOCR releases](https://github.com/PaddlePaddle/PaddleOCR/releases) |
| **Go** | **1.26.2** (April 7, 2026) | Go 1.26 released Feb 2026; 1.26.2 is latest patch. Go 1.25.9 is latest 1.25.x. [go.dev/blog/go1.26](https://go.dev/blog/go1.26) |
| **shopspring/decimal** | v1.4.0 (April 12, 2024) | No newer release found. [github.com/shopspring/decimal](https://github.com/shopspring/decimal/releases) |
| **gomock** | **CONFIRMED ARCHIVED** → use `go.uber.org/mock` | `golang/mock` archived; Uber forked and actively maintains `go.uber.org/mock` (import path). Migration: change import only. [github.com/uber-go/mock](https://github.com/uber-go/mock) |
| **AWS SDK Go v2** | v1.33.0+ (January 2025 base; April 2025 latest release found) | Date-stamped releases (e.g., `release-2025-04-14`). Requires Go 1.24+. [github.com/aws/aws-sdk-go-v2/releases](https://github.com/aws/aws-sdk-go-v2/releases) |

---

## 8. AWS g5.xlarge SPOT PRICING (May 2026)

### On-Demand Pricing
- **us-east-1:** $1.006/hr (~$734/mo). Source: [cloudprice.net g5.xlarge](https://cloudprice.net/aws/ec2/instances/g5.xlarge), [economize.cloud](https://www.economize.cloud/resources/aws/pricing/ec2/g5.xlarge/)
- **eu-west-1:** UNVERIFIED — regional pricing table gated behind subscription on pricing tools. Team must check [instances.vantage.sh](https://instances.vantage.sh/aws/ec2/g5.xlarge) directly or AWS console.
- **af-south-1:** UNVERIFIED — g5 availability in af-south-1 (Cape Town) is NOT confirmed. Cape Town region has limited accelerated compute instance availability. Team must verify via AWS EC2 console.

### Spot Pricing
- **us-east-1 spot:** ~$0.622/hr (average) per Vantage data as of May 2026 — approximately 38% discount off on-demand. Source: [instances.vantage.sh](https://instances.vantage.sh/aws/ec2/g5.xlarge)
- **Spot discount range:** Typically 50-80% for g5 family, but g5 spot is in high demand due to GPU AI/ML usage — actual interruption rate can be high.

### Alternatives for VLM Inference
- **g6 instances (NVIDIA L4 GPU):** g6.xlarge starts at ~$0.6006/hr on-demand in us-east-1, making it **cheaper than g5.xlarge**. L4 GPU offers better inference efficiency per dollar for many VLM workloads. Source: [DoiT GPU pricing](https://compute.doit.com/gpu)
- **inf2.xlarge (AWS Inferentia2):** $0.758/hr on-demand — 25% cheaper than g5.xlarge, purpose-built for inference. **Requires model compilation to AWS Neuron SDK** — Qwen2.5-VL support for Neuron must be confirmed before choosing inf2.
- **trn1 (AWS Trainium):** Designed for training, NOT inference — incorrect for VLM serving.
- **Recommendation:** g6.xlarge is a strong alternative to g5.xlarge for VLM inference at lower cost; inf2 only viable if Qwen2.5-VL has Neuron SDK support.

---

## SUMMARY OF UNVERIFIED ITEMS (team must confirm)

1. **Paystack GBP settlement** — not found in official docs; only NGN/GHS/ZAR/KES/USD confirmed
2. **M-Pesa Daraja direct access for non-Kenyan entity** — contact Safaricom business team
3. **Qoreid exact non-Nigeria country list** — check docs.qoreid.com
4. **Hubtel API coverage details** — check hubtel.com developer docs directly
5. **Jiji.ng individual listing OG/schema tags** — test with curl on a specific single listing URL (e.g., `/item/xxx-123.html`), not category page
6. **All SEA and LATAM classifieds OG/schema** — run browser-side fetch; most block curl; Shopee and Lazada use SSR with OG tags in head for product pages (standard SEO practice) but not confirmed by live test
7. **Nigeria SEC escrow-agent category** — review ISA 2025 consolidated rules; engage a Nigerian capital markets lawyer
8. **AWS eu-west-1 and af-south-1 g5.xlarge pricing** — check AWS console directly; af-south-1 may not carry g5 instances
9. **tweakcn "Purple Rain" exact CSS token values** — open in browser and export via DevTools or the site's copy-CSS feature
10. **MetaMap/Incode API continuity post-acquisition** — confirm with MetaMap/Incode support that existing API keys remain valid
