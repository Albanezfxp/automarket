import { Test, TestingModule } from '@nestjs/testing';
import { ContatoWhatsappService } from './contato_whatsapp.service';

describe('ContatoWhatsappService', () => {
  let service: ContatoWhatsappService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContatoWhatsappService],
    }).compile();

    service = module.get<ContatoWhatsappService>(ContatoWhatsappService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
