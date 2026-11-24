import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { collectionGroup, query, where, getDocs }
  from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { syncClock, serverNow } from "./clock.js";
import { logout } from "./auth.js";

const $ = (id) => document.getElementById(id);
const VIEWS = ["loading", "waiting", "open", "closed", "error"];

function show(name) {
  VIEWS.forEach((v) => ($("view-" + v).hidden = v !== name));
}

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function showError(msg) {
  $("error-text").textContent = msg;
  show("error");
}

async function findMyCandidateDoc(uid) {
  const q = query(
    collectionGroup(db, "scheduled_exam_candidates"),
    where("firebase_uid", "==", uid)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docs = snap.docs.map((d) => ({ ref: d.ref, ...d.data() }));
  docs.sort((a, b) => a.start_time.toMillis() - b.start_time.toMillis());
  // Prefer one that hasn't finished yet, otherwise the most recent
  return docs.find((d) => d.end_time.toMillis() > serverNow()) || docs[docs.length - 1];
}

function runStateMachine(cand) {
  const start = cand.start_time.toMillis();
  const end = cand.end_time.toMillis();

  function tick() {
    const now = serverNow();
    if (now < start) {
      show("waiting");
      $("waiting-clock").textContent = fmt(start - now);
    } else if (now < end) {
      show("open");
      $("open-clock").textContent = fmt(end - now);
    } else {
      show("closed");
      clearInterval(timer);
    }
  }
  const timer = setInterval(tick, 500);
  tick();
}

$("logout-btn").addEventListener("click", async () => {
  await logout();
  window.location.href = "index.html";
});

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "index.html"; return; }
  try {
    await syncClock(user.uid);
    const cand = await findMyCandidateDoc(user.uid);
    if (!cand) { showError("No quiz is assigned to this account."); return; }
    console.log("Candidate doc:", cand);
    runStateMachine(cand);
  } catch (e) {
    console.error(e);
    console.error("Load failed:", e.stack);
    console.log("error is here")
    showError("Could not load your quiz. Please refresh, or contact the organiser.");
  }
});