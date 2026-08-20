import type { ChangeEvent } from "react";

interface NumberFieldProps {
  value: string;
  onChange: (raw: string) => void;
  className?: string;
  placeholder?: string;
  prefix?: string;
}

function formatarNumero(raw: string): string {
  if (!raw) return "";
  return Number(raw).toLocaleString("pt-BR");
}

/**
 * Input numérico com máscara de milhar em tempo real (ex: "89900" vira
 * "89.900" enquanto digita) — por isso é `type="text"` com
 * `inputMode="numeric"`, não `type="number"` (número nativo não aceita
 * separador de milhar digitado). Trocar de tipo já resolve de graça o
 * clássico bug de scroll do mouse mudando o valor de um `<input
 * type="number">` focado, mas o `onWheel` abaixo blinda mesmo assim (`blur`
 * no input assim que a roda do mouse é usada em cima dele).
 *
 * `value`/`onChange` sempre trafegam só os dígitos crus (ex: "89900"), pra
 * não mudar a forma como o form valida/envia o número — o `prefix` (ex:
 * "R$ ") é puramente visual. Propositalmente **não existe** um `suffix`:
 * um texto colado no final do valor (ex: " km") entra na frente do cursor
 * quando ele está no fim do campo, e o backspace passa a apagar letras do
 * sufixo em vez do número — trate a unidade como texto fora do input (no
 * label, por exemplo), não dentro do valor editável.
 */
export function NumberField({
  value,
  onChange,
  className,
  placeholder,
  prefix,
}: NumberFieldProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const digitos = event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    onChange(digitos);
  }

  const exibicao = value ? `${prefix ?? ""}${formatarNumero(value)}` : "";

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      value={exibicao}
      onChange={handleChange}
      onWheel={(event) => event.currentTarget.blur()}
      placeholder={placeholder}
    />
  );
}
