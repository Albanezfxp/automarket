import { Module } from '@nestjs/common';
import { VendedorService } from './vendedor.service';
import { VendedorController } from './vendedor.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  exports: [VendedorModule],
  controllers: [VendedorController],
  providers: [VendedorService, PrismaService],
  imports: [PrismaModule],
})
export class VendedorModule {}
