import React, { useState, useEffect } from 'react';
import { useOdooRpc } from '../../hooks/useOdooRpc';
import { buscarExterno, insertarClienteExterno } from '../../services/clientesApi';
import { registrarAccion, ENTORNO } from '../../services/historialService';

const INPUT_CLS =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition';

const FIELD_ORDER = [
  'NIP', 'NUMSUS', 'NOMSUS', 'NOMEMP', 'EMAIL', 'NUMTELE1', 'NUMEXT2',
  'TIPSUS', 'PRODUCTO', 'INIPERSUS', 'FINPERSUS', 'TOTNUMLLA', 'STATUS',
  'CALLE', 'COLONIA', 'CODPOS', 'CIUDAD', 'ESTADO', 'partner_id', 'orderhdr_id',
];

const FIELD_LABELS = {
  NIP: 'NIP',
  NUMSUS: 'No. Suscripción',
  NOMSUS: 'Nombre',
  NOMEMP: 'Empresa',
  EMAIL: 'Email',
  NUMTELE1: 'Teléfono',
  NUMEXT2: 'Ext.',
  TIPSUS: 'Tipo Suscripción',
  PRODUCTO: 'Producto',
  INIPERSUS: 'Inicio',
  FINPERSUS: 'Fin',
  TOTNUMLLA: 'Total Llamadas',
  STATUS: 'Status',
  CALLE: 'Calle',
  COLONIA: 'Colonia',
  CODPOS: 'Código Postal',
  CIUDAD: 'Ciudad',
  ESTADO: 'Estado',
  partner_id: 'Partner ID (OPIT)',
  orderhdr_id: 'Order Header ID',
};

function Spinner({ size = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${size}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function Alert({ type, message, onClear }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClear, 6000);
    return () => clearTimeout(t);
  }, [message, onClear]);

  if (!message) return null;
  const cls = type === 'success'
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
      <span className="break-words">{message}</span>
    </div>
  );
}

function Badge({ color, children }) {
  const map = {
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    indigo: 'bg-indigo-100 text-indigo-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[color] || map.gray}`}>
      {children}
    </span>
  );
}

function FieldGrid({ record }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
      {FIELD_ORDER.map((key) => {
        if (!(key in record)) return null;
        const val = record[key];
        const display = val === null || val === undefined || val === '' ? '-' : String(val);
        return (
          <div key={key} className="min-w-0">
            <span className="text-gray-400">{FIELD_LABELS[key] || key}:</span>{' '}
            <span className="text-gray-800 font-medium break-words">{display}</span>
          </div>
        );
      })}
    </div>
  );
}

function SubHeader({ sub }) {
  const stageName = Array.isArray(sub.stage_id) ? sub.stage_id[1] : '-';
  const planName = Array.isArray(sub.plan_id) ? sub.plan_id[1] : (sub.plan_id || '-');
  const partnerName = Array.isArray(sub.partner_id) ? sub.partner_id[1] : '-';
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs text-indigo-900 space-y-0.5">
      <div><span className="text-indigo-500">Suscripción Odoo:</span> <span className="font-semibold">{sub.name}</span> <span className="text-indigo-400">#{sub.id}</span></div>
      <div><span className="text-indigo-500">Plan:</span> {planName} <span className="text-indigo-400 ml-2">Stage:</span> {stageName} <span className="text-indigo-400 ml-2">Inicio:</span> {sub.date_started || '-'}</div>
      <div><span className="text-indigo-500">Partner:</span> {partnerName}</div>
    </div>
  );
}

function RecordCard({ record, sub, environment, tabla, coincide, onInsertar, disabled }) {
  const canInsert = coincide && !record.vencido && !record.existeEnBase;
  let statusBadge;
  if (!coincide) statusBadge = <Badge color="gray">No coincide con la suscripción</Badge>;
  else if (record.vencido) statusBadge = <Badge color="red">Vencido — no se puede insertar</Badge>;
  else if (record.existeEnBase) statusBadge = <Badge color="amber">Ya existe en la base con esas fechas</Badge>;
  else statusBadge = <Badge color="green">Listo para insertar</Badge>;

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${canInsert ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-sm font-semibold text-gray-800">Registro OPIT</h4>
          {statusBadge}
          {environment && <Badge color="blue">{environment}</Badge>}
          {tabla && <Badge color="indigo">{tabla}</Badge>}
        </div>
        {coincide && (
          <button
            onClick={() => onInsertar({ record, sub })}
            disabled={!canInsert || disabled}
            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white text-xs font-medium transition"
          >
            Insertar
          </button>
        )}
      </div>

      <FieldGrid record={record} />

      {record.existeEnBase && Array.isArray(record.registrosExistentes) && record.registrosExistentes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          <p className="font-semibold mb-1">Registros existentes en base ({record.registrosExistentes.length}):</p>
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">{JSON.stringify(record.registrosExistentes, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function ConfirmModal({ target, onCancel, onConfirm, inserting }) {
  const { record, sub, environment, tabla } = target;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]">
        <div className="bg-green-600 rounded-t-2xl px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h3 className="font-semibold text-white">¿Es este NIP correcto?</h3>
          <div className="flex items-center gap-2">
            {environment && <Badge color="blue">{environment}</Badge>}
            {tabla && <Badge color="indigo">{tabla}</Badge>}
          </div>
        </div>
        <div className="px-6 py-4 space-y-3 overflow-y-auto">
          <p className="text-sm text-gray-600">
            Se insertará este registro en <span className="font-semibold">{tabla}</span> ({environment || ENTORNO}). Esta acción no se puede deshacer.
          </p>
          <SubHeader sub={sub} />
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <FieldGrid record={record} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-2 justify-end flex-shrink-0">
          <button
            onClick={onCancel}
            disabled={inserting}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={inserting}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium transition flex items-center gap-2"
          >
            {inserting && <Spinner />}
            {inserting ? 'Insertando...' : 'Confirmar e insertar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BuscarInsertarNip() {
  const { odooCall } = useOdooRpc();

  const [nipInput, setNipInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepLabel, setStepLabel] = useState('');
  const [alertMsg, setAlertMsg] = useState(null);
  const [info, setInfo] = useState(null);
  const [partnersActive, setPartnersActive] = useState([]);
  const [partnersExcluded, setPartnersExcluded] = useState([]);
  const [subsValid, setSubsValid] = useState([]);
  const [subsExcluded, setSubsExcluded] = useState([]);
  const [opitResults, setOpitResults] = useState([]);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [inserting, setInserting] = useState(false);

  const resetResults = () => {
    setInfo(null);
    setPartnersActive([]);
    setPartnersExcluded([]);
    setSubsValid([]);
    setSubsExcluded([]);
    setOpitResults([]);
  };

  const resetAll = () => {
    resetResults();
    setNipInput('');
    setConfirmTarget(null);
  };

  const handleBuscar = async (e) => {
    e.preventDefault();
    const nip = nipInput.trim();
    if (!nip) return;
    resetResults();
    setAlertMsg(null);
    setLoading(true);
    try {
      setStepLabel('Buscando contactos en Odoo...');
      const partners = await odooCall({
        model: 'res.partner',
        method: 'search_read',
        args: [
          [['nip_custom', '=', Number(nip)]],
          ['id', 'name', 'email', 'nip_custom', 'subscription_ids', 'is_company', 'is_active_subscription'],
          0,
        ],
      });

      if (!partners || partners.length === 0) {
        setInfo('No se encontró ningún contacto en Odoo con ese NIP.');
        return;
      }

      const active = partners.filter((p) => p.is_active_subscription === true);
      const excluded = partners.filter((p) => p.is_active_subscription !== true);
      setPartnersActive(active);
      setPartnersExcluded(excluded);

      if (active.length === 0) {
        setInfo('El contacto existe en Odoo pero no tiene una suscripción activa.');
        return;
      }

      const allSubIds = [...new Set(active.flatMap((p) => p.subscription_ids || []))];
      if (allSubIds.length === 0) {
        setInfo('El contacto no tiene suscripciones.');
        return;
      }

      setStepLabel('Consultando suscripciones en Odoo...');
      const subs = await odooCall({
        model: 'sale.subscription',
        method: 'search_read',
        args: [
          [['id', 'in', allSubIds]],
          ['id', 'name', 'partner_id', 'stage_id', 'date_started', 'date_start', 'next_invoice_date', 'plan_id'],
          0,
        ],
      });

      const valid = (subs || []).filter((s) => Array.isArray(s.stage_id) && s.stage_id[0] === 10);
      const exSubs = (subs || []).filter((s) => !(Array.isArray(s.stage_id) && s.stage_id[0] === 10));
      setSubsValid(valid);
      setSubsExcluded(exSubs);

      if (valid.length === 0) {
        setInfo('No hay suscripciones en proceso para este NIP.');
        return;
      }

      setStepLabel('Consultando OPIT...');
      const opit = await Promise.all(
        valid.map(async (s) => {
          try {
            const resp = await buscarExterno({ nip, dateStarted: s.date_started, numsus: s.id });
            return { sub: s, resp, error: null };
          } catch (err) {
            return { sub: s, resp: null, error: err.message };
          }
        })
      );
      setOpitResults(opit);
    } catch (err) {
      setAlertMsg({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
      setStepLabel('');
    }
  };

  const handleInsertarClick = ({ record, sub }) => {
    const r = opitResults.find((x) => x.sub.id === sub.id);
    setConfirmTarget({
      record,
      sub,
      environment: r?.resp?.environment,
      tabla: r?.resp?.tabla,
    });
  };

  const confirmInsertar = async () => {
    if (!confirmTarget) return;
    const { record, sub } = confirmTarget;
    const partnerOdooId = Array.isArray(sub.partner_id) ? sub.partner_id[0] : sub.partner_id;
    setInserting(true);
    try {
      const resp = await insertarClienteExterno({
        nip: String(record.NIP),
        dateStarted: sub.date_started,
        numsus: sub.id,
      });
      const llaveUnica = resp?.detalles?.llave_unica;
      registrarAccion({
        accion: 'INSERTAR_NIP',
        modulo: 'NIPS',
        resultado: 'EXITO',
        detalle: {
          nip: record.NIP,
          numsus: sub.id,
          dateStarted: sub.date_started,
          INIPERSUS: record.INIPERSUS,
          FINPERSUS: record.FINPERSUS,
          nombre: record.NOMSUS,
          partnerOdooId,
          llave_unica: llaveUnica,
          httpStatus: 200,
          suscripcionOdoo: sub.name,
        },
      });
      resetAll();
      setAlertMsg({
        type: 'success',
        message: `${resp?.message || 'Cliente insertado exitosamente.'}${llaveUnica ? ` · Llave única: ${llaveUnica}` : ''}`,
      });
    } catch (err) {
      registrarAccion({
        accion: 'INSERTAR_NIP',
        modulo: 'NIPS',
        resultado: 'ERROR',
        detalle: {
          nip: record.NIP,
          numsus: sub.id,
          dateStarted: sub.date_started,
          INIPERSUS: record.INIPERSUS,
          FINPERSUS: record.FINPERSUS,
          nombre: record.NOMSUS,
          partnerOdooId,
          httpStatus: err.status || null,
          error: err.message,
          suscripcionOdoo: sub.name,
        },
      });
      setAlertMsg({ type: 'error', message: err.message });
      setConfirmTarget(null);
    } finally {
      setInserting(false);
    }
  };

  const hasAnyResult = partnersActive.length > 0 || partnersExcluded.length > 0 || subsValid.length > 0 || subsExcluded.length > 0 || opitResults.length > 0;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border-l-4 border-blue-400 px-4 py-3 rounded-r-lg text-sm text-blue-800">
        <p className="font-medium mb-1">Insertar NIP rezagado</p>
        <p className="text-xs">Busca un NIP existente en Odoo que aún no esté en la tabla de clientes. La inserción toma los datos de OPIT; aquí solo validas y confirmas.</p>
      </div>

      <form onSubmit={handleBuscar} className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={nipInput}
          onChange={(e) => setNipInput(e.target.value.replace(/\D/g, ''))}
          placeholder="NIP (solo números)"
          disabled={loading || inserting}
          className={INPUT_CLS + ' flex-1'}
        />
        <button
          type="submit"
          disabled={loading || inserting || !nipInput.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg text-sm transition flex items-center gap-2 whitespace-nowrap"
        >
          {loading && <Spinner />}
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {alertMsg && <Alert type={alertMsg.type} message={alertMsg.message} onClear={() => setAlertMsg(null)} />}

      {loading && stepLabel && (
        <div className="flex items-center justify-center gap-3 text-sm text-gray-500 py-3">
          <Spinner />
          <span>{stepLabel}</span>
        </div>
      )}

      {info && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          {info}
        </div>
      )}

      {hasAnyResult && (
        <div className="space-y-4">
          {(partnersActive.length > 0 || partnersExcluded.length > 0) && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Contactos en Odoo
              </h3>
              {partnersActive.length > 0 && (
                <div className="space-y-2">
                  {partnersActive.map((p) => (
                    <div key={p.id} className="border border-green-200 bg-green-50 rounded-lg px-3 py-2 text-sm text-green-900 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.name} <span className="text-green-700 text-xs">#{p.id}</span></div>
                        <div className="text-xs text-green-700 truncate">{p.email || 'Sin email'}</div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Badge color="green">Suscripción activa</Badge>
                        <Badge color="gray">{p.is_company ? 'Empresa' : 'Persona'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {partnersExcluded.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">Excluidos (sin suscripción activa):</p>
                  {partnersExcluded.map((p) => (
                    <div key={p.id} className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.name} <span className="text-gray-500 text-xs">#{p.id}</span></div>
                        <div className="text-xs text-gray-500 truncate">{p.email || 'Sin email'}</div>
                      </div>
                      <Badge color="gray">{p.is_company ? 'Empresa' : 'Persona'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {(subsValid.length > 0 || subsExcluded.length > 0) && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Suscripciones
              </h3>
              {subsValid.length > 0 && (
                <div className="space-y-2">
                  {subsValid.map((s) => <SubHeader key={s.id} sub={s} />)}
                </div>
              )}
              {subsExcluded.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">Excluidas (no están en proceso):</p>
                  {subsExcluded.map((s) => {
                    const stageName = Array.isArray(s.stage_id) ? s.stage_id[1] : '-';
                    return (
                      <div key={s.id} className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-700 flex items-center justify-between gap-2">
                        <span><span className="font-semibold">{s.name}</span> <span className="text-gray-500">#{s.id}</span></span>
                        <Badge color="gray">{stageName}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {opitResults.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Resultados OPIT
              </h3>
              {opitResults.map(({ sub, resp, error }) => {
                const records = resp?.data || [];
                const coincide = records.filter((r) => r.coincideSuscripcion === true);
                const noCoincide = records.filter((r) => r.coincideSuscripcion !== true);
                const showAllAsInfo = coincide.length === 0 && records.length > 0;
                return (
                  <div key={sub.id} className="space-y-2">
                    <SubHeader sub={sub} />
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                        Error consultando OPIT: {error}
                      </div>
                    )}
                    {!error && records.length === 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                        OPIT no devolvió registros para esta suscripción y fecha.
                      </div>
                    )}
                    {!error && showAllAsInfo && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                        OPIT tiene registros para la fecha, pero ninguno coincide con la suscripción ({sub.name} #{sub.id}). Se muestran abajo como informativos — revisa en Odoo u OPIT si hay datos por corregir.
                      </div>
                    )}
                    {coincide.map((r, i) => (
                      <RecordCard
                        key={`coin-${sub.id}-${i}`}
                        record={r}
                        sub={sub}
                        environment={resp?.environment}
                        tabla={resp?.tabla}
                        coincide={true}
                        onInsertar={handleInsertarClick}
                        disabled={inserting}
                      />
                    ))}
                    {showAllAsInfo && noCoincide.map((r, i) => (
                      <RecordCard
                        key={`nocoin-${sub.id}-${i}`}
                        record={r}
                        sub={sub}
                        environment={resp?.environment}
                        tabla={resp?.tabla}
                        coincide={false}
                        onInsertar={handleInsertarClick}
                        disabled={inserting}
                      />
                    ))}
                  </div>
                );
              })}
            </section>
          )}
        </div>
      )}

      {confirmTarget && (
        <ConfirmModal
          target={confirmTarget}
          inserting={inserting}
          onCancel={() => !inserting && setConfirmTarget(null)}
          onConfirm={confirmInsertar}
        />
      )}
    </div>
  );
}
