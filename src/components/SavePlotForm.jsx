import { useState } from "react";

// Form to save the currently-assessed spot with a label + optional notes.
export default function SavePlotForm({ onSave }) {
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    if (!label.trim()) return;
    setBusy(true);
    setDone(false);
    setErr(null);
    try {
      await onSave(label.trim(), notes.trim());
      setLabel("");
      setNotes("");
      setDone(true);
    } catch (e) {
      setErr(e?.message || "Couldn't save — check your connection.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="saveform">
      <input
        placeholder="Label (e.g. my farm)"
        value={label}
        onChange={(e) => {
          setLabel(e.target.value);
          setDone(false);
        }}
      />
      <textarea
        placeholder="Notes (optional)"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="saveform__row">
        <button className="tool tool--on" disabled={busy || !label.trim()} onClick={submit}>
          {busy ? "Saving…" : "Save this plot"}
        </button>
        {done && <span className="saveform__ok">Saved ✓</span>}
        {err && <span className="authbar__err">{err}</span>}
      </div>
    </div>
  );
}
