import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Helper to auto-zoom to a GeoJSON
function FitToGeoJSON({ geojson }) {
  const map = useMap();

  useEffect(() => {
    if (!geojson) return;
    const layer = L.geoJSON(geojson);
    const bounds = layer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
  }, [geojson, map]);

  return null;
}

export default function App() {
  const [pakistan, setPakistan] = useState(null);
  const [punjab, setPunjab] = useState(null);

  useEffect(() => {
    fetch("/data/pakistan_adm1.geojson")
      .then((res) => res.json())
      .then((geojson) => {
        setPakistan(geojson);

        const punjabFeature = geojson.features.find((f) => {
          const name = (f.properties.shapeName || "").toLowerCase();
          return name.includes("punjab");
        });

        if (punjabFeature) {
          setPunjab({ type: "FeatureCollection", features: [punjabFeature] });
        } else {
          console.warn("Punjab feature not found.");
        }
      })
      .catch((err) => console.error("Failed to load GeoJSON:", err));
  }, []);

  const pakistanStyle = {
    color: "#333",
    weight: 2,
    fillOpacity: 0,
  };

  const punjabStyle = {
  color: "#c62828",
  weight: 2,
  fillColor: "#ff8a80",
  fillOpacity: 0.35, // semi-transparent highlight
  };

  return (
<MapContainer
  center={[30.3753, 75]}
  zoom={6}
  style={{ height: "100vh", width: "100vw" }}
  minZoom={6}
  maxZoom={12}
  maxBounds={[
    [23, 61],
    [38, 79]
  ]}
  maxBoundsViscosity={1.0}
>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution="&copy; OpenStreetMap contributors"
  />
  {pakistan && <GeoJSON data={pakistan} style={pakistanStyle} />}
  {punjab && <GeoJSON data={punjab} style={punjabStyle} />}
  {pakistan && <FitToGeoJSON geojson={pakistan} />}
</MapContainer>


  );
}
