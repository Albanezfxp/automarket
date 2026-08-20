import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { authService } from "../../service/Auth.service";
import type { Loja } from "../../types/store";
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  type StoredSession,
} from "./session";

interface AuthContextValue {
  loja: Loja | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateLoja: (loja: Loja) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() =>
    getStoredSession(),
  );

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    setStoredSession(result);
    setSession(result);
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setSession(null);
  }, []);

  // Atualiza a loja da sessão sem exigir novo login — usado depois de um
  // PATCH bem-sucedido em /lojas/:id (ex: tela de Configurações).
  const updateLoja = useCallback((loja: Loja) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, loja };
      setStoredSession(next);
      return next;
    });
  }, []);

  const value: AuthContextValue = {
    loja: session?.loja ?? null,
    isAuthenticated: Boolean(session),
    login,
    logout,
    updateLoja,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de um <AuthProvider>.");
  }
  return context;
}
