/* ============================================================
   app.js - Expense and Budget Visualizer
   Single-file entry point. Logical module sections:
     1. Constants and Data Models
     2. Storage Module
     3. Transactions Module
     4. Categories Module
     5. Summary and Limits Module
     6. Theme Module
     7. UI Helpers (formatting)
     8. UI Rendering - Balance Panel
     9. UI Rendering - Transaction List
    10. UI Rendering - Pie Chart
    11. UI Rendering - Monthly Summary
    12. UI Rendering - Budget Limits
    13. UI Rendering - Category Manager
    14. Main - Bootstrap and Event Wiring
   ============================================================ */

/* ============================================================
   SECTION 1: Constants and Data Models
   ============================================================ */

const BUILT_IN_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Other'];

const CATEGORY_COLORS = {
  Food:          '#FF6384',
  Transport:     '#36A2EB',
  Entertainment: '#FFCE56',
  Health:        '#4BC0C0',
  Shopping:      '#9966FF',
  Other:         '#FF9F40'
};

const EXTENDED_PALETTE = [
  '#C9CBCF', '#7BC8A4', '#E8A838', '#5B8DB8',
  '#D4526E', '#8D5B4C', '#5E4FA2', '#66C2A5'
];

const LS_KEYS = {
  transactions: 'expense_visualizer_transactions',
  categories:   'expense_visualizer_categories',
  limits:       'expense_visualizer_limits',
  theme:        'expense_visualizer_theme'
};

/**
 * @typedef {Object} Transaction
 * @property {string}            id
 * @property {string}            description
 * @property {number}            amount
 * @property {string}            category
 * @property {'income'|'expense'} type
 * @property {string}            date
 * @property {number}            createdAt
 */

/**
 * @typedef {Object} AppState
 * @property {Transaction[]}         transactions
 * @property {string}                activeFilter
 * @property {string}                activeSort
 * @property {string[]}              categories
 * @property {Record<string,number>} limits
 * @property {'light'|'dark'}        theme
 * @property {boolean}               storageError
 */

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getCategories(state) {
  return [...BUILT_IN_CATEGORIES, ...(state.categories || [])];
}

function getCategoryColor(categoryName, state) {
  if (CATEGORY_COLORS[categoryName]) return CATEGORY_COLORS[categoryName];
  const custom = state ? (state.categories || []) : [];
  const idx = custom.indexOf(categoryName);
  return idx >= 0 ? EXTENDED_PALETTE[idx % EXTENDED_PALETTE.length] : '#C9CBCF';
}

/* ============================================================
   SECTION 2: Storage Module
   ============================================================ */

function loadTransactions() {
  try {
    const raw = localStorage.getItem(LS_KEYS.transactions);
    if (raw === null) {
      return { transactions: [], storageError: false };
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { transactions: [], storageError: true };
    }
    return { transactions: parsed, storageError: false };
  } catch (e) {
    return { transactions: [], storageError: true };
  }
}

function saveTransactions(transactions) {
  try {
    localStorage.setItem(LS_KEYS.transactions, JSON.stringify(transactions));
    return { success: true };
  } catch (e) {
    return { success: false, error: e && e.message ? e.message : String(e) };
  }
}

/* ============================================================
   SECTION 3: Transactions Module
   ============================================================ */

function computeSummary(transactions) {
  var totalIncome = 0;
  var totalExpenses = 0;
  for (var i = 0; i < transactions.length; i++) {
    var tx = transactions[i];
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else if (tx.type === 'expense') {
      totalExpenses += tx.amount;
    }
  }
  var balance = totalIncome - totalExpenses;
  return {
    balance:       Math.round(balance       * 100) / 100,
    totalIncome:   Math.round(totalIncome   * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100
  };
}

function computeCategoryTotals(transactions, state) {
  var categories = state ? getCategories(state) : BUILT_IN_CATEGORIES.slice();
  var totals = {};
  for (var i = 0; i < categories.length; i++) {
    totals[categories[i]] = 0;
  }
  for (var j = 0; j < transactions.length; j++) {
    var tx = transactions[j];
    if (tx.type === 'expense') {
      if (Object.prototype.hasOwnProperty.call(totals, tx.category)) {
        totals[tx.category] += tx.amount;
      } else {
        totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
      }
    }
  }
  var keys = Object.keys(totals);
  for (var k = 0; k < keys.length; k++) {
    totals[keys[k]] = Math.round(totals[keys[k]] * 100) / 100;
  }
  return totals;
}

function addTransaction(state, formData) {
  var newTransaction = {
    id:          generateId(),
    description: formData.description,
    amount:      parseFloat(formData.amount),
    category:    formData.category,
    type:        formData.type,
    date:        formData.date,
    createdAt:   Date.now()
  };
  var updatedTransactions = [newTransaction].concat(state.transactions);
  var saveResult = saveTransactions(updatedTransactions);
  return Object.assign({}, state, {
    transactions:  updatedTransactions,
    lastSaveError: !saveResult.success
  });
}

function deleteTransaction(state, id) {
  var updatedTransactions = state.transactions.filter(function (tx) {
    return tx.id !== id;
  });
  var saveResult = saveTransactions(updatedTransactions);
  return Object.assign({}, state, {
    transactions:  updatedTransactions,
    lastSaveError: !saveResult.success
  });
}

function applyFilter(transactions, filter) {
  if (!filter || filter === 'All') {
    return transactions;
  }
  if (filter === 'income' || filter === 'expense') {
    return transactions.filter(function (tx) { return tx.type === filter; });
  }
  var filterLower = filter.toLowerCase();
  if (filterLower === 'income' || filterLower === 'expense') {
    return transactions.filter(function (tx) { return tx.type === filterLower; });
  }
  return transactions.filter(function (tx) { return tx.category === filter; });
}

function validateTransactionForm(raw) {
  var errors = {};

  // Description: required, max 200 chars
  var desc = (raw.description || '').trim();
  if (desc.length === 0) {
    errors.description = 'Description is required.';
  } else if (desc.length > 200) {
    errors.description = 'Description must be 200 characters or fewer.';
  }

  // Amount: required, integer, min Rp 1
  var amountStr = (raw.amount || '').toString().trim();
  if (amountStr === '') {
    errors.amount = 'Jumlah wajib diisi.';
  } else {
    var amountNum = parseFloat(amountStr);
    if (isNaN(amountNum) || amountNum < 1 || amountNum > 999999999999) {
      errors.amount = 'Jumlah harus antara Rp 1 dan Rp 999.999.999.999.';
    }
  }

  // Category: required
  if (!raw.category || raw.category.trim() === '') {
    errors.category = 'Please select a category.';
  }

  // Type: must be income or expense
  if (raw.type !== 'income' && raw.type !== 'expense') {
    errors.type = 'Please select a valid type.';
  }

  // Date: required, valid date format
  if (!raw.date || raw.date.trim() === '') {
    errors.date = 'Date is required.';
  } else if (isNaN(Date.parse(raw.date))) {
    errors.date = 'Please enter a valid date.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

/* ============================================================
   SECTION 4: Categories Module
   ============================================================ */

function loadCategories() {
  try {
    const raw = localStorage.getItem(LS_KEYS.categories);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveCategories(categories) {
  try {
    localStorage.setItem(LS_KEYS.categories, JSON.stringify(categories));
    return { success: true };
  } catch (e) {
    return { success: false, error: e && e.message ? e.message : String(e) };
  }
}

function validateCategoryName(name, existingCategories) {
  var trimmed = (name || '').trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Category name cannot be empty.' };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: 'Category name must be 50 characters or fewer.' };
  }
  var allCategories = existingCategories || [];
  var duplicate = allCategories.some(function (c) {
    return c.toLowerCase() === trimmed.toLowerCase();
  });
  if (duplicate) {
    return { valid: false, error: 'That category already exists.' };
  }
  return { valid: true };
}

function addCategory(state, name) {
  var allExisting = getCategories(state);
  var validation = validateCategoryName(name, allExisting);
  if (!validation.valid) {
    return Object.assign({}, state, { lastCategoryError: validation.error });
  }
  var trimmed = name.trim();
  var updatedCategories = (state.categories || []).concat([trimmed]);
  saveCategories(updatedCategories);
  return Object.assign({}, state, {
    categories: updatedCategories,
    lastCategoryError: null
  });
}

function editCategory(state, oldName, newName) {
  var trimmedNew = (newName || '').trim();
  var allExisting = getCategories(state).filter(function (c) { return c !== oldName; });
  var validation = validateCategoryName(trimmedNew, allExisting);
  if (!validation.valid) {
    return Object.assign({}, state, { lastCategoryError: validation.error });
  }
  var updatedCategories = (state.categories || []).map(function (c) {
    return c === oldName ? trimmedNew : c;
  });
  // Update transactions that used the old category name
  var updatedTransactions = state.transactions.map(function (tx) {
    return tx.category === oldName ? Object.assign({}, tx, { category: trimmedNew }) : tx;
  });
  saveCategories(updatedCategories);
  saveTransactions(updatedTransactions);
  return Object.assign({}, state, {
    categories:   updatedCategories,
    transactions: updatedTransactions,
    lastCategoryError: null
  });
}

function deleteCategory(state, name) {
  var updatedCategories = (state.categories || []).filter(function (c) { return c !== name; });
  // Reassign transactions in deleted category to "Other"
  var updatedTransactions = state.transactions.map(function (tx) {
    return tx.category === name ? Object.assign({}, tx, { category: 'Other' }) : tx;
  });
  saveCategories(updatedCategories);
  saveTransactions(updatedTransactions);
  return Object.assign({}, state, {
    categories:   updatedCategories,
    transactions: updatedTransactions
  });
}

/* ============================================================
   SECTION 5: Summary and Limits Module
   ============================================================ */

function computeMonthlySummary(transactions) {
  var monthMap = {};
  for (var i = 0; i < transactions.length; i++) {
    var tx = transactions[i];
    if (!tx.date) continue;
    var parts = tx.date.split('-');
    var key = parts[0] + '-' + parts[1]; // "YYYY-MM"
    if (!monthMap[key]) {
      monthMap[key] = { income: 0, expenses: 0 };
    }
    if (tx.type === 'income') {
      monthMap[key].income += tx.amount;
    } else if (tx.type === 'expense') {
      monthMap[key].expenses += tx.amount;
    }
  }
  var keys = Object.keys(monthMap).sort().reverse(); // newest first
  return keys.map(function (key) {
    var income   = Math.round(monthMap[key].income   * 100) / 100;
    var expenses = Math.round(monthMap[key].expenses * 100) / 100;
    var balance  = Math.round((income - expenses)    * 100) / 100;
    return { month: key, income: income, expenses: expenses, balance: balance };
  });
}

function loadLimits() {
  try {
    const raw = localStorage.getItem(LS_KEYS.limits);
    if (raw === null) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch (e) {
    return {};
  }
}

function saveLimits(limits) {
  try {
    localStorage.setItem(LS_KEYS.limits, JSON.stringify(limits));
    return { success: true };
  } catch (e) {
    return { success: false, error: e && e.message ? e.message : String(e) };
  }
}

function computeLimitAlerts(transactions, limits) {
  // Only consider current month's expenses
  var now = new Date();
  var currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  var totals = {};
  for (var i = 0; i < transactions.length; i++) {
    var tx = transactions[i];
    if (tx.type !== 'expense') continue;
    if (!tx.date) continue;
    var parts = tx.date.split('-');
    var txMonth = parts[0] + '-' + parts[1];
    if (txMonth !== currentMonth) continue;
    totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
  }
  var alerts = {};
  var categories = Object.keys(limits);
  for (var j = 0; j < categories.length; j++) {
    var cat = categories[j];
    var limit = limits[cat];
    if (!limit || limit <= 0) continue;
    var spent = totals[cat] || 0;
    alerts[cat] = {
      spent:     Math.round(spent  * 100) / 100,
      limit:     Math.round(limit  * 100) / 100,
      exceeded:  spent > limit
    };
  }
  return alerts;
}

function applySort(transactions, sortKey) {
  var arr = transactions.slice(); // avoid mutating original
  switch (sortKey) {
    case 'amount-asc':
      return arr.sort(function (a, b) { return a.amount - b.amount; });
    case 'amount-desc':
      return arr.sort(function (a, b) { return b.amount - a.amount; });
    case 'category-asc':
      return arr.sort(function (a, b) {
        return a.category.localeCompare(b.category);
      });
    case 'date-desc':
    default:
      return arr.sort(function (a, b) {
        // Primary: date descending, secondary: createdAt descending
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }
}

/* ============================================================
   SECTION 6: Theme Module
   ============================================================ */

function loadTheme() {
  try {
    var stored = localStorage.getItem(LS_KEYS.theme);
    if (stored === 'dark' || stored === 'light') return stored;
    return null;
  } catch (e) {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(LS_KEYS.theme, theme);
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

/* ============================================================
   SECTION 7: UI Helpers (Formatting)
   ============================================================ */

function formatAmount(value) {
  // Format as Indonesian Rupiah, no decimals (Rp 1.500.000)
  var num = Math.round(Number(value));
  return 'Rp\u00a0' + num.toLocaleString('id-ID');
}

function formatDate(isoString) {
  if (!isoString) return '';
  var parts = isoString.split('-');
  if (parts.length !== 3) return isoString;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

function formatMonthLabel(yearMonth) {
  // "2025-04" -> "April 2025"
  var parts = yearMonth.split('-');
  if (parts.length !== 2) return yearMonth;
  var date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

/* ============================================================
   SECTION 8: UI Rendering - Balance Panel
   ============================================================ */

function renderBalancePanel(balance, totalIncome, totalExpenses) {
  const balanceEl = document.getElementById('balance-amount');
  const incomeEl  = document.getElementById('income-amount');
  const expenseEl = document.getElementById('expenses-amount');
  if (balanceEl) {
    balanceEl.textContent = formatAmount(balance);
    balanceEl.classList.toggle('balance-panel__value--negative', balance < 0);
  }
  if (incomeEl)  incomeEl.textContent  = formatAmount(totalIncome);
  if (expenseEl) expenseEl.textContent = formatAmount(totalExpenses);
}

/* ============================================================
   SECTION 9: UI Rendering - Transaction List
   ============================================================ */

function renderTransactionList(transactions) {
  const list     = document.getElementById('transaction-list');
  const emptyMsg = document.getElementById('empty-state');
  if (!list) return;
  list.innerHTML = '';
  if (transactions.length === 0) {
    if (emptyMsg) emptyMsg.classList.remove('hidden');
    return;
  }
  if (emptyMsg) emptyMsg.classList.add('hidden');

  transactions.forEach(function (tx) {
    var li = document.createElement('li');
    li.className = 'transaction-item';
    li.setAttribute('data-id', tx.id);

    var isIncome = tx.type === 'income';
    var amountClass = isIncome ? 'transaction-item__amount--income' : 'transaction-item__amount--expense';
    var amountPrefix = isIncome ? '+' : '-';

    li.innerHTML =
      '<div class="transaction-item__main">' +
        '<div class="transaction-item__info">' +
          '<span class="transaction-item__desc">' + escapeHtml(tx.description) + '</span>' +
          '<span class="transaction-item__meta">' +
            '<span class="transaction-item__category">' + escapeHtml(tx.category) + '</span>' +
            '<span class="transaction-item__date">' + formatDate(tx.date) + '</span>' +
          '</span>' +
        '</div>' +
        '<div class="transaction-item__right">' +
          '<span class="transaction-item__amount ' + amountClass + '">' +
            amountPrefix + formatAmount(tx.amount) +
          '</span>' +
          '<button class="btn btn--danger btn--sm transaction-item__delete" ' +
            'data-id="' + tx.id + '" ' +
            'aria-label="Delete transaction: ' + escapeHtml(tx.description) + '">' +
            '✕' +
          '</button>' +
        '</div>' +
      '</div>';

    list.appendChild(li);
  });

  // Wire delete buttons
  list.querySelectorAll('.transaction-item__delete').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-id');
      var tx = appState.transactions.find(function (t) { return t.id === id; });
      if (!tx) return;
      openConfirmDialog(
        'Delete this transaction?',
        '"' + tx.description + '" — ' + formatAmount(tx.amount),
        function () {
          appState = deleteTransaction(appState, id);
          fullRender();
        }
      );
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================================================
   SECTION 10: UI Rendering - Pie Chart
   ============================================================ */

// Track chart instance to allow re-draw
var _chartInstance = null;

function renderPieChart(ctx, categoryTotals) {
  if (!ctx) return;

  const placeholder = document.getElementById('chart-placeholder');
  const legendEl    = document.getElementById('chart-legend');

  // Filter to categories with spending > 0
  const entries = Object.entries(categoryTotals).filter(function (e) { return e[1] > 0; });

  if (entries.length === 0) {
    if (placeholder) placeholder.classList.remove('hidden');
    ctx.canvas.classList.add('hidden');
    if (legendEl) legendEl.innerHTML = '';
    return;
  }

  if (placeholder) placeholder.classList.add('hidden');
  ctx.canvas.classList.remove('hidden');

  const labels = entries.map(function (e) { return e[0]; });
  const values = entries.map(function (e) { return e[1]; });
  const colors = labels.map(function (cat) { return getCategoryColor(cat, appState); });

  const total = values.reduce(function (sum, v) { return sum + v; }, 0);

  // Draw pie manually on canvas
  const canvas = ctx.canvas;
  const size   = Math.min(canvas.width, canvas.height);
  const cx     = canvas.width  / 2;
  const cy     = canvas.height / 2;
  const radius = (size / 2) * 0.85;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  var startAngle = -Math.PI / 2;
  for (var i = 0; i < values.length; i++) {
    var sliceAngle = (values[i] / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim() || '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    startAngle += sliceAngle;
  }

  // Render legend
  if (legendEl) {
    legendEl.innerHTML = '';
    for (var j = 0; j < labels.length; j++) {
      var li = document.createElement('li');
      li.className = 'chart-legend__item';
      var pct = total > 0 ? ((values[j] / total) * 100).toFixed(1) : '0.0';
      li.innerHTML =
        '<span class="chart-legend__color" style="background:' + colors[j] + '"></span>' +
        '<span class="chart-legend__label">' + escapeHtml(labels[j]) + '</span>' +
        '<span class="chart-legend__value">' + formatAmount(values[j]) + ' (' + pct + '%)</span>';
      legendEl.appendChild(li);
    }
  }
}

function initChart(state) {
  const canvas = document.getElementById('spending-chart');
  const unavailableMsg = document.getElementById('chart-unavailable');
  if (!canvas || !canvas.getContext) {
    if (canvas) canvas.classList.add('hidden');
    if (unavailableMsg) unavailableMsg.classList.remove('hidden');
    return null;
  }
  return canvas.getContext('2d');
}

/* ============================================================
   SECTION 11: UI Rendering - Monthly Summary
   ============================================================ */

function renderMonthlySummary(transactions) {
  const container = document.getElementById('monthly-summary');
  const emptyMsg  = document.getElementById('summary-empty-state');
  if (!container) return;
  container.innerHTML = '';

  var rows = computeMonthlySummary(transactions);

  if (rows.length === 0) {
    if (emptyMsg) emptyMsg.classList.remove('hidden');
    return;
  }
  if (emptyMsg) emptyMsg.classList.add('hidden');

  rows.forEach(function (row) {
    var div = document.createElement('div');
    div.className = 'summary-row';

    var balanceClass = row.balance < 0 ? 'summary-row__figure-value--negative' : 'summary-row__figure-value--income';

    div.innerHTML =
      '<span class="summary-row__month">' + escapeHtml(formatMonthLabel(row.month)) + '</span>' +
      '<div class="summary-row__figures">' +
        '<div class="summary-row__figure">' +
          '<span class="summary-row__figure-label">Income</span>' +
          '<span class="summary-row__figure-value summary-row__figure-value--income">' + formatAmount(row.income) + '</span>' +
        '</div>' +
        '<div class="summary-row__figure">' +
          '<span class="summary-row__figure-label">Expenses</span>' +
          '<span class="summary-row__figure-value summary-row__figure-value--expense">' + formatAmount(row.expenses) + '</span>' +
        '</div>' +
        '<div class="summary-row__figure">' +
          '<span class="summary-row__figure-label">Balance</span>' +
          '<span class="summary-row__figure-value ' + balanceClass + '">' + formatAmount(row.balance) + '</span>' +
        '</div>' +
      '</div>';

    container.appendChild(div);
  });
}

/* ============================================================
   SECTION 12: UI Rendering - Budget Limits
   ============================================================ */

function renderBudgetLimits(state) {
  const container = document.getElementById('budget-limits');
  if (!container) return;
  container.innerHTML = '';

  var alerts     = computeLimitAlerts(state.transactions, state.limits);
  var categories = getCategories(state);

  categories.forEach(function (cat) {
    var row = document.createElement('div');
    row.className = 'limit-row';

    var currentLimit  = state.limits[cat] || '';
    var alertData     = alerts[cat];
    var isExceeded    = alertData && alertData.exceeded;
    var labelClass    = 'limit-row__label' + (isExceeded ? ' limit-row__label--alert' : '');
    var alertBadge    = isExceeded
      ? ' <span class="limit-row__exceeded-badge" aria-label="Over budget">⚠️ Over!</span>'
      : '';
    var spentText     = alertData
      ? ' <span class="limit-row__spent">Spent: ' + formatAmount(alertData.spent) + '</span>'
      : '';

    row.innerHTML =
      '<label class="' + labelClass + '" for="limit-' + escapeHtml(cat) + '">' +
        escapeHtml(cat) + alertBadge +
      '</label>' +
      spentText +
      '<input ' +
        'id="limit-' + escapeHtml(cat) + '" ' +
        'type="number" ' +
        'class="form-input limit-row__input" ' +
        'min="0" step="1" ' +
        'placeholder="No limit" ' +
        'value="' + (currentLimit !== '' ? currentLimit : '') + '" ' +
        'data-category="' + escapeHtml(cat) + '" ' +
        'aria-label="Budget limit for ' + escapeHtml(cat) + '" ' +
      '/>';

    container.appendChild(row);
  });

  // Wire limit inputs — save on change
  container.querySelectorAll('input[data-category]').forEach(function (input) {
    input.addEventListener('change', function () {
      var cat = input.getAttribute('data-category');
      var val = parseFloat(input.value);
      var updatedLimits = Object.assign({}, appState.limits);
      if (input.value === '' || isNaN(val) || val <= 0) {
        delete updatedLimits[cat];
      } else {
        updatedLimits[cat] = Math.round(val * 100) / 100;
      }
      appState = Object.assign({}, appState, { limits: updatedLimits });
      saveLimits(updatedLimits);
      // Re-render only limits section to reflect alerts
      renderBudgetLimits(appState);
    });
  });
}

/* ============================================================
   SECTION 13: UI Rendering - Category Manager
   ============================================================ */

function renderCategoryManager(state) {
  const listEl   = document.getElementById('custom-category-list');
  const errorEl  = document.getElementById('categories-error');
  if (!listEl) return;
  listEl.innerHTML = '';

  var customs = state.categories || [];

  if (customs.length === 0) {
    listEl.innerHTML = '<li class="empty-state" style="padding: 12px 0;">No custom categories yet.</li>';
    return;
  }

  customs.forEach(function (cat) {
    var li = document.createElement('li');
    li.className = 'custom-category-item';
    li.setAttribute('data-category', cat);

    li.innerHTML =
      '<span class="custom-category-item__name">' + escapeHtml(cat) + '</span>' +
      '<button class="btn btn--secondary btn--sm cat-edit-btn" data-cat="' + escapeHtml(cat) + '" aria-label="Edit ' + escapeHtml(cat) + '">✏️ Edit</button>' +
      '<button class="btn btn--danger btn--sm cat-delete-btn" data-cat="' + escapeHtml(cat) + '" aria-label="Delete ' + escapeHtml(cat) + '">✕</button>';

    listEl.appendChild(li);
  });

  // Wire edit buttons
  listEl.querySelectorAll('.cat-edit-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = btn.getAttribute('data-cat');
      var li  = listEl.querySelector('[data-category="' + CSS.escape(cat) + '"]');
      if (!li) return;

      // Replace with inline edit form
      li.innerHTML =
        '<input class="form-input custom-category-item__edit-input" type="text" value="' + escapeHtml(cat) + '" maxlength="50" aria-label="Edit category name" />' +
        '<button class="btn btn--primary btn--sm cat-save-btn">Save</button>' +
        '<button class="btn btn--secondary btn--sm cat-cancel-btn">Cancel</button>' +
        '<span class="custom-category-item__error form-error"></span>';

      var input     = li.querySelector('input');
      var saveBtn   = li.querySelector('.cat-save-btn');
      var cancelBtn = li.querySelector('.cat-cancel-btn');
      var errSpan   = li.querySelector('.custom-category-item__error');
      input.focus();
      input.select();

      saveBtn.addEventListener('click', function () {
        var newName = input.value;
        var newState = editCategory(appState, cat, newName);
        if (newState.lastCategoryError) {
          errSpan.textContent = newState.lastCategoryError;
          return;
        }
        appState = newState;
        updateCategoryOptions(appState);
        renderCategoryManager(appState);
        fullRender();
      });

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') saveBtn.click();
        if (e.key === 'Escape') cancelBtn.click();
      });

      cancelBtn.addEventListener('click', function () {
        renderCategoryManager(appState);
      });
    });
  });

  // Wire delete buttons
  listEl.querySelectorAll('.cat-delete-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = btn.getAttribute('data-cat');
      openConfirmDialog(
        'Delete category "' + cat + '"?',
        'All transactions in this category will be moved to "Other".',
        function () {
          appState = deleteCategory(appState, cat);
          updateCategoryOptions(appState);
          renderCategoryManager(appState);
          fullRender();
        }
      );
    });
  });
}

function updateCategoryOptions(state) {
  var all = getCategories(state);

  // Update form category select
  var formSelect = document.getElementById('input-category');
  if (formSelect) {
    var currentVal = formSelect.value;
    formSelect.innerHTML = '';
    all.forEach(function (cat) {
      var opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      formSelect.appendChild(opt);
    });
    // Restore selected value if still valid
    if (all.includes(currentVal)) {
      formSelect.value = currentVal;
    } else {
      formSelect.value = all[0] || '';
    }
  }

  // Update filter select — preserve type options, rebuild category options
  var filterSelect = document.getElementById('filter-select');
  if (filterSelect) {
    var currentFilter = filterSelect.value;
    filterSelect.innerHTML = '';

    var staticOpts = [
      { value: 'All',     text: 'All' },
      { value: 'income',  text: 'Income' },
      { value: 'expense', text: 'Expense' }
    ];
    staticOpts.forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.text;
      filterSelect.appendChild(opt);
    });
    all.forEach(function (cat) {
      var opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      filterSelect.appendChild(opt);
    });

    // Restore selection
    var validValues = ['All', 'income', 'expense'].concat(all);
    filterSelect.value = validValues.includes(currentFilter) ? currentFilter : 'All';
  }
}

/* ============================================================
   SECTION 14: Main - Bootstrap and Event Wiring
   ============================================================ */

/** In-memory application state */
let appState = {
  transactions:  [],
  activeFilter:  'All',
  activeSort:    'date-desc',
  categories:    [],
  limits:        {},
  theme:         'light',
  storageError:  false
};

/** Perform a full re-render of all UI sections */
function fullRender() {
  const { balance, totalIncome, totalExpenses } = computeSummary(appState.transactions);
  renderBalancePanel(balance, totalIncome, totalExpenses);

  const filtered = applyFilter(appState.transactions, appState.activeFilter);
  const sorted   = applySort(filtered, appState.activeSort);
  renderTransactionList(sorted);

  const ctx = initChart(appState);
  if (ctx) {
    const totals = computeCategoryTotals(appState.transactions, appState);
    renderPieChart(ctx, totals);
  }

  renderMonthlySummary(appState.transactions);
  renderBudgetLimits(appState);
  renderCategoryManager(appState);
}

/** Show or hide the storage error banner */
function setStorageBanner(visible) {
  const banner = document.getElementById('storage-error-banner');
  if (banner) banner.classList.toggle('hidden', !visible);
}

/** Reset the transaction form to its default state */
function resetTransactionForm() {
  const form = document.getElementById('transaction-form');
  if (!form) return;
  form.querySelector('#input-description').value = '';
  form.querySelector('#input-amount').value      = '';
  form.querySelector('#input-category').value    = getCategories(appState)[0] || 'Food';
  form.querySelector('#input-type').value        = 'expense';
  form.querySelector('#input-date').value        = getTodayISO();
  form.querySelectorAll('.form-error').forEach(function (el) { el.textContent = ''; });
  form.querySelectorAll('.form-input, .form-select').forEach(function (el) {
    el.classList.remove('form-input--error', 'form-select--error');
  });
}

/** Confirmation dialog */
var _dialogCallback = null;

function openConfirmDialog(title, message, onConfirm) {
  const dialog  = document.getElementById('confirm-dialog');
  const titleEl = document.getElementById('dialog-title');
  const msgEl   = document.getElementById('dialog-message');
  if (!dialog) {
    if (window.confirm(title + '\n' + message)) onConfirm();
    return;
  }
  if (titleEl) titleEl.textContent = title;
  if (msgEl)   msgEl.textContent   = message;
  _dialogCallback = onConfirm;
  dialog.showModal();
}

function wireConfirmDialog() {
  const dialog    = document.getElementById('confirm-dialog');
  const cancelBtn = document.getElementById('dialog-cancel');
  const confirmBtn= document.getElementById('dialog-confirm');
  if (!dialog) return;

  cancelBtn && cancelBtn.addEventListener('click', function () {
    dialog.close();
    _dialogCallback = null;
  });

  confirmBtn && confirmBtn.addEventListener('click', function () {
    dialog.close();
    if (typeof _dialogCallback === 'function') {
      _dialogCallback();
    }
    _dialogCallback = null;
  });

  dialog.addEventListener('cancel', function () {
    _dialogCallback = null;
  });
}

/** Wire the theme toggle button */
function wireThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', function () {
    const next = appState.theme === 'dark' ? 'light' : 'dark';
    appState.theme = next;
    applyTheme(next);
    saveTheme(next);
    const label = btn.querySelector('.theme-toggle__label');
    const icon  = btn.querySelector('.theme-toggle__icon');
    if (next === 'dark') {
      btn.setAttribute('aria-label', 'Switch to light mode');
      if (label) label.textContent = 'Light Mode';
      if (icon)  icon.textContent  = '☀️';
    } else {
      btn.setAttribute('aria-label', 'Switch to dark mode');
      if (label) label.textContent = 'Dark Mode';
      if (icon)  icon.textContent  = '🌙';
    }
    // Re-render chart so pie stroke color updates with theme
    const ctx = initChart(appState);
    if (ctx) {
      const totals = computeCategoryTotals(appState.transactions, appState);
      renderPieChart(ctx, totals);
    }
  });
}

/** Wire the filter select */
function wireFilter() {
  const select = document.getElementById('filter-select');
  if (!select) return;
  select.addEventListener('change', function () {
    appState.activeFilter = select.value;
    const filtered = applyFilter(appState.transactions, appState.activeFilter);
    const sorted   = applySort(filtered, appState.activeSort);
    renderTransactionList(sorted);
  });
}

/** Wire the sort select */
function wireSort() {
  const select = document.getElementById('sort-select');
  if (!select) return;
  select.addEventListener('change', function () {
    appState.activeSort = select.value;
    const filtered = applyFilter(appState.transactions, appState.activeFilter);
    const sorted   = applySort(filtered, appState.activeSort);
    renderTransactionList(sorted);
  });
}

/** Wire the transaction form submit */
function wireTransactionForm() {
  const form = document.getElementById('transaction-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Clear previous errors
    form.querySelectorAll('.form-error').forEach(function (el) { el.textContent = ''; });
    form.querySelectorAll('.form-input, .form-select').forEach(function (el) {
      el.classList.remove('form-input--error', 'form-select--error');
    });

    const raw = {
      description: form.querySelector('#input-description').value,
      amount:      form.querySelector('#input-amount').value,
      category:    form.querySelector('#input-category').value,
      type:        form.querySelector('#input-type').value,
      date:        form.querySelector('#input-date').value
    };
    const { valid, errors } = validateTransactionForm(raw);
    if (!valid) {
      Object.keys(errors).forEach(function (field) {
        const errEl   = document.getElementById('error-' + field);
        const inputEl = document.getElementById('input-' + field);
        if (errEl)   errEl.textContent = errors[field];
        if (inputEl) {
          inputEl.classList.add(
            inputEl.tagName === 'SELECT' ? 'form-select--error' : 'form-input--error'
          );
        }
      });
      return;
    }
    const result = addTransaction(appState, raw);
    appState = result;
    if (appState.lastSaveError) {
      const errBanner = document.getElementById('form-save-error');
      if (errBanner) {
        errBanner.textContent = 'Save failed — your transaction is available this session only.';
        errBanner.classList.remove('hidden');
      }
    } else {
      const errBanner = document.getElementById('form-save-error');
      if (errBanner) errBanner.classList.add('hidden');
    }
    resetTransactionForm();
    fullRender();
  });
}

/** Wire the "Add Category" button */
function wireAddCategory() {
  const btn     = document.getElementById('btn-add-category');
  const input   = document.getElementById('input-new-category');
  const errorEl = document.getElementById('error-new-category');
  if (!btn || !input) return;

  function doAdd() {
    if (errorEl) errorEl.textContent = '';
    var name     = input.value;
    var newState = addCategory(appState, name);
    if (newState.lastCategoryError) {
      if (errorEl) errorEl.textContent = newState.lastCategoryError;
      return;
    }
    appState = newState;
    input.value = '';
    updateCategoryOptions(appState);
    renderCategoryManager(appState);
  }

  btn.addEventListener('click', doAdd);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      doAdd();
    }
  });
}

/** Bootstrap the application */
function init() {
  // Load persisted theme
  const storedTheme = loadTheme();
  const systemDark  = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme       = storedTheme || (systemDark ? 'dark' : 'light');
  appState.theme    = theme;
  applyTheme(theme);

  // Update theme toggle label to match current theme
  const themeBtn   = document.getElementById('theme-toggle');
  const themeLabel = themeBtn && themeBtn.querySelector('.theme-toggle__label');
  const themeIcon  = themeBtn && themeBtn.querySelector('.theme-toggle__icon');
  if (theme === 'dark') {
    if (themeBtn)   themeBtn.setAttribute('aria-label', 'Switch to light mode');
    if (themeLabel) themeLabel.textContent = 'Light Mode';
    if (themeIcon)  themeIcon.textContent  = '☀️';
  }

  // Load persisted data
  const { transactions, storageError } = loadTransactions();
  appState.transactions = transactions;
  appState.storageError = storageError;
  appState.categories   = loadCategories();
  appState.limits       = loadLimits();

  // Show storage error banner if needed
  setStorageBanner(storageError);

  // Set default form date to today
  const dateInput = document.getElementById('input-date');
  if (dateInput) dateInput.value = getTodayISO();

  // Reset filter and sort to defaults
  const filterSelect = document.getElementById('filter-select');
  if (filterSelect) filterSelect.value = 'All';
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = 'date-desc';

  // Populate dynamic category options
  updateCategoryOptions(appState);

  // Wire events
  wireConfirmDialog();
  wireThemeToggle();
  wireFilter();
  wireSort();
  wireTransactionForm();
  wireAddCategory();

  // Initial render
  fullRender();
}

// Start the app when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
