import { Module } from '@nestjs/common';
import { VendedorService } from './vendedor.service';
import { VendedorController } from './vendedor.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  exports: [VendedorService],
  controllers: [VendedorController],
  providers: [VendedorService],
  imports: [PrismaModule],
})
export class VendedorModule {}
