import type { Loja } from "../types/store";
import { apiClient } from "./http/api-cliente";

export interface LoginResponse {
  accessToken: string;
  loja: Loja;
}

export const authService = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>("/auth/login", { email, password }),
};
