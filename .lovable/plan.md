

# Fix: IC OAuth Token URL Missing `appName` Parameter

## Root Cause
Infinite Campus requires `?appName={appName}` on the OAuth token endpoint. The logs confirm:
- Token URL sent: `https://jessamineky.infinitecampus.org/campus/oauth2/token`
- IC response: "No Campus Application selected"
- Required: `https://jessamineky.infinitecampus.org/campus/oauth2/token?appName=jessamine`

This was always the underlying bug. The previous cached-results behavior masked it by never re-testing.

## Fix (2 changes)

### 1. `oneroster-client.ts` -- Append appName to token URL
In the `authenticate()` method, if `appName` is set and the token URL doesn't already contain it, append `?appName={appName}`:

```typescript
async authenticate(): Promise<void> {
  const credentials = btoa(`${this.config.clientId}:${this.config.clientSecret}`);
  
  // IC requires appName on the token endpoint
  let tokenUrl = this.config.tokenUrl;
  if (this.config.appName && !tokenUrl.includes('appName=')) {
    const separator = tokenUrl.includes('?') ? '&' : '?';
    tokenUrl = `${tokenUrl}${separator}appName=${this.config.appName}`;
  }
  
  const response = await fetch(tokenUrl, { ... });
}
```

### 2. `ICTestConnectionStep.tsx` -- Guard auto-test
Only auto-test on mount if we have valid credentials OR a district connection ID, preventing errors when state is incomplete:

```typescript
useEffect(() => {
  const hasCredentials = state.districtAlreadyConnected 
    ? !!state.connectionId
    : !!(state.credentials.clientId && state.credentials.clientSecret);
  if (hasCredentials) {
    testConnection();
  }
}, []);
```

### 3. Redeploy
Deploy `test-ic-connection`, `get-ic-district-schools`, `connect-ic-district`, and `sync-infinite-campus` (all share the updated client).

## Why this will work
The IC error message explicitly says "No Campus Application selected." Adding `appName` to the token URL is how IC identifies which OneRoster app context to authenticate against. Once auth succeeds, the existing school-fetching logic (with the broadened org filter) will return schools.

