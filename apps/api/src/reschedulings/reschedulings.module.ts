import { Module } from '@nestjs/common';
import { ReschedulingsService } from './reschedulings.service';
import { ReschedulingsController } from './reschedulings.controller';

@Module({
  controllers: [ReschedulingsController],
  providers: [ReschedulingsService],
  exports: [ReschedulingsService],
})
export class ReschedulingsModule {}
