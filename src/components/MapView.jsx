import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import DrawTools from "./DrawTools";

export const BAND_COLOR = {
  low: "#16a34a",
  medium: "#f59e0b",
  high: "#dc2626",
  unknown: "#2563eb",
};

// Keep the view focused on Pakistan: [SW corner, NE corner] (with a little padding).
const PAKISTAN_BOUNDS = [
  [23.0, 60.0], // south-west (Arabian Sea coast / Balochistan)
  [37.5, 78.0], // north-east (Gilgit-Baltistan / Kashmir)
];

function riskIcon(band) {
  const color = BAND_COLOR[band] ?? BAND_COLOR.unknown;
  // A divIcon avoids the classic Leaflet+bundler broken-marker bug AND lets us
  // color the pin by risk band.
  return L.divIcon({
    className: "risk-pin",
    html: `<span class="risk-pin__dot" style="background:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function ClickToPin({ active, onPick }) {
  useMapEvents({
    click(e) {
      if (active) onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 11), { duration: 0.8 });
    }
  }, [target, map]);
  return null;
}

export default function MapView({ mode, selection, band, flyTo, onPick, onPolygon }) {
  const color = BAND_COLOR[band] ?? BAND_COLOR.unknown;
  return (
    <MapContainer
      center={[30.3753, 69.3451]}
      zoom={6}
      minZoom={5}
      maxBounds={PAKISTAN_BOUNDS}
      maxBoundsViscosity={1.0}
      className="map"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <ClickToPin active={mode === "pin"} onPick={onPick} />
      <DrawTools active={mode === "draw"} onPolygon={onPolygon} />
      <FlyTo target={flyTo} />

      {selection?.type === "pin" && (
        <Marker position={[selection.point.lat, selection.point.lng]} icon={riskIcon(band)} />
      )}
      {selection?.type === "polygon" && (
        <Polygon
          positions={selection.latlngs.map((p) => [p.lat, p.lng])}
          pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 2 }}
        />
      )}
    </MapContainer>
  );
}
