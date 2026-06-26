import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Truck, MapPin, Clock, AlertTriangle, Sparkles } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#0a0a0a]">
      {/* Top bar */}
      <header className="border-b border-black/10 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#0a0a0a] flex items-center justify-center">
              <Truck size={18} strokeWidth={2.5} className="text-[#ff5a00]" />
            </div>
            <div className="leading-none">
              <div className="font-display font-black text-xl tracking-tight">RECOLECTA</div>
              <div className="text-[10px] tracking-[0.3em] text-neutral-500 mt-0.5">CIVIC OPS · MX</div>
            </div>
          </div>
          <Link
            to="/login"
            data-testid="header-login-cta"
            className="px-4 py-2 bg-[#0a0a0a] text-white text-xs uppercase tracking-widest font-bold hover:bg-[#ff5a00] transition-colors"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-black/10">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-7">
            <div className="rc-label mb-6" data-testid="hero-eyebrow">
              ● Operación civica en tiempo real
            </div>
            <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[0.95]">
              UBER PARA<br />
              LA <span className="bg-[#ff5a00] text-white px-3 inline-block">BASURA.</span>
            </h1>
            <p className="mt-8 text-lg text-neutral-700 max-w-xl leading-relaxed">
              Sigue en vivo el camión recolector, recibe el ETA exacto, y agenda recogidas
              especiales para basura voluminosa, escombros o electrónicos. Sin filas, sin
              horarios sorpresa, sin esquinas llenas.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/login"
                data-testid="hero-cta-primary"
                className="group inline-flex items-center gap-3 bg-[#ff5a00] hover:bg-[#e04f00] text-white px-6 py-4 font-bold uppercase tracking-widest text-sm"
              >
                Empezar ahora
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#how"
                data-testid="hero-cta-secondary"
                className="inline-flex items-center gap-3 border border-black/20 hover:bg-black hover:text-white px-6 py-4 font-bold uppercase tracking-widest text-sm transition-colors"
              >
                Cómo funciona
              </a>
            </div>

            <div className="mt-12 flex flex-wrap gap-8">
              <Metric value="2.4M" label="Kg / mes" />
              <Metric value="98%" label="Puntualidad" />
              <Metric value="< 60s" label="Update GPS" />
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[4/5] border border-black/10 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1635691315495-ff39debe5764?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBnYXJiYWdlJTIwdHJ1Y2slMjBjaXR5fGVufDB8fHx8MTc4MjUwNTMzN3ww&ixlib=rb-4.1.0&q=85"
                alt="Camión de basura moderno"
                className="absolute inset-0 w-full h-full object-cover grayscale contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/40 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <div className="text-[10px] tracking-[0.3em] uppercase opacity-80">Unidad CDMX-001</div>
                <div className="font-display font-black text-2xl mt-1">ETA · 8 min</div>
              </div>
              <div className="absolute top-4 right-4 bg-[#ff5a00] text-white text-[10px] font-black uppercase tracking-widest px-2 py-1">
                En ruta
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 w-24 h-24 rc-stripe" aria-hidden="true" />
          </div>
        </div>

        {/* Ticker */}
        <div className="bg-[#0a0a0a] text-white overflow-hidden border-y border-black">
          <div className="ticker-track py-3 whitespace-nowrap">
            {Array(2).fill(null).map((_, i) => (
              <span key={i} className="font-display font-bold uppercase tracking-[0.3em] text-sm mx-8">
                ◆ Residente: ETA en vivo ◆ Conductor: Ruta del día ◆ Admin: Centro de mando ◆
                Solicita recogida especial ◆ Notificaciones automáticas ◆ Basura orgánica + inorgánica ◆
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-black/10">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="rc-label mb-4">Tres roles. Un mismo sistema.</div>
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tight max-w-3xl">
            Cada actor de la ciudad tiene su propia vista.
          </h2>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
            <RoleCard
              tag="01 / Residente"
              title="Sabe a qué hora llega"
              points={[
                "Mapa en vivo del camión",
                "ETA dinámico por dirección",
                "Notificaciones automáticas",
                "Agenda recogidas especiales",
              ]}
              accent="#ff5a00"
              testid="role-card-resident"
            />
            <RoleCard
              tag="02 / Conductor"
              title="Ruta clara, paso por paso"
              points={[
                "Lista ordenada de paradas",
                "Marcar como recolectado",
                "Compartir GPS en vivo",
                "Ver recogidas especiales",
              ]}
              accent="#0a0a0a"
              testid="role-card-driver"
            />
            <RoleCard
              tag="03 / Admin Municipal"
              title="Centro de control total"
              points={[
                "KPIs operativos del día",
                "Flota y rutas en vivo",
                "Cola de solicitudes",
                "Asignación de camiones",
              ]}
              accent="#002fa7"
              testid="role-card-admin"
            />
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-b border-black/10">
        <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-4 gap-6">
          <Feature icon={<MapPin size={22} />} title="Tracking en vivo" desc="GPS del camión actualizado en segundos." />
          <Feature icon={<Clock size={22} />} title="ETA preciso" desc="Tiempo estimado calculado por proximidad real." />
          <Feature icon={<AlertTriangle size={22} />} title="Recogida especial" desc="Bulky, escombros, electrónicos, peligrosos." />
          <Feature icon={<Sparkles size={22} />} title="Cero papeles" desc="Todo digital, todo trazable, todo auditable." />
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#0a0a0a] text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="rc-label" style={{ color: "#ff5a00" }}>Tu colonia merece esto</div>
            <h3 className="font-display font-black text-4xl md:text-5xl tracking-tight mt-3">
              Empieza con un número de teléfono.
            </h3>
            <p className="text-neutral-400 mt-5 max-w-lg">
              Sin contraseñas. Recibe un código de 6 dígitos, elige tu rol, y listo.
            </p>
          </div>
          <div className="md:justify-self-end">
            <Link
              to="/login"
              data-testid="footer-cta"
              className="inline-flex items-center gap-3 bg-[#ff5a00] hover:bg-[#e04f00] px-8 py-5 font-bold uppercase tracking-widest text-sm"
            >
              Crear mi acceso <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-5 text-xs text-neutral-500 flex flex-wrap items-center justify-between gap-3">
            <span>© {new Date().getFullYear()} Recolecta · Civic Ops</span>
            <span className="font-mono-rc">v1.0 · build {new Date().toISOString().slice(0, 10)}</span>
          </div>
        </div>
      </section>
    </div>
  );
};

const Metric = ({ value, label }) => (
  <div>
    <div className="font-display font-black text-3xl tracking-tight">{value}</div>
    <div className="rc-label mt-1">{label}</div>
  </div>
);

const RoleCard = ({ tag, title, points, accent, testid }) => (
  <div className="rc-card p-6 hover:-translate-y-1 transition-transform group" data-testid={testid}>
    <div className="flex items-center justify-between">
      <span className="rc-label">{tag}</span>
      <span className="w-3 h-3" style={{ background: accent }} />
    </div>
    <h3 className="font-display font-black text-2xl mt-4 tracking-tight">{title}</h3>
    <ul className="mt-5 space-y-2">
      {points.map((p, i) => (
        <li key={i} className="flex gap-3 text-sm text-neutral-700">
          <span className="font-mono-rc text-neutral-400">0{i + 1}</span>
          <span>{p}</span>
        </li>
      ))}
    </ul>
  </div>
);

const Feature = ({ icon, title, desc }) => (
  <div className="border-l-2 border-[#ff5a00] pl-4">
    <div className="text-[#ff5a00]">{icon}</div>
    <div className="font-display font-bold text-lg mt-3">{title}</div>
    <p className="text-sm text-neutral-600 mt-1">{desc}</p>
  </div>
);

export default Landing;
