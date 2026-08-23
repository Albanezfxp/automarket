import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SELECT_PUBLICO } from '../lojas/lojas.service';

// Mesmo SELECT_PUBLICO do LojasService + passwordHash (só pra comparar a
// senha aqui dentro — nunca sai da função). Precisa ser o mesmo shape que
// `LojasService.update` devolve, senão a sessão guardada após o login fica
// com campos faltando até o lojista salvar algo em Configurações.
const LOGIN_SELECT = {
  ...SELECT_PUBLICO,
  passwordHash: true,
} satisfies Prisma.LojaSelect;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    let loja: Prisma.LojaGetPayload<{ select: typeof LOGIN_SELECT }> | null;

    try {
      loja = await this.prisma.loja.findUnique({
        where: { email },
        select: LOGIN_SELECT,
      });
    } catch (error) {
      this.logger.error('Erro ao buscar loja para login', error);
      throw new InternalServerErrorException(
        'Não foi possível processar o login.',
      );
    }

    if (!loja) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const senhaValida = await bcrypt.compare(password, loja.passwordHash);
    if (!senhaValida) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: loja.id,
      email: loja.email,
    });

    const { passwordHash: _passwordHash, ...lojaPublica } = loja;

    return { accessToken, loja: lojaPublica };
  }

  async verificarSenhaGerente(
    lojaId: number,
    senha: string,
  ): Promise<boolean> {
    let loja: { managerPasswordHash: string } | null;

    try {
      loja = await this.prisma.loja.findUnique({
        where: { id: lojaId },
        select: { managerPasswordHash: true },
      });
    } catch (error) {
      this.logger.error('Erro ao buscar senha do gerente', error);
      throw new InternalServerErrorException(
        'Não foi possível validar a senha do gerente.',
      );
    }

    if (!loja) return false;

    return bcrypt.compare(senha, loja.managerPasswordHash);
  }
}
