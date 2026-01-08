import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient<Database>;
  private supabaseAdmin: SupabaseClient<Database>;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const supabaseKey = this.configService.getOrThrow<string>(
      'SUPABASE_JWT_SECRET',
    );
    const supabaseServiceKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    this.supabaseAdmin = createClient<Database>(
      supabaseUrl,
      supabaseServiceKey,
    );
  }

  getClient(): SupabaseClient<Database> {
    return this.supabase;
  }

  getAdminClient(): SupabaseClient<Database> {
    return this.supabaseAdmin;
  }
}
