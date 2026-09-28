'use strict';

/* =========================================================
 * אחסון (localStorage) — אפליקציית דמו, ללא שרת
 * ========================================================= */
const USERS_KEY = 'tm_users';
const SESSION_KEY = 'tm_session';
const tasksKey = (email) => `tm_tasks_${email}`;

const load = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

async function hashPassword(password) {
  if (!window.crypto?.subtle) return password; // סביבה ללא Web Crypto
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* =========================================================
 * ולידציות
 * ========================================================= */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

const PASSWORD_RULES = {
  length: (p) => p.length >= 8,
  upper: (p) => /[A-Z]/.test(p),
  lower: (p) => /[a-z]/.test(p),
  digit: (p) => /\d/.test(p),
  special: (p) => /[^A-Za-z0-9]/.test(p),
};

function validateEmail(email) {
  if (!email) return 'יש להזין אימייל';
  if (!EMAIL_RE.test(email)) return 'כתובת אימייל לא תקינה';
  return '';
}

function validateNewPassword(password) {
  if (!password) return 'יש להזין סיסמה';
  if (/\s/.test(password)) return 'הסיסמה לא יכולה להכיל רווחים';
  const failed = Object.values(PASSWORD_RULES).some((rule) => !rule(password));
  return failed ? 'הסיסמה אינה עומדת בכל הדרישות' : '';
}

function validateName(name) {
  if (!name) return 'יש להזין שם';
  if (name.length < 2) return 'השם חייב להכיל לפחות 2 תווים';
  return '';
}

function setFieldError(input, message) {
  const errorEl = document.querySelector(`[data-test="${input.dataset.test}-error"]`);
  if (errorEl) errorEl.textContent = message;
  input.classList.toggle('invalid', Boolean(message));
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  return !message;
}

/* =========================================================
 * ניווט בין מסכים
 * ========================================================= */
const views = {
  login: document.getElementById('login-view'),
  register: document.getElementById('register-view'),
  tasks: document.getElementById('tasks-view'),
};

const currentUser = () => {
  const email = localStorage.getItem(SESSION_KEY);
  return email ? load(USERS_KEY, []).find((u) => u.email === email) : null;
};

function route() {
  const user = currentUser();
  let view = location.hash.slice(1);

  if (user) view = 'tasks';
  else if (view !== 'register') view = 'login';

  if (location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
  Object.entries(views).forEach(([name, el]) => (el.hidden = name !== view));

  if (view === 'tasks') initTasks(user);
  document.title = { login: 'התחברות', register: 'הרשמה', tasks: 'המשימות שלי' }[view];
}

window.addEventListener('hashchange', route);

/* =========================================================
 * התחברות
 * ========================================================= */
const loginForm = document.getElementById('login-form');
const loginError = document.querySelector('[data-test="login-error"]');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  const emailInput = loginForm.elements.email;
  const passwordInput = loginForm.elements.password;
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  const emailOk = setFieldError(emailInput, validateEmail(email));
  const passwordOk = setFieldError(passwordInput, password ? '' : 'יש להזין סיסמה');
  if (!emailOk || !passwordOk) return;

  const user = load(USERS_KEY, []).find((u) => u.email === email);
  if (!user || user.passwordHash !== (await hashPassword(password))) {
    loginError.textContent = 'אימייל או סיסמה שגויים';
    return;
  }

  localStorage.setItem(SESSION_KEY, user.email);
  loginForm.reset();
  location.hash = '#tasks';
});

/* =========================================================
 * הרשמה
 * ========================================================= */
const registerForm = document.getElementById('register-form');
const registerError = document.querySelector('[data-test="register-error"]');
const ruleItems = document.querySelectorAll('.password-rules li');

function updatePasswordRules(password) {
  ruleItems.forEach((li) => li.classList.toggle('ok', PASSWORD_RULES[li.dataset.rule](password)));
}

registerForm.elements.password.addEventListener('input', (e) => updatePasswordRules(e.target.value));

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError.textContent = '';

  const { name: nameInput, email: emailInput, password: passwordInput, confirm: confirmInput } =
    registerForm.elements;
  const name = nameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const confirm = confirmInput.value;

  let confirmMsg = '';
  if (!confirm) confirmMsg = 'יש לאמת את הסיסמה';
  else if (confirm !== password) confirmMsg = 'הסיסמאות אינן תואמות';

  const results = [
    setFieldError(nameInput, validateName(name)),
    setFieldError(emailInput, validateEmail(email)),
    setFieldError(passwordInput, validateNewPassword(password)),
    setFieldError(confirmInput, confirmMsg),
  ];
  if (results.includes(false)) return;

  const users = load(USERS_KEY, []);
  if (users.some((u) => u.email === email)) {
    setFieldError(emailInput, 'כתובת האימייל כבר רשומה במערכת');
    return;
  }

  users.push({ name, email, passwordHash: await hashPassword(password) });
  save(USERS_KEY, users);
  localStorage.setItem(SESSION_KEY, email);
  registerForm.reset();
  updatePasswordRules('');
  location.hash = '#tasks';
});

// ניקוי שגיאה של שדה ברגע שהמשתמש מתחיל להקליד
document.querySelectorAll('.auth-card input').forEach((input) =>
  input.addEventListener('input', () => setFieldError(input, '')),
);

document.getElementById('logout').addEventListener('click', () => {
  localStorage.removeItem(SESSION_KEY);
  location.hash = '#login';
});

/* =========================================================
 * משימות
 * ========================================================= */
const taskForm = document.getElementById('task-form');
const taskTitle = document.getElementById('task-title');
const taskDue = document.getElementById('task-due');
const taskPriority = document.getElementById('task-priority');
const taskSubmit = document.querySelector('[data-test="task-submit"]');
const taskCancel = document.getElementById('task-cancel');
const taskError = document.querySelector('[data-test="task-error"]');
const taskList = document.getElementById('task-list');
const searchInput = document.getElementById('search');
const counter = document.querySelector('[data-test="counter"]');
const emptyState = document.querySelector('[data-test="empty-state"]');
const filterButtons = document.querySelectorAll('.filter');

const PRIORITY_LABELS = { high: 'גבוהה', medium: 'בינונית', low: 'נמוכה' };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const state = { user: null, tasks: [], filter: 'all', search: '', editingId: null };

const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const formatDate = (iso) => iso.split('-').reverse().join('/');
const persistTasks = () => save(tasksKey(state.user.email), state.tasks);

function initTasks(user) {
  state.user = user;
  state.tasks = load(tasksKey(user.email), []);
  state.filter = 'all';
  state.search = '';
  searchInput.value = '';
  filterButtons.forEach((b) => b.classList.toggle('active', b.dataset.filter === 'all'));
  document.querySelector('[data-test="welcome"]').textContent = `שלום, ${user.name}`;
  resetTaskForm();
  render();
}

function resetTaskForm() {
  state.editingId = null;
  taskForm.reset();
  taskPriority.value = 'medium';
  taskSubmit.textContent = 'הוסף';
  taskCancel.hidden = true;
  taskError.textContent = '';
  taskTitle.classList.remove('invalid');
}

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = taskTitle.value.trim();
  const due = taskDue.value;

  let error = '';
  if (!title) error = 'יש להזין כותרת למשימה';
  else if (title.length > 100) error = 'כותרת המשימה ארוכה מדי (עד 100 תווים)';
  else if (due && !state.editingId && due < todayISO()) error = 'תאריך היעד לא יכול להיות בעבר';

  taskError.textContent = error;
  taskTitle.classList.toggle('invalid', Boolean(error));
  if (error) return;

  if (state.editingId) {
    const task = state.tasks.find((t) => t.id === state.editingId);
    Object.assign(task, { title, due, priority: taskPriority.value });
  } else {
    state.tasks.push({
      id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
      title,
      due,
      priority: taskPriority.value,
      done: false,
      createdAt: Date.now(),
    });
  }

  persistTasks();
  resetTaskForm();
  render();
});

taskCancel.addEventListener('click', resetTaskForm);

function startEdit(task) {
  state.editingId = task.id;
  taskTitle.value = task.title;
  taskDue.value = task.due;
  taskPriority.value = task.priority;
  taskSubmit.textContent = 'שמור';
  taskCancel.hidden = false;
  taskError.textContent = '';
  taskTitle.focus();
}

filterButtons.forEach((btn) =>
  btn.addEventListener('click', () => {
    state.filter = btn.dataset.filter;
    filterButtons.forEach((b) => b.classList.toggle('active', b === btn));
    render();
  }),
);

searchInput.addEventListener('input', () => {
  state.search = searchInput.value.trim().toLowerCase();
  render();
});

function visibleTasks() {
  return state.tasks
    .filter((t) => (state.filter === 'active' ? !t.done : state.filter === 'done' ? t.done : true))
    .filter((t) => t.title.toLowerCase().includes(state.search))
    .sort(
      (a, b) =>
        a.done - b.done ||
        (a.due || '9999').localeCompare(b.due || '9999') ||
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        a.createdAt - b.createdAt,
    );
}

function createTaskItem(task) {
  const li = document.createElement('li');
  li.className = `task priority-${task.priority}${task.done ? ' done' : ''}`;
  li.dataset.test = 'task-item';
  li.dataset.id = task.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.dataset.test = 'task-toggle';
  checkbox.setAttribute('aria-label', `סמן "${task.title}" כבוצע`);
  checkbox.addEventListener('change', () => {
    task.done = checkbox.checked;
    persistTasks();
    render();
  });

  const body = document.createElement('div');
  body.className = 'body';

  const title = document.createElement('div');
  title.className = 'title';
  title.dataset.test = 'task-title-text';
  title.textContent = task.title;

  const meta = document.createElement('div');
  meta.className = 'meta';

  const priority = document.createElement('span');
  priority.dataset.test = 'task-priority-text';
  priority.textContent = `עדיפות: ${PRIORITY_LABELS[task.priority]}`;
  meta.append(priority);

  if (task.due) {
    const due = document.createElement('span');
    due.dataset.test = 'task-due-text';
    const overdue = !task.done && task.due < todayISO();
    due.textContent = `יעד: ${formatDate(task.due)}${overdue ? ' (באיחור)' : ''}`;
    if (overdue) due.classList.add('overdue');
    meta.append(due);
  }

  body.append(title, meta);

  const actions = document.createElement('div');
  actions.className = 'actions';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn ghost';
  editBtn.dataset.test = 'task-edit';
  editBtn.textContent = 'עריכה';
  editBtn.addEventListener('click', () => startEdit(task));

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn ghost danger';
  deleteBtn.dataset.test = 'task-delete';
  deleteBtn.textContent = 'מחיקה';
  deleteBtn.addEventListener('click', () => {
    if (!confirm(`למחוק את המשימה "${task.title}"?`)) return;
    state.tasks = state.tasks.filter((t) => t.id !== task.id);
    if (state.editingId === task.id) resetTaskForm();
    persistTasks();
    render();
  });

  actions.append(editBtn, deleteBtn);
  li.append(checkbox, body, actions);
  return li;
}

function render() {
  const tasks = visibleTasks();
  taskList.replaceChildren(...tasks.map(createTaskItem));
  emptyState.hidden = tasks.length > 0;

  const active = state.tasks.filter((t) => !t.done).length;
  counter.textContent = `${active} פעילות · ${state.tasks.length - active} הושלמו · ${state.tasks.length} סה"כ`;
}

route();
