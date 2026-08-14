# Review: `app/assets/index-Bd6xm2s8.js` (minified console bundle)

**Scope:** the ~2.0 MB minified/production JavaScript bundle committed under
`app/assets/`, which is the compiled front end of the **ShopConnect Console**
(`app/index.html` → `./assets/index-Bd6xm2s8.js`). The bundle is a Vite build
of a React single-page app that talks to a Supabase backend.

This review works from the shipped bundle only. It can describe what the client
does and what it talks to; it **cannot** verify the server-side security
boundary (Supabase Row-Level Security policies and Edge Function logic), which
is where the real protection lives. That gap is itself the headline finding.

---

## What the app is

A multi-tenant merchant/agent console for payment integration ("ShopConnect
Pro"). Observed surface area:

- **Backend:** Supabase project `mdrwtwyflzpbikurniih` (`*.supabase.co`).
  ~40+ tables referenced, including `merchants`, `organizations`, `org_users`,
  `super_admins`, `org_processor_config`, `odoo_api_keys`, `customer_vault`,
  `shopconnect_invoices`, `recurring_subscriptions`, `disputes`,
  `settlement_batches`, `telemetry_events`.
- **Error monitoring:** Sentry (`environment: "production"`).
- **Payment processors integrated:** Stripe, Authorize.Net, NMI, Fluidpay,
  Dejavoo, Valor, Maverick, Windcave, North, plus Odoo for accounting
  write-back.
- **Edge Functions invoked** (server-side): `manage-processor-config`,
  `persist-onboarding-credentials`, `validate-processor-credentials`,
  `import-vault-customers`, `execute-writeback`, `process-refund`,
  `record-payment-attempt`, `create-billing-payment-link`,
  `update-remote-config`, `log-activity`, `submit-agent-application`.

## Sensitive strings in the bundle — assessed, not alarming

These jump out on a raw string scan but are **safe by design**:

- **Supabase anon JWT** (`role: "anon"`) — embedded. This is the publishable
  anon key and is meant to ship in the client; its power is bounded entirely by
  RLS. Not a leak.
- **Sentry DSN** (`…@o4511333145640960.ingest.us.sentry.io/…`) — a public
  ingest key by design. Not a leak.
- **Slack/Discord webhook strings** (`hooks.slack.com/services/…`,
  `discord.com/api/webhooks/…`) — these are **placeholder defaults** in the
  notification-settings config (literal `…` ellipsis), not real endpoints and
  not an exfiltration channel.

No `sk_…`/`pk_…` Stripe secret keys, no private API keys, and no processor
secrets were found hardcoded in the bundle.

## Credential handling — the design is sound

The console collects merchant payment-processor **secrets** (e.g. Authorize.Net
Transaction Key, NMI security key, Odoo API keys). Importantly, these are **not**
written to the database directly from the browser:

- Secret capture/persistence goes through Edge Functions
  (`persist-onboarding-credentials`, `manage-processor-config`) and validation
  through `validate-processor-credentials`.
- Direct client `insert`/`update` on `org_processor_config` only sets routing
  (`org_id`, `default_processor`) — not the secret material.
- Card/customer operations (`process-refund`, `record-payment-attempt`,
  `create-billing-payment-link`, `delete_vault_customer` RPC) are server-side.
- UI copy states keys are "encrypted at rest and never returned by the API once
  saved," and the code has branches for single- vs. double-encrypted / PGP
  ciphertext states — consistent with a server-side encrypt-on-write model.

So the intended trust model is reasonable: **public anon key + RLS + Edge
Functions for anything secret or money-moving.**

---

## Findings

### 1. A 2 MB minified, source-map-less build artifact is committed to the repo (primary concern)
`app/assets/index-Bd6xm2s8.js` is compiled output with no accompanying source
or source map. Consequences:
- It is effectively **unauditable** in this repository — no one can review a
  change to it, diff it meaningfully, or trace a behavior back to source.
- It bloats the git history (every rebuild adds another ~2 MB blob under a new
  hashed name).
- It couples a static marketing site's repo to an opaque application build whose
  actual source lives elsewhere.

**Recommendation:** treat the build as a deploy artifact, not repo content.
Either build the app in CI from its real source repo and publish to Pages, or
at minimum ship the source map (privately) so the bundle can be audited. If the
bundle must stay checked in, document its provenance (which repo/commit built
it) so it is reproducible.

### 2. The security boundary is entirely server-side and not verifiable here
Everything that actually protects tenant data — RLS on `merchants`,
`organizations`, `customer_vault`, `super_admins`, `odoo_api_keys`, etc., and
the authorization checks inside the Edge Functions — lives in Supabase and is
**out of view of this bundle**. The client freely references `super_admins` and
cross-tenant tables; whether a merchant user can read another org's row depends
100% on RLS being correct.

**Recommendation:** the real review needs to happen against the Supabase project:
confirm RLS is enabled and enforced on every referenced table (especially
`customer_vault`, `org_processor_config`, `odoo_api_keys`, `super_admins`), and
confirm each Edge Function re-checks caller authorization server-side rather than
trusting client-supplied `org_id`/`merchant_id`. Run `get_advisors` (security
lens) on the project.

### 3. Client-supplied tenant identifiers
Several calls pass `org_id` / `x-merchant-id` from the client (e.g. the
`manage-processor-config` path). This is fine **only** if the Edge Functions
derive/verify the caller's org from the authenticated JWT rather than trusting
the passed value. Worth explicitly confirming server-side.

### 4. Dependency currency
The bundle pulls in Stripe.js, supabase-js, Sentry, Cloudflare Turnstile, and a
large React tree. Exact versions aren't cleanly extractable from the minified
output. Since this handles payments, pin and monitor these (Dependabot/audit) in
the source repo.

---

## Bottom line

Nothing in the shipped JavaScript is a smoking gun: the obvious "scary strings"
(anon key, Sentry DSN, webhook placeholders) are benign, and secrets/payments
are correctly pushed to server-side Edge Functions rather than handled in the
browser. The genuine issues are **repo hygiene** (a giant unauditable minified
blob committed into a static site) and the fact that **the actual security
guarantees can't be reviewed from the client at all** — they depend on Supabase
RLS and Edge Function authorization, which should be audited directly.
