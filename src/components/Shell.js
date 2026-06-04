import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TAB_PERMISSIONS } from '../config/permissions';
import ConsultaPassword from './tabs/ConsultaPassword';
import CambiarPassword from './tabs/CambiarPassword';
import CrearUsuario from './tabs/CrearUsuario';
import FusionarContactos from './tabs/FusionarContactos';
import TipoContacto from './tabs/TipoContacto';
import ModificarINPC from './tabs/ModificarINPC';

const LOGO_URL = 'https://idc.opit.mx/web/image/res.company/1/logo?unique=f3cce4d';

const ALL_TABS = [
  { id: 'consulta', label: 'Consultar Contraseña', component: ConsultaPassword },
  { id: 'cambiar', label: 'Cambiar Contraseña', component: CambiarPassword },
  { id: 'crear', label: 'Crear Usuario', component: CrearUsuario },
  { id: 'fusionar', label: 'Fusionar Contactos', component: FusionarContactos },
  { id: 'tipocontacto', label: 'Tipo Contacto', component: TipoContacto },
  { id: 'inpc', label: 'Modificar INPC', component: ModificarINPC },
];

export default function Shell() {
  const { user, logout } = useAuth();
  const allowedTabs = TAB_PERMISSIONS[user?.role] || [];
  const visibleTabs = ALL_TABS.filter(t => allowedTabs.includes(t.id));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id || '');

  const ActiveComponent = visibleTabs.find(t => t.id === activeTab)?.component || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <img src={LOGO_URL} alt="IDC Online" className="h-9 object-contain" />
          <div className="flex items-center gap-3">
            {user?.picture && (
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name}</span>
            <button
              onClick={logout}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex flex-wrap gap-2 bg-gray-100 p-1.5 rounded-xl">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-fit px-3 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-6 py-6 min-h-[420px]">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
}
