import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendedorDto } from './dto/create-vendedor.dto';
import { UpdateVendedorDto } from './dto/update-vendedor.dto';
import { Prisma } from 'generated/prisma/client';

const SELECT_PUBLICO = {
  id: true,
  nome: true,
  fotoUrl: true,
  whatsapp: true,
  ativo: true,
  lojaId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VendedorSelect;

@Injectable()
export class VendedorService {
  private readonly logger = new Logger(VendedorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createVendedorDto: CreateVendedorDto, lojaId: number) {
    try {
      return await this.prisma.vendedor.create({
        data: {
          nome: createVendedorDto.nome,
          fotoUrl: createVendedorDto.fotoUrl,
          whatsapp: createVendedorDto.whatsapp,
          ativo: createVendedorDto.ativo ?? true,
          // nunca confiar no lojaId vindo do body — sempre a loja do token
          lojaId,
        },
        select: SELECT_PUBLICO,
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new BadRequestException('Loja informada não existe mais.');
        }
      }
      this.logger.error('Erro ao criar vendedor', error);
      throw new InternalServerErrorException(
        'Não foi possível cadastrar o vendedor.',
      );
    }
  }

  async findAll(params: { lojaId?: number; ativo?: boolean } = {}) {
    try {
      return await this.prisma.vendedor.findMany({
        where: {
          lojaId: params.lojaId,
          ativo: params.ativo,
        },
        select: { ...SELECT_PUBLICO, _count: { select: { contatos: true } } },
        orderBy: { nome: 'asc' },
      });
    } catch (error) {
      this.logger.error('Erro ao listar vendedores', error);
      throw new InternalServerErrorException(
        'Não foi possível listar os vendedores.',
      );
    }
  }

  async findOne(id: number, lojaId: number) {
    try {
      const vendedor = await this.prisma.vendedor.findUnique({
        where: { id },
        select: {
          ...SELECT_PUBLICO,
          _count: { select: { contatos: true } },
        },
      });

      if (!vendedor) {
        throw new NotFoundException(`Vendedor com id ${id} não encontrado.`);
      }
      this.garantirPropriaLoja(vendedor.lojaId, lojaId);

      return vendedor;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof ForbiddenException) throw error;
      this.logger.error(`Erro ao buscar vendedor ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível buscar o vendedor.',
      );
    }
  }

  async update(id: number, updateVendedorDto: UpdateVendedorDto, lojaId: number) {
    if (!updateVendedorDto || Object.keys(updateVendedorDto).length === 0) {
      throw new BadRequestException(
        'Nenhum dado foi enviado para atualização.',
      );
    }

    await this.garantirQueExiste(id, lojaId);

    try {
      return await this.prisma.vendedor.update({
        where: { id },
        data: {
          nome: updateVendedorDto.nome,
          fotoUrl: updateVendedorDto.fotoUrl,
          whatsapp: updateVendedorDto.whatsapp,
          ativo: updateVendedorDto.ativo,
        },
        select: SELECT_PUBLICO,
      });
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Vendedor com id ${id} não encontrado.`);
      }
      this.logger.error(`Erro ao atualizar vendedor ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível atualizar o vendedor.',
      );
    }
  }

  async deactivate(id: number, lojaId: number) {
    await this.garantirQueExiste(id, lojaId);

    try {
      return await this.prisma.vendedor.update({
        where: { id },
        data: { ativo: false },
        select: SELECT_PUBLICO,
      });
    } catch (error) {
      this.logger.error(`Erro ao desativar vendedor ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível desativar o vendedor.',
      );
    }
  }

  async reactivate(id: number, lojaId: number) {
    await this.garantirQueExiste(id, lojaId);

    try {
      return await this.prisma.vendedor.update({
        where: { id },
        data: { ativo: true },
        select: SELECT_PUBLICO,
      });
    } catch (error) {
      this.logger.error(`Erro ao reativar vendedor ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível reativar o vendedor.',
      );
    }
  }

  async remove(id: number, lojaId: number) {
    await this.garantirQueExiste(id, lojaId);

    // `Veiculo.vendedorId` é opcional e não tem `onDelete: Restrict` no
    // schema — sem essa checagem, o delete abaixo teria sucesso silencioso
    // (Prisma aplica SetNull), apagando a atribuição da venda a este
    // vendedor sem erro nenhum e sem aviso, quebrando o histórico do
    // ranking de vendedores do Dashboard. Checa também VeiculoArquivado,
    // já que uma venda antiga pode ter sido arquivada (veículo excluído há
    // mais de 30 dias) e `vendedorId` lá é só um número histórico, sem FK.
    const [vendasVinculadas, vendasArquivadas] = await Promise.all([
      this.prisma.veiculo.count({ where: { vendedorId: id } }),
      this.prisma.veiculoArquivado.count({ where: { vendedorId: id } }),
    ]);
    if (vendasVinculadas > 0 || vendasArquivadas > 0) {
      throw new BadRequestException(
        'Não é possível excluir: este vendedor tem vendas registradas. Desative-o em vez de excluir.',
      );
    }

    try {
      // onDelete: Cascade no schema apaga os ContatoWhatsapp desse vendedor junto
      await this.prisma.vendedor.delete({ where: { id } });
      return { message: `Vendedor ${id} removido com sucesso.` };
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Vendedor com id ${id} não encontrado.`);
      }
      this.logger.error(`Erro ao remover vendedor ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível remover o vendedor.',
      );
    }
  }

  private garantirPropriaLoja(donoId: number, lojaId: number) {
    if (donoId !== lojaId) {
      throw new ForbiddenException('Você não tem acesso a esse vendedor.');
    }
  }

  private async garantirQueExiste(id: number, lojaId: number) {
    try {
      const vendedor = await this.prisma.vendedor.findUnique({
        where: { id },
        select: { id: true, lojaId: true },
      });
      if (!vendedor) {
        throw new NotFoundException(`Vendedor com id ${id} não encontrado.`);
      }
      this.garantirPropriaLoja(vendedor.lojaId, lojaId);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof ForbiddenException) throw error;
      this.logger.error(
        `Erro ao verificar existência do vendedor ${id}`,
        error,
      );
      throw new InternalServerErrorException(
        'Não foi possível verificar o vendedor.',
      );
    }
  }
}
