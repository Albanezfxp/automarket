import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

const METODOS_DE_ESCRITA = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * POSTs que não alteram dados da demo e precisam continuar funcionando:
 * login, revelar faturamento (só confere a senha) e o clique "falar com
 * vendedor" (grava um ContatoWhatsapp, que é o evento central da demo).
 */
const ROTAS_LIBERADAS = new Set([
  '/auth/login',
  '/dashboard/faturamento/revelar',
  '/contato-whatsapp/publico',
]);

/**
 * Modo somente leitura para demonstração (`READ_ONLY=true`): bloqueia
 * POST/PUT/PATCH/DELETE com 403 `{ code: 'READ_ONLY' }`.
 *
 * É um guard (e não middleware) para a resposta passar pelo mesmo pipeline
 * de exceções do Nest e sair com os cabeçalhos de CORS já aplicados.
 * Lê a env a cada request, então alternar a variável não exige rebuild.
 */
@Injectable()
export class ReadOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (process.env.READ_ONLY !== 'true') return true;

    const request = context.switchToHttp().getRequest();
    if (!METODOS_DE_ESCRITA.has(request.method)) return true;

    const caminho = (request.path as string).replace(/\/+$/, '');
    if (ROTAS_LIBERADAS.has(caminho)) return true;

    throw new ForbiddenException({
      statusCode: 403,
      code: 'READ_ONLY',
      message: 'Demonstração somente leitura.',
    });
  }
}
