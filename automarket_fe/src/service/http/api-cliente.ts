import { clearStoredSession, getStoredSession } from "../../features/auth/session";

const getBaseUrl = () => {
  return import.meta.env.VITE_API_URL ?? "http://localhost:3000";
};

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown; // aceita objeto — o client serializa em JSON automaticamente
}

export class ApiError extends Error {
  status: number = 0;
  details: unknown = undefined;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;
  const session = getStoredSession();

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 com sessão ativa = token expirado/inválido, não credenciais erradas
  // de login (login não manda Authorization, então cai fora deste ramo e
  // deixa o 401 virar ApiError normal pra tela de login tratar inline).
  if (response.status === 401 && session) {
    clearStoredSession();
    window.location.href = "/login";
    return new Promise<T>(() => {});
  }

  // 204 No Content não tem corpo pra parsear
  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.message ?? "Erro na requisição.",
      data,
    );
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
