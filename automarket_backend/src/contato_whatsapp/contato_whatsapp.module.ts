import { Module } from '@nestjs/common';
import { ContatoWhatsappService } from './contato_whatsapp.service';
import { ContatoWhatsappController } from './contato_whatsapp.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [ContatoWhatsappController],
  providers: [ContatoWhatsappService],
  exports: [ContatoWhatsappService],
  imports: [PrismaModule],
})
export class ContatoWhatsappModule {}
