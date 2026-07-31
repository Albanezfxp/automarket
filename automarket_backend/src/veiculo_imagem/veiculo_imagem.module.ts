import { Module } from '@nestjs/common';
import { VeiculoImagemService } from './veiculo_imagem.service';
import { VeiculoImagemController } from './veiculo_imagem.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [VeiculoImagemController],
  providers: [VeiculoImagemService, PrismaService],
  imports: [PrismaModule],
  exports: [VeiculoImagemModule],
})
export class VeiculoImagemModule {}
