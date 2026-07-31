import {
  Injectable,
  NotFoundException,
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

  async create(createVendedorDto: CreateVendedorDto) {
    // Garante que a loja informada realmente existe antes de tentar criar
    try {
      const loja = await this.prisma.loja.findUnique({
        where: { id: createVendedorDto.lojaId },
        select: { id: true },
      });
      if (!loja) {
        throw new BadRequestException(
          `Loja com id ${createVendedorDto.lojaId} não encontrada.`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(
        'Erro ao verificar loja para criação de vendedor',
        error,
      );
      throw new InternalServerErrorException(
        'Não foi possível validar a loja informada.',
      );
    }

    try {
      return await this.prisma.vendedor.create({
        data: {
          nome: createVendedorDto.nome,
          fotoUrl: createVendedorDto.fotoUrl,
          whatsapp: createVendedorDto.whatsapp,
          ativo: createVendedorDto.ativo ?? true,
          lojaId: createVendedorDto.lojaId,
        },
        select: SELECT_PUBLICO,
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          // Foreign key inválida (race condition: loja apagada entre a checagem e o create)
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
        select: SELECT_PUBLICO,
        orderBy: { nome: 'asc' },
      });
    } catch (error) {
      this.logger.error('Erro ao listar vendedores', error);
      throw new InternalServerErrorException(
        'Não foi possível listar os vendedores.',
      );
    }
  }

  async findOne(id: number) {
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

      return vendedor;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Erro ao buscar vendedor ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível buscar o vendedor.',
      );
    }
  }

  async update(id: number, updateVendedorDto: UpdateVendedorDto) {
    if (!updateVendedorDto || Object.keys(updateVendedorDto).length === 0) {
      throw new BadRequestException(
        'Nenhum dado foi enviado para atualização.',
      );
    }

    await this.garantirQueExiste(id);

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

  async deactivate(id: number) {
    await this.garantirQueExiste(id);

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

  async reactivate(id: number) {
    await this.garantirQueExiste(id);

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

  async remove(id: number) {
    await this.garantirQueExiste(id);

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

  private async garantirQueExiste(id: number) {
    try {
      const vendedor = await this.prisma.vendedor.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!vendedor) {
        throw new NotFoundException(`Vendedor com id ${id} não encontrado.`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
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
