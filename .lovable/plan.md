
Yes — but not a full app restart. We should stop patching the current IC setup flow and rebuild this feature slice cleanly around one district-first design.

Do I know what the issue is? Yes.

## What is actually broken

This is not just “bad credentials.” The current IC implementation is structurally inconsistent:

1. `ICTestConnectionStep.tsx` auto-runs `test-ic-connection` whenever `baseUrl` and `clientId` exist.
2. `ICCredentialsStep.tsx` sets `districtAlreadyConnected` schools to masked placeholder values:
   - `clientId: '••••••••'`
   - `clientSecret: '••••••••'`
3. That means schools joining an already-connected district can end up sending fake masked credentials back to the edge function.
4. At the same time, older components still exist and still call the same function with the old contract:
   - `ICConnectionForm.tsx` uses `hostUrl`, `clientKey`
   - `ICSettingsTab.tsx` expects `data.isValid`
5. The edge function returns real HTTP errors (`400/403/...`), so the UI only shows the generic Supabase message: `Edge Function returned a non-2xx status code`.

So yes: part of the problem is that we are layering fixes on top of two different IC designs at once.

## Recommendation

Do not restart the whole product.

Do restart the Infinite Campus setup flow as a clean, district-first implementation with one contract from UI to edge functions to sync logic.

## Rebuild plan

### 1. Define one canonical IC contract
Use only:
- Base URL
- App Name
- Client ID
- Client Secret
- Token URL

Remove mixed old payload expectations from active IC setup/testing paths.

### 2. Split the flow into two explicit server-backed paths
Build these two cases cleanly:

- **Fresh district setup**
  - enter district credentials
  - verify connection
  - fetch IC schools
  - suggest school match
  - confirm mapping
  - save district credentials once + school mapping

- **School joins already-connected district**
  - do not put masked credentials in wizard state
  - do not call test with placeholder secrets
  - fetch school list using stored district credentials server-side
  - let user confirm their school mapping only

### 3. Fix edge function behavior for debuggability
Refactor `test-ic-connection` so recoverable failures return structured JSON instead of opaque non-2xx failures where possible, including:
- `valid: false`
- `error`
- `stage` (`auth`, `permission`, `orgs`, `schools`, `sessions`)
- `diagnostics` (safe, non-secret)

This will stop the UI from collapsing everything into the same generic error.

### 4. Remove legacy contract drift in active UI
Audit and update/remove old callers so the live app is not mixing:
- `hostUrl` vs `baseUrl`
- `clientKey` vs `clientId`
- `isValid` vs `valid`

Target files:
- `src/components/wizard-steps/ICCredentialsStep.tsx`
- `src/components/wizard-steps/ICTestConnectionStep.tsx`
- `src/components/wizard-steps/ICReviewStep.tsx`
- `src/components/ICConnectionForm.tsx`
- `src/components/ic/ICSettingsTab.tsx`

### 5. Keep district-level storage, but fix how it is consumed
Keep the current architecture:
- `ic_district_connections`
- `ic_school_mappings`

But make all school-selection/testing for already-connected districts read from server-side decrypted credentials, never from placeholder values in the client.

### 6. Verify permissions and partial data
Check for and fix:
- `user_schools` access gaps causing 403s
- partial `ic_district_connections` / `ic_school_mappings` rows from failed attempts
- any legacy school-level connection rows interfering with district logic

### 7. End-to-end test the three real scenarios
Test all of these before calling it done:
1. first school in a district sets up IC
2. second school in same district skips credentials and only maps school
3. existing connection can be re-tested from settings without using deprecated payloads

## Technical details

### Root cause files I inspected
- `src/components/wizard-steps/ICCredentialsStep.tsx`
- `src/components/wizard-steps/ICTestConnectionStep.tsx`
- `src/components/ICConnectionForm.tsx`
- `src/components/ic/ICSettingsTab.tsx`
- `supabase/functions/test-ic-connection/index.ts`
- `supabase/functions/connect-ic-district/index.ts`
- `supabase/functions/_shared/oneroster-client.ts`

### Most important concrete bug
For already-connected districts, the wizard stores masked credentials in state and then the test step can submit those masked values as if they were real credentials. That alone is enough to create repeated connection failures.

### Best implementation direction
I recommend a controlled rebuild of the IC setup flow, not more patching:
```text
District credentials (once)
        ↓
Server verifies district connection
        ↓
Server returns IC school list
        ↓
User confirms school mapping
        ↓
School sync uses district creds + school sourcedId
```

## Outcome

If approved, I will rebuild this feature slice cleanly instead of continuing to patch the current path. That is the safest way to stop the error loop and get IC working correctly for district-wide onboarding.
