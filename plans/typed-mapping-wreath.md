# VMS + Twilio Call Bot + Xcally Fix + Steward Campaigns — Full Implementation Plan

## Live Status Dashboard

> Last refreshed 2026-05-13. Each row is the smallest unit that can be
> marked "done" against the strict checklist in
> `~/.claude/rules/common/done-criteria.md`. Service-level items move to
> ✅ only when every checklist item passes (source audit, build, vet,
> staticcheck, golangci-lint, tests with -race, env stripped, docs
> updated). The same status is mirrored in the live TodoWrite list.

| ID | Item | Status | Last verified |
| -- | ---- | ------ | ------------- |
| EE0 | Canonical source enum (Part PP) | ⏳ pending | — |
| EE1 | Foundations (Q1 idempotency, Q2 audit, Q3 OTel, P errors, DSL G-01/02/03, SEG G-06/07/11) | ⏳ pending | — |
| EE2 | Template governance (Part I) | ⏳ pending | — |
| EE3 | Unified dispatch (G5 + G-24/27/30) | ⏳ pending | — |
| EE4 | Campaign EMAIL via message_campaign_service (F + H6) | ⏳ pending | — |
| EE5 | Per-service Kafka producers (X3a/X3c/X3f/X3g + auth X2) | ✅ complete | 2026-05-06 |
| EE6 | Auth + user-management SQS strip | ✅ complete | 2026-05-06 |
| EE7 | setting / subscription / message_campaign / partner / report-submission SQS strip | 🚧 in progress | 2026-05-13 |
| EE7.setting | setting-service SQS strip | ✅ complete | 2026-05-06 |
| EE7.subscription | subscription-service SQS strip | ✅ complete | 2026-05-06 |
| EE7.message_campaign | message_campaign_service SQS strip | ✅ complete | 2026-05-07 |
| EE7.partner | partner-service SQS strip | ✅ complete | 2026-05-13 |
| EE7.report_submission | report-submission-service SQS strip | 🚧 in progress | 2026-05-13 |
| EE7.workflow_engine | workflow-engine SQS dispatch removal | ✅ complete | 2026-05-02 |
| EE8 | Comm-service comms-dispatch-events Kafka consumer | ⏳ pending | — |
| EE8b | Template-engine processor Kafka migration | ⏳ pending | — |
| EE9 | SNS migration (Y2 — xCally + ETB bounce) | ⏳ pending | — |
| EE10 | Provider-webhook ingest → Kafka (Y0) | ⏳ pending | — |
| EE11 | Cross-org hardening (CC1/CC3/CC4/CC5/CC6/CC7) | ⏳ pending | — |
| EE12 | Cleanup of SQS/SNS leftovers (Y5) | 🚧 in progress | 2026-05-13 |
| EE13 | Frontend parity (Part II + F + K) | ⏳ pending | — |
| A | VMS provider fixes (A1–A4) | ⏳ pending | — |
| B | Xcally bug fixes (B1–B5) | ⏳ pending | — |
| C | Twilio Call Bot (C1–C7) | ⏳ pending | — |
| LL | Email provider full matrix | ⏳ pending | — |
| MM | VMS provider full matrix | ⏳ pending | — |
| NN | ETB Listmonk campaign feature parity | ⏳ pending | — |
| R | 35-gap punch-list residual items | ⏳ pending | — |
| S | Test coverage to ≥70% | ⏳ pending | — |
| AA | Infrastructure jobs (MSK topics, ACLs, dashboards) | ⏳ pending | — |
| FF | Seeders enrichment | ⏳ pending | — |
| QQ | Master OO1 / HH9 verification | ⏳ pending | — |
| Aux | SonarLint sweep on customer_ptp.go | 🚧 in progress | 2026-05-13 |

Legend: ✅ done (every done-criteria step passed) · 🚧 in progress
· ⏳ pending · ❌ failed (acknowledged + queued for re-run).

Drift between this table and `~/.claude/rules/common/done-criteria.md`
or the TodoWrite list is itself a bug to fix — the table here is the
human-readable mirror, the agent's TodoWrite list is the authoritative
state during a session, and the done-criteria file is the verification
contract.

## Context

Complete implementation of Voice services across the BFREE stack:

1. **VMS** — Fix all VMS providers (Infobip, Plivo, Vonage, Twilio) for end-to-end TTS delivery
2. **Xcally Bug Fix** — List creation failing; contacts created but not added to lists
3. **Twilio Call Bot** — Full CALL_BOT implementation using Twilio Programmable Voice with multi-turn TwiML flows
4. **Product Flows** — VMS and Call Bot dispatching via Campaigns and Workflows from both CRM-FE and Steward-FE
5. **Steward-FE** — Add Campaign and Workflow modules with segmentation (matching CRM functionality)

**Key Architecture**:

- VMS = `provider_type: "VMS"` — one-way TTS message delivery
- Call Center = `provider_type: "CALL_CENTER"` with sub-services:
  - `AGENT_QUEUE` — Xcally live agent routing (power dialing)
  - `IVR` — Xcally automated IVR campaigns
  - `CALL_BOT` — Twilio speech/DTMF automated calls

- Call Bot scripts stored as Content Templates with `comm_channel=CALL_BOT`

---

## Part A: VMS Fixes

### A1: Infobip VMS → `/tts/3/advanced` endpoint

**Problem**: Current `/tts/3/single` has NO `notifyUrl` — no webhook delivery reports with `org_id`.

**File**: `communication-service/internal/communication/vms/model.go`

- Add `InfobipAdvancedVoiceRequest` struct with fields: `messages []InfobipAdvancedMessage`
- `InfobipAdvancedMessage`: `from`, `destinations []InfobipDest`, `text`, `audioFileUrl`, `language`, `voice`, `notifyUrl`, `notifyContentType`, `callbackData`, `ringTimeout`, `speechRate`, `machineDetection`
- `InfobipDest`: `to string`

**File**: `communication-service/internal/communication/vms/infobip.go`

- Change endpoint from `/tts/3/single` to `/tts/3/advanced`
- Construct `notifyUrl`: `fmt.Sprintf("%s/v1/webhooks/infobip-vms?org_id=%s", cfg.AuthServiceURL, organizationID)`
- Set `callbackData` as JSON: `{"dispatch_id":"...","message_id":"..."}`
- Set `notifyContentType`: `"application/json"`

### A2: Remove dead `InfobipVmsWebhookURL`

**File**: `communication-service/internal/config/main.go`

- Remove `InfobipVmsWebhookURL` field and assignment (builds wrong path `/infobip/vms` vs route `/infobip-vms`)

### A3: Twilio Voice VMS — Support BOTH inline TwiML AND external URL

**File**: `communication-service/internal/communication/vms/twilio_voice.go`

Two modes:

1. **Inline TwiML** (when `data.Message` is non-empty): Template text plays as TTS

   ```go
   twiml := fmt.Sprintf(`<Response><Say voice="%s" language="%s">%s</Say></Response>`,
       xmlEscape(voiceName), xmlEscape(language), xmlEscape(data.Message))
   form.Set("Twiml", twiml)
   ```

2. **External URL** (when `data.Message` is empty and `twiml_url` is set): Twilio fetches TwiML from the URL

   ```go
   form.Set("Url", t.twimlURL)
   ```

- Add `xmlEscape(s string) string` helper for XML safety
- Make `twiml_url` optional (only required when no inline message)
- Keep `StatusCallback` with `org_id`, `dispatch_id`, `customer_id`, `message_id`

### A4: Frontend — Missing VMS credential fields

**CRM-FE** `src/utils/constants.ts`: Add `"webhook_secret"` to `infobip_vms` and `vonage_voice`
**CRM-FE** `src/components/admin/dialog/settings/CommunicationSettingsDialog.vue`: Add `test_voice_name` for VMS
**Steward-FE** `src/features/Settings/type/index.ts`: Add `"webhook_secret"` to `infobip_vms` and `vonage_voice`

---

## Part B: Xcally Bug Fixes

### Root Cause Analysis

The user reports that adding a phone number to be sent to a list **did not create the list on Xcally**. Research found 5 specific bugs:

### B1: Contact upload uses wrong endpoint (CRITICAL)

**File**: `communication-service/internal/communication/callcenter/xcally.go`

**Bug**: `processContactsInBatches` (line ~764) creates contacts via `POST /cm/contacts` with `"ListId"` embedded in the body. However, this relies on Xcally honoring `ListId` as a list-assignment field in the contact creation payload. The proper way to add contacts to a list is `POST /cm/lists/{listID}/contacts` — this endpoint exists in `xcally_contacts.go:66` (`addContactsToList`) but is **never called** from the `SendToXcally` flow.

**Fix**: After creating contacts, call `addContactsToList()` to explicitly assign them to the list:

```go
// In processContactsInBatches, after all contacts are created:
contactIDs := collectCreatedContactIDs(results)
if len(contactIDs) > 0 {
    err := x.addContactsToList(ctx, auth, listID, contactIDs)
    if err != nil {
        return response, fmt.Errorf("failed to add contacts to list: %w", err)
    }
}
```

### B2: Stale DynamoDB lock blocks all future list creation

**File**: `communication-service/internal/communication/callcenter/xcally.go`, lines ~601-616

**Bug**: If a previous run crashed after creating the lock but before updating `lock.ListID`, every future invocation finds the stale lock (`ListID == ""`), sleeps, retries 5 times, and fails with `"exceeded maximum retry attempts"`. The list is never created.

**Fix**: Add a TTL check on stale locks — if a lock with empty `ListID` is older than 5 minutes, delete it and retry:

```go
if lock.ListID == "" {
    lockAge := time.Since(lock.CreatedAt)
    if lockAge > 5*time.Minute {
        // Stale lock — delete and retry
        x.dynamoDB.Delete(ctx, XcallyListLockTableName, condition)
        return x.getOrCreateListWithLockRecursive(ctx, ..., retryCount+1)
    }
    // Recent lock — back off and wait
    time.Sleep(500 * time.Millisecond * time.Duration(retryCount+1))
    return x.getOrCreateListWithLockRecursive(ctx, ..., retryCount+1)
}
```

### B3: `performAssignment` silently does nothing without QueueID/CampaignID

**File**: `communication-service/internal/communication/callcenter/xcally.go`, lines ~935-943

**Bug**: If neither `QueueID` nor `CampaignID` is provided, the list is created but never assigned. No error, no log.

**Fix**: Log a warning and return an error:

```go
if !reqPayload.IsIVR && reqPayload.QueueID == "" && reqPayload.CampaignID == "" {
    logger.Error("No queue or campaign specified for list assignment",
        "orgID", reqPayload.OrganizationID, "listID", reqPayload.ListID)
    return fmt.Errorf("no queue_id or campaign_id provided for list assignment")
}
```

### B4: Lock update failure leaves stale lock

**File**: `communication-service/internal/communication/callcenter/xcally.go`

**Bug**: After `createList` succeeds, if the DynamoDB update to store the `ListID` in the lock fails, the lock remains with empty `ListID` — creating a permanent stale lock.

**Fix**: If lock update fails, delete the lock entirely so future requests can retry from scratch:

```go
if err := x.dynamoDB.Update(ctx, ..., listID); err != nil {
    logger.Error("Failed to update lock with list ID, deleting lock", "error", err)
    x.dynamoDB.Delete(ctx, XcallyListLockTableName, condition)
    // Still return the listID since the list was created successfully
    return listID, nil
}
```

### B5: Partial contact failure swallowed

**File**: `communication-service/internal/communication/callcenter/xcally.go`, lines ~320-324

**Bug**: When all contacts fail, the list still gets assigned. Errors downgraded to `Warn`.

**Fix**: If ALL contacts failed (zero successes), return an error instead of continuing:

```go
if response.TotalProcessed > 0 && response.Successful == 0 {
    return response, fmt.Errorf("all %d contacts failed to process", response.TotalProcessed)
}
```

---

## Part C: Twilio Call Bot — Full Implementation

### How Twilio Call Bot Manages Customer Lists (vs Xcally)

**Key architectural difference**: Xcally uses a **list-based dialing model** (upload customer list → assign to queue/campaign → Xcally's dialer calls them). Twilio uses a **per-call model** (make one API call per customer phone number).

**For Twilio Call Bot, the flow is:**

```text
Campaign/Workflow (CRM or Steward)
  → Segmentation query produces customer list
  → POST /call-center/send (with customers array + template/script ID)
  → comm-service enqueues to SQS (XcallyProcessorQueue)
  → Processor routes by provider:
    ├── xcally → bulk list upload + queue/campaign assignment (Xcally dials)
    └── twilio_voice → for EACH customer:
           POST https://api.twilio.com/Calls.json
             To={customer.phone}, From={sender}
             Url={twimlBaseURL}/v1/call-center/twiml/{scriptID}?org_id=...&customer_id=...
             StatusCallback={twimlBaseURL}/v1/webhooks/twilio-callbot?org_id=...&dispatch_id=...
           → Twilio dials customer
           → When answered, Twilio fetches TwiML from our endpoint
           → Multi-turn conversation via Gather/Say/Dial
           → StatusCallback webhooks for each call stage → DDB + Kafka events
```

**Concurrency control**: Twilio has a default 1 CPS (calls per second) limit. The processor must rate-limit outbound calls. Use a semaphore or token bucket with configurable CPS (stored in provider credentials as `max_cps`).

**Batch tracking**: Each customer call gets its own `CallSid` from Twilio. All calls share the same `dispatch_id`. Events are stored per-customer in DDB with `message_id = CallSid`.

**Webhooks per call**: Each Twilio call sends 4 StatusCallback events (initiated → ringing → answered → completed). These all arrive at `/v1/webhooks/twilio-callbot` with `org_id`, `dispatch_id`, `customer_id` in query params.

### C1: Enable Twilio as Call Center provider

**File**: `communication-service/internal/communication/validator.go`

- Add `case TwilioVoice:` to `validateCallCenterProvider` switch

### C2: Call Bot Script Model

**New file**: `communication-service/internal/communication/callcenter/callbot_script.go`

Call Bot scripts are stored as Content Templates with `comm_channel=CALL_BOT`. The template `body` is JSON:

```json
{
  "version": "1.0",
  "voice": "Polly.Joanna-Generative",
  "language": "en-US",
  "speechModel": "googlev2_telephony",
  "maxRetries": 3,
  "maxCPS": 1,
  "machineDetection": "Enable",
  "steps": [
    {
      "id": "welcome",
      "type": "gather",
      "input": "speech dtmf",
      "prompt": "Hello {{customer_name}}. This is BFREE calling about your loan of {{amount}}. Press 1 or say payment to make a payment. Press 2 or say plan for a payment plan. Press 0 to speak with an agent.",
      "hints": "payment, plan, agent, one, two, zero",
      "timeout": 8,
      "routes": { "1": "payment_confirm", "payment": "payment_confirm", "2": "payment_plan", "plan": "payment_plan", "0": "transfer_agent", "agent": "transfer_agent" },
      "noInputAction": "retry",
      "noMatchAction": "retry"
    },
    { "id": "payment_confirm", "type": "say", "prompt": "Thank you. Your payment of {{amount}} is being processed. You will receive a confirmation SMS shortly. Goodbye.", "nextStep": "hangup" },
    { "id": "payment_plan", "type": "gather", "input": "speech", "prompt": "Please describe when you would like to make your payment.", "timeout": 10, "nextStep": "plan_confirm" },
    { "id": "plan_confirm", "type": "say", "prompt": "We have noted your preferred payment date. An agent will follow up. Goodbye.", "nextStep": "hangup" },
    { "id": "transfer_agent", "type": "dial", "number": "+2348012345678", "timeout": 30, "record": "record-from-answer-dual", "whisperPrompt": "Call bot transfer. Customer {{customer_name}}, loan {{amount}}.", "fallbackStep": "voicemail" },
    { "id": "voicemail", "type": "record", "prompt": "All agents are busy. Please leave a message after the beep.", "maxLength": 120, "transcribe": true, "nextStep": "hangup" },
    { "id": "hangup", "type": "hangup" }
  ]
}
```

Go structs:

```go
type CallBotScript struct {
    Version          string        `json:"version"`
    Voice            string        `json:"voice"`
    Language         string        `json:"language"`
    SpeechModel      string        `json:"speechModel"`
    MaxRetries       int           `json:"maxRetries"`
    MaxCPS           int           `json:"maxCPS"`
    MachineDetection string        `json:"machineDetection"`
    Steps            []CallBotStep `json:"steps"`
}
type CallBotStep struct {
    ID             string            `json:"id"`
    Type           string            `json:"type"` // gather, say, play, record, dial, hangup
    Input          string            `json:"input,omitempty"`
    Prompt         string            `json:"prompt,omitempty"`
    AudioURL       string            `json:"audioUrl,omitempty"`
    Hints          string            `json:"hints,omitempty"`
    Timeout        int               `json:"timeout,omitempty"`
    NumDigits      int               `json:"numDigits,omitempty"`
    Routes         map[string]string `json:"routes,omitempty"`
    NextStep       string            `json:"nextStep,omitempty"`
    NoInputAction  string            `json:"noInputAction,omitempty"`
    NoMatchAction  string            `json:"noMatchAction,omitempty"`
    Number         string            `json:"number,omitempty"`
    CallerID       string            `json:"callerId,omitempty"`
    Record         string            `json:"record,omitempty"`
    WhisperPrompt  string            `json:"whisperPrompt,omitempty"`
    FallbackStep   string            `json:"fallbackStep,omitempty"`
    MaxLength      int               `json:"maxLength,omitempty"`
    Transcribe     bool              `json:"transcribe,omitempty"`
}
func ParseCallBotScript(body string) (*CallBotScript, error)
func (s *CallBotScript) GetStep(id string) *CallBotStep
func (s *CallBotScript) GenerateTwiML(step *CallBotStep, baseURL, scriptID, orgID, customerID string, attempt int) string
```

### C3: Twilio Call Bot sender

**New file**: `communication-service/internal/communication/callcenter/twilio_callbot.go`

```go
type TwilioCallBot struct {
    accountSID   string
    authToken    string
    baseURL      string
    twimlBaseURL string
    orgID        string
    maxCPS       int // rate limit
}
func NewTwilioCallBot(cred *repo.ProviderCredentials, twimlBaseURL string) (*TwilioCallBot, error)
func (t *TwilioCallBot) MakeCall(ctx context.Context, params CallBotCallParams) (callSID string, err error)
func (t *TwilioCallBot) ProcessCustomerBatch(ctx context.Context, customers []Customer, params BatchCallParams) (*BatchResult, error)
```

`ProcessCustomerBatch` iterates customers with rate limiting (maxCPS via time.Ticker), calls `MakeCall` for each, collects results:

```go
func (t *TwilioCallBot) ProcessCustomerBatch(ctx, customers, params) (*BatchResult, error) {
    ticker := time.NewTicker(time.Second / time.Duration(t.maxCPS))
    defer ticker.Stop()
    result := &BatchResult{}
    for _, customer := range customers {
        <-ticker.C // rate limit
        callSID, err := t.MakeCall(ctx, CallBotCallParams{
            Destination: customer.Phone,
            From:        params.SenderID,
            ScriptID:    params.ScriptID,
            DispatchID:  params.DispatchID,
            CustomerID:  customer.CustomerID,
        })
        if err != nil {
            result.Failed++
            result.Errors = append(result.Errors, err)
        } else {
            result.Successful++
            result.CallSIDs = append(result.CallSIDs, callSID)
        }
    }
    return result, nil
}
```

`MakeCall` calls `POST https://api.twilio.com/2010-04-01/Accounts/{accountSID}/Calls.json`:

- `To`, `From`, `Url` (TwiML endpoint), `StatusCallback`, `StatusCallbackEvent`, `MachineDetection`

### C4: TwiML serving endpoints (7 handlers)

**New file**: `communication-service/cmd/api/twiml_handler.go`

1. **`ServeTwiMLHandler`** — `GET/POST /v1/call-center/twiml/:script_id` — serves initial/next step TwiML
2. **`HandleTwiMLGatherHandler`** — `POST /v1/call-center/twiml/:script_id/gather` — processes DTMF/speech input, routes to next step
3. **`HandleTwiMLRecordedHandler`** — `POST /v1/call-center/twiml/:script_id/recorded` — stores recording reference
4. **`HandleTwiMLAfterDialHandler`** — `POST /v1/call-center/twiml/:script_id/after-dial` — handles dial result (connected/failed)
5. **`HandleTwiMLWhisperHandler`** — `POST /v1/call-center/twiml/:script_id/whisper` — agent whisper before bridge
6. **`HandleTwiMLAMDHandler`** — `POST /v1/call-center/twiml/:script_id/amd` — answering machine detection handler
7. **`TwilioCallBotWebhookHandler`** — `POST /v1/webhooks/twilio-callbot` — call status updates → DDB + Kafka

All TwiML handlers return `Content-Type: application/xml`. The gather handler matches input against the step's `routes` map (DTMF digits + speech keywords, case-insensitive). Retry logic tracks attempts via query params.

### C5: Processor routing by provider

**File**: `communication-service/internal/communication/callcenter/xcally_processor.go`

Add provider routing in `ProcessMessage`:

```go
creds := getCredentialsForSubService(ctx, payload)
switch creds.ProviderName {
case "twilio_voice":
    bot := NewTwilioCallBot(creds, cfg.AuthServiceURL)
    return bot.ProcessCustomerBatch(ctx, payload.Customers, batchParams)
case "xcally":
    ccInterface := NewXcally(dynamoRepo)
    auth, _ := ccInterface.GetCallCenterCredentials(ctx, ...)
    return ccInterface.SendToXcally(ctx, payload, auth, orgID, origin)
}
```

### C6: Route registration

**File**: `communication-service/cmd/api/main.go`

```go
callCenterTwiml := callCenter.Group("/twiml")
callCenterTwiml.GET("/:script_id", c.ServeTwiMLHandler)
callCenterTwiml.POST("/:script_id", c.ServeTwiMLHandler)
callCenterTwiml.POST("/:script_id/gather", c.HandleTwiMLGatherHandler)
callCenterTwiml.POST("/:script_id/recorded", c.HandleTwiMLRecordedHandler)
callCenterTwiml.POST("/:script_id/after-dial", c.HandleTwiMLAfterDialHandler)
callCenterTwiml.POST("/:script_id/whisper", c.HandleTwiMLWhisperHandler)
callCenterTwiml.POST("/:script_id/amd", c.HandleTwiMLAMDHandler)
webhooks.POST("/twilio-callbot", c.TwilioCallBotWebhookHandler)
```

### C7: Kafka events

**File**: `communication-service/internal/kafka/comms_events.go`

- Add `EventCallBotSent = "comms.callbot.sent"` and `EventCallBotCompleted = "comms.callbot.completed"`

---

## Part D: CRM-FE Updates

### D1: Provider Settings — Twilio Call Bot + VMS fields

**`src/utils/constants.ts`**: Add `webhook_secret` to VMS providers; add `twilio_voice` call center provider with `sub_services: ["CALL_BOT"]`, fields: `account_sid`, `auth_token`, `base_url`, `test_contact`, `max_cps`

**`src/components/admin/settings/CommunicationSettings.vue`**: Add `twilio_voice` logo/name for call center tab

**`src/components/admin/dialog/settings/CommunicationSettingsDialog.vue`**: Add `test_voice_name` for VMS providers

### D2: Workflow Builder — Call Bot action config

**`src/views/admin/pages/WorkflowBuilder/ActionSideDisplay.vue`**:
In `TransferToCallCenter` panel, detect provider type:

- **Xcally**: Show Company → Queue/IVR Campaign → List (existing)
- **Twilio Call Bot**: Show Call Bot Script/Template selector:
  - Fetch: `GET /template?active=true&comm_channel=CALL_BOT&sources=WorkFlow`
  - Store as: `{ callCenterSettings: { provider: "twilio_voice", subService: "CALL_BOT", templateId: "..." } }`

### D3: Content Templates — Call Bot Script Editor

**`src/views/admin/pages/ContentTemplates.vue`**: Allow `CALL_BOT` as a creatable channel

**New component**: `src/components/admin/dialog/CallBotScriptEditor.vue`

- Visual step builder: add/remove/reorder steps
- Per-step config: type (gather/say/play/record/dial/hangup), prompt text, input mode, DTMF/speech routes, timeouts
- Voice/language/speechModel selectors at script level
- JSON preview panel
- Placeholder support (`{{customer_name}}`, `{{amount}}`, etc.)
- Test-send integration (dials a phone and runs the script)

### D4: Campaign Create — CALL_BOT channel

**`src/views/admin/pages/MessageCampaigns/CreateMessageCampaigns.vue`**:

- Add `"CALL_BOT"` to channel options: `templateTypes: ["SMS", "EMAIL", "VMS", "CALL_BOT"]`
- When channel is `CALL_BOT`, template picker filters by `comm_channel=CALL_BOT`
- Campaign dispatch sends to `/call-center/send` instead of `/communications/dispatch` for CALL_BOT

---

## Part E: Steward-FE — New Modules

### E1: Provider Settings updates

**`src/features/Settings/type/index.ts`**: Add `webhook_secret` to VMS; add `twilio_voice` call center
**`src/features/Settings/view/CommunicationsView.vue`**: Add `twilio_voice` logo

### E2: Content Templates — CALL_BOT support

**`src/features/ContentTemplates/view/TemplateFormView.vue`**: When `comm_channel === 'CALL_BOT'`, render Call Bot Script Editor (Element Plus version)

### E3: Campaign Module (New Feature)

**New folder**: `src/features/Campaigns/`

**Structure**:

```text
src/features/Campaigns/
├── route/index.ts           ← Routes under "Automations" group
├── type/index.ts            ← Campaign types, status enums
├── api/campaignApi.ts       ← API client (VITE_API_URL_CAMPAIGN_SERVICE)
├── composables/
│   └── useCampaign.ts       ← Business logic composable
├── view/
│   ├── CampaignListView.vue      ← Campaign table with status/stats
│   ├── CampaignCreateView.vue    ← 3-step wizard
│   └── CampaignDetailView.vue    ← Progress, stats, controls
└── components/
    ├── SegmentationBuilder.vue    ← Query builder (wraps shared component)
    ├── AudienceFileUpload.vue     ← CSV upload with presigned URL
    ├── TemplateSelector.vue       ← Filtered template picker
    └── ScheduleDialog.vue         ← Recurrence rule editor
```

**Routes** (under `"Automations"` group, `groupOrder: 10`):

- `automations/campaigns` → CampaignListView
- `automations/campaigns/new` → CampaignCreateView
- `automations/campaigns/:id` → CampaignDetailView

**CampaignCreateView — 3-step wizard** (matching CRM):

- **Step 1**: Channel selector (SMS/VMS/CALL_BOT), Country, Content Template picker
- **Step 2**: Audience — **Segmentation query builder** OR file upload
  - Segmentation uses `VITE_API_URL_WORKFLOW_SEGMENTS/build` (same Lambda as CRM)
  - File upload uses presigned S3 URL from `/initiate` response

- **Step 3**: Schedule — one-time date/time or recurring (business days, cron)

**API** (same endpoints as CRM):

```text
VITE_API_URL_CAMPAIGN_SERVICE:
  POST /initiate                     ← create campaign job
  POST /trigger/{job_id}             ← start dispatch
  PUT /schedule/{job_id}             ← set schedule
  GET /preview/{job_id}              ← preview before dispatch
  GET /list?limit=...&page=...       ← list campaigns
  GET /status/{job_id}               ← poll processing status

VITE_API_URL_WORKFLOW_SEGMENTS:
  GET /segments                      ← available filter columns
  POST /build                        ← execute segment query, get count
```

**New env vars** for Steward-FE `.env`:

```text
VITE_API_URL_CAMPAIGN_SERVICE=...
VITE_API_URL_WORKFLOW_SEGMENTS=...
```

**Segmentation** works identically to CRM: the `SegmentationBuilder` component wraps a query builder that calls `GET /segments` for available columns, lets the user build filter rules visually, and calls `POST /build` to get the match count. The query object is stored in the campaign payload's `segmentation_data` field.

### E4: Workflow Module (New Feature)

**New folder**: `src/features/Workflows/`

**Structure**:

```text
src/features/Workflows/
├── route/index.ts
├── type/index.ts              ← ActionType, NodeType enums
├── api/workflowApi.ts         ← API client (VITE_API_URL_CREATE_WORKFLOW_URL)
├── composables/
│   └── useWorkflow.ts
├── view/
│   ├── WorkflowListView.vue        ← Table of workflows
│   ├── WorkflowBuilderView.vue     ← Canvas drag-and-drop builder
│   ├── WorkflowDetailView.vue      ← Config overview
│   └── WorkflowExecutionView.vue   ← Execution history per-customer
└── components/
    ├── WorkflowCanvas.vue           ← Vue Flow canvas
    ├── ActionNode.vue               ← Action node (SendSMS/VMS/Email/CallBot)
    ├── DecisionNode.vue             ← Condition branching
    ├── WaitNode.vue                 ← Delay/schedule
    ├── TriggerNode.vue              ← Trigger with segmentation query
    ├── ActionSidePanel.vue          ← Right sidebar for node config
    └── WorkflowRecurrenceDialog.vue ← Schedule editor
```

**Action types** (matching CRM):

- `SEND_SMS`, `SEND_EMAIL`, `SEND_VMS`, `SEND_CHATBOT`, `TRANSFER_TO_CALL_CENTER`

**Trigger node**: Contains segmentation query builder (same as campaigns). The query defines which customers enter the workflow at execution time.

**TransferToCallCenter action**:

- Provider detection: Xcally → Company/Queue/IVR Campaign; Twilio → Call Bot Script selector
- Call Bot templates fetched from: `GET /template?active=true&comm_channel=CALL_BOT&sources=WorkFlow`

**API** (same endpoints as CRM):

```text
VITE_API_URL_CREATE_WORKFLOW_URL:
  POST /                             ← create workflow
  PUT /                              ← update workflow
  POST /execute                      ← start execution
  POST /{id}/pause                   ← pause
  GET /{id}/sequence-html            ← get workflow config

VITE_API_URL_TEMPORAL_WORKFLOW:
  GET /templates                     ← list workflow templates
  POST /executions                   ← start Temporal execution
  GET /executions                    ← list executions
  GET /executions/{id}/journeys      ← per-customer journey
```

**New env vars**:

```text
VITE_API_URL_CREATE_WORKFLOW_URL=...
VITE_API_URL_TEMPORAL_WORKFLOW=...
VITE_API_URL_WORKFLOW_STEP_TEMPLATE=...
```

### E5: Shared Query Builder Component

**New shared component**: `src/shared/components/QueryBuilder/`

The segmentation query builder needs to be a shared component used by both Campaigns and Workflows. Port the CRM's `QueryBuilderComponent.vue` to Element Plus (Steward uses Element Plus, CRM uses Vuetify).

The builder:

1. Fetches available columns from `GET /segments`
2. Lets user add filter rules (field + operator + value)
3. Groups rules with AND/OR logic
4. Produces the query object: `{ filters: {...}, order_by: {...}, limit_offset: {...} }`
5. "Build" button calls `POST /build` → returns `{ num_rows: N }`

---

## Files to Modify — Complete List

### Communication-Service Backend (15+ files)

| File | Change |
| --- | --- |
| `internal/communication/vms/infobip.go` | Migrate to `/tts/3/advanced`, add `notifyUrl` |
| `internal/communication/vms/model.go` | Add advanced endpoint structs |
| `internal/communication/vms/twilio_voice.go` | Support inline TwiML AND external URL |
| `internal/config/main.go` | Remove dead `InfobipVmsWebhookURL` |
| `internal/communication/callcenter/xcally.go` | Fix list creation: stale locks, addContactsToList, performAssignment validation, lock cleanup |
| `internal/communication/callcenter/xcally_contacts.go` | May need to expose `addContactsToList` or create wrapper |
| `internal/communication/validator.go` | Add `TwilioVoice` to call center validator |
| `internal/communication/callcenter/callbot_script.go` | **NEW** — Script parser + TwiML generator |
| `internal/communication/callcenter/twilio_callbot.go` | **NEW** — Twilio Call Bot sender with rate limiting |
| `internal/communication/callcenter/xcally_processor.go` | Add provider routing switch |
| `cmd/api/twiml_handler.go` | **NEW** — 7 TwiML handlers |
| `cmd/api/webhooks.go` | Add `TwilioCallBotWebhookHandler` |
| `cmd/api/main.go` | Register TwiML + webhook routes |
| `cmd/api/handler.go` | Add 8 new handler interface methods |
| `internal/kafka/comms_events.go` | Add Call Bot event types |

### CRM-FE (7 files)

| File | Change |
| --- | --- |
| `src/utils/constants.ts` | Add `webhook_secret` to VMS; add `twilio_voice` call center |
| `src/components/admin/dialog/settings/CommunicationSettingsDialog.vue` | Add `test_voice_name` for VMS |
| `src/components/admin/settings/CommunicationSettings.vue` | Add `twilio_voice` logo/name |
| `src/views/admin/pages/WorkflowBuilder/ActionSideDisplay.vue` | Add Call Bot script selector |
| `src/views/admin/pages/ContentTemplates.vue` | Allow CALL_BOT channel |
| `src/components/admin/dialog/CallBotScriptEditor.vue` | **NEW** — Call Bot flow editor |
| `src/views/admin/pages/MessageCampaigns/CreateMessageCampaigns.vue` | Add CALL_BOT channel |

### Steward-FE (20+ files — new features)

| File | Change |
| --- | --- |
| `src/features/Settings/type/index.ts` | Add `webhook_secret`; add `twilio_voice` call center |
| `src/features/Settings/view/CommunicationsView.vue` | Add `twilio_voice` logo |
| `src/features/ContentTemplates/view/TemplateFormView.vue` | Call Bot script editor for CALL_BOT channel |
| `src/shared/components/QueryBuilder/` | **NEW** — Segmentation query builder (Element Plus) |
| `src/features/Campaigns/` | **NEW** — Full campaign module (5+ files) |
| `src/features/Workflows/` | **NEW** — Full workflow module (10+ files) |
| `.env` | Add campaign, workflow, segments API URLs |

---

## Implementation Order

1. **Phase 1**: Xcally bug fixes (B1-B5) — unblocks existing call center functionality
2. **Phase 2**: VMS fixes (A1-A4) — get all 4 VMS providers working E2E
3. **Phase 3**: Twilio Call Bot backend (C1-C7) — script parser, TwiML, processor, webhooks
4. **Phase 4**: CRM-FE updates (D1-D4) — provider settings, script editor, campaign channel, workflow builder
5. **Phase 5**: Steward-FE provider + template updates (E1-E2) — quick wins
6. **Phase 6**: Steward-FE shared QueryBuilder component (E5)
7. **Phase 7**: Steward-FE Campaign module (E3) — new feature with segmentation
8. **Phase 8**: Steward-FE Workflow module (E4) — new feature with builder

---

## Verification

### Xcally Testing

1. Create a CALL_CENTER provider (Xcally) with valid credentials
2. Trigger dispatch via workflow or API with a test customer
3. Verify:
   - [ ] List created on Xcally (`GET /cm/lists`)
   - [ ] Contact created AND added to the list
   - [ ] List assigned to queue or IVR campaign
   - [ ] No stale locks in DynamoDB `xcally_list_locks` table

### VMS Testing (per provider)

1. Configure VMS provider credentials
2. Create VMS template, test-send to real phone
3. Verify: phone rings → TTS plays template text → webhook 200 → DDB event Delivered

### Twilio Call Bot Testing

1. Create CALL_BOT content template (JSON script with gather/say/dial steps)
2. Configure `twilio_voice` CALL_CENTER provider with CALL_BOT sub-service
3. Trigger via campaign or workflow with test customer
4. Verify:
   - [ ] Outbound call placed (rate-limited per maxCPS)
   - [ ] TwiML served → Gather prompt plays
   - [ ] DTMF/speech routed correctly
   - [ ] Agent transfer works via Dial
   - [ ] Recording stored (if record step)
   - [ ] AMD detects machine/human
   - [ ] StatusCallback → DDB + Kafka events

### Steward Campaign/Workflow Testing

1. Navigate to Automations → Campaigns
2. Create SMS/VMS/CALL_BOT campaign with segmentation
3. Verify segmentation query returns customer count
4. Trigger campaign → messages dispatched
5. Navigate to Automations → Workflows
6. Build workflow with SendVMS + TransferToCallCenter steps
7. Execute → verify customers processed through all steps

### Build

```bash
cd communication-service && go mod tidy && go build ./... && go vet ./... && go test ./...
```

---

## Part G: Unified Campaign / Template / Workflow / Segmentation Architecture

### Background

The current stack fragments campaign delivery across services:

- **ETB** owns email templates (`/api/v1/email-templates`) and routes email campaigns through **Listmonk** (`/api/v1/campaigns/listmonk`).
- **message_campaign_service** (port 8090) owns SMS/VMS/CALL_BOT campaigns but never calls ETB for email.
- **bfree-temporal-workflow-engine** (port 8091) orchestrates multi-step workflows with `SendSMS`, `SendEmail`, `SendVMS` activities that dispatch to **communication-service** via queue endpoints.
- **template-engine** (port 8082) resolves placeholders but is only wired to some flows.
- **Content Templates** in comm-svc cover SMS/VMS/CALL_BOT/IVR/CHAT but not EMAIL (ETB owns those).
- **data-segments-api** (port 9100) serves segments to both CRM and Steward campaign wizards.

Result: two separate "create campaign" flows (ETB email campaigns vs message_campaign_service non-email), two template catalogues (ETB email-templates vs content-templates), and template rendering in multiple places. The user wants a single Steward wizard that handles every channel uniformly, with ETB as the email *editor* (not a separate campaign UI).

### Target architecture

```text
                    ┌─────────────────────┐
                    │  Steward-FE / CRM-FE │  (one wizard for all channels)
                    └──────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
         ┌──────▼──────┐              ┌───────▼───────┐
         │  Templates  │              │   Campaigns   │
         │  (unified)  │              │  (unified)    │
         └──────┬──────┘              └───────┬───────┘
                │                             │
     ┌──────────┴──────────┐                  │
     │                     │                  │
 ┌───▼───┐      ┌──────────▼─────────┐        │
 │  ETB  │      │  content-templates │        │
 │ email │      │  (SMS/VMS/CALL_BOT)│        │
 │editor │      │    (comm-svc)      │        │
 └───┬───┘      └──────────┬─────────┘        │
     │                     │                  │
     └─────────┬───────────┘                  │
               │                              │
        ┌──────▼──────┐                       │
        │ template-   │                       │
        │ engine      │◄──────────────────────┤
        │ (render     │                       │
        │  placeholders)                      │
        └──────┬──────┘                       │
               │                              │
               │       ┌──────────────────────▼─────────────────────┐
               │       │  message_campaign_service (all channels)   │
               │       │  • initiate/trigger/schedule               │
               │       │  • audience: file OR segmentation          │
               │       │  • routes EMAIL → ETB Listmonk internally │
               │       │  • routes SMS/VMS/CALL_BOT → workflow queue│
               │       └────────┬───────────────────┬───────────────┘
               │                │                   │
               │                ▼                   ▼
               │      ┌──────────────────┐   ┌──────────────┐
               │      │   workflow-      │   │     ETB /    │
               │      │   engine         │   │   Listmonk   │
               │      │   (multi-step)   │   │  (email send)│
               │      └─────────┬────────┘   └──────┬───────┘
               │                │                   │
               │                └────────┬──────────┘
               │                         │
               │                         ▼
               │                ┌─────────────────┐
               └───────────────►│ communication-  │
                                │   service       │◄── data-segments-api
                                │ (SMS/VMS/CB/CC) │    (segmentation)
                                └─────────────────┘
```

**Single truth per concern:**

- **Template authoring** — content-templates (all channels) with ETB as the email-channel editor (returns a `template_id` to the catalogue).
- **Template rendering** — template-engine, called once per dispatch event from comm-svc.
- **Campaign lifecycle** — message_campaign_service (all channels), with EMAIL delegated inside the service.
- **Multi-step orchestration** — workflow-engine, consuming the same `template_id` and segmentation.
- **Audience** — data-segments-api, one segmentation query object passed anywhere.
- **Dispatch** — communication-service, one dispatch contract.

---

### G1: Content Template model — add EMAIL as a channel

- **comm-svc** `content_templates` table: add `EMAIL` to `comm_channel` enum. An EMAIL content-template stores a lightweight pointer: `etb_template_id`, `subject`, plus placeholder metadata. The HTML body stays in ETB.
- **ETB** `/api/v1/email-templates` stays authoritative for HTML/MJML. When a user saves an email template in ETB, ETB calls `POST /content-templates` in comm-svc to register the pointer (or comm-svc pulls via webhook on ETB save).
- **Steward-FE / CRM-FE** template library calls `GET /content-templates?comm_channel=EMAIL` — returns the lightweight pointers. "Edit content" button opens ETB editor at `/email-templates/:etb_template_id` (route or embedded iframe).
- **Migration**: one-time job reads every ETB `email_templates` row, writes a matching `content_templates` row with `etb_template_id=<id>`. Place at `communication-service/scripts/migrations/backfill_email_content_templates.go`.

### G2: Campaign flow — message_campaign_service as the single entry

- **message_campaign_service** `POST /initiate` already accepts `channel`. Add EMAIL path:
  - If `channel == EMAIL`, the service calls ETB `POST /api/v1/campaigns/listmonk` with the resolved Listmonk list (built from segmentation) + template body + subject. Stores `etb_campaign_id` alongside `job_id`.
  - `PUT /schedule/{job_id}` for EMAIL translates `RecurrenceRule` into Listmonk's `send_at` / schedule CRON and calls ETB.
  - `POST /trigger/{job_id}` for EMAIL calls ETB `PUT /api/v1/campaigns/listmonk/:id/status` with `status=running`.
  - Polling `GET /status/{job_id}` aggregates both: internal job status + ETB Listmonk campaign stats.

- **ETB** retires the standalone "create email campaign" UI (`/campaigns/listmonk` frontend view). ETB remains useful for: email-template CRUD, Listmonk pass-through admin (for support debugging), bounce management. Not for end-user campaign creation.
- **Listmonk lists** are created on-the-fly by message_campaign_service from segmentation: when channel=EMAIL and data_source=segmentation, service queries data-segments-api for customer emails, pushes them to a new Listmonk list, then creates the Listmonk campaign pointing at that list. Lists named `campaign-{job_id}`. Cleanup after campaign completes (or via TTL cron).

### G3: Workflow integration — same templates, same audience

- **workflow-engine** `activities/messaging/SendEmailActivity` today hits a queue. Change it to: resolve `template_id` via comm-svc `GET /content-templates/:id`, fetch HTML from ETB if channel=EMAIL, render with template-engine, dispatch via comm-svc `POST /dispatch`. This replaces the direct SMS/email endpoint calls with a single `POST /dispatch` interface in comm-svc keyed by channel.
- **workflow-engine config.yaml** `services.sms/email/vms/chatbot.endpoint` collapse into one `services.communication.endpoint` (a single SQS queue URL or HTTP endpoint). Variant channels are metadata on the message, not separate endpoints.
- **message_campaign_service** when `recurrence_rule != null` delegates to workflow-engine: calls `POST /api/v1/workflows` to create a template + schedule, then the workflow drives the send loop. Replaces the current in-service scheduler for non-immediate campaigns.

### G4: Segmentation — single audience source

- **data-segments-api** is the only place segmentation queries run. Both message_campaign_service and workflow-engine call `POST /build` with the same query object and get back `{num_rows, customer_ids}` or a paged fetch endpoint.
- Persist the segmentation query alongside the campaign (`campaigns.segmentation_data JSONB`) for re-run / audit.
- Add `POST /fetch` to data-segments-api returning paginated customer records with PII — used by the dispatch loop in message_campaign_service or workflow-engine, never from a frontend.

### G5: Communication-service dispatch contract

- Consolidate to one endpoint: `POST /v1/dispatch`.
- Body:

  ```json
  {
    "dispatch_id": "uuid",
    "organization_id": "uuid",
    "country_id": "uuid",
    "domain": "crm|admin",
    "channel": "SMS|EMAIL|VMS|CALL_BOT|CHAT|IVR|INSTANT_MESSAGING",
    "template_id": "uuid",
    "recipients": [{"customer_id": "uuid", "to": "+234...", "variables": {...}}],
    "source": "Agent|WorkFlow|Campaign|API|Inbound|Webhook|Test|Auth|Notification|Subscription|System",
    "source_id": "uuid",
    "rate_limit_weight": 5,
    "idempotency_key": "uuid",
    "scheduled_at": 1730000000000
  }
  ```

  Field notes:
  - `domain` selects whether to apply CRM-specific (collections-product) or
    admin-domain (platform) routing rules; provider credentials are scoped
    by domain in `provider_credentials.allowed_domains`.
  - `channel` enum is the canonical 7-value set; `INSTANT_MESSAGING` is the
    superset for non-WhatsApp chat (Telegram / direct-line / etc.).
  - `source` is the canonical 11-value enum from Phase Q; the Mixed-case
    PascalCase form is authoritative across services.
  - `idempotency_key` (Part Q1) is required at the boundary; the comm-svc
    Redis cache returns the prior response for replay-within-24h.
  - `scheduled_at` is optional epoch-millis; non-null pushes the dispatch
    to the scheduled-events topic instead of immediate.

- Comm-svc internally:
  1. Resolves `template_id` → fetches content (ETB for EMAIL, local table for others).
  2. Calls **template-engine** `POST /render` with template + variables to produce final body/subject.
  3. Routes to the appropriate provider integration (SMS providers, Email via SES/SendGrid/etc., VMS providers, Xcally/Twilio for call center).
  4. Emits events to Kafka `comms-events` topic (already implemented).

- Removes per-channel API endpoints in comm-svc for dispatching; existing provider-admin endpoints stay.

### G6: Template-engine as the single render layer

- **template-engine** `POST /render` takes `{template_id, channel, variables}` and returns resolved `{body, subject?, metadata}`. Currently some flows (comm-svc direct SMS) format strings locally — migrate all to call template-engine.
- **Caching**: template-engine already caches compiled templates in Redis. Extend TTL invalidation on ETB template save (webhook → template-engine cache evict).
- **Previews** (both CRM and Steward content template preview) go through template-engine `POST /preview` instead of per-service render code.

---

## Part F: Steward-FE `/app/automations/campaigns/new` — Full CRM Parity

### 2 Context

The current Steward-FE `CampaignCreateView.vue` is a partial 3-step wizard. It's missing:

- Description field with `length >= 100` validation (CRM requirement)
- Country select with flag rendering (CRM uses `fetchActiveCountries`; Steward uses plain text input)
- File-upload path (initiate → PUT presigned URL → poll `/status/{job_id}`)
- Proper recurrence (DAILY/WEEKLY/MONTHLY with days-of-week, end date)
- Template library with inline "Create Template" shortcut
- Preview dialog before submit
- `template_data` resolution on template select (CRM sends both `template_id` AND rendered `template_data`)

The CRM source is `/Users/APPLE/BFREE-Africa/crm-fe/src/views/admin/pages/MessageCampaigns/CreateMessageCampaigns.vue`. Payload shape at [CreateMessageCampaigns.vue:574-586](src/views/admin/pages/MessageCampaigns/CreateMessageCampaigns.vue#L574-L586). The Steward replica must match the same `POST /campaign/initiate` payload so the backend (now running locally on `:8090`) accepts it unchanged.

### Files to create

**`src/shared/components/RecurrenceRulePicker.vue`** — reusable schedule picker.

- Props: `modelValue: RecurrenceRule | null`.
- Emits: `update:modelValue`, `valid: boolean`.
- State: `scheduleType` (`immediate`|`once`|`daily`|`weekly`|`monthly`), `startDate`, `time`, `endDate`, `daysOfWeek[]`.
- Components: `el-radio-group`, `el-date-picker`, `el-time-picker`, `el-checkbox-group` (weekly only).
- Emits `null` when `immediate`, otherwise a `RecurrenceRule` shape matching the extended type below.
- `:disabled-date` on start/end pickers rejects past dates.

**`src/shared/components/TemplateLibrary.vue`** — template picker.

- Props: `channel: CampaignChannel`, `modelValue: string`.
- Emits: `update:modelValue`, `templateData: string` (the rendered `.template` field to send as `template_data`).
- Internally calls `listTemplates('active=true&sources=Campaign')` from `/src/features/ContentTemplates/api/templateApi.ts`, filters by `comm_channel === channel`.
- Renders card grid; card click → selects + emits.
- Empty state: "No {channel} templates yet" + button "Create Template →" that navigates `router.push({ name: 'template-new', query: { returnTo: 'campaign-new' } })`.

### Files to modify

**`src/features/Campaigns/type/index.ts`** — extend `RecurrenceRule`:

```ts
export interface RecurrenceRule {
  type: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";
  schedules: Array<{
    date?: string;
    time?: string;
    days_of_week?: string[];   // new (weekly only)
    end_date?: string;         // new (daily/weekly/monthly optional end)
  }>;
}
```

**`src/features/Campaigns/view/CampaignCreateView.vue`** — rewrite to match CRM.

- Script: import `RecurrenceRulePicker`, `TemplateLibrary`, `listActiveCountries` from `/src/features/Settings/api/countryApi.ts`. Add refs: `description`, `countries`, `templateData`, `presignedUrl`, `uploadStatus` (`idle`|`uploading`|`polling`|`done`|`error`), `uploadProgress`, `pollInterval`, `recurrenceRule`, `jobId`, `previewVisible`.
- `canAdvanceStep1`: name + description.length >= 100 + channel + countryId + templateId.
- `canAdvanceStep2`: `segmentation` → `segmentCount > 0`; `file` → `uploadStatus === 'done'`.
- Keep `el-steps` visual indicator (already the Steward convention).
- Wrap Step 1 in `el-form :rules="step1Rules"` for native inline errors.
- Country `el-select` with flag `<img :src="country.flag_url">` in option slot. Load via `listActiveCountries()` in `onMounted`.
- Step 1 template section: `<TemplateLibrary v-model="templateId" :channel="channel" @templateData="templateData = $event" />`.
- On mount: if `route.query.templateId` is present, pre-select that template (return path from template-new).
- Step 2 file section: `el-upload` + "Upload & Validate" button + `el-progress` + status text + retry button.
- Step 3: `<RecurrenceRulePicker v-model="recurrenceRule" />` replaces inline radio/date block.
- Add preview `el-dialog` with summary; confirm button calls `handleCreate`.

**`src/features/ContentTemplates/view/TemplateFormView.vue`** — add `returnTo` handling.

- On successful template create/save, check `route.query.returnTo`. If `'campaign-new'`, `router.push({ name: 'campaign-new', query: { templateId: savedTemplate.id } })`.

### API call sequences

**Segmentation path:**

```text
Step 2: SegmentationBuilder → POST /segments-api/build → { num_rows: N }
Step 3: RecurrenceRulePicker → recurrenceRule
Preview → handleCreate:
  1. POST /campaign-api/initiate {
       campaign_name, channel, country_id, template_id,
       description, template_data, sheet_number: 1,
       data_source: "segmentation",
       segmentation_data: segmentQuery
     } → { job_id }
  2. if recurrenceRule: PUT /campaign-api/schedule/{job_id} { recurrence_rule: rule }
  3. POST /campaign-api/trigger/{job_id}
  4. ElMessage.success + router.push({ name: 'campaign-list' })
```

**File path:**

```text
Step 2: el-upload stages fileData → "Upload & Validate" button clicked:
  1. POST /campaign-api/initiate { ..., data_source: "file" }
     → { job_id, presigned_url }
  2. uploadStatus = 'uploading'
     PUT presigned_url (raw fetch, no auth; body: fileData; header: "x-amz-meta-app": "upload-service")
     On HTTP 2xx → uploadStatus = 'polling'; else 'error'
  3. setInterval(1000):
     GET /campaign-api/status/{job_id}?upload_type=message_campaign
     → { current_status, status_message }
     map: initiated=10% validating=50% file_validated=100%(done,clear) failed=error(clear)
Step 3: RecurrenceRulePicker
Preview → handleCreate:
  4. if recurrenceRule: PUT /campaign-api/schedule/{job_id} { recurrence_rule: rule }
  5. POST /campaign-api/trigger/{job_id}
  6. router.push({ name: 'campaign-list' })
```

File job_id is captured at Step 2 (matches CRM `handleFileChange → initiate()` at [CreateMessageCampaigns.vue:551-553](src/views/admin/pages/MessageCampaigns/CreateMessageCampaigns.vue#L551-L553)). Presigned upload uses a raw `fetch` with no `Authorization` header (S3 presigned URLs include their own signature).

### Edge cases

| Scenario | Handling |
| -------- | -------- |
| No templates for channel | `TemplateLibrary` empty state → "Create Template →" link |
| No countries loaded | `el-select` shows skeleton; `canAdvanceStep1` stays false |
| Segment count = 0 | Red text "0 records matched"; Next disabled |
| Presigned PUT fails | `uploadStatus='error'`; retry button re-calls `initiate` (fresh URL) |
| Poll returns `failed` | `uploadStatus='error'`; show `status_message` |
| Presigned URL expired mid-wizard | Trigger 4xx → "Re-upload" link resets `currentStep=1`, clears `jobId`/`fileData` |
| Past schedule date | `:disabled-date` prevents selection |
| Weekly with no days | `RecurrenceRulePicker` emits `valid=false`; submit disabled |
| Template create flow aborted | No query param on return; wizard stays on Step 1 with previous state |
| Campaign service not configured | Existing `isCampaignConfigured` alert already handles this |

### Verification (end-to-end)

1. Navigate to `http://localhost:5713/app/automations/campaigns/new`.
2. Step 1: leave description <100 chars, confirm Next disabled with inline error. Fill to 100+, select channel/country/template. Verify flag rendering in country select. Click "Create Template" → saves a new SMS template → confirm redirect back with template pre-selected.
3. Step 2 segmentation: build a segment, confirm count shown, Next disabled at 0.
4. Step 2 file: drop a CSV, click "Upload & Validate" — confirm network panel shows `POST /initiate` → `PUT <presigned>` → polling `GET /status/{job_id}` until 100%. Next enables only on `done`.
5. Step 3: test each schedule type. For weekly, confirm days-of-week selector appears.
6. "Preview & Launch" → dialog shows full summary including template content snippet → Confirm → network shows `PUT /schedule/{job_id}` (skipped if immediate) then `POST /trigger/{job_id}` → redirect to list.
7. Verify campaign visible in list with correct status.
8. Build check: `cd steward-fe && pnpm install && pnpm build` must pass with zero TS errors.
9. Lint check: `pnpm lint` must pass on modified files.

---

## Part H: Implementation ordering (end-to-end rollout)

The cross-service changes in Part G are the north-star; they need to land in an order that keeps each step shippable. Part F (Steward wizard) depends on the first two phases.

| Phase | Work | Owners | Exit criteria |
| ----- | ---- | ------ | ------------- |
| **H1. Dispatch contract** | G5: add `POST /v1/dispatch` to comm-svc. Keep existing endpoints working. Wire template-engine `POST /render` for resolution. | communication-service, template-engine | comm-svc accepts unified dispatch; existing flows untouched. |
| **H2. Content Template EMAIL channel** | G1: migration + add EMAIL to `comm_channel` enum in comm-svc. ETB saves mirror into content-templates as pointers. Frontend picker lists EMAIL templates from content-templates. | communication-service, ETB backend, both frontends | Creating an email template in ETB appears in Steward/CRM content-templates picker. |
| **H3. message_campaign_service EMAIL path** | G2: service routes `channel=EMAIL` through ETB Listmonk. Lists built from segmentation. | message_campaign_service, ETB, data-segments-api | `POST /campaign/initiate` with EMAIL + segmentation creates a live Listmonk campaign. |
| **H4. Workflow activities via comm-svc dispatch** | G3: workflow-engine replaces per-channel endpoints with one comm-svc dispatch; fetches templates from content-templates. | bfree-temporal-workflow-engine | SendEmail/SendSMS/SendVMS activities all flow through `POST /v1/dispatch`. |
| **H5. Steward campaign wizard (Part F)** | Rewrite CampaignCreateView per Part F, using unified API. EMAIL now works in the same wizard. | steward-fe | Full Steward parity with CRM; EMAIL end-to-end via ETB-Listmonk under the hood. |
| **H6. CRM wizard refactor** | CRM `CreateMessageCampaigns.vue` switches email campaigns to use unified `/campaign/initiate` instead of ETB direct. Deprecate ETB campaigns UI. | crm-fe, ETB frontend | Both frontends use one campaign API for every channel. |
| **H7. Segmentation service for workflows** | G4: workflow-engine pulls audience via data-segments-api `POST /fetch` (paginated). Retire any local customer queries. | bfree-temporal-workflow-engine, data-segments-api | Workflows use same segmentation as campaigns; zero duplicated query logic. |
| **H8. ETB campaigns UI retired** | Remove `CampaignListView`, `CampaignDetailView`, `campaignApi.ts` from ETB frontend. ETB retains template CRUD + bounce admin. | ETB frontend | ETB is the email *editor*, not a campaign tool. |

### Critical files per phase

**H1** (`communication-service`):

- `cmd/api/main.go` register new route
- `cmd/api/dispatch.go` (new) handler
- `internal/communication/dispatch_service.go` (new) channel-router + template-engine client
- `internal/templateengine/client.go` (new) HTTP client

**H2** (`communication-service`, `ETB`):

- `communication-service/internal/repo/content_template.repository.go` — add EMAIL to enum + `etb_template_id`, `subject` columns
- `communication-service/scripts/migrations/000XX_add_email_content_template.sql`
- `communication-service/scripts/migrations/backfill_email_content_templates.go`
- `Email-Template-Builder/backend/internal/service/email_template_service.go` — post-save webhook/mirror write
- `crm-fe/src/views/admin/pages/ContentTemplates/*` — include EMAIL in channel filter
- `steward-fe/src/features/ContentTemplates/view/*` — same
- `steward-fe/src/shared/components/TemplateLibrary.vue` (new) — channel-aware picker (also covered under Part F)

**H3** (`message_campaign_service`):

- `pkg/apis/etb.go` (new) ETB Listmonk client
- `pkg/services/email_campaign.service.go` (new) EMAIL-channel handler
- `pkg/services/message_campaign.service.go` branches on channel
- `pkg/apis/segmentation.go` — add `FetchCustomers(query, page)` method returning emails for list building

**H4** (`bfree-temporal-workflow-engine`):

- `internal/services/messaging_service.go` replace per-channel endpoints with single comm-svc client
- `internal/services/content_template_service.go` (new) for template resolution
- `internal/activities/messaging/send_email_activity.go` et al.
- `configs/config.yaml` collapse services.{sms,email,vms,chatbot} into services.communication

**H5** (`steward-fe`):

- See Part F file list

**H6** (`crm-fe`):

- `src/views/admin/pages/MessageCampaigns/CreateMessageCampaigns.vue` — EMAIL channel uses same `/campaign/initiate`; remove ETB-specific branching
- `src/composables/useCampaignService.js` unified
- Deprecate `src/views/email-builder/**` campaign routes

**H7** (`bfree-temporal-workflow-engine`, `data-segments-api`):

- `bfree-temporal-workflow-engine/internal/services/audience_service.go` (new)
- `data-segments-api/app/main.py` — add `POST /fetch` with cursor pagination

**H8** (`Email-Template-Builder/frontend`):

- Delete `src/views/CampaignListView.vue`, `CampaignDetailView.vue`, `CampaignCreateView.vue`, `campaignApi.ts`, `listmonkCampaignStore.ts`
- Update `src/router.ts` to remove campaign routes
- Keep: email-templates CRUD, bounces, settings, subscribers, lists

### Verification across phases

- **H1**: `curl -X POST localhost:8081/v1/dispatch -d '{"channel":"SMS",...}'` returns 202 with dispatch_id; legacy endpoints still green.
- **H2**: Create template in ETB; `GET /content-templates?comm_channel=EMAIL` shows it within 2s.
- **H3**: `POST /campaign-api/initiate` with EMAIL → Listmonk UI (port 9000) shows new campaign with subscribers from segmentation.
- **H4**: In Temporal UI (port 8233), trigger an email workflow; activity logs show comm-svc dispatch POST.
- **H5 + H6**: End-to-end from Steward-FE/CRM-FE: create EMAIL campaign, verify email arrives at mailpit (port 8025) with placeholders resolved.
- **H7**: Workflow with segmentation step processes customers in pages; logs show `POST /fetch` calls with cursor.
- **H8**: ETB frontend has no campaigns tab; email templates still editable.

---

## Part I: Template governance — type, channel, provider, source, org scope

### Current fragmentation

Content Templates (comm-svc `content_templates` table) today have these loose axes:

- `comm_channel` enum: `SMS | VMS | CHAT | IVR | CALL_BOT` (EMAIL pending from G1)
- `source` enum: `Agent | WorkFlow | Campaign | System` (actually inconsistent — CRM filter values `sources=Campaign` or `sources=WorkFlow`; ETB uses different source labels)
- `template_type` — free-text field today, used for grouping (e.g., "welcome", "otp", "reminder"). No catalogue.
- `organization_id` — scopes to org; platform-owned uses `organization_id = PLATFORM_ORG_ID (74015d89-...)`.
- No provider dimension — but some templates are provider-specific (e.g., SendGrid dynamic templates require a SendGrid template id, Twilio has content-template-sid, Infobip has its own template id).

### Goals

1. **Unified template identity**: one `content_templates` row per template regardless of channel; columns for provider-specific identifiers in a `provider_bindings` JSONB.
2. **Canonical template types**: replace free-text `template_type` with a controlled `template_types` table (seeded + org-extensible), so UIs can offer categories/tags.
3. **Explicit source enum** aligned across comm-svc, ETB, workflow-engine, message_campaign_service.
4. **Org scoping + platform defaults**: a platform-owned template is visible to all orgs; an org-owned template is private to that org. "Paid" bucket (from H1 feedback) means platform-distributed templates that an org can opt-into (subscribe/clone).
5. **Stale cleanup**: migrate or drop any channel/source/type value not in the canonical list.

### I1: Canonical enums & types catalogue

- **Channels (final)**: `SMS | EMAIL | VMS | CALL_BOT | CHAT | IVR` — IVR and CHAT stay; drop anything else. Retire any legacy value via migration `UPDATE content_templates SET comm_channel='...' WHERE comm_channel IN ('...',...);`.
- **Sources (final)**: `AGENT | WORKFLOW | CAMPAIGN | SYSTEM | TRANSACTIONAL`. Uppercase everywhere. Transactional = OTP/receipts/etc. (auth-service + subscription-service use these).
- **Template types**: new table `template_types (id, name, slug, channels text[], description, org_id NULL, deleted_at)`. Seed with `welcome, otp, receipt, reminder, marketing, newsletter, survey, escalation, follow_up, closing, broadcast, birthday, anniversary, collection, promotion`. Org-custom types allowed with `org_id != NULL`.
- Add `content_templates.template_type_id` FK. Migration backfills by matching legacy free-text to closest seeded slug; anything unknown becomes `template_type_id = NULL` with a flag for manual review.

### I2: Provider bindings

- Add `content_templates.provider_bindings JSONB` shape:

  ```json
  {
    "sendgrid": {"template_id": "d-abc...", "version_id": "v-..."},
    "twilio_content": {"sid": "HX..."},
    "infobip_whatsapp": {"template_name": "welcome_en", "namespace": "..."}
  }
  ```

- Frontend shows a "Provider bindings" tab on templates when the channel has provider-specific templating (e.g., WhatsApp templates must be pre-approved by Meta/Infobip).
- Dispatch flow: comm-svc checks if the target provider has a binding for this template; if so uses the provider's native template API (Twilio Content, Infobip WhatsApp templates, SendGrid dynamic templates). Else falls back to placeholder rendering via template-engine.

### I3: Paid vs org-owned template library

- Add `content_templates.visibility` enum: `PRIVATE | ORG | MARKETPLACE`. Default PRIVATE (draft). ORG = visible across that org. MARKETPLACE = platform-distributed ("paid") available to orgs via subscribe.
- New table `org_template_subscriptions (org_id, template_id, subscribed_at)`. Steward lists MARKETPLACE templates + `Subscribe` button. On subscribe, clone template into org's namespace (new row with `org_id=<org>`, `parent_template_id=<marketplace_id>`). Future edits diverge.
- Admin-domain users can publish templates to MARKETPLACE (permission: `publish_template_marketplace`). Platform-org root only.

### I4: Stale cleanup migrations (comm-svc)

- `migrations/000XX_normalise_template_channels.sql` — `UPDATE` bad channel values; drop rows where channel is obsolete and never dispatched.
- `migrations/000XX_seed_template_types.sql` — create `template_types` table, seed, backfill `template_type_id`.
- `migrations/000XX_add_template_provider_bindings.sql` — add `provider_bindings JSONB DEFAULT '{}'`, `visibility`, `parent_template_id`.
- `migrations/000XX_create_org_template_subscriptions.sql`.
- `scripts/migrations/cleanup_orphan_templates.go` — dry-run + apply mode; deletes templates with `deleted_at != NULL` older than 90d, and marks templates with missing parent.

### I5: Backend API shape

- `GET /content-templates` query params: `comm_channel`, `source`, `template_type_id`, `visibility`, `org_scope` (`own | platform | subscribed | all`), `active`, `q` (search), pagination.
- `POST /content-templates` + `PUT /:id` accept `provider_bindings` map.
- `POST /content-templates/:id/subscribe` (org subscribe to marketplace template).
- `POST /content-templates/:id/publish` (marketplace publish, platform-root only).
- `GET /template-types` + `POST /template-types` (org-custom types).
- `DELETE /template-types/:id` (soft delete; forbidden if any active template references it).

### I6: Frontend (CRM + Steward) template library changes

- Filter bar: `Channel | Source | Template Type | Visibility | Active`. All `el-select` with "All" option.
- Tabs at the top: `My Templates | Platform | Subscribed`.
- Per-row: visibility badge, provider-binding icons (Twilio/SendGrid/Infobip chips), source tag.
- "Create Template" button dropdown with channel options; EMAIL opens ETB editor (see G1), others open inline form.
- "Duplicate", "Publish to Marketplace" (platform-root only), "Subscribe" (on Marketplace tab), "Archive" actions.

---

## Part J: Per-channel, per-provider, per-source campaign flows

A single `POST /campaign/initiate` is the entry point, but execution branches by (channel × provider × source):

### J1: Channel × Provider matrix

| Channel | Providers | Template strategy | Dispatch path |
| ------- | --------- | ----------------- | ------------- |
| **SMS** | Africa's Talking, Bandwidth, Bird, Dotgo, Infobip, Plivo, Sinch, Termii, Twilio, Vonage, Kannel/SMPP (self-hosted) | Free-text; template-engine placeholder render | comm-svc → provider API / Kannel SMPP |
| **EMAIL** | AWS SES, SendGrid (dynamic templates), Sinch Email, Bird Email, Listmonk (bulk via SES/SendGrid backing) | SendGrid = provider binding (template id + variables); Sinch / Bird have their own template binding APIs; SES = full HTML render via ETB + template-engine; Listmonk wraps SES/SendGrid for bulk-list campaigns | msg-campaign → ETB Listmonk (bulk) OR comm-svc direct (low-volume transactional) |
| **VMS** | Infobip `/tts/3/advanced`, Plivo, Twilio Voice (inline TwiML or URL), Vonage | TTS = template-engine placeholder render; TwiML = ETB-style editor for Twilio | comm-svc → provider API with `notifyUrl` |
| **CALL_BOT** | Twilio Programmable Voice (TwiML flow) | Custom script JSON (see Part C) → renders to TwiML per step | comm-svc TwiML handlers |
| **CHAT / WhatsApp** | Bird WA, Plivo WA, Sinch WA, Twilio WA, Vonage WA, Infobip WA | Template binding required (pre-approved by Meta); placeholder variables only | comm-svc → provider WA API |
| **IVR** | Xcally IVR campaigns | Script hosted on Xcally; comm-svc creates Xcally campaign | Xcally REST |
| **CC (Agent Queue)** | Xcally live agents | Contact list + queue assignment | Xcally REST (Part B) |

### J2: Source-specific flow variants

- `CAMPAIGN` source (bulk): `initiate → schedule → trigger`. For EMAIL, always go Listmonk. For SMS/VMS >10k, use workflow-engine batching (Part G/H4). For <10k, direct comm-svc dispatch.
- `WORKFLOW` source: workflow-engine drives per-customer dispatch. Uses same template id but fetches one-at-a-time via `POST /v1/dispatch` with `recipients: [single]`.
- `AGENT` source: agent-initiated send (e.g., click-to-call, one-off SMS). Bypasses campaign job; direct comm-svc dispatch with `source=AGENT`.
- `SYSTEM` source: auth-service triggers (OTP, welcome email, password reset). Cannot be scheduled. Bypasses rate limits (or has higher priority weight).
- `TRANSACTIONAL`: subscription renewal, receipts. Similar to SYSTEM but billed differently.

### J3: Rate-limit weights per source

Already partially implemented (memory: Agent=2, Workflow=3, Campaign=5). Formalise in comm-svc config:

```yaml
rate_limit:
  weights:
    system: 1
    transactional: 2
    agent: 2
    workflow: 3
    campaign: 5
  per_org_tps: 50
  per_provider_tps: varies
```

### J4: Provider capability matrix

- `providers` table adds `capabilities JSONB` listing supported channels, max TPS, requires_template_binding, supports_notify_url, supports_scheduling.
- Campaign initiate validates: chosen template channel must be supported by at least one active provider in the org/country, and if provider requires binding the template must have one for that provider.
- UI surfaces incompatibilities: "This template has no SendGrid binding; the email will fall back to SES." or error "This WhatsApp template isn't approved on any active provider."

---

## Part K: Workflow builder on Steward-FE

CRM has a workflow builder; Steward doesn't yet. Must replicate with Element Plus.

### K1: Structure

- New feature module `steward-fe/src/features/Workflows/`:
  - `route/index.ts` — `/app/automations/workflows`, `/new`, `/:id/edit`, `/:id/executions`.
  - `view/WorkflowListView.vue` (exists).
  - `view/WorkflowBuilderView.vue` (new full editor).
  - `view/WorkflowExecutionView.vue` (exists, expand).
  - `components/NodePalette.vue` — draggable action types.
  - `components/WorkflowCanvas.vue` — Vue Flow or custom SVG DAG.
  - `components/NodeConfigDrawer.vue` — right-side drawer for selected node config.
  - `components/ConditionBuilder.vue` — uses workflow-engine `/conditions/fields` + `/operators`.

### K2: Node types (action palette)

From workflow-engine `activity_names.go`:

- Messaging: **SendSMS**, **SendEmail**, **SendVMS**, **SendChat** (WhatsApp), **SendCallBot**
- Call Center: **TransferToCallCenter** (Xcally queue / IVR), **TransferToCallBot** (Twilio)
- Control: **Delay**, **Condition** (branches based on customer field or previous step result), **Wait For Event** (webhook), **End**
- Integration: **HTTP Request**, **Update Customer Attribute**, **Create Task** (agent), **Schedule Callback**

Each node has a required `template_id` (for messaging), a `delay_config`, or a `condition_config`. Drawer shows the right form based on node type.

### K3: Template selection in workflow context

- Node drawer's "Template" field is a `TemplateLibrary` reuse (from Part F) filtered by channel and `source=WORKFLOW`.
- Workflow references template by id; on run, workflow-engine resolves via comm-svc `GET /content-templates/:id` (Part G3).

### K4: Dependencies & validation

- Dependencies: every non-Start node must have ≥1 incoming edge; every non-End node must have ≥1 outgoing edge. Condition nodes must have 2+ outgoing edges labelled per branch.
- Builder validates on save: shows `el-alert` listing issues ("SendSMS node 'step-3' has no template selected", "Condition node 'branch-1' has unreachable Else branch").
- Cycles allowed (loop-back) only via explicit "Retry" action.

### K5: Design & flow states

- Draft → Review → Published. Published workflows are executable; edits create a new `version_id`.
- Edit drawer shows "Published version N" warning; saving creates version N+1 (draft) until published.
- Executions attach to specific version.

### K6: Steward UI additions

- Workflows list with status, last run, execution count, next scheduled run.
- Workflow detail: executions tab, configuration tab (read-only published), edit button (goes to builder).
- Execution detail: journey timeline per customer (from workflow-engine `/executions/{id}/journeys`).
- Templates dropdown on every node drawer.

---

## Part L: CRM + Steward UI gaps (screens, modals, forms)

Missing elements surfaced across admin/CRM flows:

### L1: CRM-FE gaps

- **Provider setup wizard** — multi-step for adding a new provider with credential validation (ping test). Today it's a flat form.
- **Campaign re-use modal** — "Use as template" from a past campaign list row (currently buried).
- **Bulk actions on Subscribers** in ETB — select multiple, apply tag, remove from list.
- **Template preview dynamic variables form** — input box per placeholder to test render, missing on some preview modals.
- **Organization country management** — currently one modal, needs tabs (active countries, rates, provider mapping).
- **Toast on async job completion** — e.g., campaign file upload validated; currently silent until you refresh.
- **Permission denied modal** — today shows a generic 401 toast; should show which permission is missing + request-access button.
- **Workflow run dry-run preview** — estimate send counts + cost before executing.
- **Content template archive recovery** modal — view archived + restore.

### L2: Steward-FE gaps

Everything in L1 plus the Steward-only items:

- **Campaigns list filters** — status, channel, source, date range filters missing.
- **Workflows module** (full, per Part K).
- **Content Templates library** — marketplace tab, subscribe modal.
- **Organization overview** detail page with member list, provider inventory, quota usage.
- **User invite modal** with role + country assignment + welcome email preview.
- **Country settings tabs** (same as CRM L1).
- **Provider credentials bulk swap** modal (primary↔secondary across country).
- **Maintenance banner** (system-wide notice from settings).
- **Dynamic form engine** — currently every form is hand-coded; a shared `DynamicForm.vue` that takes a schema (from auth-service `/form-schemas/:name`) produces el-form with validation. Used by Content Templates (channel-specific fields), Provider creation (provider-specific fields), Workflow node drawers (node-type-specific fields).

### L3: Shared components to build

- `steward-fe/src/shared/components/DynamicForm.vue` — schema-driven form.
- `steward-fe/src/shared/components/DataTable.vue` — filter + paginate + bulk actions wrapper.
- `steward-fe/src/shared/components/Toasts.ts` — consistent success/error/async-progress.
- `steward-fe/src/shared/components/ConfirmDialog.vue` — uniform confirm modal.
- `steward-fe/src/shared/components/PermissionDeniedDialog.vue` — explains missing permission.
- `steward-fe/src/shared/components/RecurrenceRulePicker.vue` — already planned (Part F).
- `steward-fe/src/shared/components/QueryBuilder/SegmentationBuilder.vue` — exists, extend with save-as-segment feature.

CRM-FE equivalents live at `crm-fe/src/components/` — add parallel components there for any new functionality, using Vuetify equivalents.

---

## Part M: Permissions, migrations, backfills

### M1: Permissions to add (auth-service `permissions_v2`)

From the new functionality:

- `publish_template_marketplace` — marketplace publisher (platform-root only)
- `subscribe_template` — org admin
- `manage_template_types` — org admin
- `view_marketplace_templates` — all users
- `create_workflow_version` — workflow editor
- `publish_workflow` — workflow owner/admin
- `run_workflow_dry_run` — workflow editor
- `view_workflow_executions` — viewer+
- `view_dispatch_reports` (exists, verify wiring)
- `manage_provider_capabilities` — admin
- `bulk_manage_subscribers` — email admin
- `view_agent_audit` — admin (agent action log)
- `export_campaign_results` — campaign viewer

Migration pattern follows `auth-service/migrations/000017_add_campaign_workflow_permissions.up.sql` — extend with role grants to both `crm` admin/root and `admin` root domains.

### M2: Data migrations

Collected across all Parts:

- Part G1: backfill ETB email-templates → content-templates (Go script).
- Part I1: normalise channel/source enums, create `template_types` table + seed, backfill `template_type_id`.
- Part I2: add `provider_bindings`, `visibility`, `parent_template_id` columns.
- Part I3: create `org_template_subscriptions`.
- Part I4: cleanup orphan templates.
- Part J4: add `providers.capabilities`.
- Part K: new tables `workflow_versions (workflow_id, version, dsl JSONB, published_at)`, `workflow_executions` (expand existing with `version_id`).
- Part L3 / DynamicForm: new table `form_schemas (name, schema JSONB, version)`.

### M3: Data backfills

- Existing templates → canonical template_type (slug match or NULL).
- Existing campaigns `segmentation_data` already stored — no backfill; but add index on `segmentation_data->'organization_id'`.
- Existing workflows migrated into `workflow_versions` as v1 published.
- Existing provider rows → compute `capabilities` from type (SMS provider → `{sms: true, tps: default}`) and allow admin edit later.

---

## Part N: Edge cases & use cases by service

### N1: auth-service

- User with role in multiple domains (CRM admin AND platform root) — permission union, not intersection. Add test.
- Token refresh during long-running actions — current flow refreshes 2min before expiry; verify across 30-minute campaign wizards.
- Org deactivation — mid-campaign. Should pause running campaigns (emit event to message_campaign_service).
- Country ACLs — user restricted to NG only must not see KE campaigns. Enforce in every list query.

### N2: template-engine

- Placeholder missing from variables → render `{{name}}` literal vs fail vs empty. Choose fail-fast with clear error.
- Nested/loop placeholders (Handlebars-style `{{#each items}}`) — support or reject? Decide + document.
- HTML escaping for email vs raw for SMS — channel-aware render mode.
- Rich SendGrid dynamic template vs plain template — render_mode = `passthrough` vs `inline`.
- Preview with long text — UI truncation at 500 chars with "show full" expand.
- Multi-language templates — `template_translations` table (future, not in this plan).

### N3: ETB

- Listmonk downtime — queue Listmonk API calls and retry; campaign stays `pending` until Listmonk up.
- Subscriber de-duplication across lists — unique on email address globally in Listmonk.
- Bounce categorisation — hard vs soft; auto-suppress hard-bounce addresses from future sends.
- Unsubscribe links — global unsubscribe list; Listmonk's `?token=` must be in every email.
- SPF/DKIM/DMARC checks per sending domain — add a diagnostic tool screen.
- Postbacks from Listmonk → ETB postback_handler → Kafka `comms-events`. Verify end-to-end.

### N4: communication-service

- Provider failover — primary fails, cascade to secondary (already implemented in Part A/B refactor); extend to all channels.
- Rate limit backpressure — when 429 from provider, queue with exponential backoff; never drop.
- Webhook signature verification — enforce in prod, allow bypass only in local/dev (see memory).
- Number portability — phone validation against country-specific rules (mobile-number-statuses service).
- Content compliance — block messages containing prohibited keywords per org config (new `compliance_rules` table).
- Idempotency keys — every dispatch call includes one; comm-svc dedupes within 24h.

### N5: bfree-temporal-workflow-engine

- Worker restart mid-execution — Temporal handles via continue-as-new; verify with 100k-customer workflow.
- Long-running workflow (>7 days) — history size cap; use continue-as-new every 1000 events.
- Schedule overlap — if a daily schedule's previous run hasn't completed, skip or queue? Choose skip-with-alert.
- Retry policy per activity — default 3 retries with exponential backoff; overridable in node config.
- Dead-letter queue — failed activities after max retries go to `workflow_dead_letters` table.
- Circuit-breaker — if >50% of messaging activities fail in 5 min, pause workflow and alert.

### N6: message_campaign_service

- Campaign edit after trigger — allowed only for scheduled/paused campaigns; blocked for running/completed.
- Segmentation returns 0 on trigger — cancel campaign, mark `failed`, notify user.
- Duplicate file upload — detect by SHA256 hash; reject with "this file was already used in campaign X".
- Partial upload success — some rows fail validation; report per-row errors before commit.
- Campaign replay — `POST /campaign/:id/replay` creates new job with same config.
- Concurrent schedule edits — optimistic lock via `updated_at`.

### N7: data-segments-api

- Segment query performance — index on `customers.organization_id`, `customers.country_id`, common filter columns. Add slow-query log.
- Query complexity limit — reject queries with >10 AND/OR levels (protects DB).
- Cached segment results — cache `num_rows` for 60s per query hash; full result never cached (PII).
- Custom SQL scripts — `/sql-scripts` in S3; permission `execute_custom_segment` required.

### N8: Cross-cutting audit log

- Add `audit_logs` events for every: template create/edit/publish/subscribe, campaign initiate/trigger/pause, workflow publish/execute, provider change, user permission change.
- Stream to Kafka → ClickHouse for analytics (3yr retention per memory).
- UI: `/app/admin/audit` page with filters by actor, resource, action, date.

---

## Summary of scope (all Parts)

| Part | Area | Status in this plan |
| ---- | ---- | ------------------- |
| A | VMS provider fixes | Detailed |
| B | Xcally bug fixes | Detailed |
| C | Twilio Call Bot | Detailed |
| D-E | Initial frontend campaigns/workflows | Baseline (pre-existing) |
| F | Steward CampaignCreateView parity with CRM | Detailed |
| G | Unified architecture (templates/campaigns/workflows/segmentation/dispatch/rendering) | Detailed |
| H | Implementation ordering across services | Detailed |
| I | Template governance (channels/types/providers/visibility/marketplace) | Detailed |
| J | Per-channel × provider × source flow variants | Detailed |
| K | Steward workflow builder | Detailed |
| L | CRM + Steward UI screen/modal/form gaps | Detailed |
| M | Permissions, migrations, backfills | Detailed |
| N | Edge cases & use cases per service | Detailed |
| O | Validation rules catalogue (per endpoint) | Detailed |
| P | Error code catalogue (namespaced) | Detailed |
| Q | Idempotency, audit, observability | Detailed |
| R | Specific 35-gap punch list from deep-dive | Detailed |
| S | Test coverage plan | Detailed |
| T | Phased delivery + rollback | Detailed |

---

## Part O: Validation rules catalogue

Every mutating endpoint gets explicit validation. Below is the canonical set; each service must implement these at its API boundary using Gin struct tags (Go) or Pydantic Field() (Python).

### O1: message_campaign_service

| Field | Rule | Error |
| ----- | ---- | ----- |
| `campaign_name` | required, 1–100 chars, unique per org | `CAMP-010 NAME_CONFLICT` |
| `description` | required, 100–500 chars | `CAMP-011 DESCRIPTION_TOO_SHORT` |
| `channel` | required, one of SMS/EMAIL/VMS/CALL_BOT/CHAT/IVR | `CAMP-012 INVALID_CHANNEL` |
| `country_id` | required, uuid4, active for org | `CAMP-013 INVALID_COUNTRY` |
| `template_id` | required, uuid4, exists + same channel + belongs to org or PLATFORM_ORG | `CAMP-014 INVALID_TEMPLATE` |
| `data_source` | required, oneof segmentation/file | `CAMP-015 INVALID_DATA_SOURCE` |
| `segmentation_data` | required if segmentation, valid RuleGroup JSON | `CAMP-016 INVALID_SEGMENTATION` |
| `sheet_number` | optional, 1–20 | `CAMP-017 INVALID_SHEET_NUMBER` |
| `recurrence_rule.type` | oneof ONCE/DAILY/WEEKLY/MONTHLY | `CAMP-018 INVALID_RECURRENCE_TYPE` |
| `recurrence_rule.schedules[*].date` | future date, ≤1 year out | `CAMP-019 INVALID_SCHEDULE_DATE` |
| `recurrence_rule.schedules[*].time` | HH:MM format, 24h | `CAMP-020 INVALID_SCHEDULE_TIME` |
| `recurrence_rule.schedules[*].days_of_week` | weekly only, subset of MON..SUN, ≥1 | `CAMP-021 INVALID_DAYS_OF_WEEK` |
| `recurrence_rule.schedules[*].end_date` | optional, after start date | `CAMP-022 END_DATE_BEFORE_START` |

Cross-field rules:

- Campaign in status `completed|failed|running` cannot be edited → `CAMP-030 IMMUTABLE_STATUS`.
- Campaign in status `paused|stopped` cannot be triggered without resume first → `CAMP-031 MUST_RESUME_FIRST` (fixes gap G-13).
- File uploads >50MB rejected → `CAMP-032 FILE_TOO_LARGE`.
- Segmentation with 0 rows rejected → `CAMP-033 EMPTY_SEGMENT`.

### O2: bfree-temporal-workflow-engine

| Field | Rule | Error |
| ----- | ---- | ----- |
| `name` | required, 1–255 | `WF-010 INVALID_NAME` |
| `description` | optional, ≤1000 | `WF-011 DESCRIPTION_TOO_LONG` |
| `country_id` | required, uuid4 | `WF-012 INVALID_COUNTRY` |
| `workflow_sequence` | required, non-empty array | `WF-013 EMPTY_SEQUENCE` |
| `workflow_sequence[*].step` | unique within sequence, ≥1 | `WF-014 DUPLICATE_STEP` |
| `workflow_sequence[*].type` | oneof action/condition/wait/sub_workflow | `WF-015 INVALID_STEP_TYPE` |
| `workflow_sequence[*].next_step` | exists in sequence or null if `end` | `WF-016 DANGLING_NEXT_STEP` |
| `config.action.message_template_id` | required for SEND_* action types (fixes gap G-01) | `WF-017 TEMPLATE_REQUIRED` |
| `config.action.action_type` | oneof SEND_SMS/SEND_EMAIL/SEND_VMS/SEND_CHATBOT/TRANSFER_TO_CALL_CENTER | `WF-018 INVALID_ACTION_TYPE` |
| `config.condition.rules[*].operator` | must include `contains`/`not_contains` (fixes gap G-02) | `WF-019 INVALID_OPERATOR` |
| `config.wait.duration.value` | 1–525600 minutes (≤1 year) (fixes gap G-34) | `WF-020 DURATION_TOO_LONG` |
| `config.wait.schedule.datetime` | RFC3339, future, ≤5 years out (fixes gap G-35) | `WF-021 INVALID_SCHEDULE_DATETIME` |
| `segmentation_query` | required, valid RuleGroup | `WF-022 INVALID_SEGMENTATION` |
| `recurrence_rule` | required at publish time (fixes gap G-03 struct tag bug) | `WF-023 RECURRENCE_REQUIRED` |

Cross-field rules:

- Graph validation: every non-start node has ≥1 incoming edge → `WF-030 ORPHAN_NODE`.
- Every condition node has ≥2 labelled branches → `WF-031 CONDITION_MISSING_BRANCH`.
- Start execution verifies caller `organization_id == template.organization_id` (fixes gap G-04) → `WF-032 CROSS_ORG_TEMPLATE_ACCESS`.

### O3: data-segments-api

| Field | Rule | Error |
| ----- | ---- | ----- |
| `segment_type` (path) | regex `^[a-z_][a-z0-9_]{0,63}$` (fixes gap G-11) | `SEG-010 INVALID_SEGMENT_NAME` |
| `filters.group[*].query.table` | must be in schema allowlist | `SEG-011 UNKNOWN_TABLE` |
| `filters.group[*].query.column` | must exist on table | `SEG-012 UNKNOWN_COLUMN` |
| `filters.group[*].query.value` | parameterized binding, no f-string (fixes gap G-07) | `SEG-013 INVALID_VALUE` |
| `limit_offset.limit` | 1–10000 (fixes gap G-08) | `SEG-014 LIMIT_OUT_OF_RANGE` |
| `GET /get_data?page_size` | 1–10000 (fixes gap G-09) | `SEG-015 PAGE_SIZE_OUT_OF_RANGE` |
| Depth of group nesting | ≤5 | `SEG-016 GROUP_NESTING_TOO_DEEP` |
| Total operators per query | ≤50 | `SEG-017 QUERY_TOO_COMPLEX` |
| Query timeout | 30s server-side | `SEG-018 QUERY_TIMEOUT` |
| `POST /build/query` | require auth + allowlist S3 prefix (fixes gap G-06) | `SEG-019 FORBIDDEN_SQL_PATH` |

### O4: communication-service `POST /v1/dispatch`

| Field | Rule | Error |
| ----- | ---- | ----- |
| `Idempotency-Key` header | required, uuid4 | `COMM-010 MISSING_IDEMPOTENCY_KEY` |
| `channel` | oneof SMS/EMAIL/VMS/CALL_BOT/CHAT | `COMM-011 INVALID_CHANNEL` |
| `source` | oneof AGENT/WORKFLOW/CAMPAIGN/SYSTEM/TRANSACTIONAL (fixes gap G-29) | `COMM-012 INVALID_SOURCE` |
| `organization_id` | uuid4 | `COMM-013 INVALID_ORG` |
| `country_id` | uuid4, active for org | `COMM-014 INVALID_COUNTRY` |
| `template_id` | uuid4, resolvable | `COMM-015 INVALID_TEMPLATE` |
| `recipients` | 1–1000 items | `COMM-016 INVALID_RECIPIENT_COUNT` |
| `recipients[*].customer_id` | uuid4 | `COMM-017 INVALID_CUSTOMER_ID` |
| `recipients[*].to` | channel-validated (phone for SMS/VMS, email for EMAIL) | `COMM-018 INVALID_RECIPIENT_ADDRESS` |
| `dispatch_id` | uuid4, unique per 24h | `COMM-019 DUPLICATE_DISPATCH` |

### O5: content_templates CRUD (comm-svc)

| Field | Rule | Error |
| ----- | ---- | ----- |
| `name` | required, 1–255, unique per (org, channel) | `CT-010 NAME_CONFLICT` |
| `comm_channel` | SMS/EMAIL/VMS/CALL_BOT/CHAT/IVR | `CT-011 INVALID_CHANNEL` |
| `source` | AGENT/WORKFLOW/CAMPAIGN/SYSTEM/TRANSACTIONAL | `CT-012 INVALID_SOURCE` |
| `template_type_id` | uuid4, active, channel-compatible | `CT-013 INVALID_TYPE` |
| `body` | required except EMAIL, ≤64KB | `CT-014 BODY_TOO_LARGE` |
| `visibility` | PRIVATE/ORG/MARKETPLACE | `CT-015 INVALID_VISIBILITY` |
| `provider_bindings` | valid JSON matching per-provider schemas | `CT-016 INVALID_PROVIDER_BINDING` |
| Publish to MARKETPLACE | requires `publish_template_marketplace` permission | `CT-017 PERMISSION_DENIED` |
| Subscribe | creates clone only if not already subscribed | `CT-018 ALREADY_SUBSCRIBED` |

### O6: auth-service `validate`

Already works; add:

- `domain` parameter validated against user's roles → `AUTH-010 DOMAIN_NOT_ALLOWED`.
- Token expiry ≥ now → `AUTH-011 TOKEN_EXPIRED`.
- Organization active → `AUTH-012 ORG_DEACTIVATED`.

### O7: ETB

Existing validators preserved; add:

- `template_type_id` must match seed → `ETB-010 INVALID_TEMPLATE_TYPE`.
- `html_body` ≤256KB (Listmonk limit) → `ETB-011 BODY_TOO_LARGE`.
- `placeholders` must be extractable from body → `ETB-012 PLACEHOLDER_EXTRACTION_FAILED`.
- Unsubscribe header required for MARKETING source → `ETB-013 MISSING_UNSUBSCRIBE`.

---

## Part P: Error code catalogue (namespaced)

All services return errors as:

```json
{
  "error_code": "WF-017",
  "message": "message_template_id is required for SEND_SMS action",
  "details": { "step_number": 2, "action_type": "SEND_SMS" },
  "correlation_id": "uuid",
  "timestamp": "2026-04-15T12:00:00Z"
}
```

HTTP status mapping:

| Code family | HTTP status | Semantic |
| ----------- | ----------- | -------- |
| *-010..019 | 400 Bad Request | Malformed payload |
| *-020..029 | 422 Unprocessable | Semantic validation failure |
| *-030..039 | 409 Conflict | State conflict (duplicate, immutable) |
| *-040..049 | 403 Forbidden | Permission denied |
| *-050..059 | 404 Not Found | Resource missing |
| *-060..069 | 429 Too Many Requests | Rate limited |
| *-070..079 | 503 Service Unavailable | Circuit open / dependency down |
| *-090..099 | 500 Internal | Unexpected |

Namespaces:

| Prefix | Service |
| ------ | ------- |
| AUTH | auth-service |
| SET | setting-service |
| CAMP | message_campaign_service |
| WF | bfree-temporal-workflow-engine |
| SEG | data-segments-api |
| COMM | communication-service |
| CT | content_templates (within comm-svc) |
| ETB | Email-Template-Builder |
| TE | template-engine |
| LS | link-serve |
| MNS | mobile-number-statuses |

Fixes gap G-33 (duplicate error code values): each constant must have a unique string value matching its namespaced code.

---

## Part Q: Idempotency, audit log, observability

### Q1: Idempotency (fixes gap G-18)

Every mutating endpoint requires header `Idempotency-Key: <uuid>`. Server stores `(service, idempotency_key)` → `(status_code, response_body)` in Redis for 24h.

- Repeat within 24h returns the cached response.
- Request body hash must match — if the same key is used with a different body, return `409 IDEMPOTENCY_KEY_REUSE`.
- Implement as gin middleware in each Go service and FastAPI dependency in data-segments-api.
- Frontend automatically adds header in `createApiService` wrapper (generate v4 UUID per request).

### Q2: Audit log (fixes gap G-19)

New table per service (or shared `audit_logs` schema in comm-svc):

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID NOT NULL,
  actor_email TEXT,
  actor_org_id UUID,
  domain TEXT,
  payload_diff JSONB,
  ip_address INET,
  user_agent TEXT,
  correlation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_org ON audit_logs(actor_org_id, created_at DESC);
```

Stream mirror to Kafka `audit-events` → ClickHouse table `audit_events_ch` with 3-year retention, matching existing comms-event-architecture pattern from memory.

Admin UI: `/app/admin/audit` with filter by actor/entity/action/date + CSV export.

### Q3: Observability

Fixes gaps G-20 (no metrics), G-21 (no tracing):

- **OpenTelemetry** SDK wired in every Go service via common init function in `go-commons/pkg/observability`. Propagate traceparent header across HTTP calls and via SQS message attributes.
- **Prometheus metrics** on every Gin router (`gin-prometheus` middleware). Required gauges: in-flight requests; required histograms: request duration per route; required counters: errors per (service, error_code).
- **Sentry** wired in workflow-engine and message_campaign_service (copy from comm-svc).
- **Structured logging** — replace Python `print()` in data-segments-api with `structlog` (fixes gap in segmentation observability). All services emit logs with `correlation_id`, `organization_id`, `actor_id`.
- **Health/ready endpoints** — every service exposes `/health` (liveness) and `/ready` (dependencies reachable).

---

## Part R: 35-gap punch list (from deep-dive, prioritised)

Critical (must ship in Phase 1):

| Gap | File | Fix |
| --- | ---- | --- |
| G-01 | `bfree-temporal-workflow-engine/internal/dsl/validator.go:108` | Require `message_template_id` for SEND_* actions |
| G-04 | `bfree-temporal-workflow-engine/internal/api/handlers/execution_handler.go:52` | Verify `ctxUser.OrgID == template.OrgID` |
| G-05 | `bfree-temporal-workflow-engine/internal/api/router/router.go:90` | Add `RequirePermission` middleware per route |
| G-06 | `data-segments-api/app/main.py:143` | Require auth + S3 prefix allowlist |
| G-07 | `data-segments-api/app/models.py:101` | Parameterize values via psycopg placeholders |
| G-11 | `data-segments-api/app/main.py:27` | Add FastAPI `Depends(verify_jwt)` to all routes |

High:

| Gap | File | Fix |
| --- | ---- | --- |
| G-02 | `bfree-temporal-workflow-engine/internal/dsl/validator.go:183` | Add `OperatorContains`/`OperatorNotContains` to whitelist |
| G-03 | `bfree-temporal-workflow-engine/internal/api/dto/workflow_dto.go:15` | Fix struct tag: `json:"recurrence_rule" binding:"required"` |
| G-12 | `message_campaign_service/pkg/models/message_campaign_meta.model.go:35` | Add `WorkflowID string \`dynamodbav:"workflow_id"\`` |
| G-16 | `bfree-temporal-workflow-engine/internal/services/segmentation_service.go:26` | Wrap in `sony/gobreaker` + 10s timeout |
| G-17 | `message_campaign_service/pkg/apis/template_engine.go` | Same |
| G-18 | All mutating endpoints | Idempotency-Key middleware |
| G-19 | All services | Audit log writes |
| G-20 | `bfree-temporal-workflow-engine/internal/temporal/metrics.go:10` | Prometheus handler |
| G-24 | `bfree-temporal-workflow-engine/internal/activities/messaging/send_sms.go:66` | Use DispatchID as SQS message-deduplication-id |
| G-30 | `bfree-temporal-workflow-engine/internal/services/messaging_service.go` | Configure SQS DLQ via infra |

Medium:

| Gap | Fix |
| --- | --- |
| G-08, G-09 | Cap segmentation limits |
| G-10 | Add schema cache TTL |
| G-13 | Extend `CanTriggerMessageCampaign` to reject paused/stopped |
| G-14 | Unique constraint `(org_id, name)` on `campaigns` |
| G-15 | Remove dead enum constants |
| G-21 | OpenTelemetry |
| G-22 | History-size guard before ContinueAsNew |
| G-23 | WorkflowExecutionTimeout = 90 days |
| G-25, G-26 | Persist MessageLog lifecycle updates with proper context |
| G-27 | Rate-limit before SQS enqueue |
| G-28 | Per-provider TPS from DB config, not hardcoded 50 |
| G-31 | CatchupWindow = 24h |
| G-34, G-35 | Duration + future-date validation |

Low:

| Gap | Fix |
| --- | --- |
| G-29 | Reject unknown sources |
| G-32 | Task queue constants in config |
| G-33 | Deduplicate error code values |

---

## Part S: Test coverage plan

Target coverage per service:

| Service | Current | Target | Focus |
| ------- | ------- | ------ | ----- |
| bfree-temporal-workflow-engine | 0% | 70% | validator, DSL interpreter, activity executor, handlers |
| data-segments-api | 0% | 70% | query builder, SQL injection, pagination bounds, auth |
| message_campaign_service | 0% | 70% | service layer, state transitions, recurrence rules |
| communication-service | ~40% | 70% | dispatch path end-to-end, content template resolution |
| Email-Template-Builder | ~60% | 70% | ETB Listmonk sync, bounce handling, unsubscribe flow |
| template-engine | ~50% | 70% | render modes, placeholder extraction, cache invalidation |

New test files to create:

- `bfree-temporal-workflow-engine/internal/dsl/validator_test.go` — table-driven, covers all 35 validation rules
- `bfree-temporal-workflow-engine/internal/dsl/interpreter_test.go` — uses `testsuite.WorkflowTestSuite`
- `bfree-temporal-workflow-engine/internal/workflows/parent_execution_test.go` — continue-as-new, batching
- `bfree-temporal-workflow-engine/internal/api/handlers/*_test.go` — per handler
- `data-segments-api/app/tests/test_build_query.py` — SQL injection, parameterization, bounds
- `data-segments-api/app/tests/test_main.py` — all routes, auth, pagination
- `message_campaign_service/pkg/services/message_campaign_service_test.go` — state machine, recurrence
- `message_campaign_service/pkg/handlers/*_test.go` — per handler
- `communication-service/test/integration/dispatch_test.go` — full `POST /v1/dispatch` path against LocalStack
- `Email-Template-Builder/backend/internal/service/email_campaign_service_test.go` — Listmonk sync + failure paths
- `steward-fe/src/features/Campaigns/__tests__/CampaignCreateView.test.ts` — Vitest + @vue/test-utils
- `steward-fe/src/shared/components/__tests__/RecurrenceRulePicker.test.ts`
- `steward-fe/src/shared/components/__tests__/TemplateLibrary.test.ts`
- `crm-fe/tests/e2e/campaigns.spec.ts` — Playwright

Integration tests (Part A/B/C existing + new):

- End-to-end SMS campaign: create via Steward wizard → initiate → trigger → verify message arrives at Kannel mock.
- End-to-end EMAIL campaign: create via Steward → ETB-Listmonk delegation → mailpit receives rendered email with placeholders.
- Workflow execution: publish template with 3 steps (SMS → wait 60s → email) → trigger → Temporal-UI shows all 3 activities complete, mailpit + SMS mock both hit.
- Permission denied: CRM admin user tries to edit platform-owned template → 403 with `CT-017 PERMISSION_DENIED`.
- Idempotency: replay same `POST /initiate` with same Idempotency-Key → same response; different body → 409.
- Circuit breaker: simulate comm-svc down → workflow-engine circuit opens after 3 failures → returns `WF-070` until recovery.

---

## Part T: Phased delivery + rollback

Each phase must be independently shippable and reversible.

### Phase T1: Foundations (week 1-2)

- Idempotency middleware + Redis key namespace (Q1)
- Audit log table + writer (Q2)
- OpenTelemetry init in all Go services (Q3)
- Error code catalogue + consistent response shape
- Fix struct tag bug G-03, DSL validator gaps G-01, G-02
- Segmentation auth + SQL parameterization G-06, G-07, G-11
- Per-service unit test scaffolding

Feature flag: `ff_unified_errors` toggles between old error shape and new. Rollback: disable flag.

### Phase T2: Template governance (week 3-4)

- Migration: template_types, provider_bindings, visibility, parent_template_id
- Backfill content_template rows for ETB email_templates (migration job)
- ETB post-save webhook → comm-svc
- Frontend template library filters + tabs + subscribe/publish

Feature flag: `ff_marketplace_templates`. Rollback: hide Marketplace tab; migration columns remain.

### Phase T3: Unified dispatch (week 5-6)

- comm-svc `POST /v1/dispatch` alongside existing per-channel endpoints
- Workflow-engine activities switch to dispatch with flag
- Rate limiter moved before SQS enqueue (G-27)
- DLQ + message-dedup id fixes (G-24, G-30)

Feature flag: `ff_unified_dispatch`. Rollback: activities flip back to old queues.

### Phase T4: Campaign service EMAIL path + unified UX (week 7-8)

- message_campaign_service EMAIL branch (delegates to ETB Listmonk)
- ETB frontend retires its own campaign views
- Steward wizard handles all channels (Part F)
- CRM wizard switches to unified endpoint for EMAIL (Part H6)

Feature flag: `ff_email_via_campaign_service`. Rollback: email path goes back through ETB direct.

### Phase T5: Workflow builder on Steward (week 9-11)

- New feature module (Part K)
- DSL validator strict mode (all gap fixes)
- Audience fetch via data-segments-api `POST /fetch` (G/H7)

Feature flag: `ff_steward_workflows`. Rollback: hide workflows nav in Steward.

### Phase T6: Observability, polish, permissions (week 12)

- Prometheus metrics on all services
- Sentry wired everywhere
- New permissions from Part M1 granted
- Performance regressions verified
- Admin audit UI

Feature flag: `ff_observability_v2` for Prometheus scrape. Rollback: disable scrape endpoint.

### Rollback strategy

- Every migration has a tested `*.down.sql`.
- Every feature flag tested in both states in CI.
- Monitoring gate: phase only promotes to next when error rate <0.5% and p95 latency unchanged ±10% for 24h.

### Definition of Done

A phase is done only when:

- [ ] All gap fixes listed in the phase are merged.
- [ ] Unit test coverage ≥70% on touched files.
- [ ] Integration tests passing in CI.
- [ ] Manual E2E script (Part S) executed successfully in staging.
- [ ] Metrics + logs show expected signals in production.
- [ ] Rollback tested (disable flag → old path works).
- [ ] Docs updated: README, API reference, permissions matrix.
- [ ] Both CRM-FE and Steward-FE surfaces reflect the change with parity.

---

## Part U: Council Review — Architecture Division Findings

3 CRITICAL, 6 MAJOR, 5 MINOR identified.

### CRITICAL

- **C1**: `POST /v1/dispatch` must be async/SQS-first. The synchronous 3-hop (template resolve → render → provider API) caps at ~20 TPS under p99 latency. **Fix**: return 202 Accepted, enqueue to SQS, consumer does the work. Moves from Phase T3 to T1.
- **C2**: ETB has no circuit breaker in the dispatch critical path. ETB down = all EMAIL dispatch halted silently. **Fix**: add `sony/gobreaker` on ETB client in both message_campaign_service and comm-svc. Cache rendered HTML in Redis (5min TTL) for brief outage tolerance.
- **C3**: MARKETPLACE templates can leak body + `provider_bindings` across orgs. **Fix**: repository-level guard — body/bindings NULL in catalogue listings for unsubscribed orgs.

### MAJOR

- **M1**: `provider_bindings JSONB` should be a normalised `template_provider_bindings (template_id, provider_type, bindings JSONB)` table for queryable lookups.
- **M2**: PostgreSQL enum additions are irreversible. **Fix**: use `TEXT + CHECK` constraint instead of `CREATE TYPE ... AS ENUM` for `comm_channel`, `source`, `visibility`.
- **M3**: Listmonk single-instance with no HA plan. Compliance risk: unsubscribe links 503 when Listmonk down. **Fix**: document HA model; proxy unsubscribe through link-serve.
- **M4**: `audit_logs` unpartitioned. **Fix**: `PARTITION BY RANGE (created_at)` monthly, or ClickHouse-only (7-day PG hot window).
- **M5**: `POST /fetch` PII fan-out before auth gaps closed. **Fix**: require mTLS/service-token, enforce data minimisation (caller specifies fields).
- **M6**: No DR/backup/RPO/RTO plan for any data store. **Fix**: add Part U-DR section.

### MINOR

- **m1**: Prometheus incompatible with Lambda services. **Fix**: CloudWatch EMF for Lambda, Prometheus for EKS.
- **m2**: `DynamicForm.vue` schema from auth-service violates SRP. **Fix**: move to setting-service.
- **m3**: H8 (delete ETB campaigns UI) same phase as replacement activation. **Fix**: defer to T5 with 1 billing cycle buffer.
- **m4**: `continue-as-new` threshold (1000 events) not empirically measured. **Fix**: instrument before setting.
- **m5**: No GDPR/NDPR erasure path, no PII field classification. **Fix**: document PII fields, design `DELETE /customers/:id/data` cascade.

---

## Part V: Council Review — Security Division Findings

3 CRITICAL, 7 HIGH, 7 MEDIUM, 3 LOW. OWASP alignment: A01 CRITICAL, A03 CRITICAL, A07 CRITICAL.

### CRITICAL (must fix Phase T1)

- **C-1**: data-segments-api zero auth on all routes (G-11). Add `Depends(verify_jwt)` everywhere.
- **C-2**: data-segments-api f-string SQL injection in `get_data` endpoint (`main.py:171-177`). Use psycopg parameterized queries.
- **C-3**: `POST /build/query` accepts arbitrary S3 filename with no auth + no path traversal guard. Reject filenames with `/`, `\`, `..`.

### HIGH

- **H-1**: Workflow engine auth can be disabled via `AUTH_ENABLED=false` env var (`router.go:91`). Gate on `environment == "development"` only.
- **H-2**: `StartExecution` cross-org bypass (`execution_handler.go:83-85`). Strict `ctxUser.OrgID == template.OrgID`.
- **H-3**: `page_size` unbounded in segmentation. Add `le=10000`.
- **H-4**: Wildcard CORS + credentials on data-segments-api. Restrict to actual frontend origins.
- **H-5**: Temporal history stores PII in plaintext. Enable AES-GCM data converter; set 30-day retention.
- **H-6**: Steward-FE `v-html` renders user content unsanitized (`Dialog/Index.vue:28`). Use DOMPurify.
- **H-7**: S3 presigned PUT has no size/MIME enforcement. Add `ContentLengthRange` condition; scan CSV for formula injection.

### MEDIUM

- **M-1**: Idempotency-Key not implemented anywhere yet (Q1/G-18).
- **M-2**: Audit log absent from all services (Q2/G-19).
- **M-3**: `build_query.py` string interpolation for SQL values.
- **M-4**: No per-org TPS rate limiting.
- **M-5**: Webhook signature bypass hardcoded in comm-svc (`handler.go:171`).
- **M-6**: No SPF/DKIM/DMARC enforcement; no unsubscribe-link presence check before send.
- **M-7**: `PUT /content-templates/:id` lacks permission check when `visibility → MARKETPLACE`. Privilege escalation.

### LOW

- **L-1**: Temporal history retention unlimited; should be 30d for PII compliance.
- **L-2**: ClickHouse 3yr PII retention excessive; anonymize after 90d.
- **L-3**: `sort_by` param not validated against allowlist in workflow engine.

---

## Part W: Council Review — Testing & QA Division Findings

### Test debt severity

| Service | Current coverage | Files with 0 tests | Priority |
| ------- | --------------- | ------------------- | -------- |
| bfree-temporal-workflow-engine | **0%** (0 test files / 82 source files) | All | CRITICAL |
| message_campaign_service | **0%** (0 test files / 58 source files) | All | CRITICAL |
| comm-svc callcenter package | **9.1%** | callbot_script.go, twilio_callbot.go, twiml_handler.go | CRITICAL |
| comm-svc vms package | **10.2%** | infobip.go advanced path | CRITICAL |
| auth-service services | **22.6%** | dto, kafka, queue, server | HIGH |
| setting-service core | **34-40%** | integrations, model, helper | HIGH |
| template-engine processor | **15.8%** | SQS handler | HIGH |
| steward-fe Campaigns/Workflows | **0%** | all new feature modules | HIGH |

### Top 10 "write first" tests

1. `callbot_script_test.go` — pure TwiML generation, zero external deps
2. `twilio_callbot_test.go` — rate-limiter with httptest mock
3. `xcally_stale_lock_test.go` — DynamoDB mock, lock lifecycle
4. `xcally_addContactsToList_test.go` — B1 fix
5. `twiml_handler_test.go` — 7 handlers, signature check
6. `infobip_vms_test.go` — `/tts/3/advanced` construction
7. `dsl_interpreter_test.go` — sequential steps, conditions, branching
8. `dsl_validator_test.go` — all 35 validation rules
9. `auth_service_services_test.go` — login/OTP/token refresh
10. `campaign_dispatch_test.go` — state machine transitions, segmentation SQL

### CI enforcement

- comm-svc: per-package 70% gate exists but callcenter/vms fail. Must pass before merge.
- auth-service: CI runs only lint, no tests. Must add `go test -cover` step.
- workflow-engine + campaign-service: no CI test step at all. Must add.
- steward-fe / crm-fe: add Vitest unit test step with 70% gate before Playwright E2E.

---

## Top-level Definition of "Fully Working Product"

The product is fully working when:

1. **Every service in scope (11 backends + 2 frontends) is healthy locally and on staging.**
2. **A user on Steward-FE can create, schedule, and monitor a campaign for every channel** (SMS, EMAIL, VMS, CALL_BOT, CHAT) end-to-end with a real dispatch landing at mailpit/mock providers.
3. **A user on CRM-FE has identical parity** for the same flows using the same backend APIs.
4. **A user on either frontend can build, publish, and execute a workflow** with multiple steps including conditional branching and waits.
5. **Template library is unified** — email templates authored in ETB appear in the same catalogue as SMS/VMS templates, with channel/source/type/visibility filters working, marketplace subscribe working.
6. **Segmentation works as the single audience source** for campaigns AND workflows, with the same query UI on both frontends.
7. **Every mutating API enforces** validations from Part O, returns errors from Part P, requires Idempotency-Key, writes to audit log.
8. **All 35 gaps from Part R** closed (or explicitly deferred with a ticket).
9. **Test coverage ≥70%** on all touched services.
10. **Feature flags default ON** only after rollback-tested.
11. **Permissions** migration 000018+ grants new roles, auth-service `/auth/validate` returns the new permission strings.
12. **Monitoring dashboards** show per-service error rate, p95 latency, rate-limiter utilisation, provider health.
13. **Every service emits its lifecycle + usage events to Kafka** (per Part X matrix); subscription-service consumes them and persists to ClickHouse for analytics + Lago for billing.
14. **No service uses SQS or SNS — at all.** Every queue / topic across every service is replaced with AWS MSK Kafka per Part Y, including provider-webhook ingest (an HTTPS handler still receives provider POSTs but immediately produces to Kafka instead of SQS).
15. **Marketplace billing pipeline** (Part Z) is live: ETB publishes `template.subscribed`/`template.purchased` events; subscription-service forwards each to Lago + ClickHouse with at-least-once delivery and dead-letter tracking.
16. **Cross-organization scalability is hardened end-to-end** per Part CC: every Kafka topic is org-keyed with the Hash balancer (no scatter), every DB query is org-scoped (IDOR vulnerabilities in `message_campaign_service::GetByID` and `report-submission-service::partner repo` closed), every rate-limiter drops requests without an org context (no bypass), per-org partition + ACL provisioning is automated.
17. **Per-language file change manifest** (Part DD) lists every Go / TypeScript / Vue / JavaScript / Python / Ruby / SQL file that has to change across the rollout, grouped by service and phase.

---

## Part X: Unified event architecture — complete coverage matrix

### Why Part X exists

The platform has four production-grade Kafka topics today (`auth-events`,
`comms-events`, `template-events`, `partner-events`) with subscription-service
as the single ClickHouse-fanout consumer. A fifth (`marketplace-billing-events`)
landed alongside this plan. Three services still don't emit to Kafka at all
(message_campaign_service, bfree-temporal-workflow-engine, setting-service)
and one service (auth-service) has 9 of 11 publisher methods defined but
never called from the production code path. The audit table below is the
canonical reference for closing the gaps.

### X1: Producer/consumer matrix (current state)

| Service | Topic | Producer wired | Consumer | Storage | Status |
| ------- | ----- | -------------- | -------- | ------- | ------ |
| auth-service (CRM) | `auth-events` | partial — 2/11 publish methods called (`PublishUserCreated`, `PublishUserUpdated`); 9 dead | subscription-service ClickHouseConsumer | ClickHouse `events` (3yr TTL) | **GAP** — 9 emit-call sites missing |
| communication-service | `comms-events` | yes — every dispatch path emits | subscription-service ClickHouseConsumer + ETB BounceConsumer | DDB CustomerHistory (transactional) + ClickHouse `events` (analytics) | **OK** |
| template-engine | `template-events` | yes | subscription-service ClickHouseConsumer | ClickHouse `events` | **OK** |
| partner-service | `partner-events` | yes | subscription-service ClickHouseConsumer | ClickHouse `events` | **OK** |
| Email-Template-Builder (ETB) | `marketplace-billing-events` | yes (NEW — Phase Q) | subscription-service MarketplaceBillingConsumer | Lago invoices + ClickHouse `events` | **OK** (new) |
| user-management-service | — | NO Kafka producer | n/a | n/a | **GAP** — every event SQS-only |
| message_campaign_service | — | NO Kafka producer | n/a | n/a | **GAP** — campaign lifecycle log-only |
| bfree-temporal-workflow-engine | — | NO Kafka producer | n/a | n/a | **GAP** — workflow execution log-only |
| setting-service | — | NO Kafka producer | n/a | n/a | **GAP** — config changes log-only |
| mobile-number-statuses (mns) | — | NO Kafka producer | n/a | n/a | **GAP** — phone validation events log-only |
| link-serve | — | NO Kafka producer | n/a | n/a | **GAP** — link click events log-only |
| data-segments-api | — | NO Kafka producer | n/a | n/a | **GAP** — segment-build events log-only |
| subscription-service | — | NO outbound topic (terminal consumer only) | n/a | Lago + ClickHouse | **GAP** — no `subscription.*` events |

### X2: Auth-service emit-call gaps (P0)

Existing `AuthEventPublisher` at
`auth-service/api/crm/internal/kafka/auth_events.go` defines all 11
publishers but only `PublishUserCreated` (line 633) and `PublishUserUpdated`
(line 646) are called. Wire the remaining 9:

| Method | Call site to add | Trigger |
| ------ | ---------------- | ------- |
| `PublishUserLogin(success/failed)` | `auth.service.go::Login` after `LogMsgLoginSuccess`/`LogMsgLoginFailed` | Login outcome |
| `PublishTokenValidation` | `middleware/requiresAuth.middleware.go::Validate` | Every `/auth/validate` call |
| `PublishPermissionCheck` | `middleware/permissions.go::Has` | Every permission check |
| `PublishPasswordReset` | `auth.service.go::RequestPasswordReset` (`auth.password.requested`) and `auth.service.go::ResetPassword` (`auth.password.completed`) | Password reset lifecycle |
| `PublishOTPValidated` | `auth.service.go::ValidateOTP` (success + failure) | OTP validation |
| `PublishEmailSent` | `auth.service.go::sendEmail` (referenced by `LogMsgFailedPublishEmailSent` already in errors.go) | Auth email dispatch |
| `PublishTokenRefreshed` | `auth.service.go::RefreshToken` after token issue | Token refresh |
| `PublishRateLimitExceeded` | `middleware/rateLimit.go::Limit` when 429 returned | Rate-limiter exceeded |
| `PublishUserDeleted` | `user_lifecycle.service.go::DeleteUser` | User deletion |

Each call must wrap the publisher call in a `defer`-guarded `recover` so an
auth flow can never fail because the Kafka writer is down (ClickHouse is
analytics-only; auth must never block on it).

### X3: New producer additions (P1)

For each gap-flagged service, add a `kafka` package mirroring
`partner-service/pkg/kafka/` (smallest reference implementation):

#### X3a: user-management-service → `user-management-events`

New file `user-management-service/api/internal/kafka/`:

- `bootstrap.go` — `NewKafkaProducer(logger, brokersStr, topicStr) *Producer`
- `user_management_events.go` — methods: `PublishAgentCreated`, `PublishAgentDeactivated`, `PublishAgentRoleChanged`, `PublishTaskAssigned`, `PublishTaskReassigned`, `PublishTaskCompleted`, `PublishTaskOverdue`, `PublishAuditEvent`

Wire publishers at:

- `user.service.go::CreateAgent`
- `user.service.go::DeactivateAgent`
- `user.service.go::AssignRoles`
- `task.service.go::AssignTask` / `ReassignTask` / `CompleteTask`
- `task.service.go::OverdueScan` (cron)
- Replace `SendMessageReassignAgentTaskToWorkerService` SQS call with Kafka publish (Part Y)

#### X3b: message_campaign_service → `campaign-events`

New file `message_campaign_service/pkg/kafka/`:

- `bootstrap.go`
- `campaign_events.go` — methods: `PublishCampaignInitiated`, `PublishCampaignFileValidated`, `PublishCampaignFileFailed`, `PublishCampaignTriggered`, `PublishCampaignPaused`, `PublishCampaignResumed`, `PublishCampaignCompleted`, `PublishCampaignFailed`, `PublishScheduleSet`, `PublishScheduleCancelled`

Wire at every status transition in `pkg/services/message_campaign.service.go`.

#### X3c: bfree-temporal-workflow-engine → `workflow-events`

New file `bfree-temporal-workflow-engine/internal/kafka/`:

- `bootstrap.go`
- `workflow_events.go` — methods: `PublishWorkflowStarted`, `PublishWorkflowStepStarted`, `PublishWorkflowStepCompleted`, `PublishWorkflowStepFailed`, `PublishWorkflowCompleted`, `PublishWorkflowFailed`, `PublishWorkflowPaused`, `PublishWorkflowResumed`, `PublishWorkflowCancelled`

Wire from inside Temporal activities (each activity emits its outcome) and
from the workflow signal handlers (pause/resume/cancel).

#### X3d: setting-service → `settings-events`

New file `setting-service/internal/kafka/`:

- `bootstrap.go`
- `settings_events.go` — methods: `PublishCountryActivated`, `PublishCountryDeactivated`, `PublishPricingRuleUpdated`, `PublishProviderConfigChanged`, `PublishOrgPlanChanged`, `PublishCommunicationPreferenceUpdated`

Wire at every settings mutation in `internal/services/`.

#### X3e: mobile-number-statuses → `mns-events`

New file `mobile-number-statuses/pkg/kafka/`:

- `bootstrap.go`
- `mns_events.go` — methods: `PublishLookupRequested`, `PublishLookupResolved`, `PublishLookupFailed`, `PublishOperatorChanged`, `PublishPortabilityDetected`

Wire at every lookup completion path.

#### X3f: link-serve → `link-events`

New file `link-serve/apps/api/src/kafka/` (Node-side; uses `kafkajs`):

- `producer.ts`
- `link_events.ts` — methods: `publishLinkCreated`, `publishLinkClicked`, `publishLinkExpired`, `publishLinkRevoked`

Wire at the redirect handler (click event) and the create/revoke API endpoints.

#### X3g: data-segments-api → `segments-events`

New module `data-segments-api/app/kafka/` (Python; uses `confluent-kafka-python`):

- `producer.py`
- `segments_events.py` — methods: `publish_segment_built`, `publish_segment_failed`, `publish_segment_query_executed`

Wire at `POST /build` and `POST /fetch`.

#### X3h: subscription-service → `subscription-events`

Even though subscription-service is the central consumer, it produces its
own lifecycle events back to Kafka so frontends can subscribe to billing
state changes:

New methods in `subscription-service/internal/kafka/`:

- `subscription_events.go` — methods: `PublishSubscriptionCreated`, `PublishSubscriptionRenewed`, `PublishSubscriptionCancelled`, `PublishInvoiceIssued`, `PublishInvoicePaid`, `PublishInvoiceFailed`, `PublishCreditAdded`, `PublishPlanUpgraded`, `PublishPlanDowngraded`

Wire from the Lago webhook handler (`cmd/api/handlers/webhook.go`) which
already handles every Lago event type — translate each into a Kafka publish
on success.

### X4: ClickHouse fanout — extend the consumer-config list

`subscription-service/internal/worker/usage_clickhouse_consumer.go` line ~68
already builds a topics slice. Append:

```go
topics := []string{
    getEnvOrDefault(env, "KAFKA_AUTH_TOPIC", "auth-events"),
    getEnvOrDefault(env, "KAFKA_COMMS_TOPIC", "comms-events"),
    getEnvOrDefault(env, "KAFKA_TEMPLATE_TOPIC", "template-events"),
    getEnvOrDefault(env, "KAFKA_PARTNER_TOPIC", "partner-events"),
    // NEW topics from Part X3:
    getEnvOrDefault(env, "KAFKA_USER_MGMT_TOPIC",        "user-management-events"),
    getEnvOrDefault(env, "KAFKA_CAMPAIGN_TOPIC",         "campaign-events"),
    getEnvOrDefault(env, "KAFKA_WORKFLOW_TOPIC",         "workflow-events"),
    getEnvOrDefault(env, "KAFKA_SETTINGS_TOPIC",         "settings-events"),
    getEnvOrDefault(env, "KAFKA_MNS_TOPIC",              "mns-events"),
    getEnvOrDefault(env, "KAFKA_LINK_TOPIC",             "link-events"),
    getEnvOrDefault(env, "KAFKA_SEGMENTS_TOPIC",         "segments-events"),
    getEnvOrDefault(env, "KAFKA_SUBSCRIPTION_TOPIC",     "subscription-events"),
}
```

`ClickHouseConsumer.processKafkaMessage` already detects the topic on the
inbound message and applies the right metric-code map. Extend
`event_to_metric.go` (or the inline map in `clickhouse_consumer.go`) with
the new event types from X3a–X3h.

### X4b: Repair the silent-drop in `mapEventToMetric`

`subscription-service/internal/kafka/clickhouse_consumer.go::mapEventToMetric`
(lines ~363–402) only maps a subset of the events publishers actually emit.
The unmapped events get a ClickHouse row with `metric_code=""` so they are
invisible to billing AND analytics. Add explicit entries for:

| Event type emitted by producer | Owning publisher | Suggested metric code | Billable? |
| ------------------------------ | ---------------- | --------------------- | --------- |
| `comms.sms.failed` | comm-svc | `sms_failed` | no (analytics) |
| `comms.sms.expired` | comm-svc | `sms_expired` | no |
| `comms.sms.rejected` | comm-svc | `sms_rejected` | no |
| `comms.email.bounced` | comm-svc | `email_bounced` | no (used for blocklist) |
| `comms.email.complaint` | comm-svc | `email_complaint` | no (used for blocklist) |
| `comms.email.clicked` | comm-svc | `email_clicked` | yes (engagement metric) |
| `comms.email.rejected` | comm-svc | `email_rejected` | no |
| `comms.email.failed` | comm-svc | `email_failed` | no |
| `comms.whatsapp.failed` | comm-svc | `whatsapp_failed` | no |
| `comms.whatsapp.read` | comm-svc | `whatsapp_read` | yes (engagement) |
| `comms.whatsapp.rejected` | comm-svc | `whatsapp_rejected` | no |
| `comms.vms.failed` | comm-svc | `vms_failed` | no |
| `comms.callbot.sent` | comm-svc | `callbot_sent` | yes |
| `comms.callbot.completed` | comm-svc | `callbot_completed` | yes (with duration) |
| `auth.user.login.failed` | auth-svc | `auth_login_failed` | no (security metric) |
| `partner.pending_update.approved` | partner-svc | `partner_pending_update_approved` | no |

Until these are added, every dispatch failure / engagement event is silently
dropped from billing and dashboards.

### X4c: Topic-name fallback mismatch in `go-commons`

`go-commons/pkg/messaging/kafka/bootstrap.go` defaults producer topic names
to `usage-auth-events`, `usage-comms-events`, `usage-template-events`,
`usage-partner-events`. The deployed topic names are
`auth-events` / `comms-events` / `template-events` / `partner-events`. If
any service starts without its `KAFKA_TOPIC_*` env var set, events go to
the wrong topic and the consumer never sees them. Two fixes (do BOTH):

1. Update the go-commons defaults to match the deployed names (drop the
   `usage-` prefix). One commit, all services pick it up on rebuild.
2. Update `internal/pkg/environment/validator.go` in every service that
   uses go-commons producers to make `KAFKA_TOPIC_*` a **required** env
   var (currently only `KAFKA_TOPIC_AUTH` and `KAFKA_TOPIC_COMMS` are
   required for two services). Fail-fast on missing env beats silent
   topic mis-routing.

### X4d: Partition-key routing is broken on 4 of 5 topics

`go-commons/pkg/messaging/kafka/producer.go::NewProducer` only sets the
`Hash` balancer when `Profile == ProfileHighVolume`. Every other profile
uses `LeastBytes`, which **ignores the partition key**. So even though
producers set `key=organization_id` on every message, only `comms-events`
(which uses `ProfileHighVolume`) actually partitions by org.

For `auth-events`, `partner-events`, `template-events`, and
`marketplace-billing-events` (currently uses its own writer with
`Hash{}` balancer, OK), Kafka scatters messages from one org across all
partitions, so consumers can't rely on per-org event ordering.

**Fix**: in `go-commons/pkg/messaging/kafka/producer.go::NewProducer`, set
the `Hash{}` balancer whenever any of the following conditions hold:

- `Profile == ProfileHighVolume`, OR
- `Profile == ProfileReliable`, OR
- caller explicitly passes a `KeyExtractor` function in `ProducerConfig`.

For analytics-only topics where strict per-org ordering is overkill,
documenting the override-via-config is fine — but the default for
billing-relevant or state-transition topics MUST be Hash.

### X5: Per-event metric code mapping (Lago billable metrics)

For events that should drive billing (not just analytics), extend the
billable-metric registry. Register in Lago via the bootstrap migration
script that runs once per environment:

| Event type pattern | Lago metric code | Billing model |
| ------------------ | ---------------- | ------------- |
| `auth.user.login.success` | `auth_logins` | usage-based |
| `auth.token.refreshed` | `token_refreshes` | usage-based |
| `comms.sms.delivered` | `sms_delivered` | usage-based |
| `comms.email.delivered` | `email_delivered` | usage-based |
| `comms.whatsapp.sent` | `whatsapp_sent` | usage-based |
| `comms.vms.sent` | `vms_calls` | usage-based |
| `comms.callbot.completed` | `callbot_minutes` | usage-based (with duration) |
| `comms.ivr.completed` | `ivr_minutes` | usage-based (with duration) |
| `comms.callcenter.contacts_uploaded` | `callcenter_contacts` | usage-based |
| `template.rendered` | `template_renders` | usage-based |
| `template.external.created` | `template_external_api` | usage-based (per provider call) |
| `partner.created` | `partner_accounts` | seat-based (recurring monthly) |
| `user.created` (admin/agent) | `user_seats_<role>` | seat-based (recurring monthly) |
| `template.subscribed` | `marketplace_template_subscribe` | one-time per subscription |
| `template.purchased` | `marketplace_template_purchase` | one-time per purchase |
| `template.renewed` | `marketplace_template_renewal` | recurring per cycle |

Non-billable events (workflow state transitions, lookup logs, segment
queries) still get persisted to ClickHouse but with `cost_amount = 0`.

---

## Part Y: SQS / SNS → AWS MSK Kafka migration (NO EXCEPTIONS)

### Why Part Y exists

Inter-service messaging today is a mix of SQS queues (auth → comms,
campaign → workflow, settings → template-engine, etc.) and SNS topics
(comms → xCALLY webhook fanout, ETB ← SES bounce). This split makes it
impossible to:

1. replay history without parsing per-queue retention (varies);
2. fan-out one event to multiple consumers (SQS is point-to-point);
3. share a single event schema across producers and consumers.

**Every** queue and topic — including provider-webhook ingest — is
replaced with AWS MSK (managed Kafka). Migration is per-queue, behind a
feature flag, with both paths active during cut-over.

### Y0: Provider-webhook ingest

The earlier draft of this plan made an exception for provider-webhook
ingest (`*_WEBHOOK_QUEUE_URL` in comm-service). Per the user-provided
constraint, this exception is removed. The new ingest path:

```text
Provider POST → comm-service HTTPS handler
                    │
                    ▼
        (optionally) signature verification
                    │
                    ▼
         Kafka topic: provider-webhook-events
                    │
                    ▼
         comm-service webhook-processor (consumes Kafka)
                    │
                    ├── DDB CustomerHistory put
                    └── Kafka comms-events publish
```

The HTTPS handler hands off to Kafka before doing any business logic, so
provider response time stays sub-50ms. The webhook-processor service
already exists (`communication-service/cmd/webhook_processor/main.go`)
and just needs its source switched from SQS reader to Kafka consumer.

### Y1: SQS → Kafka migration table

| Service / file | SQS queue env var | Replace with Kafka topic | Consumer migration |
| -------------- | ----------------- | ------------------------ | ------------------ |
| `auth-service/api/crm/internal/queue/sqs.queue.go` | `EMAIL_QUEUE_URL` | `comms-dispatch-events` | comm-service dispatcher reads from new Kafka topic |
| `auth-service/api/crm/internal/queue/sqs.queue.go` | `DISPATCHER_QUEUE_URL` | `comms-dispatch-events` | same |
| `user-management-service/api/internal/queue/sqs.queue.go` | `EMAIL_QUEUE_URL` | `comms-dispatch-events` | same |
| `user-management-service/api/internal/queue/sqs.queue.go` | `AUDIT_SERVICE_QUEUE_URL` | `audit-events` | new audit-service Kafka consumer |
| `user-management-service/api/internal/queue/sqs.queue.go` | `WORKER_SERVICE_QUEUE_URL` | `user-management-events` | task-reassignment becomes a `task.reassigned` event |
| `setting-service/internal/integrations/queue.go` | `TEMPLATE_ENGINE_QUEUE_URL` | `template-render-requests` | template-engine processor consumes from Kafka |
| `subscription-service/internal/integrations/queue.go` | `EMAIL_QUEUE_URL` | `comms-dispatch-events` | same as auth |
| `partner-service/pkg/queue/sqs.queue.go` | `AUDIT_SERVICE_QUEUE_URL` | `audit-events` | same |
| `message_campaign_service/pkg/queue/sqs.queue.go` | `WORKFLOW_QUEUE_URL` | `workflow-trigger-events` | workflow-engine reads from new Kafka topic |
| `message_campaign_service/pkg/queue/sqs.queue.go` | `SCHEDULER_QUEUE_URL` | `campaign-schedule-events` | message_campaign_service self-consumes for scheduled triggers |
| `bfree-temporal-workflow-engine/internal/services/messaging_service.go` | `SMS_ENDPOINT` / `EMAIL_ENDPOINT` / `VMS_ENDPOINT` / `CHATBOT_ENDPOINT` | `comms-dispatch-events` (single topic) | comm-service dispatcher routes by `comm_channel` |
| `bfree-temporal-workflow-engine/internal/services/call_center_service.go` | `CALL_CENTER_ENDPOINT` | `callcenter-dispatch-events` | comm-service callcenter processor reads from Kafka |
| `template-engine/cmd/processor/sqs_handler.go` | source queue + destination queue | `template-render-requests` (in) + `template-render-results` (out) | full bidirectional swap |
| `communication-service/internal/integrations/sqs.go` | `*_WEBHOOK_QUEUE_URL` per provider | **stays SQS** | provider webhooks hit our HTTPS endpoint and are pushed to SQS by AWS for safety; this is a write-buffer, not inter-service messaging. KEEP. |

**No exceptions.** Provider-webhook ingest goes through Kafka per Y0 above.

### Y1b: Exhaustive SQS file-by-file inventory

The migration plan must touch every file below. Each entry includes
file:line, the SDK call, the queue env var, the direction, and the
target Kafka topic.

| Service | File:line | SDK call | Queue (env var) | Direction | Target Kafka topic |
| ------- | --------- | -------- | --------------- | --------- | ------------------ |
| auth-service | `api/crm/internal/queue/sqs.queue.go:74-75` | `sqs.SendMessage` | `EMAIL_QUEUE_URL` | producer | `comms-dispatch-events` |
| auth-service | `api/crm/config/load.config.go:91` | (config-only) | `DISPATCHER_QUEUE_URL` | (unused) | delete |
| auth-service | `api/crm/config/load.config.go:74` | (config-only) | `TEMPLATE_ENGINE_QUEUE_URL` | (unused) | delete |
| communication-service | `internal/integrations/sqs.go:34-41` | `sqs.SendMessage` | `SOURCE_QUEUE_URL` / `COMMS_DISPATCH_QUEUE` | producer | `comms-dispatch-events` |
| communication-service | `internal/integrations/sqs.go:48-55` | `sqs.ReceiveMessage` | `SOURCE_QUEUE_URL` | consumer | `comms-dispatch-events` |
| communication-service | `internal/integrations/sqs.go:57-66` | `sqs.DeleteMessage` | `SOURCE_QUEUE_URL` | consumer | n/a (Kafka commits offsets) |
| communication-service | `internal/integrations/sqs.go:70-78` | `sqs.ChangeMessageVisibility` | `SOURCE_QUEUE_URL` | consumer | n/a (Kafka pause/resume) |
| communication-service | `cmd/dispatcher/main.go:880` | `ReceiveMessageFromSqs` | `SOURCE_QUEUE_URL` | consumer | `comms-dispatch-events` |
| communication-service | `cmd/dispatcher/main.go:889` | `DeleteMessageFromSqs` | `SOURCE_QUEUE_URL` | consumer | n/a |
| communication-service | `internal/integrations/sns.go:26-35` | `sns.Publish` | `WEBHOOK_SNS_TOPIC_ARN` | producer | `callcenter-webhook-events` |
| communication-service | `internal/communication/callcenter/xcally.go:1287` | `SendWebhookEventToSNS` | `WEBHOOK_SNS_TOPIC_ARN` | producer | `callcenter-webhook-events` |
| communication-service | `internal/communication/sms/africa_is_talking.go:343` | `SendWebhookEventToQueue` | `*_WEBHOOK_QUEUE_URL` | producer | `provider-webhook-events` |
| communication-service | `internal/communication/sms/dotgo.go:352` | `SendWebhookEventToQueue` | `*_WEBHOOK_QUEUE_URL` | producer | `provider-webhook-events` |
| communication-service | `internal/communication/sms/bird_sms.go:359` | `SendWebhookEventToQueue` | `*_WEBHOOK_QUEUE_URL` | producer | `provider-webhook-events` |
| communication-service | `internal/communication/sms/sinch_sms.go:352` | `SendWebhookEventToQueue` | `*_WEBHOOK_QUEUE_URL` | producer | `provider-webhook-events` |
| communication-service | `internal/communication/sms/vonage_sms.go:356` | `SendWebhookEventToQueue` | `*_WEBHOOK_QUEUE_URL` | producer | `provider-webhook-events` |
| communication-service | `internal/communication/sms/plivo_sms.go:376` | `SendWebhookEventToQueue` | `*_WEBHOOK_QUEUE_URL` | producer | `provider-webhook-events` |
| communication-service | `cmd/webhook_processor/main.go` | (whole file) | `*_WEBHOOK_QUEUE_URL` | consumer | `provider-webhook-events` |
| communication-service | `cmd/api/webhooks.go` (SNS confirmation handler) | inbound SNS | `WEBHOOK_SNS_TOPIC_ARN` | consumer | obsolete after migration |
| template-engine | `cmd/processor/sqs_handler.go:34-42` | `sqs.ReceiveMessage` | `SOURCE_QUEUE_URL` | consumer | `template-render-requests` |
| template-engine | `cmd/processor/sqs_handler.go:58-66` | `sqs.SendMessage` | `DESTINATION_QUEUE_URL` | producer | `template-render-results` |
| template-engine | `cmd/processor/sqs_handler.go:73-78` | `sqs.DeleteMessage` | `SOURCE_QUEUE_URL` | consumer | n/a |
| template-engine | `cmd/processor/dlq_handler.go:60-67,174-180` | `sqs.ReceiveMessage` | DLQ URL | consumer | `template-render-requests-dlq` |
| template-engine | `cmd/processor/dlq_handler.go:110-115,269-277` | `sqs.SendMessage` | DLQ URL / source | producer | `template-render-requests-dlq` / `template-render-requests` |
| template-engine | `cmd/processor/dlq_handler.go:203-210` | `sqs.DeleteMessage` | DLQ URL | consumer | n/a |
| template-engine | `cmd/processor/processor.go:308-317` | `sqs.SendMessage` | `SOURCE_QUEUE_URL` | producer | `template-render-requests` |
| template-engine | `cmd/scripts/repush-to-dispatcher/main.go:261` | `sqs.SendMessage` | `DESTINATION_QUEUE_URL` | producer | `template-render-results` |
| bfree-temporal-workflow-engine | `internal/services/sqs_service.go:60-80` | `sqs.SendMessage` | `SMS_ENDPOINT` / `EMAIL_ENDPOINT` / `VMS_ENDPOINT` / `CHATBOT_ENDPOINT` / `CALL_CENTER_ENDPOINT` | producer | `comms-dispatch-events` (single topic; channel in metadata) |
| bfree-temporal-workflow-engine | `internal/services/sqs_service.go:97-98` | `sqs.SendMessage` (delayed) | same | producer | `comms-dispatch-events` (with `delay_until` field; consumer schedules) |
| message_campaign_service | `pkg/queue/sqs.queue.go:37-44` | `sqs.SendMessage` | `WORKFLOW_QUEUE_URL` | producer | `workflow-trigger-events` |
| message_campaign_service | `pkg/queue/sqs.queue.go:107-112` | `sqs.SendMessage` | `SCHEDULER_QUEUE_URL` | producer | `campaign-schedule-events` |
| partner-service | `pkg/queue/sqs.queue.go:60-65` | `sqs.SendMessage` | `AUDIT_SERVICE_QUEUE_URL` | producer | `audit-events` |
| subscription-service | `internal/integrations/queue.go:159-163` | `sqs.SendMessage` | `EMAIL_QUEUE_URL` | producer | `comms-dispatch-events` |
| report-submission-service | `internal/integrations/queue.go:154-158` | `sqs.SendMessage` | `TEMPLATE_ENGINE_QUEUE_URL` | producer | `comms-dispatch-events` |
| report-submission-service | `internal/integrations/queue.go:178-182` | `sqs.SendMessage` | `PTP_STREAM_QUEUE_URL` | producer | `ptp-events` |
| setting-service | `internal/integrations/queue.go:207-211` | `sqs.SendMessage` | `TEMPLATE_ENGINE_QUEUE_URL` | producer | `comms-dispatch-events` |
| user-management-service | `api/internal/queue/sqs.queue.go:77-79` | `sqs.SendMessage` | `EMAIL_QUEUE_URL` | producer | `comms-dispatch-events` |
| user-management-service | `api/internal/queue/sqs.queue.go:120-122` | `sqs.SendMessage` | `AUDIT_SERVICE_QUEUE_URL` | producer | `audit-events` |
| user-management-service | `api/internal/queue/sqs.queue.go:153-155` | `sqs.SendMessage` | `WORKER_SERVICE_QUEUE_URL` | producer | `user-management-events` |
| Email-Template-Builder | `backend/internal/handlers/bounce_handler.go:165,184` | inbound SNS HTTP | `WEBHOOK_SNS_TOPIC_ARN` | consumer | obsolete — switch to Kafka `comms-events` filter |
| Email-Template-Builder | `backend/internal/handlers/sns_verifier.go` | (whole file) | `WEBHOOK_SNS_TOPIC_ARN` | consumer | delete |
| infrastructure (lambda) | `lambda/backup_verification/index.py:352-356,393-397` | `boto3 sns.publish` | `SNS_TOPIC_ARN` | producer | `infrastructure-alerts` (or replace with CloudWatch alarm) |

### Y2: SNS → Kafka migration table

| Service / file | SNS topic | Replace with Kafka topic | Consumer migration |
| -------------- | --------- | ------------------------ | ------------------ |
| `communication-service/internal/integrations/sns.go` | `WEBHOOK_SNS_TOPIC_ARN` (xCALLY webhooks) | `callcenter-webhook-events` | comm-service self-consumes; xCALLY ingest stays HTTPS POST |
| `Email-Template-Builder/backend/internal/handlers/sns_verifier.go` + `bounce_handler.go` | SES bounce/complaint via SNS | consume `comms-events` topic with filter on `comms.email.bounced` + `comms.email.complaint` | ETB BounceConsumer is already wired (currently consumes both SNS+Kafka; flag to drop SNS path) |
| `communication-service/cmd/api/webhooks.go` (SNS subscription confirmation handler) | inbound SNS notifications | obsolete after Y1 — inbound webhooks land on HTTPS, get put on SQS, processed normally | delete handler |

### Y3: Migration phasing (per queue)

Each migration is a four-step rollout with a feature flag
(`ff_kafka_<queue>_migration`):

1. **Dual-publish** — producer writes to BOTH the legacy SQS queue and the
   new Kafka topic. Default: flag OFF, only SQS used.
2. **Dual-consume** — consumer reads from BOTH SQS and Kafka, dedupes by
   message-ID. Default: flag OFF, only SQS consumed.
3. **Flip read** — flag ON: consumer reads only from Kafka. SQS still
   filling but nothing drains it. Monitor for 24h.
4. **Flip write** — flag ON: producer writes only to Kafka. SQS queue gets
   deleted by infra job after 7-day soak.

Rollback: flip flag OFF at any phase to revert to SQS-only.

### Y4: Idempotency + ordering guarantees

- All migrated topics use **org_id as partition key** so events for one org
  land on a single partition (preserves ordering for state transitions).

- All producers use `RequireAll` acks for reliability-critical topics
  (billing, dispatch); `RequireOne` for analytics-only topics (e.g.,
  `auth-events` login telemetry).

- Consumers ack only after both side-effects succeed (Lago + ClickHouse, or
  whatever the consumer's outputs are) — at-least-once delivery with
  application-level idempotency.

### Y5: Files to delete after migration

After Phase 4 (flip write), these SQS/SNS-specific files become dead code
and should be removed:

```text
auth-service/api/crm/internal/queue/sqs.queue.go
user-management-service/api/internal/queue/sqs.queue.go
setting-service/internal/integrations/queue.go
subscription-service/internal/integrations/queue.go
partner-service/pkg/queue/sqs.queue.go
message_campaign_service/pkg/queue/sqs.queue.go
bfree-temporal-workflow-engine/internal/services/sqs_service.go
template-engine/cmd/processor/sqs_handler.go (replaced by kafka_handler.go)
communication-service/internal/integrations/sns.go
Email-Template-Builder/backend/internal/handlers/sns_verifier.go
```

Provider-webhook SQS code (comm-service `sqs.go` for `*_WEBHOOK_QUEUE_URL`)
stays.

---

## Part Z: Marketplace billing pipeline (DELIVERED in Phase Q)

### Why Part Z exists

T2 introduced visibility / pricing / subscription clones for email
templates. Phase Q closes the loop by emitting billing events to Kafka and
forwarding them to Lago + ClickHouse so paid marketplace templates actually
generate invoices and revenue analytics.

### Z1: Architecture

```text
┌──────────────────┐    ┌────────────────────────────────┐
│  ETB             │    │ MarketplaceBillingPublisher    │
│  Subscribe /     │───▶│   topic: marketplace-billing-  │
│  Purchase /      │    │   events  key: org_id          │
│  Publish-paid    │    │   acks: RequireAll             │
└──────────────────┘    └─────────────┬──────────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │     Kafka     │
                              │  marketplace- │
                              │ billing-events│
                              └───────┬───────┘
                                      │
                                      ▼
       ┌───────────────────────────────────────────┐
       │ subscription-service worker               │
       │   MarketplaceBillingConsumer              │
       │   group: subscription-service-marketplace-│
       │   billing                                 │
       └────────┬────────────────────────┬─────────┘
                │                        │
                ▼                        ▼
        ┌──────────────┐        ┌─────────────────┐
        │     Lago     │        │   ClickHouse    │
        │  (invoice +  │        │  events table   │
        │  recurring)  │        │  (3yr TTL)      │
        └──────────────┘        └─────────────────┘
```

### Z2: Event schema

```json
{
  "metadata": {
    "event_id":      "uuid",
    "event_type":    "template.subscribed | template.purchased | template.renewed",
    "event_version": "1.0",
    "timestamp":     "2026-04-30T12:00:00Z",
    "service":       "email-template-builder",
    "environment":   "production"
  },
  "data": {
    "event_id":        "uuid",
    "event_type":      "template.subscribed",
    "occurred_at":     1730000000000,
    "org_id":          "subscriber-org-uuid",
    "platform_org_id": "platform-org-uuid",
    "template_id":     "marketplace-template-uuid",
    "cloned_template_id": "subscriber-clone-uuid",
    "template_name":   "Welcome Email",
    "template_source": "Campaign",
    "template_domain": "admin",
    "actor_email":     "user@example.com",
    "pricing": {
      "price_cents":   999,
      "currency":      "USD",
      "billing_model": "one_time"
    },
    "idempotency_key": "subscription-uuid"
  }
}
```

### Z3: Files added

| File | Purpose |
| ---- | ------- |
| `Email-Template-Builder/backend/migrations/000022_create_org_template_subscriptions.up.sql` | Subscription audit table |
| `Email-Template-Builder/backend/migrations/000023_add_marketplace_pricing.up.sql` | `price_cents` / `currency` / `billing_model` columns + CHECK constraints |
| `Email-Template-Builder/backend/internal/domain/email_template.go` | `Visibility`, `BillingModel`, `MarketplaceBillingEvent`, `OrgTemplateSubscription` types |
| `Email-Template-Builder/backend/internal/repository/postgres/org_template_subscription_repo.go` | New repo |
| `Email-Template-Builder/backend/internal/kafka/marketplace_billing_publisher.go` | Kafka producer |
| `Email-Template-Builder/backend/internal/service/template_service.go` | `PublishToMarketplace`, `SubscribeToMarketplace`, `ListMarketplace`, `ListSubscriptions`, `emitBillingEvent` |
| `Email-Template-Builder/backend/internal/handlers/template_handler.go` | 4 marketplace HTTP endpoints |
| `Email-Template-Builder/backend/cmd/api/router.go` | Route registration |
| `Email-Template-Builder/backend/cmd/api/bootstrap.go` | DI providers for subscription repo + billing publisher |
| `Email-Template-Builder/backend/internal/appconfig/config.go` | `KafkaBrokers` + `MarketplaceBillingTopic` env config |
| `subscription-service/internal/kafka/marketplace_billing_consumer.go` | Consumer with Lago + ClickHouse fan-out and dead-letter tracking |
| `subscription-service/internal/integrations/lago.go` | `SendBillableEvent` method on MeteringService |
| `subscription-service/internal/worker/usage_clickhouse_consumer.go` | Dual-consumer wiring |
| `subscription-service/cmd/worker/main.go` | Lago dependency injection for the worker |

### Z4: Reliability guarantees

1. **At-least-once delivery** — publisher uses `RequireAll`; consumer
   commits offset only after both Lago and ClickHouse forwards succeed.
2. **Idempotency** — Lago `TransactionID` is the subscription / purchase id
   so retries are de-duplicated server-side.
3. **No event loss** — malformed envelopes are persisted as
   `template.malformed` rows in ClickHouse with raw bytes preserved for ops
   replay.
4. **Source of truth = PostgreSQL** — `org_template_subscriptions` and
   `paid_template_orgs` are authoritative; pipeline can be replayed from
   these tables if Kafka history is lost.
5. **Lago outage** is non-fatal — when Lago is unreachable on worker boot
   the consumer still writes ClickHouse rows; invoicing replays once Lago
   recovers (consumer offset stays uncommitted).

---

## Part AA: Infrastructure jobs

Each Kafka topic added in Parts X, Y, and Z requires infra config that
isn't part of the code change but must land in lockstep:

### AA1: Kafka topic provisioning (Terraform)

For each new topic (`marketplace-billing-events`, plus all of Part X3 and
Part Y), add to the Kafka cluster module:

```hcl
resource "aws_msk_topic" "marketplace_billing_events" {
  cluster_arn        = aws_msk_cluster.bfree.arn
  topic_name         = "marketplace-billing-events"
  partitions         = 6   # 6 partitions per topic; tune via metric: 1 partition / 2k msgs/sec sustained
  replication_factor = 3
  config = {
    "retention.ms"     = "${30 * 24 * 60 * 60 * 1000}"  # 30 days raw kafka retention
    "compression.type" = "snappy"
    "min.insync.replicas" = "2"
  }
}
```

Topic naming convention: lowercase, hyphenated, suffix `-events` for
change-data, `-requests` / `-results` for RPC-style topics (Y1 dispatch
queues).

### AA2: Consumer-group ACLs

Each consumer group needs an explicit ACL so a misconfigured deploy can't
read the wrong topic:

```hcl
resource "aws_msk_acl" "subscription_marketplace_billing" {
  cluster_arn         = aws_msk_cluster.bfree.arn
  resource_type       = "TOPIC"
  resource_name       = aws_msk_topic.marketplace_billing_events.topic_name
  pattern_type        = "LITERAL"
  principal           = "User:subscription-service-worker"
  operation           = "READ"
  permission          = "ALLOW"
}
```

Same shape for every consumer added in Part X4.

### AA3: ClickHouse table TTL

The shared `events` table in subscription-service ClickHouse already has
3yr retention. Marketplace billing events ride on the same table — no new
table needed. Verify the TTL clause is present:

```sql
ALTER TABLE events MODIFY TTL toDate(timestamp) + INTERVAL 3 YEAR DELETE;
```

For the malformed-event sentinel (`template.malformed` event type) the
default 3yr TTL is fine; a separate shorter TTL is overkill.

### AA4: Monitoring + alerting

Per-topic dashboards (Grafana / CloudWatch):

| Metric | Threshold | Page level |
| ------ | --------- | ---------- |
| Consumer lag (per topic) | > 1000 messages | warn |
| Consumer lag (per topic) | > 10000 messages | page |
| Producer error rate | > 1% over 5min | page |
| Consumer error rate | > 1% over 5min | warn |
| `template.malformed` count | > 0 over 5min | warn (publisher drift) |
| Lago `SendBillableEvent` p95 | > 2s over 5min | warn |
| Marketplace billing pipeline E2E latency (publish → ClickHouse insert) | > 10s p95 | warn |

Alerts route to:

- PagerDuty `bfree-platform` for `page` thresholds.
- Slack `#bfree-events` for `warn` thresholds.

### AA5: Deployment ordering

Kafka producer/consumer migrations have hard dependencies. Each topic ships
in this order:

1. Provision topic (AA1).
2. Provision consumer-group ACLs (AA2).
3. Deploy consumer (gracefully ignores empty topic).
4. Deploy producer (starts publishing).
5. Verify consumer lag ≈ 0.
6. (For SQS-replacement topics, follow Y3 phase rollout.)

### AA6: Local dev

`docker-compose.local.yml` already runs Redpanda on `:9092` (per
project-level CLAUDE.md). Add to startup checklist:

- Redpanda running.
- `KAFKA_BROKERS=localhost:9092` exported in every service `.env`.
- Topic auto-creation enabled (Redpanda default) so dev doesn't need a
  separate provisioning step.

For ClickHouse local testing the existing container (24.8) handles both the
usage events and marketplace billing events without schema change.

---

## Part BB: Verification (post-Phase Q + X + Y rollout)

### BB1: Unit tests required

- ETB: `internal/service/template_service_marketplace_test.go` — Subscribe
  happy path, self-subscribe rejection, already-subscribed conflict,
  Publish-with-pricing happy path, pricing validation rejections.

- ETB: `internal/kafka/marketplace_billing_publisher_test.go` — wire shape
  matches subscription-service decoder.

- subscription-service: `internal/kafka/marketplace_billing_consumer_test.go`
  — Lago happy path, ClickHouse happy path, malformed envelope dead-letters,
  Lago error keeps offset uncommitted.

- subscription-service:
  `internal/integrations/lago_send_billable_event_test.go` — happy path,
  Lago error mapped to retryable, circuit-breaker open returns sentinel.

### BB2: End-to-end test

```bash
# 1. Start the stack
docker compose -f docker-compose.local.yml up -d

# 2. Run migrations
cd Email-Template-Builder/backend && goose up
cd subscription-service && goose up

# 3. Boot ETB + subscription-service worker
cd Email-Template-Builder/backend && go run ./cmd/api &
cd subscription-service && go run ./cmd/worker &

# 4. Publish a marketplace template
curl -X POST http://localhost:8084/v1/email-templates/$TID/publish-marketplace \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"is_paid": true, "price_cents": 999, "currency": "USD", "billing_model": "one_time"}'

# 5. Subscribe from a different org
curl -X POST http://localhost:8084/v1/email-templates/$TID/subscribe-marketplace \
  -H "Authorization: Bearer $OTHER_ORG_TOKEN"

# 6. Verify Kafka message
rpk topic consume marketplace-billing-events --num 1

# 7. Verify ClickHouse row
clickhouse-client -q "SELECT event_type, org_id, cost_amount FROM events WHERE event_type IN ('template.subscribed', 'template.purchased') ORDER BY timestamp DESC LIMIT 5"

# 8. Verify Lago invoice (if Lago is running locally)
curl -H "Authorization: Bearer $LAGO_KEY" http://localhost:3000/api/v1/events?external_subscription_id=$ORG_ID
```

All 8 steps must succeed for the rollout to be considered done.

### BB3: Production smoke test

After deploying to production:

1. Issue a `subscribe-marketplace` call against a known test template.
2. Verify the row in `org_template_subscriptions` (PostgreSQL) within 1s.
3. Verify the Kafka message on the topic within 5s (consumer lag dashboard).
4. Verify the ClickHouse row within 10s.
5. Verify the Lago event lands and an invoice line item is generated (if
   the template has `is_paid=true`).
6. Run `rpk topic describe marketplace-billing-events` and confirm
   replication factor = 3, ISR = 3.

---

## Part CC: Cross-organization scalability hardening

### Why Part CC exists

The platform is multi-tenant. Several scalability and isolation gaps have
been identified during the audit and must be closed before declaring the
platform "100% cross-org scalable":

- Two IDOR vulnerabilities (one in `message_campaign_service::GetByID`,
  one in `report-submission-service::partners-by-id`).

- Kafka partition routing is broken on 4 of 5 topics — messages from one
  org scatter across partitions, breaking per-org ordering for state
  transitions.

- Analytics rate-limiter has a bypass for org-less requests.
- Marketplace `ListMarketplace` does a DynamoDB full-table Scan with no
  GSI on `visibility` — performance will degrade as catalogue grows.

- No org-level Kafka quota / ACL enforcement; any org can in theory flood
  the cluster.

### CC1: Close IDOR vulnerabilities

| File | Issue | Fix |
| ---- | ----- | --- |
| `message_campaign_service/pkg/repositories/message_campaign.repository.go:23` (`GetByID`) | `WHERE c.id = $1` — no org filter | Change to `WHERE c.id = $1 AND c.organization_id = $2`; update service+handler to pass caller `OrganizationID`. |
| `report-submission-service/internal/repo/partner.go:39` | `WHERE id = $1` — no org filter | Add `AND organization_id = $2` parameter. |

Add integration tests asserting that a user from org A cannot fetch a
resource owned by org B even when they have its UUID.

### CC2: Fix Kafka partition routing

Per X4d, modify `go-commons/pkg/messaging/kafka/producer.go::NewProducer`
so the `Hash{}` balancer is the default for any state-transition topic.
Pseudocode change:

```go
balancer := kafka.Balancer(&kafka.Hash{})
if config.Profile == ProfileStandard && !config.RequiresOrdering {
    balancer = &kafka.LeastBytes{}
}
```

Add `RequiresOrdering bool` to `ProducerConfig` and set it `true` for:
`auth-events`, `partner-events`, `template-events`, `subscription-events`,
`campaign-events`, `workflow-events`, `marketplace-billing-events`,
`audit-events`, `user-management-events`, `settings-events`.

### CC3: Close rate-limiter bypass

`subscription-service/internal/analytics/middleware/ratelimit.go:50` —
remove the `if !ok || userCtx.OrganizationID == ""` early-return that
skips throttling. Replace with:

```go
if !ok || userCtx.OrganizationID == "" {
    c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
        "error": "AUTH-013 ORG_CONTEXT_REQUIRED",
        "message": "analytics endpoints require an authenticated org context",
    })
    return
}
```

Health probes (which intentionally lack org context) live on a separate
router group without this middleware — verify in `cmd/api/router.go`.

### CC4: Marketplace ListMarketplace performance

Add a DynamoDB GSI on `visibility` so the marketplace catalogue is
queryable rather than scannable:

```hcl
resource "aws_dynamodb_table" "comm_provider_credentials" {
  global_secondary_index {
    name             = "visibility-index"
    hash_key         = "visibility"
    range_key        = "created_at"
    projection_type  = "ALL"
  }
}
```

(Same pattern in template-engine's marketplace table.)

Update `ListMarketplace` repo methods to use `Query` against the GSI
instead of `Scan`. Cache the result for 60s in Redis (per-source key) —
the marketplace catalogue is read-heavy and changes rarely.

### CC5: Per-org Kafka quotas + ACLs

MSK supports per-client quotas via the AdminClient API:

```hcl
resource "aws_msk_configuration" "bfree_org_quotas" {
  name = "bfree-org-quotas"
  server_properties = <<EOF
    quota.window.size.seconds=10
    client.quota.callback.class=...QuotaCallback
  EOF
}
```

Combined with per-org consumer ACLs (Part AA2 already covers this),
this prevents any single tenant from saturating cluster bandwidth or
outdistancing the consumer group.

For each org, on creation in auth-service the bootstrap script:

1. Provisions a per-org quota (`producer_byte_rate=10MB/s`,
   `consumer_byte_rate=20MB/s` by default; tunable per tier).
2. Provisions read-ACLs only on the topics the org should see (e.g., the
   org's ETB instance can `READ` on `marketplace-billing-events` only for
   its own org_id partition — Kafka enforces this via the principal mapped
   to the org).
3. Records the quota + ACL config in `organizations` table for audit.

### CC6: ClickHouse analytics partitioning

`subscription-service` ClickHouse `events` table is currently partitioned
by date only:

```sql
PARTITION BY toYYYYMM(timestamp)
```

For per-org analytics at scale, repartition to:

```sql
PARTITION BY (toYYYYMM(timestamp), organization_id)
ORDER BY (organization_id, metric_code, timestamp)
TTL toDate(timestamp) + INTERVAL 3 YEAR DELETE
```

Migration: create the new table side-by-side, dual-write for 7 days, swap
the alias on day 8, drop the old table on day 30. Per-org dashboard
queries become point-lookups instead of full-month scans.

### CC7: Per-org rate limit on Kafka producer side

`go-commons/pkg/messaging/kafka/producer.go::PublishEvent` should accept
an `OrgID` field on the event metadata and bucket per-org via a
token-bucket limiter. Default: `100 events/sec/org`, configurable via
`KAFKA_PER_ORG_RATE`. Excess events get queued with bounded memory and a
dropped-with-log path if the queue saturates — never block the calling
goroutine.

### CC8: Multi-tenant verification checklist

- [ ] No DB query in any service runs without an `organization_id` filter
      unless it's an explicitly-marked admin-cross-org operation.

- [ ] Every Kafka producer keys by `organization_id`.
- [ ] Every Kafka topic's balancer routes by partition key (Hash, not
      LeastBytes).

- [ ] Every consumer ACL is scoped to the principal that needs it (no
      blanket `*` permissions).

- [ ] Every middleware that takes a `user.OrganizationID` rejects empty
      / unset values rather than bypassing the check.

- [ ] Every per-org dashboard query in subscription-service hits a GSI /
      ClickHouse partition rather than scanning the full table.

- [ ] Org deletion triggers Kafka ACL teardown + ClickHouse partition
      drop (don't leave dead rows draining 3yr TTL).

---

## Part DD: Per-language file change manifest

This section enumerates every file touched across every language. Use it
as the implementation checklist — each file links to the part of the
plan that drives the change.

### DD1: Go

#### auth-service

| File | Change | Driver |
| ---- | ------ | ------ |
| `api/crm/internal/kafka/auth_events.go` | wire 9 dead Publish methods | X2 |
| `api/crm/internal/services/auth.service.go` | call `PublishUserLogin`, `PublishPasswordReset`, `PublishOTPValidated`, `PublishTokenRefreshed`, `PublishEmailSent` | X2 |
| `api/crm/internal/services/user_lifecycle.service.go` | call `PublishUserDeleted` | X2 |
| `api/crm/internal/middleware/requiresAuth.middleware.go` | call `PublishTokenValidation` | X2 |
| `api/crm/internal/middleware/permissions.go` | call `PublishPermissionCheck` | X2 |
| `api/crm/internal/middleware/rateLimit.go` | call `PublishRateLimitExceeded` | X2 |
| `api/crm/internal/queue/sqs.queue.go` | DELETE after Y migration | Y1b |
| `api/crm/config/load.config.go` | remove unused queue env vars | Y1b |
| `api/crm/internal/kafka/dispatch_events.go` | NEW — replaces SQS email send with Kafka publish to `comms-dispatch-events` | Y1b |

#### communication-service

| File | Change | Driver |
| ---- | ------ | ------ |
| `internal/integrations/sqs.go` | DELETE | Y1b |
| `internal/integrations/sns.go` | DELETE | Y1b |
| `internal/kafka/dispatch_consumer.go` | NEW — consumes `comms-dispatch-events`; replaces dispatcher SQS read | Y1b |
| `internal/kafka/provider_webhook_consumer.go` | NEW — consumes `provider-webhook-events`; replaces webhook_processor SQS read | Y0/Y1b |
| `internal/kafka/callcenter_webhook_publisher.go` | NEW — publishes to `callcenter-webhook-events`; replaces SNS publish | Y2 |
| `cmd/dispatcher/main.go` | switch source from SQS to Kafka consumer | Y1b |
| `cmd/webhook_processor/main.go` | switch source from SQS to Kafka consumer | Y0 |
| `cmd/api/webhooks.go` | delete SNS confirmation handler block | Y1b |
| `internal/communication/sms/africa_is_talking.go`, `dotgo.go`, `bird_sms.go`, `sinch_sms.go`, `vonage_sms.go`, `plivo_sms.go` | replace `SendWebhookEventToQueue` with Kafka producer | Y1b |
| `internal/communication/callcenter/xcally.go:1287` | replace `SendWebhookEventToSNS` with Kafka publish | Y2 |

#### template-engine

| File | Change | Driver |
| ---- | ------ | ------ |
| `cmd/processor/sqs_handler.go` | DELETE | Y1b |
| `cmd/processor/kafka_handler.go` | NEW — consumes `template-render-requests`, produces `template-render-results` | Y1b |
| `cmd/processor/dlq_handler.go` | rewrite to use Kafka DLQ topic (`template-render-requests-dlq`) | Y1b |
| `cmd/processor/processor.go:308-317` | replace SQS retry-send with Kafka publish | Y1b |
| `cmd/scripts/repush-to-dispatcher/main.go` | replace SQS send with Kafka publish | Y1b |
| `internal/api/dto/template.go` | extend Sources `oneof` to all 11 (already done in Phase Q) | I1 |

#### partner-service

| File | Change | Driver |
| ---- | ------ | ------ |
| `pkg/queue/sqs.queue.go` | DELETE | Y1b |
| `pkg/kafka/audit_publisher.go` | NEW — publishes to `audit-events` | Y1b |

#### message_campaign_service

| File | Change | Driver |
| ---- | ------ | ------ |
| `pkg/queue/sqs.queue.go` | DELETE | Y1b |
| `pkg/kafka/bootstrap.go` | NEW | X3b |
| `pkg/kafka/campaign_events.go` | NEW — 10 publish methods | X3b |
| `pkg/kafka/workflow_trigger_publisher.go` | NEW — replaces SQS `WORKFLOW_QUEUE_URL` send | Y1b |
| `pkg/kafka/scheduler_publisher.go` | NEW — replaces SQS `SCHEDULER_QUEUE_URL` send | Y1b |
| `pkg/services/message_campaign.service.go` | call publishers at every state transition | X3b |
| `pkg/repositories/message_campaign.repository.go:23` | add `organization_id` filter to `GetByID` | CC1 |

#### bfree-temporal-workflow-engine

| File | Change | Driver |
| ---- | ------ | ------ |
| `internal/services/sqs_service.go` | DELETE | Y1b |
| `internal/services/messaging_service.go` | rewrite to use Kafka producer | Y1b |
| `internal/services/call_center_service.go` | replace SQS send with Kafka publish | Y1b |
| `internal/kafka/bootstrap.go` | NEW | X3c |
| `internal/kafka/workflow_events.go` | NEW — 9 publish methods | X3c |
| `internal/kafka/dispatch_publisher.go` | NEW — publishes to `comms-dispatch-events` | Y1b |
| `internal/dsl/validator.go` | accept all 11 sources (already in canonicalisation work) | X1 |

#### setting-service

| File | Change | Driver |
| ---- | ------ | ------ |
| `internal/integrations/queue.go` | DELETE | Y1b |
| `internal/kafka/bootstrap.go` | NEW | X3d |
| `internal/kafka/settings_events.go` | NEW — 6 publish methods | X3d |
| `internal/kafka/dispatch_publisher.go` | NEW — replaces SQS template-engine send | Y1b |
| `internal/services/*` | call publishers at every settings mutation | X3d |

#### user-management-service

| File | Change | Driver |
| ---- | ------ | ------ |
| `api/internal/queue/sqs.queue.go` | DELETE | Y1b |
| `api/internal/kafka/bootstrap.go` | NEW | X3a |
| `api/internal/kafka/user_management_events.go` | NEW — 8 publish methods | X3a |
| `api/internal/kafka/audit_publisher.go` | NEW — publishes to `audit-events` | Y1b |
| `api/internal/kafka/dispatch_publisher.go` | NEW — replaces SQS email send | Y1b |
| `api/internal/services/*` | call publishers at every state transition | X3a |

#### subscription-service

| File | Change | Driver |
| ---- | ------ | ------ |
| `internal/integrations/queue.go` | DELETE | Y1b |
| `internal/kafka/marketplace_billing_consumer.go` | NEW — already landed in Phase Q | Z |
| `internal/kafka/subscription_events.go` | NEW — 9 publish methods | X3h |
| `internal/kafka/dispatch_publisher.go` | NEW — replaces SQS email send | Y1b |
| `internal/integrations/lago.go` | already landed `SendBillableEvent` | Z |
| `internal/worker/usage_clickhouse_consumer.go` | extend topic list (Part X4) | X4 |
| `cmd/worker/main.go` | already wired Lago dependency | Z |
| `cmd/api/handlers/webhook.go` | publish `subscription-events` from each Lago webhook handler | X3h |
| `internal/analytics/middleware/ratelimit.go:50` | reject org-less requests instead of bypass | CC3 |
| `migrations/clickhouse/003_repartition_events_by_org.sql` | NEW — repartition to `(toYYYYMM, org_id)` | CC6 |

#### report-submission-service

| File | Change | Driver |
| ---- | ------ | ------ |
| `internal/integrations/queue.go` | DELETE | Y1b |
| `internal/kafka/dispatch_publisher.go` | NEW | Y1b |
| `internal/kafka/ptp_publisher.go` | NEW — `ptp-events` | Y1b |
| `internal/repo/partner.go:39` | add `organization_id` filter | CC1 |

#### mobile-number-statuses

| File | Change | Driver |
| ---- | ------ | ------ |
| `pkg/kafka/bootstrap.go` | NEW | X3e |
| `pkg/kafka/mns_events.go` | NEW — 5 publish methods | X3e |
| `pkg/services/lookup.service.go` | call publishers | X3e |

#### Email-Template-Builder (backend)

| File | Change | Driver |
| ---- | ------ | ------ |
| `backend/internal/handlers/sns_verifier.go` | DELETE | Y2 |
| `backend/internal/handlers/bounce_handler.go` | rewrite as Kafka consumer of `comms-events` filtering bounce/complaint | Y2 |
| `backend/internal/kafka/bounce_consumer.go` | switch source topic if needed | Y2 |
| `backend/internal/kafka/marketplace_billing_publisher.go` | already landed in Phase Q | Z |

#### go-commons

| File | Change | Driver |
| ---- | ------ | ------ |
| `pkg/messaging/kafka/bootstrap.go` | drop `usage-` prefix from default topic names | X4c |
| `pkg/messaging/kafka/producer.go` | default `Hash{}` balancer for state-transition profiles | X4d/CC2 |
| `pkg/messaging/kafka/producer.go` | add per-org token-bucket rate limiter | CC7 |
| `pkg/messaging/kafka/consumer.go` | add `KafkaConsumerWithDLQ` helper | (consumer parity with producer) |

### DD2: TypeScript / JavaScript

#### link-serve

| File | Change | Driver |
| ---- | ------ | ------ |
| `apps/api/src/kafka/producer.ts` | NEW — `kafkajs` producer | X3f |
| `apps/api/src/kafka/link_events.ts` | NEW — 4 publish methods | X3f |
| `apps/api/src/controllers/redirect.controller.ts` | call `publishLinkClicked` on every redirect | X3f |
| `apps/api/src/controllers/link.controller.ts` | call `publishLinkCreated` / `publishLinkRevoked` | X3f |

### DD3: Vue (frontend)

CRM-FE and Steward-FE only consume the Kafka events transitively via the
analytics REST endpoints exposed by subscription-service. No Vue code
needs to change for Part X / Y / CC. The marketplace endpoints from
Phase Q add four buttons — already covered by Parts D / E.

### DD4: Python

#### data-segments-api

| File | Change | Driver |
| ---- | ------ | ------ |
| `app/kafka/__init__.py` | NEW | X3g |
| `app/kafka/producer.py` | NEW — `confluent-kafka-python` producer with `acks=all` and `compression.type=snappy` | X3g |
| `app/kafka/segments_events.py` | NEW — 3 publish methods | X3g |
| `app/main.py::POST /build` | call `publish_segment_built` after success | X3g |
| `app/main.py::POST /fetch` | call `publish_segment_query_executed` | X3g |
| `pyproject.toml` / `requirements.txt` | add `confluent-kafka` dependency | X3g |

#### infrastructure (Lambda)

| File | Change | Driver |
| ---- | ------ | ------ |
| `lambda/backup_verification/index.py:352-356,393-397` | replace `boto3 sns.publish` with Kafka publish OR delete the SNS path and rely on CloudWatch alarms | Y1b |

### DD5: Ruby

No Kafka producer needed in any Ruby service in scope. `lago-api` is a
Lago vendored service consumed via REST + webhook; no inbound or outbound
Kafka changes are required on the Ruby side.

### DD6: SQL / migrations

| Service | New migration | Purpose | Driver |
| ------- | ------------- | ------- | ------ |
| Email-Template-Builder | `000022_create_org_template_subscriptions.up.sql` | already landed | Z |
| Email-Template-Builder | `000023_add_marketplace_pricing.up.sql` | already landed | Z |
| subscription-service | `migrations/clickhouse/003_repartition_events_by_org.sql` | repartition `events` table by `(toYYYYMM, organization_id)` | CC6 |
| subscription-service | `migrations/clickhouse/004_add_metric_codes_for_dropped_events.sql` | data migration: backfill `metric_code` for previously dropped events | X4b |
| message_campaign_service | `migrations/0XX_backfill_org_id_constraint.sql` | NOT NULL constraint on `campaigns.organization_id` to prevent future IDOR | CC1 |
| report-submission-service | `migrations/0XX_backfill_org_id_constraint.sql` | same, on `partners` table | CC1 |
| go-commons (or terraform) | `terraform/modules/msk/topics.tf` | provision new topics (auto-creation off in prod) | AA1 |
| go-commons (or terraform) | `terraform/modules/msk/acls.tf` | provision per-org ACLs | AA2 + CC5 |

### DD7: Configuration files

| File | Change | Driver |
| ---- | ------ | ------ |
| `docker-compose.local.yml` | already runs Redpanda; verify Kafka topics auto-create | AA6 |
| `docker-compose.test.yml` | add health probe for marketplace-billing topic | AA6 |
| every service `.env.example` | add `KAFKA_BROKERS` + per-topic env vars | X4 / Y1b |
| every service Helm chart / Lambda config | add `KAFKA_*` env vars | (deployment) |
| `bytebase-cluster/migrations/...` | register new migrations | DD6 |

---

## Part EE: Phased rollout (replaces Part T phasing)

The phasing below replaces the high-level Part T ordering with concrete
ship-units that deliver business value end-to-end at each step.

| Phase | Scope | Definition of done |
| ----- | ----- | ------------------ |
| **EE1** | Foundations + lift-and-shift | go-commons fixes (X4c, X4d, CC2), MSK topic provisioning (AA1), per-org ACLs (AA2). No producer/consumer changes yet — this is just infra prep. |
| **EE2** | Marketplace billing | Phase Q work already landed. Verify production rollout per BB3. |
| **EE3** | Auth-service emit gaps | Wire 9 dead `PublishX` methods (X2). Repair `mapEventToMetric` for `auth.user.login.failed` (X4b). |
| **EE4** | Comms-events metric mapping | Add 14 dropped event types to `mapEventToMetric` (X4b). Define billable vs non-billable per X5. |
| **EE5** | New service producers | Add producers in user-management, message_campaign, workflow-engine, setting-service, mns, link-serve, data-segments-api, subscription-service (X3a–X3h). |
| **EE6** | SQS migration — auth + user-management | Phase 1 dual-publish to `comms-dispatch-events` (Y1b). |
| **EE7** | SQS migration — message_campaign + workflow-engine + setting-service + report-submission-service + subscription-service | Same pattern as EE6 for remaining queue producers. |
| **EE8** | SQS migration — comm-svc dispatcher + template-engine processor | Both consumers switch source topic (Y1b). |
| **EE9** | SNS migration | xCALLY webhooks + ETB bounce ingest (Y2). |
| **EE10** | Provider-webhook ingest | comm-svc HTTPS handler produces to Kafka instead of SQS (Y0). |
| **EE11** | Cross-org hardening | IDOR closures (CC1), rate-limiter bypass fix (CC3), ListMarketplace GSI (CC4), per-org Kafka quotas (CC5), ClickHouse repartition (CC6), per-org producer rate limit (CC7). |
| **EE12** | Cleanup | Delete `sqs.queue.go` / `sns.go` / `sns_verifier.go` / `*sqs_handler.go` files per Y5 / DD1. |
| **EE13** | Verification + observability | Run BB1, BB2, BB3 end-to-end. Verify CC8 checklist line-by-line. Update dashboards. |

---

## Part FF: Seeds enrichment

### Why Part FF exists

Several services have seeders (`cmd/seed/`) that build the platform's
boot-state — orgs, roles, permissions, providers, templates, plans. After
the Part X event additions and Part DD-7 config additions, the seeders
must be enriched so a fresh deployment starts with every Kafka topic, ACL,
metric code, billable plan and feature-flag default in place.

### FF1: Auth-service seed enrichment

`auth-service/cmd/seed/`:

- Add the 9 new permissions referenced in Part M1 (`publish_template_marketplace`,
  `subscribe_template`, `manage_template_types`, `view_marketplace_templates`,
  `create_workflow_version`, `publish_workflow`, `run_workflow_dry_run`,
  `view_workflow_executions`, `view_dispatch_reports`).
- Add the new role grants for `crm` admin/root and `admin` root domains.
- Seed the per-org Kafka quota config (Part CC5) at org-creation hook.

### FF2: ETB seed enrichment

`Email-Template-Builder/backend/cmd/seed/definitions.go`:

- Already moved `agent-daily-summary` / `agent-new-assignment` /
  `agent-performance-report` to `DomainAdmin` (per memory).
- Add a seeded MARKETPLACE template per source eligible for the gallery
  (one Agent, one WorkFlow, one Campaign) with `price_cents` /
  `currency` / `billing_model` populated so the marketplace UI has at
  least one row of each pricing variant on a fresh stack.
- Seed `template_types` table (Part I1) with the 15 canonical slugs.

### FF3: Communication-service provider seeds

`communication-service/cmd/seed-providers/`:

- Add seed entries for every provider currently supported (per
  `commsvc_providers` memory): SMS (12), VMS (4), CHAT/WhatsApp (5),
  Email (4), CALL_CENTER (Xcally + Twilio Voice), CALL_BOT (Twilio).
- For each, seed a default `webhook_secret` placeholder, a default
  `test_contact`, and an `allowed_sources` list containing all 11
  canonical sources.

### FF4: Subscription-service Lago seed

`subscription-service/cmd/seed/`:

- Seed every billable metric code from Part X5 in Lago via the bootstrap
  migration script (idempotent — `Lago.CreateBillableMetric` skipped if
  already present).
- Seed default plans (Free / Starter / Growth / Enterprise) with the
  per-metric pricing tiers.
- Seed feature definitions matching the Part M1 permission set.

### FF5: ClickHouse schema seeds

`subscription-service/migrations/clickhouse/`:

- Add migration `005_seed_metric_codes.sql` to register the 14 dropped-event
  metric codes (Part X4b) so dashboards have a row to count even before
  the first event lands.
- Add migration `006_create_marketplace_billing_view.sql` that creates a
  materialised view aggregating `event_type IN ('template.subscribed',
  'template.purchased', 'template.renewed')` by org / month — drives
  marketplace revenue dashboards.

### FF6: Frontend seed updates

CRM-FE + Steward-FE constants:

- `src/utils/constants.ts` (CRM) / `src/features/Settings/type/index.ts`
  (Steward) — add the new sources (Test, Webhook, System, Inbound, API)
  to source dropdowns where applicable.
- Add UI strings for marketplace billing model selection (one_time vs
  recurring_monthly).
- Add UI strings for the new permission denied modal copy referencing
  the 9 new permissions.

### FF7: Local-dev docker seeds

`docker-compose.local.yml` + bootstrap scripts:

- Auto-create every Kafka topic listed in Part Y1b on Redpanda startup
  (Redpanda supports auto-create but explicit creation removes
  partition-count guesswork).
- Seed Lago with a test API key so the marketplace billing consumer
  has somewhere to forward events even in local dev.
- Seed ClickHouse with the `events` table + materialised views so
  analytics queries return non-empty data on a fresh boot.

---

## Part GG: Webhooks + actions trackability

### Why Part GG exists

The user's question requires explicit confirmation that every webhook
and action is trackable. This section is the affirmative checklist.

### GG1: Inbound webhooks (provider → us)

| Source | Endpoint | Tracked via |
| ------ | -------- | ----------- |
| SMS providers (12 of them) | `comm-service/v1/webhooks/<provider>` | `provider-webhook-events` Kafka topic (Y0) → DDB CustomerHistory + `comms-events` re-publish |
| Email provider bounces (SES) | `comm-service/v1/webhooks/ses` | `provider-webhook-events` → `comms-events` (`comms.email.bounced` / `complaint`) |
| WhatsApp providers (5) | `comm-service/v1/webhooks/<provider>-whatsapp` | `provider-webhook-events` → `comms-events` |
| VMS providers (4) | `comm-service/v1/webhooks/<provider>-vms` | `provider-webhook-events` → `comms-events` |
| Xcally call-center | `comm-service/v1/webhooks/xcally` | `callcenter-webhook-events` (replaces SNS, Y2) → `comms-events` |
| Twilio Call Bot | `comm-service/v1/webhooks/twilio-callbot` | `provider-webhook-events` → `comms-events` (`comms.callbot.*`) |
| Lago billing | `subscription-service/api/v1/webhooks/lago` | `subscription-events` Kafka topic (X3h) |
| Listmonk postback | `ETB/webhooks/listmonk/postback` | passes through to `comms-events` via comm-svc dispatch |

### GG2: Agent / user actions (UI → backend)

| Action | Origin | Tracked via |
| ------ | ------ | ----------- |
| Login success / failure | CRM/Steward FE | `auth-events` (after X2 wires PublishUserLogin) |
| Permission check on every request | every gateway-protected route | `auth-events` (after X2 wires PublishPermissionCheck) |
| Token refresh | every auto-refresh tick | `auth-events` (after X2 wires PublishTokenRefreshed) |
| OTP validation | login + sensitive actions | `auth-events` (after X2 wires PublishOTPValidated) |
| Password reset request / completion | password-reset flow | `auth-events` (after X2 wires PublishPasswordReset) |
| Rate-limit exceeded | any rate-limited endpoint | `auth-events` (after X2 wires PublishRateLimitExceeded) |
| User CRUD | admin user-management UI | `user-management-events` (X3a) |
| Task assigned / reassigned / completed | CRM agent UI | `user-management-events` (X3a) |
| Campaign initiate / trigger / pause / complete | campaign UI | `campaign-events` (X3b) |
| Workflow start / step / finish | workflow UI + Temporal worker | `workflow-events` (X3c) |
| Settings changed (country / pricing / provider) | admin settings UI | `settings-events` (X3d) |
| Phone-number lookup | every dispatch path's pre-flight check | `mns-events` (X3e) |
| Link click / create / revoke | link-serve | `link-events` (X3f) |
| Segment build / fetch | campaign + workflow audience selection | `segments-events` (X3g) |
| Subscription / invoice lifecycle | Lago webhook → us | `subscription-events` (X3h) |
| Template render | every dispatch | `template-events` (already wired) |
| Template preview | template editor "preview" button | `template-events` (already wired) |
| Template marketplace publish / subscribe / purchase | marketplace UI | `marketplace-billing-events` (Z, already wired) |
| Comm dispatch (SMS / Email / VMS / WhatsApp / CallBot / IVR) | every send path | `comms-events` (already wired) |
| Partner CRUD + approval | partner admin UI | `partner-events` (already wired) |

### GG3: System / scheduled actions

| Action | Schedule | Tracked via |
| ------ | -------- | ----------- |
| Campaign scheduled trigger | cron in workflow-engine | `campaign-events` (X3b) `PublishCampaignTriggered` |
| Subscription renewal cycle | Lago billing cron | `subscription-events` (X3h) `PublishSubscriptionRenewed` + `marketplace-billing-events` `template.renewed` (Z) |
| Bounce blocklist sweep | nightly cron in ETB | `comms-events` (`comms.email.bounced` already wired) |
| Stale Xcally lock cleanup | per-request TTL check | log-only by design (no event needed) |
| Health probes | every k8s pod | log-only (no business value in tracking) |
| ClickHouse TTL sweep | daily | log-only |

---

## Part HH: 100% completion checklist

The user asked for an explicit YES/NO confirmation that the plan delivers
100% completeness. This section is that checklist.

### HH1: Messaging — all SQS/SNS replaced with Kafka (MSK)

- [ ] Every file in Part Y1b's table is migrated.
- [ ] Provider-webhook ingest goes through Kafka (Y0).
- [ ] Lago alert SNS in Lambda is swapped or replaced with CloudWatch alarm.
- [ ] ETB SNS verifier deleted; bounce handler consumes from Kafka.
- [ ] Every `sqs.SendMessage` call in the monorepo is gone (verified via
      `grep -rn "sqs.SendMessage" --include='*.go'` returns empty).
- [ ] Every `sns.Publish` call in the monorepo is gone.
- [ ] Every `*_QUEUE_URL` env var is removed from `.env.example` files.
- [ ] AWS MSK topics provisioned per AA1; per-org ACLs per CC5.

### HH2: Events — every service emits and every event is consumed

- [ ] All 13 services in Part X1 have a producer wired (currently 5 do).
- [ ] Auth-service publishes all 11 events (currently 2/11).
- [ ] `mapEventToMetric` covers all 14 dropped comms events plus
      login-failed plus partner approval (X4b).
- [ ] go-commons producer defaults match deployed topic names (X4c).
- [ ] go-commons producer uses `Hash{}` balancer for state-transition
      topics (X4d).
- [ ] Subscription-service consumer-config list covers all 12+ topics
      (X4).

### HH3: Storage — Kafka, ClickHouse, DDB, PostgreSQL all integrated

- [ ] Every event lands in Kafka (producer side).
- [ ] Every event lands in ClickHouse (subscription-service ClickHouseConsumer).
- [ ] Comms-service dispatch events land in DDB CustomerHistory (already wired).
- [ ] ClickHouse repartitioned by org for per-org analytics (CC6).
- [ ] PostgreSQL audit logs stream to Kafka `audit-events` then to ClickHouse.
- [ ] DDB streams continue to fan out aggregations within comm-service.

### HH4: Subscription-service — billing pipeline complete

- [ ] MarketplaceBillingConsumer runs in worker (DELIVERED in Phase Q).
- [ ] All 14 dropped comms events are mapped to billable / non-billable
      metrics in `mapEventToMetric` (X4b).
- [ ] Every Lago webhook event publishes a `subscription-events` Kafka
      message (X3h).
- [ ] Per-org Kafka quota + ClickHouse partition isolation enforced (CC5/CC6).
- [ ] Per-event metric code is registered in Lago (X5 + FF4).

### HH5: Channels / providers / sources / templates

- [ ] All 11 canonical sources accepted across every validator (DELIVERED
      in Phase Q).
- [ ] All 7 channels (SMS / EMAIL / VMS / CALL_BOT / CHAT / IVR /
      INSTANT_MESSAGING) covered by Parts A-J.
- [ ] Every provider has a seeder entry (FF3).
- [ ] Email templates only created in ETB; referenced via `etb_template_id`
      pointer in content-templates (DELIVERED in Phase Q).
- [ ] Marketplace publish / subscribe / purchase / list endpoints live
      (DELIVERED in Phase Q).
- [ ] Marketplace pricing on publish (DELIVERED in Phase Q).

### HH6: Cross-org scalability

- [ ] No DB query without `organization_id` filter (CC1 + audit).
- [ ] No Kafka topic without `Hash{}` balancer for ordered topics (CC2).
- [ ] No middleware that bypasses auth checks (CC3).
- [ ] No DynamoDB Scan without GSI for read-heavy paths (CC4).
- [ ] Per-org Kafka quotas + ACLs (CC5).
- [ ] ClickHouse partitioned by `(month, org_id)` (CC6).
- [ ] Per-org producer rate-limit (CC7).

### HH7: Frontends — both CRM and Steward fully wired

- [ ] Steward Campaign wizard parity with CRM (Part F).
- [ ] Steward Workflow builder (Part K).
- [ ] Marketplace UI on both (Part L).
- [ ] DynamicForm + shared QueryBuilder (Part L3 + E5).
- [ ] Permission-denied modal explains the missing permission (Part L).
- [ ] All net-new UI strings + dropdown options seeded (FF6).

### HH8: Governance + observability

- [ ] Idempotency-Key middleware on every mutating endpoint (Q1).
- [ ] Audit log written for every action (Q2).
- [ ] OpenTelemetry + Prometheus + Sentry on every service (Q3).
- [ ] Error-code catalogue per Part P with namespaced codes.
- [ ] All warnings (markdownlint, SonarLint, golangci-lint, eslint)
      resolved on touched files per the zero-tolerance rule.

### HH9: Final answer

If every checkbox in HH1–HH8 is ticked and every test in BB1–BB3 passes,
**then yes** — by the time this plan is fully executed:

1. Every SQS / SNS use case is replaced with AWS MSK Kafka.
2. Every event, webhook, and action is trackable from every service via
   Kafka → ClickHouse (analytics) + Lago (billing) + DDB (transactional
   where applicable).
3. Every seeder is enriched with the new metric codes, plans, providers,
   permissions, and topics.
4. subscription-service, Kafka, ClickHouse, DDB, and Lago are all fully
   integrated.
5. Every channel × provider × source × template combination is wired
   end-to-end.
6. Cross-organization scalability is hardened (no IDOR, no broken
   partitioning, no rate-limit bypass, no full-table scans, no
   cross-org data leak).
7. Both CRM-FE and Steward-FE have full feature parity.

**Until every checkbox is ticked, the answer is "no, not yet" — this plan
defines the work, and Part EE phasing is the ordered path to ticking
them all.**

---

## Part II: Frontend completeness — CRM-FE + Steward-FE for every service and domain

### Why Part II exists

The user asked for explicit confirmation that every service surface and
every domain has a working frontend on both CRM-FE (Vuetify) and
Steward-FE (Element Plus). This section is the per-feature map and the
gap inventory.

### II1: Domain matrix

The platform has two product domains today:

- **CRM domain** — debt-collection product. Frontend: CRM-FE
  (`https://crm.bfree.io`). Vuetify-based Vue 3 SPA.
- **Admin domain** — platform / steward product. Frontend: Steward-FE
  (`https://app.thesteward.io`). Element Plus-based Vue 3 SPA.

Some users have access to both domains (multi-domain accounts); the
backend's `/auth/validate` returns the union of permissions across
domains and the frontend renders the appropriate domain-scoped UI based
on the active domain selector.

### II2: Per-service frontend coverage matrix

Legend: ✅ wired in current code; 🚧 needs work per Part letter.

| Service | CRM-FE | Steward-FE | Notes |
| ------- | ------ | ---------- | ----- |
| auth-service | ✅ login + permissions + role assignment | ✅ login + permissions + role assignment | Both surfaces consume `/auth/validate`. |
| user-management-service | ✅ agent CRUD + task assignment | 🚧 Part L2 missing pages | Steward needs invite modal + role + country assignment + welcome email preview. |
| communication-service (provider settings) | ✅ admin/dialog/settings/CommunicationSettingsDialog.vue | ✅ Settings/view/CommunicationsView.vue | Add `webhook_secret` + `test_voice_name` fields per A4. |
| comm-svc dispatch (agent send / campaign send / workflow send) | ✅ MessageCampaigns + WorkflowBuilder | 🚧 Part F (campaigns) + Part K (workflows) — needs full build | Steward needs both modules from scratch. |
| comm-svc CALL_BOT script editor | 🚧 Part D3 — new component CallBotScriptEditor.vue | 🚧 Part E2 — Element-Plus equivalent | Both frontends need a visual step builder. |
| template-engine (content templates) | ✅ ContentTemplates.vue | ✅ ContentTemplates/view/* | Both already consume the same endpoints. |
| ETB email template editor | ✅ TemplateFormView.vue | ✅ TemplateFormView.vue | Email-only authoring; both use the same backend. |
| Marketplace template gallery (Phase Q) | 🚧 needs new tab in ContentTemplates listing MARKETPLACE | 🚧 needs new tab in ContentTemplates listing MARKETPLACE | Buttons: Subscribe, Publish (admin-only), View pricing. |
| Marketplace publish dialog | 🚧 new component CRM | 🚧 new component Steward | Pricing form with currency / billing-model dropdown + price input. |
| Marketplace subscribed templates view | 🚧 new "Subscribed" tab CRM | 🚧 new "Subscribed" tab Steward | Reads `GET /email-templates/subscriptions`. |
| message_campaign_service | ✅ MessageCampaigns/CreateMessageCampaigns.vue | 🚧 Part F — full build | Steward Campaign module is the largest gap. |
| bfree-temporal-workflow-engine | ✅ WorkflowBuilder/* | 🚧 Part K — full build | Steward Workflow module is the second-largest gap. |
| setting-service (org settings, country mgmt) | ✅ admin/settings/* | ✅ Settings/view/* | Both wired; Part L1 + L2 add bulk actions + modals. |
| subscription-service / Lago | ✅ admin/subscription/* (read-only billing) | ✅ Settings/Subscription/view/* | Both consume Lago analytics endpoints. |
| partner-service | ✅ admin/partners/* | ✅ Settings/Partners/view/* | Both wired; partner approval workflow on each. |
| mobile-number-statuses (mns) | ✅ phone validation hidden behind comm-svc dispatch | ✅ same | No standalone UI; mns runs as a backend pre-flight check. |
| link-serve | ✅ embedded in comm-svc message preview | ✅ embedded | No standalone UI; link-shortening is a transparent backend service. |
| data-segments-api | ✅ used by Campaign + Workflow segment builders | 🚧 Part E5 — Steward segment builder needs the shared QueryBuilder component | Steward Campaigns/Workflows are gated on Part E5 landing first. |
| Audit log + observability | 🚧 Part L1 — admin/audit page on CRM | 🚧 Part L2 — admin/audit page on Steward | New admin-only screens. |

### II3: Cross-domain features (both CRM AND Steward expose)

- Login + permission-aware navigation (the shell loads the same
  `/me` endpoint and conditionally renders nav items).
- Content template library (filters by channel / source / type /
  visibility / paid).
- Send-as-agent flow (one-off SMS / email from agent UI).
- Campaign creation wizard (after Part F lands on Steward).
- Workflow builder (after Part K lands on Steward).
- Marketplace publish + subscribe (after Phase Q UI work).
- Settings → Communications → provider credential CRUD.
- Settings → Country management.
- Notifications inbox (in-app notifications driven by `auth-events` and
  `user-management-events` → BFF → SSE to frontend).
- Profile + password reset.
- Org switcher (for users in multiple orgs).

### II4: Domain-only features

**CRM-only**:

- Customer 360 view + collection cases.
- Agent task queue + reassignment.
- PTP / promise-to-pay capture.
- Loan ledger snapshot (read-only).
- Inbound call → agent screen-pop (Xcally agent integration).

**Steward-only**:

- Org admin (cross-org view for platform-org users).
- Marketplace template publishing (admin-only action).
- Lago billing dashboards.
- Provider catalogue (cross-org).
- Country / pricing rule editing (platform-only).
- Audit log viewer (cross-org for platform-root, scoped for org-admin).

### II5: Frontend gaps — explicit work to do per frontend

#### CRM-FE (`crm-fe/`)

Files to add or modify:

| Path | Change | Driver |
| ---- | ------ | ------ |
| `src/utils/constants.ts` | Add `webhook_secret` + `twilio_voice` + new sources to dropdowns | A4 + D1 |
| `src/components/admin/dialog/CallBotScriptEditor.vue` | NEW visual flow editor | D3 |
| `src/components/admin/dialog/MarketplacePublishDialog.vue` | NEW — pricing form for marketplace publish | Z + Phase Q |
| `src/views/admin/pages/ContentTemplates.vue` | Add Marketplace + Subscribed tabs | Z + Phase Q |
| `src/views/admin/pages/MessageCampaigns/CreateMessageCampaigns.vue` | Add CALL_BOT channel option + EMAIL via unified API | D4 + H6 |
| `src/views/admin/pages/WorkflowBuilder/ActionSideDisplay.vue` | Add Call Bot script selector | D2 |
| `src/views/admin/pages/audit/AuditLog.vue` | NEW page | L1 |
| `src/components/admin/dialog/PermissionDeniedDialog.vue` | NEW modal | L1 |

#### Steward-FE (`steward-fe/`)

Files to add or modify:

| Path | Change | Driver |
| ---- | ------ | ------ |
| `src/features/Settings/type/index.ts` | Add `webhook_secret` + `twilio_voice` + new sources | A4 + E1 |
| `src/features/Settings/view/CommunicationsView.vue` | Add `twilio_voice` logo + `test_voice_name` field | E1 |
| `src/features/ContentTemplates/view/TemplateFormView.vue` | Add Call Bot script editor for CALL_BOT channel | E2 |
| `src/features/ContentTemplates/view/MarketplaceTab.vue` | NEW — marketplace gallery | Phase Q |
| `src/features/ContentTemplates/view/SubscribedTab.vue` | NEW — subscribed templates view | Phase Q |
| `src/features/ContentTemplates/components/MarketplacePublishDialog.vue` | NEW | Phase Q |
| `src/shared/components/QueryBuilder/SegmentationBuilder.vue` | NEW — Element Plus port of the CRM segment builder | E5 |
| `src/shared/components/RecurrenceRulePicker.vue` | NEW — schedule picker | F |
| `src/shared/components/TemplateLibrary.vue` | NEW — channel-aware template picker | F |
| `src/shared/components/DynamicForm.vue` | NEW — schema-driven form | L3 |
| `src/shared/components/DataTable.vue` | NEW — filter + paginate + bulk actions wrapper | L3 |
| `src/shared/components/Toasts.ts` | NEW — consistent toast helper | L3 |
| `src/shared/components/ConfirmDialog.vue` | NEW | L3 |
| `src/shared/components/PermissionDeniedDialog.vue` | NEW | L2 |
| `src/features/Campaigns/` | NEW — full module per Part E3 + Part F | E3 + F |
| `src/features/Workflows/` | NEW — full module per Part E4 + Part K | E4 + K |
| `src/features/UserManagement/view/InviteUserDialog.vue` | NEW invite modal with role + country + welcome email preview | L2 |
| `src/features/Audit/view/AuditLogView.vue` | NEW audit log viewer | L2 |
| `src/features/Maintenance/components/MaintenanceBanner.vue` | NEW system-wide notice banner | L2 |

#### Both frontends — shared tooling

- Centralised event bus in each frontend for in-app notifications driven
  by SSE from a new `notification-stream` BFF endpoint that consumes
  `auth-events`, `user-management-events`, `campaign-events`,
  `workflow-events`, `subscription-events` and pushes filtered events
  to the active user's session.
- Centralised analytics reporter that POSTs frontend-side actions
  (page views, button clicks, errors) to a `frontend-events` Kafka
  topic via a thin BFF endpoint — closes the loop on "every action is
  trackable".

### II6: Frontend verification checklist

- [ ] Every user-facing route loads without errors on both CRM-FE and
      Steward-FE.
- [ ] Every form posts the correct payload (validated against backend
      DTO via integration tests).
- [ ] Every paginated list scrolls and respects 10000-row cap.
- [ ] Every permission-gated button hides/disables based on
      `/me.permissions`.
- [ ] Permission-denied flow shows a modal explaining the missing
      permission, not a generic 403 toast.
- [ ] Every async action shows a toast on completion (no silent success).
- [ ] Every long-running upload (campaign CSV) shows a progress bar
      driven by the polling endpoint.
- [ ] Every audit-loggable action emits a `frontend-events` Kafka
      message via the BFF endpoint.
- [ ] Both frontends pass `pnpm lint` and `pnpm test:unit` with zero
      warnings (markdownlint, ESLint, SonarLint, type-check).
- [ ] Both frontends pass `pnpm build` with zero errors.
- [ ] Both frontends covered by Playwright E2E for the marketplace flow:
      publish → list → subscribe → use cloned template in campaign.

### II7: Final answer — frontends fully working?

If every box in II6 is ticked AND every "🚧" cell in II2 is migrated to
"✅" via the Part D / E / F / K / L / Phase Q work AND the verification
runs in BB2 / BB3 pass against both `crm.bfree.io` and `app.thesteward.io`,
**then yes** — every frontend flow is fully working on both CRM-FE and
Steward-FE for every service and domain.

Until those gaps close, the honest answer is "no, not all flows yet". The
Phase EE rollout is the ordered path to closing them.

---

## Part JJ: Local development infrastructure setup

### Why Part JJ exists

The plan to date assumes engineers already have Temporal, MSK Kafka, Lago,
ClickHouse, Listmonk, Redpanda, Mailpit, every PostgreSQL DB and every
seeded row running locally. They don't, and the project-level CLAUDE.md
docker-compose only covers Redpanda / ClickHouse / Redis / LocalStack —
no Temporal, no Lago, no Listmonk, no per-service DB bootstrap. This
section is the explicit local-infra setup for every component.

### JJ1: docker-compose.local.yml additions

Beyond the existing Redpanda + ClickHouse + Redis + LocalStack, add:

| Container | Image | Port | Purpose |
| --------- | ----- | ---- | ------- |
| temporal-postgres | postgres:15-alpine | 5433 | Temporal's own DB (separate from app DBs) |
| temporal | temporalio/auto-setup:1.24 | 7233 | Temporal Server |
| temporal-ui | temporalio/ui:2.27 | 8233 | Temporal Web UI |
| lago-api | getlago/api:v1.38.0 | 3000 | Lago billing API |
| lago-frontend | getlago/front:v1.38.0 | 8080 | Lago admin UI |
| lago-postgres | postgres:15-alpine | 5434 | Lago's DB |
| lago-redis | redis:7-alpine | 6380 | Lago's Redis (separate to avoid key collisions) |
| listmonk | listmonk/listmonk:v3.0.0 | 9000 | Listmonk for ETB email campaigns |
| listmonk-postgres | postgres:15-alpine | 5435 | Listmonk's DB |
| mailpit | axllent/mailpit:v1.20 | 1025 (SMTP), 8025 (UI) | Catches outbound SES/SendGrid emails locally |
| keycloak | quay.io/keycloak/keycloak:26.0 | 8180 | OIDC provider (used by some integration tests) |
| sentry-relay | getsentry/relay:25.0 | 3001 | Sentry Relay for local error reporting |

### JJ2: PostgreSQL databases to provision

A single local Postgres instance (port 5432) hosts every service DB. The
bootstrap script must `CREATE DATABASE` for each:

```text
auth_service              # auth-service
partner_service           # partner-service
subscription_service      # subscription-service
template_engine           # template-engine
ETB                       # Email-Template-Builder backend
user_management           # user-management-service
message_campaign          # message_campaign_service (DDB-backed for jobs but PG for metadata)
setting_service           # setting-service
report_submission         # report-submission-service
mns                       # mobile-number-statuses (Node service, but DB is PG)
link_serve                # link-serve
data_segments             # data-segments-api (Python, but PG for cache)
workflow_engine           # bfree-temporal-workflow-engine (workflow definitions)
lago_dev                  # lago-api primary
lago_events_dev           # lago-api events (separate per Lago architecture)
keycloak                  # keycloak realm storage
```

Plus separate Postgres instances for Temporal and Listmonk per JJ1
(those products require dedicated DBs).

### JJ3: Goose migration runner

A single shell script `scripts/migrate-all-dbs.sh` runs every service's
goose migrations in order:

```bash
#!/usr/bin/env bash
set -euo pipefail

services=(
  "auth-service"
  "partner-service"
  "subscription-service"
  "template-engine"
  "Email-Template-Builder/backend"
  "user-management-service/api"
  "message_campaign_service"
  "setting-service"
  "report-submission-service"
  "mobile-number-statuses"
  "link-serve/apps/api"
  "bfree-temporal-workflow-engine"
)

for svc in "${services[@]}"; do
  echo "Running migrations for $svc"
  cd "/Users/APPLE/BFREE-Africa/$svc"
  if [ -d "migrations" ]; then
    goose -dir migrations postgres "$(cat .env | grep ^DATABASE_URL | cut -d= -f2-)" up
  fi
  cd -
done

# ClickHouse migrations
cd /Users/APPLE/BFREE-Africa/subscription-service
goose -dir migrations/clickhouse clickhouse "$(cat .env | grep ^CLICKHOUSE_DSN | cut -d= -f2-)" up
```

### JJ4: Seed runner

After migrations, run seeders in order:

```bash
auth-service/cmd/seed              # roles + permissions
setting-service/cmd/seed           # countries + plans
partner-service/cmd/seed           # default partners
communication-service/cmd/seed-providers  # provider entries
template-engine/cmd/scripts/test-resolution  # template-types
Email-Template-Builder/backend/cmd/seed     # email templates
subscription-service/cmd/seed       # Lago plans + billable metrics
mobile-number-statuses/cmd/seed     # operator catalogue
```

### JJ5: Kafka topic auto-create

Redpanda auto-create is on by default, but for parity with MSK in
production we explicitly create every topic at startup:

```bash
TOPICS=(
  auth-events
  comms-events
  template-events
  partner-events
  marketplace-billing-events
  user-management-events
  campaign-events
  workflow-events
  settings-events
  mns-events
  link-events
  segments-events
  subscription-events
  audit-events
  comms-dispatch-events
  template-render-requests
  template-render-results
  template-render-requests-dlq
  workflow-trigger-events
  campaign-schedule-events
  callcenter-webhook-events
  provider-webhook-events
  ptp-events
  frontend-events
  notification-stream
)
for topic in "${TOPICS[@]}"; do
  rpk topic create "$topic" --partitions 6 --replicas 1
done
```

### JJ6: Lago bootstrap

Lago needs:

1. An organization created (via `POST /api/v1/organizations`).
2. A billable metric per Part X5 / FF4 (loop the seeder script).
3. Plans + features registered.
4. An API key issued (saved into LocalStack secret + every consuming
   service's `.env`).

`subscription-service/cmd/seed/lago_bootstrap.go` already handles items 1-3
(per memory). Item 4 is a one-off manual step documented in the Lago
admin UI.

### JJ7: Listmonk bootstrap

Listmonk needs:

1. Admin user + password created on first boot (`/admin/login`).
2. A messenger entry pointing at ETB's postback URL
   (`http://etb:8084/webhooks/listmonk/postback`).
3. SES SMTP credentials populated (point to Mailpit on `:1025`).
4. A default list created so seeded campaigns have a target.

ETB has `internal/service/listmonk_bootstrap.go` (per memory) that
handles steps 2-4 idempotently on every boot. Step 1 is one-off.

### JJ8: Service start-order

```text
1. docker compose up -d (containers from JJ1)
2. wait-for-it.sh on Postgres / ClickHouse / Redis / Kafka / Temporal / Lago
3. scripts/migrate-all-dbs.sh
4. scripts/seed-all.sh (per JJ4)
5. scripts/create-kafka-topics.sh (per JJ5)
6. ./bin/auth-service &  (and every other service in dep order — Part J5 in main project CLAUDE.md)
7. cd crm-fe && pnpm dev &
8. cd steward-fe && pnpm dev &
```

### JJ9: Health check endpoints

Every service exposes `/health` (liveness) + `/ready` (deps reachable).
The orchestration script polls `/ready` on every service before kicking
off the next dependent service.

### JJ10: Test data fixtures

`scripts/seed-test-data.sh` populates:

- 2 organizations (`org-platform-uuid`, `org-tenant-uuid`).
- 3 users per org with different role/permission combinations.
- 5 customers per tenant org.
- 1 paid + 1 free marketplace template per channel.
- 1 active campaign + 1 scheduled campaign per channel.
- 1 multi-step workflow with branching.
- 1 subscription per org with a usage history.

Used for both manual QA and Playwright E2E tests.

---

## Part KK: Per-service comprehensive implementation plan

### Why Part KK exists

The plan must touch every service, not just the four already touched
(comm, template-engine, ETB, subscription-service). This section
enumerates the work for each remaining service.

### KK1: auth-service

| Concern | Status | Action |
| ------- | ------ | ------ |
| Kafka producer for 9 dead methods | partial | Wire per X2 |
| `mapEventToMetric` mapping for `auth.user.login.failed` | broken | Add per X4b |
| SQS email send (`EMAIL_QUEUE_URL`) | active | Migrate to Kafka per Y1b |
| Per-org Kafka quota provisioning hook | missing | Add at org-creation per CC5 + FF1 |
| Per-org rate limit on auth endpoints | partial | Verify + extend per CC7 |
| New permissions seed (9 new perms) | missing | Add per FF1 |
| Stash port (`_stash_port/`) | redundant | Delete after diffing for any genuine changes (none found per audit) |

### KK2: go-commons

| Concern | Status | Action |
| ------- | ------ | ------ |
| Producer default topic names use `usage-` prefix | broken | Drop prefix per X4c |
| Producer balancer ignores key for ProfileStandard | broken | Fix per X4d / CC2 |
| Per-org producer rate limiter | missing | Add per CC7 |
| Consumer DLQ helper | missing | Add for parity with producer |
| Audit-log writer helper (Q2) | missing | Add `pkg/audit/` |
| Idempotency middleware (Q1) | missing | Add `pkg/idempotency/` |
| OpenTelemetry init | partial | Verify init covers every service per Q3 |

### KK3: subscription-service

| Concern | Status | Action |
| ------- | ------ | ------ |
| MarketplaceBillingConsumer | DELIVERED in Phase Q | nil |
| `SendBillableEvent` on Lago | DELIVERED | nil |
| ClickHouseConsumer extension for new topics | missing | Add per X4 |
| `mapEventToMetric` repair (16 dropped events) | missing | Add per X4b |
| Outbound `subscription-events` Kafka topic | missing | Add per X3h |
| ClickHouse repartition by org | missing | Add per CC6 |
| Per-org analytics rate limiter bypass | broken | Fix per CC3 |
| Per-org Kafka quota provisioning | missing | Provision via terraform per CC5 |
| Lago plan/metric seeds | missing | Add per FF4 |

### KK4: lago-api

Lago is a vendored OSS service consumed via REST + webhooks. We don't
fork it, but we do:

| Concern | Status | Action |
| ------- | ------ | ------ |
| Per-environment plan + metric seed | missing | Run subscription-service seeder per FF4 |
| Webhook signing key rotation | manual | Add to `bytebase-cluster/terraform/secrets.tf` |
| HA mode in production | not configured | Add Lago Helm values for replicas + DB read-replica |
| Local docker setup | missing | Add to `docker-compose.local.yml` per JJ1 |

### KK5: bytebase-cluster (DB schema management)

| Concern | Status | Action |
| ------- | ------ | ------ |
| New migration registration | manual | Add Bytebase project entry for every new migration in DD6 |
| ClickHouse repartition migration | new | Register `003_repartition_events_by_org.sql` per CC6 |
| Per-org schema quota | missing | Configure max-tables-per-org alert |

### KK6: mobile-number-statuses (mns)

| Concern | Status | Action |
| ------- | ------ | ------ |
| Kafka producer | missing | Build per X3e |
| Lookup events emitted | missing | Wire 5 publish methods at every lookup completion |
| Replace SQS audit calls (none currently) | n/a | nil |
| Frontend integration | already transparent | Verify on every comm-svc dispatch path |
| Local docker setup | partial | Add health probe + auto-start to `docker-compose.local.yml` |

### KK7: link-serve

| Concern | Status | Action |
| ------- | ------ | ------ |
| Kafka producer (TypeScript) | missing | Build per X3f |
| `link.created/clicked/expired/revoked` events | missing | Wire 4 publish methods |
| Frontend integration | transparent | Comm-svc auto-shortens URLs in messages |
| Local docker setup | partial | Verify env vars + Kafka broker reachable |
| Cross-org isolation in click tracking | partial | Verify org_id is propagated through every redirect |

### KK8: data-segments-api

| Concern | Status | Action |
| ------- | ------ | ------ |
| Kafka producer (Python `confluent-kafka-python`) | missing | Build per X3g |
| `segment.built/failed/query_executed` events | missing | Wire 3 publish methods |
| Auth (JWT) on every endpoint | broken (G-11) | Fix per Part R |
| Parameterized SQL (G-07) | broken | Fix per Part R |
| Page-size cap (G-08, G-09) | broken | Fix per Part R |
| `POST /fetch` for cross-service consumption | missing | Add per G4 |
| Local docker setup | partial | Add Postgres connection + Kafka broker env |

### KK9: report-submission-service

| Concern | Status | Action |
| ------- | ------ | ------ |
| `partner` repo missing org_id filter (CC1) | broken | Fix per CC1 |
| SQS queues (TEMPLATE_ENGINE_QUEUE_URL, PTP_STREAM_QUEUE_URL) | active | Migrate per Y1b |
| Kafka producer | missing | Build to publish to `comms-dispatch-events` + `ptp-events` per Y1b |
| Local docker setup | partial | Verify .env |

### KK10: setting-service

| Concern | Status | Action |
| ------- | ------ | ------ |
| Kafka producer | missing | Build per X3d |
| 6 publish methods at every settings mutation | missing | Wire per X3d |
| SQS template-engine queue | active | Migrate per Y1b |
| Per-org country / plan management UI | partial | Extend per L1 + L2 |
| Cross-domain settings UI | partial | Both CRM-FE + Steward-FE need same surface (see II) |

### KK11: user-management-service

| Concern | Status | Action |
| ------- | ------ | ------ |
| Kafka producer | missing | Build per X3a |
| 8 publish methods | missing | Wire at every state transition |
| SQS audit + worker queues | active | Migrate per Y1b |
| Frontend (Steward) | partial | Build invite modal + role + country assignment per L2 |
| Frontend (CRM) | already wired | Verify parity |

### KK12: message_campaign_service

| Concern | Status | Action |
| ------- | ------ | ------ |
| Kafka producer | missing | Build per X3b |
| `GetByID` IDOR vulnerability (CC1) | critical | Fix immediately |
| SQS workflow + scheduler queues | active | Migrate per Y1b |
| Steward frontend wizard | partial | Build per Part F |
| EMAIL channel routing through ETB Listmonk | partial | Wire per H3 |

### KK13: bfree-temporal-workflow-engine

| Concern | Status | Action |
| ------- | ------ | ------ |
| Kafka producer | missing | Build per X3c |
| 9 publish methods at activity outcomes | missing | Wire per X3c |
| SQS dispatch endpoints | active | Migrate per Y1b |
| Local Temporal setup | missing | Add to `docker-compose.local.yml` per JJ1 |
| DSL validator | partial | All 11 sources accepted (DELIVERED in Phase Q) |
| Steward frontend builder | missing | Build per Part K |

### KK14: communication-service

| Concern | Status | Action |
| ------- | ------ | ------ |
| Kafka producer | DELIVERED | nil |
| Provider-webhook ingest via Kafka | missing | Migrate per Y0 |
| SQS dispatch / SNS callcenter | active | Migrate per Y1b + Y2 |
| All providers seeded | partial | Extend per FF3 |
| Per-domain provider credentials | partial | Verify `allowed_domains` enforcement |
| Per-channel + per-source rate limiting | partial | Verify per CC7 |
| Provider-binding metadata for templates | DELIVERED in Phase Q template-engine work | nil |

### KK15: template-engine

| Concern | Status | Action |
| ------- | ------ | ------ |
| Kafka producer | DELIVERED | nil |
| All 11 sources accepted | DELIVERED in Phase Q | nil |
| ETB email mirror endpoint | DELIVERED in Phase Q | nil |
| Marketplace publish/subscribe | DELIVERED in Phase Q | nil |
| SQS render in/out queues | active | Migrate per Y1b |
| Per-org template quota | missing | Add per CC5 |
| Per-domain template type catalogue | partial | Seed per I1 |

### KK16: Email-Template-Builder (ETB)

| Concern | Status | Action |
| ------- | ------ | ------ |
| Marketplace publish/subscribe | DELIVERED in Phase Q | nil |
| MarketplaceBillingPublisher Kafka | DELIVERED | nil |
| 11 canonical sources accepted | DELIVERED | nil |
| Listmonk pass-through campaign creation | partial | Reach 100% feature parity per Part NN |
| SNS bounce ingest | active | Migrate to Kafka `comms-events` filter per Y2 |
| Frontend: marketplace gallery + subscribe button | missing | Build per Phase Q UI work + II5 |
| Per-org template quota | missing | Add per CC5 |

### KK17: crm-fe

| Concern | Status | Action |
| ------- | ------ | ------ |
| Marketplace gallery tab | missing | Build per II5 |
| Marketplace publish dialog | missing | Build per II5 |
| Subscribed templates tab | missing | Build per II5 |
| CALL_BOT script editor | missing | Build per D3 |
| Permission-denied modal | missing | Build per L1 |
| Audit log viewer | missing | Build per L1 |
| `frontend-events` instrumentation | missing | Add per II5 |

### KK18: steward-fe

| Concern | Status | Action |
| ------- | ------ | ------ |
| Campaigns module | missing | Build per Part F + E3 |
| Workflows module | missing | Build per Part K + E4 |
| Marketplace gallery + Subscribed tab | missing | Build per II5 |
| Shared QueryBuilder (Element Plus port) | missing | Build per E5 |
| RecurrenceRulePicker | missing | Build per F |
| TemplateLibrary picker | missing | Build per F |
| DynamicForm | missing | Build per L3 |
| DataTable / ConfirmDialog / Toasts | missing | Build per L3 |
| PermissionDeniedDialog | missing | Build per L2 |
| Audit log viewer | missing | Build per L2 |
| Maintenance banner | missing | Build per L2 |
| Invite user modal | missing | Build per L2 |
| `frontend-events` instrumentation | missing | Add per II5 |

---

## Part LL: Email provider full implementation matrix

### Why Part LL exists

The earlier matrix listed only "SES, SendGrid, Listmonk". The platform
actually supports four primary providers plus Listmonk as a bulk wrapper.
Each needs the same depth of integration work as the SMS provider matrix
in Part J.

### LL1: Provider matrix

| Provider | Type | Template binding | Webhook events | Rate limit / quota | Local-dev fallback |
| -------- | ---- | ---------------- | -------------- | ------------------ | ------------------ |
| AWS SES | SaaS | inline HTML (full body in dispatch) | Bounce / complaint via SNS → Kafka per Y2 | 14 emails/sec default; per-account quota | Mailpit on `:1025` |
| SendGrid | SaaS | dynamic templates by SendGrid template ID; variables passed in request | Webhook POST → comm-svc `/v1/webhooks/sendgrid` → `provider-webhook-events` | 100 emails/sec default | Mailpit + SendGrid mock harness |
| Sinch Email | SaaS | dynamic templates by Sinch template ID | Webhook POST → comm-svc `/v1/webhooks/sinch-email` → `provider-webhook-events` | per-tier; configurable | Mailpit + Sinch mock |
| Bird Email | SaaS | dynamic templates by Bird template ID | Webhook POST → comm-svc `/v1/webhooks/bird-email` | per-tier | Mailpit + Bird mock |
| Listmonk | OSS bulk | wraps SES or SendGrid; templates stored in Listmonk via ETB sync | Postback POST → ETB `/webhooks/listmonk/postback` → `comms-events` | constrained by upstream provider | Listmonk container per JJ1 |

### LL2: Per-provider implementation work

For each provider, the implementation includes:

1. **Provider integration package** — `comm-service/internal/communication/email/<provider>.go`
   with the SDK client, send method, webhook handler, signature verifier.
2. **Validator entry** — `internal/communication/validator.go::validateEmailProvider`
   already accepts SES / SendGrid / Sinch / Bird (per code grep). Verify.
3. **Provider seed** — `cmd/seed-providers/main.go` adds an entry per
   provider with default credentials structure + test contact + allowed
   sources.
4. **Frontend constants** — `crm-fe/src/utils/constants.ts` and
   `steward-fe/src/features/Settings/type/index.ts` list the provider
   fields per Part D1 / E1.
5. **Provider settings dialog** — admin UI form per provider with
   credential fields + test-send button.
6. **Per-provider rate limiter** — token bucket sized per provider
   capability (SES 14/sec, SendGrid 100/sec, etc.).

### LL3: Domain × email provider mapping

| Domain | Default provider | Fallback chain |
| ------ | ---------------- | -------------- |
| CRM | SES | SendGrid → Sinch Email → Bird Email |
| Admin (platform) | SES | SendGrid (for transactional with templates) |
| MARKETING source | Listmonk via SES | Listmonk via SendGrid |
| TRANSACTIONAL source | SES | SendGrid (template binding) |

Per-org override stored in `provider_credentials.priority` so an org can
prefer a specific provider for compliance / cost reasons.

### LL4: Template-binding flow per provider

For SES + Listmonk: ETB renders the full HTML body via template-engine,
post-render handed to comm-svc `POST /v1/dispatch`, comm-svc passes raw
HTML to SES.

For SendGrid / Sinch / Bird: ETB stores the provider's template ID in
`content_templates.provider_bindings.<provider>.template_id`. comm-svc
detects the binding at dispatch and passes the template ID + variables
to the provider's API instead of the rendered HTML. This avoids
double-rendering when the provider has its own template engine.

When publishing a template that should support multiple providers, the
publisher uploads to each provider's API and stores all returned IDs in
`provider_bindings`.

---

## Part MM: VMS provider full implementation alongside template flows

### Why Part MM exists

The user flagged that VMS providers must be implemented alongside the
template creation flow — i.e. a template author should be able to create
a VMS template and have it work end-to-end with every supported VMS
provider, without per-provider quirks leaking into the editor UI.

### MM1: VMS provider matrix

| Provider | Endpoint | TTS engine | Voice variants | Webhook |
| -------- | -------- | ---------- | -------------- | ------- |
| Infobip VMS | `/tts/3/advanced` | Infobip-managed | per-language voice picker | `notifyUrl` per call |
| Plivo Voice | `/v1/Account/{sid}/Call/` | Plivo TTS | Plivo voice list | `callback_url` |
| Vonage Voice | `/v1/calls` | Vonage NCCO TTS | Vonage voice list | `event_url` |
| Twilio Voice | `/2010-04-01/Accounts/{sid}/Calls.json` | Twilio TTS via TwiML or external URL | Twilio voice list (`Polly.*` and others) | `StatusCallback` |

### MM2: Template creation flow integration

The template editor (CALL_BOT for Twilio, plain VMS for the others)
must let authors:

1. Pick the **voice name** from a dropdown that's filtered by the active
   org's available providers (e.g. "if Twilio is configured for this
   org, show `Polly.*`; if Infobip is configured, show Infobip's
   voices").
2. Pick the **language** with the same filtering.
3. Pick the **machine-detection** mode (Twilio + Infobip support `Enable`
   / `DetectMessageEnd`; Plivo + Vonage have different enum names — the
   editor maps a single platform-side value to each provider's wire
   format at dispatch time).
4. **Preview** the rendered TTS by hitting comm-svc `POST /v1/preview-vms`
   which dispatches to the org's primary provider with `is_test=true`.

### MM3: Per-provider credential fields (admin settings dialog)

Per Part D1 and the `commsvc_providers` memory:

- **Infobip VMS**: API key, base URL, sender, default voice, `webhook_secret`,
  `test_voice_name`.
- **Plivo Voice**: account SID, auth token, base URL, sender, default voice,
  `test_voice_name`.
- **Vonage Voice**: API key, API secret, application ID, private key,
  default voice, `webhook_secret`.
- **Twilio Voice**: account SID, auth token, base URL, sender, voice name,
  `twiml_url` (optional — if blank, uses inline TwiML), `max_cps`,
  `webhook_secret`, `test_voice_name`.

### MM4: Per-channel template fields

VMS templates store on `content_templates`:

- `body` — the TTS prompt (rendered with variables at dispatch time).
- `language` — ISO 639 + region.
- `voice_name` — provider-agnostic voice ID (mapped at dispatch).
- `machine_detection` — platform-agnostic enum.
- `provider_bindings.<provider>.audio_url` — optional pre-recorded audio
  URL per provider for non-TTS variants.

CALL_BOT templates additionally store the multi-step JSON script per
Part C2.

### MM5: Frontend integration

- Template editor renders VMS-channel-specific fields (voice / language /
  machine-detection) via the schema-driven DynamicForm component (Part L3).
- When the active org has only one VMS provider configured, the voice /
  language / machine-detection dropdowns auto-filter to that provider's
  values.
- When multiple are configured, a "Provider compatibility" banner shows
  which providers support the chosen voice + language combination.

### MM6: Test-send flow

Every VMS template has a "Test send" button that:

1. Validates the template body + variables.
2. Calls comm-svc `POST /v1/test-send` with `is_test=true`.
3. Comm-svc dispatches to the org's primary VMS provider with the
   `test_contact` from provider credentials.
4. Author hears the rendered TTS on their phone.
5. Webhook event lands in `comms-events` with `is_test=true` flag so it
   doesn't pollute production analytics.

---

## Part NN: ETB email campaign full feature parity

### Why Part NN exists

The earlier draft retired ETB's standalone "create email campaign" UI in
favor of routing email campaigns through `message_campaign_service`. The
user clarified: ETB campaign must do **100% of what the previous create
email campaign did** — losing functionality is not acceptable. The
unified campaign API in `message_campaign_service` must therefore expose
every feature ETB campaigns had, and ETB's campaign UI either remains
(as a thin wrapper) or is rebuilt on top of the unified API.

### NN1: Feature parity matrix

| ETB legacy feature | Status in unified flow | Action |
| ------------------ | ---------------------- | ------ |
| Create email campaign with HTML body + subject | partial | message_campaign_service `POST /initiate` accepts `template_id`; HTML must be on the template, not the campaign payload — verify ETB campaign-create-template flow handles this transparently |
| Send to a Listmonk list | partial | `POST /initiate` with `data_source=listmonk_list` → service builds Listmonk campaign per H3 |
| Send to a CSV upload | yes | `data_source=file` already supported per Part F |
| Send to a segmentation query | yes | `data_source=segmentation` already supported |
| Schedule for future delivery | yes | `recurrence_rule` field per Part F |
| Recurring schedule (daily/weekly/monthly) | yes | per F |
| Reply-to + sender-name override | missing | Add to `POST /initiate` body + service forwards to Listmonk |
| Personalization tags | yes | Variables flow through template-engine |
| Per-recipient unsubscribe link | yes | Listmonk inserts automatically |
| Bounce + complaint reporting | yes | `comms-events` filter on `comms.email.bounced/complaint` per H3 |
| Open + click tracking | yes | Listmonk reports `comms.email.opened/clicked`; comm-svc emits |
| A/B test (subject lines) | missing | Add `ab_test` field to `POST /initiate` body; service creates two Listmonk campaigns and splits the list |
| Throttle (send rate cap per hour) | missing | Add `throttle_per_hour` field; service caps Listmonk campaign rate |
| Auto-pause on bounce-rate threshold | missing | Service polls Listmonk stats every 5 min; pauses if bounce_rate > 5% |
| Suppression list (don't-send list) | yes | Listmonk supports `block_list`; service forwards |
| Approval workflow (draft → review → send) | missing | Add `requires_approval` field to campaign job; new approver UI in Steward / CRM |
| Campaign templates (re-use a campaign config) | missing | Add `POST /initiate` accept `from_campaign_id` to clone a previous campaign |

### NN2: ETB frontend campaign view

After the unified-API switch:

- ETB's `CampaignListView.vue` and `CampaignDetailView.vue` continue to
  exist but call `message_campaign_service` endpoints instead of ETB's
  legacy `/campaigns/listmonk` ones.
- The Steward + CRM Campaign wizards (Part F) are the primary creation
  surface; ETB's create-campaign UI either redirects to those or is
  embedded as an iframe.
- ETB retains: email-template CRUD, Listmonk pass-through admin (for
  support / debugging), bounce + suppression management, subscriber
  import.

### NN3: Listmonk-specific extensions

Some ETB capabilities don't have a direct equivalent in
`message_campaign_service` (e.g., A/B testing, auto-pause). The unified
service must expose them via channel-specific extension fields:

```json
{
  "channel": "EMAIL",
  "channel_options": {
    "listmonk": {
      "ab_test": {"enabled": true, "variants": [...]},
      "throttle_per_hour": 5000,
      "auto_pause_on_bounce_rate": 0.05,
      "block_list_id": "uuid"
    }
  }
}
```

`channel_options.<channel>.<key>` lets each channel ship its own
extension fields without polluting the cross-channel core schema.

---

## Part OO: Final master checklist

### OO1: Master "is everything done?" checklist

- [ ] Part X: every service emits Kafka events (13 services).
- [ ] Part Y: zero SQS / SNS in any service.
- [ ] Part Z: marketplace billing live.
- [ ] Part AA: MSK topics + ACLs + TTLs + monitoring + Local-dev parity.
- [ ] Part BB: end-to-end tests pass.
- [ ] Part CC: cross-org scalability hardened.
- [ ] Part DD: every file in every language touched per the manifest.
- [ ] Part EE: phased rollout completed phase-by-phase.
- [ ] Part FF: every seeder enriched.
- [ ] Part GG: every webhook + action tracked.
- [ ] Part HH: 100% completion checklist all-green.
- [ ] Part II: every frontend flow working on both CRM-FE and Steward-FE.
- [ ] Part JJ: every local-dev container + DB + topic + seeder runnable.
- [ ] Part KK: every service's per-service work complete.
- [ ] Part LL: every email provider integrated with template-binding flow.
- [ ] Part MM: every VMS provider integrated alongside template editor.
- [ ] Part NN: ETB campaign feature parity preserved.

### OO2: Final answer

When OO1 is all-green: yes, the platform is 100% complete in the
dimensions the user asked about — SQS/SNS replaced with Kafka, every
event/webhook/action tracked, every seeder enriched, every service
integrated with subscription / Kafka / ClickHouse / DDB / Lago, every
channel × provider × source × template wired, cross-organization
scalability robust, and every CRM-FE + Steward-FE flow working for every
service and every domain.

This plan is the complete specification of that work; Part EE phasing is
the ordered execution path; Part HH + OO1 are the verification gates.

---

## Part PP: Canonical source enum finalisation

### Why Part PP exists

Three candidate source enums coexisted in the codebase + plan:

1. **Phase Q PascalCase 11-source set** (already delivered):
   `Agent | WorkFlow | Campaign | API | Inbound | Webhook | Test | Auth | Notification | Subscription | System`.
2. **Part J2 UPPERCASE 5-source set** (initial user preference):
   `AGENT | WORKFLOW | CAMPAIGN | SYSTEM | TRANSACTIONAL`.
3. **Part PP PascalCase 5-source set** (final user choice after weighing
   the cascade): `Agent | WorkFlow | Campaign | System | Transactional`.

The final canonical form keeps PascalCase (matching every existing row in
DDB / PostgreSQL / Lago, plus the deployed values across template-engine,
ETB, workflow-engine, comm-svc dispatcher) but collapses the 11 fine-
grained pathways into 5 logical buckets. The fine-grained classification
moves to a `source_subtype` field per Part PP6 below.

### PP1: Final canonical source enum

```text
AGENT          # Agent-initiated sends from CRM/Steward UIs (one-off SMS, manual email).
WORKFLOW       # Multi-step workflow orchestrations from bfree-temporal-workflow-engine.
CAMPAIGN       # Bulk campaigns from message_campaign_service / ETB Listmonk.
SYSTEM         # Platform-driven sends — auth (OTP, password reset), notifications,
               # API integrations, inbound auto-responses, webhook-triggered sends,
               # test/preview sends, internal system alerts.
TRANSACTIONAL  # Billing-cycle sends — subscription renewal, invoice receipts,
               # marketplace purchase confirmations, plan upgrade emails.
```

Five values is enough because every interaction-initiation pathway is
either:

- a tenant-driven user pathway (AGENT / WORKFLOW / CAMPAIGN), or
- a platform-internal pathway (SYSTEM), or
- a billing-lifecycle pathway (TRANSACTIONAL).

The previous 11-value enum split SYSTEM into 7 sub-categories (API,
Inbound, Webhook, Test, Auth, Notification, System). Those distinctions
are valuable for analytics but not for billing or rate-limiting decisions
— so they move to a `source_subtype` field on the dispatch payload while
the top-level `source` collapses to 5 values.

### PP2: Old → new mapping

| Old (Phase Q PascalCase) | New (UPPERCASE) | New `source_subtype` | Rationale |
| ------------------------ | --------------- | -------------------- | --------- |
| `Agent` | `AGENT` | `agent_manual` | Preserves the single-source distinction. |
| `WorkFlow` | `WORKFLOW` | `workflow_step` | Same. |
| `Campaign` | `CAMPAIGN` | `campaign_bulk` | Same. |
| `API` | `SYSTEM` | `external_api` | Public API integrations are system-routed. |
| `Inbound` | `SYSTEM` | `inbound_reply` | Auto-response to incoming messages. |
| `Webhook` | `SYSTEM` | `provider_webhook` | Provider-callback-initiated sends. |
| `Test` | `SYSTEM` | `test_preview` | Test / preview sends. |
| `Auth` | `SYSTEM` | `auth_lifecycle` | Auth flows (OTP / password / login email). |
| `Notification` | `SYSTEM` | `system_notification` | Internal system notifications. |
| `Subscription` | `TRANSACTIONAL` | `subscription_lifecycle` | Billing renewals + receipts. |
| `System` | `SYSTEM` | `system_internal` | Platform admin operations. |

(Marketplace `template.purchased` / `template.subscribed` / `template.renewed`
events all carry `source = TRANSACTIONAL` since they directly drive
invoicing.)

### PP3: Migration steps

This migration is destructive across the stack — every service that
defines or validates source values must change. It is its own phase
(EE0-canonical-source) that must complete before Phase EE6 (SQS migration)
to avoid double-migrating event payloads.

#### PP3a: Backend changes

| Service | File | Change |
| ------- | ---- | ------ |
| communication-service | `internal/repo/events.go` | Replace 11-value `Agent...System` constants with 5-value `AGENT/WORKFLOW/CAMPAIGN/SYSTEM/TRANSACTIONAL`. Add `SourceSubtype` constants for the 11 fine-grained sub-types. Update `IsValidSource`, `NormalizeSource`, `IsPlatformOwnedSource` accordingly (SYSTEM + TRANSACTIONAL are platform-owned). |
| communication-service | `internal/repo/events_test.go` | Rewrite all 60+ test cases for new enum + subtype. |
| communication-service | `internal/communication/validator.go` | Update `validSources` map. |
| template-engine | `internal/domain/template.go` | Replace 11 PascalCase Source constants with 5 UPPERCASE + add SourceSubtype enum. |
| template-engine | `internal/api/dto/template.go` | Update `validate:"oneof=..."` tags. |
| template-engine | every domain test file | Rewrite. |
| Email-Template-Builder | `internal/domain/email_template.go` | Replace TemplateSource enum (11→5). Update `CanBePaid` (only AGENT/WORKFLOW/CAMPAIGN are paid-eligible). Update `validDomainSources`. |
| Email-Template-Builder | every domain test | Rewrite. |
| Email-Template-Builder | `internal/handlers/postback_handler.go` | Use `domain.SourceCampaign` (now `CAMPAIGN`). |
| Email-Template-Builder | `cmd/seed/definitions.go` | Update every Source field on the seed templates. |
| Email-Template-Builder | `internal/service/template_service.go` | Update `sourceNormalization` map. |
| bfree-temporal-workflow-engine | `internal/services/messaging_service.go` | Update validate tag + hardcoded `WorkFlow` → `WORKFLOW`. |
| auth-service | `api/crm/internal/kafka/auth_events.go` | Every event payload sets `source = SYSTEM`. |
| subscription-service | `internal/kafka/subscription_events.go` | Every event payload sets `source = TRANSACTIONAL`. |
| message_campaign_service | `pkg/kafka/campaign_events.go` | Every event payload sets `source = CAMPAIGN`. |
| user-management-service | `api/internal/kafka/*` | Audit events `source = SYSTEM`; agent actions `source = AGENT`. |
| go-commons | `pkg/audit/` | Helper to attach `source` + `source_subtype` to every audit event. |

#### PP3b: Frontend changes

| Surface | File | Change |
| ------- | ---- | ------ |
| CRM-FE | `src/utils/constants.ts` | Source dropdown options updated. |
| CRM-FE | every Source filter component | Update labels (UPPERCASE display). |
| Steward-FE | `src/features/Settings/type/index.ts` | Same. |
| Both frontends | template-create form | Source picker shows the new 5-option set with `source_subtype` as a secondary picker (AGENT > agent_manual; SYSTEM > auth_lifecycle / system_notification / etc.). |

#### PP3c: Database backfill

For every PostgreSQL + DynamoDB row that stores a source value:

```sql
-- communication-service DDB CustomerHistory: per-row update via DDB stream lambda
-- template-engine DDB Templates: same
-- ETB postgres email_templates:
UPDATE email_templates SET source = CASE source
    WHEN 'Agent'        THEN 'AGENT'
    WHEN 'WorkFlow'     THEN 'WORKFLOW'
    WHEN 'Campaign'     THEN 'CAMPAIGN'
    WHEN 'API'          THEN 'SYSTEM'
    WHEN 'Inbound'      THEN 'SYSTEM'
    WHEN 'Webhook'      THEN 'SYSTEM'
    WHEN 'Test'         THEN 'SYSTEM'
    WHEN 'Auth'         THEN 'SYSTEM'
    WHEN 'Notification' THEN 'SYSTEM'
    WHEN 'Subscription' THEN 'TRANSACTIONAL'
    WHEN 'System'       THEN 'SYSTEM'
    ELSE source
END;
-- And add `source_subtype` column with the original detail value
ALTER TABLE email_templates ADD COLUMN source_subtype TEXT NOT NULL DEFAULT '';
UPDATE email_templates SET source_subtype = CASE source
    -- before the prior UPDATE the original values are the 11-set; capture them first
    -- (run as part of the same transaction as PP3c.A: read old, write new + subtype)
    ...
END;
```

This is a two-pass migration: capture the old value into the new
`source_subtype` column, then UPDATE the `source` column to the new
5-value enum.

#### PP3d: ClickHouse + Lago

ClickHouse `events` table: add `source_subtype` LowCardinality column;
backfill from `event_type` parsing. Lago billable metric codes that
include the source need updating (e.g., `auth_logins` stays as-is, but
`marketplace_template_subscribe` keeps its existing code — Lago doesn't
care about platform-side source enums).

#### PP3e: Validators + tests

Every `validate:"oneof=..."` tag in every DTO updated. Every test that
asserts a specific source string updated. Every test fixture file that
seeds a source value updated.

### PP4: Do this BEFORE Phase EE6 (SQS migration)

The SQS → Kafka migration carries event payloads across the wire. If the
source enum changes mid-migration, in-flight events on SQS will land on
Kafka with an outdated source value and the consumer will reject them.
So PP3 must complete cleanly (with all tests green) before any SQS
migration starts.

### PP5: Frontend permission + role labels follow

After PP3 lands:

- Permission names that include source words (e.g., `view_workflow_executions`)
  stay PascalCase / mixed-case because permissions are platform-internal
  identifiers, not source values.
- UI labels for source pickers display "Agent", "Workflow", "Campaign",
  "System", "Transactional" (Title Case for human readability) but the
  underlying value is the UPPERCASE token.

---

## Part QQ: 100% product + feature catalogue (backends + frontends + infras)

### Why Part QQ exists

The user requested confirmation that 100% of product, features, and
infra are covered across both backends and both frontends. This section
is the master catalogue.

### QQ1: Backend services — every feature (12 services)

#### QQ — auth-service

- Email/password login + OTP + 2FA.
- Password reset (request + confirm).
- Token issue + refresh + validation.
- Permission engine (RBAC + ABAC).
- Per-org rate-limit + per-tier rate-limit.
- User CRUD + role assignment.
- Country ACL (user restricted to certain countries).
- Multi-domain user (CRM + Admin simultaneously).
- Org creation hook (provisions Lago customer + Kafka quotas + ClickHouse partition).
- Audit-log writer (`audit-events` topic).
- Kafka emit on every lifecycle event (per Part X2).
- Per-org session management + invalidation on role change.

#### QQ — partner-service

- Partner CRUD + soft-delete.
- Partner approval workflow (request → review → approve / reject).
- DCA (debt-collection-agency) management.
- Per-partner provider credential override (for collections-domain partners).
- Country-scoped partner access.
- Pending-update workflow (partner edits queued for approval).
- Kafka emit on every partner lifecycle event.

#### QQ — subscription-service

- Lago integration (CRUD plans, customers, subscriptions, billable metrics, invoices).
- Webhook handler for every Lago event.
- ClickHouse fanout consumer (every Kafka topic → analytics rows).
- MarketplaceBillingConsumer (DELIVERED in Phase Q).
- Outbound `subscription-events` Kafka publish.
- Per-org analytics (MRR, prepaid credits, revenue streams, customer usage).
- Plan upgrade / downgrade via API + Lago.
- Quota tracking + enforcement (rejects dispatch when org has exhausted plan).
- Forecast worker (uses ClickHouse aggregates to project usage).

#### QQ — communication-service

- Multi-provider dispatch for SMS / EMAIL / VMS / CHAT (WhatsApp) / CALL_BOT / IVR / INSTANT_MESSAGING.
- Provider failover (primary fail → cascade).
- Provider rate-limit (token bucket per provider per org).
- Webhook ingest from every provider (POST → Kafka per Y0).
- DDB CustomerHistory transactional store + DDB streams aggregation.
- Kafka `comms-events` emit on every send / delivery / failure.
- TwiML serving (CALL_BOT scripts).
- Xcally integration (list creation, contact upload, queue/IVR campaign assignment).
- Per-domain provider scoping.
- Per-source allow-list on sender credentials.

#### QQ — template-engine

- Content template CRUD (SMS / VMS / CALL_BOT / CHAT / IVR — EMAIL via ETB mirror).
- Template versioning (draft / published / archived).
- Placeholder render (mustache-like with safe HTML escaping).
- Marketplace publish + subscribe + clone (DELIVERED in Phase Q).
- Provider-binding metadata (per-provider template ID).
- Cache (Redis-backed compiled templates).
- Bulk render via Kafka.
- ETB mirror endpoint (registers email templates as content_templates pointer).

#### QQ — Email-Template-Builder (ETB)

- Visual + code email template editor (GrapesJS + raw HTML).
- Listmonk integration (templates + campaigns + subscribers + lists).
- Campaign creation + scheduling + recurring (Listmonk-backed).
- Subscriber import (CSV + API).
- Bounce + complaint management.
- Marketplace publish + subscribe (DELIVERED in Phase Q).
- Marketplace pricing (DELIVERED in Phase Q).
- Postback handler (Listmonk → ETB → comm-svc dispatch).
- Per-domain template separation (CRM vs Admin).

#### QQ — message_campaign_service

- Campaign lifecycle (initiate → schedule → trigger → complete).
- File upload + validation pipeline (CSV with presigned S3).
- Segmentation-based audience.
- Recurring schedules (daily / weekly / monthly).
- Per-channel routing (SMS / EMAIL / VMS / CALL_BOT / CHAT) with EMAIL via ETB.
- Per-org IDOR-safe access (after CC1 fix).
- Status polling endpoint.

#### QQ — bfree-temporal-workflow-engine

- DSL workflow definitions (activities + conditions + waits + branches).
- Multi-step orchestration via Temporal.
- Per-customer execution journeys.
- SendSMS / SendEmail / SendVMS / SendChatbot / TransferToCallCenter activities.
- Pause / resume / cancel signals.
- Versioning (draft → published → archived).
- Audience via segmentation.
- Per-org rate limit on activity dispatch.
- Kafka emit on every workflow lifecycle event (per X3c).

#### QQ — setting-service

- Org settings (timezone / locale / preferences).
- Country activation + per-country pricing.
- Provider configuration registry.
- Plan + feature management.
- Org-level audit settings.

#### QQ — data-segments-api

- Customer segmentation builder (filter rules with AND/OR groups).
- `POST /build` returns row count.
- `POST /fetch` returns paginated customer details (PII).
- Custom SQL scripts (for power users; permission-gated).
- Per-org isolation on every query.

#### QQ — mobile-number-statuses (mns)

- Phone number lookup (operator + portability).
- Per-country lookup providers.
- Per-org operator catalogue cache.
- Pre-flight check on every comm-svc dispatch.

#### QQ — link-serve

- URL shortening with custom domain.
- Per-org base domain configuration.
- Click tracking with org context.
- Expiration + revocation.

#### QQ — user-management-service

- Agent CRUD + role assignment.
- Task queue + assignment + reassignment.
- Performance tracking (per-agent collection metrics).
- Audit events.

#### QQ — report-submission-service

- PTP (promise-to-pay) capture.
- Daily report submission.
- Cross-service event consumption for compliance.
- Per-partner report templates.

### QQ2: Frontend features — every screen (CRM-FE + Steward-FE)

Per Part II, see the full coverage matrix and gaps. Every domain feature
listed there is in scope. The frontend completion is the union of:

- Every page that lists / creates / edits / deletes a backend resource.
- Every modal that triggers a state transition.
- Every chart that renders subscription-service analytics.
- Every dropdown filtered by the active org / domain / role.
- Every permission-gated button + permission-denied modal.
- Every async-progress indicator + toast.
- Every audit-log + bulk-action surface (Part L1 / L2).

### QQ3: Infrastructure — every component

#### Cloud (AWS)

- MSK Kafka cluster (production + staging tiers, topic + ACL provisioning per AA1 / AA2).
- RDS PostgreSQL (per-service DB).
- DynamoDB (CustomerHistory + provider_credentials + xcally_list_locks + content_templates).
- Aurora read-replica (analytics workloads).
- S3 buckets (presigned uploads, GrapesJS state, audit log archives).
- SES (email sending baseline).
- CloudFront + Route 53 (frontend + custom domains).
- Secrets Manager (every credential).
- ElastiCache Redis (per-service cache).
- ECS / EKS (containerized services).
- Lambda (auth Lambda, ddb_streams, partner Lambda, etc.).
- API Gateway (Lambda authorizer, request transformation).
- CloudWatch (metrics + alarms + dashboards).
- IAM (per-service role, per-environment scoping).

#### Self-hosted / OSS

- Lago (billing).
- Listmonk (bulk email).
- Temporal (workflow orchestration).
- Keycloak (OIDC).
- Mailpit (local email catcher for dev).
- ClickHouse (analytics).
- Sentry (error reporting).
- Grafana / Prometheus (monitoring).

#### Per-environment infra

| Environment | Provisioning | Notes |
| ----------- | ------------ | ----- |
| Local | docker-compose.local.yml + scripts/migrate-all-dbs.sh | Per Part JJ |
| Dev | terraform/environments/dev | MSK 1-broker, RDS db.t3.micro |
| Staging | terraform/environments/staging | MSK 3-broker, RDS db.t3.small, Aurora read-replica |
| Production | terraform/environments/prod | MSK 6-broker, RDS db.r6g.large, Aurora cluster + read-replicas, multi-AZ Lago, multi-region ETB DR |

### QQ4: Final 100% confirmation

When every item in QQ1 + QQ2 + QQ3 is implemented + tested + deployed +
monitored:

- 100% of backend services have complete features.
- 100% of frontend flows work on both CRM-FE and Steward-FE.
- 100% of infrastructure is provisioned per environment.
- 100% of cross-service events are produced + consumed via Kafka MSK.
- 100% of SQS / SNS legacy queues are decommissioned.
- 100% of cross-org scalability checks pass.
- 100% of seeders enrich a fresh deployment.
- 100% of provider integrations (SMS, EMAIL, VMS, CALL_BOT, CHAT, IVR) work end-to-end.

This plan — Parts A through QQ — is the complete spec.

