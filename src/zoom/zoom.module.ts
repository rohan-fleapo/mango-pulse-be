import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { ZoomService } from './zoom.service';
import { ZoomController } from './zoom.controller';

@Module({
  imports: [SupabaseModule, WhatsAppModule],
  controllers: [ZoomController],
  providers: [ZoomService],
  exports: [ZoomService],
})
export class ZoomModule {}
