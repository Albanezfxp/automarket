import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "../../../../components/Modal/Modal";
import { SingleImageField } from "../../../../components/SingleImageField/SingleImageField";
import { formatWhatsapp } from "../../../../lib/format";
import { ApiError } from "../../../../service/http/api-cliente";
import { vendedoresService } from "../../../../service/Vendedores.service";
import type { Vendedor } from "../../../../types/seller";
import styles from "./SellerFormModal.module.css";

interface SellerFormModalProps {
  isOpen: boolean;
  vendedor?: Vendedor | null;
  onClose: () => void;
  onSaved: (vendedor: Vendedor) => void;
}

interface FormState {
  nome: string;
  whatsapp: string;
  fotoUrl: string;
  ativo: boolean;
}

const INITIAL_STATE: FormState = { nome: "", whatsapp: "", fotoUrl: "", ativo: true };

type Errors = Partial<Record<"nome" | "whatsapp", string>>;

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.nome.trim()) errors.nome = "Informe o nome.";
  if (!/^\d{10,15}$/.test(form.whatsapp)) {
    errors.whatsapp = "Só números, com DDI e DDD (ex: 5583999998888).";
  }
  return errors;
}

/**
 * Modal de criar/editar vendedor — mesmo componente pros dois casos, a
 * presença de `vendedor` decide o modo. `ativo` só aparece editando: não faz
 * sentido cadastrar um vendedor já inativo.
 */
export function SellerFormModal({ isOpen, vendedor, onClose, onSaved }: SellerFormModalProps) {
  const isEditMode = Boolean(vendedor);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setSubmitError(null);
    setForm(
      vendedor
        ? {
            nome: vendedor.nome,
            whatsapp: vendedor.whatsapp,
            fotoUrl: vendedor.fotoUrl ?? "",
            ativo: vendedor.ativo,
          }
        : INITIAL_STATE,
    );
  }, [isOpen, vendedor]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        whatsapp: form.whatsapp,
        fotoUrl: form.fotoUrl || undefined,
      };
      const salvo =
        isEditMode && vendedor
          ? await vendedoresService.update(vendedor.id, { ...payload, ativo: form.ativo })
          : await vendedoresService.create(payload);
      onSaved(salvo);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : "Não foi possível salvar o vendedor.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const whatsappPreview = /^\d{12,13}$/.test(form.whatsapp) ? formatWhatsapp(form.whatsapp) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Editar vendedor" : "Adicionar vendedor"}
      footer={
        <>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.buttonPrimary}
            onClick={handleSubmit}
            disabled={submitting || photoUploading}
          >
            {photoUploading
              ? "Enviando foto..."
              : submitting
                ? "Salvando..."
                : isEditMode
                  ? "Salvar alterações"
                  : "Adicionar"}
          </button>
        </>
      }
    >
      <div className={styles.form}>
        <SingleImageField
          label="Foto"
          value={form.fotoUrl || undefined}
          onChange={(url) => updateField("fotoUrl", url)}
          pasta="vendedores"
          onUploadingChange={setPhotoUploading}
        />

        <Field label="Nome" required error={errors.nome}>
          <input
            type="text"
            className={`${styles.input} ${errors.nome ? styles.inputError : ""}`}
            value={form.nome}
            onChange={(e) => updateField("nome", e.target.value)}
            placeholder="Nome completo"
            autoFocus
          />
        </Field>

        <Field
          label="WhatsApp"
          required
          error={errors.whatsapp}
          hint={whatsappPreview ?? "Só números, com DDI e DDD (ex: 5583999998888)"}
        >
          <input
            type="tel"
            className={`${styles.input} ${errors.whatsapp ? styles.inputError : ""}`}
            value={form.whatsapp}
            onChange={(e) => updateField("whatsapp", e.target.value.replace(/\D/g, "").slice(0, 15))}
            placeholder="5583999998888"
          />
        </Field>

        {isEditMode && (
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => updateField("ativo", e.target.checked)}
            />
            Vendedor ativo
          </label>
        )}

        {submitError && <p className={styles.submitError}>{submitError}</p>}
      </div>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function Field({ label, required, error, hint, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <span className={`${styles.label} ${required ? styles.required : ""}`}>{label}</span>
      {children}
      {error ? (
        <span className={styles.errorText}>{error}</span>
      ) : (
        hint && <span className={styles.hintText}>{hint}</span>
      )}
    </div>
  );
}
