import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TAB_PERMISSIONS } from '../config/permissions';
import ConsultaPassword from './tabs/ConsultaPassword';
import CambiarPassword from './tabs/CambiarPassword';
import CrearUsuario from './tabs/CrearUsuario';
import FusionarContactos from './tabs/FusionarContactos';
import TipoContacto from './tabs/TipoContacto';
import Clientes from './tabs/Clientes';
import BuscarInsertarNip from './tabs/BuscarInsertarNip';
import Historial from './tabs/Historial';

const LOGO_URL = 'https://idc.opit.mx/web/image/res.company/1/logo?unique=f3cce4d';

const ALL_TABS = [
  { id: 'consulta', label: 'Consultar Contraseña', component: ConsultaPassword },
  { id: 'cambiar', label: 'Cambiar Contraseña', component: CambiarPassword },
  { id: 'crear', label: 'Crear Usuario', component: CrearUsuario },
  { id: 'fusionar', label: 'Fusionar Contactos', component: FusionarContactos },
  { id: 'tipocontacto', label: 'Tipo Contacto', component: TipoContacto },
  { id: 'clientes', label: 'Modificar/Eliminar NIPs', component: Clientes },
  { id: 'insertar', label: 'Buscar e insertar NIP', component: BuscarInsertarNip },
  { id: 'historial', label: 'Historial', component: Historial },
];

function TabBar({ tabs, activeTab, onChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 bg-gray-100 p-1.5 rounded-xl">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-2 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all leading-tight text-center ${
              active
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Shell() {
  const { user, logout } = useAuth();
  const allowedTabs = TAB_PERMISSIONS[user?.role] || [];
  const visibleTabs = ALL_TABS.filter((t) => allowedTabs.includes(t.id));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id || '');

  const ActiveComponent = visibleTabs.find((t) => t.id === activeTab)?.component || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white flex items-start sm:items-center justify-center px-2 py-3 sm:p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <img src={LOGO_URL} alt="IDC Online" className="h-8 sm:h-9 object-contain flex-shrink-0" />
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {user?.picture && (
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            )}
            <div className="hidden md:flex flex-col min-w-0">
              <span className="text-sm font-medium text-gray-700 truncate">{user?.name}</span>
              {user?.role === 'admin' && (
                <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">Admin</span>
              )}
            </div>
            <button
              onClick={logout}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium whitespace-nowrap"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-3 sm:px-6 pt-3 sm:pt-4">
          <TabBar tabs={visibleTabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* Tab content */}
        <div className="px-4 sm:px-6 py-5 sm:py-6 min-h-[420px]">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
}
