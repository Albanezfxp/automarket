import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateVeiculoDto } from './dto/create-veiculo.dto';
import { UpdateVeiculoDto } from './dto/update-veiculo.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { StatusVeiculo, Cambio, Combustivel, TipoVeiculo } from 'generated/prisma/enums';
import { Prisma } from 'generated/prisma/client';

// Campos seguros pra devolver no catálogo público — nunca inclui dados
// internos de loja (email, telefones, senha etc), só o que o visitante
// precisa pra decidir e clicar em "Falar com vendedor".
const SELECT_VEICULO_PUBLICO = {
  id: true,
  marca: true,
  modelo: true,
  anoFabricacao: true,
  anoModelo: true,
  tipoVeiculo: true,
  cambio: true,
  portas: true,
  combustivel: true,
  direcao: true,
  potenciaMotor: true,
  cor: true,
  quilometragem: true,
  descricao: true,
  preco: true,
  precoPromocional: true,
  itens: true,
  documentacaoRegularizacao: true,
  conservacaoGarantia: true,
  aceitaTroca: true,
  aceitaFinanciamento: true,
  status: true,
  visualizacoes: true,
  createdAt: true,
  lojaId: true,
  imagens: true,
} satisfies Prisma.VeiculoSelect;

export interface FiltrosVeiculoPublico {
  slug: string;
  busca?: string;
  tipoVeiculo?: TipoVeiculo;
  cambio?: Cambio;
  combustivel?: Combustivel;
  precoMin?: number;
  precoMax?: number;
  anoMin?: number;
  anoMax?: number;
  page?: number;
  perPage?: number;
}

const MAX_PER_PAGE_PUBLICO = 60;

/**
 * Garante exatamente UMA capa por veículo (regra do schema): se o cliente
 * mandar várias com `capa: true`, vale a primeira; se não mandar nenhuma, a
 * primeira imagem vira capa.
 */
function montarImagens(
  imagens: { url: string; ordem?: number; capa?: boolean }[],
) {
  const indiceCapa = Math.max(
    0,
    imagens.findIndex((img) => img.capa === true),
  );
  return imagens.map((img, index) => ({
    url: img.url,
    ordem: img.ordem ?? index,
    capa: index === indiceCapa,
  }));
}

@Injectable()
export class VeiculosService {
  private readonly logger = new Logger(VeiculosService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Painel admin nunca vê veículo excluído (ativo=false) na listagem normal
  // — ele só some da tela quando "Excluir" é clicado (ver `delete`), fica
  // em soft delete por até 30 dias (ver VeiculoArquivamentoService), e só
  // reaparece se alguém chamar `reactivate` dentro desse prazo.
  async findAll(lojaId: number, status?: StatusVeiculo) {
    return this.prisma.veiculo.findMany({
      where: { lojaId, ativo: true, status },
      include: { imagens: true },
    });
  }

  async findOne(id: number, lojaId: number) {
    const veiculo = await this.prisma.veiculo.findUnique({
      where: { id: id },
      select: { lojaId: true },
    });
    if (!veiculo) {
      throw new NotFoundException('Veiculo não encontrados.');
    }
    this.garantirPropriaLoja(veiculo.lojaId, lojaId);

    // Visualização não é mais contada aqui — o painel admin é o dono
    // olhando o próprio estoque, não um visitante. A contagem migrou pra
    // findOnePublico, que é o fluxo real do catálogo público.
    return this.prisma.veiculo.findUnique({
      where: { id },
      include: { imagens: true },
    });
  }

  // ==========================================
  // CATÁLOGO PÚBLICO — sem autenticação, escopado por slug de loja
  // ==========================================

  /**
   * Lista paginada de veículos pro catálogo público de uma loja (por slug).
   * Regras de negócio próprias (não herda de findAll): só loja ativa, só
   * veículo ativo, nunca lista VENDIDO (decisão documentada no controller
   * público) — RESERVADO aparece normalmente, com selo tratado no frontend.
   */
  async findAllPublico(filtros: FiltrosVeiculoPublico) {
    if (!filtros.slug) {
      throw new BadRequestException('Parâmetro "slug" é obrigatório.');
    }

    const loja = await this.prisma.loja.findUnique({
      where: { slug: filtros.slug },
      select: { id: true, ativo: true },
    });
    if (!loja || !loja.ativo) {
      throw new NotFoundException(`Loja "${filtros.slug}" não encontrada.`);
    }

    const page =
      filtros.page && filtros.page > 0 ? Math.floor(filtros.page) : 1;
    // Teto de perPage: sem ele um visitante pede perPage=1000000 e baixa o
    // catálogo inteiro (com joins) numa única query.
    const perPage =
      filtros.perPage && filtros.perPage > 0
        ? Math.min(Math.floor(filtros.perPage), MAX_PER_PAGE_PUBLICO)
        : 24;

    const where: Prisma.VeiculoWhereInput = {
      lojaId: loja.id,
      ativo: true,
      status: { not: StatusVeiculo.VENDIDO },
      tipoVeiculo: filtros.tipoVeiculo,
      cambio: filtros.cambio,
      combustivel: filtros.combustivel,
      preco:
        filtros.precoMin !== undefined || filtros.precoMax !== undefined
          ? { gte: filtros.precoMin, lte: filtros.precoMax }
          : undefined,
      anoModelo:
        filtros.anoMin !== undefined || filtros.anoMax !== undefined
          ? { gte: filtros.anoMin, lte: filtros.anoMax }
          : undefined,
      OR: filtros.busca
        ? [
            { marca: { contains: filtros.busca, mode: 'insensitive' } },
            { modelo: { contains: filtros.busca, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [total, veiculos] = await this.prisma.$transaction([
      this.prisma.veiculo.count({ where }),
      this.prisma.veiculo.findMany({
        where,
        select: SELECT_VEICULO_PUBLICO,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return {
      data: veiculos,
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  /**
   * Detalhe de um veículo pro catálogo público, incluindo vendedores ativos
   * da loja dona (pro modal de contato) e sem exigir uma segunda chamada
   * autenticada. Aqui mora o increment de `visualizacoes` — evento do
   * visitante público, não do dono olhando o próprio estoque (ver findOne).
   *
   * Decisão de produto: veículo VENDIDO continua acessível por link direto
   * (não dá 404) pra não quebrar links compartilhados/indexados — quem
   * consome a resposta (frontend) decide esconder o CTA de contato e
   * mostrar "Vendido". Só é 404 se o veículo não existir, estiver inativo,
   * ou a loja dona estiver inativa.
   */
  async findOnePublico(id: number) {
    const veiculoExistente = await this.prisma.veiculo.findUnique({
      where: { id },
      select: { id: true, ativo: true, loja: { select: { ativo: true } } },
    });

    if (
      !veiculoExistente ||
      !veiculoExistente.ativo ||
      !veiculoExistente.loja.ativo
    ) {
      throw new NotFoundException(`Veículo com id ${id} não encontrado.`);
    }

    const veiculo = await this.prisma.veiculo.update({
      where: { id },
      data: { visualizacoes: { increment: 1 } },
      select: {
        ...SELECT_VEICULO_PUBLICO,
        loja: {
          select: {
            id: true,
            nome: true,
            slug: true,
            vendedores: {
              where: { ativo: true },
              select: { id: true, nome: true, fotoUrl: true, whatsapp: true },
            },
          },
        },
      },
    });

    return veiculo;
  }

  async vender(id: number, vendedorId: number, lojaId: number) {
    const veiculo = await this.prisma.veiculo.findUnique({
      where: { id },
      select: { lojaId: true },
    });
    if (!veiculo) {
      throw new NotFoundException('Veiculo não encontrado.');
    }
    this.garantirPropriaLoja(veiculo.lojaId, lojaId);

    const vendedor = await this.prisma.vendedor.findUnique({
      where: { id: vendedorId },
      select: { lojaId: true, ativo: true },
    });
    if (!vendedor) {
      throw new BadRequestException('Vendedor informado não encontrado.');
    }
    if (vendedor.lojaId !== lojaId) {
      throw new ForbiddenException('Esse vendedor não pertence à sua loja.');
    }
    if (!vendedor.ativo) {
      throw new BadRequestException('Esse vendedor não está mais ativo.');
    }

    return this.prisma.veiculo.update({
      where: { id },
      data: {
        status: StatusVeiculo.VENDIDO,
        dataVenda: new Date(),
        vendedorId,
      },
      include: { imagens: true },
    });
  }

  /** Reserva o veículo pro dono controlar interesse de cliente sem marcá-lo como vendido. */
  async reservar(id: number, lojaId: number) {
    const veiculo = await this.prisma.veiculo.findUnique({
      where: { id },
      select: { lojaId: true },
    });
    if (!veiculo) {
      throw new NotFoundException('Veiculo não encontrado.');
    }
    this.garantirPropriaLoja(veiculo.lojaId, lojaId);

    return this.prisma.veiculo.update({
      where: { id },
      data: { status: StatusVeiculo.RESERVADO },
      include: { imagens: true },
    });
  }

  /**
   * Desfaz reserva ou venda: volta o veículo a "Disponível" no estoque e no
   * catálogo. Limpa `vendedorId`/`dataVenda` de uma venda desfeita — senão
   * ficaria um veículo "disponível" com vendedor e data de venda presos de
   * quando foi marcado como vendido por engano.
   */
  async disponibilizar(id: number, lojaId: number) {
    const veiculo = await this.prisma.veiculo.findUnique({
      where: { id },
      select: { lojaId: true },
    });
    if (!veiculo) {
      throw new NotFoundException('Veiculo não encontrado.');
    }
    this.garantirPropriaLoja(veiculo.lojaId, lojaId);

    return this.prisma.veiculo.update({
      where: { id },
      data: {
        status: StatusVeiculo.DISPONIVEL,
        dataVenda: null,
        vendedorId: null,
      },
      include: { imagens: true },
    });
  }

  async create(createVeiculoDto: CreateVeiculoDto, lojaId: number) {
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
          aceitaFinanciamento: createVeiculoDto.aceitaFinanciamento,
          aceitaTroca: createVeiculoDto.aceitaTroca,
          conservacaoGarantia: createVeiculoDto.conservacaoGarantia,
          createdAt: new Date(),
          documentacaoRegularizacao: createVeiculoDto.documentacaoRegularizacao,
          itens: createVeiculoDto.itens,
          // nunca confiar no lojaId vindo do body — sempre a loja do token
          lojaId,
          marcaFipeId: createVeiculoDto.marcaFipeId,
          modeloFipeId: createVeiculoDto.modeloFipeId,
          precoPromocional: createVeiculoDto.precoPromocional,
          imagens: createVeiculoDto.imagens
            ? {
                create: montarImagens(createVeiculoDto.imagens),
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
      throw this.mapearErroPrisma(error, 'criar', 'Veiculo');
    }
  }

  async update(id: number, updateVeiculoDto: UpdateVeiculoDto, lojaId: number) {
    try {
      const veiculo_bd = await this.prisma.veiculo.findUnique({
        where: {
          id: id,
        },
      });
      if (!veiculo_bd) {
        throw new NotFoundException('Veiculo não encontrado');
      }
      this.garantirPropriaLoja(veiculo_bd.lojaId, lojaId);

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
          aceitaFinanciamento: updateVeiculoDto.aceitaFinanciamento,
          aceitaTroca: updateVeiculoDto.aceitaTroca,
          conservacaoGarantia: updateVeiculoDto.conservacaoGarantia,
          documentacaoRegularizacao: updateVeiculoDto.documentacaoRegularizacao,
          itens: updateVeiculoDto.itens,
          marcaFipeId: updateVeiculoDto.marcaFipeId,
          modeloFipeId: updateVeiculoDto.modeloFipeId,
          precoPromocional: updateVeiculoDto.precoPromocional,
          // O formulário de edição sempre reenvia a lista inteira de fotos
          // (as que já existiam + as trocadas/adicionadas) — por isso o
          // update é "substituir tudo": apaga as imagens antigas do veículo
          // antes de criar o conjunto novo. Sem o `deleteMany`, cada salvo
          // só *acrescentava* imagens em cima das existentes, duplicando o
          // que já estava lá a cada edição.
          imagens: updateVeiculoDto.imagens
            ? {
                deleteMany: {},
                create: montarImagens(updateVeiculoDto.imagens),
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
      if (error instanceof ForbiddenException) throw error;
      if (error instanceof NotFoundException) throw error;
      throw this.mapearErroPrisma(error, 'atualizar', 'Veiculo');
    }
  }

  /**
   * "Excluir" no painel é soft delete: marca ativo=false e carimba
   * excluidoEm, tira o veículo do estoque/catálogo na hora, mas não apaga
   * nada — dá 30 dias pra desfazer via `reactivate` antes do cron de
   * arquivamento (ver VeiculoArquivamentoService) apagar de vez.
   */
  async delete(id: number, lojaId: number) {
    const veiculo = await this.prisma.veiculo.findUnique({
      where: { id },
      select: { id: true, lojaId: true, ativo: true },
    });

    if (!veiculo) {
      throw new NotFoundException('Veiculo não encontrado');
    }
    this.garantirPropriaLoja(veiculo.lojaId, lojaId);

    if (!veiculo.ativo) {
      return { message: 'Veiculo já estava excluído.' };
    }

    try {
      await this.prisma.veiculo.update({
        where: { id },
        data: { ativo: false, excluidoEm: new Date() },
      });
      return {
        message:
          'Veiculo excluído. Ele será apagado definitivamente em 30 dias, a menos que seja reativado antes.',
      };
    } catch (error) {
      throw this.mapearErroPrisma(error, 'excluir', 'Veiculo');
    }
  }

  /** Desfaz o soft delete dentro da janela de 30 dias — some da "lixeira" e volta a aparecer no estoque normalmente. */
  async reactivate(id: number, lojaId: number) {
    const veiculo = await this.prisma.veiculo.findUnique({
      where: { id },
      select: { id: true, lojaId: true, ativo: true },
    });

    if (!veiculo) {
      throw new NotFoundException('Veiculo não encontrado');
    }
    this.garantirPropriaLoja(veiculo.lojaId, lojaId);

    if (veiculo.ativo) {
      return { message: 'Veiculo já está ativo.' };
    }

    try {
      return await this.prisma.veiculo.update({
        where: { id },
        data: { ativo: true, excluidoEm: null },
        include: { imagens: true },
      });
    } catch (error) {
      throw this.mapearErroPrisma(error, 'reativar', 'Veiculo');
    }
  }

  private garantirPropriaLoja(donoId: number, lojaId: number) {
    if (donoId !== lojaId) {
      throw new ForbiddenException('Você não tem acesso a esse veículo.');
    }
  }

  // Convenção do projeto (ver CLAUDE.md): P2002 -> 409, P2003 -> 400,
  // P2025 -> 404. Centralizado aqui porque create/update/delete repetiam o
  // mesmo catch sem mapear nada, deixando erro cru do Prisma vazar pro
  // cliente como 400 genérico.
  private mapearErroPrisma(error: unknown, acao: string, entidade: string) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException(`${entidade} já existe com esses dados.`);
      }
      if (error.code === 'P2003') {
        return new BadRequestException(
          'Referência inválida: verifique os dados enviados.',
        );
      }
      if (error.code === 'P2025') {
        return new NotFoundException(`${entidade} não encontrado.`);
      }
    }
    this.logger.error(`Erro ao ${acao} ${entidade.toLowerCase()}`, error);
    return new InternalServerErrorException(
      `Não foi possível ${acao} o ${entidade.toLowerCase()}.`,
    );
  }
}
