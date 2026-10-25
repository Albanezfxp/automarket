import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { VeiculosService } from 'src/veiculos/veiculos.service';
import { VeiculosController } from 'src/veiculos/veiculos.controller';
import { VeiculosModule } from 'src/veiculos/veiculos.module';
import { LojasModule } from 'src/lojas/lojas.module';
import { LojasController } from 'src/lojas/lojas.controller';
import { LojasService } from 'src/lojas/lojas.service';
import { ContatoWhatsappModule } from 'src/contato_whatsapp/contato_whatsapp.module';
import { EnderecoModule } from 'src/endereco/endereco.module';
import { VeiculoImagemModule } from 'src/veiculo_imagem/veiculo_imagem.module';
import { VendedorModule } from 'src/vendedor/vendedor.module';
import { ContatoWhatsappController } from 'src/contato_whatsapp/contato_whatsapp.controller';
import { EnderecoController } from 'src/endereco/endereco.controller';
import { VeiculoImagemController } from 'src/veiculo_imagem/veiculo_imagem.controller';
import { VendedorController } from 'src/vendedor/vendedor.controller';
import { ContatoWhatsappService } from 'src/contato_whatsapp/contato_whatsapp.service';
import { EnderecoService } from 'src/endereco/endereco.service';
import { VeiculoImagemService } from 'src/veiculo_imagem/veiculo_imagem.service';
import { VendedorService } from 'src/vendedor/vendedor.service';
import { UploadsModule } from 'src/uploads/uploads.module';
import { ApiFipeModule } from 'src/api_fipe/api_fipe.module';
import { ApiFipeController } from 'src/api_fipe/api_fipe.controller';
import { ApiFipeService } from 'src/api_fipe/api_fipe.service';
import { AuthModule } from 'src/auth/auth.module';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { DashboardModule } from 'src/dashboard/dashboard.module';
import { HealthController } from 'src/health/health.controller';
import { ReadOnlyGuard } from 'src/read-only/read-only.guard';

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
  controllers: [
    AppController,
    VeiculosController,
    LojasController,
    ContatoWhatsappController,
    EnderecoController,
    VeiculoImagemController,
    VendedorController,
    ApiFipeController,
    HealthController,
  ],
  providers: [
    AppService,
    PrismaService,
    VeiculosService,
    LojasService,
    ContatoWhatsappService,
    EnderecoService,
    VeiculoImagemService,
    VendedorService,
    ApiFipeService,
    { provide: APP_GUARD, useClass: ReadOnlyGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
