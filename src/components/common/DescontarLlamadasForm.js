import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { descontarLlamadas } from '../../services/clientesApi';
import { registrarAccion } from '../../services/historialService';

const INPUT_CLS =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition';

export const OPCIONES_CONSULTOR = [
  { label: 'Danae Garcia', value: 'danae.garcia' },
  { label: 'Ana Jazmin Cruz', value: 'anajazmin.cruz' },
  { label: 'Carmen Mendoza', value: 'carmen.mendoza' },
  { label: 'Nancy Rodriguez', value: 'nancy.rodriguez' },
  { label: 'Angeles Paniagua', value: 'angeles.paniagua' },
  { label: 'Jesus Coronado', value: 'jesus.coronado' },
  { label: 'Jose Rios', value: 'jose.rios' },
  { label: 'Irene Vega', value: 'ivega' },
  { label: 'Erika Rivera', value: 'eromero' },
  { label: 'Francisto Brito', value: 'fbritom' },
  { label: 'Alejandro Silva', value: 'asilva' },
];

const EMAIL_A_CONSULTOR = {
  'danae.garcia@idconline.mx': 'danae.garcia',
  'anajazmin.cruz@idconline.mx': 'anajazmin.cruz',
  'carmen.mendoza@idconline.mx': 'carmen.mendoza',
  'nancy.rodriguez@idconline.mx': 'nancy.rodriguez',
  'angeles.paniagua@idconline.mx': 'angeles.paniagua',
  'jesus.coronado@idconline.mx': 'jesus.coronado',
  'josejuan.rios@idconline.mx': 'jose.rios',
  'ivega@idconline.mx': 'ivega',
  'eromero@idconline.mx': 'eromero',
  'fbrito@idconline.mx': 'fbritom',
};

function Spinner({ size = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${size}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function isDateOnOrAfterToday(iso) {
  if (!iso) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  return d.getTime() >= today.getTime();
}

function ConfirmModal({ datos, onCancel, onConfirm, enviando }) {
  const { nip, nombre, consultor, consultorLabel, tema, num, realizadasAntes, realizadasDespues, disponiblesAntes, disponiblesDespues } = datos;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92vh]">
        <div className="bg-indigo-600 rounded-t-2xl px-5 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h3 className="font-semibold text-white">Confirmar descuento</h3>
        </div>
        <div className="px-5 sm:px-6 py-4 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">NIP:</span> <span className="font-mono font-semibold text-gray-800">{nip}</span></div>
            <div><span className="text-gray-500">Consultas:</span> <span className="font-semibold text-gray-800">{num}</span></div>
            <div className="col-span-2"><span className="text-gray-500">Nombre:</span> <span className="font-medium text-gray-800 break-words">{nombre || '-'}</span></div>
            <div className="col-span-2"><span className="text-gray-500">Consultor:</span> <span className="font-medium text-gray-800">{consultorLabel} <span className="text-xs text-gray-400">({consultor})</span></span></div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Tema</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap break-words">{tema}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide">Realizadas</p>
              <p className="font-mono font-bold text-blue-900">{realizadasAntes} → {realizadasDespues}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wide">Disponibles</p>
              <p className="font-mono font-bold text-green-900">{disponiblesAntes} → {disponiblesDespues}</p>
            </div>
          </div>
        </div>
        <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex gap-2 justify-end flex-shrink-0">
          <button
            onClick={onCancel}
            disabled={enviando}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={enviando}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium transition flex items-center gap-2"
          >
            {enviando && <Spinner />}
            {enviando ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DescontarLlamadasForm({
  nip,
  nombre,
  totnumlla,
  totllarea,
  estado,
  finSuscripcion,
  origen = 'tab',
  onSuccess,
}) {
  const { user } = useAuth();

  const total = Number(totnumlla) || 0;
  const realizadas = Number(totllarea) || 0;
  const disponibles = total - realizadas;

  const activo = estado === 'Activo' && isDateOnOrAfterToday(finSuscripcion);
  const sinDisponibles = disponibles <= 0;

  const motivoDeshabilitado = !activo
    ? 'Sin suscripción activa'
    : sinDisponibles
      ? 'Sin llamadas disponibles'
      : null;

  const preseleccion = useMemo(() => {
    const em = (user?.email || '').trim().toLowerCase();
    return EMAIL_A_CONSULTOR[em] || '';
  }, [user?.email]);

  const [tema, setTema] = useState('');
  const [consultor, setConsultor] = useState(preseleccion);
  const [num, setNum] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!consultor && preseleccion) setConsultor(preseleccion);
  }, [preseleccion]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxConsultas = Math.max(1, Math.min(99, disponibles));
  const numInt = Number.parseInt(num, 10);
  const numValido = Number.isInteger(numInt) && numInt >= 1 && numInt <= maxConsultas && String(numInt) === String(num).trim();

  const temaValido = tema.trim().length > 0 && tema.length <= 200;
  const formValido = !motivoDeshabilitado && temaValido && !!consultor && numValido;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!formValido) return;
    setShowConfirm(true);
  };

  const consultorLabel = OPCIONES_CONSULTOR.find((o) => o.value === consultor)?.label || consultor;

  const doConfirm = async () => {
    setEnviando(true);
    setError(null);
    try {
      const resp = await descontarLlamadas({
        nip,
        tema: tema.trim(),
        consultor,
        numConsultas: numInt,
      });
      const d = resp?.detalles || {};
      registrarAccion({
        accion: 'DESCONTAR_LLAMADAS',
        modulo: 'LLAMADAS',
        resultado: 'EXITO',
        detalle: {
          nip,
          nombre: d.nombre ?? nombre,
          consultor,
          numConsultas: numInt,
          tema: tema.trim(),
          TOTNUMLLA: d.TOTNUMLLA ?? total,
          TOTLLAREA_anterior: d.TOTLLAREA_anterior ?? realizadas,
          TOTLLAREA_nuevo: d.TOTLLAREA_nuevo ?? (realizadas + numInt),
          guid: d.guid || null,
          origen,
          httpStatus: 200,
        },
      });
      setSuccess(resp?.message || 'Descuento aplicado correctamente.');
      setTema('');
      setNum('');
      setShowConfirm(false);
      if (onSuccess) onSuccess(resp?.detalles || {});
    } catch (err) {
      registrarAccion({
        accion: 'DESCONTAR_LLAMADAS',
        modulo: 'LLAMADAS',
        resultado: 'ERROR',
        detalle: {
          nip,
          nombre,
          consultor,
          numConsultas: numInt,
          tema: tema.trim(),
          TOTNUMLLA: total,
          TOTLLAREA_anterior: realizadas,
          origen,
          httpStatus: err.status || null,
          error: err.message,
        },
      });
      setError(err.message);
      setShowConfirm(false);
    } finally {
      setEnviando(false);
    }
  };

  const handleNumChange = (e) => {
    const v = e.target.value.replace(/[^\d]/g, '');
    if (v === '') return setNum('');
    const n = Number.parseInt(v, 10);
    if (Number.isNaN(n)) return setNum('');
    setNum(String(Math.min(n, maxConsultas)));
  };

  return (
    <div className="space-y-4">
      {motivoDeshabilitado && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">{motivoDeshabilitado}</p>
          <p className="text-xs mt-0.5">
            {!activo
              ? 'Este NIP no tiene una suscripción activa; no se pueden descontar llamadas.'
              : 'Este NIP ya consumió todas sus llamadas disponibles.'}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`space-y-3 ${motivoDeshabilitado ? 'opacity-60 pointer-events-none' : ''}`}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Tema <span className="text-red-500">*</span>
          </label>
          <textarea
            value={tema}
            onChange={(e) => setTema(e.target.value.slice(0, 200))}
            maxLength={200}
            required
            placeholder="Describe el tema de la consulta..."
            rows={3}
            className={INPUT_CLS + ' resize-none'}
            disabled={motivoDeshabilitado}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Mínimo 1 carácter · máximo 200</span>
            <span className={tema.length >= 200 ? 'text-amber-600 font-medium' : ''}>{tema.length}/200</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Consultor <span className="text-red-500">*</span>
            </label>
            <select
              value={consultor}
              onChange={(e) => setConsultor(e.target.value)}
              required
              className={INPUT_CLS + ' bg-white'}
              disabled={motivoDeshabilitado}
            >
              <option value="">Selecciona un consultor</option>
              {OPCIONES_CONSULTOR.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Número de consultas <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={maxConsultas}
              step={1}
              value={num}
              onChange={handleNumChange}
              required
              placeholder="1"
              className={INPUT_CLS}
              disabled={motivoDeshabilitado}
            />
            <p className="text-xs text-gray-400 mt-1">
              Entre 1 y {maxConsultas} · disponibles: <span className="font-semibold">{disponibles}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 break-words">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 break-words">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={!formValido || enviando}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg text-sm transition flex items-center justify-center gap-2"
        >
          {enviando && <Spinner />}
          {enviando ? 'Procesando...' : 'Descontar'}
        </button>
      </form>

      {showConfirm && (
        <ConfirmModal
          datos={{
            nip,
            nombre,
            consultor,
            consultorLabel,
            tema: tema.trim(),
            num: numInt,
            realizadasAntes: realizadas,
            realizadasDespues: realizadas + numInt,
            disponiblesAntes: disponibles,
            disponiblesDespues: disponibles - numInt,
          }}
          enviando={enviando}
          onCancel={() => !enviando && setShowConfirm(false)}
          onConfirm={doConfirm}
        />
      )}
    </div>
  );
}
