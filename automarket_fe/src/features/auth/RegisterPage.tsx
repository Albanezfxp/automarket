import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../service/http/api-cliente";
import { lojasService } from "../../service/Lojas.service";
import plate from "../../styles/plate.module.css";
import { useAuth } from "./AuthContext";
import { usePageTitle } from "../../lib/usePageTitle";
import styles from "./AuthPage.module.css";

interface FormState {
  nome: string;
  email: string;
  telefone: string;
  password: string;
  confirmPassword: string;
  managerPassword: string;
  confirmManagerPassword: string;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
}

const INITIAL_STATE: FormState = {
  nome: "",
  email: "",
  telefone: "",
  password: "",
  confirmPassword: "",
  managerPassword: "",
  confirmManagerPassword: "",
  cep: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
};

export default function RegisterPage() {
  usePageTitle("Criar loja · AutoMarket");
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (form.managerPassword !== form.confirmManagerPassword) {
      setError("As senhas do gerente não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      await lojasService.register({
        nome: form.nome.trim(),
        email: form.email.trim(),
        telefone: form.telefone.trim() || undefined,
        password: form.password,
        confirm_password: form.confirmPassword,
        managerPassword: form.managerPassword,
        confirmManagerPassword: form.confirmManagerPassword,
        endereco: {
          cep: form.cep.trim() || undefined,
          rua: form.rua.trim() || undefined,
          numero: form.numero.trim() || undefined,
          bairro: form.bairro.trim() || undefined,
          cidade: form.cidade.trim(),
          estado: form.estado.trim().toUpperCase(),
        },
      });

      // Loga automaticamente com as credenciais recém-criadas em vez de
      // mandar o usuário de volta pro /login — fluxo mais direto.
      await login(form.email.trim(), form.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cadastrar a loja. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`admin-theme ${styles.page}`}>
      <aside className={styles.hero}>
        <div className={styles.heroBrand}>
          <div className={styles.heroLogo}>
            <span className="material-symbols-outlined">directions_car</span>
          </div>
          <span className={styles.heroBrandName}>AutoMarket</span>
        </div>

        <div className={styles.heroBody}>
          <span className={styles.heroEyebrow}>Nova loja</span>
          <h1 className={styles.heroTitle}>Coloque sua loja no ar em minutos.</h1>
          <p className={styles.heroText}>
            Cadastre os dados da loja e do gerente agora — o cadastro de veículos e vendedores acontece
            direto no painel, logo depois de entrar.
          </p>
          <div className={styles.heroBadgeRow}>
            <span className={`${plate.plate} ${plate.plateAccent}`}>Setup em minutos</span>
            <span className={`${plate.plate} ${plate.plateOutline}`}>Sua marca, não a nossa</span>
          </div>
        </div>

        <ul className={styles.heroTags}>
          <li className={styles.heroTag}>
            <span className="material-symbols-outlined">storefront</span>
            Identidade da loja, não da plataforma
          </li>
          <li className={styles.heroTag}>
            <span className="material-symbols-outlined">location_on</span>
            Endereço opcional — preencha quando quiser
          </li>
          <li className={styles.heroTag}>
            <span className="material-symbols-outlined">verified_user</span>
            Senha do gerente separada da senha de acesso
          </li>
        </ul>
      </aside>

      <div className={styles.formSide}>
        <div className={styles.card}>
          <div className={styles.mobileBrand}>
            <div className={styles.mobileBrandLogo}>
              <span className="material-symbols-outlined">directions_car</span>
            </div>
            <span className={styles.mobileBrandName}>AutoMarket</span>
          </div>

          <h1 className={styles.title}>Criar loja</h1>
          <p className={styles.subtitle}>
            Cadastre sua loja para começar a usar o painel.
          </p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <p className={styles.formError}>{error}</p>}

          <label className={styles.field}>
            <span className={styles.label}>Nome da loja</span>
            <input
              className={styles.input}
              value={form.nome}
              onChange={(e) => updateField("nome", e.target.value)}
              required
            />
          </label>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>E-mail</span>
              <input
                type="email"
                className={styles.input}
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Telefone</span>
              <input
                className={styles.input}
                value={form.telefone}
                onChange={(e) => updateField("telefone", e.target.value)}
                placeholder="Opcional"
              />
            </label>
          </div>

          <p className={styles.fieldsetTitle}>Senha de acesso</p>
          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Senha</span>
              <input
                type="password"
                className={styles.input}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Confirmar senha</span>
              <input
                type="password"
                className={styles.input}
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
          </div>

          <p className={styles.fieldsetTitle}>
            Senha do gerente (protege o faturamento no Dashboard)
          </p>
          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Senha do gerente</span>
              <input
                type="password"
                className={styles.input}
                value={form.managerPassword}
                onChange={(e) =>
                  updateField("managerPassword", e.target.value)
                }
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Confirmar senha do gerente</span>
              <input
                type="password"
                className={styles.input}
                value={form.confirmManagerPassword}
                onChange={(e) =>
                  updateField("confirmManagerPassword", e.target.value)
                }
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
          </div>

          <p className={styles.fieldsetTitle}>Endereço</p>
          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>CEP</span>
              <input
                className={styles.input}
                value={form.cep}
                onChange={(e) => updateField("cep", e.target.value)}
                placeholder="Opcional"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Bairro</span>
              <input
                className={styles.input}
                value={form.bairro}
                onChange={(e) => updateField("bairro", e.target.value)}
                placeholder="Opcional"
              />
            </label>
          </div>
          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Rua</span>
              <input
                className={styles.input}
                value={form.rua}
                onChange={(e) => updateField("rua", e.target.value)}
                placeholder="Opcional"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Número</span>
              <input
                className={styles.input}
                value={form.numero}
                onChange={(e) => updateField("numero", e.target.value)}
                placeholder="Opcional"
              />
            </label>
          </div>
          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Cidade</span>
              <input
                className={styles.input}
                value={form.cidade}
                onChange={(e) => updateField("cidade", e.target.value)}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Estado (UF)</span>
              <input
                className={styles.input}
                value={form.estado}
                onChange={(e) =>
                  updateField("estado", e.target.value.toUpperCase())
                }
                maxLength={2}
                required
              />
            </label>
          </div>

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? "Cadastrando..." : "Criar loja"}
          </button>
        </form>

          <p className={styles.footer}>
            Já tem uma loja?{" "}
            <Link to="/login" className={styles.link}>
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
