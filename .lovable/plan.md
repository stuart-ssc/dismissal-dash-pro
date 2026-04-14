

# Fix People Page Search: Add Debouncing

## Problem
Every keystroke in the search input immediately updates `searchQuery`, which is in the react-query key. This triggers a new database query on every character, causing the page to reload/flash constantly.

## Solution
Add a debounced search pattern: keep a local `searchInput` state for the controlled input, and debounce it (300ms) before setting the actual `searchQuery` that feeds into the query.

## Changes — `src/pages/People.tsx`

1. Add a `searchInput` state for the text field value
2. Add a `useEffect` with a 300ms `setTimeout` to debounce `searchInput` → `searchQuery`
3. Reset `currentPage` to 1 inside the debounce effect (not on every keystroke)
4. Bind the `<Input>` to `searchInput` / `setSearchInput` instead of `searchQuery`

```tsx
const [searchInput, setSearchInput] = useState('');
const [searchQuery, setSearchQuery] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  }, 300);
  return () => clearTimeout(timer);
}, [searchInput]);

// Input binds to searchInput
<Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
```

One file edit, ~10 lines changed.

