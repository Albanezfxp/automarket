import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnderecoDto } from './dto/create-endereco.dto';
import { UpdateEnderecoDto } from './dto/update-endereco.dto';
import { Prisma } from 'generated/prisma/client';

const SELECT_PUBLICO = {
  id: true,
  cep: true,
  rua: true,
  numero: true,
  bairro: true,
  cidade: true,
  estado: true,
  lojaId: true,
} satisfies Prisma.EnderecoSelect;

@Injectable()
export class EnderecoService {
  private readonly logger = new Logger(EnderecoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createEnderecoDto: CreateEnderecoDto) {
    // Garante que a loja existe e ainda não tem endereço (relação é 1:1)
    try {
      const loja = await this.prisma.loja.findUnique({
        where: { id: createEnderecoDto.lojaId },
        select: { id: true, endereco: { select: { id: true } } },
      });

      if (!loja) {
        throw new BadRequestException(
          `Loja com id ${createEnderecoDto.lojaId} não encontrada.`,
        );
      }

      if (loja.endereco) {
        throw new ConflictException(
          'Essa loja já possui um endereço cadastrado. Utilize o update para alterá-lo.',
        );
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        'Erro ao verificar loja para criação de endereço',
        error,
      );
      throw new InternalServerErrorException(
        'Não foi possível validar a loja informada.',
      );
    }

    try {
      return await this.prisma.endereco.create({
        data: {
          lojaId: createEnderecoDto.lojaId,
          cep: createEnderecoDto.cep,
          rua: createEnderecoDto.rua,
          numero: createEnderecoDto.numero,
          bairro: createEnderecoDto.bairro,
          cidade: createEnderecoDto.cidade,
          estado: createEnderecoDto.estado,
        },
        select: SELECT_PUBLICO,
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Essa loja já possui um endereço cadastrado.',
          );
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Loja informada não existe mais.');
        }
      }
      this.logger.error('Erro ao criar endereço', error);
      throw new InternalServerErrorException(
        'Não foi possível cadastrar o endereço.',
      );
    }
  }

  async findAll() {
    try {
      return await this.prisma.endereco.findMany({
        select: SELECT_PUBLICO,
        orderBy: { cidade: 'asc' },
      });
    } catch (error) {
      this.logger.error('Erro ao listar endereços', error);
      throw new InternalServerErrorException(
        'Não foi possível listar os endereços.',
      );
    }
  }

  async findOne(id: number) {
    try {
      const endereco = await this.prisma.endereco.findUnique({
        where: { id },
        select: SELECT_PUBLICO,
      });

      if (!endereco) {
        throw new NotFoundException(`Endereço com id ${id} não encontrado.`);
      }

      return endereco;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Erro ao buscar endereço ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível buscar o endereço.',
      );
    }
  }

  async findByLojaId(lojaId: number) {
    try {
      const endereco = await this.prisma.endereco.findUnique({
        where: { lojaId },
        select: SELECT_PUBLICO,
      });

      if (!endereco) {
        throw new NotFoundException(
          `Endereço da loja ${lojaId} não encontrado.`,
        );
      }

      return endereco;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Erro ao buscar endereço da loja ${lojaId}`, error);
      throw new InternalServerErrorException(
        'Não foi possível buscar o endereço.',
      );
    }
  }

  async update(id: number, updateEnderecoDto: UpdateEnderecoDto) {
    if (!updateEnderecoDto || Object.keys(updateEnderecoDto).length === 0) {
      throw new BadRequestException(
        'Nenhum dado foi enviado para atualização.',
      );
    }

    await this.garantirQueExiste(id);

    try {
      return await this.prisma.endereco.update({
        where: { id },
        data: {
          cep: updateEnderecoDto.cep,
          rua: updateEnderecoDto.rua,
          numero: updateEnderecoDto.numero,
          bairro: updateEnderecoDto.bairro,
          cidade: updateEnderecoDto.cidade,
          estado: updateEnderecoDto.estado,
        },
        select: SELECT_PUBLICO,
      });
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Endereço com id ${id} não encontrado.`);
      }
      this.logger.error(`Erro ao atualizar endereço ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível atualizar o endereço.',
      );
    }
  }

  async remove(id: number) {
    await this.garantirQueExiste(id);

    try {
      // Cuidado: como lojaId é @unique em Endereco, apagar aqui deixa a
      // loja sem endereço até que um novo seja cadastrado.
      await this.prisma.endereco.delete({ where: { id } });
      return { message: `Endereço ${id} removido com sucesso.` };
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Endereço com id ${id} não encontrado.`);
      }
      this.logger.error(`Erro ao remover endereço ${id}`, error);
      throw new InternalServerErrorException(
        'Não foi possível remover o endereço.',
      );
    }
  }

  private async garantirQueExiste(id: number) {
    try {
      const endereco = await this.prisma.endereco.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!endereco) {
        throw new NotFoundException(`Endereço com id ${id} não encontrado.`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Erro ao verificar existência do endereço ${id}`,
        error,
      );
      throw new InternalServerErrorException(
        'Não foi possível verificar o endereço.',
      );
    }
  }
}
