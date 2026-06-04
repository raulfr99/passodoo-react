import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserRole } from '../config/permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        sessionStorage.removeItem('user');
      }
    }
  }, []);

  const login = (googleProfile) => {
    const role = getUserRole(googleProfile.email);
    if (!role) return { error: 'Solo los usuarios asignados pueden acceder.' };
    const userData = {
      email: googleProfile.email,
      name: googleProfile.name,
      picture: googleProfile.picture,
      role,
    };
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return { success: true };
  };

  const logout = () => {
    sessionStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
