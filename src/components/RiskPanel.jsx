import Sparkline from "./Sparkline";
import Disclaimer from "./Disclaimer";

const BAND_LABEL = {
  low: "Lower risk",
  medium: "Moderate risk",
  high: "Higher risk",
  unknown: "Unknown",
};
const BAND_COLOR = {
  low: "#16a34a",
  medium: "#f59e0b",
  high: "#dc2626",
  unknown: "#2563eb",
};

const fmt = (n) => Math.round(n).toLocaleString();

function HistoryNote({ history }) {
  if (!history?.available) {
    return (
      <p className="hint">
        No major river channel is modelled close enough to this spot for a discharge history.
      </p>
    );
  }
  let line;
  if (history.isRecord && history.peak2022) {
    line = `The nearest modelled river hit its highest level in ${history.years} years during 2022 (about ${fmt(
      history.peak2022
    )} m³/s).`;
  } else if (history.peak2022) {
    line = `In 2022 the nearest river reached about ${fmt(
      history.peak2022
    )} m³/s. Its highest since 1984 was about ${fmt(history.peak)} m³/s in ${history.peakDate.slice(0, 4)}.`;
  } else {
    line = `The nearest river's highest level since 1984 was about ${fmt(
      history.peak
    )} m³/s in ${history.peakDate.slice(0, 4)}.`;
  }
  return (
    <div className="history">
      <p className="history__line">{line}</p>
      <Sparkline data={history.yearlyMax} highlightYear={2022} />
      <p className="history__cap">Yearly peak river discharge (GloFAS), 1984–today. Red dot = 2022.</p>
    </div>
  );
}

export default function RiskPanel({ status, error, result, history }) {
  if (status === "idle")
    return (
      <p className="hint">
        Tap the map to drop a pin on your land, or use <b>Draw boundary</b> to trace its outline.
      </p>
    );
  if (status === "loading") return <p className="hint">Reading the terrain…</p>;
  if (status === "error") return <p className="hint hint--error">{error}</p>;
  if (!result) return null;

  if (result.outOfBounds) {
    return (
      <div className="result">
        <p className="hint hint--draw">
          📍 That spot is outside Pakistan. This tool only covers Pakistan — drop your pin inside the
          country.
        </p>
      </div>
    );
  }

  if (result.isWater) {
    return (
      <div className="result">
        <p className="hint hint--draw">
          🌊 This spot is over open water — drop your pin on land to get a flood estimate.
        </p>
        <Disclaimer />
      </div>
    );
  }

  const color = BAND_COLOR[result.band] ?? BAND_COLOR.unknown;
  return (
    <div className="result">
      <div className="score">
        <div className="score__ring" style={{ background: color }}>
          {result.score ?? "–"}
        </div>
        <div>
          <div className="score__band" style={{ color }}>
            {BAND_LABEL[result.band]}
          </div>
          <div className="score__note">Flood-susceptibility score (0–100)</div>
        </div>
      </div>

      <h3>Why</h3>
      <ul className="factors">
        {result.factors.map((f) => (
          <li key={f.label}>
            <span>{f.label}</span>
            <strong>{f.detail}</strong>
          </li>
        ))}
      </ul>

      <h3>River history nearby</h3>
      <HistoryNote history={history} />

      {result.reference?.title && (
        <p className="reference">
          📰 Recent flooding:{" "}
          <a href={result.reference.url} target="_blank" rel="noreferrer">
            {result.reference.title}
          </a>{" "}
          <span className="reference__scale">({result.reference.scale})</span>
        </p>
      )}

      <Disclaimer />
    </div>
  );
}
