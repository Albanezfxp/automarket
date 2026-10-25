import { Component, type ErrorInfo, type ReactNode } from "react";
import styles from "./ErrorBoundary.module.css";

interface Props {
  children: ReactNode;
}

interface State {
  falhou: boolean;
}

/**
 * Última rede de segurança da árvore React: sem ela, um erro de render ou
 * uma falha ao baixar o chunk de uma rota lazy (deploy novo invalida os
 * hashes antigos) deixa a tela em branco. Aqui o usuário vê uma mensagem e
 * um botão para recarregar.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { falhou: false };

  static getDerivedStateFromError(): State {
    return { falhou: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro não tratado na interface:", error, info.componentStack);
  }

  render() {
    if (!this.state.falhou) return this.props.children;

    return (
      <div className={styles.container} role="alert">
        <h1 className={styles.titulo}>Algo deu errado</h1>
        <p className={styles.texto}>
          Não foi possível exibir esta página. Recarregue para tentar de novo.
        </p>
        <button
          type="button"
          className={styles.botao}
          onClick={() => window.location.reload()}
        >
          Recarregar página
        </button>
      </div>
    );
  }
}
