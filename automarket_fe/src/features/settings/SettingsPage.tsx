import { useState, type FormEvent, type ReactNode } from "react";
import { SingleImageField } from "../../components/SingleImageField/SingleImageField";
import { formatWhatsapp } from "../../lib/format";
import { ApiError } from "../../service/http/api-cliente";
import { lojasService } from "../../service/Lojas.service";
import { useAuth } from "../auth/AuthContext";
import styles from "./SettingsPage.module.css";

export default function SettingsPage() {
  const { loja, updateLoja } = useAuth();

  const [nome, setNome] = useState(loja?.nome ?? "");
  const [email, setEmail] = useState(loja?.email ?? "");
  const [telefone, setTelefone] = useState(loja?.telefone ?? "");
  const [whatsapp, setWhatsapp] = useState(loja?.whatsapp ?? "");
  const [horarioAbertura, setHorarioAbertura] = useState(
    loja?.horarioAbertura ?? "",
  );
  const [horarioFechamento, setHorarioFechamento] = useState(
    loja?.horarioFechamento ?? "",
  );
  const [facebookUrl, setFacebookUrl] = useState(loja?.facebookUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(loja?.instagramUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(loja?.youtubeUrl ?? "");
  const [logo, setLogo] = useState(loja?.logo ?? "");
  const [banner, setBanner] = useState(loja?.banner ?? "");
  const [corPrimaria, setCorPrimaria] = useState(loja?.corPrimaria ?? "");
  const [corSecundaria, setCorSecundaria] = useState(loja?.corSecundaria ?? "");
  const [cep, setCep] = useState(loja?.endereco?.cep ?? "");
  const [rua, setRua] = useState(loja?.endereco?.rua ?? "");
  const [numero, setNumero] = useState(loja?.endereco?.numero ?? "");
  const [bairro, setBairro] = useState(loja?.endereco?.bairro ?? "");
  const [cidade, setCidade] = useState(loja?.endereco?.cidade ?? "");
  const [estado, setEstado] = useState(loja?.endereco?.estado ?? "");

  const [managerPassword, setManagerPassword] = useState("");
  const [confirmManagerPassword, setConfirmManagerPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loja) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (
      (managerPassword || confirmManagerPassword) &&
      managerPassword !== confirmManagerPassword
    ) {
      setError("As senhas do gerente não coincidem.");
      return;
    }

    if (whatsapp && !/^\d{10,15}$/.test(whatsapp)) {
      setError("WhatsApp deve conter só números, com DDI e DDD (ex: 5583999998888).");
      return;
    }

    setSubmitting(true);
    try {
      const atualizada = await lojasService.update(loja!.id, {
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim() || undefined,
        whatsapp: whatsapp || undefined,
        horarioAbertura: horarioAbertura || undefined,
        horarioFechamento: horarioFechamento || undefined,
        facebookUrl: facebookUrl.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        youtubeUrl: youtubeUrl.trim() || undefined,
        logo: logo || undefined,
        banner: banner || undefined,
        corPrimaria: corPrimaria || undefined,
        corSecundaria: corSecundaria || undefined,
        managerPassword: managerPassword || undefined,
        confirmManagerPassword: confirmManagerPassword || undefined,
        endereco: {
          cep: cep.trim() || undefined,
          rua: rua.trim() || undefined,
          numero: numero.trim() || undefined,
          bairro: bairro.trim() || undefined,
          cidade: cidade.trim(),
          estado: estado.trim().toUpperCase(),
        },
      });

      updateLoja(atualizada);
      setManagerPassword("");
      setConfirmManagerPassword("");
      setSuccess("Configurações salvas com sucesso.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar as configurações.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2 className={styles.title}>Configurações</h2>
        <p className={styles.subtitle}>
          Identidade visual, dados de contato e segurança da loja.
        </p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {error && <p className={styles.formError}>{error}</p>}
        {success && <p className={styles.formSuccess}>{success}</p>}

        <Section icon="image" title="Identidade visual">
          <div className={styles.row}>
            <SingleImageField
              label="Logo"
              value={logo}
              onChange={setLogo}
              pasta="lojas/logo"
            />
            <SingleImageField
              label="Banner"
              value={banner}
              onChange={setBanner}
              pasta="lojas/banner"
            />
          </div>
        </Section>

        <Section
          icon="palette"
          title="Cores da marca"
          hint="Essas cores aparecem no site público da loja (catálogo que o cliente visita) — o painel administrativo continua com o visual padrão, igual para todas as lojas."
        >
          <div className={styles.row}>
            <Field label="Cor primária">
              <div className={styles.colorField}>
                <input
                  type="color"
                  className={styles.colorSwatch}
                  value={corPrimaria || "#091426"}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                />
                <input
                  className={styles.input}
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  placeholder="#091426 (opcional)"
                  maxLength={7}
                />
              </div>
            </Field>
            <Field label="Cor secundária">
              <div className={styles.colorField}>
                <input
                  type="color"
                  className={styles.colorSwatch}
                  value={corSecundaria || "#0058be"}
                  onChange={(e) => setCorSecundaria(e.target.value)}
                />
                <input
                  className={styles.input}
                  value={corSecundaria}
                  onChange={(e) => setCorSecundaria(e.target.value)}
                  placeholder="#0058be (opcional)"
                  maxLength={7}
                />
              </div>
            </Field>
          </div>
        </Section>

        <Section icon="storefront" title="Dados da loja">
          <div className={styles.row}>
            <Field label="Nome da loja">
              <input
                className={styles.input}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="Telefone">
              <input
                className={styles.input}
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Opcional"
              />
            </Field>
            <Field label="WhatsApp da loja">
              <input
                className={styles.input}
                value={whatsapp}
                onChange={(e) =>
                  setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 15))
                }
                placeholder="Opcional"
              />
              {/^\d{12,13}$/.test(whatsapp) && (
                <span className={styles.label}>{formatWhatsapp(whatsapp)}</span>
              )}
            </Field>
          </div>
        </Section>

        <Section
          icon="schedule"
          title="Horário de funcionamento"
          hint="Mesmo horário todos os dias úteis — exibido no rodapé do site público."
        >
          <div className={styles.row}>
            <Field label="Abre às">
              <input
                type="time"
                className={styles.input}
                value={horarioAbertura}
                onChange={(e) => setHorarioAbertura(e.target.value)}
              />
            </Field>
            <Field label="Fecha às">
              <input
                type="time"
                className={styles.input}
                value={horarioFechamento}
                onChange={(e) => setHorarioFechamento(e.target.value)}
              />
            </Field>
          </div>
        </Section>

        <Section
          icon="share"
          title="Redes sociais"
          hint="Só aparecem no rodapé do site público os ícones das redes preenchidas aqui."
        >
          <div className={styles.row}>
            <Field label="Facebook">
              <input
                type="url"
                className={styles.input}
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="Opcional"
              />
            </Field>
            <Field label="Instagram">
              <input
                type="url"
                className={styles.input}
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="Opcional"
              />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="YouTube">
              <input
                type="url"
                className={styles.input}
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Opcional"
              />
            </Field>
          </div>
        </Section>

        <Section icon="location_on" title="Endereço">
          <div className={styles.row}>
            <Field label="CEP">
              <input
                className={styles.input}
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="Opcional"
              />
            </Field>
            <Field label="Bairro">
              <input
                className={styles.input}
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Opcional"
              />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="Rua">
              <input
                className={styles.input}
                value={rua}
                onChange={(e) => setRua(e.target.value)}
                placeholder="Opcional"
              />
            </Field>
            <Field label="Número">
              <input
                className={styles.input}
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Opcional"
              />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="Cidade">
              <input
                className={styles.input}
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                required
              />
            </Field>
            <Field label="Estado (UF)">
              <input
                className={styles.input}
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
                maxLength={2}
                required
              />
            </Field>
          </div>
        </Section>

        <Section
          icon="lock"
          title="Senha do gerente"
          hint="Deixe em branco para manter a senha atual. Ela protege a visualização do faturamento no Dashboard."
        >
          <div className={styles.row}>
            <Field label="Nova senha do gerente">
              <input
                type="password"
                className={styles.input}
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
                minLength={8}
                placeholder="Opcional"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirmar nova senha">
              <input
                type="password"
                className={styles.input}
                value={confirmManagerPassword}
                onChange={(e) => setConfirmManagerPassword(e.target.value)}
                minLength={8}
                placeholder="Opcional"
                autoComplete="new-password"
              />
            </Field>
          </div>
        </Section>

        <div className={styles.footerBar}>
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface SectionProps {
  icon: string;
  title: string;
  hint?: string;
  children: ReactNode;
}

function Section({ icon, title, hint, children }: SectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={`material-symbols-outlined ${styles.sectionIcon}`}>
          {icon}
        </span>
        <div>
          <h3 className={styles.sectionTitle}>{title}</h3>
          {hint && <p className={styles.sectionHint}>{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  );
}
