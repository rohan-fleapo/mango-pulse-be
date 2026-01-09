import { Module } from '@nestjs/common';
import { SchedulerModule } from 'src/scheduler/scheduler.module';
import { SupabaseModule } from '../supabase/supabase.module'; // Assuming SupabaseModule exports SupabaseService
import { ZoomModule } from '../zoom/zoom.module';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';

@Module({
  imports: [ZoomModule, SupabaseModule, SchedulerModule], // Need SupabaseModule for db
  controllers: [MeetingsController],
  providers: [MeetingsService],
})
export class MeetingsModule {}
