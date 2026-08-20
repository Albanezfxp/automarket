import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../service/http/api-cliente";
import plate from "../../styles/plate.module.css";
import { useAuth } from "./AuthContext";
import { usePageTitle } from "../../lib/usePageTitle";
import styles from "./AuthPage.module.css";

export default function LoginPage() {
  usePageTitle("Entrar · AutoMarket");
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("E-mail ou senha inválidos.");
      } else {
        setError("Não foi possível entrar. Tente novamente.");
      }
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
          <span className={styles.heroEyebrow}>Painel de gestão</span>
          <h1 className={styles.heroTitle}>Seu estoque, sua marca, seu painel.</h1>
          <p className={styles.heroText}>
            Cada loja entra com sua própria identidade — o AutoMarket fica nos bastidores cuidando dos
            números: estoque, contatos e conversão em um só lugar.
          </p>
          <div className={styles.heroBadgeRow}>
            <span className={`${plate.plate} ${plate.plateAccent}`}>Painel próprio</span>
            <span className={`${plate.plate} ${plate.plateOutline}`}>Sem taxa por venda</span>
          </div>
        </div>

        <ul className={styles.heroTags}>
          <li className={styles.heroTag}>
            <span className="material-symbols-outlined">inventory_2</span>
            Estoque e vendedores sob controle
          </li>
          <li className={styles.heroTag}>
            <span className="material-symbols-outlined">forum</span>
            Contatos de WhatsApp rastreados por veículo
          </li>
          <li className={styles.heroTag}>
            <span className="material-symbols-outlined">lock</span>
            Faturamento protegido por senha do gerente
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

          <h1 className={styles.title}>Entrar</h1>
          <p className={styles.subtitle}>Acesse o painel da sua loja.</p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {error && <p className={styles.formError}>{error}</p>}

            <label className={styles.field}>
              <span className={styles.label}>E-mail</span>
              <input
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Senha</span>
              <input
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <button type="submit" className={styles.submit} disabled={submitting}>
              {submitting ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className={styles.footer}>
            Ainda não tem uma loja?{" "}
            <Link to="/registro" className={styles.link}>
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
