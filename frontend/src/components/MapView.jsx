import React, { useEffect, useState } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { Truck, Home, MapPin } from "lucide-react";

const GMAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const HAS_KEY = GMAPS_KEY && GMAPS_KEY !== "" && GMAPS_KEY !== "YOUR_GOOGLE_MAPS_API_KEY";

/**
 * markers: [{id, lat, lng, type: 'truck'|'home'|'stop'|'pickup', label?}]
 * center: {lat, lng}
 */
const MapView = ({ markers = [], center, height = 420 }) => {
  if (HAS_KEY) {
    return (
      <div style={{ height }} className="w-full border border-black/10 overflow-hidden relative" data-testid="map-view">
        <APIProvider apiKey={GMAPS_KEY}>
          <Map
            style={{ width: "100%", height: "100%" }}
            defaultCenter={center || { lat: 19.4326, lng: -99.1332 }}
            defaultZoom={15}
            mapId="recolecta_map"
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={false}
          >
            {markers.map((m) => (
              <AdvancedMarker key={m.id} position={{ lat: m.lat, lng: m.lng }}>
                <MarkerPin type={m.type} label={m.label} />
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>
      </div>
    );
  }
  return <FallbackMap markers={markers} center={center} height={height} />;
};

const MarkerPin = ({ type, label }) => {
  if (type === "truck") {
    return (
      <div className="flex flex-col items-center" data-testid="map-marker-truck">
        <div className="bg-[#ff5a00] text-white p-2 truck-pulse">
          <Truck size={18} strokeWidth={2.5} />
        </div>
        {label && <div className="bg-black text-white text-[10px] font-bold mt-1 px-2 py-0.5 uppercase">{label}</div>}
      </div>
    );
  }
  if (type === "home") {
    return (
      <div className="bg-[#002fa7] text-white p-1.5 border-2 border-white">
        <Home size={14} strokeWidth={2.5} />
      </div>
    );
  }
  return (
    <div className="bg-white border border-black text-black p-1.5">
      <MapPin size={14} strokeWidth={2.5} />
    </div>
  );
};

/* ----------- Fallback map (no API key) ----------- */
const FallbackMap = ({ markers, center, height }) => {
  // compute bounds; default center if no markers
  const ref = center || { lat: 19.4326, lng: -99.1332 };
  const pts = markers.length > 0 ? markers : [{ lat: ref.lat, lng: ref.lng }];
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats) - 0.003;
  const maxLat = Math.max(...lats) + 0.003;
  const minLng = Math.min(...lngs) - 0.003;
  const maxLng = Math.max(...lngs) + 0.003;
  const project = (lat, lng) => ({
    x: ((lng - minLng) / (maxLng - minLng)) * 100,
    y: (1 - (lat - minLat) / (maxLat - minLat)) * 100,
  });

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1500);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{ height }}
      className="w-full border border-black/10 relative overflow-hidden rc-grid-bg"
      data-testid="map-view"
    >
      <div className="absolute top-3 left-3 z-10 bg-black text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1">
        Mapa simulado · falta GOOGLE MAPS KEY
      </div>

      {/* connecting line between truck and home if both present */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {(() => {
          const truck = markers.find((m) => m.type === "truck");
          const home = markers.find((m) => m.type === "home");
          if (!truck || !home) return null;
          const a = project(truck.lat, truck.lng);
          const b = project(home.lat, home.lng);
          return (
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#ff5a00" strokeWidth="0.4" strokeDasharray="1 1"
              opacity={0.8 + (tick % 2) * 0.2}
            />
          );
        })()}
      </svg>

      {markers.map((m) => {
        const p = project(m.lat, m.lng);
        return (
          <div
            key={m.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            data-testid={`fallback-marker-${m.type}-${m.id}`}
          >
            <MarkerPin type={m.type} label={m.label} />
          </div>
        );
      })}
    </div>
  );
};

export default MapView;
