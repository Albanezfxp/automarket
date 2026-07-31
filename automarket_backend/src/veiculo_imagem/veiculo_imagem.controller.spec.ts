import { Test, TestingModule } from '@nestjs/testing';
import { VeiculoImagemController } from './veiculo_imagem.controller';
import { VeiculoImagemService } from './veiculo_imagem.service';

describe('VeiculoImagemController', () => {
  let controller: VeiculoImagemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VeiculoImagemController],
      providers: [VeiculoImagemService],
    }).compile();

    controller = module.get<VeiculoImagemController>(VeiculoImagemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
