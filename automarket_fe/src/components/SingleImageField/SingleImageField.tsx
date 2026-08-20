import { useState } from "react";
import {
  uploadFileToR2,
  uploadsService,
  type PresignPasta,
} from "../../service/Uploads.service";
import styles from "./SingleImageField.module.css";

interface SingleImageFieldProps {
  label: string;
  value: string | undefined;
  onChange: (url: string) => void;
  pasta: PresignPasta;
  onUploadingChange?: (uploading: boolean) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 8_000_000;

type UploadStatus = "idle" | "uploading" | "done" | "error";

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type))
    return "Formato não suportado. Use JPG, PNG ou WEBP.";
  if (file.size > MAX_SIZE_BYTES) return "Arquivo maior que 8MB.";
  return null;
}

/**
 * Slot único de upload direto pro Cloudflare R2 via URL pré-assinada —
 * versão simplificada de `ImageListField` sem lista, `ordem` ou `capa`,
 * pra campos como logo/banner da loja que têm no máximo uma imagem.
 */
export function SingleImageField({
  label,
  value,
  onChange,
  pasta,
  onUploadingChange,
}: SingleImageFieldProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setStatus("error");
      setErrorMessage(validationError);
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setStatus("uploading");
    setProgress(0);
    setErrorMessage(undefined);
    onUploadingChange?.(true);

    try {
      const { uploadUrl, publicUrl } = await uploadsService.presignImage({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        pasta,
      });

      await uploadFileToR2(uploadUrl, file, setProgress);

      onChange(publicUrl);
      setStatus("done");
      setProgress(100);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Falha ao enviar a imagem.",
      );
    } finally {
      onUploadingChange?.(false);
    }
  }

  const thumbnailSrc = value || previewUrl;

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>{label}</span>
      <div className={styles.row}>
        {thumbnailSrc ? (
          <div className={styles.thumbnail}>
            <img src={thumbnailSrc} alt="" />
          </div>
        ) : (
          <div className={styles.thumbnailEmpty}>
            <span className="material-symbols-outlined">image</span>
          </div>
        )}

        <div className={styles.fileArea}>
          <input
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            className={styles.fileInput}
            onChange={(event) =>
              handleFileSelected(event.target.files?.[0])
            }
          />
          {status === "uploading" && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {status === "error" && (
            <span className={styles.errorText}>{errorMessage}</span>
          )}
        </div>
      </div>
    </div>
  );
}
