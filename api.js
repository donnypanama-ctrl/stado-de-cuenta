const SUPABASE_URL = "https://ilhfppvpwtqthlxtovhv.supabase.co";
const SUPABASE_KEY = "sb_publishable_syNGXn1rROFbKQQ0Zsq0TA_59vqTHAV";

async function rpc(fn, args) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((data && data.message) || "Error de conexión");
  return data;
}

const money = (n) =>
  Number(n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Los conceptos importados del Excel se muestran más limpios
const concepto = (c) => {
  c = String(c || "Préstamo");
  if (/^ajuste para cuadrar/i.test(c)) return "Ajuste";
  return c.replace(/\s*\(del excel\)\s*/i, "");
};

const fecha = (d) => {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
};

const hoyISO = () => {
  const t = new Date();
  return new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// Resumen de una cuenta: saldo, % pagado y estado del próximo vencimiento
function resumen(p) {
  const saldo = Math.max(0, Number(p.total_deuda) - Number(p.total_abonado));
  const pct = p.total_deuda > 0 ? Math.min(100, (p.total_abonado / p.total_deuda) * 100) : 0;
  const venc = p.deudas.map((d) => d.vence).filter(Boolean).sort();
  const hoy = hoyISO();
  let proximo = null, estado = "ok";
  if (saldo > 0 && venc.length) {
    proximo = venc.find((v) => v >= hoy) || venc[venc.length - 1];
    if (venc.some((v) => v < hoy)) estado = "bad";
    else {
      const dias = (new Date(proximo) - new Date(hoy)) / 86400000;
      estado = dias <= 7 ? "warn" : "ok";
    }
  }
  if (saldo === 0 && p.total_deuda > 0) estado = "pagado";
  return { saldo, pct, proximo, estado, vencido: estado === "bad" };
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
