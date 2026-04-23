import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { storeAccessToken } from "../api/client";
import { authApi } from "../api/services";
import { AuthUser, Role, SchoolType, StudentLevel, StudentProfileType, Stream } from "../types/models";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    role: Role;
    schoolId?: string;
    registrationNumber?: string;
    dateOfBirth?: string;
    profileType?: StudentProfileType;
    level?: StudentLevel;
    stream?: Stream;
    guardianPhone?: string;
    dreamCareer?: string;
    targetProfession?: string;
    learningObjectives?: string;
    admissionYear?: number;
    employeeCode?: string;
    speciality?: string;
    schoolName?: string;
    schoolCode?: string;
    schoolCity?: string;
    schoolCountry?: string;
    schoolType?: SchoolType;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    storeAccessToken(null);
    void authApi.logout().catch(() => undefined);
    setUser(null);
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const session = await authApi.refresh();
      storeAccessToken(session.accessToken || session.token || null);

      try {
        const currentUser = await authApi.me();
        setUser(currentUser);
      } catch {
        setUser(session.user);
      }
    } catch {
      storeAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    function onAuthExpired() {
      storeAccessToken(null);
      setUser(null);
    }

    window.addEventListener("kso:auth-expired", onAuthExpired);
    return () => {
      window.removeEventListener("kso:auth-expired", onAuthExpired);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login({ email, password });
    storeAccessToken(result.accessToken || result.token);

    try {
      const currentUser = await authApi.me();
      setUser(currentUser);
    } catch {
      setUser(result.user);
    }
  }, []);

  const register = useCallback(async (payload: {
    email: string;
    password: string;
    fullName: string;
    role: Role;
    schoolId?: string;
    registrationNumber?: string;
    dateOfBirth?: string;
    profileType?: StudentProfileType;
    level?: StudentLevel;
    stream?: Stream;
    guardianPhone?: string;
    dreamCareer?: string;
    targetProfession?: string;
    learningObjectives?: string;
    admissionYear?: number;
    employeeCode?: string;
    speciality?: string;
    schoolName?: string;
    schoolCode?: string;
    schoolCity?: string;
    schoolCountry?: string;
    schoolType?: SchoolType;
  }) => {
    const result = await authApi.register(payload);
    storeAccessToken(result.accessToken || result.token);

    try {
      const currentUser = await authApi.me();
      setUser(currentUser);
    } catch {
      setUser(result.user);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext doit etre utilise avec AuthProvider");
  }

  return context;
}
