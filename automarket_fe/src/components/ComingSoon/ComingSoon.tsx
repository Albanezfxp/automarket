import styles from './ComingSoon.module.css';

interface ComingSoonProps {
  icon: string;
  title: string;
  description: string;
}

/**
 * Placeholder para seções do painel ainda não implementadas (Veículos,
 * Vendedores, Configurações). Etapa atual do projeto é só o Dashboard —
 * as outras rotas existem para a navegação da sidebar fazer sentido.
 */
export function ComingSoon({ icon, title, description }: ComingSoonProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.icon}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
    </div>
  );
}
