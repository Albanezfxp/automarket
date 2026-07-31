import { Module } from '@nestjs/common';
import { EnderecoService } from './endereco.service';
import { EnderecoController } from './endereco.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [EnderecoController],
  providers: [EnderecoService, PrismaService],
  imports: [PrismaModule],
  exports: [EnderecoModule],
})
export class EnderecoModule {}
