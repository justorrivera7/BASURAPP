import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("recolecta_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("recolecta_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("recolecta_token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("recolecta_token");
    setUser(null);
  };

  const refreshUser = async () => {
    const res = await api.get("/me");
    setUser(res.data);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
