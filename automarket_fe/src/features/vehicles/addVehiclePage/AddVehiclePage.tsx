import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  Cambio,
  Combustivel,
  Cor,
  Direcao,
  TipoVeiculo,
  VeiculoImagem,
} from "../../../types/vehicle";
import type { ItemVeiculo } from "../../../types/vehicleItem";
import {
  ImageListField,
  type ImagemFormRow,
} from "../components/ImageListField/ImageListField";
import { ItemsChecklist } from "../components/ItemsChecklist/ItemsChecklist";
import { NumberField } from "../components/NumberField/NumberField";
import {
  CAMBIO_LABELS,
  COMBUSTIVEL_LABELS,
  CONSERVACAO_GARANTIA_OPTIONS,
  COR_LABELS,
  DIRECAO_LABELS,
  DOCUMENTACAO_OPTIONS,
  POTENCIA_MOTOR_OPTIONS,
  TIPO_VEICULO_LABELS,
} from "../constants/fieldOptions";
import styles from "./AddVehiclePage.module.css";
import { veiculosService } from "../../../service/Veiculos.service";
import { apiFipeService } from "../../../service/apiFipe.service";
import { useAuth } from "../../auth/AuthContext";
import { usePageTitle } from "../../../lib/usePageTitle";

interface FipeMarca {
  codigo: string;
  nome: string;
}

interface FipeModelo {
  codigo: number;
  nome: string;
}

/**
 * O que o formulário produz: os mesmos campos editáveis de `Veiculo`, sem
 * os campos que a "criação" preenche por fora do form (id, lojaId, status
 * inicial, contadores, timestamps).
 */
export interface NovoVeiculoInput {
  marca: string;
  modelo: string;
  anoFabricacao: number;
  anoModelo: number;
  tipoVeiculo: TipoVeiculo;
  cambio: Cambio;
  portas: number;
  combustivel: Combustivel;
  direcao: Direcao;
  potenciaMotor: string;
  cor: Cor;
  quilometragem: number;
  descricao: string;
  preco: number;
  precoPromocional?: number;
  documentacaoRegularizacao?: string;
  conservacaoGarantia?: string;
  aceitaTroca: boolean;
  aceitaFinanciamento: boolean;
  itens: ItemVeiculo[];
  imagens: Omit<VeiculoImagem, "id">[];
}

interface FormState {
  marca: string;
  modelo: string;
  anoFabricacao: string;
  anoModelo: string;
  tipoVeiculo: TipoVeiculo | "";
  cambio: Cambio | "";
  portas: string;
  combustivel: Combustivel | "";
  direcao: Direcao | "";
  potenciaMotor: string;
  cor: Cor | "";
  quilometragem: string;
  descricao: string;
  preco: string;
  precoPromocional: string;
  documentacaoRegularizacao: string;
  conservacaoGarantia: string;
  aceitaTroca: boolean;
  aceitaFinanciamento: boolean;
  itens: ItemVeiculo[];
  imagens: ImagemFormRow[];
}

const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from(
  { length: ANO_ATUAL + 1 - 1950 + 1 },
  (_, i) => ANO_ATUAL + 1 - i,
);

const INITIAL_STATE: FormState = {
  marca: "",
  modelo: "",
  anoFabricacao: "",
  anoModelo: "",
  tipoVeiculo: "",
  cambio: "",
  portas: "4",
  combustivel: "",
  direcao: "",
  potenciaMotor: "",
  cor: "",
  quilometragem: "",
  descricao: "",
  preco: "",
  precoPromocional: "",
  documentacaoRegularizacao: "",
  conservacaoGarantia: "",
  aceitaTroca: false,
  aceitaFinanciamento: false,
  itens: [],
  imagens: [{ url: "", capa: true }],
};

type Errors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): Errors {
  const errors: Errors = {};

  if (!form.marca.trim()) errors.marca = "Informe a marca.";
  if (!form.modelo.trim()) errors.modelo = "Informe o modelo.";
  if (!form.tipoVeiculo) errors.tipoVeiculo = "Selecione o tipo.";
  if (!form.cambio) errors.cambio = "Selecione o câmbio.";
  if (!form.combustivel) errors.combustivel = "Selecione o combustível.";
  if (!form.direcao) errors.direcao = "Selecione a direção.";
  if (!form.cor) errors.cor = "Selecione a cor.";
  if (!form.potenciaMotor)
    errors.potenciaMotor = "Selecione a potência do motor.";
  if (!form.descricao.trim()) errors.descricao = "Descreva o veículo.";

  if (!form.anoFabricacao)
    errors.anoFabricacao = "Selecione o ano de fabricação.";
  if (!form.anoModelo) errors.anoModelo = "Selecione o ano do modelo.";

  const portas = Number(form.portas);
  if (!form.portas || portas < 2 || portas > 5)
    errors.portas = "Entre 2 e 5 portas.";

  const quilometragem = Number(form.quilometragem);
  if (form.quilometragem === "" || quilometragem < 0)
    errors.quilometragem = "Quilometragem inválida.";

  const preco = Number(form.preco);
  if (!form.preco || preco <= 0) errors.preco = "Informe um preço válido.";

  if (form.precoPromocional) {
    const precoPromocional = Number(form.precoPromocional);
    if (precoPromocional <= 0) {
      errors.precoPromocional = "Preço promocional inválido.";
    } else if (preco > 0 && precoPromocional >= preco) {
      errors.precoPromocional = "Deve ser menor que o preço cheio.";
    }
  }

  if (!form.imagens.some((img) => img.url.trim())) {
    errors.imagens = "Adicione ao menos uma foto.";
  }

  return errors;
}

function formatMoeda(valor: string): string {
  const numero = Number(valor);
  if (!valor || Number.isNaN(numero)) return "R$ 0";
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

/**
 * Página de cadastro/edição de veículo — mesmo formulário, mesmo arquivo,
 * alternando por parâmetro de rota (`/veiculos/novo` vs
 * `/veiculos/:id/editar`). `marca`/`modelo` ainda são texto livre — no
 * schema eles vêm de um `<select>` alimentado pela API da FIPE. Ao salvar,
 * persiste via `veiculosService.create`/`update` e volta pra `/veiculos`.
 */
export default function AddVehiclePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const { loja } = useAuth();
  usePageTitle(
    `${isEditMode ? "Editar Veículo" : "Adicionar Veículo"} · ${loja?.nome ?? "AutoMarket"}`,
  );

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [photosUploading, setPhotosUploading] = useState(false);
  const [loadingVeiculo, setLoadingVeiculo] = useState(isEditMode);

  // Códigos FIPE selecionados — controlam as buscas em cascata (marca -> modelo).
  // Não fazem parte do FormState porque o formulário guarda o *nome*, não o código.
  const [marcaCodigo, setMarcaCodigo] = useState("");
  const [modeloCodigo, setModeloCodigo] = useState("");

  const [marcas, setMarcas] = useState<FipeMarca[]>([]);
  const [marcasLoading, setMarcasLoading] = useState(true);
  const [marcasError, setMarcasError] = useState<string | null>(null);

  const [modelos, setModelos] = useState<FipeModelo[]>([]);
  const [modelosLoading, setModelosLoading] = useState(false);
  const [modelosError, setModelosError] = useState<string | null>(null);

  // Busca as marcas uma única vez, ao montar a página.
  useEffect(() => {
    let cancelado = false;

    apiFipeService
      .getMarcas()
      .then((data) => {
        if (!cancelado) setMarcas(data as FipeMarca[]);
      })
      .catch(() => {
        if (!cancelado) setMarcasError("Não foi possível carregar as marcas.");
      })
      .finally(() => {
        if (!cancelado) setMarcasLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  // Busca os modelos sempre que a marca selecionada mudar.
  useEffect(() => {
    if (!marcaCodigo) {
      setModelos([]);
      return;
    }

    let cancelado = false;
    setModelosLoading(true);
    setModelosError(null);

    apiFipeService
      .getModelosDaMarca(marcaCodigo)
      .then((data) => {
        if (!cancelado) setModelos((data as { modelos: FipeModelo[] }).modelos);
      })
      .catch(() => {
        if (!cancelado)
          setModelosError("Não foi possível carregar os modelos.");
      })
      .finally(() => {
        if (!cancelado) setModelosLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [marcaCodigo]);

  // Modo edição: busca o veículo existente e popula o form inteiro.
  useEffect(() => {
    if (!isEditMode || !id) return;

    let cancelado = false;
    setLoadingVeiculo(true);

    veiculosService
      .findById(Number(id))
      .then((veiculo) => {
        if (cancelado) return;

        setForm({
          marca: veiculo.marca,
          modelo: veiculo.modelo,
          anoFabricacao: String(veiculo.anoFabricacao),
          anoModelo: String(veiculo.anoModelo),
          tipoVeiculo: veiculo.tipoVeiculo,
          cambio: veiculo.cambio,
          portas: String(veiculo.portas),
          combustivel: veiculo.combustivel,
          direcao: veiculo.direcao,
          potenciaMotor: veiculo.potenciaMotor,
          cor: veiculo.cor,
          quilometragem: String(veiculo.quilometragem),
          descricao: veiculo.descricao,
          preco: String(veiculo.preco),
          precoPromocional: veiculo.precoPromocional
            ? String(veiculo.precoPromocional)
            : "",
          documentacaoRegularizacao: veiculo.documentacaoRegularizacao ?? "",
          conservacaoGarantia: veiculo.conservacaoGarantia ?? "",
          aceitaTroca: veiculo.aceitaTroca,
          aceitaFinanciamento: veiculo.aceitaFinanciamento,
          itens: veiculo.itens,
          imagens: veiculo.imagens.map((img) => ({
            url: img.url,
            capa: img.capa,
          })),
        });

        // Reconstrói a seleção da FIPE a partir dos IDs salvos, pra Marca e
        // Modelo aparecerem já selecionados (não só o texto no form).
        if (veiculo.marcaFipeId) setMarcaCodigo(String(veiculo.marcaFipeId));
        if (veiculo.modeloFipeId) setModeloCodigo(String(veiculo.modeloFipeId));
      })
      .catch(() => {
        if (!cancelado) setSubmitError("Não foi possível carregar o veículo.");
      })
      .finally(() => {
        if (!cancelado) setLoadingVeiculo(false);
      });

    return () => {
      cancelado = true;
    };
  }, [id, isEditMode]);

  function handleMarcaChange(codigo: string) {
    const marca = marcas.find((m) => m.codigo === codigo);
    setMarcaCodigo(codigo);
    setModeloCodigo("");
    updateField("marca", marca?.nome ?? "");
    updateField("modelo", "");
  }

  function handleModeloChange(codigo: string) {
    const modelo = modelos.find((m) => String(m.codigo) === codigo);
    setModeloCodigo(codigo);
    updateField("modelo", modelo?.nome ?? "");
  }

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Estáveis entre renders para que o `memo` de ItemsChecklist/ImageListField
  // funcione: sem `useCallback` aqui, uma arrow function nova a cada render
  // do form (ex: a cada tecla digitada na descrição) invalidaria o memo.
  const handleItensChange = useCallback((itens: ItemVeiculo[]) => {
    setForm((prev) => ({ ...prev, itens }));
  }, []);

  const handleImagensChange = useCallback((imagens: ImagemFormRow[]) => {
    setForm((prev) => ({ ...prev, imagens }));
  }, []);

  const handlePhotosUploadingChange = useCallback((uploading: boolean) => {
    setPhotosUploading(uploading);
  }, []);

  function handleCancel() {
    navigate("/veiculos");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const novoVeiculo: NovoVeiculoInput = {
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      anoFabricacao: Number(form.anoFabricacao),
      anoModelo: Number(form.anoModelo),
      tipoVeiculo: form.tipoVeiculo as TipoVeiculo,
      cambio: form.cambio as Cambio,
      portas: Number(form.portas),
      combustivel: form.combustivel as Combustivel,
      direcao: form.direcao as Direcao,
      potenciaMotor: form.potenciaMotor.trim(),
      cor: form.cor as Cor,
      quilometragem: Number(form.quilometragem),
      descricao: form.descricao.trim(),
      preco: Number(form.preco),
      precoPromocional: form.precoPromocional
        ? Number(form.precoPromocional)
        : undefined,
      documentacaoRegularizacao: form.documentacaoRegularizacao || undefined,
      conservacaoGarantia: form.conservacaoGarantia || undefined,
      aceitaTroca: form.aceitaTroca,
      aceitaFinanciamento: form.aceitaFinanciamento,
      itens: form.itens,
      imagens: form.imagens
        .filter((img) => img.url.trim())
        .map((img, index) => ({
          url: img.url.trim(),
          ordem: index,
          capa: img.capa,
        })),
    };

    setSubmitError(null);
    setSubmitting(true);
    try {
      if (isEditMode && id) {
        await veiculosService.update(Number(id), novoVeiculo);
      } else {
        await veiculosService.create(novoVeiculo);
      }
      navigate("/veiculos", { state: { novoVeiculo } });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : isEditMode
            ? "Erro ao salvar veículo."
            : "Erro ao cadastrar veículo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const capaUrl = useMemo(
    () => form.imagens.find((img) => img.capa)?.url || form.imagens[0]?.url,
    [form.imagens],
  );

  const tituloPreview =
    [form.marca, form.modelo].filter(Boolean).join(" ") || "Novo veículo";

  if (loadingVeiculo) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <span className={`material-symbols-outlined ${styles.loadingIcon}`}>
            directions_car
          </span>
          Carregando veículo...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleCancel}
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className={styles.title}>
            {isEditMode ? "Editar Veículo" : "Adicionar Veículo"}
          </h2>
          <p className={styles.subtitle}>
            {isEditMode
              ? "Atualize os dados do veículo"
              : "Preencha os dados para cadastrar um veículo no estoque"}
          </p>
        </div>
      </header>

      <div className={styles.layout}>
        <form
          id="vehicle-form"
          className={styles.form}
          onSubmit={handleSubmit}
          noValidate
        >
          <Section icon="directions_car" title="Identificação">
            <div className={styles.grid}>
              <Field
                label="Marca"
                required
                error={errors.marca ?? marcasError ?? undefined}
              >
                <select
                  className={`${styles.select} ${errors.marca ? styles.inputError : ""}`}
                  value={marcaCodigo}
                  onChange={(e) => handleMarcaChange(e.target.value)}
                  disabled={marcasLoading || !!marcasError}
                >
                  <option value="">
                    {marcasLoading ? "Carregando marcas..." : "Selecione"}
                  </option>
                  {marcas.map((marca) => (
                    <option key={marca.codigo} value={marca.codigo}>
                      {marca.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Modelo"
                required
                error={errors.modelo ?? modelosError ?? undefined}
              >
                <select
                  className={`${styles.select} ${errors.modelo ? styles.inputError : ""}`}
                  value={modeloCodigo}
                  onChange={(e) => handleModeloChange(e.target.value)}
                  disabled={!marcaCodigo || modelosLoading || !!modelosError}
                >
                  <option value="">
                    {!marcaCodigo
                      ? "Selecione a marca primeiro"
                      : modelosLoading
                        ? "Carregando modelos..."
                        : "Selecione"}
                  </option>
                  {modelos.map((modelo) => (
                    <option key={modelo.codigo} value={modelo.codigo}>
                      {modelo.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Ano de fabricação"
                required
                error={errors.anoFabricacao}
              >
                <select
                  className={`${styles.select} ${errors.anoFabricacao ? styles.inputError : ""}`}
                  value={form.anoFabricacao}
                  onChange={(e) => updateField("anoFabricacao", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {ANOS.map((ano) => (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Ano do modelo"
                required
                error={errors.anoModelo}
              >
                <select
                  className={`${styles.select} ${errors.anoModelo ? styles.inputError : ""}`}
                  value={form.anoModelo}
                  onChange={(e) => updateField("anoModelo", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {ANOS.map((ano) => (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section icon="settings" title="Ficha Técnica">
            <div className={`${styles.grid} ${styles.grid3}`}>
              <Field label="Tipo" required error={errors.tipoVeiculo}>
                <select
                  className={`${styles.select} ${errors.tipoVeiculo ? styles.inputError : ""}`}
                  value={form.tipoVeiculo}
                  onChange={(e) =>
                    updateField("tipoVeiculo", e.target.value as TipoVeiculo)
                  }
                >
                  <option value="">Selecione</option>
                  {Object.entries(TIPO_VEICULO_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Câmbio" required error={errors.cambio}>
                <select
                  className={`${styles.select} ${errors.cambio ? styles.inputError : ""}`}
                  value={form.cambio}
                  onChange={(e) =>
                    updateField("cambio", e.target.value as Cambio)
                  }
                >
                  <option value="">Selecione</option>
                  {Object.entries(CAMBIO_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Portas" required error={errors.portas}>
                <select
                  className={`${styles.select} ${errors.portas ? styles.inputError : ""}`}
                  value={form.portas}
                  onChange={(e) => updateField("portas", e.target.value)}
                >
                  {[2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} portas
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Combustível" required error={errors.combustivel}>
                <select
                  className={`${styles.select} ${errors.combustivel ? styles.inputError : ""}`}
                  value={form.combustivel}
                  onChange={(e) =>
                    updateField("combustivel", e.target.value as Combustivel)
                  }
                >
                  <option value="">Selecione</option>
                  {Object.entries(COMBUSTIVEL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Direção" required error={errors.direcao}>
                <select
                  className={`${styles.select} ${errors.direcao ? styles.inputError : ""}`}
                  value={form.direcao}
                  onChange={(e) =>
                    updateField("direcao", e.target.value as Direcao)
                  }
                >
                  <option value="">Selecione</option>
                  {Object.entries(DIRECAO_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cor" required error={errors.cor}>
                <select
                  className={`${styles.select} ${errors.cor ? styles.inputError : ""}`}
                  value={form.cor}
                  onChange={(e) => updateField("cor", e.target.value as Cor)}
                >
                  <option value="">Selecione</option>
                  {Object.entries(COR_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Potência do motor"
                required
                error={errors.potenciaMotor}
              >
                <select
                  className={`${styles.select} ${errors.potenciaMotor ? styles.inputError : ""}`}
                  value={form.potenciaMotor}
                  onChange={(e) => updateField("potenciaMotor", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {POTENCIA_MOTOR_OPTIONS.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Quilometragem (km)"
                required
                error={errors.quilometragem}
              >
                <NumberField
                  className={`${styles.input} ${errors.quilometragem ? styles.inputError : ""}`}
                  value={form.quilometragem}
                  onChange={(raw) => updateField("quilometragem", raw)}
                  placeholder="Ex: 32.000"
                />
              </Field>
            </div>
          </Section>

          <Section icon="payments" title="Preço e Condições">
            <div className={styles.grid}>
              <Field label="Preço" required error={errors.preco}>
                <NumberField
                  className={`${styles.input} ${errors.preco ? styles.inputError : ""}`}
                  value={form.preco}
                  onChange={(raw) => updateField("preco", raw)}
                  prefix="R$ "
                  placeholder="Ex: 89.900"
                />
              </Field>
              <Field label="Preço promocional" error={errors.precoPromocional}>
                <NumberField
                  className={`${styles.input} ${errors.precoPromocional ? styles.inputError : ""}`}
                  value={form.precoPromocional}
                  onChange={(raw) => updateField("precoPromocional", raw)}
                  prefix="R$ "
                  placeholder="Opcional"
                />
              </Field>
              <Field label="Documentação/Regularização">
                <select
                  className={styles.select}
                  value={form.documentacaoRegularizacao}
                  onChange={(e) =>
                    updateField("documentacaoRegularizacao", e.target.value)
                  }
                >
                  <option value="">Não informado</option>
                  {DOCUMENTACAO_OPTIONS.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Conservação/Garantia">
                <select
                  className={styles.select}
                  value={form.conservacaoGarantia}
                  onChange={(e) =>
                    updateField("conservacaoGarantia", e.target.value)
                  }
                >
                  <option value="">Não informado</option>
                  {CONSERVACAO_GARANTIA_OPTIONS.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className={styles.actionsRow}>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.aceitaTroca}
                  onChange={(e) => updateField("aceitaTroca", e.target.checked)}
                />
                Aceita troca
              </label>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.aceitaFinanciamento}
                  onChange={(e) =>
                    updateField("aceitaFinanciamento", e.target.checked)
                  }
                />
                Aceita financiamento
              </label>
            </div>
          </Section>

          <Section icon="description" title="Descrição">
            <Field
              label="Descrição do anúncio"
              required
              error={errors.descricao}
            >
              <textarea
                className={`${styles.textarea} ${errors.descricao ? styles.inputError : ""}`}
                value={form.descricao}
                onChange={(e) => updateField("descricao", e.target.value)}
                placeholder="Único dono, revisões em dia, pneus novos..."
              />
            </Field>
          </Section>

          <Section icon="photo_library" title="Fotos">
            <ImageListField
              value={form.imagens}
              onChange={handleImagensChange}
              onUploadingChange={handlePhotosUploadingChange}
            />
            {errors.imagens && (
              <span className={styles.errorText}>{errors.imagens}</span>
            )}
          </Section>

          <Section
            icon="checklist"
            title="Itens do Veículo"
            hint="Selecione os itens de série, organizados por categoria."
          >
            <ItemsChecklist
              selecionados={form.itens}
              onChange={handleItensChange}
            />
          </Section>
        </form>

        <aside className={styles.preview}>
          <div className={styles.previewCard}>
            <div className={styles.previewImage}>
              {capaUrl ? (
                <img src={capaUrl} alt="" />
              ) : (
                <span className="material-symbols-outlined">
                  directions_car
                </span>
              )}
            </div>
            <div className={styles.previewBody}>
              <span className={styles.previewLabel}>Pré-visualização</span>
              <h3 className={styles.previewTitle}>{tituloPreview}</h3>
              <div className={styles.previewPrecoRow}>
                <span className={styles.previewPreco}>
                  {formatMoeda(form.precoPromocional || form.preco)}
                </span>
                {form.precoPromocional && (
                  <span className={styles.previewPrecoOriginal}>
                    {formatMoeda(form.preco)}
                  </span>
                )}
              </div>
              <div className={styles.previewTags}>
                {form.anoFabricacao && form.anoModelo && (
                  <span className={styles.previewTag}>
                    {form.anoFabricacao}/{form.anoModelo}
                  </span>
                )}
                {form.cambio && (
                  <span className={styles.previewTag}>
                    {CAMBIO_LABELS[form.cambio]}
                  </span>
                )}
                {form.combustivel && (
                  <span className={styles.previewTag}>
                    {COMBUSTIVEL_LABELS[form.combustivel]}
                  </span>
                )}
                {form.quilometragem && (
                  <span className={styles.previewTag}>
                    {Number(form.quilometragem).toLocaleString("pt-BR")} km
                  </span>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className={styles.footerBar}>
        {submitError && (
          <span className={styles.submitError}>{submitError}</span>
        )}
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={handleCancel}
          disabled={submitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="vehicle-form"
          className={styles.buttonPrimary}
          disabled={submitting || photosUploading}
        >
          {photosUploading
            ? "Enviando fotos..."
            : submitting
              ? isEditMode
                ? "Salvando..."
                : "Cadastrando..."
              : isEditMode
                ? "Salvar alterações"
                : "Cadastrar Veículo"}
        </button>
      </div>
    </div>
  );
}

interface SectionProps {
  icon: string;
  title: string;
  hint?: string;
  children: ReactNode;
}

function Section({ icon, title, hint, children }: SectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={`material-symbols-outlined ${styles.sectionIcon}`}>
          {icon}
        </span>
        <div>
          <h3 className={styles.sectionTitle}>{title}</h3>
          {hint && <p className={styles.sectionHint}>{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}

function Field({ label, required, error, className, children }: FieldProps) {
  return (
    <div className={`${styles.field} ${className ?? ""}`}>
      <span className={`${styles.label} ${required ? styles.required : ""}`}>
        {label}
      </span>
      {children}
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
