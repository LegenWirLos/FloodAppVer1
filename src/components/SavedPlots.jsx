import { useState } from "react";

const BAND_COLOR = {
  low: "#16a34a",
  medium: "#f59e0b",
  high: "#dc2626",
  water: "#2563eb",
  unknown: "#6b7280",
};

function badge(plot) {
  if (plot.band === "high" || plot.band === "medium" || plot.band === "low") {
    return `${plot.score} · ${plot.band}`;
  }
  return plot.band || "—";
}

function PlotRow({ plot, onOpen, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(plot.label);
  const [notes, setNotes] = useState(plot.notes || "");
  const color = BAND_COLOR[plot.band] ?? BAND_COLOR.unknown;

  if (editing) {
    return (
      <li className="plot">
        <input value={label} onChange={(e) => setLabel(e.target.value)} />
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="plot__actions">
          <button
            className="tool tool--on"
            onClick={async () => {
              await onRename(plot.id, label.trim() || plot.label, notes.trim());
              setEditing(false);
            }}
          >
            Save
          </button>
          <button className="tool" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="plot">
      <button className="plot__main" onClick={() => onOpen(plot)} title="Open on map">
        <span className="plot__dot" style={{ background: color }} />
        <span className="plot__text">
          <span className="plot__label">{plot.label}</span>
          {plot.notes && <span className="plot__notes">{plot.notes}</span>}
          <span className="plot__meta">
            {badge(plot)}
            {plot.province ? ` · ${plot.province}` : ""}
          </span>
        </span>
      </button>
      <div className="plot__actions">
        <button className="tool" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button className="tool" onClick={() => onDelete(plot.id)}>
          Delete
        </button>
      </div>
    </li>
  );
}

export default function SavedPlots({ plots, onOpen, onDelete, onRename }) {
  if (!plots?.length) {
    return <p className="hint">No saved plots yet — check a spot, then save it above.</p>;
  }
  return (
    <ul className="plots">
      {plots.map((p) => (
        <PlotRow key={p.id} plot={p} onOpen={onOpen} onDelete={onDelete} onRename={onRename} />
      ))}
    </ul>
  );
}
