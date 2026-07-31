import { Test, TestingModule } from '@nestjs/testing';
import { ContatoWhatsappController } from './contato_whatsapp.controller';
import { ContatoWhatsappService } from './contato_whatsapp.service';

describe('ContatoWhatsappController', () => {
  let controller: ContatoWhatsappController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContatoWhatsappController],
      providers: [ContatoWhatsappService],
    }).compile();

    controller = module.get<ContatoWhatsappController>(ContatoWhatsappController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
