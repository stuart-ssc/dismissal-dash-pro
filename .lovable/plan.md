

# Fix: Remaining Blur Overlays on Dashboard

## Problem
The previous fix only updated **one** of the three blur overlays (the top stats cards at line 585). Two more overlays were missed:
- **Line 702**: Covers Quick Actions + IC Integration Summary section
- **Line 834**: Covers the bottom stats/Upcoming Dismissals section

Both still use `!isReady` alone, which is false because transportation is not configured -- even though students and classes exist from IC sync.

## Fix
Apply the same condition used on line 585 to the other two overlays. Replace `!isReady` with `!isReady && !statuses.hasStudent && !statuses.hasClass` so the blur only appears when the school truly has no data.

### File: `src/pages/Dashboard.tsx`

**Line 702** -- change:
```
{!setupLoading && !isReady && (
```
to:
```
{!setupLoading && !isReady && !statuses.hasStudent && !statuses.hasClass && (
```
And update the matching `aria-hidden` on line 707.

**Line 834** -- same change:
```
{!setupLoading && !isReady && (
```
to:
```
{!setupLoading && !isReady && !statuses.hasStudent && !statuses.hasClass && (
```
And update the matching `aria-hidden` on line 839.

## Expected Outcome
All three dashboard sections will be fully visible and interactive for schools with synced IC data, even if transportation setup is still pending.

