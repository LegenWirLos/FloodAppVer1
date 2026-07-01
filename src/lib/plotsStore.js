// Firestore CRUD for a user's saved plots, under users/{uid}/plots/{plotId}.
// Security is enforced by firestore.rules (only the owner can read/write).
import { db } from "./firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const plotsCol = (uid) => collection(db, "users", uid, "plots");

/** Live-subscribe to a user's plots (newest first). Returns an unsubscribe fn. */
export function subscribePlots(uid, cb) {
  const q = query(plotsCol(uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export function savePlot(uid, plot) {
  return addDoc(plotsCol(uid), { ...plot, createdAt: serverTimestamp() });
}

export function updatePlot(uid, id, fields) {
  return updateDoc(doc(db, "users", uid, "plots", id), fields);
}

export function deletePlot(uid, id) {
  return deleteDoc(doc(db, "users", uid, "plots", id));
}
