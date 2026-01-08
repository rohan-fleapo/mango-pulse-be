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

    const { data: members } = await supabase
      .from('users')
      .select('creator_id')
      .eq('creator_id', user.id);

    let meetingsQuery = supabase
      .from('meetings')
      .select('id, start_date, end_date, scheduled_end_date, creator_id')
      .eq('creator_id', user.id);

    if (query.startDate) {
      meetingsQuery = meetingsQuery.gte('start_date', query.startDate);
    }

    if (query.endDate) {
      meetingsQuery = meetingsQuery.lte('start_date', query.endDate);
    }
    const { data: meetings } = await meetingsQuery;

    let meetingEngagementsQuery = supabase
      .from('meeting_engagements')
      .select('id, meeting_id, attended, meetings!inner(creator_id)')
      .eq('meetings.creator_id', user.id);

    if (query.startDate) {
      meetingEngagementsQuery = meetingEngagementsQuery.gte(
        'meetings.start_date',
        query.startDate,
      );
    }

    if (query.endDate) {
      meetingEngagementsQuery = meetingEngagementsQuery.lte(
        'meetings.start_date',
        query.endDate,
      );
    }
    const { data: meetingEngagements } = await meetingEngagementsQuery;

    let avgEngagementRate = 0;
    if (meetingEngagements) {
      const totalAttended = meetingEngagements.filter(
        (me) => me.attended,
      ).length;
      if (meetingEngagements.length > 0) {
        avgEngagementRate = (totalAttended / meetingEngagements.length) * 100;
      }
    }

    return {
      totalMembers: members?.length ?? 0,
      totalMeetings: meetings?.length ?? 0,
      avgEngagementRate,
    };
  }
}
