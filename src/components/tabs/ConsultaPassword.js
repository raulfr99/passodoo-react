import React, { useState } from 'react';
import { useOdooRpc } from '../../hooks/useOdooRpc';

function Alert({ type, message, onDismiss }) {
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
      <span className="flex-1" dangerouslySetInnerHTML={{ __html: message }} />
    </div>
  );
}

export default function ConsultaPassword() {
  const { odooCall } = useOdooRpc();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const data = await odooCall({
        model: 'res.partner',
        method: 'search_read',
        args: [
          [['email', '=', email.trim()]],
          ['email', 'password_custom'],
          0,
          1,
        ],
      });
      if (data && data.length > 0) {
        setResult({ type: 'found', email: data[0].email, password: data[0].password_custom || '' });
      } else {
        setResult({ type: 'notfound' });
      }
    } catch (err) {
      setResult({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.password) return;
    navigator.clipboard.writeText(result.password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Correo electrónico a consultar
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="ejemplo@idconline.mx"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg text-sm transition flex items-center justify-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
      </form>

      {result?.type === 'found' && (
        <div className="mt-4 space-y-2">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Email:</span> {result.email}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Contraseña:</div>
            <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
              <span className="text-sm font-mono text-gray-800 flex-1">
                {result.password || 'No disponible'}
              </span>
              {result.password && (
                <button
                  onClick={handleCopy}
                  title="Copiar contraseña"
                  className="ml-3 text-blue-500 hover:text-blue-700 transition flex items-center gap-1 text-sm"
                >
                  {copied
                    ? <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  }
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {result?.type === 'notfound' && (
        <Alert type="error" message="No se encontraron resultados para este correo electrónico." />
      )}

      {result?.type === 'error' && (
        <Alert type="error" message={`Error al realizar la consulta: ${result.message}`} />
      )}
    </div>
  );
}
