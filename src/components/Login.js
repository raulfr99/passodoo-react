import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';

const LOGO_URL = 'https://idc.opit.mx/web/image/res.company/1/logo?unique=f3cce4d';

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState('');

  const handleSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      const result = login({
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      });
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      setError('Error al procesar las credenciales de Google.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6">
        <img src={LOGO_URL} alt="IDC Online" className="h-16 object-contain" />

        <div className="text-center">
          <h1 className="text-2xl font-light text-gray-800 tracking-tight">
            Gestión de Contraseñas
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Inicia sesión con tu cuenta <span className="font-medium">@idconline.mx</span>
          </p>
        </div>

        {error && (
          <div className="w-full flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setError('Error al iniciar sesión con Google.')}
          useOneTap={false}
          theme="outline"
          size="large"
          text="continue_with"
          shape="rectangular"
        />
      </div>
    </div>
  );
}
