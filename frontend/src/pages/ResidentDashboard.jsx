import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Header from "../components/Header";
import MapView from "../components/MapView";
import { Clock, MapPin, Truck, Plus, Bell, Calendar, Check, X } from "lucide-react";
import { toast } from "sonner";

const WASTE_TYPES = [
  { v: "bulky", l: "Voluminoso" },
  { v: "debris", l: "Escombros" },
  { v: "electronics", l: "Electrónicos" },
  { v: "green", l: "Verde / Jardín" },
  { v: "hazardous", l: "Peligrosos" },
];

const ResidentDashboard = () => {
  const { user, refreshUser } = useAuth();
  const [eta, setEta] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [addressOpen, setAddressOpen] = useState(!user?.address);
  const [pickupOpen, setPickupOpen] = useState(false);

  const fetchAll = async () => {
    const [etaRes, trucksRes, pickupsRes, notifsRes] = await Promise.all([
      api.get("/resident/eta").catch(() => ({ data: { available: false } })),
      api.get("/trucks"),
      api.get("/special-pickups"),
      api.get("/notifications"),
    ]);
    setEta(etaRes.data);
    setTrucks(trucksRes.data);
    setPickups(pickupsRes.data);
    setNotifs(notifsRes.data);
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 8000);
    return () => clearInterval(t);
  }, []);

  const markers = [];
  trucks.forEach((t) => markers.push({ id: t.id, lat: t.lat, lng: t.lng, type: "truck", label: t.plate }));
  if (user?.lat) markers.push({ id: "home", lat: user.lat, lng: user.lng, type: "home" });

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
          <div>
            <div className="rc-label">Panel Residente</div>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight mt-1">
              Hola, {user?.name?.split(" ")[0]}.
            </h1>
          </div>
          <button
            onClick={() => setPickupOpen(true)}
            data-testid="open-special-pickup-button"
            className="inline-flex items-center gap-2 bg-[#ff5a00] hover:bg-[#e04f00] text-white px-5 py-3 font-bold uppercase tracking-widest text-xs"
          >
            <Plus size={16} /> Recogida especial
          </button>
        </div>

        {/* ETA Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1 rc-card p-6 flex flex-col justify-between" data-testid="eta-card">
            <div>
              <div className="rc-label flex items-center gap-2">
                <Clock size={12} /> Próxima recogida
              </div>
              {eta?.available ? (
                <>
                  <div className="font-display font-black text-6xl tracking-tight mt-3">
                    {eta.eta_minutes}<span className="text-2xl font-bold ml-1">min</span>
                  </div>
                  <div className="text-sm text-neutral-600 mt-2">
                    Camión <span className="font-bold">{eta.truck.plate}</span> a {eta.distance_km} km de tu domicilio.
                  </div>
                </>
              ) : (
                <>
                  <div className="font-display font-black text-3xl tracking-tight mt-3">
                    {eta?.reason === "no_address" ? "Sin domicilio" : "Sin camión activo"}
                  </div>
                  <div className="text-sm text-neutral-600 mt-2">
                    {eta?.reason === "no_address"
                      ? "Agrega tu domicilio para calcular el ETA."
                      : "Los camiones aún no están en ruta hoy."}
                  </div>
                </>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => setAddressOpen(true)}
                data-testid="edit-address-button"
                className="text-xs uppercase tracking-widest font-bold px-3 py-2 border border-black/15 hover:bg-black hover:text-white transition-colors"
              >
                {user?.address ? "Cambiar domicilio" : "Agregar domicilio"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <MapView markers={markers} center={user?.lat ? { lat: user.lat, lng: user.lng } : undefined} height={360} />
            {user?.address && (
              <div className="mt-2 text-xs text-neutral-600 flex items-center gap-2">
                <MapPin size={12} className="text-[#002fa7]" /> {user.address}
              </div>
            )}
          </div>
        </section>

        {/* Special pickups + Notifications */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rc-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="rc-label flex items-center gap-2"><Calendar size={12} /> Mis solicitudes</div>
              <span className="font-mono-rc text-xs text-neutral-500">{pickups.length}</span>
            </div>
            <div className="space-y-3 max-h-80 overflow-auto">
              {pickups.length === 0 && (
                <div className="text-sm text-neutral-500 py-8 text-center" data-testid="no-pickups">
                  No tienes solicitudes. Crea una arriba.
                </div>
              )}
              {pickups.map((p) => (
                <div key={p.id} className="border border-black/10 p-4 flex items-center justify-between" data-testid={`pickup-row-${p.id}`}>
                  <div>
                    <div className="font-bold text-sm">{WASTE_TYPES.find((w) => w.v === p.waste_type)?.l}</div>
                    <div className="text-xs text-neutral-600">{p.address}</div>
                    <div className="text-xs text-neutral-500 mt-1">{p.preferred_date}</div>
                  </div>
                  <StatusPill status={p.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="rc-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="rc-label flex items-center gap-2"><Bell size={12} /> Notificaciones</div>
              <span className="font-mono-rc text-xs text-neutral-500">{notifs.filter((n) => !n.read).length} sin leer</span>
            </div>
            <div className="space-y-3 max-h-80 overflow-auto">
              {notifs.length === 0 && (
                <div className="text-sm text-neutral-500 py-8 text-center" data-testid="no-notifications">
                  Aún no hay notificaciones.
                </div>
              )}
              {notifs.map((n) => (
                <div
                  key={n.id}
                  className={`border-l-2 pl-3 py-2 ${n.read ? "border-neutral-200" : "border-[#ff5a00] bg-orange-50"}`}
                  data-testid={`notif-${n.id}`}
                >
                  <div className="font-bold text-sm">{n.title}</div>
                  <div className="text-xs text-neutral-600">{n.message}</div>
                  <div className="text-[10px] font-mono-rc text-neutral-400 mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {addressOpen && (
        <AddressModal
          user={user}
          onClose={() => setAddressOpen(false)}
          onSaved={async () => { await refreshUser(); setAddressOpen(false); await fetchAll(); }}
        />
      )}
      {pickupOpen && (
        <PickupModal
          user={user}
          onClose={() => setPickupOpen(false)}
          onCreated={async () => { setPickupOpen(false); await fetchAll(); }}
        />
      )}
    </div>
  );
};

const StatusPill = ({ status }) => {
  const map = {
    pending: ["Pendiente", "bg-amber-100 text-amber-800"],
    scheduled: ["Agendada", "bg-blue-100 text-blue-800"],
    collected: ["Recolectada", "bg-green-100 text-green-800"],
    cancelled: ["Cancelada", "bg-neutral-200 text-neutral-700"],
    idle: ["Inactivo", "bg-neutral-200 text-neutral-700"],
    on_route: ["En ruta", "bg-[#ff5a00] text-white"],
    maintenance: ["Mantenimiento", "bg-red-100 text-red-800"],
    in_progress: ["En curso", "bg-[#ff5a00] text-white"],
    completed: ["Completa", "bg-green-100 text-green-800"],
  };
  const [label, cls] = map[status] || [status, "bg-neutral-100"];
  return (
    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${cls}`}>{label}</span>
  );
};

const AddressModal = ({ user, onClose, onSaved }) => {
  const [address, setAddress] = useState(user?.address || "");
  const [lat, setLat] = useState(user?.lat || 19.4326);
  const [lng, setLng] = useState(user?.lng || -99.1332);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!address) { toast.error("Ingresa tu dirección"); return; }
    setSaving(true);
    try {
      await api.put("/me/address", { address, lat: parseFloat(lat), lng: parseFloat(lng) });
      toast.success("Domicilio actualizado");
      onSaved();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Error");
    }
    setSaving(false);
  };

  return (
    <Modal title="Mi domicilio" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Dirección">
          <input data-testid="address-input" className="w-full py-2 outline-none" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, número, colonia" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitud">
            <input data-testid="address-lat-input" type="number" step="0.0001" className="w-full py-2 outline-none font-mono-rc" value={lat} onChange={(e) => setLat(e.target.value)} />
          </Field>
          <Field label="Longitud">
            <input data-testid="address-lng-input" type="number" step="0.0001" className="w-full py-2 outline-none font-mono-rc" value={lng} onChange={(e) => setLng(e.target.value)} />
          </Field>
        </div>
        <div className="text-xs text-neutral-500">Tip: Usa el centro aproximado de tu colonia. Por defecto: CDMX.</div>
        <div className="flex gap-2">
          <button data-testid="address-save-button" onClick={save} disabled={saving} className="bg-[#ff5a00] hover:bg-[#e04f00] text-white px-5 py-3 text-xs uppercase tracking-widest font-bold disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button onClick={onClose} className="px-5 py-3 text-xs uppercase tracking-widest font-bold border border-black/15">
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
};

const PickupModal = ({ user, onClose, onCreated }) => {
  const [wasteType, setWasteType] = useState("bulky");
  const [address, setAddress] = useState(user?.address || "");
  const [lat, setLat] = useState(user?.lat || 19.4326);
  const [lng, setLng] = useState(user?.lng || -99.1332);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!address) { toast.error("Ingresa dirección"); return; }
    setSaving(true);
    try {
      await api.post("/special-pickups", {
        address, lat: parseFloat(lat), lng: parseFloat(lng),
        waste_type: wasteType, notes, preferred_date: date,
      });
      toast.success("Solicitud creada");
      onCreated();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Error");
    }
    setSaving(false);
  };

  return (
    <Modal title="Recogida especial" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <div className="rc-label mb-2">Tipo de residuo</div>
          <div className="grid grid-cols-3 gap-2">
            {WASTE_TYPES.map((w) => (
              <button
                key={w.v}
                data-testid={`waste-type-${w.v}`}
                onClick={() => setWasteType(w.v)}
                className={`py-2 text-[11px] uppercase tracking-widest font-bold border ${
                  wasteType === w.v ? "bg-[#0a0a0a] text-white border-[#0a0a0a]" : "bg-white border-black/15"
                }`}
              >
                {w.l}
              </button>
            ))}
          </div>
        </div>
        <Field label="Dirección">
          <input data-testid="pickup-address-input" className="w-full py-2 outline-none" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitud">
            <input data-testid="pickup-lat-input" type="number" step="0.0001" className="w-full py-2 outline-none font-mono-rc" value={lat} onChange={(e) => setLat(e.target.value)} />
          </Field>
          <Field label="Longitud">
            <input data-testid="pickup-lng-input" type="number" step="0.0001" className="w-full py-2 outline-none font-mono-rc" value={lng} onChange={(e) => setLng(e.target.value)} />
          </Field>
        </div>
        <Field label="Fecha preferida">
          <input data-testid="pickup-date-input" type="date" className="w-full py-2 outline-none font-mono-rc" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Notas (opcional)">
          <textarea data-testid="pickup-notes-input" rows={3} className="w-full py-2 outline-none resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sofá de 2 plazas y dos cajas..." />
        </Field>
        <div className="flex gap-2">
          <button data-testid="pickup-submit-button" onClick={save} disabled={saving} className="bg-[#ff5a00] hover:bg-[#e04f00] text-white px-5 py-3 text-xs uppercase tracking-widest font-bold disabled:opacity-50">
            {saving ? "Enviando..." : "Enviar solicitud"}
          </button>
          <button onClick={onClose} className="px-5 py-3 text-xs uppercase tracking-widest font-bold border border-black/15">
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
};

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white border border-black/10 w-full max-w-lg" onClick={(e) => e.stopPropagation()} data-testid="modal">
      <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
        <h3 className="font-display font-black text-xl tracking-tight">{title}</h3>
        <button onClick={onClose} data-testid="modal-close" className="p-1 hover:bg-black hover:text-white"><X size={18} /></button>
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

export default ResidentDashboard;
