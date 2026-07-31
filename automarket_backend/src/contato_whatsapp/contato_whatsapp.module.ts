import { Module } from '@nestjs/common';
import { ContatoWhatsappService } from './contato_whatsapp.service';
import { ContatoWhatsappController } from './contato_whatsapp.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [ContatoWhatsappController],
  providers: [ContatoWhatsappService, PrismaService],
  exports: [ContatoWhatsappModule],
  imports: [PrismaModule],
})
export class ContatoWhatsappModule {}
