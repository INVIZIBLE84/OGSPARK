"use client";

import { useState, useEffect, useContext, createContext, ReactNode } from "react";
import { AuthService, LoginPayload, RegisterPayload } from "../services/auth";
// If you have a User type, uncomment this line
// import { User } from "../types/user";

interface AuthContextType {
  user: any | null; // change to User | null if you import User
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const fetchedUser = await AuthService.getMe();
          setUser(fetchedUser);
        }
      } catch (error) {
        console.error("Failed to load user:", error);
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (payload: LoginPayload) => {
    setLoading(true);
    try {
      const userData = await AuthService.login(payload);
      setUser(userData.user);
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setLoading(true);
    try {
      const userData = await AuthService.register(payload);
      setUser(userData.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await AuthService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
