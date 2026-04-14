

# Match Groups Table Styling to Classes Table

## Differences found

| Aspect | Classes page | Groups page |
|--------|-------------|-------------|
| Table wrapper | `rounded-md border bg-background/50` | `border rounded-lg bg-background overflow-hidden` + extra `overflow-x-auto` div |
| Header row | `border-border hover:bg-muted/50` | `bg-muted/50 hover:bg-muted/50` (has background tint) |
| Body rows | `border-border hover:bg-muted/30` | `hover:bg-muted/50 transition-colors` |
| Actions column | `w-[50px]`, no text-right | `text-right` on head and cell |
| Trigger button | `className="h-8 w-8 p-0"` | `size="icon"` |
| Dropdown content | `className="bg-background border border-border shadow-lg z-50"` | `className="w-48"` |
| Students column | Uses `<Badge variant="secondary">` | Plain text, `text-center` |

## Changes to `src/pages/GroupsTeams.tsx`

1. **Table wrapper**: Change to `<div className="rounded-md border bg-background/50">` and remove the extra `overflow-x-auto` wrapper div
2. **Header row**: Change from `bg-muted/50 hover:bg-muted/50` to `border-border hover:bg-muted/50`
3. **Body rows**: Change from `hover:bg-muted/50 transition-colors` to `border-border hover:bg-muted/30`
4. **Actions column**: Change `TableHead` from `text-right` to `w-[50px]`, remove `text-right` from Actions `TableCell`
5. **Dropdown trigger**: Change from `size="icon"` to `className="h-8 w-8 p-0"`
6. **Dropdown content**: Add `className="bg-background border border-border shadow-lg z-50"` and remove `w-48`
7. **Students count**: Wrap student count in `<Badge variant="secondary">` to match Classes page styling; remove `text-center` from Students header/cells

## File
- `src/pages/GroupsTeams.tsx` (desktop table section, ~lines 397-470)

