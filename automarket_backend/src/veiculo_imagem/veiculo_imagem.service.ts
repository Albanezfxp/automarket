import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVeiculoImagemDto } from './dto/create-veiculo_imagem.dto';
import { UpdateVeiculoImagemDto } from './dto/update-veiculo_imagem.dto';
import { Prisma } from 'generated/prisma/client';

const SELECT_PUBLICO = {
  id: true,
  url: true,
  ordem: true,
  capa: true,
  veiculoId: true,
} satisfies Prisma.VeiculoImagemSelect;

@Injectable()
export class VeiculoImagemService {
  private readonly logger = new Logger(VeiculoImagemService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createVeiculoImagemDto: CreateVeiculoImagemDto, lojaId: number) {
    // Garante que o veículo informado realmente existe e pertence à loja autenticada
    try {
      const veiculo = await this.prisma.veiculo.findUnique({
        where: { id: createVeiculoImagemDto.veiculoId },
        select: { id: true, lojaId: true },
      });
      if (!veiculo) {
        throw new BadRequestException(
          `Veículo com id ${createVeiculoImagemDto.veiculoId} não encontrado.`,
        );
      }
      if (veiculo.lojaId !== lojaId) {
        throw new ForbiddenException('Você não tem acesso a esse veículo.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof ForbiddenException) throw error;
      this.logger.error(
        'Erro ao verificar veículo para criação de imagem',
        error,
      );
      throw new InternalServerErrorException(
        'Não foi possível validar o veículo informado.',
      );
    }

    try {
      // Se essa imagem está sendo marcada como capa, garante que ela seja
      // a única com capa=true pra esse veículo (regra de negócio: 1 capa por veículo)
      if (createVeiculoImagemDto.capa) {
        return await this.prisma.$transaction(async (tx) => {
          await tx.veiculoImagem.updateMany({
            where: { veiculoId: createVeiculoImagemDto.veiculoId },
            data: { capa: false },
          });

          return tx.veiculoImagem.create({
            data: {
              veiculoId: createVeiculoImagemDto.veiculoId,
              url: createVeiculoImagemDto.url,
              ordem: createVeiculoImagemDto.ordem ?? 0,
              capa: true,
            },
            select: SELECT_PUBLICO,
          });
        });
      }

      return await this.prisma.veiculoImagem.create({
        data: {
          veiculoId: createVeiculoImagemDto.veiculoId,
          url: createVeiculoImagemDto.url,
          ordem: createVeiculoImagemDto.ordem ?? 0,
          capa: createVeiculoImagemDto.capa ?? false,
        },
        select: SELECT_PUBLICO,
      });
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException('Veículo informado não existe mais.');
      }
      this.logger.error('Erro ao criar imagem de veículo', error);
      throw new InternalServerErrorException(
        'Não foi possível cadastrar a imagem.',
      );
    }
  }

  async findAll(lojaId: number, veiculoId?: number) {
    try {
      return await this.prisma.veiculoImagem.findMany({
        where: { veiculoId, veiculo: { lojaId } },
        select: SELECT_PUBLICO,
        orderBy: [{ capa: 'desc' }, { ordem: 'asc' }],
      });
    } catch (error) {
      this.logger.error('Erro ao listar imagens de veículo', error);
      throw new InternalServerErrorException(
        'Não foi possível listar as imagens.',
      );
    }
  }

  async findOne(id: number, lojaId: number) {
    try {
      const imagem = await this.prisma.veiculoImagem.findUnique({
        where: { id },
        select: { ...SELECT_PUBLICO, veiculo: { select: { lojaId: true } } },
      });

      if (!imagem) {
        throw new NotFoundException(`Imagem com id ${id} não encontrada.`);
      }
      if (imagem.veiculo.lojaId !== lojaId) {
        throw new ForbiddenException('Você não tem acesso a essa imagem.');
      }

      const { veiculo: _veiculo, ...imagemPublica } = imagem;
      return imagemPublica;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof ForbiddenException) throw error;
      this.logger.error(`Erro ao buscar imagem ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível buscar a imagem.',
      );
    }
  }

  async update(id: number, updateVeiculoImagemDto: UpdateVeiculoImagemDto, lojaId: number) {
    if (
      !updateVeiculoImagemDto ||
      Object.keys(updateVeiculoImagemDto).length === 0
    ) {
      throw new BadRequestException(
        'Nenhum dado foi enviado para atualização.',
      );
    }

    const imagemAtual = await this.buscarOuFalhar(id, lojaId);

    try {
      // Se está marcando essa imagem como capa, desmarca as outras do mesmo veículo
      if (updateVeiculoImagemDto.capa === true) {
        return await this.prisma.$transaction(async (tx) => {
          await tx.veiculoImagem.updateMany({
            where: { veiculoId: imagemAtual.veiculoId, NOT: { id } },
            data: { capa: false },
          });

          return tx.veiculoImagem.update({
            where: { id },
            data: {
              url: updateVeiculoImagemDto.url,
              ordem: updateVeiculoImagemDto.ordem,
              capa: true,
            },
            select: SELECT_PUBLICO,
          });
        });
      }

      return await this.prisma.veiculoImagem.update({
        where: { id },
        data: {
          url: updateVeiculoImagemDto.url,
          ordem: updateVeiculoImagemDto.ordem,
          capa: updateVeiculoImagemDto.capa,
        },
        select: SELECT_PUBLICO,
      });
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Imagem com id ${id} não encontrada.`);
      }
      this.logger.error(`Erro ao atualizar imagem ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível atualizar a imagem.',
      );
    }
  }

  async remove(id: number, lojaId: number) {
    const imagem = await this.buscarOuFalhar(id, lojaId);

    try {
      await this.prisma.veiculoImagem.delete({ where: { id } });

      // Se a imagem removida era a capa, promove a próxima (por ordem) a nova capa
      if (imagem.capa) {
        const proxima = await this.prisma.veiculoImagem.findFirst({
          where: { veiculoId: imagem.veiculoId },
          orderBy: { ordem: 'asc' },
        });

        if (proxima) {
          await this.prisma.veiculoImagem.update({
            where: { id: proxima.id },
            data: { capa: true },
          });
        }
      }

      return { message: `Imagem ${id} removida com sucesso.` };
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Imagem com id ${id} não encontrada.`);
      }
      this.logger.error(`Erro ao remover imagem ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível remover a imagem.',
      );
    }
  }

  // ==========================================
  // Helper privado
  // ==========================================
  private async buscarOuFalhar(id: number, lojaId: number) {
    try {
      const imagem = await this.prisma.veiculoImagem.findUnique({
        where: { id },
        include: { veiculo: { select: { lojaId: true } } },
      });
      if (!imagem) {
        throw new NotFoundException(`Imagem com id ${id} não encontrada.`);
      }
      if (imagem.veiculo.lojaId !== lojaId) {
        throw new ForbiddenException('Você não tem acesso a essa imagem.');
      }
      return imagem;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof ForbiddenException) throw error;
      this.logger.error(`Erro ao verificar existência da imagem ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível verificar a imagem.',
      );
    }
  }
}
