import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface LojaAutenticada {
  id: number;
  email: string;
}

// Lê a loja anexada em `request.loja` pelo JwtAuthGuard — nunca confiar em
// lojaId vindo de query/body do client para identificar "quem está logado".
export const LojaAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): LojaAutenticada => {
    const request = ctx.switchToHttp().getRequest();
    return request.loja;
  },
);
