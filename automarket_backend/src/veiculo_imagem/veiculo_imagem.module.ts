import { Module } from '@nestjs/common';
import { VeiculoImagemService } from './veiculo_imagem.service';
import { VeiculoImagemController } from './veiculo_imagem.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [VeiculoImagemController],
  providers: [VeiculoImagemService],
  imports: [PrismaModule],
  exports: [VeiculoImagemModule],
})
export class VeiculoImagemModule {}
