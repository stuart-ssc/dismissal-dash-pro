

# Track Reviewed Classes & Remove Bulk Action Buttons

## What changes

### 1. Remove "Set Convert" and "Set Hide" bulk buttons
Remove the two buttons from the toolbar (lines 348-365). Keep Select All / Deselect All.

### 2. Track reviewed classes
When the user processes a batch (converts/hides selected classes), the unselected classes on the current page should be marked as "reviewed" so they sort to the bottom of the list on future visits.

**Database**: Add an `is_reviewed` boolean column to the `classes` table (default false). When the conversion RPC runs, it will also mark all unselected candidate classes as `is_reviewed = true` (passed as a separate array parameter).

**Migration update to `convert_classes_to_groups` RPC**: Accept an additional parameter `p_reviewed_class_ids uuid[]` and run:
```sql
UPDATE classes SET is_reviewed = true WHERE id = ANY(p_reviewed_class_ids);
```

**UI sorting**: Query results will sort unreviewed classes first, reviewed classes last. A reviewed class shows a subtle "Reviewed" badge and appears at the bottom of the list. Users can still select and convert/hide a reviewed class if they change their mind.

### 3. UI flow
- User goes through page 1, selects some classes, clicks "Review N Selected"
- On Step 2 confirm, the mutation sends both the selected conversions AND the IDs of unselected classes visible in the candidate list as "reviewed"
- When returning to the wizard, reviewed classes appear at the bottom with a "Reviewed" indicator
- The candidate list sorts: unreviewed keyword-matched classes first, then reviewed classes at the end

### Files to modify
- `src/pages/ConvertClassesToGroups.tsx` -- remove bulk buttons, add reviewed tracking logic, sort reviewed to bottom
- **New migration**: add `is_reviewed` column to `classes`, update `convert_classes_to_groups` RPC to accept and set reviewed IDs

