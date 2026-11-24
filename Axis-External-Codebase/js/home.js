import { auth, db } from "./firebase.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { collectionGroup, query, where, getDocs, getDoc }
  from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { syncClock, serverNow } from "./clock.js";
import { logout } from "./auth.js";

const $ = (id) => document.getElementById(id);
let items = [];          // every assessment for this user
let lastSignature = "";  // used to detect when a card should move sections

// ---------- loading ----------
async function loadAssessments(uid) {
  const q = query(
    collectionGroup(db, "scheduled_exam_candidates"),
    where("firebase_uid", "==", uid)
  );
  const snap = await getDocs(q);
  const loaded = await Promise.all(snap.docs.map(async (d) => {
    const examRef = d.ref.parent.parent;      // scheduled_exams/{examId}
    const examSnap = await getDoc(examRef);
    if (!examSnap.exists()) return null;
    return { candId: d.id, cand: d.data(), exam: examSnap.data() };
  }));
  return loaded.filter(Boolean);
}

// ---------- helpers ----------
function bucketOf(item, now) {
  const start = item.cand.start_time.toMillis();
  const end = item.cand.end_time.toMillis();
  if (item.cand.is_submitted || now >= end) return "history";
  if (now < start) return "upcoming";
  return "active";
}

function fmtDate(ts) {
  const d = ts.toDate();
  return d.toLocaleDateString("en-TT", { day: "2-digit", month: "short" }) +
    " · " +
    d.toLocaleTimeString("en-TT", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtRemaining(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m ${String(s % 60).padStart(2, "0")}s`;
}

// Small helper: make an element with text (never innerHTML)
function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function chips(exam) {
  const wrap = el("div", "chips");
  if (exam.mcq_present) wrap.append(el("span", "chip", "MCQ"));
  if (exam.multiple_select_present) wrap.append(el("span", "chip", "Multiple select"));
  if (exam.short_answer_present) wrap.append(el("span", "chip", "Short answer"));
  if (exam.num_questions) wrap.append(el("span", "chip", `${exam.num_questions} questions`));
  return wrap;
}

// ---------- card builders ----------
function activeCard(item) {
  const { cand, exam, candId } = item;
  const card = el("div", "card");
  card.append(el("h3", "", exam.scheduled_exam_name));

  const remaining = el("p", "detail");
  remaining.append("⏱ ");
  const countdown = el("span", "countdown");
  countdown.dataset.end = cand.end_time.toMillis();
  remaining.append(countdown, " remaining");
  card.append(remaining);

  card.append(el("p", "detail", `Duration: ${exam.duration_minutes} minutes`));
  card.append(el("p", "detail", `Opened at ${fmtDate(cand.start_time)}`));
  card.append(el("p", "detail", `Closes ${fmtDate(cand.end_time)}`));
  card.append(chips(exam));

  const link = el("a", "btn", cand.did_start ? "Resume" : "Start");
  link.href = `quiz.html?exam=${encodeURIComponent(candId)}`;
  card.append(link);
  return card;
}

function upcomingCard(item) {
  const { cand, exam } = item;
  const card = el("div", "card");
  card.append(el("h3", "", exam.scheduled_exam_name));
  card.append(el("p", "detail", `Time limit: ${exam.duration_minutes} minutes`));
  card.append(el("p", "detail", `Opens at ${fmtDate(cand.start_time)}`));
  card.append(chips(exam));
  return card;
}

function historyRow(item) {
  const tr = document.createElement("tr");
  tr.append(el("td", "", item.exam.scheduled_exam_name));
  tr.append(el("td", "", fmtDate(item.cand.end_time)));
  return tr;
}

// ---------- rendering ----------
function render() {
  const now = serverNow();
  const groups = { active: [], upcoming: [], history: [] };
  items.forEach((it) => groups[bucketOf(it, now)].push(it));

  groups.active.sort((a, b) => a.cand.end_time.toMillis() - b.cand.end_time.toMillis());
  groups.upcoming.sort((a, b) => a.cand.start_time.toMillis() - b.cand.start_time.toMillis());
  groups.history.sort((a, b) => b.cand.end_time.toMillis() - a.cand.end_time.toMillis());

  const activeList = $("active-list");
  activeList.replaceChildren(...groups.active.map(activeCard));
  if (!groups.active.length) activeList.append(el("p", "empty", "There are no active assessments right now."));

  const upcomingList = $("upcoming-list");
  upcomingList.replaceChildren(...groups.upcoming.map(upcomingCard));
  if (!groups.upcoming.length) upcomingList.append(el("p", "empty", "There are no upcoming assessments scheduled."));

  $("history-body").replaceChildren(...groups.history.map(historyRow));
  $("history-empty").hidden = groups.history.length > 0;

  for (const name of ["active", "upcoming"]) {
    const badge = $(name + "-count");
    badge.hidden = groups[name].length === 0;
    badge.textContent = groups[name].length;
  }

  lastSignature = items.map((it) => it.candId + bucketOf(it, now)).join("|");
}

// Runs every second: update countdowns, and re-render if a card changed section
function tick() {
  const now = serverNow();
  const signature = items.map((it) => it.candId + bucketOf(it, now)).join("|");
  if (signature !== lastSignature) { render(); return; }
  document.querySelectorAll(".countdown").forEach((c) => {
    c.textContent = fmtRemaining(Number(c.dataset.end) - now);
  });
}

// ---------- start ----------
$("logout-btn").addEventListener("click", async () => {
  await logout();
  window.location.href = "index.html";
});

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "index.html"; return; }
  try {
    await syncClock(user.uid);
    items = await loadAssessments(user.uid);
    $("status").hidden = true;
    if (items.length) $("welcome").textContent = `Welcome back, ${items[0].cand.firstname}`;
    render();
    tick();
    setInterval(tick, 1000);
  } catch (e) {
    console.error(e);
    $("status").textContent = "Could not load your assessments. Please refresh, or contact the organiser.";
  }
});