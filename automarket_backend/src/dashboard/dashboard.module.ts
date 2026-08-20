import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { ContatoWhatsappModule } from 'src/contato_whatsapp/contato_whatsapp.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [PrismaModule, AuthModule, ContatoWhatsappModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
