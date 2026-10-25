import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MemoryTtlCache } from './memory-ttl-cache';

const UM_DIA_MS = 24 * 60 * 60 * 1000;
const SETE_DIAS_MS = 7 * UM_DIA_MS;
const TIMEOUT_FIPE_MS = 10_000;

// Ids da FIPE são numéricos (anoId tem hífen: "2020-1"). Validar antes de
// interpolar na URL evita injetar caminhos ("..%2F") na API externa e
// lotar o cache com chaves arbitrárias.
const ID_FIPE = /^[\w-]{1,20}$/;

function validarIds(...ids: string[]) {
  if (!ids.every((id) => ID_FIPE.test(id))) {
    throw new BadRequestException('Identificador FIPE inválido.');
  }
}

const fetchFipe = (url: string) =>
  fetch(url, { signal: AbortSignal.timeout(TIMEOUT_FIPE_MS) });

@Injectable()
export class ApiFipeService {
  private readonly logger = new Logger(ApiFipeService.name);
  private getBaseApiUrl = 'https://parallelum.com.br/fipe/api/v1';

  // Marcas mudam raramente (a FIPE não lança marca nova toda hora) — cache
  // mais longo. Modelos/anos mudam com mais frequência (tabela é revisada
  // mensalmente), por isso um cache mais curto.
  private readonly cacheMarcas = new MemoryTtlCache<unknown>(SETE_DIAS_MS);
  private readonly cacheModelos = new MemoryTtlCache<unknown>(UM_DIA_MS);
  private readonly cacheAnos = new MemoryTtlCache<unknown>(UM_DIA_MS);
  private readonly cacheDetalheAno = new MemoryTtlCache<unknown>(UM_DIA_MS);

  constructor() {}

  async getMarcas() {
    const emCache = this.cacheMarcas.get('marcas');
    if (emCache) return emCache;

    try {
      const marcas = await fetchFipe(`${this.getBaseApiUrl}/carros/marcas`);
      if (!marcas.ok) {
        throw new BadRequestException(
          'Erro em obter os dados das marcas da API',
        );
      }

      const dados = await marcas.json();
      this.cacheMarcas.set('marcas', dados);
      return dados;
    } catch (error) {
      this.logger.error('Erro na requisição de marcas da FIPE', error);
      throw error;
    }
  }

  /**
   * A API da FIPE não tem uma rota de "marca isolada" (`/carros/marcas/{id}`
   * responde 404) — validar a marca antes de buscar os modelos só derrubava
   * a chamada inteira no catch. A própria rota de modelos já responde vazio
   * se a marca não existir, então a validação é redundante.
   */
  async getModelosDaMarca(marcaId: string) {
    validarIds(marcaId);
    const chave = marcaId;
    const emCache = this.cacheModelos.get(chave);
    if (emCache) return emCache;

    try {
      const models = await fetchFipe(
        `${this.getBaseApiUrl}/carros/marcas/${marcaId}/modelos`,
      );
      if (!models.ok) {
        throw new BadRequestException(
          'Erro em obter os dados dos modelos das marcas da API',
        );
      }

      const dados = await models.json();
      this.cacheModelos.set(chave, dados);
      return dados;
    } catch (error) {
      this.logger.error('Erro na requisição de modelos da FIPE', error);
      throw error;
    }
  }

  async getYearOfOneModel(marcaId: string, modeloId: string) {
    validarIds(marcaId, modeloId);
    const chave = `${marcaId}:${modeloId}`;
    const emCache = this.cacheAnos.get(chave);
    if (emCache) return emCache;

    try {
      const years = await fetchFipe(
        `${this.getBaseApiUrl}/carros/marcas/${marcaId}/modelos/${modeloId}/anos`,
      );

      if (!years.ok) {
        throw new BadRequestException('Anos nao encontrado');
      }

      const dados = await years.json();
      this.cacheAnos.set(chave, dados);
      return dados;
    } catch (error) {
      this.logger.error('Erro na requisição de anos da FIPE', error);
      throw error;
    }
  }

  /**
   * Registro oficial da FIPE pra uma combinação exata de marca+modelo+ano
   * (o `anoId` já inclui o combustível, ex: "2020-1"). Retorna `Modelo`
   * (nome completo, com motorização — o mais próximo que a FIPE tem de
   * "versão"), `Combustivel` e `Valor` (preço de tabela).
   */
  async getDetalheAno(marcaId: string, modeloId: string, anoId: string) {
    validarIds(marcaId, modeloId, anoId);
    const chave = `${marcaId}:${modeloId}:${anoId}`;
    const emCache = this.cacheDetalheAno.get(chave);
    if (emCache) return emCache;

    try {
      const detalhe = await fetchFipe(
        `${this.getBaseApiUrl}/carros/marcas/${marcaId}/modelos/${modeloId}/anos/${anoId}`,
      );

      if (!detalhe.ok) {
        throw new BadRequestException('Detalhe do veiculo nao encontrado');
      }

      const dados = await detalhe.json();
      this.cacheDetalheAno.set(chave, dados);
      return dados;
    } catch (error) {
      this.logger.error('Erro na requisição de detalhe do ano da FIPE', error);
      throw error;
    }
  }
}
