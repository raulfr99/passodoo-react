import React, { useState, useMemo } from 'react';
import { verificarNip } from '../../services/clientesApi';
import DescontarLlamadasForm from '../common/DescontarLlamadasForm';

const INPUT_CLS =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition';

function Spinner({ size = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${size}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function formatDateDMY(iso) {
  if (!iso) return '-';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function isDateOnOrAfterToday(iso) {
  if (!iso) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  return d.getTime() >= today.getTime();
}

function diasRestantes(iso) {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function Badge({ children, className }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function MetricCard({ label, value, color }) {
  const map = {
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    green: 'bg-green-50 border-green-200 text-green-900',
  };
  return (
    <div className={`border rounded-xl p-3 ${map[color] || map.gray}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold leading-tight mt-0.5">{value}</p>
    </div>
  );
}

function RegistroActivoCard({ c, onLlamadasChange }) {
  const total = Number(c.totalLlamadas) || 0;
  const realizadas = Number(c.totalRealizadas) || 0;
  const disponibles = total - realizadas;
  const dispColor = disponibles <= 0 ? 'red' : disponibles <= 2 ? 'amber' : 'green';
  const dias = diasRestantes(c.finSuscripcion);

  return (
    <div className="border-2 border-indigo-200 bg-indigo-50/40 rounded-2xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Registro activo</p>
          <p className="text-lg font-bold text-gray-800 break-words leading-tight">{c.nombre || '-'}</p>
          {c.empresa && c.empresa !== c.nombre && (
            <p className="text-sm text-gray-600 break-words">{c.empresa}</p>
          )}
        </div>
        <Badge className="bg-green-100 text-green-700 flex-shrink-0">Activo</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="Total" value={total} color="blue" />
        <MetricCard label="Realizadas" value={realizadas} color="gray" />
        <MetricCard label="Disponibles" value={disponibles} color={dispColor} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-white border border-gray-200 rounded-lg p-2.5">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Inicio</p>
          <p className="font-medium text-gray-800">{formatDateDMY(c.iniSuscripcion)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-2.5">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Fin</p>
          <p className="font-medium text-gray-800">{formatDateDMY(c.finSuscripcion)}</p>
          {dias !== null && (
            <p className={`text-[11px] mt-0.5 ${dias < 0 ? 'text-red-600' : dias <= 7 ? 'text-amber-600' : 'text-gray-500'}`}>
              {dias < 0 ? `Vencida hace ${Math.abs(dias)} día(s)` : `Faltan ${dias} día(s)`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RegistroInactivoCard({ c }) {
  const total = Number(c.totalLlamadas) || 0;
  const realizadas = Number(c.totalRealizadas) || 0;
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-700 break-words leading-tight">{c.nombre || '-'}</p>
          {c.empresa && c.empresa !== c.nombre && (
            <p className="text-xs text-gray-500 break-words">{c.empresa}</p>
          )}
        </div>
        <Badge className="bg-gray-100 text-gray-500 flex-shrink-0">Inactivo</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
        <div><span className="text-gray-400">Total:</span> <span className="font-semibold">{total}</span></div>
        <div><span className="text-gray-400">Real.:</span> <span className="font-semibold">{realizadas}</span></div>
        <div><span className="text-gray-400">Fin:</span> <span className="font-semibold">{formatDateDMY(c.finSuscripcion)}</span></div>
      </div>
    </div>
  );
}

export default function DescontarLlamadas() {
  const [nipInput, setNipInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleBuscar = async (e) => {
    e.preventDefault();
    const nip = nipInput.trim();
    if (!nip) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(false);
    try {
      const resp = await verificarNip(nip);
      if (!resp.exists) {
        setError('No se encontró el NIP.');
      } else {
        setResults(resp.data || []);
      }
      setSearched(true);
    } catch (err) {
      setError(err.message);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const activos = useMemo(
    () => results.filter((c) => c.estado === 'Activo' && isDateOnOrAfterToday(c.finSuscripcion)),
    [results]
  );
  const inactivos = useMemo(
    () => results.filter((c) => !(c.estado === 'Activo' && isDateOnOrAfterToday(c.finSuscripcion))),
    [results]
  );

  const registroActivo = activos.length === 1 ? activos[0] : null;
  const varios = activos.length > 1;

  const handleDescuentoOk = (detalles) => {
    if (!registroActivo) return;
    setResults((prev) =>
      prev.map((c) =>
        c.llaveUnica === registroActivo.llaveUnica
          ? {
              ...c,
              totalRealizadas: detalles.TOTLLAREA_nuevo ?? (Number(c.totalRealizadas) || 0) + 0,
              totalLlamadas: detalles.TOTNUMLLA ?? c.totalLlamadas,
            }
          : c
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border-l-4 border-indigo-400 px-4 py-3 rounded-r-lg text-sm text-indigo-800">
        <p className="font-medium mb-0.5">Descontar llamadas</p>
        <p className="text-xs">Busca el NIP, revisa el registro activo y registra el descuento.</p>
      </div>

      <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={nipInput}
          onChange={(e) => setNipInput(e.target.value.replace(/\D/g, ''))}
          placeholder="NIP (solo números)"
          disabled={loading}
          className={INPUT_CLS + ' flex-1'}
        />
        <button
          type="submit"
          disabled={loading || !nipInput.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg text-sm transition flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {loading && <Spinner />}
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {searched && !error && results.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          No hay registros para este NIP.
        </div>
      )}

      {searched && !error && results.length > 0 && !registroActivo && !varios && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          Este NIP no tiene una suscripción activa.
        </div>
      )}

      {varios && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          Este NIP tiene más de un registro activo; no se puede descontar hasta revisarlo.
        </div>
      )}

      {registroActivo && (
        <>
          <RegistroActivoCard c={registroActivo} onLlamadasChange={handleDescuentoOk} />
          <DescontarLlamadasForm
            nip={nipInput.trim()}
            nombre={registroActivo.nombre}
            totnumlla={registroActivo.totalLlamadas}
            totllarea={registroActivo.totalRealizadas}
            estado={registroActivo.estado}
            finSuscripcion={registroActivo.finSuscripcion}
            origen="tab"
            onSuccess={handleDescuentoOk}
          />
        </>
      )}

      {inactivos.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Otros registros (inactivos)
          </h3>
          <div className="space-y-2">
            {inactivos.map((c) => (
              <RegistroInactivoCard key={c.llaveUnica} c={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
