import React, { useState, useEffect } from 'react';

const MONTHS = [
  { code: 'ENE', name: 'Enero' },
  { code: 'FEB', name: 'Febrero' },
  { code: 'MAR', name: 'Marzo' },
  { code: 'ABR', name: 'Abril' },
  { code: 'MAY', name: 'Mayo' },
  { code: 'JUN', name: 'Junio' },
  { code: 'JUL', name: 'Julio' },
  { code: 'AGO', name: 'Agosto' },
  { code: 'SEP', name: 'Septiembre' },
  { code: 'OCT', name: 'Octubre' },
  { code: 'NOV', name: 'Noviembre' },
  { code: 'DIC', name: 'Diciembre' },
];

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

export default function ModificarINPC() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [inpcData, setInpcData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [newValue, setNewValue] = useState('');
  const [currentValue, setCurrentValue] = useState('-');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/inpc`)
      .then(r => r.json())
      .then(data => setInpcData(data))
      .catch(() => setAlert({ type: 'error', message: 'Error al cargar datos INPC.' }))
      .finally(() => setLoadingData(false));
  }, [BACKEND_URL]);

  const sortedYears = [...inpcData].sort((a, b) => b.year - a.year);

  const handleYearChange = (val) => {
    setYear(val);
    setMonth('');
    setCurrentValue('-');
    setNewValue('');
  };

  const handleMonthChange = (val) => {
    setMonth(val);
    if (!val || !year) { setCurrentValue('-'); return; }
    const yearData = inpcData.find(d => String(d.year) === String(year));
    if (!yearData) { setCurrentValue('-'); return; }
    const v = yearData.months[val];
    setCurrentValue(v != null ? String(v).replace(/(\.\d*?[1-9])0+$/, '$1') : 'No disponible');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!year || !month || !newValue) {
      setAlert({ type: 'error', message: 'Por favor complete todos los campos.' });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const response = await fetch(`${BACKEND_URL}/inpc/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: parseInt(year), month, value: parseFloat(newValue) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al actualizar');
      setInpcData(prev => prev.map(d =>
        String(d.year) === String(year) ? { ...d, months: { ...d.months, [month]: parseFloat(newValue) } } : d
      ));
      setCurrentValue(newValue);
      setNewValue('');
      setAlert({ type: 'success', message: 'Valor actualizado correctamente.' });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="ml-2 text-sm text-gray-500">Cargando datos INPC...</span>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
            <select
              value={year}
              onChange={e => handleYearChange(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition bg-white"
            >
              <option value="">Seleccione un año</option>
              {sortedYears.map(d => (
                <option key={d.year} value={d.year}>{d.year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
            <select
              value={month}
              onChange={e => handleMonthChange(e.target.value)}
              required
              disabled={!year}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition bg-white disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">Seleccione un mes</option>
              {MONTHS.map(m => (
                <option key={m.code} value={m.code}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor actual</label>
          <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50">
            <span className="font-semibold text-blue-600">{currentValue}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo valor</label>
          <input
            type="number"
            step="0.000001"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            required
            placeholder="Ingrese el nuevo valor"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
          />
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
          {loading ? 'Actualizando...' : 'Actualizar Valor'}
        </button>
      </form>
      {alert && <Alert type={alert.type} message={alert.message} onClear={() => setAlert(null)} />}
    </div>
  );
}
