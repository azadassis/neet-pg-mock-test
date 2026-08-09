const TEST_LENGTH = 200;
const SECTION_COUNT = 5;
const SECTION_SIZE = TEST_LENGTH / SECTION_COUNT; // 40
const TOTAL_TIME = 3.5 * 60 * 60; // seconds

let QUESTIONS = [];   // the 200 selected for THIS session
let SECTIONS = [];
let POOL_SIZE = 0;

let state = {
  screen: 'loading', // loading | intro | test | results | error
  current: 0,
  answers: [],
  timeLeft: TOTAL_TIME,
  timerId: null,
  reviewFilter: 'all',
};

// ---------- Fetch pool + build a fresh random session ----------
async function loadPoolAndBuildSession() {
  try {
    // Cache-busting: unique query string every load + no-store so a fresh
    // deploy is never served from a stale cached copy.
    const res = await fetch(`questions.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const pool = await res.json();
    if (!Array.isArray(pool) || pool.length < TEST_LENGTH) {
      throw new Error('Question pool is missing or smaller than the test length.');
    }
    POOL_SIZE = pool.length;
    QUESTIONS = sampleRandom(pool, TEST_LENGTH);
    SECTIONS = Array.from({ length: SECTION_COUNT }, (_, i) => ({
      name: `Section ${String.fromCharCode(65 + i)}`,
      range: [i * SECTION_SIZE, (i + 1) * SECTION_SIZE],
    }));
    state.answers = new Array(QUESTIONS.length).fill(null);
    state.screen = 'intro';
  } catch (err) {
    console.error('Failed to load question pool:', err);
    state.screen = 'error';
    state.errorMsg = err.message || 'Unknown error';
  }
  render();
}

// Fisher-Yates shuffle, then take first n
function sampleRandom(arr, n) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function secToClock(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return [h, m, sec].map(x => String(x).padStart(2, '0')).join(':');
}

function sectionOf(idx) {
  return SECTIONS.findIndex(s => idx >= s.range[0] && idx < s.range[1]);
}

function render() {
  const app = document.getElementById('app');
  if (state.screen === 'loading') { app.innerHTML = renderLoading(); return; }
  if (state.screen === 'error') { app.innerHTML = renderError(); attachError(); return; }
  if (state.screen === 'intro') { app.innerHTML = renderIntro(); attachIntro(); return; }
  if (state.screen === 'test') { app.innerHTML = renderTest(); attachTest(); return; }
  if (state.screen === 'results') { app.innerHTML = renderResults(); attachResults(); return; }
}

function renderLoading() {
  return `
    <header class="top">
      <h1>NEET PG Mock Test</h1>
      <span class="tag">Loading</span>
    </header>
    <div class="intro"><p class="loading">Loading questions…</p></div>
  `;
}

function renderError() {
  return `
    <header class="top">
      <h1>NEET PG Mock Test</h1>
      <span class="tag">Error</span>
    </header>
    <div class="intro">
      <p class="errbox">Could not load the question bank (${state.errorMsg}). Please check that questions.json is present and reachable.</p>
      <button class="startbtn" id="retryBtn">Retry</button>
    </div>
  `;
}
function attachError() {
  document.getElementById('retryBtn').onclick = () => {
    state.screen = 'loading';
    render();
    loadPoolAndBuildSession();
  };
}

function renderIntro() {
  return `
    <header class="top">
      <h1>NEET PG Mock Test</h1>
      <span class="tag">Full Length &middot; Practice</span>
    </header>
    <div class="intro">
      <h2>Before you start</h2>
      <ul>
        <li><strong>${TEST_LENGTH} questions</strong> across ${SECTION_COUNT} sections (A&ndash;E), ${SECTION_SIZE} each &mdash; same as the real exam.</li>
        <li><strong>3 hours 30 minutes</strong> total. The timer runs continuously once you start.</li>
        <li>Marking: <strong>+4</strong> for correct, <strong>&minus;1</strong> for wrong, <strong>0</strong> for unattempted.</li>
        <li>You can move freely between sections and questions, and change answers any time before submitting.</li>
        <li>This is an original practice paper written at full NEET PG clinical-vignette difficulty &mdash; not a reproduction of any real exam.</li>
      </ul>
      <button class="startbtn" id="startBtn">Start Test</button>
    </div>
  `;
}
function attachIntro() {
  document.getElementById('startBtn').onclick = () => {
    state.screen = 'test';
    startTimer();
    render();
  };
}

function startTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      clearInterval(state.timerId);
      submitTest();
      return;
    }
    const t = document.getElementById('timerDisplay');
    if (t) {
      t.textContent = secToClock(state.timeLeft);
      t.parentElement.classList.toggle('warn', state.timeLeft < 300);
    }
  }, 1000);
}

function renderTest() {
  const idx = state.current;
  const q = QUESTIONS[idx];
  const secIdx = sectionOf(idx);
  const answeredCount = state.answers.filter(a => a !== null).length;
  const progressPct = Math.round((answeredCount / QUESTIONS.length) * 100);

  let sectionNavHtml = SECTIONS.map((s, i) => `
    <button data-sec="${i}" class="${i === secIdx ? 'active' : ''}">${s.name}</button>
  `).join('');

  const sec = SECTIONS[secIdx];
  let gridHtml = '';
  for (let i = sec.range[0]; i < sec.range[1]; i++) {
    const cls = [
      state.answers[i] !== null ? 'answered' : '',
      i === idx ? 'current' : ''
    ].filter(Boolean).join(' ');
    gridHtml += `<button data-q="${i}" class="${cls}">${i + 1}</button>`;
  }

  let optsHtml = q.opts.map((opt, oi) => {
    const sel = state.answers[idx] === oi;
    return `
      <label class="opt ${sel ? 'selected' : ''}">
        <input type="radio" name="opt" ${sel ? 'checked' : ''} data-oi="${oi}">
        <span><span class="lab">${String.fromCharCode(65 + oi)}.</span>${opt}</span>
      </label>
    `;
  }).join('');

  return `
    <header class="top">
      <h1>NEET PG Mock Test</h1>
      <span class="tag">Question ${idx + 1} of ${QUESTIONS.length}</span>
    </header>
    <div class="bar">
      <span>${answeredCount} of ${QUESTIONS.length} answered</span>
      <span class="timer"><span id="timerDisplay">${secToClock(state.timeLeft)}</span></span>
    </div>
    <div class="progress-track"><div class="progress-fill" style="width:${progressPct}%"></div></div>
    <div class="section-nav">${sectionNavHtml}</div>
    <div class="qgrid">${gridHtml}</div>

    <div class="card">
      <div class="qnum">${sec.name} &middot; Question ${idx + 1}</div>
      <div class="qtext">${q.q}</div>
      ${q.img ? `<img class="qimg" src="${q.img}" alt="Question image" loading="lazy">` : ''}
      ${optsHtml}
      ${state.answers[idx] !== null ? '<button class="clearbtn" id="clearBtn">Clear response</button>' : ''}
    </div>

    <div class="navbtns">
      <button id="prevBtn" ${idx === 0 ? 'disabled' : ''}>&larr; Previous</button>
      <button id="nextBtn" class="primary" ${idx === QUESTIONS.length - 1 ? 'disabled' : ''}>Next &rarr;</button>
    </div>

    <div class="submit-row">
      <button class="submitbtn" id="submitBtn">Submit Test</button>
    </div>
  `;
}

function attachTest() {
  document.querySelectorAll('.section-nav button').forEach(btn => {
    btn.onclick = () => {
      const si = parseInt(btn.dataset.sec);
      state.current = SECTIONS[si].range[0];
      render();
    };
  });
  document.querySelectorAll('.qgrid button').forEach(btn => {
    btn.onclick = () => {
      state.current = parseInt(btn.dataset.q);
      render();
    };
  });
  document.querySelectorAll('.opt input').forEach(inp => {
    inp.onchange = () => {
      state.answers[state.current] = parseInt(inp.dataset.oi);
      render();
    };
  });
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) clearBtn.onclick = () => { state.answers[state.current] = null; render(); };

  document.getElementById('prevBtn').onclick = () => { if (state.current > 0) { state.current--; render(); } };
  document.getElementById('nextBtn').onclick = () => { if (state.current < QUESTIONS.length - 1) { state.current++; render(); } };
  document.getElementById('submitBtn').onclick = () => {
    if (confirm('Submit the test? You cannot change answers after this.')) {
      submitTest();
    }
  };
}

function submitTest() {
  if (state.timerId) clearInterval(state.timerId);
  state.screen = 'results';
  render();
}

function computeScore() {
  let correct = 0, wrong = 0, skipped = 0, marks = 0;
  const secStats = SECTIONS.map(s => ({ name: s.name, correct: 0, wrong: 0, skipped: 0, marks: 0 }));
  QUESTIONS.forEach((q, i) => {
    const si = sectionOf(i);
    const a = state.answers[i];
    if (a === null) { skipped++; secStats[si].skipped++; }
    else if (a === q.ans) { correct++; marks += 4; secStats[si].correct++; secStats[si].marks += 4; }
    else { wrong++; marks -= 1; secStats[si].wrong++; secStats[si].marks -= 1; }
  });
  return { correct, wrong, skipped, marks, maxMarks: QUESTIONS.length * 4, secStats };
}

function renderResults() {
  const r = computeScore();
  const timeTaken = TOTAL_TIME - state.timeLeft;

  let secRows = r.secStats.map(s => `
    <tr>
      <td style="text-align:left">${s.name}</td>
      <td>${s.correct}</td>
      <td>${s.wrong}</td>
      <td>${s.skipped}</td>
      <td>${s.marks}</td>
    </tr>
  `).join('');

  let reviewHtml = QUESTIONS.map((q, i) => {
    const a = state.answers[i];
    const status = a === null ? 'skip' : (a === q.ans ? 'correct' : 'wrong');
    if (state.reviewFilter !== 'all' && state.reviewFilter !== status) return '';
    const yourAnsText = a === null ? 'Not attempted' : `${String.fromCharCode(65 + a)}. ${q.opts[a]}`;
    const correctText = `${String.fromCharCode(65 + q.ans)}. ${q.opts[q.ans]}`;
    return `
      <div class="review-item ${status}">
        <div class="qnum">Q${i + 1} &middot; ${SECTIONS[sectionOf(i)].name}</div>
        <div class="qtext">${q.q}</div>
        ${q.img ? `<img class="qimg" src="${q.img}" alt="Question image" loading="lazy">` : ''}
        ${status !== 'correct' ? `<div class="rowline your">Your answer: ${yourAnsText}</div>` : ''}
        <div class="rowline correctans">Correct answer: ${correctText}</div>
      </div>
    `;
  }).join('');

  return `
    <header class="top">
      <h1>NEET PG Mock Test</h1>
      <span class="tag">Results</span>
    </header>
    <div class="results">
      <h2>Test Complete</h2>
      <div class="sub">Time taken: ${secToClock(timeTaken)} of 03:30:00</div>

      <div class="score-hero">
        <div class="num">${r.marks}</div>
        <div class="den">out of ${r.maxMarks} marks</div>
      </div>

      <div class="stat-row">
        <div class="stat correct"><div class="n">${r.correct}</div><div class="l">Correct</div></div>
        <div class="stat wrong"><div class="n">${r.wrong}</div><div class="l">Wrong</div></div>
        <div class="stat skip"><div class="n">${r.skipped}</div><div class="l">Skipped</div></div>
        <div class="stat"><div class="n">${r.correct + r.wrong > 0 ? ((r.correct / (r.correct + r.wrong)) * 100).toFixed(1) + '%' : '\u2014'}</div><div class="l">Accuracy of attempted</div></div>
      </div>

      <table class="secbreak">
        <tr><th style="text-align:left">Section</th><th>Correct</th><th>Wrong</th><th>Skipped</th><th>Marks</th></tr>
        ${secRows}
      </table>

      <div class="filter-row">
        <button data-f="all" class="${state.reviewFilter === 'all' ? 'active' : ''}">All</button>
        <button data-f="wrong" class="${state.reviewFilter === 'wrong' ? 'active' : ''}">Wrong</button>
        <button data-f="skip" class="${state.reviewFilter === 'skip' ? 'active' : ''}">Skipped</button>
        <button data-f="correct" class="${state.reviewFilter === 'correct' ? 'active' : ''}">Correct</button>
      </div>

      <div id="reviewList">${reviewHtml}</div>

      <div class="restart-row">
        <button id="restartBtn">Retake Test (new random paper)</button>
      </div>
    </div>
  `;
}

function attachResults() {
  document.querySelectorAll('.filter-row button').forEach(btn => {
    btn.onclick = () => { state.reviewFilter = btn.dataset.f; render(); };
  });
  document.getElementById('restartBtn').onclick = () => {
    // Clear cache + fetch a fresh random 200 from the pool again.
    state = {
      screen: 'loading', current: 0,
      answers: [], timeLeft: TOTAL_TIME, timerId: null, reviewFilter: 'all',
    };
    render();
    loadPoolAndBuildSession();
  };
}

// Boot
render();
loadPoolAndBuildSession();
