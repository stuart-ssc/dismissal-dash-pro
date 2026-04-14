

# Fix: Special Use Run "View Details" 404 Error

## Problem
The "View Details" button navigates to `/dashboard/special-use-runs/{id}`, but the route in `App.tsx` is defined as `/dashboard/dismissals/special-runs/:runId`. The old path has a backward-compatibility redirect for the list page (`/dashboard/special-use-runs` → `/dashboard/dismissals/special-runs`) but **no redirect for the detail route with `:runId`**.

## Fix

### 1. Update navigation URLs in `SpecialUseRuns.tsx`
Change all `navigate('/dashboard/special-use-runs/${run.id}')` calls (lines 433, 520) to `navigate('/dashboard/dismissals/special-runs/${run.id}')`.

### 2. Update back-navigation in `SpecialUseRunDetail.tsx`
Change all `navigate("/dashboard/special-use-runs")` calls (lines 166, 198, 233) to `navigate("/dashboard/dismissals/special-runs")`.

### 3. Update navigation in `SpecialUseRunMode.tsx`
Change `navigate("/admin/special-use-runs")` calls (lines 190, 297) to `navigate("/dashboard/dismissals/special-runs")`.

### 4. Add backward-compatibility redirect in `App.tsx`
Add a redirect for the old detail path:
```tsx
<Route path="/dashboard/special-use-runs/:runId" element={<Navigate to="/dashboard/dismissals/special-runs/:runId" replace />} />
```
(Using a small wrapper component to forward the `runId` param.)

Four files, ~8 lines changed.

