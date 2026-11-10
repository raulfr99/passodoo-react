import React, { useState, useMemo, useEffect } from 'react';
import { buscarClientes, actualizarCliente, eliminarCliente, obtenerLlamadas, verificarNip, cambiarNip, contarLlamadas, notificarCambioNip } from '../../services/clientesApi';
import { useOdooRpc } from '../../hooks/useOdooRpc';
import { registrarAccion, ENTORNO } from '../../services/historialService';

const INPUT_CLS =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition';

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function Alert({ type, message, onClear }) {
  React.useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClear, 5000);
    return () => clearTimeout(t);
  }, [message, onClear]);

  if (!message) return null;
  const cls =
    type === 'success'
      ? 'bg-green-50 border-green-200 text-green-700'
      : 'bg-red-50 border-red-200 text-red-700';
  return (
    <div className={`flex items-start gap-3 border rounded-lg px-4 py-3 text-sm ${cls}`}>
      {type === 'success' ? (
        <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
      <span>{message}</span>
    </div>
  );
}

function formatDate(str) {
  if (!str) return '-';
  const parts = str.split('-');
  if (parts.length !== 3) return str;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${parts[2]}/${months[parseInt(parts[1], 10) - 1]}/${parts[0]}`;
}

function buildForm(c) {
  return {
    NIP: c.nip != null ? String(c.nip) : '',
    NUMSUS: c.numSuscripcion ?? '',
    NOMSUS: c.nombre ?? '',
    NOMEMP: c.empresa ?? '',
    email: c.contactos?.email ?? '',
    INIPERSUS: c.iniSuscripcion ?? '',
    FINPERSUS: c.finSuscripcion ?? '',
    STATUS: c.estado === 'Activo' ? '1' : '0',
    NUMTELE1: c.contactos?.telefono1 ?? '',
    NUMTELE2: c.contactos?.telefono2 ?? '',
    NUMEXT1: c.contactos?.extension1 ?? '',
    NUMEXT2: c.contactos?.extension2 ?? '',
    NUMFAX: c.contactos?.fax ?? '',
    CALLE: c.direccion?.calle ?? '',
    COLONIA: c.direccion?.colonia ?? '',
    CODPOS: c.direccion?.codigoPostal ?? '',
    CIUDAD: c.direccion?.ciudad ?? '',
    ESTADO: c.direccion?.estado ?? '',
    TOTNUMLLA: c.totalLlamadas != null ? String(c.totalLlamadas) : '',
    TOTLLAREA: c.totalRealizadas != null ? String(c.totalRealizadas) : '',
    frec: c.frecuencia != null ? String(c.frecuencia) : '',
    producto: c.producto ?? '',
  };
}

function SectionTitle({ children }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{children}</p>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function EditModal({ cliente, onClose, onSaved, onGenerarNip }) {
  const initial = useMemo(() => buildForm(cliente), [cliente]);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const numericKeys = new Set(['TOTNUMLLA', 'TOTLLAREA', 'frec']);

  const handleSave = async () => {
    const campos = {};
    Object.keys(initial).forEach((key) => {
      const next = form[key];
      if (next === initial[key]) return;
      if (key === 'STATUS') {
        campos[key] = parseInt(next, 10);
      } else if (numericKeys.has(key)) {
        campos[key] = next === '' ? null : Number(next);
      } else {
        campos[key] = next === '' ? null : next;
      }
    });

    if (Object.keys(campos).length === 0) {
      setError('Sin cambios para guardar.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await actualizarCliente(cliente.llaveUnica, campos);
      const updated = Array.isArray(result.data) ? result.data[0] : result.data;
      registrarAccion({
        accion: 'EDITAR_NIP',
        modulo: 'NIPS',
        resultado: 'EXITO',
        detalle: {
          llaveUnica: cliente.llaveUnica,
          nip: cliente.nip,
          camposModificados: campos,
        },
      });
      onSaved(updated);
    } catch (err) {
      registrarAccion({
        accion: 'EDITAR_NIP',
        modulo: 'NIPS',
        resultado: 'ERROR',
        detalle: {
          llaveUnica: cliente.llaveUnica,
          nip: cliente.nip,
          camposIntentados: campos,
          error: err.message,
        },
      });
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="bg-blue-600 rounded-t-2xl px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h3 className="font-semibold text-white">Editar Cliente</h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-white/80 hover:text-white text-xl leading-none disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="px-6 pt-3 flex-shrink-0">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 break-all">
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Llave única</p>
            <p className="text-sm font-mono font-bold text-blue-800">{cliente.llaveUnica}</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          <div>
            <SectionTitle>Identificación</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="NIP">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={form.NIP}
                    readOnly
                    className={INPUT_CLS + ' bg-gray-50 text-gray-400 cursor-not-allowed'}
                  />
                  <button
                    type="button"
                    onClick={() => onGenerarNip && onGenerarNip(cliente)}
                    disabled={saving}
                    title="Generar un nuevo NIP automáticamente"
                    className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium transition whitespace-nowrap disabled:opacity-50"
                  >
                    Generar nuevo NIP
                  </button>
                </div>
              </Field>
              <Field label="Status">
                <select value={form.STATUS} onChange={set('STATUS')} className={INPUT_CLS + ' bg-white'}>
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </Field>
              <Field label="Núm. Suscripción">
                <input type="text" value={form.NUMSUS} onChange={set('NUMSUS')} className={INPUT_CLS} />
              </Field>
              <div className="col-span-2">
                <Field label="Nombre">
                  <input type="text" value={form.NOMSUS} onChange={set('NOMSUS')} className={INPUT_CLS} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Empresa">
                  <input type="text" value={form.NOMEMP} onChange={set('NOMEMP')} className={INPUT_CLS} />
                </Field>
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>Suscripción</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Inicio">
                <input type="date" value={form.INIPERSUS} onChange={set('INIPERSUS')} className={INPUT_CLS} />
              </Field>
              <Field label="Fin">
                <input type="date" value={form.FINPERSUS} onChange={set('FINPERSUS')} className={INPUT_CLS} />
              </Field>
              <Field label="Total Llamadas">
                <input type="number" value={form.TOTNUMLLA} onChange={set('TOTNUMLLA')} className={INPUT_CLS} />
              </Field>
              <Field label="Total Realizadas">
                <input type="number" value={form.TOTLLAREA} onChange={set('TOTLLAREA')} className={INPUT_CLS} />
              </Field>
            </div>
          </div>

          <div>
            <SectionTitle>Contacto</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Email">
                  <input type="email" value={form.email} onChange={set('email')} className={INPUT_CLS} />
                </Field>
              </div>
              <Field label="Teléfono 1">
                <input type="text" value={form.NUMTELE1} onChange={set('NUMTELE1')} className={INPUT_CLS} />
              </Field>
              <Field label="Teléfono 2">
                <input type="text" value={form.NUMTELE2} onChange={set('NUMTELE2')} className={INPUT_CLS} />
              </Field>
            </div>
          </div>

          <div>
            <SectionTitle>Dirección</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Calle">
                  <input type="text" value={form.CALLE} onChange={set('CALLE')} className={INPUT_CLS} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Colonia">
                  <input type="text" value={form.COLONIA} onChange={set('COLONIA')} className={INPUT_CLS} />
                </Field>
              </div>
              <Field label="Código Postal">
                <input type="text" value={form.CODPOS} onChange={set('CODPOS')} className={INPUT_CLS} />
              </Field>
              <Field label="Ciudad">
                <input type="text" value={form.CIUDAD} onChange={set('CIUDAD')} className={INPUT_CLS} />
              </Field>
              <div className="col-span-2">
                <Field label="Estado">
                  <input type="text" value={form.ESTADO} onChange={set('ESTADO')} className={INPUT_CLS} />
                </Field>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 justify-end flex-shrink-0">
          {error && <p className="text-sm text-red-600 flex-1">{error}</p>}
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium transition flex items-center gap-2"
          >
            {saving && <Spinner />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ cliente, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await eliminarCliente(cliente.llaveUnica);
      registrarAccion({
        accion: 'ELIMINAR_NIP',
        modulo: 'NIPS',
        resultado: 'EXITO',
        detalle: {
          llaveUnica: cliente.llaveUnica,
          nip: cliente.nip,
          nombre: cliente.nombre,
          empresa: cliente.empresa,
          email: cliente.contactos?.email || null,
        },
      });
      onDeleted(cliente.llaveUnica);
    } catch (err) {
      registrarAccion({
        accion: 'ELIMINAR_NIP',
        modulo: 'NIPS',
        resultado: 'ERROR',
        detalle: {
          llaveUnica: cliente.llaveUnica,
          nip: cliente.nip,
          error: err.message,
        },
      });
      setError(err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="bg-red-600 rounded-t-2xl px-6 py-4">
          <h3 className="font-semibold text-white">Eliminar Cliente</h3>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
            <strong>¡Advertencia!</strong> Esta acción no se puede deshacer. Se eliminará permanentemente este registro.
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-2">
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <span className="text-gray-500">Nombre:</span>
              <span className="font-medium text-gray-900">{cliente.nombre || '-'}</span>
              <span className="text-gray-500">Empresa:</span>
              <span className="font-medium text-gray-900">{cliente.empresa || '-'}</span>
              <span className="text-gray-500">NIP:</span>
              <span className="font-medium text-gray-900">{cliente.nip}</span>
              <span className="text-gray-500">Email:</span>
              <span className="font-medium text-gray-900 break-all">{cliente.contactos?.email || '-'}</span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <span className="text-xs text-gray-400">Llave única: </span>
              <span className="text-xs font-mono text-gray-600 break-all">{cliente.llaveUnica}</span>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex gap-2 px-6 pb-5 justify-end">
          <button
            onClick={onClose}
            disabled={deleting}
            autoFocus
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium transition flex items-center gap-2"
          >
            {deleting && <Spinner />}
            {deleting ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SortHeader({ children, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  return (
    <th className="py-3 px-3">
      <button
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition select-none ${active ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
      >
        {children}
        <span className="flex flex-col gap-px ml-0.5">
          <svg className={`w-2 h-1.5 ${active && sort.dir === 'asc' ? 'text-indigo-600' : 'text-gray-300'}`} viewBox="0 0 8 4" fill="currentColor">
            <path d="M4 0L8 4H0z" />
          </svg>
          <svg className={`w-2 h-1.5 ${active && sort.dir === 'desc' ? 'text-indigo-600' : 'text-gray-300'}`} viewBox="0 0 8 4" fill="currentColor">
            <path d="M4 4L0 0h8z" />
          </svg>
        </span>
      </button>
    </th>
  );
}

function LlamadasModal({ cliente, onClose }) {
  const [llamadas, setLlamadas] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ fecha: '', nombre: '', tema: '', numConsultas: '' });
  const [sort, setSort] = useState({ key: 'fecha', dir: 'desc' });

  React.useEffect(() => {
    let cancelled = false;
    obtenerLlamadas(cliente.nip)
      .then((data) => {
        if (cancelled) return;
        setLlamadas(data.data || []);
        setCount(data.count ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [cliente.nip]);

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const clearFilters = () => setFilters({ fecha: '', nombre: '', tema: '', numConsultas: '' });
  const hasFilters = Object.values(filters).some((v) => v !== '');

  const handleSort = (key) => {
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  const displayed = useMemo(() => {
    let list = [...llamadas];

    if (filters.fecha) list = list.filter((ll) => ll.fecha === filters.fecha);
    if (filters.nombre) {
      const q = filters.nombre.toLowerCase();
      list = list.filter((ll) => ll.nombre?.toLowerCase().includes(q));
    }
    if (filters.tema) {
      const q = filters.tema.toLowerCase();
      list = list.filter((ll) => ll.tema?.toLowerCase().includes(q));
    }
    if (filters.numConsultas !== '') {
      const n = Number(filters.numConsultas);
      list = list.filter((ll) => ll.numConsultas === n);
    }

    if (sort.key) {
      list.sort((a, b) => {
        let av, bv;
        if (sort.key === 'fecha') {
          av = `${a.fecha ?? ''}${a.hora ?? ''}`;
          bv = `${b.fecha ?? ''}${b.hora ?? ''}`;
        } else {
          av = a[sort.key];
          bv = b[sort.key];
        }
        if (typeof av === 'number' && typeof bv === 'number') {
          return sort.dir === 'asc' ? av - bv : bv - av;
        }
        const cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'es', { numeric: true });
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  }, [llamadas, filters, sort]);

  const FILTER_INPUT = 'w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-black/50">
      <div className="bg-white w-full sm:max-w-5xl flex flex-col h-[92dvh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-2xl">

        <div className="bg-indigo-600 rounded-t-2xl px-5 py-4 sm:px-6 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white text-base leading-tight">Historial de llamadas</h3>
              <p className="text-indigo-200 text-sm mt-0.5 truncate">{cliente.nombre}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="bg-indigo-500 border border-indigo-400 rounded-xl px-3 py-2 text-center min-w-[56px]">
                <span className="block text-white font-bold text-lg leading-none">{cliente.nip}</span>
                <span className="block text-indigo-200 text-xs leading-none mt-0.5">NIP</span>
              </div>
              {!loading && !error && (
                <div className="bg-white/15 border border-white/25 rounded-xl px-3 py-2 text-center min-w-[64px]">
                  <span className="block text-white font-bold text-lg leading-none">
                    {hasFilters ? <>{displayed.length}<span className="font-normal text-indigo-300 text-sm">/{count}</span></> : count}
                  </span>
                  <span className="block text-indigo-200 text-xs leading-none mt-0.5">llamada{count !== 1 ? 's' : ''}</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition ml-1"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {!loading && !error && llamadas.length > 0 && (
          <div className="flex-shrink-0 px-5 py-3 sm:px-6 border-b border-gray-100 bg-gray-50/80">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Fecha</label>
                <input type="date" value={filters.fecha} onChange={setFilter('fecha')} className={FILTER_INPUT} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Nombre</label>
                <input type="text" value={filters.nombre} onChange={setFilter('nombre')} placeholder="Buscar..." className={FILTER_INPUT} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Tema</label>
                <input type="text" value={filters.tema} onChange={setFilter('tema')} placeholder="Buscar..." className={FILTER_INPUT} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">No. Consultas</label>
                <div className="flex gap-1">
                  <input type="number" min="0" value={filters.numConsultas} onChange={setFilter('numConsultas')} placeholder="Exacto" className={FILTER_INPUT} />
                  {hasFilters && (
                    <button
                      onClick={clearFilters}
                      title="Limpiar filtros"
                      className="flex-shrink-0 w-8 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-200 transition text-sm font-medium"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-5 py-4 sm:px-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <Spinner />
              <span className="text-sm">Cargando llamadas...</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-3 border border-red-200 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && llamadas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <p className="text-sm">Este cliente no tiene llamadas registradas.</p>
            </div>
          )}

          {!loading && !error && llamadas.length > 0 && displayed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              <p className="text-sm">Sin resultados con los filtros actuales.</p>
              <button onClick={clearFilters} className="mt-2 text-xs text-indigo-600 hover:underline">Limpiar filtros</button>
            </div>
          )}

          {!loading && !error && displayed.length > 0 && (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm border-collapse table-fixed min-w-[640px]">
                <colgroup>
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '31%' }} />
                  <col style={{ width: '18%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <SortHeader sortKey="nip" sort={sort} onSort={handleSort}>NIP</SortHeader>
                    <SortHeader sortKey="usuario" sort={sort} onSort={handleSort}>Usuario</SortHeader>
                    <SortHeader sortKey="nombre" sort={sort} onSort={handleSort}>Nombre</SortHeader>
                    <SortHeader sortKey="numConsultas" sort={sort} onSort={handleSort}>No. Consultas</SortHeader>
                    <SortHeader sortKey="tema" sort={sort} onSort={handleSort}>Tema</SortHeader>
                    <SortHeader sortKey="fecha" sort={sort} onSort={handleSort}>Fecha y hora</SortHeader>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((ll) => (
                    <tr key={ll.id} className="border-b border-gray-100 hover:bg-indigo-50/50 transition-colors">
                      <td className="py-3 px-3 text-sm font-mono font-bold text-indigo-700">{ll.nip}</td>
                      <td className="py-3 px-3 text-sm font-medium text-gray-700 truncate">{ll.usuario}</td>
                      <td className="py-3 px-3 text-sm text-gray-800">{ll.nombre}</td>
                      <td className="py-3 px-3 text-sm font-semibold text-gray-700 text-center">{ll.numConsultas ?? '-'}</td>
                      <td className="py-3 px-3">
                        <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full break-words">{ll.tema}</span>
                      </td>
                      <td className="py-3 px-3 text-sm">
                        <span className="font-semibold text-gray-800">{ll.fecha}</span>
                        <span className="text-gray-400 ml-1.5">{ll.hora}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-5 py-4 sm:px-6 border-t border-gray-100 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function StepsList({ steps }) {
  if (!steps || steps.length === 0) return null;
  const iconFor = (status) => {
    if (status === 'running') return <Spinner />;
    if (status === 'ok') return <span className="text-green-600">✅</span>;
    if (status === 'error') return <span className="text-red-600">❌</span>;
    if (status === 'info') return <span className="text-blue-600">ℹ️</span>;
    return <span className="text-gray-300">⏳</span>;
  };
  const textCls = (status) => {
    if (status === 'running') return 'text-gray-800';
    if (status === 'ok') return 'text-gray-700';
    if (status === 'error') return 'text-red-700';
    if (status === 'info') return 'text-blue-700';
    return 'text-gray-400';
  };
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
      {steps.map((s) => (
        <div key={s.key} className="flex items-start gap-2 text-sm">
          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">{iconFor(s.status)}</span>
          <div className={`min-w-0 flex-1 ${textCls(s.status)}`}>
            <p className="leading-tight">{s.label}</p>
            {s.note && <p className="text-xs text-gray-500 mt-0.5 break-words">{s.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function esEmailValido(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

function extraerDestinatarios(sqlRecords) {
  const seen = new Map();
  for (const c of sqlRecords || []) {
    const rawEmail = c?.contactos?.email || c?.email || c?.EMAIL || '';
    const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
    if (!esEmailValido(email)) continue;
    const nombre = c?.nombre || c?.empresa || c?.NOMSUS || c?.NOMEMP || email;
    const llaveUnica = c?.llaveUnica || null;
    const key = email.toLowerCase();
    if (!seen.has(key)) seen.set(key, { email, nombre, llaveUnica });
  }
  return [...seen.values()];
}

function NotificacionPanel({ sqlRecords, nipAnterior, nipNuevo, onBusyChange }) {
  const destinatarios = useMemo(() => extraerDestinatarios(sqlRecords), [sqlRecords]);
  const [selected, setSelected] = useState(() => {
    const init = {};
    const first = extraerDestinatarios(sqlRecords)[0];
    if (first) init[first.email.toLowerCase()] = true;
    return init;
  });
  const [statuses, setStatuses] = useState({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (onBusyChange) onBusyChange(enviando);
  }, [enviando, onBusyChange]);

  if (destinatarios.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
        <p className="font-semibold text-gray-800 mb-1">¿Quieres notificar al cliente?</p>
        <p className="text-xs">El cliente no tiene correo registrado.</p>
      </div>
    );
  }

  const toggle = (email) => {
    if (enviando) return;
    const k = email.toLowerCase();
    setSelected((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const previewNombre = (() => {
    const first = destinatarios.find((d) => selected[d.email.toLowerCase()]) || destinatarios[0];
    return first?.nombre || '<nombre>';
  })();

  const pendientesSeleccionados = destinatarios.filter(
    (d) => selected[d.email.toLowerCase()] && statuses[d.email.toLowerCase()]?.status !== 'sent'
  );
  const haySelecciones = destinatarios.some((d) => selected[d.email.toLowerCase()]);
  const puedeEnviar = !enviando && pendientesSeleccionados.length > 0;
  const hayFallidos = destinatarios.some(
    (d) => selected[d.email.toLowerCase()] && statuses[d.email.toLowerCase()]?.status === 'error'
  );
  const todosOk = haySelecciones && destinatarios.every(
    (d) => !selected[d.email.toLowerCase()] || statuses[d.email.toLowerCase()]?.status === 'sent'
  );

  const enviar = async () => {
    if (!puedeEnviar) return;
    setEnviando(true);
    for (const d of pendientesSeleccionados) {
      const k = d.email.toLowerCase();
      setStatuses((prev) => ({ ...prev, [k]: { status: 'sending' } }));
      try {
        const resp = await notificarCambioNip({
          email: d.email,
          nombre: d.nombre,
          nipAnterior,
          nipNuevo,
        });
        const messageId = resp?.detalles?.messageId || null;
        setStatuses((prev) => ({ ...prev, [k]: { status: 'sent', messageId } }));
        registrarAccion({
          accion: 'NOTIFICAR_CAMBIO_NIP',
          modulo: 'NIPS',
          resultado: 'EXITO',
          detalle: {
            nipAnterior,
            nipNuevo,
            emailCliente: d.email,
            nombre: d.nombre,
            origenEmail: 'SQL',
            llaveUnica: d.llaveUnica,
            messageId,
          },
        });
      } catch (err) {
        setStatuses((prev) => ({ ...prev, [k]: { status: 'error', error: err.message } }));
        registrarAccion({
          accion: 'NOTIFICAR_CAMBIO_NIP',
          modulo: 'NIPS',
          resultado: 'ERROR',
          detalle: {
            nipAnterior,
            nipNuevo,
            emailCliente: d.email,
            nombre: d.nombre,
            origenEmail: 'SQL',
            llaveUnica: d.llaveUnica,
            error: err.message,
          },
        });
      }
    }
    setEnviando(false);
  };

  const labelBoton = hayFallidos && !enviando ? 'Reintentar fallidos' : 'Enviar correo';

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div>
        <p className="font-semibold text-blue-900 mb-0.5">¿Quieres notificar al cliente?</p>
        <p className="text-xs text-blue-700">Se usan los correos del registro en la base de datos.</p>
      </div>

      <div className="space-y-1.5">
        {destinatarios.map((d) => {
          const k = d.email.toLowerCase();
          const st = statuses[k];
          return (
            <label
              key={k}
              className={`flex items-start gap-2 bg-white border rounded-lg px-3 py-2 text-sm ${
                enviando ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-blue-300'
              } ${st?.status === 'sent' ? 'border-green-200' : st?.status === 'error' ? 'border-red-200' : 'border-gray-200'}`}
            >
              <input
                type="checkbox"
                checked={!!selected[k]}
                onChange={() => toggle(d.email)}
                disabled={enviando || st?.status === 'sent'}
                className="mt-0.5 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-800 truncate">{d.nombre}</div>
                <div className="text-xs text-gray-500 truncate break-all">{d.email}</div>
                {st?.status === 'sending' && <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Spinner /> Enviando...</div>}
                {st?.status === 'sent' && <div className="text-xs text-green-600 mt-0.5">Enviado</div>}
                {st?.status === 'error' && <div className="text-xs text-red-600 mt-0.5 break-words">Error: {st.error}</div>}
              </div>
            </label>
          );
        })}
      </div>

      <div className="bg-white border border-blue-100 rounded-lg px-3 py-2 text-xs text-gray-700 italic">
        Hola <span className="not-italic font-medium">{previewNombre}</span>, tu NIP fue actualizado de{' '}
        <span className="not-italic font-mono font-semibold">{nipAnterior}</span> a{' '}
        <span className="not-italic font-mono font-semibold">{nipNuevo}</span>. Si crees que esto fue un error o no lo
        solicitaste, comunícate al 55 4440 2293 o a help@idconline.mx.
      </div>

      {todosOk && !enviando && (
        <p className="text-xs text-green-700">Notificaciones enviadas.</p>
      )}

      <button
        onClick={enviar}
        disabled={!puedeEnviar}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
      >
        {enviando && <Spinner />}
        {enviando ? 'Enviando...' : labelBoton}
      </button>
    </div>
  );
}

function generarNipAleatorio(exclude) {
  const buf = new Uint32Array(1);
  // 900000 valores posibles (100000..999999)
  let g;
  do {
    crypto.getRandomValues(buf);
    g = 100000 + (buf[0] % 900000);
  } while (g === Number(exclude));
  return g;
}

function GenerarNipModal({ cliente, onClose, onSuccess }) {
  const { odooCall } = useOdooRpc();
  const nipActual = Number(cliente.nip);

  const [phase, setPhase] = useState('verifying');
  const [errorMsg, setErrorMsg] = useState(null);
  const [nuevoNip, setNuevoNip] = useState(null);
  const [intentos, setIntentos] = useState(0);
  const [sqlPreview, setSqlPreview] = useState({ count: 0 });
  const [sqlRecords, setSqlRecords] = useState([]);
  const [llamadasPreview, setLlamadasPreview] = useState({ count: 0, cappedAt500: false });
  const [odooPreview, setOdooPreview] = useState({ actualizar: [], excluidos: [], total: 0 });
  const [sqlResult, setSqlResult] = useState(null);
  const [odooActualizados, setOdooActualizados] = useState([]);
  const [steps, setSteps] = useState([]);
  const [notificacionEnviando, setNotificacionEnviando] = useState(false);

  const updateStep = (key, patch) =>
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const buildExcluidos = (p) => {
    const motivos = [];
    if (!p.is_active_subscription) motivos.push('suscripción inactiva');
    if ((p.subscription_count || 0) === 0) motivos.push('subscription_count = 0');
    return { id: p.id, name: p.name, motivo: motivos.join(' / ') || 'no cumple regla' };
  };

  const verify = async () => {
    setPhase('verifying');
    setErrorMsg(null);
    setSteps([]);
    try {
      let candidato = null;
      let count = 0;
      for (let i = 0; i < 10; i++) {
        count++;
        const g = generarNipAleatorio(nipActual);
        const sqlCheck = await verificarNip(g);
        if (sqlCheck.exists) continue;
        const odooCheck = await odooCall({
          model: 'res.partner',
          method: 'search_read',
          args: [[['nip_custom', '=', String(g)]], ['id'], 0],
        });
        if (odooCheck && odooCheck.length > 0) continue;
        let llamOcupado = false;
        try {
          const llam = await contarLlamadas(g, 500);
          if (llam.count > 0) llamOcupado = true;
        } catch {
          llamOcupado = true; // ante error, descarta candidato
        }
        if (llamOcupado) continue;
        candidato = g;
        break;
      }
      setIntentos(count);
      if (!candidato) {
        setErrorMsg('No se encontró un NIP único tras 10 intentos. Intenta de nuevo.');
        setPhase('error');
        return;
      }
      setNuevoNip(candidato);

      const [sqlData, odooData, llamActual] = await Promise.all([
        verificarNip(nipActual).catch(() => ({ data: [] })),
        odooCall({
          model: 'res.partner',
          method: 'search_read',
          args: [
            [['nip_custom', '=', String(nipActual)]],
            ['id', 'nip_custom', 'subscription_count', 'is_company', 'is_active_subscription', 'name'],
            0,
          ],
        }).catch(() => []),
        contarLlamadas(nipActual, 500).catch(() => ({ count: 0, notFound: true })),
      ]);

      const actualizar = [];
      const excluidos = [];
      (odooData || []).forEach((p) => {
        if (p.is_active_subscription && (p.subscription_count || 0) > 0) {
          actualizar.push({ id: p.id, name: p.name, is_company: p.is_company, subscription_count: p.subscription_count });
        } else {
          excluidos.push(buildExcluidos(p));
        }
      });

      setSqlRecords(sqlData.data || []);
      setSqlPreview({ count: (sqlData.data || []).length });
      setLlamadasPreview({ count: llamActual.count || 0, cappedAt500: (llamActual.count || 0) === 500 });
      setOdooPreview({ actualizar, excluidos, total: (odooData || []).length });
      setPhase('preview');
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('error');
    }
  };

  useEffect(() => { verify(); /* eslint-disable-next-line */ }, []);

  const sqlAfectados = (resp) =>
    resp?.detalles?.registrosAfectados ?? resp?.registrosAfectados ?? resp?.data?.registrosAfectados ?? null;

  const llamadasInfo = (resp) => {
    const detalles = resp?.detalles || {};
    return {
      llamadasActualizadas: detalles.llamadasActualizadas ?? null,
      sinLlamadas: detalles.sinLlamadas === true,
      tablaLlamadas: detalles.tablaLlamadas ?? null,
    };
  };

  const confirmar = async () => {
    setPhase('executing');
    setErrorMsg(null);
    const ids = odooPreview.actualizar.map((p) => p.id);
    const initialSteps = [
      { key: 'sql', label: 'Actualizando NIP en base de datos...', status: 'running' },
      { key: 'llamadas', label: 'Moviendo historial de llamadas...', status: 'pending' },
      { key: 'odoo', label: 'Actualizando NIP en Odoo...', status: 'pending' },
      { key: 'hist', label: 'Registrando en historial...', status: 'pending' },
    ];
    setSteps(initialSteps);

    let sqlResp;
    try {
      sqlResp = await cambiarNip(nipActual, nuevoNip, { actualizarLlamadas: true });
      setSqlResult(sqlResp);
    } catch (sqlErr) {
      updateStep('sql', { status: 'error', note: sqlErr.message });
      updateStep('hist', { status: 'running' });
      registrarAccion({
        accion: 'GENERAR_NIP',
        modulo: 'NIPS',
        resultado: 'ERROR',
        detalle: {
          nipAnterior: nipActual,
          nipNuevo: nuevoNip,
          intentos,
          error: sqlErr.message,
        },
      });
      updateStep('hist', { status: 'ok' });
      setErrorMsg(sqlErr.message);
      setPhase('error');
      return;
    }

    const registrosAfectados = sqlAfectados(sqlResp);
    const { llamadasActualizadas, sinLlamadas, tablaLlamadas } = llamadasInfo(sqlResp);
    updateStep('sql', {
      status: 'ok',
      note: registrosAfectados != null ? `${registrosAfectados} registro(s)` : undefined,
    });

    if (sinLlamadas) {
      updateStep('llamadas', { status: 'info', note: 'Sin llamadas registradas, no hubo nada que mover' });
    } else {
      updateStep('llamadas', {
        status: 'ok',
        note: `${llamadasActualizadas ?? 0} llamada(s) movida(s)`,
      });
    }

    const detalleBase = {
      nipAnterior: nipActual,
      nipNuevo: nuevoNip,
      intentos,
      registrosAfectadosSql: registrosAfectados,
      llamadasActualizadas,
      sinLlamadas,
      tablaLlamadas,
    };

    let actualizadosIds = [];
    let odooError = null;
    if (ids.length === 0) {
      updateStep('odoo', { status: 'info', note: 'Sin partners que cumplan la regla; no se actualiza Odoo' });
    } else {
      updateStep('odoo', { status: 'running' });
      try {
        await odooCall({
          model: 'res.partner',
          method: 'write',
          args: [ids, { nip_custom: Number(nuevoNip) }],
        });
        actualizadosIds = ids;
        updateStep('odoo', { status: 'ok', note: `${ids.length} contacto(s) actualizados` });
      } catch (odooErr) {
        odooError = odooErr.message;
        updateStep('odoo', { status: 'error', note: odooErr.message });
      }
    }
    setOdooActualizados(actualizadosIds);

    updateStep('hist', { status: 'running' });
    const esParcial = odooError !== null;
    registrarAccion({
      accion: 'GENERAR_NIP',
      modulo: 'NIPS',
      resultado: esParcial ? 'PARCIAL' : 'EXITO',
      detalle: {
        ...detalleBase,
        odoo: {
          actualizadosIds,
          pendientesIds: esParcial ? ids : [],
          excluidos: odooPreview.excluidos,
          ...(odooError ? { error: odooError } : {}),
        },
      },
    });
    updateStep('hist', { status: 'ok' });

    if (esParcial) {
      setErrorMsg(odooError);
      setPhase('odooFailed');
    } else {
      setPhase('success');
    }
  };

  const reintentarOdoo = async () => {
    const ids = odooPreview.actualizar.map((p) => p.id);
    if (ids.length === 0 || !nuevoNip) return;
    setPhase('executing');
    setErrorMsg(null);
    const initialSteps = [
      { key: 'odoo', label: 'Actualizando NIP en Odoo...', status: 'running' },
      { key: 'hist', label: 'Registrando en historial...', status: 'pending' },
    ];
    setSteps(initialSteps);

    const { llamadasActualizadas, sinLlamadas, tablaLlamadas } = llamadasInfo(sqlResult);
    const detalleBase = {
      nipAnterior: nipActual,
      nipNuevo: nuevoNip,
      intentos,
      registrosAfectadosSql: sqlAfectados(sqlResult),
      llamadasActualizadas,
      sinLlamadas,
      tablaLlamadas,
      reintentoOdoo: true,
    };

    try {
      await odooCall({
        model: 'res.partner',
        method: 'write',
        args: [ids, { nip_custom: Number(nuevoNip) }],
      });
      setOdooActualizados(ids);
      updateStep('odoo', { status: 'ok', note: `${ids.length} contacto(s) actualizados` });
      updateStep('hist', { status: 'running' });
      registrarAccion({
        accion: 'GENERAR_NIP',
        modulo: 'NIPS',
        resultado: 'EXITO',
        detalle: {
          ...detalleBase,
          odoo: { actualizadosIds: ids, excluidos: odooPreview.excluidos },
        },
      });
      updateStep('hist', { status: 'ok' });
      setPhase('success');
    } catch (err) {
      updateStep('odoo', { status: 'error', note: err.message });
      updateStep('hist', { status: 'running' });
      registrarAccion({
        accion: 'GENERAR_NIP',
        modulo: 'NIPS',
        resultado: 'PARCIAL',
        detalle: {
          ...detalleBase,
          odoo: { actualizadosIds: [], pendientesIds: ids, error: err.message },
        },
      });
      updateStep('hist', { status: 'ok' });
      setErrorMsg(err.message);
      setPhase('odooFailed');
    }
  };

  const busy = phase === 'verifying' || phase === 'executing';
  const envBadge = ENTORNO === 'PROD'
    ? 'bg-red-100 text-red-700 border-red-200'
    : 'bg-amber-100 text-amber-700 border-amber-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="bg-indigo-600 rounded-t-2xl px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h3 className="font-semibold text-white">Generar nuevo NIP</h3>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${envBadge}`}>{ENTORNO}</span>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {phase === 'verifying' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-500">
              <Spinner />
              <span className="text-sm">Verificando disponibilidad...</span>
            </div>
          )}

          {phase === 'preview' && (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cambio propuesto</p>
                <div className="flex items-center justify-center gap-3 font-mono text-xl font-bold text-gray-800">
                  <span>{nipActual}</span>
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className="text-indigo-600">{nuevoNip}</span>
                </div>
                <p className="text-center text-xs text-gray-400 mt-2">Verificado tras {intentos} intento{intentos !== 1 ? 's' : ''}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">SQL</p>
                  <p className="text-blue-900 font-bold text-lg leading-tight">{sqlPreview.count}</p>
                  <p className="text-xs text-blue-700">registro{sqlPreview.count !== 1 ? 's' : ''} a actualizar</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Odoo</p>
                  <p className="text-indigo-900 font-bold text-lg leading-tight">{odooPreview.actualizar.length}</p>
                  <p className="text-xs text-indigo-700">
                    partner{odooPreview.actualizar.length !== 1 ? 's' : ''} a actualizar
                    {odooPreview.excluidos.length > 0 && ` · ${odooPreview.excluidos.length} excluido${odooPreview.excluidos.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>

              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wide">Historial de llamadas</p>
                {llamadasPreview.count === 0 ? (
                  <p className="text-xs text-cyan-800 mt-0.5">Este NIP no tiene llamadas registradas; no hay llamadas que mover.</p>
                ) : (
                  <>
                    <p className="text-cyan-900 font-bold text-lg leading-tight">
                      {llamadasPreview.cappedAt500 ? '500 o más' : llamadasPreview.count}
                    </p>
                    <p className="text-xs text-cyan-800">llamada{llamadasPreview.count !== 1 ? 's' : ''} que se moverán al nuevo NIP</p>
                  </>
                )}
              </div>

              {odooPreview.total === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                  No se encontraron partners en Odoo con <code>nip_custom = {nipActual}</code>. Solo se actualizará SQL.
                </div>
              )}

              {odooPreview.total > 0 && odooPreview.actualizar.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                  Ningún partner de Odoo cumple la regla (suscripción activa y subscription_count &gt; 0). Odoo no se actualizará.
                </div>
              )}
            </>
          )}

          {(phase === 'executing' || phase === 'success' || phase === 'odooFailed' || (phase === 'error' && steps.length > 0)) && (
            <StepsList steps={steps} />
          )}

          {phase === 'success' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 space-y-1">
                <p className="font-semibold">{sqlResult?.message || 'Cambio aplicado correctamente.'}</p>
                <p className="text-xs">
                  NIP actualizado en {sqlAfectados(sqlResult) ?? sqlPreview.count} registro(s) de clientes,{' '}
                  {llamadasInfo(sqlResult).sinLlamadas ? 0 : (llamadasInfo(sqlResult).llamadasActualizadas ?? 0)} llamada(s) movida(s) y{' '}
                  {odooActualizados.length} contacto(s) de Odoo.
                  {odooPreview.excluidos.length > 0 && ` · ${odooPreview.excluidos.length} excluidos`}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 font-mono text-lg">
                <span className="text-gray-500">{nipActual}</span>
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <span className="font-bold text-green-700">{nuevoNip}</span>
              </div>
              <NotificacionPanel
                sqlRecords={sqlRecords}
                nipAnterior={nipActual}
                nipNuevo={nuevoNip}
                onBusyChange={setNotificacionEnviando}
              />
            </>
          )}

          {phase === 'odooFailed' && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-2">
                <p className="font-semibold">SQL actualizado, pero Odoo falló.</p>
                <p className="text-xs">
                  El NIP ya cambió en SQL ({sqlAfectados(sqlResult) ?? sqlPreview.count} registros),{' '}
                  {llamadasInfo(sqlResult).sinLlamadas ? 0 : (llamadasInfo(sqlResult).llamadasActualizadas ?? 0)} llamada(s) movida(s). Puedes reintentar la actualización en Odoo.
                </p>
                {errorMsg && <p className="text-xs font-mono bg-white/60 rounded px-2 py-1 break-all">{errorMsg}</p>}
              </div>
              <NotificacionPanel
                sqlRecords={sqlRecords}
                nipAnterior={nipActual}
                nipNuevo={nuevoNip}
                onBusyChange={setNotificacionEnviando}
              />
            </>
          )}

          {phase === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              <p className="font-semibold mb-1">Error</p>
              <p className="text-xs break-all">{errorMsg}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-2 justify-end flex-shrink-0">
          {phase === 'preview' && (
            <>
              <button
                onClick={onClose}
                disabled={busy}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={verify}
                disabled={busy}
                className="px-4 py-2 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-sm font-medium transition disabled:opacity-50"
              >
                Generar otro
              </button>
              <button
                onClick={confirmar}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium transition"
              >
                Confirmar cambio
              </button>
            </>
          )}

          {phase === 'error' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                Cerrar
              </button>
              <button
                onClick={verify}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition"
              >
                Reintentar
              </button>
            </>
          )}

          {phase === 'odooFailed' && (
            <>
              <button
                onClick={() => onSuccess({ nipAnterior: nipActual, nipNuevo: nuevoNip, parcial: true })}
                disabled={notificacionEnviando}
                title={notificacionEnviando ? 'Espera a que termine el envío de correo' : undefined}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cerrar
              </button>
              <button
                onClick={reintentarOdoo}
                disabled={notificacionEnviando}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium transition"
              >
                Reintentar actualizar Odoo
              </button>
            </>
          )}

          {phase === 'success' && (
            <button
              onClick={() => onSuccess({ nipAnterior: nipActual, nipNuevo: nuevoNip, parcial: false })}
              disabled={notificacionEnviando}
              title={notificacionEnviando ? 'Espera a que termine el envío de correo' : undefined}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white text-sm font-medium transition"
            >
              Cerrar
            </button>
          )}

          {(phase === 'verifying' || phase === 'executing') && (
            <button
              disabled
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-400 cursor-not-allowed"
            >
              Procesando...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Clientes() {
  const [filters, setFilters] = useState({ nip: '', nombre: '', empresa: '', ciudad: '', status: '' });
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [llamadasTarget, setLlamadasTarget] = useState(null);
  const [generarTarget, setGenerarTarget] = useState(null);

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const doSearch = async (overrideFilters) => {
    const effective = overrideFilters || filters;
    setLoading(true);
    setAlert(null);
    setResults([]);
    setSearched(false);
    try {
      const data = await buscarClientes(effective);
      const list = data.data || [];
      setResults(list);
      setSearched(true);
      if (list.length === 0) {
        setAlert({ type: 'error', message: 'No se encontraron clientes con esos filtros.' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    doSearch();
  };

  const handleSaved = (updatedCliente) => {
    if (updatedCliente?.llaveUnica) {
      setResults((prev) =>
        prev.map((c) => (c.llaveUnica === updatedCliente.llaveUnica ? updatedCliente : c))
      );
    }
    setEditTarget(null);
    setAlert({ type: 'success', message: 'Cliente actualizado correctamente.' });
  };

  const handleDeleted = (llaveUnica) => {
    setResults((prev) => prev.filter((c) => c.llaveUnica !== llaveUnica));
    setDeleteTarget(null);
    setAlert({ type: 'success', message: 'Cliente eliminado correctamente.' });
  };

  const handleGenerarRequest = (cliente) => {
    setEditTarget(null);
    setGenerarTarget(cliente);
  };

  const handleGenerarSuccess = ({ nipAnterior, nipNuevo, parcial }) => {
    setGenerarTarget(null);
    setAlert({
      type: parcial ? 'error' : 'success',
      message: parcial
        ? `NIP ${nipAnterior} cambiado a ${nipNuevo} en SQL, pero la actualización en Odoo quedó pendiente.`
        : `NIP ${nipAnterior} cambiado a ${nipNuevo} correctamente.`,
    });
    const nextFilters =
      String(filters.nip) === String(nipAnterior)
        ? { ...filters, nip: String(nipNuevo) }
        : filters;
    if (nextFilters !== filters) setFilters(nextFilters);
    if (Object.values(nextFilters).some((v) => v !== '')) {
      doSearch(nextFilters);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">NIP</label>
            <input
              type="number"
              value={filters.nip}
              onChange={setFilter('nip')}
              placeholder="Búsqueda exacta"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={setFilter('status')}
              className={INPUT_CLS + ' bg-white'}
            >
              <option value="">Todos</option>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input
              type="text"
              value={filters.nombre}
              onChange={setFilter('nombre')}
              placeholder="Búsqueda parcial"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Empresa</label>
            <input
              type="text"
              value={filters.empresa}
              onChange={setFilter('empresa')}
              placeholder="Búsqueda parcial"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
            <input
              type="text"
              value={filters.ciudad}
              onChange={setFilter('ciudad')}
              placeholder="Búsqueda parcial"
              className={INPUT_CLS}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg text-sm transition flex items-center justify-center gap-2"
        >
          {loading && <Spinner />}
          {loading ? 'Buscando...' : 'Buscar Clientes'}
        </button>
      </form>

      {alert && <Alert type={alert.type} message={alert.message} onClear={() => setAlert(null)} />}

      {results.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">{results.length} resultado(s)</p>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm border-collapse min-w-[520px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 py-2 px-2">NIP</th>
                  <th className="text-left text-xs font-semibold text-gray-500 py-2 px-2">Nombre / Empresa</th>
                  <th className="text-left text-xs font-semibold text-gray-500 py-2 px-2">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 py-2 px-2">Fin suscripción</th>
                  <th className="text-right text-xs font-semibold text-gray-500 py-2 px-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {results.map((c) => (
                  <tr
                    key={c.llaveUnica}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2.5 px-2 text-xs font-mono text-gray-700 whitespace-nowrap">
                      {c.nip}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="text-xs font-medium text-gray-800 leading-snug">{c.nombre}</div>
                      {c.empresa && c.empresa !== c.nombre && (
                        <div className="text-xs text-gray-400 leading-snug">{c.empresa}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.estado === 'Activo'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {c.estado || 'Desconocido'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-xs text-gray-600 whitespace-nowrap">
                      {formatDate(c.finSuscripcion)}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => setLlamadasTarget(c)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium transition whitespace-nowrap"
                        >
                          Ver llamadas
                        </button>
                        <button
                          onClick={() => setEditTarget(c)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium transition whitespace-nowrap"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition whitespace-nowrap"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <p className="text-sm text-gray-500 text-center py-4">Sin resultados.</p>
      )}

      {editTarget && (
        <EditModal
          cliente={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
          onGenerarNip={handleGenerarRequest}
        />
      )}

      {generarTarget && (
        <GenerarNipModal
          cliente={generarTarget}
          onClose={() => setGenerarTarget(null)}
          onSuccess={handleGenerarSuccess}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          cliente={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}

      {llamadasTarget && (
        <LlamadasModal
          cliente={llamadasTarget}
          onClose={() => setLlamadasTarget(null)}
        />
      )}
    </div>
  );
}
