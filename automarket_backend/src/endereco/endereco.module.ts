import { Module } from '@nestjs/common';
import { EnderecoService } from './endereco.service';
import { EnderecoController } from './endereco.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [EnderecoController],
  providers: [EnderecoService],
  imports: [PrismaModule],
  exports: [EnderecoModule],
})
export class EnderecoModule {}
