import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards';
import { MeetingsModule } from './meetings/meetings.module';
import { SupabaseModule } from './supabase/supabase.module';
import { UsersModule } from './users/users.module';
import { ZoomModule } from './zoom/zoom.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    // Global configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Supabase module (global)
    SupabaseModule,
    // Feature modules
    AuthModule,
    UsersModule,
    ZoomModule,
    MeetingsModule,
    AnalyticsModule,
  ],
  providers: [
    // Global JWT Auth Guard - all routes require authentication by default
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
