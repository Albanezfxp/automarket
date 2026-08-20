import type { ReactNode } from "react";
import styles from "./CategoryCarousel.module.css";

interface CategoryCarouselProps {
  title: string;
  children: ReactNode;
}

/**
 * Carrossel horizontal simples via `overflow-x: auto` + `scroll-snap` —
 * decisão: nenhuma dependência de carrossel foi adicionada (não havia
 * nenhuma no package.json já instalado), scroll nativo já cobre a
 * necessidade de "arrastar/rolar horizontalmente" sem custo de bundle.
 */
export function CategoryCarousel({ title, children }: CategoryCarouselProps) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
      </div>
      <div className={styles.track}>{children}</div>
    </section>
  );
}
