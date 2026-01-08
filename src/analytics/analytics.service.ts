import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UserDto } from '../users/dto';
import { AnalyticsQueryDto } from './dto';
import { GetMeetingsStatsOutput } from './dto/meeting-stats.dto';

@Injectable()
export class AnalyticsService {
  constructor(private supabaseService: SupabaseService) {}

  async getMeetingsStats(input: {
    user: UserDto;
    query: AnalyticsQueryDto;
  }): Promise<GetMeetingsStatsOutput> {
    const { user, query } = input;
    const supabase = this.supabaseService.getAdminClient();

    let meetingsQuery = supabase
      .from('meetings')
      .select('id, start_date, end_date, scheduled_end_date, creator_id')
      .eq('creator_id', user.creatorId);

    if (query.startDate) {
      meetingsQuery = meetingsQuery.gte('start_date', query.startDate);
    }

    if (query.endDate) {
      meetingsQuery = meetingsQuery.lte('start_date', query.endDate);
    }

    const { data: meetings } = await meetingsQuery;

    return {
      totalMeetings: meetings?.length ?? 0,
    };
  }
}
