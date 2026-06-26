import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Header from "../components/Header";
import MapView from "../components/MapView";
import { Users, Truck, AlertCircle, Activity, MapPin, X } from "lucide-react";
import { toast } from "sonner";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [users, setUsers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [showCreateTruck, setShowCreateTruck] = useState(false);
  const [showCreateRoute, setShowCreateRoute] = useState(false);

  const fetchAll = async () => {
    const [s, t, p, u, r] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/trucks"),
      api.get("/special-pickups"),
      api.get("/admin/users"),
      api.get("/routes"),
    ]);
    setStats(s.data); setTrucks(t.data); setPickups(p.data); setUsers(u.data); setRoutes(r.data);
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 8000);
    return () => clearInterval(t);
  }, []);

  const updatePickup = async (id, status) => {
    try {
      await api.put(`/special-pickups/${id}`, { status });
      toast.success("Actualizado");
      fetchAll();
    } catch (e) {
      toast.error("Error");
    }
  };

  const markers = trucks.map((t) => ({ id: t.id, lat: t.lat, lng: t.lng, type: "truck", label: t.plate }));

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
          <div>
            <div className="rc-label">Centro de mando</div>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight mt-1">
              Operación municipal
            </h1>
          </div>
          <div className="flex gap-2">
            <button data-testid="open-create-truck" onClick={() => setShowCreateTruck(true)} className="px-4 py-3 text-xs uppercase tracking-widest font-bold border border-black/20 hover:bg-black hover:text-white">
              + Camión
            </button>
            <button data-testid="open-create-route" onClick={() => setShowCreateRoute(true)} className="px-4 py-3 text-xs uppercase tracking-widest font-bold bg-[#ff5a00] hover:bg-[#e04f00] text-white">
              + Ruta
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" data-testid="stats-grid">
          <Stat icon={<Users size={16} />} label="Residentes" value={stats?.residents ?? "—"} />
          <Stat icon={<Truck size={16} />} label="Camiones activos" value={`${stats?.trucks_active ?? 0}/${stats?.trucks_total ?? 0}`} accent />
          <Stat icon={<Activity size={16} />} label="Rutas hoy" value={stats?.routes_today ?? 0} />
          <Stat icon={<AlertCircle size={16} />} label="Solicitudes" value={stats?.pending_pickups ?? 0} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          <div className="lg:col-span-3">
            <div className="rc-label mb-2">Flota en vivo</div>
            <MapView markers={markers} height={420} />
          </div>
          <div className="lg:col-span-2 rc-card p-6">
            <div className="rc-label mb-4">Camiones</div>
            <div className="space-y-3 max-h-[360px] overflow-auto">
              {trucks.map((t) => (
                <div key={t.id} className="border border-black/10 p-3 flex items-center justify-between" data-testid={`admin-truck-${t.id}`}>
                  <div>
                    <div className="font-bold">{t.plate}</div>
                    <div className="text-xs text-neutral-600">{t.driver_name || "Sin conductor"}</div>
                    <div className="text-[10px] font-mono-rc text-neutral-500 mt-1">{t.lat.toFixed(4)}, {t.lng.toFixed(4)}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 font-bold uppercase ${t.status === "on_route" ? "bg-[#ff5a00] text-white" : "bg-neutral-200"}`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rc-card p-6">
            <div className="rc-label mb-4">Cola de solicitudes especiales</div>
            <div className="space-y-3 max-h-[400px] overflow-auto">
              {pickups.length === 0 && <div className="text-sm text-neutral-500 py-6 text-center" data-testid="admin-no-pickups">Sin solicitudes</div>}
              {pickups.map((p) => (
                <div key={p.id} className="border border-black/10 p-3" data-testid={`admin-pickup-${p.id}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm">{p.user_name} · <span className="font-mono-rc text-xs">{p.user_phone}</span></div>
                      <div className="text-xs text-neutral-600 mt-0.5">{p.address}</div>
                      <div className="text-[11px] text-neutral-500 mt-1">{p.waste_type} · {p.preferred_date}</div>
                      {p.notes && <div className="text-xs italic text-neutral-600 mt-1">"{p.notes}"</div>}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 font-bold uppercase ${
                      p.status === "pending" ? "bg-amber-100 text-amber-800" :
                      p.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                      p.status === "collected" ? "bg-green-100 text-green-800" : "bg-neutral-200"
                    }`}>{p.status}</span>
                  </div>
                  {p.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <button data-testid={`schedule-pickup-${p.id}`} onClick={() => updatePickup(p.id, "scheduled")} className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 bg-[#002fa7] text-white">
                        Agendar
                      </button>
                      <button onClick={() => updatePickup(p.id, "cancelled")} className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 border border-black/15">
                        Cancelar
                      </button>
                    </div>
                  )}
                  {p.status === "scheduled" && (
                    <div className="mt-3">
                      <button onClick={() => updatePickup(p.id, "collected")} className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 bg-green-600 text-white">
                        Marcar recolectada
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rc-card p-6">
            <div className="rc-label mb-4">Usuarios registrados</div>
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {users.map((u) => (
                <div key={u.id} className="border border-black/10 p-3 flex items-center justify-between" data-testid={`admin-user-${u.id}`}>
                  <div>
                    <div className="font-bold text-sm">{u.name}</div>
                    <div className="text-xs font-mono-rc text-neutral-500">{u.phone}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 bg-[#0a0a0a] text-white">{u.role}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Routes */}
        <section className="mt-6 rc-card p-6">
          <div className="rc-label mb-4">Rutas</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {routes.map((r) => {
              const truck = trucks.find((t) => t.id === r.truck_id);
              return (
                <div key={r.id} className="border border-black/10 p-3" data-testid={`admin-route-${r.id}`}>
                  <div className="font-bold">{r.name}</div>
                  <div className="text-xs text-neutral-600">{r.date} · {truck?.plate || r.truck_id}</div>
                  <div className="text-xs mt-1">{r.stops.length} paradas · <span className="font-bold">{r.status}</span></div>
                </div>
              );
            })}
            {routes.length === 0 && <div className="text-sm text-neutral-500">No hay rutas creadas.</div>}
          </div>
        </section>
      </main>

      {showCreateTruck && <CreateTruckModal users={users} onClose={() => setShowCreateTruck(false)} onCreated={() => { setShowCreateTruck(false); fetchAll(); }} />}
      {showCreateRoute && <CreateRouteModal trucks={trucks} onClose={() => setShowCreateRoute(false)} onCreated={() => { setShowCreateRoute(false); fetchAll(); }} />}
    </div>
  );
};

const Stat = ({ icon, label, value, accent }) => (
  <div className={`rc-card p-5 ${accent ? "bg-[#0a0a0a] text-white border-[#0a0a0a]" : ""}`}>
    <div className="rc-label" style={accent ? { color: "#ff5a00" } : undefined}>{label}</div>
    <div className="flex items-end justify-between mt-2">
      <div className="font-display font-black text-3xl tracking-tight">{value}</div>
      <div className={accent ? "text-[#ff5a00]" : "text-neutral-400"}>{icon}</div>
    </div>
  </div>
);

const CreateTruckModal = ({ users, onClose, onCreated }) => {
  const [plate, setPlate] = useState("");
  const [driverId, setDriverId] = useState("");
  const [saving, setSaving] = useState(false);
  const drivers = users.filter((u) => u.role === "driver");

  const save = async () => {
    if (!plate) { toast.error("Placa requerida"); return; }
    setSaving(true);
    try {
      await api.post("/trucks", { plate, driver_id: driverId || null });
      toast.success("Camión creado");
      onCreated();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Error");
    }
    setSaving(false);
  };

  return (
    <Modal title="Nuevo camión" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Placa">
          <input data-testid="truck-plate-input" value={plate} onChange={(e) => setPlate(e.target.value)} className="w-full py-2 outline-none font-mono-rc uppercase" placeholder="CDMX-003" />
        </Field>
        <div>
          <div className="rc-label mb-2">Conductor</div>
          <select data-testid="truck-driver-select" value={driverId} onChange={(e) => setDriverId(e.target.value)} className="w-full border border-black/20 bg-white px-3 py-2">
            <option value="">— Sin asignar —</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>)}
          </select>
        </div>
        <button data-testid="truck-save-button" onClick={save} disabled={saving} className="bg-[#ff5a00] hover:bg-[#e04f00] text-white px-5 py-3 text-xs uppercase tracking-widest font-bold disabled:opacity-50">
          {saving ? "Creando..." : "Crear camión"}
        </button>
      </div>
    </Modal>
  );
};

const CreateRouteModal = ({ trucks, onClose, onCreated }) => {
  const [name, setName] = useState("Ruta " + new Date().toISOString().slice(0, 10));
  const [truckId, setTruckId] = useState(trucks[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [stopsText, setStopsText] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!truckId) { toast.error("Selecciona camión"); return; }
    const lines = stopsText.split("\n").map((l) => l.trim()).filter(Boolean);
    const stops = lines.map((line) => {
      const [address, lat, lng] = line.split("|").map((s) => s.trim());
      return {
        address: address || "Sin dirección",
        lat: parseFloat(lat) || 19.4326,
        lng: parseFloat(lng) || -99.1332,
      };
    });
    setSaving(true);
    try {
      await api.post("/routes", { truck_id: truckId, name, date, stops });
      toast.success("Ruta creada");
      onCreated();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Error");
    }
    setSaving(false);
  };

  return (
    <Modal title="Nueva ruta" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full py-2 outline-none" />
        </Field>
        <div>
          <div className="rc-label mb-2">Camión</div>
          <select value={truckId} onChange={(e) => setTruckId(e.target.value)} className="w-full border border-black/20 bg-white px-3 py-2">
            {trucks.map((t) => <option key={t.id} value={t.id}>{t.plate} · {t.driver_name || "—"}</option>)}
          </select>
        </div>
        <Field label="Fecha">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full py-2 outline-none font-mono-rc" />
        </Field>
        <div>
          <div className="rc-label mb-2">Paradas (una por línea: dirección | lat | lng)</div>
          <textarea
            rows={5}
            value={stopsText}
            onChange={(e) => setStopsText(e.target.value)}
            className="w-full border border-black/20 bg-white p-3 outline-none font-mono-rc text-sm"
            placeholder={"Calle 1, 100 | 19.4330 | -99.1340\nAv Reforma 222 | 19.4350 | -99.1320"}
          />
        </div>
        <button onClick={save} disabled={saving} className="bg-[#ff5a00] hover:bg-[#e04f00] text-white px-5 py-3 text-xs uppercase tracking-widest font-bold disabled:opacity-50">
          {saving ? "Creando..." : "Crear ruta"}
        </button>
      </div>
    </Modal>
  );
};

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white border border-black/10 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
        <h3 className="font-display font-black text-xl tracking-tight">{title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-black hover:text-white"><X size={18} /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <label className="block">
    <div className="rc-label mb-1.5">{label}</div>
    <div className="border border-black/20 bg-white px-3 focus-within:border-[#ff5a00]">{children}</div>
  </label>
);

export default AdminDashboard;
