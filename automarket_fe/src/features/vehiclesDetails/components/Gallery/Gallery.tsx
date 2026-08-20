import { useState } from "react";
import type { VeiculoImagem } from "../../../../types/vehicle";
import styles from "./Gallery.module.css";

interface GalleryProps {
  imagens: VeiculoImagem[];
  alt: string;
}

/** Galeria com imagem principal + miniaturas clicáveis, ordenada por `ordem`, com a capa em destaque. */
export function Gallery({ imagens, alt }: GalleryProps) {
  const ordenadas = [...imagens].sort((a, b) => a.ordem - b.ordem);
  const capaIndex = Math.max(
    ordenadas.findIndex((img) => img.capa),
    0,
  );
  const [ativo, setAtivo] = useState(capaIndex);

  if (ordenadas.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.main}>
          <div className={styles.mainEmpty}>
            <span className="material-symbols-outlined" style={{ fontSize: 56 }}>
              directions_car
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.main}>
        <img className={styles.mainImg} src={ordenadas[ativo].url} alt={alt} />
      </div>
      {ordenadas.length > 1 && (
        <div className={styles.thumbs}>
          {ordenadas.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className={`${styles.thumb} ${i === ativo ? styles.thumbActive : ""}`}
              onClick={() => setAtivo(i)}
            >
              <img src={img.url} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
