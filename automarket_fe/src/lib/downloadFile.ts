/**
 * Baixa texto como arquivo direto no browser (sem round-trip com o
 * backend) — só cria um link temporário e clica nele, padrão comum pra
 * export client-side.
 */
export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
