import { Module } from '@nestjs/common';
import { ApiFipeService } from './api_fipe.service';
import { ApiFipeController } from './api_fipe.controller';

@Module({
  providers: [ApiFipeService],
  controllers: [ApiFipeController],
  exports: [ApiFipeService],
})
export class ApiFipeModule {}
