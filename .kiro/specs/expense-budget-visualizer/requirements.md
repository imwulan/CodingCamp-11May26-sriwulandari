# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-friendly, single-page web application that helps users track their daily spending. Built with plain HTML, CSS, and Vanilla JavaScript, it runs entirely in the browser with no backend required. Users can add income and expense transactions, view their current balance, browse a history of past transactions, and see a visual breakdown of spending by category — all stored locally via the browser's LocalStorage API. The app also supports custom spending categories beyond the six built-in ones, a monthly summary view that groups transactions by calendar month, flexible sort controls for the transaction history, per-category monthly budget limits with visual alerts when limits are exceeded, and a dark/light mode toggle that respects the user's system preference and persists the chosen theme across sessions.

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single financial record consisting of a description, amount, category, type (income or expense), and date.
- **Balance**: The running total calculated as the sum of all income transactions minus the sum of all expense transactions.
- **Category**: A user-selected label that classifies a transaction (e.g., Food, Transport, Entertainment, Health, Shopping, Other).
- **Transaction_History**: The chronological list of all recorded transactions displayed in the UI.
- **Chart**: A visual representation (e.g., pie or bar chart) rendered on an HTML canvas element showing spending amounts grouped by category.
- **LocalStorage**: The browser's Web Storage API used to persist transaction data client-side.
- **Form**: The UI input area where users enter transaction details before saving.
- **Filter**: A UI control that limits which transactions are shown in the Transaction_History.
- **Custom_Category**: A user-defined spending category created by the user beyond the six built-in categories (Food, Transport, Entertainment, Health, Shopping, Other), stored in LocalStorage and available throughout the App wherever categories are listed.
- **Monthly_Summary**: A grouped view that aggregates all Transactions within a single calendar month (identified by YYYY-MM), showing total income, total expenses, and net balance for that month.
- **Sort**: A UI control that determines the order in which Transactions are displayed in the Transaction_History; does not affect the Chart.
- **Budget_Limit**: A user-defined positive monetary threshold set per Category for a given calendar month; when the total expense amount for that Category in the current month meets or exceeds the limit, the App provides a visual alert.
- **Theme**: The color scheme applied to the App's UI, either "dark" or "light", toggled by the user and persisted to LocalStorage.

---

## Requirements

### Requirement 1: Display Current Balance

**User Story:** As a user, I want to see my current balance at a glance, so that I know how much money I have available.

#### Acceptance Criteria

1. THE App SHALL display the current Balance as the first financial figure visible on the main screen, formatted to 2 decimal places with a currency symbol (e.g., $0.00).
2. WHEN a Transaction is added or deleted, THE App SHALL recalculate and update the displayed Balance within 1 second.
3. THE App SHALL display income and expense subtotals separately on the same screen as the Balance, each formatted to 2 decimal places with a currency symbol.
4. WHEN the Balance is negative, THE App SHALL display the Balance value in red to indicate a deficit, and SHALL display the Balance value regardless of whether the color styling is applied successfully.
5. WHEN no Transactions exist, THE App SHALL display the Balance as $0.00, the income subtotal as $0.00, and the expense subtotal as $0.00.

---

### Requirement 2: Add a Transaction

**User Story:** As a user, I want to add income and expense transactions, so that I can record my financial activity.

#### Acceptance Criteria

1. THE Form SHALL include input fields for: description (text, max 200 characters), amount (positive number between 0.01 and 999,999,999.99 with up to 2 decimal places), category (selection from predefined list), type (income or expense), and date.
2. WHEN the user submits the Form with all required fields filled and valid, THE App SHALL save the Transaction to LocalStorage and display it at the top of the Transaction_History.
3. IF the user submits the Form with one or more required fields empty, THEN THE App SHALL display an inline validation error message adjacent to each empty field and SHALL NOT save the Transaction.
4. IF the user enters a non-positive number or a value outside the allowed range in the amount field, THEN THE App SHALL display a validation error adjacent to the amount field and SHALL NOT save the Transaction.
5. WHEN a Transaction is successfully saved, THE App SHALL clear the Form fields and reset them to their default state: description empty, amount empty, category set to "Food", type set to "Expense", and date set to today's date.
6. THE Form SHALL provide the following Category options: Food, Transport, Entertainment, Health, Shopping, and Other.
7. IF the LocalStorage write operation fails when saving a Transaction, THEN THE App SHALL display an inline error message indicating the save failed and SHALL retain the Transaction in the active session memory for the current session.

---

### Requirement 3: View Transaction History

**User Story:** As a user, I want to see a list of all my past transactions, so that I can review my spending history.

#### Acceptance Criteria

1. WHEN the Transaction_History view is loaded, THE App SHALL display Transactions in reverse-chronological order (most recent first), up to a maximum of 1000 transactions.
2. WHEN no Transactions exist in LocalStorage, THE App SHALL display an empty-state message indicating that no transactions have been recorded.
3. WHEN at least one Transaction exists, THE App SHALL hide the empty-state message.
4. THE Transaction_History SHALL display for each Transaction: the description (truncated at 100 characters), amount (formatted as a positive number to 2 decimal places with a currency symbol), category, type, and date (formatted as DD/MM/YYYY).
5. THE App SHALL display income Transaction amounts in green text and expense Transaction amounts in red text.
6. IF LocalStorage is unavailable or returns a parse error on load, THEN THE App SHALL display a warning message indicating storage is unavailable and SHALL render an empty Transaction_History for the current session.

---

### Requirement 4: Delete a Transaction

**User Story:** As a user, I want to delete a transaction, so that I can remove incorrect or unwanted entries.

#### Acceptance Criteria

1. WHEN the user activates the delete control on a Transaction, THE App SHALL display a confirmation prompt before deletion.
2. WHEN the user confirms deletion, THE App SHALL remove that Transaction from LocalStorage and from the Transaction_History within 500ms.
3. WHEN a Transaction is deleted, THE App SHALL recalculate and update the Balance, income subtotal, and expense subtotal within 500ms.
4. WHEN a Transaction is deleted, THE App SHALL update the Chart to reflect the removal within 500ms.
5. WHEN the last Transaction is deleted, THE App SHALL display the empty-state message in the Transaction_History.

---

### Requirement 5: Visualize Spending by Category

**User Story:** As a user, I want to see a chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE App SHALL render a Chart that displays total expense amounts grouped by Category.
2. WHEN a Transaction is added or deleted, THE App SHALL update the Chart within 1 second to reflect the current data.
3. WHEN no expense Transactions exist, THE App SHALL display the Chart area with its legend visible but with no data segments rendered, and SHALL display a placeholder message within the Chart area indicating there is no spending data to show.
4. THE Chart SHALL assign a distinct color to each Category such that no two Categories share the same color, and SHALL maintain those color assignments even when no expense data exists.
5. THE Chart SHALL include a legend that identifies each Category and its corresponding color, and SHALL display the legend even when no expense data exists.
6. WHEN a Category has a total expense amount of zero, THE App SHALL omit that Category's segment from the Chart but SHALL still display it in the legend.

---

### Requirement 6: Filter Transaction History

**User Story:** As a user, I want to filter my transaction history by category or type, so that I can focus on specific spending areas.

#### Acceptance Criteria

1. THE App SHALL provide a Filter control that defaults to "All" and allows the user to select a single option from: All, Income, Expense, Food, Transport, Entertainment, Health, Shopping, or Other.
2. WHEN the user selects a Filter option other than "All", THE App SHALL display only the Transactions that match the selected Filter in the Transaction_History; IF no Transactions match, THE App SHALL display the empty-state message.
3. WHEN the user selects the "All" Filter option, THE App SHALL display all Transactions in the Transaction_History.
4. WHEN a Filter is active and a new Transaction is added, THE App SHALL apply the active Filter to the updated Transaction_History, displaying the new Transaction only if it matches the active Filter criteria.
5. WHEN the App is loaded or reloaded, THE App SHALL reset the Filter to "All".

---

### Requirement 7: Persist Data Across Sessions

**User Story:** As a user, I want my transactions to be saved between visits, so that I don't lose my data when I close the browser.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL write the Transaction data to LocalStorage.
2. IF the LocalStorage write operation fails, THEN THE App SHALL keep the Transaction in memory for the current session without persisting it, and SHALL display an error message indicating the save failed.
3. WHEN the App is loaded, THE App SHALL read all Transactions from LocalStorage and render them in the Transaction_History (oldest to newest before reverse-chronological display) and Chart.
4. WHEN a Transaction is deleted, THE App SHALL remove the corresponding entry from LocalStorage.
5. WHEN a Transaction is edited, THE App SHALL update the corresponding entry in LocalStorage to reflect the new values.
6. IF LocalStorage is unavailable or returns a parse error on load, THEN THE App SHALL display a warning message indicating storage is unavailable and SHALL operate with an empty Transaction list for the current session.

---

### Requirement 8: Mobile-Friendly Layout

**User Story:** As a user, I want the app to work well on my phone, so that I can track expenses on the go.

#### Acceptance Criteria

1. THE App SHALL use a responsive layout that adapts to screen widths from 320px to 1440px without horizontal scrolling.
2. THE App SHALL render all interactive controls (buttons, inputs, selects) at a minimum touch target size of 44×44 CSS pixels.
3. THE App SHALL use a legible font size of at least 16px for body text, input fields, form labels, and navigation links to prevent automatic zoom on mobile browsers.
4. THE App SHALL load and be fully interactive — defined as all buttons, inputs, and navigation responding within 200ms — within 3 seconds on a network profile of 20 Mbps down, 10 Mbps up, and 20ms RTT, regardless of the current screen width.

---

### Requirement 9: Custom Categories

**User Story:** As a user, I want to create, edit, and delete my own spending categories, so that I can organize transactions in a way that reflects my personal finances.

#### Acceptance Criteria

1. THE App SHALL provide controls to add a new Custom_Category, edit an existing Custom_Category name, and delete a Custom_Category.
2. WHEN the user adds a Custom_Category, THE App SHALL validate that the name is non-empty, at most 50 characters, and unique (case-insensitive) across all built-in and custom categories; IF any validation rule is violated, THEN THE App SHALL display an inline error message and SHALL NOT save the Custom_Category.
3. WHEN a Custom_Category is successfully added or edited, THE App SHALL persist the updated category list to LocalStorage and update the category options in the Form, the Filter control, and the Chart legend within 500ms.
4. WHEN the user attempts to delete a Custom_Category that has one or more existing Transactions assigned to it, THE App SHALL display a warning message describing the impact and SHALL require explicit confirmation before proceeding with the deletion.
5. WHEN a Custom_Category is deleted and the deletion is confirmed, THE App SHALL remove the category from LocalStorage and from the Form, Filter control, and Chart legend within 500ms.
6. WHEN the App is loaded, THE App SHALL read the persisted custom category list from LocalStorage and merge it with the built-in categories to form the complete category list used throughout the App.
7. IF the LocalStorage write operation for the category list fails, THEN THE App SHALL display an inline error message indicating the save failed and SHALL retain the updated category list in memory for the current session.

---

### Requirement 10: Monthly Summary View

**User Story:** As a user, I want to see a summary of my income, expenses, and net balance grouped by calendar month, so that I can track my financial trends over time.

#### Acceptance Criteria

1. THE App SHALL provide a Monthly_Summary section that groups all Transactions by calendar month (YYYY-MM) and displays, for each month: total income, total expenses, and net balance, each formatted to 2 decimal places with a currency symbol.
2. THE App SHALL display Monthly_Summary rows in reverse-chronological order (most recent month first).
3. WHEN no Transactions exist for a given calendar month, THE App SHALL omit that month from the Monthly_Summary.
4. WHEN no Transactions exist at all, THE App SHALL display an empty-state message in the Monthly_Summary section indicating there is no data to show.
5. WHEN a Transaction is added or deleted, THE App SHALL update the Monthly_Summary within 1 second to reflect the current data.
6. THE App SHALL display the net balance for each month in red when it is negative and in the default text color when it is zero or positive.

---

### Requirement 11: Sort Transactions

**User Story:** As a user, I want to sort my transaction history by date, amount, or category, so that I can find and review transactions more easily.

#### Acceptance Criteria

1. THE App SHALL provide a Sort control implemented as a `<select>` element with the following options: "Date (Newest First)" (default), "Amount (Low to High)", "Amount (High to Low)", and "Category (A–Z)".
2. WHEN the user selects a Sort option, THE App SHALL re-render the Transaction_History applying the selected Sort on top of any active Filter within 500ms.
3. WHEN the App is loaded or reloaded, THE App SHALL reset the Sort control to "Date (Newest First)".
4. THE Sort SHALL NOT affect the Chart, which always displays data aggregated across all expense Transactions regardless of the active Sort.
5. WHEN both a Filter and a Sort are active, THE App SHALL first apply the Filter to the full transaction list and then apply the Sort to the filtered result before rendering the Transaction_History.

---

### Requirement 12: Spending Limit Alert

**User Story:** As a user, I want to set a monthly budget limit per category, so that I receive a visual alert when my spending in that category exceeds the limit.

#### Acceptance Criteria

1. THE App SHALL provide a UI control that allows the user to set a Budget_Limit for each Category; the Budget_Limit value SHALL be a positive number with at most 2 decimal places.
2. WHEN the user saves a Budget_Limit, THE App SHALL persist the limit to LocalStorage keyed by category name and SHALL apply the limit check immediately within 500ms.
3. WHEN the total expense amount for a Category in the current calendar month meets or exceeds its Budget_Limit, THE App SHALL highlight that Category's total in the Transaction_History and/or Chart legend in red.
4. WHEN the total expense amount for a Category in the current calendar month is below its Budget_Limit, THE App SHALL display that Category's total without the alert highlight.
5. WHEN no Budget_Limit is set for a Category, THE App SHALL display that Category's total without any highlight.
6. WHEN the user sets a Budget_Limit to an empty value or zero, THE App SHALL remove the Budget_Limit for that Category from LocalStorage and clear any active alert highlight for that Category within 500ms.
7. IF the LocalStorage write operation for a Budget_Limit fails, THEN THE App SHALL display an inline error message indicating the save failed and SHALL retain the Budget_Limit in memory for the current session.
8. WHEN the App is loaded, THE App SHALL read all persisted Budget_Limits from LocalStorage and apply the alert logic to the current month's expense totals before first render.

---

### Requirement 13: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light color themes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control (button or checkbox) that switches the App between a dark Theme and a light Theme.
2. WHEN the user activates the toggle, THE App SHALL apply the selected Theme to the entire UI within 200ms and persist the preference to LocalStorage under a dedicated key (e.g., `expense_visualizer_theme`).
3. WHEN the App is loaded, THE App SHALL read the persisted Theme preference from LocalStorage and apply it before the first render to prevent a flash of the incorrect Theme.
4. IF no Theme preference is stored in LocalStorage, THEN THE App SHALL apply the Theme that matches the user's system preference as reported by the `prefers-color-scheme` media query.
5. THE toggle control SHALL be keyboard operable (focusable and activatable via the Enter or Space key) and SHALL have a visible text label or `aria-label` that describes its current state (e.g., "Switch to dark mode" or "Switch to light mode").
6. WHEN the Theme changes, THE App SHALL update all UI elements — including the balance panel, transaction list, form, chart area, and filter/sort controls — to use the colors defined for the selected Theme.
