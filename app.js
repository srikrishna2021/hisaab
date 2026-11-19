(() => {
  'use strict';

  const STORAGE_KEY = 'hisaab:v1';
  const SHOP_NAME = 'Hisaab';

  const WA_ICON = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3.2a8.7 8.7 0 0 0-7.4 13.3L3.3 21l4.6-1.2A8.7 8.7 0 1 0 12 3.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M9.3 8.2c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.6 1.3c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6.4.7 1.4 1.7 2.3 2.1.3.1.4.1.6-.1l.6-.7c.2-.2.4-.2.6-.1l1.3.7c.2.1.3.2.3.4 0 .4-.2 1.2-.7 1.6-.5.4-1.1.6-1.9.4-1.1-.2-2.2-.8-3.3-1.8-.9-.9-1.7-1.9-2-2.7-.3-.9 0-1.6.3-2Z" fill="currentColor"/>
  </svg>`;

  const TRASH_ICON = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 7h14M10 7V5h4v2m-1 3.5V17m-3-6.5V17M7.5 7l.8 12h7.4l.8-12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  const AVATARS = [
    ['#e7f4ec', '#14603a'],
    ['#fdeee7', '#9a3d12'],
    ['#e8eefb', '#274b9f'],
    ['#f4ecfb', '#6a34a8'],
    ['#fdf3d8', '#8a5a05'],
    ['#e6f4f6', '#0c6470']
  ];

  const els = {
    list: document.getElementById('customer-list'),
    total: document.getElementById('total-outstanding'),
    summaryChip: document.getElementById('summary-chip'),
    summaryFoot: document.getElementById('summary-foot'),
    listCount: document.getElementById('list-count'),
    empty: document.getElementById('empty-state'),
    emptyTitle: document.getElementById('empty-title'),
    emptyText: document.getElementById('empty-text'),
    emptyAction: document.getElementById('empty-action'),
    search: document.getElementById('search'),
    searchClear: document.getElementById('search-clear'),
    fab: document.getElementById('fab'),
    reset: document.getElementById('reset-btn'),
    header: document.getElementById('app-header'),
    toast: document.getElementById('toast'),

    customerSheet: document.getElementById('customer-sheet'),
    customerForm: document.getElementById('customer-form'),
    customerTitle: document.getElementById('customer-sheet-title'),
    customerName: document.getElementById('customer-name'),
    customerPhone: document.getElementById('customer-phone'),
    customerError: document.getElementById('customer-error'),
    customerSubmit: document.getElementById('customer-submit'),

    detailSheet: document.getElementById('detail-sheet'),
    detailAvatar: document.getElementById('detail-avatar'),
    detailName: document.getElementById('detail-name'),
    detailPhone: document.getElementById('detail-phone'),
    detailPanel: document.getElementById('detail-panel'),
    detailBalance: document.getElementById('detail-balance'),
    detailLabel: document.getElementById('detail-balance-label'),
    detailNote: document.getElementById('detail-balance-note'),
    detailRemind: document.getElementById('detail-remind'),
    entryTabs: Array.from(document.querySelectorAll('[data-entry-tab]')),
    creditForm: document.getElementById('credit-form'),
    creditAmount: document.getElementById('credit-amount'),
    creditDate: document.getElementById('credit-date'),
    creditNote: document.getElementById('credit-note'),
    paymentForm: document.getElementById('payment-form'),
    paymentAmount: document.getElementById('payment-amount'),
    paymentDate: document.getElementById('payment-date'),
    paymentNote: document.getElementById('payment-note'),
    shotInput: document.getElementById('shot-input'),
    shotPreview: document.getElementById('shot-preview'),
    shotPreviewWrap: document.getElementById('shot-preview-wrap'),
    shotRemove: document.getElementById('shot-remove'),
    entries: document.getElementById('detail-entries'),
    entriesCount: document.getElementById('detail-entries-count'),
    entriesEmpty: document.getElementById('entries-empty'),
    detailEdit: document.getElementById('detail-edit'),
    detailDelete: document.getElementById('detail-delete'),

    importBox: document.getElementById('import-box'),
    importGo: document.getElementById('import-go'),

    shotViewer: document.getElementById('shot-viewer'),
    shotViewerImg: document.getElementById('shot-viewer-img'),
    shotViewerClose: document.getElementById('shot-viewer-close')
  };

  let activeCustomerId = null;
  let editingId = null;
  let searchQuery = '';
  let activeEntryTab = 'credit';
  let pendingShot = '';
  let lastFocused = null;
  let toastTimer = 0;

  /* ---------- Helpers ---------- */

  const esc = (value) =>
    String(value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function plainAmount(n) {
    const value = round2(n) || 0;
    if (Object.is(value, -0)) return '0';
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  function groupedAmount(n) {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(round2(Math.abs(n)));
  }

  function parseAmount(raw) {
    const cleaned = String(raw).replace(/[^\d.]/g, '');
    const value = Number.parseFloat(cleaned);
    return Number.isFinite(value) ? round2(value) : 0;
  }

  function phoneDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function normalizePhone(value) {
    let digits = phoneDigits(value);
    if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length > 10) digits = digits.slice(-10);
    return digits;
  }

  function formatPhone(value) {
    const digits = phoneDigits(value);
    return digits.length === 10 ? digits.slice(0, 5) + ' ' + digits.slice(5) : digits;
  }

  const pad2 = (n) => String(n).padStart(2, '0');

  function isoOf(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  function todayISO() {
    return TODAY_OVERRIDE || isoOf(new Date());
  }

  function isoDaysAgo(days) {
    const date = TODAY_OVERRIDE ? parseISODate(TODAY_OVERRIDE) : new Date();
    date.setDate(date.getDate() - days);
    return isoOf(date);
  }

  function readTodayParam() {
    try {
      const value = new URLSearchParams(window.location.search).get('today');
      return isValidISODate(value) ? value : null;
    } catch (error) {
      return null;
    }
  }

  function parseISODate(value) {
    const parts = String(value).split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function isValidISODate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = parseISODate(value);
    return !Number.isNaN(date.getTime()) && isoOf(date) === value;
  }

  function formatDate(value) {
    if (!isValidISODate(value)) return '';
    return parseISODate(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function initialsOf(name) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function avatarColors(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    return AVATARS[hash % AVATARS.length];
  }

  function balanceOf(customer) {
    return round2(
      customer.entries.reduce(
        (sum, entry) => sum + (entry.type === 'payment' ? -entry.amount : entry.amount),
        0
      )
    );
  }

  function getCustomer(id) {
    return state.customers.find((customer) => customer.id === id) || null;
  }

  function statusOf(balance) {
    if (Math.abs(balance) < 0.005) return 'settled';
    return balance < 0 ? 'advance' : 'due';
  }

  /* ---------- Storage ---------- */

  const TODAY_OVERRIDE = readTodayParam();

  function normalizeState(input) {
    const customers = Array.isArray(input && input.customers) ? input.customers : [];
    return {
      customers: customers
        .filter((customer) => customer && typeof customer.name === 'string')
        .map((customer) => ({
          id: customer.id || uid(),
          name: String(customer.name).slice(0, 60),
          phone: normalizePhone(customer.phone),
          createdAt: customer.createdAt || new Date().toISOString(),
          entries: Array.isArray(customer.entries)
            ? customer.entries
                .filter((entry) => entry && Number.isFinite(Number(entry.amount)))
                .map((entry) => ({
                  id: entry.id || uid(),
                  type: entry.type === 'payment' ? 'payment' : 'credit',
                  amount: Math.max(0, round2(Number(entry.amount))),
                  note: typeof entry.note === 'string' ? entry.note.slice(0, 120) : '',
                  date: isValidISODate(entry.date) ? entry.date : todayISO(),
                  shot: isValidShot(entry.shot) ? entry.shot : '',
                  createdAt: entry.createdAt || new Date().toISOString()
                }))
            : []
        }))
    };
  }

  function createSeed() {
    return {
      customers: [
        {
          id: uid(),
          name: 'Anil Kumar',
          phone: '9876543210',
          createdAt: new Date(isoDaysAgo(34) + 'T09:15:00').toISOString(),
          entries: [
            { id: uid(), type: 'credit', amount: 4500, note: 'Monthly kirana', date: isoDaysAgo(20) },
            { id: uid(), type: 'payment', amount: 2000, note: 'UPI payment', date: isoDaysAgo(6) }
          ]
        },
        {
          id: uid(),
          name: 'Priya Sharma',
          phone: '9123456780',
          createdAt: new Date(isoDaysAgo(16) + 'T11:40:00').toISOString(),
          entries: [
            { id: uid(), type: 'credit', amount: 860, note: 'Milk, bread, eggs', date: isoDaysAgo(12) }
          ]
        },
        {
          id: uid(),
          name: 'Mohammed Irfan',
          phone: '9988776655',
          createdAt: new Date(isoDaysAgo(41) + 'T18:05:00').toISOString(),
          entries: [
            { id: uid(), type: 'credit', amount: 3200, note: 'Cement bags', date: isoDaysAgo(30) },
            { id: uid(), type: 'payment', amount: 3200, note: 'Full settlement', date: isoDaysAgo(4) }
          ]
        },
        {
          id: uid(),
          name: 'Sunita Devi',
          phone: '9090909090',
          createdAt: new Date(isoDaysAgo(8) + 'T15:20:00').toISOString(),
          entries: [
            { id: uid(), type: 'payment', amount: 500, note: 'Advance deposit', date: isoDaysAgo(2) }
          ]
        }
      ]
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.customers)) {
          return normalizeState(parsed);
        }
      }
    } catch (error) {
      console.warn('Hisaab: could not read saved data.', error);
    }
    const seeded = createSeed();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    } catch (error) {
      console.warn('Hisaab: could not save seed data.', error);
    }
    return seeded;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.warn('Hisaab: could not save data.', error);
      return false;
    }
  }

  function isValidShot(value) {
    return (
      typeof value === 'string' &&
      value.startsWith('data:image/') &&
      value.length > 32 &&
      value.length < 2500000
    );
  }

  function fileToShot(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type || '')) {
        reject(new Error('not-an-image'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read-failed'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('decode-failed'));
        image.onload = () => {
          try {
            const max = 1000;
            const scale = Math.min(1, max / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.72));
          } catch (error) {
            reject(error);
          }
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- Reminders ---------- */

  function reminderMessage(customer, balance) {
    const firstName = customer.name.split(/\s+/)[0] || customer.name;
    if (balance > 0.005) {
      return (
        'Namaste ' + firstName + ', aapka ' + SHOP_NAME + ' par ₹' + groupedAmount(balance) +
        ' baaki hai. Kripya payment kar dein. Dhanyavaad!'
      );
    }
    if (balance < -0.005) {
      return (
        'Namaste ' + firstName + ', aapne ' + SHOP_NAME + ' par ₹' +
        groupedAmount(balance) + ' advance jama kiya hai. Dhanyavaad!'
      );
    }
    return 'Namaste ' + firstName + ', aapka ' + SHOP_NAME + ' clear hai. Dhanyavaad!';
  }

  function reminderHref(customer, balance) {
    const message = reminderMessage(customer, balance);
    return 'https://wa.me/91' + phoneDigits(customer.phone) + '?text=' + encodeURIComponent(message);
  }

  /* ---------- Rendering ---------- */

  let state = loadState();

  function render() {
    renderSummary();
    renderList();
    if (activeCustomerId && els.detailSheet.classList.contains('open')) {
      renderDetail();
    }
  }

  function renderSummary() {
    const rows = state.customers.map((customer) => ({ customer, balance: balanceOf(customer) }));
    const payable = round2(rows.reduce((sum, row) => sum + Math.max(0, row.balance), 0));
    const advances = round2(rows.reduce((sum, row) => sum + Math.max(0, -row.balance), 0));
    const dueCount = rows.filter((row) => row.balance > 0.005).length;
    const total = rows.length;

    els.total.textContent = plainAmount(payable);
    els.summaryChip.textContent = total ? (dueCount ? dueCount + ' due' : 'All settled') : '0 due';

    if (!total) {
      els.summaryFoot.textContent = 'Add your first customer to begin';
    } else if (dueCount) {
      els.summaryFoot.textContent =
        'To collect from ' + dueCount + ' of ' + total + ' customer' + (total === 1 ? '' : 's') +
        (advances > 0 ? ' · ₹' + groupedAmount(advances) + ' advance held' : '');
    } else {
      els.summaryFoot.textContent =
        'Everyone is settled up' + (advances > 0 ? ' · ₹' + groupedAmount(advances) + ' advance held' : '');
    }
  }

  function renderList() {
    const rows = state.customers.map((customer) => ({ customer, balance: balanceOf(customer) }));
    rows.sort((a, b) => b.balance - a.balance || a.customer.name.localeCompare(b.customer.name));

    const query = searchQuery.trim().toLowerCase();
    const queryDigits = phoneDigits(query);
    const visible = query
      ? rows.filter(({ customer }) =>
          customer.name.toLowerCase().includes(query) ||
          (queryDigits.length > 0 && phoneDigits(customer.phone).includes(queryDigits))
        )
      : rows;

    els.listCount.textContent = query ? visible.length + ' of ' + rows.length : String(rows.length);

    if (!visible.length) {
      els.list.innerHTML = '';
      showEmpty(query ? 'search' : 'none');
      return;
    }

    hideEmpty();
    els.list.innerHTML = visible.map(({ customer, balance }) => rowTemplate(customer, balance)).join('');
  }

  function showEmpty(mode) {
    els.empty.hidden = false;
    if (mode === 'search') {
      els.emptyTitle.textContent = 'No matches';
      els.emptyText.textContent = 'Try a different name or mobile number.';
      els.emptyAction.hidden = true;
    } else {
      els.emptyTitle.textContent = 'No customers yet';
      els.emptyText.textContent = 'Add a customer to start tracking credit, payments and reminders.';
      els.emptyAction.hidden = false;
    }
  }

  function hideEmpty() {
    els.empty.hidden = true;
  }

  function rowTemplate(customer, balance) {
    const status = statusOf(balance);
    const colors = avatarColors(customer.name);
    const count = customer.entries.length;
    const digits = phoneDigits(customer.phone);

    return (
      '<li class="customer-row" data-customer="' + esc(digits) + '">' +
        '<button class="row-main" type="button" data-open="' + esc(customer.id) + '" ' +
          'aria-label="Open ledger for ' + esc(customer.name) + '">' +
          '<span class="avatar" aria-hidden="true" style="--av-bg:' + colors[0] + ';--av-fg:' + colors[1] + '">' +
            esc(initialsOf(customer.name)) +
          '</span>' +
          '<span class="row-text">' +
            '<span class="row-name">' + esc(customer.name) + '</span>' +
            '<span class="row-meta">' + esc(formatPhone(customer.phone)) + ' · ' + count +
              ' ' + (count === 1 ? 'entry' : 'entries') + '</span>' +
          '</span>' +
          '<span class="row-amount is-' + status + '">' +
            '<span class="row-amount-value"><span class="cur">₹</span>' +
              '<span data-balance>' + plainAmount(balance) + '</span></span>' +
            '<span class="row-amount-label">' + (status === 'due' ? 'Due' : status === 'advance' ? 'Advance' : 'Settled') + '</span>' +
          '</span>' +
        '</button>' +
        '<a class="remind-btn" data-remind="' + esc(digits) + '" href="' + reminderHref(customer, balance) + '" ' +
          'target="_blank" rel="noopener noreferrer" aria-label="Send WhatsApp reminder to ' + esc(customer.name) + '">' +
          WA_ICON +
        '</a>' +
      '</li>'
    );
  }

  function renderDetail() {
    const customer = getCustomer(activeCustomerId);
    if (!customer) {
      closeSheet(els.detailSheet);
      return;
    }

    const balance = balanceOf(customer);
    const status = statusOf(balance);
    const colors = avatarColors(customer.name);

    els.detailAvatar.textContent = initialsOf(customer.name);
    els.detailAvatar.style.setProperty('--av-bg', colors[0]);
    els.detailAvatar.style.setProperty('--av-fg', colors[1]);
    els.detailName.textContent = customer.name;
    els.detailPhone.textContent = '+91 ' + formatPhone(customer.phone);
    els.detailPhone.href = 'tel:+91' + phoneDigits(customer.phone);

    els.detailBalance.textContent = groupedAmount(balance);
    els.detailLabel.textContent =
      status === 'due' ? 'Outstanding' : status === 'advance' ? 'Advance with you' : 'Settled up';
    els.detailPanel.classList.remove('is-due', 'is-advance', 'is-settled');
    els.detailPanel.classList.add('is-' + status);

    const lastDate = customer.entries.length
      ? customer.entries.reduce((latest, entry) => (entry.date > latest ? entry.date : latest), customer.entries[0].date)
      : '';

    els.detailNote.textContent = customer.entries.length
      ? customer.entries.length + ' ' + (customer.entries.length === 1 ? 'entry' : 'entries') +
        ' · last ' + formatDate(lastDate)
      : 'Added ' + formatDate(String(customer.createdAt).slice(0, 10));

    els.detailRemind.href = reminderHref(customer, balance);

    const entries = [...customer.entries].sort(
      (a, b) => b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt))
    );

    els.entriesCount.textContent = String(entries.length);
    els.entries.innerHTML = entries.map(entryTemplate).join('');
    els.entriesEmpty.hidden = entries.length > 0;
  }

  function entryTemplate(entry) {
    const isPayment = entry.type === 'payment';
    const cls = isPayment ? 'payment' : 'credit';
    const meta = formatDate(entry.date) + (entry.note ? ' · ' + esc(entry.note) : '');
    const shot = isValidShot(entry.shot)
      ? '<button class="entry-shot" type="button" data-view-shot="' + esc(entry.id) + '" ' +
          'aria-label="View payment screenshot">' +
          '<img data-shot="' + esc(entry.id) + '" src="' + entry.shot + '" alt="Payment screenshot" loading="lazy" />' +
        '</button>'
      : '';

    return (
      '<li class="entry">' +
        '<span class="entry-dot is-' + cls + '" aria-hidden="true"></span>' +
        '<span class="entry-main">' +
          '<span class="entry-title">' + (isPayment ? 'Payment received' : 'Credit given') + '</span>' +
          '<span class="entry-meta">' + meta + '</span>' +
          shot +
        '</span>' +
        '<span class="entry-amount is-' + cls + '">' + (isPayment ? '-' : '+') + '₹' +
          groupedAmount(entry.amount) + '</span>' +
        '<button class="entry-del" type="button" data-del-entry="' + esc(entry.id) + '" ' +
          'aria-label="Delete this entry">' + TRASH_ICON + '</button>' +
      '</li>'
    );
  }

  /* ---------- Sheets ---------- */

  function openSheet(sheet, focusSelector) {
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    document.querySelectorAll('.backdrop.open').forEach((openBackdrop) => {
      if (openBackdrop !== sheet) closeSheet(openBackdrop, { restoreFocus: false });
    });

    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('sheet-open');

    const target = (focusSelector && sheet.querySelector(focusSelector)) || sheet;
    window.setTimeout(() => target.focus({ preventScroll: true }), 90);
  }

  function closeSheet(sheet, options) {
    if (!sheet || !sheet.classList.contains('open')) return;
    const opts = options || {};

    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');

    if (!document.querySelector('.backdrop.open')) {
      document.body.classList.remove('sheet-open');
    }

    if (opts.restoreFocus !== false && lastFocused && document.contains(lastFocused)) {
      lastFocused.focus({ preventScroll: true });
    }
    lastFocused = null;
  }

  function openCustomerSheet(customer) {
    editingId = customer ? customer.id : null;
    els.customerTitle.textContent = customer ? 'Edit customer' : 'New customer';
    els.customerSubmit.textContent = customer ? 'Save changes' : 'Add customer';
    els.customerName.value = customer ? customer.name : '';
    els.customerPhone.value = customer ? formatPhone(customer.phone) : '';
    hideCustomerError();
    openSheet(els.customerSheet, '#customer-name');
  }

  function openDetail(id) {
    const customer = getCustomer(id);
    if (!customer) return;

    activeCustomerId = id;
    els.creditForm.reset();
    els.paymentForm.reset();
    els.creditDate.value = todayISO();
    els.paymentDate.value = todayISO();
    clearPendingShot();
    setEntryTab(activeEntryTab);
    renderDetail();

    const scroller = els.detailSheet.querySelector('.sheet');
    if (scroller) scroller.scrollTop = 0;

    openSheet(els.detailSheet);
  }

  function setEntryTab(tab) {
    activeEntryTab = tab === 'payment' ? 'payment' : 'credit';
    els.entryTabs.forEach((button) => {
      const isActive = button.getAttribute('data-entry-tab') === activeEntryTab;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    els.creditForm.hidden = activeEntryTab !== 'credit';
    els.paymentForm.hidden = activeEntryTab !== 'payment';
  }

  function clearPendingShot() {
    pendingShot = '';
    if (els.shotInput) els.shotInput.value = '';
    if (els.shotPreview) els.shotPreview.removeAttribute('src');
    if (els.shotPreviewWrap) els.shotPreviewWrap.hidden = true;
  }

  function showShotPreview() {
    if (!pendingShot) return clearPendingShot();
    els.shotPreview.src = pendingShot;
    els.shotPreviewWrap.hidden = false;
  }

  function submitEntry(type) {
    const customer = getCustomer(activeCustomerId);
    if (!customer) return;

    const isPayment = type === 'payment';
    const amountEl = isPayment ? els.paymentAmount : els.creditAmount;
    const dateEl = isPayment ? els.paymentDate : els.creditDate;
    const noteEl = isPayment ? els.paymentNote : els.creditNote;

    const amount = parseAmount(amountEl.value);
    if (!(amount > 0)) {
      toast('Enter an amount greater than zero');
      amountEl.focus();
      return;
    }
    if (amount > 99999999) {
      toast('That amount looks too large');
      return;
    }

    const entry = {
      id: uid(),
      type,
      amount,
      date: isValidISODate(dateEl.value) ? dateEl.value : todayISO(),
      note: noteEl.value.trim().slice(0, 120),
      shot: isPayment ? pendingShot : '',
      createdAt: new Date().toISOString()
    };

    customer.entries.push(entry);

    if (!saveState()) {
      customer.entries.pop();
      toast(entry.shot ? 'Could not save — image is too large for local storage' : 'Could not save on this device');
      return;
    }

    amountEl.value = '';
    noteEl.value = '';
    if (isPayment) clearPendingShot();

    render();
    amountEl.focus();
    toast(isPayment ? 'Payment recorded' : 'Credit recorded');
  }

  function openShotViewer(entryId) {
    const customer = getCustomer(activeCustomerId);
    if (!customer) return;
    const entry = customer.entries.find((item) => item.id === entryId);
    if (!entry || !isValidShot(entry.shot)) return;

    els.shotViewerImg.src = entry.shot;
    els.shotViewer.hidden = false;
    document.body.classList.add('sheet-open');
    els.shotViewerClose.focus({ preventScroll: true });
  }

  function closeShotViewer() {
    if (!els.shotViewer || els.shotViewer.hidden) return;
    els.shotViewer.hidden = true;
    els.shotViewerImg.removeAttribute('src');
    if (!document.querySelector('.backdrop.open')) {
      document.body.classList.remove('sheet-open');
    }
  }

  function importJSON() {
    const raw = els.importBox.value.trim();
    if (!raw) {
      toast('Paste JSON first');
      els.importBox.focus();
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      toast('That is not valid JSON');
      return;
    }

    const customers = Array.isArray(parsed)
      ? parsed
      : parsed && Array.isArray(parsed.customers)
        ? parsed.customers
        : null;

    if (!customers) {
      toast('Expected an array of customers');
      return;
    }

    const next = normalizeState({ customers });
    if (!next.customers.length) {
      toast('No customers found in that JSON');
      return;
    }

    if (!window.confirm('Replace the ledger on this device with ' + next.customers.length + ' imported customer(s)?')) {
      return;
    }

    const previous = state;
    state = next;
    if (!saveState()) {
      state = previous;
      toast('Imported data is too large for local storage');
      return;
    }

    activeCustomerId = null;
    closeShotViewer();
    closeSheet(els.detailSheet, { restoreFocus: false });
    els.importBox.value = '';
    clearSearch();
    render();
    toast('Imported ' + next.customers.length + ' customer(s)');
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove('show'), 2300);
  }

  function showCustomerError(message) {
    els.customerError.textContent = message;
    els.customerError.hidden = false;
  }

  function hideCustomerError() {
    els.customerError.hidden = true;
    els.customerError.textContent = '';
  }

  function trapFocus(event) {
    if (event.key !== 'Tab') return;
    const openBackdrop = document.querySelector('.backdrop.open');
    if (!openBackdrop) return;

    const focusable = Array.from(
      openBackdrop.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => element.offsetParent !== null);

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ---------- Events ---------- */

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const closeBtn = event.target.closest('[data-close]');
      if (closeBtn) {
        const sheet = closeBtn.closest('.backdrop');
        if (sheet) closeSheet(sheet);
        return;
      }

      const backdrop = event.target.closest('.backdrop');
      if (backdrop && event.target === backdrop) {
        closeSheet(backdrop);
        return;
      }

      const opener = event.target.closest('[data-open]');
      if (opener) {
        openDetail(opener.getAttribute('data-open'));
      }
    });

    document.addEventListener('keydown', (event) => {
      if (!els.shotViewer.hidden) {
        if (event.key === 'Escape') closeShotViewer();
        return;
      }

      if (event.key === 'Escape') {
        const openBackdrop = document.querySelector('.backdrop.open');
        if (openBackdrop) {
          closeSheet(openBackdrop);
          return;
        }
        if (document.activeElement === els.search && els.search.value) {
          clearSearch();
        }
      }
      trapFocus(event);
    });

    els.search.addEventListener('input', () => {
      searchQuery = els.search.value;
      els.searchClear.hidden = !searchQuery;
      renderList();
    });

    els.searchClear.addEventListener('click', clearSearch);

    els.fab.addEventListener('click', () => openCustomerSheet());
    els.emptyAction.addEventListener('click', () => openCustomerSheet());

    els.customerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = els.customerName.value.trim().replace(/\s+/g, ' ');
      const phone = normalizePhone(els.customerPhone.value);

      if (name.length < 2) {
        showCustomerError('Enter the customer’s name.');
        els.customerName.focus();
        return;
      }
      if (!/^\d{10}$/.test(phone)) {
        showCustomerError('Enter a valid 10-digit mobile number.');
        els.customerPhone.focus();
        return;
      }

      const duplicate = state.customers.find(
        (customer) => customer.phone === phone && customer.id !== editingId
      );
      if (duplicate) {
        showCustomerError('This number is already saved as ' + duplicate.name + '.');
        return;
      }

      hideCustomerError();
      const isNew = !editingId;
      let savedId = editingId;

      if (editingId) {
        const customer = getCustomer(editingId);
        if (!customer) return;
        customer.name = name;
        customer.phone = phone;
        toast('Customer updated');
      } else {
        const customer = {
          id: uid(),
          name,
          phone,
          createdAt: new Date().toISOString(),
          entries: []
        };
        state.customers.push(customer);
        savedId = customer.id;
        toast('Customer added');
      }

      editingId = null;
      saveState();
      closeSheet(els.customerSheet);

      if (isNew) clearSearch();

      render();
      if (savedId) openDetail(savedId);
    });

    els.creditForm.addEventListener('submit', (event) => {
      event.preventDefault();
      submitEntry('credit');
    });

    els.paymentForm.addEventListener('submit', (event) => {
      event.preventDefault();
      submitEntry('payment');
    });

    els.entryTabs.forEach((button) => {
      button.addEventListener('click', () => {
        setEntryTab(button.getAttribute('data-entry-tab'));
        const target = activeEntryTab === 'payment' ? els.paymentAmount : els.creditAmount;
        target.focus({ preventScroll: true });
      });
    });

    els.shotInput.addEventListener('change', () => {
      const file = els.shotInput.files && els.shotInput.files[0];
      if (!file) {
        clearPendingShot();
        return;
      }
      fileToShot(file)
        .then((dataUrl) => {
          pendingShot = dataUrl;
          showShotPreview();
          toast('Screenshot attached');
        })
        .catch(() => {
          clearPendingShot();
          toast('That image could not be read');
        });
    });

    els.shotRemove.addEventListener('click', () => {
      clearPendingShot();
      els.shotInput.focus({ preventScroll: true });
    });

    els.importGo.addEventListener('click', importJSON);

    els.shotViewerClose.addEventListener('click', closeShotViewer);

    els.shotViewer.addEventListener('click', (event) => {
      if (event.target === els.shotViewer) closeShotViewer();
    });

    els.entries.addEventListener('click', (event) => {
      const shotBtn = event.target.closest('[data-view-shot]');
      if (shotBtn) {
        openShotViewer(shotBtn.getAttribute('data-view-shot'));
        return;
      }

      const button = event.target.closest('[data-del-entry]');
      if (!button) return;
      const customer = getCustomer(activeCustomerId);
      if (!customer) return;

      const entryId = button.getAttribute('data-del-entry');
      const entry = customer.entries.find((item) => item.id === entryId);
      if (!entry) return;

      const label = (entry.type === 'payment' ? 'payment' : 'credit') + ' of ₹' + groupedAmount(entry.amount);
      if (!window.confirm('Delete this ' + label + '?')) return;

      customer.entries = customer.entries.filter((item) => item.id !== entryId);
      saveState();
      render();
      toast('Entry deleted');
    });

    els.detailEdit.addEventListener('click', () => {
      const customer = getCustomer(activeCustomerId);
      if (!customer) return;
      closeSheet(els.detailSheet);
      openCustomerSheet(customer);
    });

    els.detailDelete.addEventListener('click', () => {
      const customer = getCustomer(activeCustomerId);
      if (!customer) return;

      const detail = customer.entries.length
        ? ' and all ' + customer.entries.length + ' ' + (customer.entries.length === 1 ? 'entry' : 'entries')
        : '';

      if (!window.confirm('Delete ' + customer.name + detail + '? This cannot be undone.')) return;

      state.customers = state.customers.filter((item) => item.id !== customer.id);
      saveState();
      activeCustomerId = null;
      closeSheet(els.detailSheet);
      render();
      toast('Customer deleted');
    });

    els.reset.addEventListener('click', () => {
      if (!state.customers.length) {
        toast('Nothing to clear');
        return;
      }
      if (!window.confirm('Clear all customers and entries? This cannot be undone.')) return;

      state = { customers: [] };
      activeCustomerId = null;
      saveState();
      closeSheet(els.detailSheet, { restoreFocus: false });
      clearSearch();
      render();
      toast('All data cleared');
    });

    window.addEventListener('scroll', () => {
      els.header.classList.toggle('is-scrolled', window.scrollY > 4);
    }, { passive: true });

    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        if (!parsed || !Array.isArray(parsed.customers)) return;
        state = normalizeState(parsed);
        render();
      } catch (error) {
        console.warn('Hisaab: could not sync external change.', error);
      }
    });
  }

  function clearSearch() {
    els.search.value = '';
    searchQuery = '';
    els.searchClear.hidden = true;
    renderList();
  }

  /* ---------- Init ---------- */

  els.creditDate.value = todayISO();
  els.paymentDate.value = todayISO();
  setEntryTab(activeEntryTab);
  bindEvents();
  render();
})();
