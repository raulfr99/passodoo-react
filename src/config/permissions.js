const usersWithFullAccess = [
  'jonatan.ramos@idconline.mx',
  'raul.flores@idconline.mx',
  'asilva@idconline.mx',
];

const usersWithINPCAccess = ['eromero@idconline.mx'];

const usersWithConsultaAccess = [
  'racosta@idconline.mx',
  'floridalma.arreola@idconline.mx',
  'veronica.gonzalez@idconline.mx',
  'maria.ayala@idconline.mx',
  'noemi.escorza@idconline.mx',
  'asilva@idconline.mx',
  'alex@idconline.mx',
  'jonatan.ramos@idconline.mx',
  'raul.flores@idconline.mx',
  'gustavo.vidal@idconline.mx',
  'isaias.garcia@idconline.mx',
  'cesar.chavez@idconline.mx',
  'venta_online@idconline.mx',
];

const usersWithContactManagement = [
  'racosta@idconline.mx',
  'floridalma.arreola@idconline.mx',
  'veronica.gonzalez@idconline.mx',
  'maria.ayala@idconline.mx',
  'asilva@idconline.mx',
  'alex@idconline.mx',
  'jonatan.ramos@idconline.mx',
  'raul.flores@idconline.mx',
  'gustavo.vidal@idconline.mx',
  'isaias.garcia@idconline.mx',
  'cesar.chavez@idconline.mx',
  'venta_online@idconline.mx',
  'karen.gonzalez@idconline.mx',
];

export function getUserRole(email) {
  if (usersWithFullAccess.includes(email)) return 'admin';
  if (usersWithINPCAccess.includes(email)) return 'inpc';
  if (usersWithContactManagement.includes(email)) return 'contacts';
  if (usersWithConsultaAccess.includes(email)) return 'consulta';
  return null;
}

export const CLIENTES_ALLOWED_EMAILS = [
  'racosta@idconline.mx',
  'venta_online@idconline.mx',
  'floridalma.arreola@idconline.mx',
  'asilva@idconline.mx',
  'jonatan.ramos@idconline.mx',
  'raul.flores@idconline.mx',
  'veronica.gonzalez@idconline.mx',
  'karen.gonzalez@idconline.mx',
];

export const TAB_PERMISSIONS = {
  admin: ['consulta', 'cambiar', 'crear', 'fusionar', 'tipocontacto', 'inpc', 'clientes'],
  contacts: ['consulta', 'cambiar', 'crear', 'fusionar', 'tipocontacto', 'inpc'],
  inpc: ['inpc'],
  consulta: ['consulta', 'cambiar', 'crear'],
};
