

# Restructure IC Integration: District-Level Credentials with App Name

## Problem

1. IC credentials are issued per-district, not per-school. Currently stored per-school, requiring redundant entry.
2. The IC OneRoster API requires an `appName` path segment (e.g., `jessamine`) in all API URLs: `/campus/api/oneroster/v1p2/{appName}/ims/oneroster/rostering/v1p2/...`. The current `OneRosterClient` does not handle this.
3. The credential fields should be labeled: **Base URL**, **Client ID**, **Client Secret**, **Token URL** (not "Host URL" and "Client Key").

## Architecture

```text
ic_district_connections (one per district)
├── district_id, base_url, app_name, client_id (encrypted),
│   client_secret (encrypted), token_url, oneroster_version, status
│
└── ic_school_mappings (one per school in district)
    ├── district_connection_id → ic_district_connections.id
    ├── school_id → schools.id
    ├── ic_school_sourced_id (from OneRoster /schools)
    └── ic_school_name
```

## Implementation Plan

### 1. Database Migration

Create two new tables:

- **`ic_district_connections`** -- district_id (FK), base_url, app_name, client_id (encrypted), client_secret (encrypted), token_url, oneroster_version, status, created_by, created_at, updated_at
- **`ic_school_mappings`** -- district_connection_id (FK), school_id (FK, unique), ic_school_sourced_id, ic_school_name, mapped_by, mapped_at, status

RLS policies:
- District admins can manage their district's connection
- School admins can view their district's connection, insert school mappings for their own school
- System admins full access

### 2. Update OneRoster Client

Modify `supabase/functions/_shared/oneroster-client.ts`:
- Rename `clientKey` to `clientId` in config interface
- Add `appName` to config
- Update URL construction in `paginate()`: `{baseUrl}/campus/api/oneroster/{versionPath}/{appName}/ims/oneroster/rostering/{versionPath}/{endpoint}`
- Add `getSchoolsList()` method that returns all schools from IC for mapping UI

### 3. Update `test-ic-connection` Edge Function

- Accept `appName` in request body alongside renamed `clientId` field
- After authenticating, fetch `/schools` endpoint and return full list of IC schools
- Fuzzy-match the requesting school's name against IC school list and return suggested match

### 4. New `connect-ic-district` Edge Function

Replaces `connect-ic`:
- Accepts credentials + district_id + school mapping (IC sourcedId -> school_id)
- Stores encrypted credentials in `ic_district_connections` (one row per district)
- Creates `ic_school_mappings` entry
- If district connection already exists, just adds the school mapping (no credential re-entry)

### 5. Update Wizard UI

**ICCredentialsStep.tsx:**
- Rename fields: "Host URL" → "Base URL", "Client Key" → "Client ID"
- Add "App Name" field with helper text ("Found in your IC API URL, e.g. 'jessamine'")
- Auto-detect app name from Base URL if possible (parse from IC URL patterns)
- Check if district already has a connection; if so, skip credentials and go straight to school mapping

**ICTestConnectionStep.tsx:**
- After successful test, display list of IC schools returned from the API
- Auto-highlight best fuzzy match against the registered school name
- User confirms/selects their school from the list
- Store selected IC school sourcedId for mapping

**ICConnectionWizard.tsx:**
- Update `WizardState` to include `appName`, `clientId` (renamed from `clientKey`), and `selectedICSchool`
- Add "district already connected" flow that skips credential entry

### 6. Update `sync-infinite-campus` Edge Function

- Look up credentials from `ic_district_connections` via `ic_school_mappings`
- Use `ic_school_sourced_id` to filter sync to school-scoped endpoints (e.g., `/schools/{sourcedId}/students`)
- Pass `appName` to OneRoster client

### 7. Update District IC Dashboard

- `useDistrictICConnections.ts` queries new tables
- Show district connection status (one connection, many mapped schools)
- Show which schools are mapped vs. unmapped

## Files to Create/Modify

- New migration SQL (new tables, RLS, indexes)
- `supabase/functions/_shared/oneroster-client.ts` -- add appName, rename clientKey → clientId, fix URL paths
- `supabase/functions/test-ic-connection/index.ts` -- accept appName, return school list
- New `supabase/functions/connect-ic-district/index.ts`
- `supabase/functions/sync-infinite-campus/index.ts` -- use district connection + school-scoped endpoints
- `src/components/ICConnectionWizard.tsx` -- update state shape
- `src/components/wizard-steps/ICCredentialsStep.tsx` -- rename fields, add appName
- `src/components/wizard-steps/ICTestConnectionStep.tsx` -- add school selection
- `src/hooks/useDistrictICConnections.ts` -- query new tables

## Technical Notes

- The IC API base path is: `{baseUrl}/campus/api/oneroster/v1p2/{appName}/ims/oneroster/rostering/v1p2/{endpoint}`
- Token URL for IC typically follows: `{baseUrl}/campus/oauth2/token`
- Existing `infinite_campus_connections` table data can be migrated to new tables if any exists
- The `UNIQUE` constraint on school_id in `ic_school_mappings` ensures one mapping per school

