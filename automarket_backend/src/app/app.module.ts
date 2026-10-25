import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { VeiculosModule } from 'src/veiculos/veiculos.module';
import { LojasModule } from 'src/lojas/lojas.module';
import { ContatoWhatsappModule } from 'src/contato_whatsapp/contato_whatsapp.module';
import { EnderecoModule } from 'src/endereco/endereco.module';
import { VeiculoImagemModule } from 'src/veiculo_imagem/veiculo_imagem.module';
import { VendedorModule } from 'src/vendedor/vendedor.module';
import { UploadsModule } from 'src/uploads/uploads.module';
import { ApiFipeModule } from 'src/api_fipe/api_fipe.module';
import { AuthModule } from 'src/auth/auth.module';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { DashboardModule } from 'src/dashboard/dashboard.module';
import { HealthController } from 'src/health/health.controller';
import { ReadOnlyGuard } from 'src/read-only/read-only.guard';
import { RateLimitGuard } from 'src/common/rate-limit.guard';
import { PrismaExceptionFilter } from 'src/common/prisma-exception.filter';

// Controllers e services de domínio ficam só no módulo da própria feature:
// declará-los aqui também duplicava as rotas e criava uma instância extra do
// PrismaClient (cada uma com seu pool de conexões) — ruim para o limite de
// conexões do Neon. PrismaService vem apenas do PrismaModule.
@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    VeiculosModule,
    LojasModule,
    ContatoWhatsappModule,
    EnderecoModule,
    VeiculoImagemModule,
    VendedorModule,
    UploadsModule,
    ApiFipeModule,
    DashboardModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    // Ordem importa: o RateLimitGuard lê `request.loja`, preenchido pelo
    // JwtAuthGuard.
    { provide: APP_GUARD, useClass: ReadOnlyGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
