import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseModule } from '../supabase/supabase.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), SupabaseModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
