# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page web application (SPA) built with plain HTML, CSS, and Vanilla JavaScript — no frameworks, no build tools, no backend. It runs entirely in the browser and uses the `localStorage` Web Storage API for persistence.

The application lets users:
- Record income and expense transactions with a description, amount, category, type, and date
- See their current balance, income subtotal, and expense subtotal at a glance
- Browse, filter, sort, and delete their transaction history
- Visualize spending by category via a pie chart rendered on an HTML `<canvas>` element
- Create, edit, and delete custom spending categories beyond the six built-in ones
- View a monthly summary of income, expenses, and net balance grouped by calendar month
- Sort the transaction history by date, amount, or category
- Set per-category monthly budget limits and receive visual alerts when limits are exceeded
- Toggle between dark and light color themes, with the preference persisted across sessions

All state lives in memory during a session and is serialized to/from `localStorage` on every mutation. The app is fully responsive from 320 px to 1440 px and meets WCAG 2.1 AA touch-target and font-size requirements.

---

## Architecture

The app is a single HTML file (`index.html`) that loads one CSS file (`styles.css`) and one JavaScript module (`app.js`). There is no bundler, no transpiler, and no server-side rendering.

```
index.html
├── styles.css          (layout, theming, responsive breakpoints, CSS custom properties for dark/light)
└── app.js              (all application logic, split into logical modules)
    ├── storage.js      (LocalStorage read/write/error handling)
    ├── transactions.js (domain logic: add, delete, filter, sort, balance calc)
    ├── categories.js   (custom category management: add, edit, delete, merge with built-ins)
    ├── summary.js      (monthly summary computation and limit alert logic)
    ├── theme.js        (theme persistence: saveTheme, loadTheme, applyTheme)
    ├── ui.js           (DOM rendering: balance panel, history list, form, sort/filter controls,
    │                    category manager, monthly summary panel, budget limit manager, theme toggle)
    ├── chart.js        (Canvas pie chart rendering)
    └── main.js         (bootstrap, event wiring)
```

> **Note:** Because the project uses no bundler, the "modules" above are logical sections within `app.js` (or separate `<script>` tags loaded in order). They can be split into ES modules loaded via `<script type="module">` if the deployment target supports it (all modern browsers do).

### Data Flow

```
User Action
    │
    ▼
Event Handler (main.js)
    │
    ├─► transactions.js  ──► storage.js  (persist to localStorage)
    │       │
    │       └─► Derived state (balance, subtotals, filtered list)
    │
    ├─► ui.js            (re-render balance panel + history list)
    └─► chart.js         (re-render canvas chart)
```

Every mutation (add / delete) triggers a full re-render of the balance panel, the transaction list, and the chart. Because the maximum dataset is 1 000 transactions and all rendering is synchronous DOM manipulation, this is fast enough to meet the ≤ 500 ms / ≤ 1 s update requirements without virtual DOM diffing.

---

## Components and Interfaces

### 1. Balance Panel

Displays the current balance, income subtotal, and expense subtotal.

```
┌─────────────────────────────────┐
│  Balance: $1,234.56             │  ← red when negative
│  Income:  $2,000.00             │
│  Expenses: $765.44              │
└─────────────────────────────────┘
```

**Rendering function signature:**
```js
/**
 * @param {number} balance
 * @param {number} totalIncome
 * @param {number} totalExpenses
 */
function renderBalancePanel(balance, totalIncome, totalExpenses) {}
```

### 2. Transaction Form

Collects description, amount, category, type, and date. Validates on submit.

Fields:
| Field | Type | Constraints |
|---|---|---|
| description | `<input type="text">` | required, max 200 chars |
| amount | `<input type="number">` | required, 0.01 – 999,999,999.99, ≤ 2 decimal places |
| category | `<select>` | Food, Transport, Entertainment, Health, Shopping, Other |
| type | `<select>` or radio | Income, Expense |
| date | `<input type="date">` | required, defaults to today |

**Validation function signature:**
```js
/**
 * @param {FormData|Object} raw
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
function validateTransactionForm(raw) {}
```

**Default reset state after successful save:**
- description: `""`
- amount: `""`
- category: `"Food"`
- type: `"Expense"`
- date: today's date (ISO format)

### 3. Transaction History List

Renders a `<ul>` of transaction items in reverse-chronological order. Each item shows:
- Description (truncated at 100 chars with CSS `text-overflow: ellipsis`)
- Amount (green for income, red for expense, formatted `$X.XX`)
- Category badge
- Type label
- Date (`DD/MM/YYYY`)
- Delete button (44 × 44 px touch target)

**Rendering function signature:**
```js
/**
 * @param {Transaction[]} transactions  — already filtered and sorted
 */
function renderTransactionList(transactions) {}
```

Empty state: when `transactions.length === 0`, renders a `<p class="empty-state">` message.

### 4. Filter Control

A `<select>` element with options: All, Income, Expense, Food, Transport, Entertainment, Health, Shopping, Other.

Resets to "All" on page load. Triggers a re-render of the transaction list (does **not** affect the chart, which always shows all expense data).

**Filter function signature:**
```js
/**
 * @param {Transaction[]} transactions
 * @param {string} filter  — one of the filter option values
 * @returns {Transaction[]}
 */
function applyFilter(transactions, filter) {}
```

### 5. Pie Chart (Canvas)

Rendered on a `<canvas>` element. Displays total expense amounts grouped by category.

**Rendering function signature:**
```js
/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Record<Category, number>} categoryTotals  — zero values included
 */
function renderPieChart(ctx, categoryTotals) {}
```

Behavior:
- Categories with zero expense are omitted from the pie segments but remain in the legend.
- When all categories are zero, a placeholder message is drawn on the canvas.
- Each category has a fixed color (see Data Models section).
- A legend is always rendered alongside the chart.

### 6. Storage Module

Wraps `localStorage` with error handling.

```js
/**
 * @returns {Transaction[]}  — empty array on parse error or unavailability
 */
function loadTransactions() {}

/**
 * @param {Transaction[]} transactions
 * @returns {{ success: boolean, error?: string }}
 */
function saveTransactions(transactions) {}
```

On `loadTransactions` failure: returns `[]` and sets a flag so the UI can show the storage-unavailable warning.

On `saveTransactions` failure: returns `{ success: false, error: '...' }` so the caller can display an inline error and keep the transaction in memory.

### 7. Category Manager

Allows users to add, edit, and delete custom categories. Rendered as a dedicated panel (collapsible or always-visible section).

```
┌─────────────────────────────────────────┐
│  Custom Categories                      │
│  ┌──────────────────────┐  [Add]        │
│  │ New category name... │               │
│  └──────────────────────┘               │
│  • Groceries  [Edit] [Delete]           │
│  • Utilities  [Edit] [Delete]           │
└─────────────────────────────────────────┘
```

Inline validation fires on submit:
- Name must be non-empty and ≤ 50 characters.
- Name must be unique case-insensitively across built-in and custom categories.

When deleting a category that has associated transactions, a confirmation dialog describes the impact before proceeding.

**Validation function signature:**
```js
/**
 * @param {string} name
 * @param {string[]} existingCategories  — full merged list (built-in + custom)
 * @returns {{ valid: boolean, error?: string }}
 */
function validateCategoryName(name, existingCategories) {}
```

**Storage function signatures:**
```js
/**
 * @param {string[]} categories  — custom categories only (not built-ins)
 * @returns {{ success: boolean, error?: string }}
 */
function saveCategories(categories) {}

/**
 * @returns {string[]}  — empty array on parse error or unavailability
 */
function loadCategories() {}
```

LocalStorage key: `expense_visualizer_categories`

### 8. Monthly Summary Panel

Groups all transactions by calendar month (YYYY-MM) and displays income, expenses, and net balance per month in reverse-chronological order.

```
┌──────────────────────────────────────────────────┐
│  Monthly Summary                                 │
│  ─────────────────────────────────────────────── │
│  2025-05  Income: $3,200.00  Expenses: $1,450.00 │
│           Balance: $1,750.00                     │
│  2025-04  Income: $3,200.00  Expenses: $3,500.00 │
│           Balance: -$300.00  ← red               │
└──────────────────────────────────────────────────┘
```

Empty state: when no transactions exist, renders a `<p class="empty-state">` message.

**Derived function signature:**
```js
/**
 * @param {Transaction[]} transactions
 * @returns {Array<{ month: string, totalIncome: number, totalExpenses: number, balance: number }>}
 *   — sorted reverse-chronologically by month string (YYYY-MM desc)
 */
function computeMonthlySummary(transactions) {}
```

### 9. Sort Control

A `<select>` element placed alongside the existing Filter control in the transaction history toolbar.

Options:
| Value | Label |
|---|---|
| `date-desc` | Date (Newest First) — **default** |
| `amount-asc` | Amount (Low to High) |
| `amount-desc` | Amount (High to Low) |
| `category-asc` | Category (A–Z) |

Resets to `date-desc` on page load. Applied **after** the active filter.

**Sort function signature:**
```js
/**
 * @param {Transaction[]} transactions  — already filtered
 * @param {string} sortKey  — one of the sort option values
 * @returns {Transaction[]}  — new array, same elements, different order
 */
function applySort(transactions, sortKey) {}
```

### 10. Budget Limit Manager

A UI panel (collapsible or inline) that lets users set a monthly spending limit per category.

```
┌──────────────────────────────────────────┐
│  Budget Limits (current month)           │
│  Food:          [$  200.00] [Save]       │
│  Transport:     [$   80.00] [Save]       │
│  Entertainment: [        ] [Save]        │
└──────────────────────────────────────────┘
```

- Limit value must be a positive number with at most 2 decimal places.
- Setting a limit to empty or zero removes it.
- Categories whose current-month expense total ≥ limit are highlighted in red in the chart legend and transaction history.

**Storage function signatures:**
```js
/**
 * @param {Record<string, number>} limits  — keyed by category name
 * @returns {{ success: boolean, error?: string }}
 */
function saveLimits(limits) {}

/**
 * @returns {Record<string, number>}  — empty object on parse error or unavailability
 */
function loadLimits() {}
```

LocalStorage key: `expense_visualizer_limits`

**Alert computation function signature:**
```js
/**
 * @param {Transaction[]} transactions
 * @param {Record<string, number>} limits
 * @returns {Record<string, boolean>}  — true when current-month expense total >= limit
 */
function computeLimitAlerts(transactions, limits) {}
```

### 11. Theme Toggle

A button or checkbox in the app header that switches between light and dark themes.

- `aria-label` updates dynamically: "Switch to dark mode" / "Switch to light mode".
- Keyboard operable: focusable, activatable via Enter or Space.
- Theme applied via `document.documentElement.setAttribute('data-theme', theme)`.
- An inline `<script>` in `<head>` reads `localStorage` and sets the attribute before the first paint to prevent FOUC.

**CSS implementation:**
```css
:root {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  /* ... other light-theme tokens ... */
}

[data-theme="dark"] {
  --color-bg: #1a1a1a;
  --color-text: #f0f0f0;
  /* ... dark-theme overrides ... */
}
```

**Storage function signatures:**
```js
/**
 * @param {'light'|'dark'} theme
 * @returns {{ success: boolean, error?: string }}
 */
function saveTheme(theme) {}

/**
 * @returns {'light'|'dark'|null}  — null when no preference stored
 */
function loadTheme() {}
```

LocalStorage key: `expense_visualizer_theme`

---

## Data Models

### Transaction

```js
/**
 * @typedef {Object} Transaction
 * @property {string}   id          — UUID v4 (crypto.randomUUID() or fallback)
 * @property {string}   description — 1–200 characters
 * @property {number}   amount      — positive float, max 2 decimal places
 * @property {Category} category
 * @property {'income'|'expense'} type
 * @property {string}   date        — ISO 8601 date string (YYYY-MM-DD)
 * @property {number}   createdAt   — Unix timestamp ms (Date.now())
 */
```

### Category Enum

```js
// Built-in categories — always present
const BUILT_IN_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Other'];

// Runtime category list — built-ins merged with custom categories loaded from localStorage
// This replaces the static CATEGORIES constant; always use getCategories() at runtime.
function getCategories(state) {
  return [...BUILT_IN_CATEGORIES, ...state.categories];
}
```

### Category Colors

Built-in categories use fixed, distinct colors. Custom categories cycle through an extended palette when the six built-in slots are exhausted.

| Category | Color |
|---|---|
| Food | `#FF6384` |
| Transport | `#36A2EB` |
| Entertainment | `#FFCE56` |
| Health | `#4BC0C0` |
| Shopping | `#9966FF` |
| Other | `#FF9F40` |

Extended palette (for custom categories, cycled in order):
`#C9CBCF`, `#7BC8A4`, `#E8A838`, `#5B8DB8`, `#D4526E`, `#8D5B4C`, `#5E4FA2`, `#66C2A5`

### LocalStorage Schema

Key: `expense_visualizer_transactions`  
Value: JSON-serialized `Transaction[]`

Key: `expense_visualizer_categories`  
Value: JSON-serialized `string[]` (custom category names only)

Key: `expense_visualizer_limits`  
Value: JSON-serialized `Record<string, number>` (category name → limit amount)

Key: `expense_visualizer_theme`  
Value: `"light"` or `"dark"`

```json
[
  {
    "id": "uuid-v4",
    "description": "Lunch at cafe",
    "amount": 12.50,
    "category": "Food",
    "type": "expense",
    "date": "2025-01-15",
    "createdAt": 1736956800000
  }
]
```

### AppState (in-memory)

```js
/**
 * @typedef {Object} AppState
 * @property {Transaction[]}        transactions   — master list, sorted by createdAt desc
 * @property {string}               activeFilter   — current filter value, default 'All'
 * @property {string}               activeSort     — current sort key, default 'date-desc'
 * @property {string[]}             categories     — custom categories only (built-ins always prepended at runtime)
 * @property {Record<string,number>} limits        — per-category monthly budget limits
 * @property {'light'|'dark'}       theme          — current UI theme
 * @property {boolean}              storageError   — true if localStorage is unavailable
 */
```

### BudgetLimits

```js
/**
 * @typedef {Record<string, number>} BudgetLimits
 * Keys are category names (built-in or custom).
 * Values are positive monetary limits with at most 2 decimal places.
 * A missing key means no limit is set for that category.
 */
```

### MonthlySummaryRow

```js
/**
 * @typedef {Object} MonthlySummaryRow
 * @property {string} month          — calendar month in YYYY-MM format
 * @property {number} totalIncome    — sum of income transaction amounts for the month
 * @property {number} totalExpenses  — sum of expense transaction amounts for the month
 * @property {number} balance        — totalIncome - totalExpenses, rounded to 2 decimal places
 */
```

### Derived Values (computed on every render)

```js
/**
 * @param {Transaction[]} transactions
 * @returns {{ balance: number, totalIncome: number, totalExpenses: number }}
 */
function computeSummary(transactions) {}

/**
 * @param {Transaction[]} transactions
 * @returns {Record<Category, number>}  — expense totals per category
 */
function computeCategoryTotals(transactions) {}

/**
 * @param {Transaction[]} transactions
 * @returns {MonthlySummaryRow[]}  — sorted reverse-chronologically by month
 */
function computeMonthlySummary(transactions) {}

/**
 * @param {Transaction[]} transactions
 * @param {BudgetLimits} limits
 * @returns {Record<string, boolean>}  — true when current-month expense total >= limit
 */
function computeLimitAlerts(transactions, limits) {}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Balance invariant

*For any* list of transactions (including the empty list), `computeSummary` SHALL return a balance equal to the sum of all income amounts minus the sum of all expense amounts, a `totalIncome` equal to the sum of all income amounts, and a `totalExpenses` equal to the sum of all expense amounts — all rounded to 2 decimal places.

**Validates: Requirements 1.2, 1.3, 1.5, 4.3**

---

### Property 2: Transaction sort order

*For any* non-empty list of transactions, sorting by `createdAt` descending SHALL produce a list where every adjacent pair satisfies `list[i].createdAt >= list[i+1].createdAt`.

**Validates: Requirements 3.1**

---

### Property 3: Validation rejects invalid inputs

*For any* form object where at least one required field is empty, whitespace-only, or the amount is outside the range [0.01, 999,999,999.99] or has more than 2 decimal places, `validateTransactionForm` SHALL return `{ valid: false }` with a non-empty error message for every invalid field.

**Validates: Requirements 2.3, 2.4**

---

### Property 4: Validation accepts valid inputs

*For any* form object where all required fields are non-empty, the description is ≤ 200 characters, the amount is within [0.01, 999,999,999.99] with at most 2 decimal places, the category is one of the six valid categories, the type is "income" or "expense", and the date is a valid ISO date string, `validateTransactionForm` SHALL return `{ valid: true }` with no error messages.

**Validates: Requirements 2.1, 2.2**

---

### Property 5: LocalStorage round-trip preserves transactions

*For any* array of transactions, calling `saveTransactions` followed by `loadTransactions` SHALL produce an array that is deeply equal to the original — preserving all fields: `id`, `description`, `amount`, `category`, `type`, `date`, and `createdAt`.

**Validates: Requirements 7.1, 7.3**

---

### Property 6: Filter correctness

*For any* transaction list and any filter value:
- When the filter is "All", `applyFilter` SHALL return all transactions unchanged.
- When the filter is any other value, every transaction in the result SHALL match the filter criterion (type or category), and every transaction in the original list that matches the criterion SHALL appear in the result (no false exclusions).

**Validates: Requirements 6.2, 6.3, 6.4**

---

### Property 7: Category totals correctness

*For any* transaction list, the sum of all values returned by `computeCategoryTotals` SHALL equal the sum of all expense transaction amounts, and every individual category total SHALL be ≥ 0.

**Validates: Requirements 5.1, 5.6, 4.4**

---

### Property 8: Delete removes exactly one transaction

*For any* transaction list containing at least one transaction, and any `id` present in that list, deleting by that `id` SHALL produce a list that is exactly one element shorter, does not contain any transaction with that `id`, and contains all other original transactions with their fields unchanged.

**Validates: Requirements 4.2, 7.4**

---

### Property 9: Distinct category colors

*For any* two distinct categories in `CATEGORIES`, their assigned colors in `CATEGORY_COLORS` SHALL be different — no two categories share the same color value.

**Validates: Requirements 5.4**

---

### Property 10: Transaction rendering completeness

*For any* transaction, the rendered HTML string for that transaction item SHALL contain the description (truncated to at most 100 characters), the amount formatted as `$X.XX`, the category, the type, and the date formatted as `DD/MM/YYYY`.

**Validates: Requirements 3.4**

---

### Property 11: Category uniqueness invariant

*For any* list of categories (built-in categories merged with any set of custom category names), no two entries in the merged list SHALL be equal when compared case-insensitively — i.e., `validateCategoryName` SHALL reject any name that matches an existing category name under case-insensitive comparison.

**Validates: Requirements 9.2**

---

### Property 12: Monthly summary correctness

*For any* list of transactions, the sum of all `totalIncome` values across all `MonthlySummaryRow` entries returned by `computeMonthlySummary` SHALL equal the sum of all income transaction amounts in the original list, and the sum of all `totalExpenses` values SHALL equal the sum of all expense transaction amounts — both rounded to 2 decimal places.

**Validates: Requirements 10.1, 10.5**

---

### Property 13: Sort correctness — permutation invariant

*For any* transaction list and any valid sort key (`date-desc`, `amount-asc`, `amount-desc`, `category-asc`), `applySort` SHALL return a list that is a permutation of the input: it contains exactly the same transaction `id` values, no additions, no removals, and every adjacent pair in the result satisfies the ordering predicate for the given sort key.

**Validates: Requirements 11.2, 11.5**

---

### Property 14: Limit alert correctness

*For any* transaction list and any `BudgetLimits` map, `computeLimitAlerts` SHALL return `true` for a category if and only if the sum of expense transaction amounts for that category in the current calendar month is greater than or equal to the category's limit value; categories with no entry in the limits map SHALL always return `false`.

**Validates: Requirements 12.3, 12.4, 12.5**

---

### Property 15: Theme persistence round-trip

*For any* theme value (`'light'` or `'dark'`), calling `saveTheme(theme)` followed by `loadTheme()` SHALL return the same value that was saved.

**Validates: Requirements 13.2, 13.3**

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `localStorage` unavailable on load | Show persistent banner: "Storage unavailable — data will not be saved this session." Operate with empty list. |
| `localStorage` parse error on load | Same as unavailable. |
| `localStorage.setItem` throws (quota exceeded, etc.) | Show inline error near the form: "Save failed — your transaction is available this session only." Keep transaction in memory. |
| Form submitted with empty required fields | Show inline error adjacent to each empty field. Do not save. |
| Amount out of range or non-positive | Show inline error adjacent to amount field. Do not save. |
| `crypto.randomUUID` unavailable | Fall back to `Math.random()`-based UUID v4 polyfill. |
| Canvas context unavailable | Hide chart section; show text message: "Chart unavailable in this browser." |
| `saveCategories` fails (quota exceeded, etc.) | Show inline error in the Category Manager: "Category save failed — changes are available this session only." Keep updated list in memory. |
| `saveLimits` fails (quota exceeded, etc.) | Show inline error in the Budget Limit Manager: "Limit save failed — changes are available this session only." Keep updated limits in memory. |
| `saveTheme` fails (quota exceeded, etc.) | Apply the theme to the UI immediately (in-memory), but silently skip persistence; optionally show a transient warning: "Theme preference could not be saved." |

All error messages are rendered as `role="alert"` live regions so screen readers announce them immediately.

---

## Testing Strategy

### Unit Tests (example-based)

Focus on specific behaviors and edge cases:

- `computeSummary([])` → `{ balance: 0, totalIncome: 0, totalExpenses: 0 }`
- `computeSummary` with mixed income/expense transactions
- `validateTransactionForm` with each individual invalid field
- `applyFilter` with "All", "Income", "Expense", and each category
- `computeCategoryTotals` with no expense transactions
- `renderPieChart` called with all-zero totals renders placeholder text
- `loadTransactions` when `localStorage` throws → returns `[]`
- `saveTransactions` when `localStorage.setItem` throws → returns `{ success: false }`
- Date formatting: `formatDate('2025-01-15')` → `'15/01/2025'`
- Amount formatting: `formatAmount(1234.5)` → `'$1,234.50'`
- `validateCategoryName('', existingCategories)` → `{ valid: false }` (empty name)
- `validateCategoryName('food', ['Food', 'Transport'])` → `{ valid: false }` (case-insensitive duplicate)
- `validateCategoryName('A'.repeat(51), existingCategories)` → `{ valid: false }` (exceeds 50 chars)
- `validateCategoryName('Groceries', BUILT_IN_CATEGORIES)` → `{ valid: true }`
- `computeMonthlySummary([])` → `[]`
- `computeMonthlySummary` with transactions spanning multiple months → rows in reverse-chronological order
- `applySort(transactions, 'date-desc')` → most recent transaction first
- `applySort(transactions, 'amount-asc')` → lowest amount first
- `applySort(transactions, 'category-asc')` → alphabetical by category
- `computeLimitAlerts(transactions, {})` → all `false` (no limits set)
- `computeLimitAlerts` with a category whose current-month total exactly equals its limit → `true`
- `loadTheme()` when no key in `localStorage` → `null`
- `saveTheme('dark')` then `loadTheme()` → `'dark'`

### Property-Based Tests

Uses **fast-check** (loaded via CDN `<script>` tag for zero-build-tool compatibility).

Each property test runs a minimum of **100 iterations**.

Tag format: `// Feature: expense-budget-visualizer, Property N: <property_text>`

| Property | Generator inputs | Assertion |
|---|---|---|
| P1: Balance invariant | Arbitrary arrays of valid transactions (including empty) | `computeSummary(txns).balance === income - expenses` |
| P2: Transaction sort order | Arbitrary arrays of valid transactions | Adjacent pairs satisfy `list[i].createdAt >= list[i+1].createdAt` |
| P3: Validation rejects invalid | Arbitrary form objects with ≥ 1 invalid field (empty, whitespace, bad amount) | `validateTransactionForm(raw).valid === false` with errors for each invalid field |
| P4: Validation accepts valid | Arbitrary valid form objects | `validateTransactionForm(raw).valid === true` with no errors |
| P5: LocalStorage round-trip | Arbitrary transaction arrays | `loadTransactions()` after `saveTransactions(txns)` deeply equals `txns` |
| P6: Filter correctness | Arbitrary transaction list + arbitrary filter value | All results match filter; no matching transaction excluded; "All" returns full list |
| P7: Category totals | Arbitrary transaction list | Sum of category totals === total expenses; all values ≥ 0 |
| P8: Delete removes exactly one | Arbitrary list with ≥ 1 transaction, arbitrary id from list | List shrinks by 1; deleted id absent; all others unchanged |
| P9: Distinct category colors | All pairs of distinct categories | `CATEGORY_COLORS[a] !== CATEGORY_COLORS[b]` for all `a !== b` |
| P10: Transaction rendering completeness | Arbitrary valid transactions | Rendered HTML contains truncated description, `$X.XX` amount, category, type, `DD/MM/YYYY` date |
| P11: Category uniqueness invariant | Arbitrary custom category name + existing category list | `validateCategoryName` rejects any name that matches an existing entry case-insensitively |
| P12: Monthly summary correctness | Arbitrary transaction arrays | Sum of all `totalIncome` across rows === total income; sum of all `totalExpenses` === total expenses |
| P13: Sort correctness — permutation | Arbitrary transaction list + arbitrary sort key | Result contains same ids as input (permutation); adjacent pairs satisfy sort predicate |
| P14: Limit alert correctness | Arbitrary transaction list + arbitrary limits map | `computeLimitAlerts` returns `true` iff current-month expense total ≥ limit; `false` when no limit set |
| P15: Theme persistence round-trip | Arbitrary theme value (`'light'` or `'dark'`) | `loadTheme()` after `saveTheme(theme)` returns the same value |

### Integration / Smoke Tests

- App loads in a browser with no `localStorage` data → balance shows `$0.00`, empty-state message visible.
- App loads with pre-seeded `localStorage` data → transactions render correctly.
- Full add → verify → delete → verify cycle in a headless browser (Playwright or manual).

### Accessibility Checks

- All form inputs have associated `<label>` elements.
- Error messages use `role="alert"`.
- Color is not the sole means of conveying information (income/expense also labeled by text).
- Touch targets ≥ 44 × 44 CSS px verified via CSS audit.
- Font sizes ≥ 16 px for body text and inputs.

> Full WCAG 2.1 AA validation requires manual testing with assistive technologies and expert accessibility review.
