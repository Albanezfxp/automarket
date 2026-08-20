import { Module } from '@nestjs/common';
import { VeiculosService } from './veiculos.service';
import { VeiculosController } from './veiculos.controller';
import { VeiculoArquivamentoService } from './veiculo-arquivamento.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [VeiculosController],
  providers: [VeiculosService, VeiculoArquivamentoService, PrismaService],
  exports: [VeiculosService],
})
export class VeiculosModule {}
