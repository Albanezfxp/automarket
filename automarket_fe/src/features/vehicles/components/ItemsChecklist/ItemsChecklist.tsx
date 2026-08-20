import { memo } from 'react';
import { humanizeEnumValue } from '../../../../lib/humanize';
import { ITEM_VEICULO_CATEGORIAS, type ItemVeiculo } from '../../../../types/vehicleItem';
import styles from './ItemsChecklist.module.css';

interface ItemsChecklistProps {
  selecionados: ItemVeiculo[];
  onChange: (itens: ItemVeiculo[]) => void;
}

/**
 * Checklist de itens de série, agrupado pelas mesmas categorias comentadas
 * no enum `ItemVeiculo` do schema. Memoizado porque `AddVehiclePage` inteiro
 * re-renderiza a cada tecla digitada em qualquer campo do form — sem o memo,
 * essa grade de ~100 checkboxes seria refeita a cada keystroke.
 */
function ItemsChecklistComponent({ selecionados, onChange }: ItemsChecklistProps) {
  function toggle(item: ItemVeiculo) {
    if (selecionados.includes(item)) {
      onChange(selecionados.filter((i) => i !== item));
    } else {
      onChange([...selecionados, item]);
    }
  }

  return (
    <div className={styles.wrapper}>
      {ITEM_VEICULO_CATEGORIAS.map((categoria) => (
        <div key={categoria.label} className={styles.category}>
          <span className={styles.categoryTitle}>{categoria.label}</span>
          <div className={styles.optionsGrid}>
            {categoria.itens.map((item) => (
              <label key={item} className={styles.option}>
                <input type="checkbox" checked={selecionados.includes(item)} onChange={() => toggle(item)} />
                {humanizeEnumValue(item)}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export const ItemsChecklist = memo(ItemsChecklistComponent);
