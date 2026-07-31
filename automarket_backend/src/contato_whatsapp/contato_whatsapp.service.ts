import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContatoWhatsappDto } from './dto/create-contato_whatsapp.dto';
import { UpdateContatoWhatsappDto } from './dto/update-contato_whatsapp.dto';
import { Prisma } from 'generated/prisma/client';

const SELECT_PUBLICO = {
  id: true,
  veiculoId: true,
  vendedorId: true,
  createdAt: true,
} satisfies Prisma.ContatoWhatsappSelect;

@Injectable()
export class ContatoWhatsappService {
  private readonly logger = new Logger(ContatoWhatsappService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createContatoWhatsappDto: CreateContatoWhatsappDto) {
    // Valida veículo e vendedor, e garante que o vendedor pertence
    // à mesma loja do veículo (regra de negócio: não faz sentido
    // registrar contato com vendedor de outra loja)
    try {
      const [veiculo, vendedor] = await this.prisma.$transaction([
        this.prisma.veiculo.findUnique({
          where: { id: createContatoWhatsappDto.veiculoId },
          select: { id: true, lojaId: true, ativo: true },
        }),
        this.prisma.vendedor.findUnique({
          where: { id: createContatoWhatsappDto.vendedorId },
          select: { id: true, lojaId: true, ativo: true },
        }),
      ]);

      if (!veiculo) {
        throw new BadRequestException(
          `Veículo com id ${createContatoWhatsappDto.veiculoId} não encontrado.`,
        );
      }
      if (!vendedor) {
        throw new BadRequestException(
          `Vendedor com id ${createContatoWhatsappDto.vendedorId} não encontrado.`,
        );
      }
      if (!vendedor.ativo) {
        throw new BadRequestException('Esse vendedor não está mais ativo.');
      }
      if (veiculo.lojaId !== vendedor.lojaId) {
        throw new BadRequestException(
          'O vendedor informado não pertence à mesma loja do veículo.',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(
        'Erro ao validar veículo/vendedor para registro de contato',
        error,
      );
      throw new InternalServerErrorException(
        'Não foi possível validar os dados do contato.',
      );
    }

    try {
      // Cria o evento de contato e incrementa o contador de visualizações
      // relacionadas do veículo numa única transação
      const contato = await this.prisma.contatoWhatsapp.create({
        data: {
          veiculoId: createContatoWhatsappDto.veiculoId,
          vendedorId: createContatoWhatsappDto.vendedorId,
        },
        select: SELECT_PUBLICO,
      });

      return contato;
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Veículo ou vendedor informado não existe mais.',
        );
      }
      this.logger.error('Erro ao registrar contato whatsapp', error);
      throw new InternalServerErrorException(
        'Não foi possível registrar o contato.',
      );
    }
  }
  async findAll(
    params: {
      veiculoId?: number;
      vendedorId?: number;
      lojaId?: number;
      dataInicio?: Date;
      dataFim?: Date;
      page?: number;
      perPage?: number;
    } = {},
  ) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const perPage = params.perPage && params.perPage > 0 ? params.perPage : 20;

    try {
      const where: Prisma.ContatoWhatsappWhereInput = {
        veiculoId: params.veiculoId,
        vendedorId: params.vendedorId,
        veiculo: params.lojaId ? { lojaId: params.lojaId } : undefined,
        createdAt:
          params.dataInicio || params.dataFim
            ? { gte: params.dataInicio, lte: params.dataFim }
            : undefined,
      };

      const [total, contatos] = await this.prisma.$transaction([
        this.prisma.contatoWhatsapp.count({ where }),
        this.prisma.contatoWhatsapp.findMany({
          where,
          select: {
            ...SELECT_PUBLICO,
            veiculo: { select: { id: true, marca: true, modelo: true } },
            vendedor: { select: { id: true, nome: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * perPage,
          take: perPage,
        }),
      ]);

      return {
        data: contatos,
        meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
      };
    } catch (error) {
      this.logger.error('Erro ao listar contatos whatsapp', error);
      throw new InternalServerErrorException(
        'Não foi possível listar os contatos.',
      );
    }
  }

  async findOne(id: number) {
    try {
      const contato = await this.prisma.contatoWhatsapp.findUnique({
        where: { id },
        select: {
          ...SELECT_PUBLICO,
          veiculo: { select: { id: true, marca: true, modelo: true } },
          vendedor: { select: { id: true, nome: true, whatsapp: true } },
        },
      });

      if (!contato) {
        throw new NotFoundException(`Contato com id ${id} não encontrado.`);
      }

      return contato;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Erro ao buscar contato ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível buscar o contato.',
      );
    }
  }

  async rankingPorVeiculo(lojaId: number, limite = 10) {
    try {
      const resultado = await this.prisma.contatoWhatsapp.groupBy({
        by: ['veiculoId'],
        where: { veiculo: { lojaId } },
        _count: { veiculoId: true },
        orderBy: { _count: { veiculoId: 'desc' } },
        take: limite,
      });

      return resultado.map((r) => ({
        veiculoId: r.veiculoId,
        totalContatos: r._count.veiculoId,
      }));
    } catch (error) {
      this.logger.error(
        `Erro ao gerar ranking de contatos da loja ${lojaId}`,
        error,
      );
      throw new InternalServerErrorException(
        'Não foi possível gerar o ranking.',
      );
    }
  }

  async remove(id: number) {
    await this.garantirQueExiste(id);

    try {
      await this.prisma.contatoWhatsapp.delete({ where: { id } });
      return { message: `Contato ${id} removido com sucesso.` };
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Contato com id ${id} não encontrado.`);
      }
      this.logger.error(`Erro ao remover contato ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível remover o contato.',
      );
    }
  }

  private async garantirQueExiste(id: number) {
    try {
      const contato = await this.prisma.contatoWhatsapp.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!contato) {
        throw new NotFoundException(`Contato com id ${id} não encontrado.`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Erro ao verificar existência do contato ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível verificar o contato.',
      );
    }
  }
}
