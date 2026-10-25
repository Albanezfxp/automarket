import { clearStoredSession, getStoredSession } from "../../features/auth/session";

/** Evento disparado quando o backend (modo demo) recusa uma escrita. */
export const READ_ONLY_EVENT = "automarket:read-only";

/** Cold start do Render free leva 30–60s; 60s evita abortar a 1ª requisição. */
const REQUEST_TIMEOUT_MS = 60_000;

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

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const timeout = err instanceof DOMException && err.name === "TimeoutError";
    throw new ApiError(
      0,
      timeout
        ? "O servidor demorou para responder. Tente novamente em instantes."
        : "Não foi possível conectar ao servidor.",
    );
  }

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
    if (response.status === 403 && data?.code === "READ_ONLY") {
      window.dispatchEvent(new Event(READ_ONLY_EVENT));
    }
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
