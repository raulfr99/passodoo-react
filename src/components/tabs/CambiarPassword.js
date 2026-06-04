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

function PasswordInput({ value, onChange, placeholder, required }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {show
          ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
          : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        }
      </button>
    </div>
  );
}

export default function CambiarPassword() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setAlert({ type: 'error', message: 'Las contraseñas no coinciden.' });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const response = await fetch(`${BACKEND_URL}/cambioPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          password_confirm: form.confirm,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.error?.message || data?.error || 'Error al cambiar contraseña');
      }
      setAlert({ type: 'success', message: 'Contraseña actualizada correctamente.' });
      setForm({ email: '', password: '', confirm: '' });
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            required
            placeholder="ejemplo@idconline.mx"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
          <PasswordInput value={form.password} onChange={set('password')} placeholder="Ingresa la nueva contraseña" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
          <PasswordInput value={form.confirm} onChange={set('confirm')} placeholder="Confirma la nueva contraseña" required />
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
          {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
        </button>
      </form>
      {alert && <Alert type={alert.type} message={alert.message} />}
    </div>
  );
}
