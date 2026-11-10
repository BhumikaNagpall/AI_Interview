const root = document.querySelector('#app');
const announcer = document.querySelector('#announcer');
const state = { user: null, catalog: null, mode: 'practice', view: 'dashboard', sessions: [], session: null, authMode: 'login', filter: 'all', selectedRound: 'hr', error: '', deleteId: null, busy: false };
const roundStyle = {
  hr: { icon: 'Hi', color: 'peach', tagline: 'YOUR FIRST IMPRESSION', description: 'Introduce yourself with clarity. Connect your strengths, interests and ambitions.' },
  projects: { icon: '↗', color: 'green', tagline: 'YOUR WORK, YOUR STORY', description: 'Go beyond your resume. Explain what you built, the choices you made and your impact.' },
  dsa: { icon: '</>', color: 'blue', tagline: 'THINK IT THROUGH', description: 'Work through a problem, explore edge cases and explain your approach out loud.' },
  cs: { icon: '{ }', color: '', tagline: 'BUILD ON THE BASICS', description: 'Connect the dots across databases, operating systems, networks and OOP.' },
  ml: { icon: '✧', color: 'rose', tagline: 'FROM DATA TO DECISIONS', description: 'Discuss models, evaluation and the reasoning behind practical ML decisions.' },
  behavioural: { icon: '↔', color: 'peach', tagline: 'THE HUMAN SIDE', description: 'Reflect on teamwork, ownership and the moments that helped you grow.' }
};

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'text') node.textContent = value;
    else if (key === 'value') node.value = value;
    else if (value === true) node.setAttribute(key, '');
    else if (value !== false && value != null) node.setAttribute(key, String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
function btn(text, action, kind = 'primary', extra = {}) { return el('button', { type: 'button', class: `btn btn-${kind}`, onclick: action, ...extra }, text); }
function badge(text, kind = '') { return el('span', { class: `badge ${kind}` }, el('span', { class: 'badge-dot', 'aria-hidden': 'true' }), text); }
function label(group, id) { return state.catalog?.[group]?.find(item => item.id === id)?.label || id; }
function icon(round) { const style = roundStyle[round] || roundStyle.hr; return el('span', { class: `round-icon ${style.color}`, 'aria-hidden': 'true' }, style.icon); }
function say(text) { announcer.textContent = ''; requestAnimationFrame(() => { announcer.textContent = text; }); }
function remember(id) { try { if (id) localStorage.setItem('interview-studio-session', id); else localStorage.removeItem('interview-studio-session'); } catch { /* Storage is optional. */ } }
function remembered() { try { return localStorage.getItem('interview-studio-session'); } catch { return null; } }
function errorBox(message) { return el('div', { class: 'error', role: 'alert', tabindex: '-1' }, message); }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? 'Saved session' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
function modeNotice(mode = state.mode) { return el('div', { class: 'notice' }, mode === 'practice' ? 'Practice mode uses guided questions and reflection prompts. AI scoring is not enabled, so technical accuracy is not graded.' : 'AI feedback is a learning aid. Review its reasoning and evidence; it is not a hiring prediction.'); }

async function api(path, method = 'GET', body) {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: body !== undefined ? { 'Content-Type': 'application/json' } : {}, body: body !== undefined ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Something went wrong. Please try again.');
    error.status = response.status;
    error.code = data.error?.code;
    throw error;
  }
  return data;
}
function inlineError(container, error) {
  container.querySelector('.error')?.remove();
  const box = errorBox(error.message || 'Connection interrupted. Please try again.');
  container.prepend(box); box.focus();
  if (error.status === 401 && state.user) { state.user = null; state.error = 'Your sign-in has expired. Sign in again to reopen your saved sessions.'; remember(null); render(); }
}
async function withBusy(form, operation) {
  if (state.busy) return;
  state.busy = true;
  const controls = [...form.querySelectorAll('button, input, select, textarea')];
  const prior = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  form.setAttribute('aria-busy', 'true');
  try { await operation(); } catch (error) { inlineError(form, error); }
  finally { state.busy = false; controls.forEach((control, index) => { control.disabled = prior[index]; }); form.removeAttribute('aria-busy'); }
}
async function refreshSessions() { state.sessions = (await api('/api/sessions')).sessions; }
async function navigate(view, round) {
  if (state.busy) return;
  state.view = view; state.error = ''; state.deleteId = null;
  if (round) state.selectedRound = round;
  if (view === 'dashboard' || view === 'history') {
    try { await refreshSessions(); } catch (error) { state.error = error.message; }
  }
  render();
  document.querySelector('main h1')?.focus();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function pageHeading(eyebrow, title, description, action) {
  return el('div', { class: 'page-heading' }, el('div', {}, el('p', { class: 'eyebrow' }, eyebrow), el('h1', { tabindex: '-1' }, title), description && el('p', {}, description)), action);
}
function brand() { return el('div', { class: 'brand' }, el('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'i.'), 'Interview Studio'); }
function render() {
  root.replaceChildren(state.user ? shell() : authScreen());
  say(state.user ? `${state.view === 'session' ? 'Interview' : state.view} ready` : 'Sign in to Interview Studio');
}
function shell() {
  const isHistory = state.view === 'history' || state.view === 'report';
  const sidebar = el('aside', { class: 'sidebar' }, brand(), el('div', {}, el('p', { class: 'nav-caption' }, 'Your practice space'), el('nav', { class: 'nav-list', 'aria-label': 'Main navigation' },
    el('button', { type: 'button', class: `nav-item ${!isHistory ? 'active' : ''}`, 'aria-current': !isHistory ? 'page' : null, onclick: () => navigate('dashboard') }, el('span', { class: 'nav-glyph', 'aria-hidden': 'true' }, '▦'), 'Practice room'),
    el('button', { type: 'button', class: `nav-item ${isHistory ? 'active' : ''}`, 'aria-current': isHistory ? 'page' : null, onclick: () => navigate('history') }, el('span', { class: 'nav-glyph', 'aria-hidden': 'true' }, '◷'), 'My sessions')
  )), el('div', { class: 'sidebar-bottom' }, el('div', { class: 'small-note' }, el('strong', {}, 'A little practice, every day.'), el('p', {}, 'You don’t need the perfect answer. Start with your next one.')), el('div', { class: 'profile' }, el('span', { class: 'avatar', 'aria-hidden': 'true' }, state.user.name.slice(0, 1).toUpperCase()), el('div', { class: 'profile-text' }, el('span', { class: 'profile-name' }, state.user.name), el('small', {}, 'CSE / AI & ML student')), el('button', { type: 'button', class: 'logout', onclick: logout }, 'Sign out'))));
  const main = el('main', { id: 'main', class: 'main-content' });
  if (state.error) main.append(errorBox(state.error));
  const screens = { dashboard, setup: setupScreen, history: historyScreen, session: sessionScreen, report: reportScreen };
  main.append((screens[state.view] || dashboard)());
  main.append(el('footer', { class: 'footer-line' }, el('span', {}, 'Built for your next opportunity.'), el('span', {}, 'CSE & AI/ML · Internship and fresher preparation')));
  return el('div', { class: 'app-shell' }, sidebar, el('div', { class: 'workspace' }, el('header', { class: 'topbar' }, el('div', { class: 'breadcrumb' }, 'Your workspace', '  /  ', el('strong', {}, isHistory ? 'My sessions' : 'Practice room')), el('div', { class: 'topbar-right' }, el('span', { class: 'help' }, 'One conversation closer.'), badge(state.mode === 'ai' ? 'AI mode' : 'Practice mode'), el('button', { type: 'button', class: 'text-button', onclick: logout, 'aria-label': 'Sign out of your account' }, 'Sign out'))), main));
}
async function logout() {
  if (state.busy) return;
  try { await api('/api/auth/logout', 'POST', {}); state.user = null; state.sessions = []; state.session = null; state.error = ''; remember(null); render(); }
  catch (error) { state.error = error.message; render(); }
}
function authScreen() {
  const registration = state.authMode === 'register';
  const form = el('form', {});
  if (registration) form.append(field('Your name', el('input', { id: 'name', name: 'name', autocomplete: 'name', required: true, maxlength: 80, placeholder: 'How should we address you?' })));
  form.append(field('Email address', el('input', { id: 'email', name: 'email', type: 'email', autocomplete: 'email', required: true, maxlength: 254, placeholder: 'you@example.com' })), field('Password', el('input', { id: 'password', name: 'password', type: 'password', autocomplete: registration ? 'new-password' : 'current-password', required: true, minlength: 10, maxlength: 128, placeholder: registration ? 'At least 10 characters' : 'Enter your password' }), registration ? 'Use at least 10 characters.' : null), el('button', { type: 'submit', class: 'btn btn-primary full-width' }, registration ? 'Create your account  →' : 'Sign in  →'));
  form.addEventListener('submit', event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(form));
    withBusy(form, async () => { const response = await api(`/api/auth/${registration ? 'register' : 'login'}`, 'POST', values); state.user = response.user; state.error = ''; state.view = 'dashboard'; remember(null); await refreshSessions(); render(); });
  });
  return el('div', { class: 'auth-layout' }, el('section', { class: 'auth-story', 'aria-label': 'About Interview Studio' }, brand(), el('div', { class: 'auth-copy' }, el('h1', {}, 'Your next chapter', el('br'), 'starts with ', el('em', {}, 'a conversation.')), el('p', {}, 'A thoughtful space to practise, find your voice and prepare for opportunities in software and AI.'), el('div', { class: 'auth-pills' }, ['6 interview rounds', '4 interviewer styles', 'Your own pace'].map(text => el('span', {}, text)))), el('footer', {}, 'For the curious. The ambitious. The not-quite-ready-yet.')), el('main', { id: 'main', class: 'auth-form-wrap' }, el('div', { class: 'auth-card' }, el('p', { class: 'eyebrow' }, 'Make room for growth'), el('h2', {}, registration ? 'Let’s get you started.' : 'Welcome to your studio.'), el('p', {}, registration ? 'Create an account to save your practice and reflections.' : 'Sign in to pick up where you left off.'), state.error && errorBox(state.error), form, el('div', { class: 'auth-switch' }, registration ? 'Already have an account? ' : 'New here? ', el('button', { type: 'button', onclick: () => { state.authMode = registration ? 'login' : 'register'; state.error = ''; render(); } }, registration ? 'Sign in' : 'Create an account')), el('p', { class: 'auth-note' }, 'Your sessions are private to your account. You can delete them from My sessions.'))));
}
function field(text, control, help) { return el('div', { class: 'field' }, el('label', { for: control.id }, text), control, help && el('p', { class: 'help' }, help)); }
function dashboard() {
  const completed = state.sessions.filter(session => session.status === 'completed');
  const active = state.sessions.filter(session => session.status === 'active');
  const rounds = new Set(completed.map(session => session.round));
  const first = state.user.name.trim().split(/\s+/)[0];
  return el('div', {}, pageHeading('A small step. A stronger you.', `Ready for your next chapter, ${first}?`, 'Choose a conversation to practise. Build confidence, one answer at a time.'),
    el('section', { class: 'hero', 'aria-label': 'Start practice' }, el('div', {}, el('p', { class: 'eyebrow' }, 'YOUR NEXT OPPORTUNITY STARTS HERE'), el('h2', {}, active.length ? 'Your practice is waiting for you.' : 'A safe space to find your best answer.'), el('p', {}, active.length ? 'Continue an unfinished conversation, or explore another interview round below.' : 'From your first introduction to a technical deep dive. Practise with different interviewers, at your own pace.'), btn(active.length ? 'Continue your session  →' : 'Start a practice session  →', () => active.length ? openSession(active[0].id) : navigate('setup'), 'primary')),
      el('div', { class: 'hero-art', 'aria-hidden': 'true' }, el('span', { class: 'orbit' }), el('span', { class: 'orbit inner' }), el('div', { class: 'chat-tile' }, el('span'), el('span'), el('span')), el('span', { class: 'art-spark' }, '✦'))),
    el('div', { class: 'stats-grid' }, stat(completed.length, 'Sessions completed', '✓'), stat(active.length, 'Conversations in progress', '◷'), stat(`${rounds.size} / 6`, 'Interview rounds explored', '↗')),
    el('section', { 'aria-labelledby': 'rounds-title' }, el('div', { class: 'section-head' }, el('div', {}, el('h2', { id: 'rounds-title' }, 'What would you like to practise?'), el('p', {}, 'Six rounds. Different skills. A little more prepared.')), badge('CSE + AI/ML', 'neutral')), el('div', { class: 'round-grid' }, state.catalog.rounds.map(round => {
      const info = roundStyle[round.id] || roundStyle.hr;
      return el('article', { class: 'round-card' }, el('div', { class: 'card-top' }, icon(round.id), el('span', { class: 'tiny-label' }, '01 : 01')), el('h3', {}, round.label), el('p', {}, info.description), el('div', { class: 'card-footer' }, el('small', {}, 'Choose your interviewer'), el('button', { type: 'button', class: 'card-link', onclick: () => navigate('setup', round.id), 'aria-label': `Practise ${round.label}` }, 'Practise  ↗')));
    }))),
    el('p', { class: 'footnote' }, el('span', { 'aria-hidden': 'true' }, 'ⓘ'), state.mode === 'practice' ? 'You’re in guided practice mode. Questions and reflection prompts are available; AI assessment and technical scoring are not enabled.' : 'AI feedback supports your preparation. Always review it critically; it is not a hiring prediction.'));
}
function stat(value, text, glyph) { return el('div', { class: 'stat' }, el('span', { class: 'stat-icon', 'aria-hidden': 'true' }, glyph), el('div', {}, el('strong', {}, value), el('p', {}, text))); }
function selectField(id, title, options, value) {
  const input = el('select', { id, name: id, required: true }, options.map(option => el('option', { value: option.id }, option.label)));
  input.value = value || options[0]?.id;
  return field(title, input);
}
function setupScreen() {
  const form = el('form', { class: 'panel' });
  const personaOptions = el('fieldset', { class: 'field full' });
  const legend = el('legend', { class: 'field-label' }, 'Choose an interviewer style');
  personaOptions.append(legend, el('div', { class: 'persona-grid' }, state.catalog.personas.map((persona, index) => el('label', { class: 'persona-option' }, el('input', { type: 'radio', name: 'persona', value: persona.id, checked: index === 0, required: true }), el('span', {}, el('strong', {}, persona.label), el('small', {}, persona.description))))));
  const context = el('textarea', { id: 'context', name: 'context', maxlength: 12000, rows: 5, placeholder: 'Tell us about your project, paste relevant resume text, or share a topic you want to discuss. Avoid private details you don’t need for practice.' });
  const uploadMessage = el('p', { class: 'help', role: 'status' }, 'Optional: plain-text (.txt) file, up to 48 KB and 12,000 characters.');
  const file = el('input', { id: 'context-file', type: 'file', accept: '.txt,text/plain', 'aria-describedby': 'upload-help' });
  uploadMessage.id = 'upload-help';
  file.addEventListener('change', async () => {
    const selected = file.files[0]; if (!selected) return;
    if (!/\.txt$/i.test(selected.name) || selected.size > 48 * 1024) { uploadMessage.textContent = 'Choose a .txt file no larger than 48 KB.'; file.value = ''; return; }
    try { const text = await selected.text(); if (text.length > 12000 || text.includes('\0')) throw new Error('Use a plain-text file with no more than 12,000 characters.'); context.value = text; uploadMessage.textContent = `Loaded ${selected.name}. Review the text before starting.`; }
    catch (error) { uploadMessage.textContent = error.message; }
  });
  form.append(el('h2', {}, 'Make this conversation yours'), el('p', { class: 'help' }, 'Choose what to practise and how you’d like to be challenged.'), el('div', { class: 'form-grid' },
    selectField('role', 'Target role', state.catalog.roles), selectField('round', 'Interview round', state.catalog.rounds, state.selectedRound), selectField('difficulty', 'Difficulty', state.catalog.difficulties), selectField('durationMinutes', 'Planned session length', state.catalog.durations.map(duration => ({ id: String(duration), label: `${duration} minutes · ${duration === 10 ? 4 : duration === 20 ? 6 : 8} questions` }))), personaOptions,
    el('div', { class: 'field full' }, el('label', { for: 'context' }, 'Your project or resume context'), context, el('div', { class: 'context-upload' }, el('label', { for: 'context-file' }, 'Or import text'), file), uploadMessage, el('p', { class: 'help' }, state.mode === 'ai' ? 'In AI mode, your context and answers are sent to the configured AI provider to generate questions and feedback.' : 'Practice mode keeps your context and answers in this application. No AI provider is contacted.'))),
    el('div', { class: 'form-actions' }, btn('Back to practice room', () => navigate('dashboard'), 'secondary'), el('button', { type: 'submit', class: 'btn btn-primary' }, 'Begin interview  →')));
  form.addEventListener('submit', event => { event.preventDefault(); const data = Object.fromEntries(new FormData(form)); data.durationMinutes = Number(data.durationMinutes); withBusy(form, async () => { state.session = (await api('/api/sessions', 'POST', data)).session; remember(state.session.id); state.view = 'session'; render(); window.scrollTo(0, 0); }); });
  return el('div', {}, pageHeading('Your practice, your pace', 'Set the scene.', 'A different interviewer style can bring out a different side of your answer.'), modeNotice(), el('div', { class: 'setup-layout' }, form, el('aside', { class: 'panel aside-panel' }, el('h3', {}, 'A little room to think.'), el('p', {}, 'This is practice. You can take a breath, rethink your approach and learn as you go.'), el('ol', {}, el('li', {}, 'You’ll get one question at a time.'), el('li', {}, 'Follow-up questions help you explore your reasoning.'), el('li', {}, 'Your submitted answers are saved so you can return later.'), el('li', {}, 'Finish to collect your feedback or reflection prompts.')), el('p', { class: 'help' }, 'The session length is a planning guide, not a countdown. Your selected question budget determines the maximum length.'))));
}
async function openSession(id) {
  if (state.busy) return;
  try { state.session = (await api(`/api/sessions/${encodeURIComponent(id)}`)).session; state.view = state.session.status === 'completed' ? 'report' : 'session'; state.error = ''; remember(id); render(); window.scrollTo(0, 0); }
  catch (error) { state.error = error.message; render(); }
}
function sessionScreen() {
  const session = state.session;
  if (!session) return empty('Choose a session to begin.', 'Your practice conversations will appear here.', () => navigate('dashboard'));
  const answered = session.turns.filter(turn => turn.answer !== null).length;
  const latest = session.turns.at(-1);
  const conversation = el('div', { class: 'conversation' }, session.turns.map((turn, index) => el('article', { class: 'panel turn' }, el('div', { class: 'speaker' }, el('span', { 'aria-hidden': 'true' }, 'i.'), `${label('personas', session.persona)} interviewer · Question ${index + 1}`), el('p', { class: 'question' }, turn.question), turn.answer !== null && el('div', { class: 'answer' }, el('p', { class: 'answer-label' }, 'Your answer'), el('p', { class: `answer-text ${session.round === 'dsa' ? 'code-input' : ''}` }, turn.answer)))));
  const form = el('form', { class: 'answer-form' });
  if (latest && latest.answer === null) {
    const answer = el('textarea', { id: 'answer', name: 'answer', required: true, maxlength: 12000, class: session.round === 'dsa' ? 'code-input' : '', placeholder: session.round === 'dsa' ? 'Write your code or explain your approach, complexity and edge cases…' : 'Take a moment. How would you answer this question?', spellcheck: session.round !== 'dsa' });
    form.append(field(session.round === 'dsa' ? 'Code review only — not executed' : 'Your answer', answer), el('div', { class: 'form-actions' }, el('p', { class: 'help' }, 'Saved when you submit. Unsaved drafts stay on this page only.'), el('button', { type: 'submit', class: 'btn btn-primary' }, answered + 1 >= session.maxQuestions ? 'Save final answer  →' : 'Submit answer  →')));
    form.addEventListener('submit', event => { event.preventDefault(); const text = answer.value.trim(); if (!text) { answer.setCustomValidity('Write an answer before continuing.'); answer.reportValidity(); answer.setCustomValidity(''); return; } submitAnswer(form, text, session.turns.length); });
  } else if (answered < session.maxQuestions) {
    form.append(el('h3', {}, 'Your answer is saved.'), el('p', { class: 'help' }, 'The next question is not ready yet. Continue to retry, or finish with the answers already saved.'), btn('Continue to next question  →', () => submitAnswer(form, latest?.answer || '', session.turns.length), 'primary'));
  } else {
    form.append(el('h3', {}, 'You’ve reached the end of this conversation.'), el('p', {}, 'Finish your interview to review your answers and collect your feedback.'), btn('Finish and review  →', () => finishSession(form), 'purple'));
  }
  conversation.append(form);
  const side = el('aside', { class: 'panel session-sidebar' }, el('h3', {}, 'Your session'), el('div', { class: 'session-meta' }, meta('Round', label('rounds', session.round)), meta('Role', label('roles', session.role)), meta('Interviewer', label('personas', session.persona)), meta('Level', label('difficulties', session.difficulty)), meta('Planned length', `${session.durationMinutes} minutes`)), el('div', { class: 'progress-label' }, el('span', {}, 'Answers saved'), el('strong', {}, `${answered} / ${session.maxQuestions}`)), el('progress', { value: answered, max: session.maxQuestions, 'aria-label': `${answered} of ${session.maxQuestions} answers saved` }), el('p', { class: 'help' }, 'You can leave and resume from My sessions. Submit your current answer first to save it.'), btn('Finish interview', () => finishSession(side), 'secondary', { class: 'btn btn-secondary full-width', disabled: answered === 0 }));
  return el('div', {}, pageHeading('One question at a time', label('rounds', session.round), 'Think through your answer. There’s space to learn here.', btn('Back to practice room', () => navigate('dashboard'), 'secondary')), modeNotice(session.mode), el('div', { class: 'session-layout' }, conversation, side));
}
function meta(name, value) { return el('div', { class: 'meta-row' }, el('span', {}, name), el('strong', {}, value)); }
async function submitAnswer(form, answer, expectedTurnCount) {
  await withBusy(form, async () => {
    try {
      state.session = (await api(`/api/sessions/${encodeURIComponent(state.session.id)}/answers`, 'POST', { answer, expectedTurnCount })).session;
      if (state.session.status === 'completed') state.view = 'report';
      state.error = '';
      render(); document.querySelector('#answer')?.focus();
    } catch (error) {
      // A lost response can follow a successful save. Reconcile from the server
      // before offering retry, but preserve the draft if it never reached storage.
      try {
        const saved = (await api(`/api/sessions/${encodeURIComponent(state.session.id)}`)).session;
        if (saved.turns[expectedTurnCount - 1]?.answer === answer) {
          state.session = saved;
          state.view = saved.status === 'completed' ? 'report' : 'session';
          state.error = saved.status === 'completed' || saved.turns.length > expectedTurnCount ? '' : error.message;
          render();
          return;
        }
      } catch { /* Leave the original draft intact if recovery is unavailable. */ }
      throw error;
    }
  });
}
async function finishSession(container) {
  if (state.busy) return;
  const draft = document.querySelector('#answer');
  if (draft?.value.trim()) { inlineError(container, new Error('Submit your current answer before finishing, or clear it if you do not want to include it.')); return; }
  await withBusy(container, async () => { state.session = (await api(`/api/sessions/${encodeURIComponent(state.session.id)}/finish`, 'POST', {})).session; state.view = 'report'; state.error = ''; render(); window.scrollTo(0, 0); });
}
function reportScreen() {
  const session = state.session, report = session?.report;
  if (!report) return empty('No report yet.', 'Finish a conversation to collect your feedback.', () => navigate('dashboard'));
  return el('div', {}, pageHeading('Pause. Reflect. Grow.', 'Every answer is a starting point.', `${label('rounds', session.round)} · ${label('personas', session.persona)} interviewer · ${formatDate(session.createdAt)}`, btn('Practise again  →', () => navigate('setup', session.round), 'primary')),
    modeNotice(session.mode), el('section', { class: 'panel report-summary' }, el('p', { class: 'eyebrow' }, report.mode === 'practice' ? 'Your practice reflection' : 'Your interview feedback'), el('h2', {}, 'Here’s what to take forward.'), el('p', {}, report.summary)),
    el('div', { class: 'report-grid' }, el('section', {}, el('div', { class: 'section-head' }, el('h2', {}, 'A closer look at your answers')), el('div', { class: 'criteria-list' }, (report.criteria || []).map(criterion => el('article', { class: 'panel criterion' }, el('div', { class: 'criterion-head' }, el('h3', {}, criterion.name), el('span', { class: 'score' }, criterion.score == null ? 'Reflection only' : `${criterion.score} / ${criterion.outOf || 5}`)), el('p', {}, el('span', { class: 'criterion-label' }, 'From your conversation'), criterion.evidence || 'No evidence supplied.'), el('p', {}, el('span', { class: 'criterion-label' }, 'Try this next'), criterion.improvement))))), el('aside', { class: 'report-side' }, listPanel('What to build on', report.strengths), listPanel('Room to grow', report.improvements), listPanel('Your next small steps', report.nextSteps))), el('p', { class: 'footnote' }, report.disclaimer || 'Use this feedback as a learning aid, not a hiring prediction.'), btn('View all sessions', () => navigate('history'), 'secondary'));
}
function listPanel(title, values) { return el('section', { class: 'panel' }, el('h3', {}, title), values?.length ? el('ul', {}, values.map(value => el('li', {}, value))) : el('p', { class: 'help' }, 'Keep practising to explore this area.')); }
function empty(title, text, action) { return el('div', { class: 'panel empty-state' }, icon('projects'), el('h2', {}, title), el('p', {}, text), btn('Explore interview rounds  →', action, 'primary')); }
function historyScreen() {
  const filtered = state.sessions.filter(session => state.filter === 'all' || session.status === state.filter);
  const cards = filtered.map(session => {
    const actions = el('div', { class: 'history-actions' },
      badge(session.status === 'completed' ? 'Completed' : 'In progress', session.status === 'completed' ? 'green' : 'neutral'),
      btn(session.status === 'completed' ? 'View reflection' : 'Resume', () => openSession(session.id), 'secondary', { class: 'btn btn-secondary btn-small' }),
      btn('Delete', () => { if (state.busy) return; state.deleteId = session.id; render(); }, 'ghost', { class: 'btn btn-ghost btn-small', 'aria-label': `Delete ${label('rounds', session.round)} session from ${formatDate(session.createdAt)}` })
    );
    return el('article', { class: 'panel history-item' }, icon(session.round),
      el('div', {}, el('h3', {}, label('rounds', session.round)), el('p', {}, `${label('personas', session.persona)} · ${label('difficulties', session.difficulty)} · ${formatDate(session.createdAt)}`)), actions);
  });
  const filters = [['all', 'All sessions'], ['active', 'In progress'], ['completed', 'Completed']].map(([id, title]) =>
    el('button', { type: 'button', class: state.filter === id ? 'active' : '', 'aria-pressed': state.filter === id ? 'true' : 'false', onclick: () => { if (state.busy) return; state.filter = id; render(); } }, title));
  return el('div', {},
    pageHeading('Your progress, one conversation at a time', 'Look how far you’re going.', 'Resume a conversation or revisit the reflections from a completed session.', btn('New session  +', () => navigate('setup'), 'primary')),
    el('div', { class: 'filter-tabs', 'aria-label': 'Filter sessions' }, filters),
    state.deleteId && el('div', { class: 'danger-confirm', role: 'alert' },
      el('span', {}, 'Delete this session and its answers permanently?'),
      btn('Keep session', () => { if (state.busy) return; state.deleteId = null; render(); }, 'secondary'),
      btn('Delete permanently', event => deleteSession(event.currentTarget.closest('.danger-confirm')), 'danger')),
    cards.length ? el('div', { class: 'history-list' }, cards) : empty('Your next chapter is unwritten.', state.filter === 'all' ? 'Start your first practice conversation. Your saved sessions and reflections will live here.' : 'No sessions match this filter yet. Explore another round or check all sessions.', () => navigate('dashboard'))
  );
}
async function deleteSession(container) { await withBusy(container, async () => { const id = state.deleteId; await api(`/api/sessions/${encodeURIComponent(id)}`, 'DELETE'); state.deleteId = null; if (state.session?.id === id) { state.session = null; remember(null); } await refreshSessions(); render(); say('Session deleted.'); }); }
async function boot() {
  try {
    const [health, catalog, me] = await Promise.all([api('/api/health'), api('/api/catalog'), api('/api/me')]);
    state.mode = health.mode; state.catalog = catalog; state.user = me.user;
    if (state.user) {
      await refreshSessions();
      const id = remembered();
      if (id && state.sessions.some(session => session.id === id && session.status === 'active')) { state.session = (await api(`/api/sessions/${encodeURIComponent(id)}`)).session; state.view = 'session'; }
    }
    render();
  } catch (error) { root.replaceChildren(el('main', { id: 'main', class: 'initial-loading' }, brand(), el('h1', {}, 'Let’s reconnect.'), el('p', {}, 'Your practice space could not be loaded. Check the connection and try again.'), errorBox(error.message), btn('Try again', boot, 'primary'))); }
}
boot();
