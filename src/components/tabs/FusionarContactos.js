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
      <span dangerouslySetInnerHTML={{ __html: message }} />
    </div>
  );
}

function ContactAvatar({ avatar128, size = 40 }) {
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

export default function FusionarContactos() {
  const { odooCall, odooCallKw, checkUsersBeforeMerge } = useOdooRpc();
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [primaryId, setPrimaryId] = useState(null);
  const [merging, setMerging] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setSelectedContacts([]);
    setPrimaryId(null);
    setAlert(null);
    try {
      const contacts = await odooCall({
        model: 'res.partner',
        method: 'search_read',
        args: [
          ['|', '|', ['email', 'ilike', searchTerm], ['name', 'ilike', searchTerm], ['vat', 'ilike', searchTerm]],
          ['id', 'name', 'email', 'avatar_128', 'type', 'vat'],
          0,
          20,
        ],
      });

      if (contacts && contacts.length > 0) {
        const withStats = await Promise.all(
          contacts.map(async (c) => {
            const [sales, subs] = await Promise.all([
              odooCall({ model: 'sale.order', method: 'search_count', args: [[['partner_id', '=', c.id]]] }).catch(() => 0),
              odooCall({ model: 'sale.subscription', method: 'search_count', args: [[['partner_id', '=', c.id]]] }).catch(() => 0),
            ]);
            return { ...c, sales_count: sales || 0, subscriptions_count: subs || 0 };
          })
        );
        setSearchResults(withStats);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      setAlert({ type: 'error', message: `Error al buscar: ${err.message}` });
    } finally {
      setSearching(false);
    }
  };

  const toggleContact = (contact) => {
    setSelectedContacts(prev => {
      const exists = prev.find(c => c.id === contact.id);
      const next = exists ? prev.filter(c => c.id !== contact.id) : [...prev, contact];
      if (!exists && next.length === 1) setPrimaryId(contact.id);
      if (exists && primaryId === contact.id && next.length > 0) setPrimaryId(next[0].id);
      return next;
    });
  };

  const doMerge = async () => {
    if (!primaryId || selectedContacts.length < 2) return;
    setShowConfirm(false);
    setMerging(true);
    try {
      const allIds = selectedContacts.map(c => c.id);
      const userCheck = await checkUsersBeforeMerge(primaryId, allIds);
      if (!userCheck.success) throw new Error(userCheck.error);

      const wizardId = await odooCallKw({
        model: 'base.partner.merge.automatic.wizard',
        method: 'create',
        args: [{ partner_ids: [[6, 0, allIds]], dst_partner_id: primaryId }],
      });

      await odooCallKw({
        model: 'base.partner.merge.automatic.wizard',
        method: 'action_merge',
        args: [[wizardId]],
      });

      const primary = selectedContacts.find(c => c.id === primaryId);
      let msg = `Fusión completada. <strong>Contacto principal:</strong> ${primary?.name || 'N/A'} (${primary?.email || 'Sin email'})<br><strong>Contactos fusionados:</strong> ${selectedContacts.length - 1}`;
      if (userCheck.deletedUsers > 0) {
        msg += `<br><strong>Usuarios eliminados:</strong> ${userCheck.deletedUsers}`;
      }
      setAlert({ type: 'success', message: msg });
      setSelectedContacts([]);
      setSearchResults([]);
      setPrimaryId(null);
      setSearchTerm('');
    } catch (err) {
      setAlert({ type: 'error', message: `Error en la fusión: ${err.message}` });
    } finally {
      setMerging(false);
    }
  };

  const primaryContact = selectedContacts.find(c => c.id === primaryId);
  const contactsToMerge = selectedContacts.filter(c => c.id !== primaryId);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border-l-4 border-blue-400 px-4 py-3 rounded-r-lg text-sm text-blue-800">
        <p className="font-medium mb-1">Instrucciones:</p>
        <ol className="list-decimal list-inside space-y-0.5 text-xs">
          <li>Busca contactos por email, nombre o RFC</li>
          <li>Selecciona al menos 2 contactos para fusionar</li>
          <li>Elige cuál será el contacto principal (se conservará)</li>
          <li>Confirma la fusión</li>
        </ol>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          required
          placeholder="Email, nombre o RFC del contacto"
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

      {searchResults.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">{searchResults.length} resultado(s) — selecciona los que deseas fusionar</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
            {searchResults.map(contact => {
              const selected = !!selectedContacts.find(c => c.id === contact.id);
              return (
                <div
                  key={contact.id}
                  onClick={() => toggleContact(contact)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-200 bg-white'}`}
                >
                  <ContactAvatar avatar128={contact.avatar_128} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-800 truncate">{contact.name || 'Sin nombre'}</div>
                    <div className="text-xs text-gray-500 truncate">{contact.email || 'Sin email'}</div>
                    <div className="flex gap-1 mt-1">
                      <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">V:{contact.sales_count}</span>
                      <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">S:{contact.subscriptions_count}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">#{contact.id}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedContacts.length >= 2 && (
        <div className="space-y-3 border-t pt-3">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Selecciona el contacto principal <span className="text-xs text-gray-400">(se conservará)</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedContacts.map(c => (
                <div
                  key={c.id}
                  onClick={() => setPrimaryId(c.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${primaryId === c.id ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-200 bg-white'}`}
                >
                  <ContactAvatar avatar128={c.avatar_128} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-xs text-gray-500 truncate">{c.email}</div>
                  </div>
                  {primaryId === c.id && (
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Principal</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={merging}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-lg text-sm transition flex items-center justify-center gap-2"
          >
            {merging && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
            {merging ? 'Fusionando...' : `Fusionar ${selectedContacts.length} contactos`}
          </button>
        </div>
      )}

      {alert && <Alert type={alert.type} message={alert.message} onClear={() => setAlert(null)} />}

      {/* Modal de confirmación */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="bg-amber-400 rounded-t-2xl px-6 py-4">
              <h3 className="font-semibold text-gray-900">Confirmar Fusión de Contactos</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                <strong>¡Atención!</strong> Esta acción no se puede deshacer. Los contactos fusionados serán eliminados.
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-green-700 font-medium mb-1">Conservar:</p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="font-medium">{primaryContact?.name}</div>
                    <div className="text-xs text-gray-500">{primaryContact?.email}</div>
                    <div className="text-xs text-gray-400">ID: {primaryContact?.id}</div>
                  </div>
                </div>
                <div>
                  <p className="text-red-700 font-medium mb-1">Eliminar ({contactsToMerge.length}):</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {contactsToMerge.map(c => (
                      <div key={c.id} className="bg-red-50 border border-red-200 rounded-lg p-2">
                        <div className="font-medium text-xs">{c.name}</div>
                        <div className="text-xs text-gray-400">ID: {c.id}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 pb-5 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={doMerge}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition"
              >
                Confirmar Fusión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
