import { apiClient } from "./http/api-cliente";

export interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export type PresignPasta =
  | "veiculos"
  | "lojas/logo"
  | "lojas/banner"
  | "vendedores";

export interface PresignUploadParams {
  fileName: string;
  contentType: string;
  fileSize: number;
  pasta: PresignPasta;
}

export const uploadsService = {
  presignImage: (params: PresignUploadParams) =>
    apiClient.post<PresignResponse>("/uploads/presign", params),
};

/**
 * Usa `XMLHttpRequest` em vez de `fetch` só por causa do `upload.onprogress`
 * — `fetch` não expõe progresso de upload de request body. Faz PUT direto
 * no R2, não passa pela nossa API, por isso fica fora de `uploadsService`.
 */
export function uploadFileToR2(
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Falha no upload (${xhr.status}).`));
      }
    };

    xhr.onerror = () => reject(new Error("Falha de rede durante o upload."));

    xhr.send(file);
  });
}
