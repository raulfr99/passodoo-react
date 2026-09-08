import React, { useState, useMemo } from 'react';
import { buscarClientes, actualizarCliente, eliminarCliente, obtenerLlamadas } from '../../services/clientesApi';

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

function EditModal({ cliente, onClose, onSaved }) {
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
      onSaved(updated);
    } catch (err) {
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
                <input
                  type="number"
                  value={form.NIP}
                  readOnly
                  className={INPUT_CLS + ' bg-gray-50 text-gray-400 cursor-not-allowed'}
                />
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
      onDeleted(cliente.llaveUnica);
    } catch (err) {
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

function LlamadasModal({ cliente, onClose }) {
  const [llamadas, setLlamadas] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
                <div className="bg-white/15 border border-white/25 rounded-xl px-3 py-2 text-center min-w-[56px]">
                  <span className="block text-white font-bold text-lg leading-none">{count}</span>
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

          {!loading && !error && llamadas.length > 0 && (
            <table className="w-full text-sm border-collapse table-fixed">
              <colgroup>
                <col style={{ width: '9%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '32%' }} />
                <col style={{ width: '18%' }} />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3">NIP</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3">Usuario</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3">Nombre</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3">Tema</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3">Fecha y hora</th>
                </tr>
              </thead>
              <tbody>
                {llamadas.map((ll) => (
                  <tr key={ll.id} className="border-b border-gray-100 hover:bg-indigo-50/50 transition-colors">
                    <td className="py-3 px-3 text-sm font-mono font-bold text-indigo-700">{ll.nip}</td>
                    <td className="py-3 px-3 text-sm font-medium text-gray-700 truncate">{ll.usuario}</td>
                    <td className="py-3 px-3 text-sm text-gray-800">{ll.nombre}</td>
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

export default function Clientes() {
  const [filters, setFilters] = useState({ nip: '', nombre: '', empresa: '', ciudad: '', status: '' });
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [llamadasTarget, setLlamadasTarget] = useState(null);

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);
    setResults([]);
    setSearched(false);
    try {
      const data = await buscarClientes(filters);
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
