import { memo, useEffect, useRef, useState } from 'react';
import { uploadsService, uploadFileToR2 } from '../../../../service/Uploads.service';
import styles from './ImageListField.module.css';

export interface ImagemFormRow {
  url: string;
  capa: boolean;
}

interface ImageListFieldProps {
  value: ImagemFormRow[];
  onChange: (rows: ImagemFormRow[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 8_000_000;

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

interface UploadRowState {
  status: UploadStatus;
  progress: number;
  errorMessage?: string;
  previewUrl?: string;
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Formato não suportado. Use JPG, PNG ou WEBP.';
  if (file.size > MAX_SIZE_BYTES) return 'Arquivo maior que 8MB.';
  return null;
}

/**
 * Lista dinâmica de fotos com upload direto pro Cloudflare R2 via URL
 * pré-assinada — o arquivo nunca passa pelo servidor Nest, só a assinatura.
 * Continua expondo pro formulário só `{ url, capa }` por linha; progresso e
 * preview/erro de cada upload são internos, mas `onUploadingChange` avisa o
 * pai sempre que alguma linha estiver com upload em andamento, pra ele poder
 * travar o botão de salvar até a foto terminar de subir.
 *
 * Memoizado porque `AddVehiclePage` re-renderiza inteiro a cada tecla
 * digitada em qualquer campo do form — sem o memo, essa lista de fotos (com
 * previews de imagem) seria refeita a cada keystroke de campos não relacionados.
 */
function ImageListFieldComponent({ value, onChange, onUploadingChange }: ImageListFieldProps) {
  const [uploadStates, setUploadStates] = useState<Record<number, UploadRowState>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    const anyUploading = Object.values(uploadStates).some((s) => s.status === 'uploading');
    onUploadingChange?.(anyUploading);
  }, [uploadStates, onUploadingChange]);

  function setRowUploadState(index: number, patch: Partial<UploadRowState>) {
    setUploadStates((prev) => {
      const current: UploadRowState = prev[index] ?? { status: 'idle', progress: 0 };
      return { ...prev, [index]: { ...current, ...patch } };
    });
  }

  function handleAdd() {
    onChange([...value, { url: '', capa: value.length === 0 }]);
  }

  function handleRemove(index: number) {
    const removida = value[index];
    const restante = value.filter((_, i) => i !== index);
    if (removida.capa && restante.length > 0 && !restante.some((r) => r.capa)) {
      restante[0] = { ...restante[0], capa: true };
    }
    onChange(restante);
    setUploadStates((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  function handleCapaChange(index: number) {
    onChange(value.map((row, i) => ({ ...row, capa: i === index })));
  }

  async function handleFileSelected(index: number, file: File | undefined) {
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setRowUploadState(index, { status: 'error', errorMessage: validationError });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setRowUploadState(index, { status: 'uploading', progress: 0, errorMessage: undefined, previewUrl });

    try {
      const { uploadUrl, publicUrl } = await uploadsService.presignImage({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        pasta: 'veiculos',
      });

      await uploadFileToR2(uploadUrl, file, (pct) => setRowUploadState(index, { progress: pct }));

      onChange(value.map((row, i) => (i === index ? { ...row, url: publicUrl } : row)));
      setRowUploadState(index, { status: 'done', progress: 100 });
    } catch (error) {
      setRowUploadState(index, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Falha ao enviar a foto.',
      });
    }
  }

  return (
    <div className={styles.wrapper}>
      <p className={styles.helperText}>Envie as fotos do veículo e marque qual é a capa do anúncio.</p>
      {value.map((row, index) => {
        const uploadState = uploadStates[index] ?? { status: 'idle' as UploadStatus, progress: 0 };
        const thumbnailSrc = row.url || uploadState.previewUrl;

        return (
          <div key={index} className={styles.row}>
            <label className={styles.capaRadio}>
              <input type="radio" name="imagem-capa" checked={row.capa} onChange={() => handleCapaChange(index)} />
              Capa
            </label>

            {thumbnailSrc && (
              <div className={styles.thumbnail}>
                <img src={thumbnailSrc} alt="" />
              </div>
            )}

            <div className={styles.fileArea}>
              <input
                ref={(el) => {
                  fileInputRefs.current[index] = el;
                }}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                className={styles.fileInput}
                onChange={(event) => handleFileSelected(index, event.target.files?.[0])}
              />
              {uploadState.status === 'uploading' && (
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${uploadState.progress}%` }} />
                </div>
              )}
              {uploadState.status === 'error' && <span className={styles.errorText}>{uploadState.errorMessage}</span>}
            </div>

            <button
              type="button"
              className={styles.removeButton}
              onClick={() => handleRemove(index)}
              disabled={value.length === 1}
              aria-label="Remover imagem"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>
        );
      })}
      <button type="button" className={styles.addButton} onClick={handleAdd}>
        <span className="material-symbols-outlined">add_photo_alternate</span>
        Adicionar foto
      </button>
    </div>
  );
}

export const ImageListField = memo(ImageListFieldComponent);
