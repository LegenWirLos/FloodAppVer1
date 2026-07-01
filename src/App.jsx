import { useCallback, useEffect, useState } from "react";
import MapView from "./components/MapView";
import RiskPanel from "./components/RiskPanel";
import AuthBar from "./components/AuthBar";
import SavePlotForm from "./components/SavePlotForm";
import SavedPlots from "./components/SavedPlots";
import { useAuth } from "./hooks/useAuth";
import { assessPoint, assessPolygon } from "./lib/floodRisk";
import { savePlot, subscribePlots, updatePlot, deletePlot } from "./lib/plotsStore";
import { centroid } from "./lib/geo";
import "./App.css";

export default function App() {
  const auth = useAuth();
  const [mode, setMode] = useState("pin"); // "pin" | "draw" | "view"
  const [selection, setSelection] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState(null);
  const [savedPlots, setSavedPlots] = useState([]);
  const [flyTo, setFlyTo] = useState(null);

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

  // Live-subscribe to the signed-in user's saved plots.
  useEffect(() => {
    if (!auth.user) {
      setSavedPlots([]);
      return;
    }
    return subscribePlots(auth.user.uid, setSavedPlots);
  }, [auth.user]);

  const savePlotNow = useCallback(
    async (label, notes) => {
      if (!auth.user || !selection || result?.score == null) return;
      const geometry =
        selection.type === "pin" ? { point: selection.point } : { latlngs: selection.latlngs };
      await savePlot(auth.user.uid, {
        label,
        notes,
        type: selection.type,
        geometry,
        score: result.score,
        band: result.band ?? "unknown",
        province: result.province ?? null,
      });
    },
    [auth.user, selection, result]
  );

  const openPlot = useCallback(
    (plot) => {
      const sel =
        plot.type === "pin"
          ? { type: "pin", point: plot.geometry.point }
          : { type: "polygon", latlngs: plot.geometry.latlngs };
      setSelection(sel);
      setMode(plot.type === "polygon" ? "view" : "pin");
      const center = sel.type === "pin" ? sel.point : centroid(sel.latlngs);
      setFlyTo({ ...center }); // fresh object so the map re-centres each time
      runAssessment(sel);
    },
    [runAssessment]
  );

  return (
    <div className="app">
      <MapView
        mode={mode}
        selection={selection}
        band={result?.band}
        flyTo={flyTo}
        onPick={handlePick}
        onPolygon={handlePolygon}
      />

      <aside className="panel">
        <AuthBar auth={auth} />
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

        {auth.user && result?.score != null && (
          <>
            <h3 className="panel__section">Save this plot</h3>
            <SavePlotForm onSave={savePlotNow} />
          </>
        )}

        {auth.user && (
          <>
            <h3 className="panel__section">My plots</h3>
            <SavedPlots
              plots={savedPlots}
              onOpen={openPlot}
              onDelete={(id) => deletePlot(auth.user.uid, id)}
              onRename={(id, label, notes) => updatePlot(auth.user.uid, id, { label, notes })}
            />
          </>
        )}
      </aside>
    </div>
  );
}
