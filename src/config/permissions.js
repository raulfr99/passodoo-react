const ADMINS = [
  'raul.flores@idconline.mx',
  'asilva@idconline.mx',
  'alex@idconline.mx',
  'jonatan.ramos@idconline.mx',
];

const FULL_ACCESS_USERS = [
  'racosta@idconline.mx',
  'gustavo.vidal@idconline.mx',
  'karen.gonzalez@idconline.mx',
];

const BASE_TABS = [
  'consulta',
  'cambiar',
  'crear',
  'fusionar',
  'tipocontacto',
  'clientes',
  'insertar',
];

export const TAB_PERMISSIONS = {
  admin: [...BASE_TABS, 'historial'],
  full: BASE_TABS,
};

export function getUserRole(email) {
  if (ADMINS.includes(email)) return 'admin';
  if (FULL_ACCESS_USERS.includes(email)) return 'full';
  return null;
}
