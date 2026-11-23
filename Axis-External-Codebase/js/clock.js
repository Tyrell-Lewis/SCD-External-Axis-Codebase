import { db } from "./firebase.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

let offsetMs = 0; // server time minus local time

export async function syncClock(uid) {
  const ref = doc(db, "clockSync", uid);
  const t0 = Date.now();
  await setDoc(ref, { t: serverTimestamp() });
  const snap = await getDoc(ref);
  const t1 = Date.now();
  offsetMs = snap.data().t.toMillis() - (t0 + t1) / 2;
  return offsetMs;
}

export function serverNow() {
  return Date.now() + offsetMs;
}