import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AnalyticsService {
  constructor(private supabaseService: SupabaseService) {}

  async getStats() {
    const supabase = this.supabaseService.getAdminClient();

    // Get total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get total creators
    const { count: totalCreators } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'creator');

    // Get new users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newUsersThisMonth } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());

    // Get new users today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count: newUsersToday } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString());

    return {
      totalUsers: totalUsers ?? 0,
      totalCreators: totalCreators ?? 0,
      newUsersThisMonth: newUsersThisMonth ?? 0,
      newUsersToday: newUsersToday ?? 0,
    };
  }
}
