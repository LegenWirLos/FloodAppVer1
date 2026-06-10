import { useCallback, useState } from "react";
import MapView from "./components/MapView";
import RiskPanel from "./components/RiskPanel";
import { assessPoint, assessPolygon } from "./lib/floodRisk";
import "./App.css";

export default function App() {
  const [mode, setMode] = useState("pin"); // "pin" | "draw" | "view"
  const [selection, setSelection] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState(null);

  const runAssessment = useCallback(async (sel) => {
    setStatus("loading");
    setError(null);
    setResult(null);
    setHistory(null);
    try {
      const r =
        sel.type === "pin" ? await assessPoint(sel.point) : await assessPolygon(sel.latlngs);
      setResult(r);
      setHistory(r.history);
      setStatus("done");
    } catch (e) {
      console.error(e);
      setError("Couldn't load terrain data. Check your connection and try again.");
      setStatus("error");
    }
  }, []);

  const handlePick = useCallback(
    (point) => {
      const sel = { type: "pin", point };
      setSelection(sel);
      runAssessment(sel);
    },
    [runAssessment]
  );

  const handlePolygon = useCallback(
    (latlngs) => {
      const sel = { type: "polygon", latlngs };
      setSelection(sel);
      setMode("view"); // stop drawing / stop pin-clicks once a shape is finished
      runAssessment(sel);
    },
    [runAssessment]
  );

  const clearAll = useCallback(() => {
    setSelection(null);
    setResult(null);
    setHistory(null);
    setStatus("idle");
    setError(null);
  }, []);

  return (
    <div className="app">
      <MapView
        mode={mode}
        selection={selection}
        band={result?.band}
        onPick={handlePick}
        onPolygon={handlePolygon}
      />

      <aside className="panel">
        <header className="panel__head">
          <h1>Will my land flood?</h1>
          <p className="panel__sub">Find your land and see an estimated flood risk.</p>
        </header>

        <div className="tools">
          <button
            className={mode === "pin" ? "tool tool--on" : "tool"}
            onClick={() => setMode("pin")}
          >
            📍 Drop a pin
          </button>
          <button
            className={mode === "draw" ? "tool tool--on" : "tool"}
            onClick={() => {
              clearAll();
              setMode("draw");
            }}
          >
            ✏️ Draw boundary
          </button>
          {selection && (
            <button
              className="tool"
              onClick={() => {
                clearAll();
                setMode("pin");
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {mode === "draw" && status === "idle" && (
          <p className="hint hint--draw">
            Click to drop each corner of your land, then click the first corner again (or
            double-click) to finish.
          </p>
        )}

        <RiskPanel status={status} error={error} result={result} history={history} />
      </aside>
    </div>
  );
}
