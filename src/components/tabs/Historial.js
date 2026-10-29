import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { consultarHistorial } from '../../services/historialService';

const INPUT_CLS =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition';

const RESULTADO_STYLES = {
  EXITO: 'bg-green-100 text-green-700',
  PARCIAL: 'bg-amber-100 text-amber-700',
  ERROR: 'bg-red-100 text-red-700',
};

const ACCION_LABELS = {
  GENERAR_NIP: 'Generar NIP',
  EDITAR_NIP: 'Editar NIP',
  ELIMINAR_NIP: 'Eliminar NIP',
  FUSIONAR_CONTACTOS: 'Fusionar contactos',
};

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function DetalleModal({ registro, onClose }) {
  if (!registro) return null;
  const pretty = JSON.stringify(registro.detalle ?? {}, null, 2);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="bg-blue-600 rounded-t-2xl px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h3 className="font-semibold text-white">Detalle de la acción</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-4 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Correo:</span> <span className="font-medium">{registro.email}</span></div>
            <div><span className="text-gray-500">Entorno:</span> <span className="font-medium">{registro.entorno}</span></div>
            <div><span className="text-gray-500">Módulo:</span> <span className="font-medium">{registro.modulo}</span></div>
            <div><span className="text-gray-500">Acción:</span> <span className="font-medium">{ACCION_LABELS[registro.accion] || registro.accion}</span></div>
            <div><span className="text-gray-500">Resultado:</span> <span className="font-medium">{registro.resultado}</span></div>
            <div><span className="text-gray-500">Fecha:</span> <span className="font-medium">{registro.fechaLocal}</span></div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Detalle</p>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap break-words">{pretty}</pre>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Historial() {
  const [filters, setFilters] = useState({ modulo: '', email: '', entorno: '' });
  const [applied, setApplied] = useState({ modulo: '', email: '' });
  const [registros, setRegistros] = useState([]);
  const [nextKeys, setNextKeys] = useState({ NIPS: null, CONTACTOS: null, single: null });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [mode, setMode] = useState('both');

  const dedupe = (list) => {
    const seen = new Set();
    return list.filter((r) => {
      const key = r.id || `${r.email}-${r.fechaHora}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const sortDesc = (list) => [...list].sort((a, b) => String(b.fechaHora).localeCompare(String(a.fechaHora)));

  const load = useCallback(async ({ modulo, email, reset }) => {
    setError(null);
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      if (email) {
        const resp = await consultarHistorial({ email, modulo: modulo || undefined, lastKey: reset ? null : nextKeys.single });
        const nuevos = resp.data || [];
        setRegistros((prev) => sortDesc(dedupe(reset ? nuevos : [...prev, ...nuevos])));
        setNextKeys({ NIPS: null, CONTACTOS: null, single: resp.nextKey || null });
        setMode('single');
      } else if (modulo) {
        const resp = await consultarHistorial({ modulo, lastKey: reset ? null : nextKeys.single });
        const nuevos = resp.data || [];
        setRegistros((prev) => sortDesc(dedupe(reset ? nuevos : [...prev, ...nuevos])));
        setNextKeys({ NIPS: null, CONTACTOS: null, single: resp.nextKey || null });
        setMode('single');
      } else {
        const curNips = reset ? null : nextKeys.NIPS;
        const curCon = reset ? null : nextKeys.CONTACTOS;
        const fetches = [];
        if (reset || curNips) fetches.push(consultarHistorial({ modulo: 'NIPS', lastKey: curNips }).then((r) => ({ k: 'NIPS', r })));
        if (reset || curCon) fetches.push(consultarHistorial({ modulo: 'CONTACTOS', lastKey: curCon }).then((r) => ({ k: 'CONTACTOS', r })));
        const results = await Promise.all(fetches);
        const nuevos = results.flatMap((x) => x.r.data || []);
        setRegistros((prev) => sortDesc(dedupe(reset ? nuevos : [...prev, ...nuevos])));
        const newKeys = { NIPS: reset ? null : curNips, CONTACTOS: reset ? null : curCon, single: null };
        results.forEach((x) => { newKeys[x.k] = x.r.nextKey || null; });
        setNextKeys(newKeys);
        setMode('both');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [nextKeys]);

  useEffect(() => {
    load({ modulo: '', email: '', reset: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = (e) => {
    e.preventDefault();
    const next = { modulo: filters.modulo, email: filters.email.trim() };
    setApplied(next);
    load({ ...next, reset: true });
  };

  const handleClear = () => {
    setFilters({ modulo: '', email: '', entorno: '' });
    setApplied({ modulo: '', email: '' });
    load({ modulo: '', email: '', reset: true });
  };

  const handleLoadMore = () => {
    load({ ...applied, reset: false });
  };

  const canLoadMore = mode === 'single' ? !!nextKeys.single : !!(nextKeys.NIPS || nextKeys.CONTACTOS);

  const displayed = useMemo(() => {
    let list = registros;
    if (applied.modulo) list = list.filter((r) => r.modulo === applied.modulo);
    if (filters.entorno) list = list.filter((r) => r.entorno === filters.entorno);
    return list;
  }, [registros, applied.modulo, filters.entorno]);

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-4">
      <form onSubmit={handleApply} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Módulo</label>
            <select value={filters.modulo} onChange={setFilter('modulo')} className={INPUT_CLS + ' bg-white'}>
              <option value="">Todos</option>
              <option value="NIPS">NIPS</option>
              <option value="CONTACTOS">CONTACTOS</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Correo</label>
            <input
              type="text"
              value={filters.email}
              onChange={setFilter('email')}
              placeholder="correo@idconline.mx"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Entorno</label>
            <select value={filters.entorno} onChange={setFilter('entorno')} className={INPUT_CLS + ' bg-white'}>
              <option value="">Todos</option>
              <option value="DEV">DEV</option>
              <option value="PROD">PROD</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg text-sm transition flex items-center justify-center gap-2"
          >
            {loading && <Spinner />}
            {loading ? 'Cargando...' : 'Aplicar filtros'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Limpiar
          </button>
        </div>
      </form>

      {error && (
        <div className="flex items-start gap-3 border border-red-200 bg-red-50 rounded-lg px-4 py-3 text-sm text-red-700">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && displayed.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-6">Sin registros.</p>
      )}

      {displayed.length > 0 && (
        <div className="overflow-x-auto -mx-1">
          <p className="text-xs text-gray-500 mb-2 px-1">{displayed.length} registro(s)</p>
          <table className="w-full text-sm border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 py-2 px-2">Fecha</th>
                <th className="text-left text-xs font-semibold text-gray-500 py-2 px-2">Día</th>
                <th className="text-left text-xs font-semibold text-gray-500 py-2 px-2">Correo</th>
                <th className="text-left text-xs font-semibold text-gray-500 py-2 px-2">Módulo</th>
                <th className="text-left text-xs font-semibold text-gray-500 py-2 px-2">Acción</th>
                <th className="text-left text-xs font-semibold text-gray-500 py-2 px-2">Resultado</th>
                <th className="text-left text-xs font-semibold text-gray-500 py-2 px-2">Entorno</th>
                <th className="text-right text-xs font-semibold text-gray-500 py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((r) => (
                <tr key={r.id || `${r.email}-${r.fechaHora}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 px-2 text-xs text-gray-700 whitespace-nowrap">{r.fechaLocal}</td>
                  <td className="py-2.5 px-2 text-xs text-gray-500 capitalize whitespace-nowrap">{r.dia}</td>
                  <td className="py-2.5 px-2 text-xs text-gray-800 truncate max-w-[180px]">{r.email}</td>
                  <td className="py-2.5 px-2 text-xs text-gray-700 whitespace-nowrap">{r.modulo}</td>
                  <td className="py-2.5 px-2 text-xs text-gray-700 whitespace-nowrap">{ACCION_LABELS[r.accion] || r.accion}</td>
                  <td className="py-2.5 px-2 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${RESULTADO_STYLES[r.resultado] || 'bg-gray-100 text-gray-700'}`}>
                      {r.resultado}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-xs text-gray-700 whitespace-nowrap">{r.entorno}</td>
                  <td className="py-2.5 px-2 text-right">
                    <button
                      onClick={() => setDetalle(r)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium transition whitespace-nowrap"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {canLoadMore && (
            <div className="flex justify-center mt-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition flex items-center gap-2 disabled:opacity-50"
              >
                {loadingMore && <Spinner />}
                {loadingMore ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </div>
      )}

      {detalle && <DetalleModal registro={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}
