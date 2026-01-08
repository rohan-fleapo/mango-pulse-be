import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AnalyticsQueryDto } from './dto';

@Injectable()
export class AnalyticsService {
  constructor(private supabaseService: SupabaseService) {}

  async getEngagementStats(input: AnalyticsQueryDto) {
    const supabase = this.supabaseService.getAdminClient();

    const applyFiltersToQuery = (query: any) => {
      if (input.meetingId) query = query.eq('meeting_id', input.meetingId);
      if (input.userId) query = query.eq('user_id', input.userId);
      if (input.startDate) query = query.gte('created_at', input.startDate);
      if (input.endDate) query = query.lte('created_at', input.endDate);
      return query;
    };

    const { count: totalEngagements } = await applyFiltersToQuery(
      supabase.from('meeting_engagements').select('*', {
        count: 'exact',
        head: true,
      }),
    );

    const { count: interestedCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_engagements')
        .select('*', { count: 'exact', head: true })
        .eq('interested', 'yes'),
    );

    const { count: notInterestedCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_engagements')
        .select('*', { count: 'exact', head: true })
        .eq('interested', 'no'),
    );

    const { count: maybeCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_engagements')
        .select('*', { count: 'exact', head: true })
        .eq('interested', 'maybe'),
    );

    const { count: noResponseCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_engagements')
        .select('*', { count: 'exact', head: true })
        .eq('interested', 'no-response'),
    );

    const { count: attendedCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_engagements')
        .select('*', { count: 'exact', head: true })
        .eq('attended', true),
    );

    const attendanceRate =
      totalEngagements && totalEngagements > 0
        ? ((attendedCount ?? 0) / totalEngagements) * 100
        : 0;

    const { data: ratingData } = await applyFiltersToQuery(
      supabase
        .from('meeting_engagements')
        .select('rating')
        .not('rating', 'is', null),
    );

    const averageRating =
      ratingData && ratingData.length > 0
        ? ratingData.reduce((sum, item) => sum + (item.rating || 0), 0) /
          ratingData.length
        : null;

    return {
      totalEngagements: totalEngagements ?? 0,
      interestedCount: interestedCount ?? 0,
      notInterestedCount: notInterestedCount ?? 0,
      maybeCount: maybeCount ?? 0,
      noResponseCount: noResponseCount ?? 0,
      attendedCount: attendedCount ?? 0,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      averageRating: averageRating
        ? Math.round(averageRating * 100) / 100
        : null,
    };
  }

  async getFeedbackStats(input: AnalyticsQueryDto) {
    const supabase = this.supabaseService.getAdminClient();

    const applyFiltersToQuery = (query: any) => {
      if (input.meetingId) query = query.eq('meeting_id', input.meetingId);
      if (input.userId) query = query.eq('user_id', input.userId);
      if (input.startDate) query = query.gte('created_at', input.startDate);
      if (input.endDate) query = query.lte('created_at', input.endDate);
      return query;
    };

    const { count: totalFeedbacks } = await applyFiltersToQuery(
      supabase
        .from('meeting_feedbacks')
        .select('*', { count: 'exact', head: true }),
    );

    const { data: ratingData } = await applyFiltersToQuery(
      supabase
        .from('meeting_feedbacks')
        .select('rating')
        .not('rating', 'is', null),
    );

    const averageRating =
      ratingData && ratingData.length > 0
        ? ratingData.reduce((sum, item) => sum + (item.rating || 0), 0) /
          ratingData.length
        : null;

    const { count: nextMeetingInterestedCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_feedbacks')
        .select('*', { count: 'exact', head: true })
        .eq('next_meeting_interested', 'yes'),
    );

    const { count: nextMeetingNotInterestedCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_feedbacks')
        .select('*', { count: 'exact', head: true })
        .eq('next_meeting_interested', 'no'),
    );

    const { count: nextMeetingMaybeCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_feedbacks')
        .select('*', { count: 'exact', head: true })
        .eq('next_meeting_interested', 'maybe'),
    );

    const { count: nextMeetingNoResponseCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_feedbacks')
        .select('*', { count: 'exact', head: true })
        .eq('next_meeting_interested', 'no-response'),
    );

    return {
      totalFeedbacks: totalFeedbacks ?? 0,
      averageRating: averageRating
        ? Math.round(averageRating * 100) / 100
        : null,
      nextMeetingInterestedCount: nextMeetingInterestedCount ?? 0,
      nextMeetingNotInterestedCount: nextMeetingNotInterestedCount ?? 0,
      nextMeetingMaybeCount: nextMeetingMaybeCount ?? 0,
      nextMeetingNoResponseCount: nextMeetingNoResponseCount ?? 0,
    };
  }

  async getActivityStats(input: AnalyticsQueryDto) {
    const supabase = this.supabaseService.getAdminClient();

    const applyFiltersToQuery = (query: any) => {
      if (input.meetingId) query = query.eq('meeting_id', input.meetingId);
      if (input.userId) query = query.eq('user_id', input.userId);
      if (input.startDate) query = query.gte('created_at', input.startDate);
      if (input.endDate) query = query.lte('created_at', input.endDate);
      return query;
    };

    const { count: totalActivities } = await applyFiltersToQuery(
      supabase
        .from('meeting_activities')
        .select('*', { count: 'exact', head: true }),
    );

    const { count: activeSessions } = await applyFiltersToQuery(
      supabase
        .from('meeting_activities')
        .select('*', { count: 'exact', head: true })
        .is('leaving_time', null),
    );

    const { count: completedSessions } = await applyFiltersToQuery(
      supabase
        .from('meeting_activities')
        .select('*', { count: 'exact', head: true })
        .not('leaving_time', 'is', null),
    );

    const { data: completedActivities } = await applyFiltersToQuery(
      supabase
        .from('meeting_activities')
        .select('joining_time, leaving_time')
        .not('leaving_time', 'is', null),
    );

    let averageSessionDuration: number | null = null;
    if (completedActivities && completedActivities.length > 0) {
      const durations = completedActivities.map((activity) => {
        const joinTime = new Date(activity.joining_time).getTime();
        const leaveTime = new Date(activity.leaving_time).getTime();
        return (leaveTime - joinTime) / (1000 * 60);
      });
      const totalDuration = durations.reduce(
        (sum, duration) => sum + duration,
        0,
      );
      averageSessionDuration = totalDuration / durations.length;
    }

    const { data: uniqueUsers } = await applyFiltersToQuery(
      supabase.from('meeting_activities').select('user_id'),
    );

    const uniqueUsersSet = new Set(
      uniqueUsers?.map((activity) => activity.user_id) || [],
    );

    return {
      totalActivities: totalActivities ?? 0,
      activeSessions: activeSessions ?? 0,
      completedSessions: completedSessions ?? 0,
      averageSessionDuration: averageSessionDuration
        ? Math.round(averageSessionDuration * 100) / 100
        : null,
      uniqueUsersCount: uniqueUsersSet.size,
    };
  }
}
