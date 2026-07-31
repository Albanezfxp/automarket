import { Test, TestingModule } from '@nestjs/testing';
import { LojasController } from './lojas.controller';
import { LojasService } from './lojas.service';

describe('LojasController', () => {
  let controller: LojasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LojasController],
      providers: [LojasService],
    }).compile();

    controller = module.get<LojasController>(LojasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
