export function useOdooRpc() {
  const ODOO_URL = process.env.REACT_APP_ODOO_URL;
  const DB = process.env.REACT_APP_ODOO_DB;
  const UID = parseInt(process.env.REACT_APP_ODOO_UID, 10);
  const PASS = process.env.REACT_APP_ODOO_PASS;

  const odooCall = async ({ model, method, args }) => {
    const response = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute',
          args: [DB, UID, PASS, model, method, ...args],
        },
        id: Math.floor(Math.random() * 9000) + 1,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error?.data?.message || 'Error RPC');
    return data.result;
  };

  const odooCallKw = async ({ model, method, args }) => {
    const response = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [DB, UID, PASS, model, method, args],
        },
        id: Math.floor(Math.random() * 9000) + 1,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error?.data?.message || 'Error RPC');
    return data.result;
  };

  const checkUsersBeforeMerge = async (primaryContactId, contactIdsToMerge) => {
    try {
      const users = await odooCall({
        model: 'res.users',
        method: 'search_read',
        args: [
          [['partner_id', 'in', contactIdsToMerge]],
          ['id', 'partner_id', 'login'],
        ],
      });

      if (users && users.length > 0) {
        const nonPrimaryUsers = users.filter(u => u.partner_id[0] !== primaryContactId);
        let deletedCount = 0;

        for (const u of nonPrimaryUsers) {
          try {
            const result = await odooCall({
              model: 'res.users',
              method: 'unlink',
              args: [[u.id]],
            });
            if (result !== false && result !== undefined) deletedCount++;
          } catch (e) {
            console.error(`Error eliminando usuario ${u.id}:`, e);
          }
        }

        return { success: true, deletedUsers: deletedCount };
      }

      return { success: true, deletedUsers: 0 };
    } catch (error) {
      return { success: false, error: error.message, deletedUsers: 0 };
    }
  };

  return { odooCall, odooCallKw, checkUsersBeforeMerge };
}
