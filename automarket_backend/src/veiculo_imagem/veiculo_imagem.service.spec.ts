import { Test, TestingModule } from '@nestjs/testing';
import { VeiculoImagemService } from './veiculo_imagem.service';

describe('VeiculoImagemService', () => {
  let service: VeiculoImagemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VeiculoImagemService],
    }).compile();

    service = module.get<VeiculoImagemService>(VeiculoImagemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
