import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const RATE_LIMIT_KEY = 'rateLimit';

interface RateLimitOptions {
  /** Máximo de requisições por janela, por chave (IP + loja/e-mail). */
  limit: number;
  windowMs: number;
}

/** Limita requisições na rota (em memória; vale para 1 instância). */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Freio simples contra força bruta (login e senha do gerente). Contador em
 * memória: suficiente para a instância única do Render; se escalar para
 * várias instâncias, trocar por um store compartilhado (ex.: Redis).
 * Usa `request.ip`, então `trust proxy` precisa estar ligado no main.ts —
 * senão todos os visitantes parecem vir do IP do proxy.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!options) return true;

    const request = context.switchToHttp().getRequest();
    const alvo = String(request.body?.email ?? request.loja?.id ?? '');
    const chave = `${context.getClass().name}.${context.getHandler().name}:${request.ip}:${alvo.toLowerCase()}`;

    const agora = Date.now();
    this.limparExpirados(agora);

    const atual = this.hits.get(chave);
    if (!atual || atual.resetAt <= agora) {
      this.hits.set(chave, { count: 1, resetAt: agora + options.windowMs });
      return true;
    }

    atual.count++;
    if (atual.count > options.limit) {
      throw new HttpException(
        'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  // Evita crescimento ilimitado do Map (chaves por IP/e-mail).
  private limparExpirados(agora: number) {
    if (this.hits.size < 1000) return;
    for (const [chave, valor] of this.hits) {
      if (valor.resetAt <= agora) this.hits.delete(chave);
    }
  }
}
