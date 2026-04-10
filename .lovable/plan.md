

# Fix IC Connection Test -- Correct Deployment and Add Resilience

## Root Cause

The edge function was either not deployed or running an older version. My curl test confirmed the current version IS deployed and responding. The URL construction in `getApiBaseUrl()` is correct per the IC docs:
`{baseUrl}/campus/api/oneroster/v1p2/{appName}/ims/oneroster/rostering/v1p2/{endpoint}`

However, there are two bugs to fix:

1. **Base URL trailing slash / `/campus` suffix**: If the user enters `https://jessamineky.infinitecampus.org/campus` or adds a trailing slash, the URL doubles up. Need to strip trailing slashes and `/campus` suffix from `baseUrl`.

2. **`/schools` endpoint may not be available for all app credentials**: The IC docs confirm `/schools` exists, but some OneRoster apps may not have permissions for it. Need a fallback to `/orgs` filtered by `type='school'`.

3. **Add detailed logging**: The function has zero logs from real invocations. Add console.log statements for the constructed URL, auth result, and each API call so we can debug in the future.

## Changes

### 1. `supabase/functions/_shared/oneroster-client.ts`
- Strip trailing slash and `/campus` from `baseUrl` in `getApiBaseUrl()` to prevent double-pathing
- Add URL logging in `paginate()` so we can see exactly what URL is being hit
- Add fallback in `getSchools()`: if `/schools` returns 404, try `/orgs` filtered for `type='school'`

### 2. `supabase/functions/test-ic-connection/index.ts`
- Add diagnostic logging: log the constructed base URL, auth success, and API call results
- Wrap `getSchools()` with a try/catch that falls back to orgs

### 3. Redeploy edge functions
- Deploy `test-ic-connection` with the updated shared client

## Technical Details

Per the IC Swagger docs, the correct full URL pattern is:
```
https://jessamineky.infinitecampus.org/campus/api/oneroster/v1p2/jessamine/ims/oneroster/rostering/v1p2/schools
```

The `getApiBaseUrl()` already produces this correctly when `baseUrl = "https://jessamineky.infinitecampus.org"`. The fix adds defensive normalization to handle user input variations.

