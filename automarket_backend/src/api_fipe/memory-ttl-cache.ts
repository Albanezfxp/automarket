/**
 * Cache em memória com expiração por entrada — sem dependência externa
 * (Redis etc), o suficiente pra um processo Nest único guardar respostas da
 * FIPE por um tempo. Se o backend algum dia rodar em várias instâncias, cada
 * uma teria seu próprio cache (não compartilhado) — nesse ponto valeria
 * trocar por um cache distribuído.
 */
export class MemoryTtlCache<T> {
  private readonly armazenamento = new Map<
    string,
    { valor: T; expiraEm: number }
  >();

  constructor(private readonly ttlMs: number) {}

  get(chave: string): T | undefined {
    const entrada = this.armazenamento.get(chave);
    if (!entrada) return undefined;

    if (Date.now() > entrada.expiraEm) {
      this.armazenamento.delete(chave);
      return undefined;
    }

    return entrada.valor;
  }

  set(chave: string, valor: T): void {
    this.armazenamento.set(chave, { valor, expiraEm: Date.now() + this.ttlMs });
  }
}
