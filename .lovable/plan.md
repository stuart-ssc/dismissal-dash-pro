

# Convert IC Classes to Groups/Teams Wizard

## Context
East Jessamine's IC sync imports non-instructional sections (athletics, clubs, field trips) as regular classes. For example, `128_Track 11 Athletics` has 112 students but is not a "class" -- it is an athletics group. The admin needs a way to bulk-convert these into `special_use_groups` with their student rosters carried over.

The real data shows clear patterns:
- `128_*Athletics` -- athletics groups (archery, baseball, basketball, etc.)
- `128_*Clubs` / `128_*Club` -- club groups (FCA, JR Beta, Musical, etc.)
- `128_FT*` -- field trips (DC 2026, Charleston Trip)
- Other patterns like `Advisory`, `HOMEROOM`, `Study Hall` -- could be hidden

## What We Will Build

### 1. New full-page wizard at `/dashboard/people/classes/convert-groups`
An inline wizard page (not a modal) with these steps:

**Step 1 -- Review Suggestions**
- Query all classes in the active session and auto-detect candidates using name patterns (keywords like Athletics, Club, Field Trip, Homeroom, Study Hall, Advisory, Band, Choir, etc.)
- Present a table with columns:
  - Checkbox (select/deselect)
  - IC Class Name (original)
  - Suggested Display Name (editable inline -- strip prefixes like `128_`, clean up truncations)
  - Suggested Type (editable dropdown: athletics, club, field_trip, other)
  - Students count
  - Action: "Convert" or "Hide" (hide = mark as non-instructional, not converted)
- Auto-suggest type based on keywords in the name
- Select All / Deselect All controls
- Search/filter within the candidates

**Step 2 -- Confirm & Convert**
- Summary of selected classes, their display names, and types
- "Convert Selected" button
- Server-side logic:
  1. Create `special_use_group` for each selected class
  2. Copy all `class_roster` students into `special_use_group_students`
  3. Optionally mark the original class as hidden (new `is_hidden` boolean column on `classes`)

**Step 3 -- Done**
- Success summary with link to Groups & Teams page

### 2. Button on Classes page
Add "Convert Groups/Teams" button next to "+ Add Class" that navigates to the wizard page.

### 3. Database changes

**Migration: add `is_hidden` column to `classes`**
```sql
ALTER TABLE classes ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
```
Update `get_classes_paginated` to exclude hidden classes by default, and add a filter option to show them.

**Migration: create `convert_classes_to_groups` RPC**
A `SECURITY DEFINER` function that:
- Accepts an array of `{class_id, display_name, group_type}` objects
- For each: creates a `special_use_group`, bulk-inserts students from `class_rosters` into `special_use_group_students`, marks the class as `is_hidden = true`
- Returns the count of groups created

### 4. Files to create/modify
- **New**: `src/pages/ConvertClassesToGroups.tsx` -- the full-page wizard component
- **Edit**: `src/pages/Classes.tsx` -- add "Convert Groups/Teams" button
- **Edit**: `src/App.tsx` -- add route for the wizard
- **New migration**: add `is_hidden` column to `classes`, update `get_classes_paginated` RPC
- **New migration**: create `convert_classes_to_groups` RPC function

### Technical Details

**Pattern matching for auto-suggestions:**
```typescript
const patterns = [
  { regex: /athletics?/i, type: 'athletics' },
  { regex: /clubs?/i, type: 'club' },
  { regex: /field.?trip|^128_FT/i, type: 'field_trip' },
  { regex: /homeroom|advisory|study.?hall/i, type: 'other' },
];
```

**Display name cleanup:**
- Strip leading `128_` prefix
- Strip trailing ` \d+ Athletics/Club` patterns
- Expand truncated names where possible (e.g., `Volleyba` -> `Volleyball`, `Sofball` -> `Softball`)

**The wizard will use `useNavigate` to go back to `/dashboard/people/classes` on completion or cancel.**

