import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Header from "../components/Header";
import MapView from "../components/MapView";
import { CheckCircle2, Circle, MapPin, Play, Truck, Activity, Crosshair } from "lucide-react";
import { toast } from "sonner";

const DriverDashboard = () => {
  const { user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [sharing, setSharing] = useState(false);

  const fetchAll = async () => {
    const [routesRes, trucksRes, pickupsRes] = await Promise.all([
      api.get("/routes"),
      api.get("/trucks"),
      api.get("/special-pickups"),
    ]);
    setRoutes(routesRes.data);
    setTrucks(trucksRes.data);
    setPickups(pickupsRes.data);
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 6000);
    return () => clearInterval(t);
  }, []);

  const myTruck = trucks.find((t) => t.driver_id === user?.id);
  const myRoute = routes.find((r) => myTruck && r.truck_id === myTruck.id);

  const markStop = async (stopId, status) => {
    if (!myRoute) return;
    try {
      await api.put(`/routes/${myRoute.id}/stops/${stopId}/status`, { status });
      toast.success(status === "collected" ? "Marcado como recolectado" : "Marcado");
      fetchAll();
    } catch (e) {
      toast.error("Error");
    }
  };

  // Simulate driver position movement when "sharing"
  useEffect(() => {
    if (!sharing || !myTruck) return;
    const interval = setInterval(async () => {
      const nextStop = myRoute?.stops.find((s) => s.status === "pending");
      if (!nextStop) return;
      // step toward next stop
      const dLat = (nextStop.lat - myTruck.lat) * 0.15;
      const dLng = (nextStop.lng - myTruck.lng) * 0.15;
      try {
        await api.put(`/trucks/${myTruck.id}/location`, {
          lat: myTruck.lat + dLat,
          lng: myTruck.lng + dLng,
          speed_kmh: 22,
        });
        fetchAll();
      } catch (e) { /* ignore */ }
    }, 4000);
    return () => clearInterval(interval);
  }, [sharing, myTruck, myRoute]);

  const sendCurrentLocation = async () => {
    if (!navigator.geolocation || !myTruck) {
      toast.error("Geolocalización no disponible");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await api.put(`/trucks/${myTruck.id}/location`, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed_kmh: pos.coords.speed || 0,
        });
        toast.success("Ubicación enviada");
        fetchAll();
      },
      () => toast.error("No se pudo obtener ubicación"),
    );
  };

  const markers = [];
  if (myTruck) markers.push({ id: myTruck.id, lat: myTruck.lat, lng: myTruck.lng, type: "truck", label: myTruck.plate });
  if (myRoute) {
    myRoute.stops.forEach((s) => markers.push({ id: s.id, lat: s.lat, lng: s.lng, type: "stop" }));
  }

  const pendingStops = myRoute?.stops.filter((s) => s.status === "pending").length || 0;
  const totalStops = myRoute?.stops.length || 0;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
          <div>
            <div className="rc-label">Panel Conductor</div>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight mt-1">
              {myTruck ? `Unidad ${myTruck.plate}` : "Sin camión asignado"}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSharing((s) => !s)}
              data-testid="toggle-sharing-button"
              className={`inline-flex items-center gap-2 px-5 py-3 font-bold uppercase tracking-widest text-xs ${
                sharing ? "bg-[#0a0a0a] text-white" : "bg-[#ff5a00] hover:bg-[#e04f00] text-white"
              }`}
            >
              <Activity size={16} className={sharing ? "animate-pulse" : ""} />
              {sharing ? "Detener simulación" : "Iniciar ruta (auto)"}
            </button>
            <button
              onClick={sendCurrentLocation}
              data-testid="send-current-location-button"
              className="inline-flex items-center gap-2 px-5 py-3 border border-black/20 hover:bg-black hover:text-white text-xs uppercase tracking-widest font-bold"
            >
              <Crosshair size={14} /> GPS real
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Stat label="Paradas pendientes" value={pendingStops} accent="#ff5a00" />
          <Stat label="Paradas totales" value={totalStops} />
          <Stat label="Velocidad" value={`${Math.round(myTruck?.speed_kmh || 0)} km/h`} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <MapView markers={markers} center={myTruck ? { lat: myTruck.lat, lng: myTruck.lng } : undefined} height={500} />
          </div>

          <div className="lg:col-span-2 rc-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="rc-label flex items-center gap-2"><Truck size={12} /> Ruta de hoy</div>
              {myRoute?.start_time && (
                <span className="font-mono-rc text-xs bg-[#0a0a0a] text-white px-2 py-1" data-testid="driver-route-start-time">
                  Inicio · {myRoute.start_time}
                </span>
              )}
            </div>
            {!myRoute && <div className="text-sm text-neutral-500 py-12 text-center" data-testid="no-route">No tienes ruta asignada hoy.</div>}
            <div className="space-y-3 max-h-[420px] overflow-auto">
              {myRoute?.stops.map((s, idx) => (
                <div key={s.id} className="border border-black/10 p-3 flex items-start gap-3" data-testid={`stop-row-${s.id}`}>
                  <div className="font-mono-rc text-xs text-neutral-400 mt-1">{String(idx + 1).padStart(2, "0")}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm flex items-center gap-2">
                      <MapPin size={12} className="text-[#ff5a00]" /> {s.address}
                    </div>
                    <div className="text-[11px] font-mono-rc text-neutral-500 mt-1 flex items-center gap-2">
                      <span>{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</span>
                      {s.scheduled_time && (
                        <span className="bg-[#ff5a00] text-white px-1.5 py-0.5 text-[10px] font-bold tracking-wider" data-testid={`stop-time-${s.id}`}>
                          {s.scheduled_time}
                        </span>
                      )}
                    </div>
                  </div>
                  {s.status === "pending" ? (
                    <button
                      onClick={() => markStop(s.id, "collected")}
                      data-testid={`mark-collected-${s.id}`}
                      className="p-2 hover:bg-green-600 hover:text-white border border-black/15"
                      title="Marcar recolectado"
                    >
                      <Circle size={16} />
                    </button>
                  ) : (
                    <span className="p-2 bg-green-600 text-white"><CheckCircle2 size={16} /></span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Special pickups */}
        <section className="mt-6 rc-card p-6">
          <div className="rc-label mb-4">Solicitudes especiales en la zona</div>
          {pickups.length === 0 && <div className="text-sm text-neutral-500 py-6">Sin solicitudes.</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pickups.slice(0, 9).map((p) => (
              <div key={p.id} className="border border-black/10 p-3" data-testid={`driver-pickup-${p.id}`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-widest">{p.waste_type}</div>
                  <span className={`text-[10px] px-2 py-0.5 font-bold uppercase ${p.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-neutral-200 text-neutral-700"}`}>{p.status}</span>
                </div>
                <div className="text-sm mt-1">{p.address}</div>
                <div className="text-xs text-neutral-500 mt-1">{p.user_name} · {p.preferred_date}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

const Stat = ({ label, value, accent }) => (
  <div className="rc-card p-5">
    <div className="rc-label">{label}</div>
    <div className="font-display font-black text-4xl tracking-tight mt-2" style={accent ? { color: accent } : undefined}>
      {value}
    </div>
  </div>
);

export default DriverDashboard;
