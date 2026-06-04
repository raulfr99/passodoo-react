import React, { useState } from 'react';

function Alert({ type, message }) {
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

export default function CrearUsuario() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);
    try {
      const response = await fetch(`${BACKEND_URL}/createUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al crear usuario');
      setAlert({ type: 'success', message: data.message });
      setEmail('');
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Correo electrónico del contacto
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="ejemplo@idconline.mx"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
          />
          <p className="mt-1 text-xs text-gray-400">
            Se creará un usuario portal para este contacto si no existe uno.
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg text-sm transition flex items-center justify-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {loading ? 'Creando...' : 'Crear Usuario'}
        </button>
      </form>
      {alert && <Alert type={alert.type} message={alert.message} />}
    </div>
  );
}
