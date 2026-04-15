import { useState, useEffect } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

const geoUrl =
  "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json";

// Cache geolocation results to avoid repeated API calls
const geoCache = {};

export default function WorldMap({ logs }) {
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    const fetchCoordinates = async () => {
      const uniqueIPs = [...new Set(logs.map((log) => log.ip))].slice(0, 30);
      const newMarkers = [];

      for (const ip of uniqueIPs) {
        if (geoCache[ip]) {
          newMarkers.push({
            ip,
            ...geoCache[ip],
            severity: logs.find((l) => l.ip === ip)?.severity,
          });
          continue;
        }
        try {
          const res = await fetch(
            `http://ip-api.com/json/${ip}?fields=lat,lon`,
          );
          const data = await res.json();
          if (data.lat && data.lon) {
            geoCache[ip] = { lat: data.lat, lon: data.lon };
            newMarkers.push({
              ip,
              lat: data.lat,
              lon: data.lon,
              severity: logs.find((l) => l.ip === ip)?.severity,
            });
          }
        } catch (err) {
          console.error(`Geolocation failed for ${ip}`, err);
        }
      }
      setMarkers(newMarkers);
    };

    if (logs.length) fetchCoordinates();
  }, [logs]);

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
      <h2 className="text-lg mb-3 text-white">
        🌍 Attack Sources (Real Locations)
      </h2>
      <ComposableMap projection="geoMercator" projectionConfig={{ scale: 100 }}>
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#2d3748"
                stroke="#4a5568"
              />
            ))
          }
        </Geographies>
        {markers.map((marker, i) => (
          <Marker key={i} coordinates={[marker.lon, marker.lat]}>
            <circle
              r={5}
              fill={marker.severity === "CRITICAL" ? "#ef4444" : "#f97316"}
              stroke="#fff"
              strokeWidth={1}
            />
            <title>
              {marker.ip} - {marker.severity}
            </title>
          </Marker>
        ))}
      </ComposableMap>
    </div>
  );
}
