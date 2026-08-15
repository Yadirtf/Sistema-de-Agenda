import { Module } from '@nestjs/common';
import { FollowUpsService } from './follow-ups.service';
import { FollowUpsController } from './follow-ups.controller';
import { FollowUpsListener } from './follow-ups.listener';

@Module({
  controllers: [FollowUpsController],
  providers: [FollowUpsService, FollowUpsListener],
  exports: [FollowUpsService],
})
export class FollowUpsModule {}
