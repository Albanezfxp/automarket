import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateVeiculoDto } from './dto/create-veiculo.dto';
import { UpdateVeiculoDto } from './dto/update-veiculo.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class VeiculosService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() {
    const veiculos = await this.prisma.veiculo.findMany();

    if (!veiculos) {
      throw new NotFoundException('Veiculos não encontrados.');
    }
    return veiculos;
  }

  async findOne(id: number) {
    const veiculo = await this.prisma.veiculo.findUnique({
      where: { id: id },
    });
    if (!veiculo) {
      throw new NotFoundException('Veiculo não encontrados.');
    }
    return veiculo;
  }

  async create(createVeiculoDto: CreateVeiculoDto) {
    try {
      const novoVeiculo = await this.prisma.veiculo.create({
        data: {
          anoFabricacao: createVeiculoDto.anoFabricacao,
          anoModelo: createVeiculoDto.anoModelo,
          cambio: createVeiculoDto.cambio,
          combustivel: createVeiculoDto.combustivel,
          cor: createVeiculoDto.cor,
          descricao: createVeiculoDto.descricao,
          direcao: createVeiculoDto.direcao,
          marca: createVeiculoDto.marca,
          modelo: createVeiculoDto.modelo,
          portas: createVeiculoDto.portas,
          potenciaMotor: createVeiculoDto.potenciaMotor,
          preco: createVeiculoDto.preco,
          quilometragem: createVeiculoDto.quilometragem,
          tipoVeiculo: createVeiculoDto.tipoVeiculo,
          versao: createVeiculoDto.versao,
          aceitaFinanciamento: createVeiculoDto.aceitaFinanciamento,
          aceitaTroca: createVeiculoDto.aceitaTroca,
          conservacaoGarantia: createVeiculoDto.conservacaoGarantia,
          createdAt: new Date(),
          documentacaoRegularizacao: createVeiculoDto.documentacaoRegularizacao,
          estadoFinanceiro: createVeiculoDto.estadoFinanceiro,
          itens: createVeiculoDto.itens,
          lojaId: createVeiculoDto.lojaId,
          marcaFipeId: createVeiculoDto.marcaFipeId,
          modeloFipeId: createVeiculoDto.modeloFipeId,
          precoPromocional: createVeiculoDto.precoPromocional,
          imagens: createVeiculoDto.imagens
            ? {
                create: createVeiculoDto.imagens.map((img, index) => ({
                  url: img.url,
                  ordem: img.ordem ?? index,
                  capa: img.capa ?? index === 0,
                })),
              }
            : undefined,
        },
        include: {
          imagens: true,
          loja: {
            select: {
              nome: true,
              id: true,
              slug: true,
            },
          },
        },
      });
      return novoVeiculo;
    } catch (error) {
      throw new BadRequestException(`Erro ao criar veiculo: ${error}`);
    }
  }

  async update(id: number, updateVeiculoDto: UpdateVeiculoDto) {
    try {
      const veiculo_bd = await this.prisma.veiculo.findUnique({
        where: {
          id: id,
        },
      });
      if (!veiculo_bd) {
        throw new NotFoundException('Veiculo não encontrado');
      }

      const veiculo_update = await this.prisma.veiculo.update({
        where: { id: veiculo_bd.id },
        data: {
          anoFabricacao: updateVeiculoDto.anoFabricacao,
          anoModelo: updateVeiculoDto.anoModelo,
          cambio: updateVeiculoDto.cambio,
          combustivel: updateVeiculoDto.combustivel,
          cor: updateVeiculoDto.cor,
          descricao: updateVeiculoDto.descricao,
          direcao: updateVeiculoDto.direcao,
          marca: updateVeiculoDto.marca,
          modelo: updateVeiculoDto.modelo,
          portas: updateVeiculoDto.portas,
          potenciaMotor: updateVeiculoDto.potenciaMotor,
          preco: updateVeiculoDto.preco,
          quilometragem: updateVeiculoDto.quilometragem,
          tipoVeiculo: updateVeiculoDto.tipoVeiculo,
          versao: updateVeiculoDto.versao,
          aceitaFinanciamento: updateVeiculoDto.aceitaFinanciamento,
          aceitaTroca: updateVeiculoDto.aceitaTroca,
          conservacaoGarantia: updateVeiculoDto.conservacaoGarantia,
          createdAt: new Date(),
          documentacaoRegularizacao: updateVeiculoDto.documentacaoRegularizacao,
          estadoFinanceiro: updateVeiculoDto.estadoFinanceiro,
          itens: updateVeiculoDto.itens,
          lojaId: updateVeiculoDto.lojaId,
          marcaFipeId: updateVeiculoDto.marcaFipeId,
          modeloFipeId: updateVeiculoDto.modeloFipeId,
          precoPromocional: updateVeiculoDto.precoPromocional,
          imagens: updateVeiculoDto.imagens
            ? {
                create: updateVeiculoDto.imagens.map((img, index) => ({
                  url: img.url,
                  ordem: img.ordem ?? index,
                  capa: img.capa ?? index === 0, // primeira imagem vira capa por padrão
                })),
              }
            : undefined,
        },
        include: {
          imagens: true,
          loja: {
            select: {
              nome: true,
              id: true,
              slug: true,
            },
          },
        },
      });

      return veiculo_update;
    } catch (error) {
      throw new BadRequestException(`Erro ao atualizar veiculo: ${error}`);
    }
  }

  async delete(id: number) {
    const veiculo = await this.prisma.veiculo.findUnique({
      where: { id: id },
    });

    if (!veiculo) {
      throw new NotFoundException('Veiculo não encontrado');
    }

    await this.prisma.veiculo.delete({
      where: {
        id: veiculo.id,
      },
    });
    return `Veiculo removido com sucesso!`;
  }
}
