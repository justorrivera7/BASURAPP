import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Truck, ArrowLeft, Phone, ShieldCheck, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const nav = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState(1); // 1: phone, 2: code (+name/role if new)
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("resident");
  const [mockCode, setMockCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewFields, setShowNewFields] = useState(false);

  const requestOtp = async () => {
    if (!phone || phone.length < 6) {
      toast.error("Ingresa un número de teléfono válido");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/request-otp", { phone });
      setMockCode(data.mock_code);
      setStep(2);
      toast.success(`Código enviado (modo demo): ${data.mock_code}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Error al solicitar OTP");
    }
    setLoading(false);
  };

  const verifyOtp = async () => {
    if (code.length < 4) {
      toast.error("Ingresa el código completo");
      return;
    }
    setLoading(true);
    try {
      const body = { phone, code };
      if (showNewFields) {
        body.name = name;
        body.role = role;
      }
      const { data } = await api.post("/auth/verify-otp", body);
      login(data.token, data.user);
      toast.success(`Bienvenido, ${data.user.name}`);
      nav(roleHome(data.user.role));
    } catch (e) {
      const detail = e?.response?.data?.detail;
      if (detail && detail.includes("first signup")) {
        setShowNewFields(true);
        toast.message("Usuario nuevo: completa nombre y rol");
      } else {
        toast.error(detail || "Código inválido");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Visual side */}
      <div className="hidden lg:block relative bg-[#0a0a0a] text-white">
        <img
          src="https://images.unsplash.com/photo-1498141321056-776a06214e24?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NDh8MHwxfHNlYXJjaHwxfHxjbGVhbiUyMGNpdHklMjBtYXAlMjB0b3AlMjBkb3duJTIwdmlld3xlbnwwfHx8fDE3ODI1MDUzMzd8MA&ixlib=rb-4.1.0&q=85"
          alt="Vista aérea de ciudad"
          className="absolute inset-0 w-full h-full object-cover grayscale opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-between p-12">
          <Link to="/" data-testid="login-back-home" className="inline-flex items-center gap-2 text-sm uppercase tracking-widest font-bold hover:text-[#ff5a00]">
            <ArrowLeft size={16} /> Volver
          </Link>
          <div>
            <div className="rc-label" style={{ color: "#ff5a00" }}>Recolecta · Acceso</div>
            <div className="font-display font-black text-6xl tracking-tight leading-[0.95] mt-4">
              Tu colonia,<br />en tiempo real.
            </div>
            <p className="text-neutral-400 mt-6 max-w-md">
              Modo demo: el código OTP se muestra en pantalla. Sin SMS, sin costo.
            </p>
          </div>
          <div className="font-mono-rc text-xs text-neutral-500">DEMO BUILD · NO SMS PROVIDER · OTP ON SCREEN</div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-[#fafafa]">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-[#0a0a0a] flex items-center justify-center">
              <Truck size={18} strokeWidth={2.5} className="text-[#ff5a00]" />
            </div>
            <div className="font-display font-black text-xl tracking-tight">RECOLECTA</div>
          </div>

          <div className="rc-label" data-testid="login-step-label">
            {step === 1 ? "Paso 1 de 2" : "Paso 2 de 2"}
          </div>
          <h1 className="font-display font-black text-4xl tracking-tight mt-2">
            {step === 1 ? "Entra con tu teléfono." : "Verifica el código."}
          </h1>
          <p className="text-neutral-600 mt-2">
            {step === 1
              ? "Te enviamos un código de 6 dígitos (modo demo)."
              : `Código enviado al ${phone}. En demo, también lo verás aquí.`}
          </p>

          {step === 1 && (
            <div className="mt-10 space-y-5">
              <Field icon={<Phone size={16} />} label="Teléfono">
                <input
                  data-testid="login-phone-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5550000004"
                  className="w-full bg-transparent outline-none font-mono-rc text-lg py-2"
                  type="tel"
                  inputMode="numeric"
                />
              </Field>
              <button
                data-testid="login-request-otp-button"
                onClick={requestOtp}
                disabled={loading}
                className="w-full bg-[#ff5a00] hover:bg-[#e04f00] text-white py-4 font-bold uppercase tracking-widest text-sm disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Enviar código"}
              </button>

              <div className="border border-black/10 p-4 bg-white">
                <div className="rc-label mb-2">Cuentas demo</div>
                <div className="space-y-1 text-sm font-mono-rc">
                  <div>5550000001 · Admin</div>
                  <div>5550000002 · Conductor (Juan)</div>
                  <div>5550000004 · Residente (Carlos)</div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-10 space-y-5">
              {mockCode && (
                <div className="border-2 border-dashed border-[#ff5a00] bg-orange-50 px-4 py-3" data-testid="login-mock-code">
                  <div className="rc-label" style={{ color: "#ff5a00" }}>Código mock</div>
                  <div className="font-mono-rc font-bold text-2xl tracking-[0.3em]">{mockCode}</div>
                </div>
              )}
              <Field icon={<ShieldCheck size={16} />} label="Código de 6 dígitos">
                <input
                  data-testid="login-code-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-transparent outline-none font-mono-rc text-2xl tracking-[0.4em] py-2"
                  inputMode="numeric"
                />
              </Field>

              {showNewFields && (
                <>
                  <Field icon={<UserIcon size={16} />} label="Nombre completo">
                    <input
                      data-testid="login-name-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Carlos Vecino"
                      className="w-full bg-transparent outline-none text-base py-2"
                    />
                  </Field>
                  <div>
                    <div className="rc-label mb-2">Tu rol</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { v: "resident", l: "Residente" },
                        { v: "driver", l: "Conductor" },
                        { v: "admin", l: "Admin" },
                      ].map((r) => (
                        <button
                          key={r.v}
                          data-testid={`role-select-${r.v}`}
                          onClick={() => setRole(r.v)}
                          className={`py-3 text-xs uppercase tracking-widest font-bold border ${
                            role === r.v
                              ? "bg-[#0a0a0a] text-white border-[#0a0a0a]"
                              : "bg-white border-black/15 hover:border-black"
                          }`}
                        >
                          {r.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                data-testid="login-verify-button"
                onClick={verifyOtp}
                disabled={loading}
                className="w-full bg-[#0a0a0a] hover:bg-[#ff5a00] text-white py-4 font-bold uppercase tracking-widest text-sm disabled:opacity-50 transition-colors"
              >
                {loading ? "Verificando..." : "Verificar y entrar"}
              </button>

              <button
                onClick={() => { setStep(1); setCode(""); setShowNewFields(false); }}
                data-testid="login-change-phone"
                className="text-xs uppercase tracking-widest font-bold text-neutral-600 hover:text-black"
              >
                ← Cambiar teléfono
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Field = ({ icon, label, children }) => (
  <label className="block">
    <div className="rc-label mb-2 flex items-center gap-2">
      <span className="text-[#ff5a00]">{icon}</span>
      {label}
    </div>
    <div className="border border-black/20 bg-white px-4 focus-within:border-[#ff5a00]">
      {children}
    </div>
  </label>
);

const roleHome = (role) => {
  if (role === "admin") return "/admin";
  if (role === "driver") return "/driver";
  return "/resident";
};

export default Login;
