# Implementation Tasks: Expense & Budget Visualizer

## Task List

- [x] 1. Project scaffold and static structure
  - Create `index.html` with semantic HTML structure: balance panel, transaction form, filter control, transaction history list, and canvas chart section
  - Create `styles.css` with CSS custom properties, responsive layout (320px–1440px), and base component styles
  - Create `app.js` as the entry point with logical module sections (storage, transactions, ui, chart, main)
  - Ensure all form inputs have associated `<label>` elements and error containers use `role="alert"`
  - **Requirements: 1.1, 2.1, 3.1, 5.1, 6.1, 8.1, 8.2, 8.3**

- [x] 2. Data models and constants
  - Define the `Transaction` typedef/JSDoc shape with all fields: `id`, `description`, `amount`, `category`, `type`, `date`, `createdAt`
  - Define `CATEGORIES` array: `['Food', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Other']`
  - Define `CATEGORY_COLORS` map with the six fixed hex colors per the design
  - Implement `generateId()` using `crypto.randomUUID()` with a `Math.random()`-based UUID v4 fallback
  - **Requirements: 2.6, 5.4**

- [x] 3. Storage module
  - Implement `loadTransactions()`: reads and JSON-parses `expense_visualizer_transactions` from `localStorage`; returns `[]` and sets `storageError` flag on any failure
  - Implement `saveTransactions(transactions)`: JSON-serializes and writes to `localStorage`; returns `{ success: true }` on success or `{ success: false, error }` on failure
  - Write unit tests for both functions covering: normal round-trip, `localStorage` unavailable, and parse error scenarios
  - **Requirements: 7.1, 7.2, 7.3, 7.4, 7.6**

- [ ] 4. Domain logic — transactions module
  - Implement `computeSummary(transactions)`: returns `{ balance, totalIncome, totalExpenses }` rounded to 2 decimal places
  - Implement `computeCategoryTotals(transactions)`: returns a `Record<Category, number>` of expense totals per category (all six categories present, zero if no data)
  - Implement `addTransaction(state, formData)`: creates a new `Transaction` object, prepends it to `state.transactions`, calls `saveTransactions`, and returns updated state
  - Implement `deleteTransaction(state, id)`: removes the transaction with the given `id`, calls `saveTransactions`, and returns updated state
  - Implement `applyFilter(transactions, filter)`: returns the filtered subset based on type or category; returns all transactions when filter is `"All"`
  - Write unit tests for `computeSummary` (empty list, mixed transactions), `computeCategoryTotals` (no expenses, mixed), `applyFilter` (each filter value), and `deleteTransaction`
  - **Requirements: 1.2, 1.3, 1.5, 3.1, 4.2, 4.3, 5.1, 6.2, 6.3, 6.4**

- [~] 5. Form validation
  - Implement `validateTransactionForm(raw)`: validates all five fields and returns `{ valid: boolean, errors: Record<string, string> }`
  - Validation rules: description required and ≤ 200 chars; amount required, in range [0.01, 999,999,999.99], ≤ 2 decimal places; category must be one of the six valid values; type must be `"income"` or `"expense"`; date required and valid ISO date
  - Write unit tests for each individual invalid field and for a fully valid form object
  - **Requirements: 2.3, 2.4**

- [~] 6. UI rendering — balance panel and formatting helpers
  - Implement `formatAmount(value)`: formats a number as `$X,XXX.XX` (e.g., `$1,234.50`)
  - Implement `formatDate(isoString)`: converts `YYYY-MM-DD` to `DD/MM/YYYY`
  - Implement `renderBalancePanel(balance, totalIncome, totalExpenses)`: updates the DOM balance panel; applies red styling when balance is negative
  - Write unit tests for `formatAmount` and `formatDate` with representative values
  - **Requirements: 1.1, 1.3, 1.4, 1.5**

- [~] 7. UI rendering — transaction history list
  - Implement `renderTransactionList(transactions)`: renders a `<ul>` of transaction items in the provided order; each item shows description (CSS-truncated at 100 chars), amount (green for income, red for expense), category badge, type label, date in `DD/MM/YYYY`, and a 44×44 px delete button
  - Render `<p class="empty-state">` when `transactions.length === 0`; hide it otherwise
  - Write unit tests for the rendered HTML of a single transaction (description, amount, category, type, date present) and the empty-state case
  - **Requirements: 3.2, 3.3, 3.4, 3.5, 4.5, 8.2**

- [~] 8. UI rendering — pie chart
  - Implement `renderPieChart(ctx, categoryTotals)`: draws pie segments for categories with non-zero expense totals using the fixed `CATEGORY_COLORS`; draws a placeholder message when all totals are zero; always renders the legend for all six categories
  - Handle the case where the canvas context is unavailable: hide the chart section and show a fallback text message
  - Write unit tests for the all-zero placeholder case and verify the legend is always rendered
  - **Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

- [~] 9. Filter control
  - Render the filter `<select>` with options: All, Income, Expense, Food, Transport, Entertainment, Health, Shopping, Other
  - Wire the `change` event to update `state.activeFilter`, re-apply `applyFilter`, and re-render the transaction list
  - Reset the filter to `"All"` on page load
  - **Requirements: 6.1, 6.2, 6.3, 6.5**

- [~] 10. Event wiring and full re-render cycle (main.js)
  - Bootstrap the app: call `loadTransactions()`, initialize `AppState`, and perform the initial full render (balance panel, transaction list, chart)
  - Show the storage-unavailable banner (`role="alert"`) if `storageError` is set on load
  - Wire the form `submit` event: validate → show inline errors or save → reset form → full re-render
  - Wire the delete button `click` event: show confirmation prompt → delete → full re-render
  - Wire the filter `change` event to re-render the transaction list only (chart always shows all expense data)
  - Reset form to default state after successful save: description `""`, amount `""`, category `"Food"`, type `"Expense"`, date today
  - Show inline error near the form when `saveTransactions` returns `{ success: false }`
  - **Requirements: 1.2, 2.2, 2.5, 2.7, 4.1, 4.2, 4.3, 4.4, 5.2, 6.4, 7.1, 7.2**

- [~] 11. Responsive layout and accessibility polish
  - Implement responsive CSS breakpoints so the layout adapts from 320px to 1440px without horizontal scrolling
  - Ensure all interactive controls meet the 44×44 CSS px minimum touch target size
  - Ensure body text, inputs, labels, and navigation use ≥ 16px font size
  - Verify all form inputs have associated `<label>` elements; all error messages use `role="alert"`; income/expense distinction is conveyed by both color and text label
  - **Requirements: 8.1, 8.2, 8.3**

- [~] 12. Property-based tests
  - Set up fast-check via CDN `<script>` tag (or npm for a test runner environment) and a test runner file (e.g., `tests.js` or `tests.html`)
  - 12.1 Write property test for P1: Balance invariant — arbitrary transaction arrays → `computeSummary` balance equals income minus expenses, rounded to 2 dp
    - **Validates: Requirements 1.2, 1.3, 1.5, 4.3**
  - 12.2 Write property test for P2: Transaction sort order — arbitrary transaction arrays sorted by `createdAt` desc → adjacent pairs satisfy `list[i].createdAt >= list[i+1].createdAt`
    - **Validates: Requirements 3.1**
  - 12.3 Write property test for P3: Validation rejects invalid inputs — arbitrary form objects with ≥ 1 invalid field → `validateTransactionForm` returns `{ valid: false }` with errors for each invalid field
    - **Validates: Requirements 2.3, 2.4**
  - 12.4 Write property test for P4: Validation accepts valid inputs — arbitrary valid form objects → `validateTransactionForm` returns `{ valid: true }` with no errors
    - **Validates: Requirements 2.1, 2.2**
  - 12.5 Write property test for P5: LocalStorage round-trip — arbitrary transaction arrays → `loadTransactions()` after `saveTransactions(txns)` deeply equals `txns`
    - **Validates: Requirements 7.1, 7.3**
  - 12.6 Write property test for P6: Filter correctness — arbitrary transaction list + filter value → results match filter; no matching transaction excluded; "All" returns full list
    - **Validates: Requirements 6.2, 6.3, 6.4**
  - 12.7 Write property test for P7: Category totals correctness — arbitrary transaction list → sum of category totals equals total expenses; all values ≥ 0
    - **Validates: Requirements 5.1, 5.6, 4.4**
  - 12.8 Write property test for P8: Delete removes exactly one transaction — arbitrary list with ≥ 1 transaction, arbitrary id from list → list shrinks by 1; deleted id absent; all others unchanged
    - **Validates: Requirements 4.2, 7.4**
  - 12.9 Write property test for P9: Distinct category colors — all pairs of distinct categories → `CATEGORY_COLORS[a] !== CATEGORY_COLORS[b]`
    - **Validates: Requirements 5.4**
  - 12.10 Write property test for P10: Transaction rendering completeness — arbitrary valid transactions → rendered HTML contains truncated description, `$X.XX` amount, category, type, `DD/MM/YYYY` date
    - **Validates: Requirements 3.4**
  - 12.11 Write property test for P11: Category uniqueness — arbitrary name + existing list → `validateCategoryName` rejects case-insensitive duplicates
    - **Validates: Requirement 9.2**
  - 12.12 Write property test for P12: Monthly summary correctness — arbitrary transaction arrays → sum of monthly income totals equals total income; sum of monthly expense totals equals total expenses
    - **Validates: Requirements 10.1, 10.5**
  - 12.13 Write property test for P13: Sort correctness — arbitrary transaction list + sort key → result is a permutation; adjacent pairs satisfy sort predicate
    - **Validates: Requirements 11.2, 11.5**
  - 12.14 Write property test for P14: Limit alert correctness — arbitrary transactions + limits → flagged iff current-month total ≥ limit; false when no limit
    - **Validates: Requirements 12.3, 12.4, 12.5**
  - 12.15 Write property test for P15: Theme persistence — arbitrary theme value → `loadTheme()` after `saveTheme(theme)` returns same value
    - **Validates: Requirements 13.2, 13.3**

- [~] 13. Custom categories module
  - Implement `validateCategoryName(name, existingCategories)`: validates non-empty, ≤ 50 chars, unique case-insensitively; returns `{ valid, error? }`
  - Implement `loadCategories()`: reads `expense_visualizer_categories` from localStorage; returns `[]` on failure
  - Implement `saveCategories(categories)`: writes custom categories array to localStorage; returns `{ success, error? }`
  - Implement `addCategory(state, name)`, `editCategory(state, oldName, newName)`, `deleteCategory(state, name)` — each updates state.categories and calls saveCategories
  - Update `getCategories(state)` to merge BUILT_IN_CATEGORIES with state.categories
  - Update the transaction Form, Filter control, and Chart to use `getCategories(state)` instead of the static CATEGORIES constant
  - Write unit tests for `validateCategoryName` (empty, too long, duplicate case-insensitive, valid) and `loadCategories`/`saveCategories` round-trip
  - **Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7**

- [~] 14. Category Manager UI
  - Render the Category Manager panel with: a text input + Add button for new categories, and an Edit/Delete button pair for each custom category
  - Wire Add: validate → show inline error or save → re-render category list and update Form/Filter/Chart options
  - Wire Edit: show inline edit input → validate → save → re-render
  - Wire Delete: if category has associated transactions, show confirmation dialog describing impact; on confirm, delete and re-render; on cancel, do nothing
  - Show inline error (role="alert") when saveCategories returns `{ success: false }`
  - **Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7**

- [~] 15. Monthly Summary Panel
  - Implement `computeMonthlySummary(transactions)`: groups transactions by YYYY-MM, computes totalIncome, totalExpenses, balance per month, returns array sorted reverse-chronologically
  - Render the Monthly Summary Panel: one row per month showing month label, income, expenses, and balance (balance in red when negative); empty-state message when no transactions
  - Wire the panel to re-render within 1 second when transactions are added or deleted
  - Write unit tests for `computeMonthlySummary` (empty list, single month, multiple months, negative balance month)
  - **Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**

- [~] 16. Sort control
  - Implement `applySort(transactions, sortKey)`: supports `date-desc` (default), `amount-asc`, `amount-desc`, `category-asc`; returns a new sorted array without mutating input
  - Render the Sort `<select>` alongside the Filter control with the four options; default to `date-desc`
  - Update `AppState` to include `activeSort` (default `'date-desc'`); reset to `date-desc` on page load
  - Wire the sort `change` event: update `state.activeSort`, apply filter then sort, re-render transaction list only (chart unaffected)
  - Write unit tests for each sort key with representative transaction arrays
  - **Requirements: 11.1, 11.2, 11.3, 11.4, 11.5**

- [~] 17. Budget Limit Manager
  - Implement `loadLimits()`: reads `expense_visualizer_limits` from localStorage; returns `{}` on failure
  - Implement `saveLimits(limits)`: writes limits object to localStorage; returns `{ success, error? }`
  - Implement `computeLimitAlerts(transactions, limits)`: returns `Record<string, boolean>` — true when current-month expense total ≥ limit for that category
  - Render the Budget Limit Manager panel: one row per category with a number input and Save button; pre-populate with persisted limits
  - Wire Save: validate (positive number, ≤ 2 decimal places, or empty to clear) → save → re-compute alerts → re-render chart legend and transaction history highlights
  - Apply red highlight to category totals in the chart legend and transaction history when `computeLimitAlerts` returns true for that category
  - Show inline error (role="alert") when saveLimits returns `{ success: false }`
  - Write unit tests for `computeLimitAlerts` (no limits, limit exactly met, limit exceeded, limit not reached)
  - **Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8**

- [~] 18. Dark/Light Mode Toggle
  - Implement `loadTheme()`: reads `expense_visualizer_theme` from localStorage; returns `null` when absent
  - Implement `saveTheme(theme)`: writes `'light'` or `'dark'` to localStorage; returns `{ success, error? }`
  - Add an inline `<script>` in `<head>` of index.html that reads the theme from localStorage and sets `document.documentElement.setAttribute('data-theme', theme)` before first paint to prevent FOUC; falls back to `prefers-color-scheme` when no preference is stored
  - Define CSS custom properties on `:root` for the light theme and override them under `[data-theme="dark"]`
  - Render the Theme Toggle button/checkbox in the app header with a dynamic `aria-label` ("Switch to dark mode" / "Switch to light mode"); ensure it is keyboard operable (focusable, Enter/Space activatable)
  - Wire the toggle: flip theme in state → `saveTheme` → `document.documentElement.setAttribute('data-theme', theme)` → update aria-label
  - Write unit tests for `loadTheme` (no key → null, key present → correct value) and `saveTheme` round-trip
  - **Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6**
