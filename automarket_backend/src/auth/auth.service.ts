import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    let loja: {
      id: number;
      nome: string;
      slug: string;
      logo: string | null;
      banner: string | null;
      email: string;
      telefone: string | null;
      ativo: boolean;
      passwordHash: string;
    } | null;

    try {
      loja = await this.prisma.loja.findUnique({
        where: { email },
        select: {
          id: true,
          nome: true,
          slug: true,
          logo: true,
          banner: true,
          email: true,
          telefone: true,
          ativo: true,
          passwordHash: true,
        },
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
