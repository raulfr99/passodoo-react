import React, { useState, useEffect } from 'react';
import { useOdooRpc } from '../../hooks/useOdooRpc';

function Alert({ type, message, onClear }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClear, 5000);
    return () => clearTimeout(t);
  }, [message, onClear]);

  if (!message) return null;
  const styles = type === 'success'
    ? 'bg-green-50 border-green-200 text-green-700'
    : 'bg-red-50 border-red-200 text-red-700';
  return (
    <div className={`flex items-start gap-3 border rounded-lg px-4 py-3 text-sm mt-4 ${styles}`}>
      {type === 'success'
        ? <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        : <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
      }
      <span>{message}</span>
    </div>
  );
}

function ContactAvatar({ avatar128, size = 48 }) {
  const fallback = `data:image/svg+xml;base64,${btoa(`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#e9ecef"/><text x="${size / 2}" y="${size * 0.65}" text-anchor="middle" fill="#6c757d" font-size="${size * 0.25}">?</text></svg>`)}`;
  return (
    <img
      src={avatar128 ? `data:image/png;base64,${avatar128}` : fallback}
      alt="avatar"
      style={{ width: size, height: size }}
      className="rounded-full object-cover flex-shrink-0"
    />
  );
}

export default function TipoContacto() {
  const { odooCall } = useOdooRpc();
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [changing, setChanging] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setSearching(true);
    setResults([]);
    setSelected(null);
    setAlert(null);
    try {
      const contacts = await odooCall({
        model: 'res.partner',
        method: 'search_read',
        args: [
          ['|', ['email', 'ilike', searchTerm], ['name', 'ilike', searchTerm]],
          ['id', 'name', 'email', 'avatar_128', 'type'],
          0,
          10,
        ],
      });
      setResults(contacts || []);
    } catch (err) {
      setAlert({ type: 'error', message: `Error al buscar: ${err.message}` });
    } finally {
      setSearching(false);
    }
  };

  const handleChangeType = async () => {
    if (!selected) return;
    setChanging(true);
    setAlert(null);
    try {
      const result = await odooCall({
        model: 'res.partner',
        method: 'write',
        args: [[selected.id], { type: 'contact' }],
      });
      if (result) {
        setAlert({ type: 'success', message: `Tipo de contacto cambiado exitosamente a "contact".` });
        setSelected(null);
        setResults([]);
        setSearchTerm('');
      } else {
        throw new Error('No se pudo cambiar el tipo de contacto');
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          required
          placeholder="Email o nombre del contacto"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
        />
        <button
          type="submit"
          disabled={searching}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg text-sm transition flex items-center gap-2 whitespace-nowrap"
        >
          {searching && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
          {searching ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {results.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Selecciona el contacto a cambiar:</p>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {results.map(contact => (
              <div
                key={contact.id}
                onClick={() => setSelected(contact)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selected?.id === contact.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-200 bg-white'}`}
              >
                <ContactAvatar avatar128={contact.avatar_128} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-800 truncate">{contact.name || 'Sin nombre'}</div>
                  <div className="text-xs text-gray-500 truncate">{contact.email || 'Sin email'}</div>
                  <div className="text-xs text-gray-400">Tipo actual: <span className="font-medium">{contact.type || 'contact'}</span></div>
                </div>
                <span className="text-xs text-gray-400">#{contact.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="border-t pt-3">
          <p className="text-sm font-medium text-gray-700 mb-2">Contacto seleccionado:</p>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-3">
            <ContactAvatar avatar128={selected.avatar_128} size={44} />
            <div>
              <div className="font-medium text-gray-800">{selected.name}</div>
              <div className="text-sm text-gray-500">{selected.email}</div>
              <div className="text-xs text-gray-400">Tipo: {selected.type || 'contact'}</div>
            </div>
          </div>
          <button
            onClick={handleChangeType}
            disabled={changing}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium py-2 px-4 rounded-lg text-sm transition flex items-center justify-center gap-2"
          >
            {changing && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
            {changing ? 'Cambiando...' : 'Cambiar a Tipo Contact'}
          </button>
        </div>
      )}

      {alert && <Alert type={alert.type} message={alert.message} onClear={() => setAlert(null)} />}
    </div>
  );
}
