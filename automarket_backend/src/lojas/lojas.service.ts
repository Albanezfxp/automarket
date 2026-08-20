import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLojaDto } from './dto/create-loja.dto';
import { UpdateLojaDto } from './dto/update-loja.dto';
import { Prisma } from 'generated/prisma/client';
// Campos seguros pra devolver na API — passwordHash nunca entra aqui
const SELECT_PUBLICO = {
  id: true,
  nome: true,
  slug: true,
  logo: true,
  banner: true,
  corPrimaria: true,
  corSecundaria: true,
  email: true,
  telefone: true,
  whatsapp: true,
  horarioAbertura: true,
  horarioFechamento: true,
  facebookUrl: true,
  instagramUrl: true,
  youtubeUrl: true,
  ativo: true,
  createdAt: true,
  updatedAt: true,
  endereco: true,
} satisfies Prisma.LojaSelect;

@Injectable()
export class LojasService {
  private readonly logger = new Logger(LojasService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createLojaDto: CreateLojaDto) {
    if (createLojaDto.password !== createLojaDto.confirm_password) {
      throw new BadRequestException('As senhas não coincidem.');
    }
    if (createLojaDto.managerPassword !== createLojaDto.confirmManagerPassword) {
      throw new BadRequestException('As senhas do gerente não coincidem.');
    }

    try {
      const emailExistente = await this.prisma.loja.findUnique({
        where: { email: createLojaDto.email },
        select: { id: true },
      });
      if (emailExistente) {
        throw new ConflictException(
          'Já existe uma loja cadastrada com esse e-mail.',
        );
      }
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error('Erro ao verificar e-mail existente', error);
      throw new InternalServerErrorException(
        'Não foi possível validar o e-mail informado.',
      );
    }

    let slug: string;
    try {
      const slugBase = createLojaDto.slug
        ? slugify(createLojaDto.slug)
        : slugify(createLojaDto.nome);
      slug = await this.gerarSlugUnico(slugBase);
    } catch (error) {
      this.logger.error('Erro ao gerar slug', error);
      throw new InternalServerErrorException(
        'Não foi possível gerar o identificador da loja.',
      );
    }

    let passwordHash: string;
    let managerPasswordHash: string;
    try {
      passwordHash = await bcrypt.hash(createLojaDto.password, 10);
      managerPasswordHash = await bcrypt.hash(
        createLojaDto.managerPassword,
        10,
      );
    } catch (error) {
      this.logger.error('Erro ao gerar hash de senha', error);
      throw new InternalServerErrorException(
        'Não foi possível processar a senha.',
      );
    }

    try {
      return await this.prisma.loja.create({
        data: {
          nome: createLojaDto.nome,
          slug,
          logo: createLojaDto.logo,
          banner: createLojaDto.banner,
          corPrimaria: createLojaDto.corPrimaria,
          corSecundaria: createLojaDto.corSecundaria,
          email: createLojaDto.email,
          telefone: createLojaDto.telefone,
          whatsapp: createLojaDto.whatsapp,
          horarioAbertura: createLojaDto.horarioAbertura,
          horarioFechamento: createLojaDto.horarioFechamento,
          facebookUrl: createLojaDto.facebookUrl,
          instagramUrl: createLojaDto.instagramUrl,
          youtubeUrl: createLojaDto.youtubeUrl,
          passwordHash,
          managerPasswordHash,
          ativo: createLojaDto.ativo ?? true,
          endereco: {
            create: {
              cep: createLojaDto.endereco.cep,
              rua: createLojaDto.endereco.rua,
              numero: createLojaDto.endereco.numero,
              bairro: createLojaDto.endereco.bairro,
              cidade: createLojaDto.endereco.cidade,
              estado: createLojaDto.endereco.estado,
            },
          },
        },
        select: SELECT_PUBLICO,
      });
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const campo =
          (error.meta?.target as string[])?.join(', ') ?? 'campo único';
        throw new ConflictException(`Já existe um registro com esse ${campo}.`);
      }
      this.logger.error('Erro ao criar loja', error);
      throw new InternalServerErrorException(
        'Não foi possível cadastrar a loja.',
      );
    }
  }

  // ==========================================
  // READ — listar
  // ==========================================
  async findAll() {
    try {
      return await this.prisma.loja.findMany({
        select: SELECT_PUBLICO,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Erro ao listar lojas', error);
      throw new InternalServerErrorException(
        'Não foi possível listar as lojas.',
      );
    }
  }

  async findOne(id: number) {
    try {
      const loja = await this.prisma.loja.findUnique({
        where: { id },
        select: {
          ...SELECT_PUBLICO,
          vendedores: true,
          _count: { select: { veiculos: true } },
        },
      });

      if (!loja) {
        throw new NotFoundException(`Loja com id ${id} não encontrada.`);
      }

      return loja;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Erro ao buscar loja ${id}`, error);
      throw new InternalServerErrorException('Não foi possível buscar a loja.');
    }
  }

  // Dados públicos da loja por slug, pro catálogo público. Só campos que
  // fazem sentido pro visitante (mesmo SELECT_PUBLICO usado no painel —
  // já garante que passwordHash/managerPasswordHash nunca vazam) e só
  // lojas ativas (loja inativa não deve ter site público acessível).
  //
  // Inclui vendedores ativos (header + seção "Vendedores" do catálogo
  // consomem essa mesma chamada, sem round-trip extra) — só os campos que
  // já são públicos no modal de contato (`VeiculosService.findOnePublico`).
  async findPublicoPorSlug(slug: string) {
    try {
      const loja = await this.prisma.loja.findUnique({
        where: { slug },
        select: {
          ...SELECT_PUBLICO,
          vendedores: {
            where: { ativo: true },
            select: { id: true, nome: true, fotoUrl: true, whatsapp: true },
          },
        },
      });

      if (!loja || !loja.ativo) {
        throw new NotFoundException(`Loja "${slug}" não encontrada.`);
      }

      return loja;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Erro ao buscar loja pública "${slug}"`, error);
      throw new InternalServerErrorException('Não foi possível buscar a loja.');
    }
  }

  async update(id: number, updateLojaDto: UpdateLojaDto) {
    await this.garantirQueExiste(id);

    // Troca de senha do gerente é opcional aqui — só recalcula o hash se o
    // client mandou os dois campos; nunca sobrescreve com undefined.
    let managerPasswordHash: string | undefined;
    if (updateLojaDto.managerPassword || updateLojaDto.confirmManagerPassword) {
      if (
        updateLojaDto.managerPassword !== updateLojaDto.confirmManagerPassword
      ) {
        throw new BadRequestException('As senhas do gerente não coincidem.');
      }
      try {
        managerPasswordHash = await bcrypt.hash(
          updateLojaDto.managerPassword!,
          10,
        );
      } catch (error) {
        this.logger.error('Erro ao gerar hash da nova senha do gerente', error);
        throw new InternalServerErrorException(
          'Não foi possível processar a nova senha do gerente.',
        );
      }
    }

    let slug: string | undefined;
    if (updateLojaDto.slug) {
      try {
        const slugFormatado = slugify(updateLojaDto.slug);
        const emUso = await this.prisma.loja.findFirst({
          where: { slug: slugFormatado, NOT: { id } },
          select: { id: true },
        });
        if (emUso) {
          throw new ConflictException(
            'Esse slug já está em uso por outra loja.',
          );
        }
        slug = slugFormatado;
      } catch (error) {
        if (error instanceof ConflictException) throw error;
        this.logger.error('Erro ao validar novo slug', error);
        throw new InternalServerErrorException(
          'Não foi possível validar o slug informado.',
        );
      }
    }

    try {
      return await this.prisma.loja.update({
        where: { id },
        data: {
          nome: updateLojaDto.nome,
          slug,
          logo: updateLojaDto.logo,
          banner: updateLojaDto.banner,
          corPrimaria: updateLojaDto.corPrimaria,
          corSecundaria: updateLojaDto.corSecundaria,
          email: updateLojaDto.email,
          telefone: updateLojaDto.telefone,
          whatsapp: updateLojaDto.whatsapp,
          horarioAbertura: updateLojaDto.horarioAbertura,
          horarioFechamento: updateLojaDto.horarioFechamento,
          facebookUrl: updateLojaDto.facebookUrl,
          instagramUrl: updateLojaDto.instagramUrl,
          youtubeUrl: updateLojaDto.youtubeUrl,
          ativo: updateLojaDto.ativo,
          managerPasswordHash,
          endereco: updateLojaDto.endereco
            ? {
                upsert: {
                  create: {
                    cep: updateLojaDto.endereco.cep,
                    rua: updateLojaDto.endereco.rua,
                    numero: updateLojaDto.endereco.numero,
                    bairro: updateLojaDto.endereco.bairro,
                    cidade: updateLojaDto.endereco.cidade!,
                    estado: updateLojaDto.endereco.estado!,
                  },
                  update: {
                    cep: updateLojaDto.endereco.cep,
                    rua: updateLojaDto.endereco.rua,
                    numero: updateLojaDto.endereco.numero,
                    bairro: updateLojaDto.endereco.bairro,
                    cidade: updateLojaDto.endereco.cidade,
                    estado: updateLojaDto.endereco.estado,
                  },
                },
              }
            : undefined,
        },
        select: SELECT_PUBLICO,
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const campo =
            (error.meta?.target as string[])?.join(', ') ?? 'campo único';
          throw new ConflictException(
            `Já existe um registro com esse ${campo}.`,
          );
        }
        if (error.code === 'P2025') {
          throw new NotFoundException(`Loja com id ${id} não encontrada.`);
        }
      }
      this.logger.error(`Erro ao atualizar loja ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível atualizar a loja.',
      );
    }
  }

  async remove(id: number) {
    await this.garantirQueExiste(id);

    try {
      // onDelete: Cascade no schema já apaga endereco, vendedores,
      // veiculos e dependências junto, numa única operação atômica
      await this.prisma.loja.delete({ where: { id } });
      return { message: `Loja ${id} removida com sucesso.` };
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Loja com id ${id} não encontrada.`);
      }
      this.logger.error(`Erro ao remover loja ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível remover a loja.',
      );
    }
  }

  private async garantirQueExiste(id: number) {
    try {
      const loja = await this.prisma.loja.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!loja) {
        throw new NotFoundException(`Loja com id ${id} não encontrada.`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Erro ao verificar existência da loja ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível verificar a loja.',
      );
    }
  }

  private async gerarSlugUnico(base: string): Promise<string> {
    try {
      let slug = base;
      let contador = 1;

      while (
        await this.prisma.loja.findUnique({
          where: { slug },
          select: { id: true },
        })
      ) {
        slug = `${base}-${contador}`;
        contador++;
      }

      return slug;
    } catch (error) {
      this.logger.error('Erro ao checar unicidade do slug', error);
      throw new InternalServerErrorException(
        'Não foi possível verificar a disponibilidade do identificador da loja.',
      );
    }
  }
}
function slugify(slug: string): string {
  return slug
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
