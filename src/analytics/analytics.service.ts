import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UserDto } from '../users/dto';
import { AnalyticsQueryDto } from './dto';

@Injectable()
export class AnalyticsService {
  constructor(private supabaseService: SupabaseService) {}

  async getEngagementStats(input: { user: UserDto; query: AnalyticsQueryDto }) {
    const { user, query } = input;
    const supabase = this.supabaseService.getAdminClient();

    const applyFiltersToQuery = (queryBuilder: any) => {
      if (query.meetingId)
        queryBuilder = queryBuilder.eq(
          'meeting_engagements.meeting_id',
          query.meetingId,
        );
      if (query.userId)
        queryBuilder = queryBuilder.eq(
          'meeting_engagements.user_id',
          query.userId,
        );
      if (query.startDate)
        queryBuilder = queryBuilder.gte(
          'meeting_engagements.created_at',
          query.startDate,
        );
      if (query.endDate)
        queryBuilder = queryBuilder.lte(
          'meeting_engagements.created_at',
          query.endDate,
        );
      return queryBuilder;
    };

    const { count: totalEngagements } = await applyFiltersToQuery(
      supabase
        .from('meeting_engagements')
        .select('*, users!inner(creator_id)', {
          count: 'exact',
          head: true,
        })
        .eq('users.creator_id', user.creatorId),
    );

    const { count: interestedCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_engagements')
        .select('*, users!inner(creator_id)', {
          count: 'exact',
          head: true,
        })
        .eq('users.creator_id', user.creatorId)
        .eq('interested', 'yes'),
    );

    const { count: notInterestedCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_engagements')
        .select('*, users!inner(creator_id)', {
          count: 'exact',
          head: true,
        })
        .eq('users.creator_id', user.creatorId)
        .eq('interested', 'no'),
    );

    const { count: maybeCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_engagements')
        .select('*, users!inner(creator_id)', {
          count: 'exact',
          head: true,
        })
        .eq('users.creator_id', user.creatorId)
        .eq('interested', 'maybe'),
    );

    const { count: noResponseCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_engagements')
        .select('*, users!inner(creator_id)', {
          count: 'exact',
          head: true,
        })
        .eq('users.creator_id', user.creatorId)
        .eq('interested', 'no-response'),
    );

    const { count: attendedCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_engagements')
        .select('*, users!inner(creator_id)', {
          count: 'exact',
          head: true,
        })
        .eq('users.creator_id', user.creatorId)
        .eq('attended', true),
    );

    const attendanceRate =
      totalEngagements && totalEngagements > 0
        ? ((attendedCount ?? 0) / totalEngagements) * 100
        : 0;

    const { data: ratingData } = await applyFiltersToQuery(
      supabase
        .from('meeting_engagements')
        .select('rating, users!inner(creator_id)')
        .eq('users.creator_id', user.creatorId)
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

  async getFeedbackStats(input: { user: UserDto; query: AnalyticsQueryDto }) {
    const { user, query } = input;
    const supabase = this.supabaseService.getAdminClient();

    const applyFiltersToQuery = (queryBuilder: any) => {
      if (query.meetingId)
        queryBuilder = queryBuilder.eq(
          'meeting_feedbacks.meeting_id',
          query.meetingId,
        );
      if (query.userId)
        queryBuilder = queryBuilder.eq(
          'meeting_feedbacks.user_id',
          query.userId,
        );
      if (query.startDate)
        queryBuilder = queryBuilder.gte(
          'meeting_feedbacks.created_at',
          query.startDate,
        );
      if (query.endDate)
        queryBuilder = queryBuilder.lte(
          'meeting_feedbacks.created_at',
          query.endDate,
        );
      return queryBuilder;
    };

    const { count: totalFeedbacks } = await applyFiltersToQuery(
      supabase
        .from('meeting_feedbacks')
        .select('*, users!inner(creator_id)', {
          count: 'exact',
          head: true,
        })
        .eq('users.creator_id', user.creatorId),
    );

    const { data: ratingData } = await applyFiltersToQuery(
      supabase
        .from('meeting_feedbacks')
        .select('rating, users!inner(creator_id)')
        .eq('users.creator_id', user.creatorId)
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
        .select('*, users!inner(creator_id)', {
          count: 'exact',
          head: true,
        })
        .eq('users.creator_id', user.creatorId)
        .eq('next_meeting_interested', 'yes'),
    );

    const { count: nextMeetingNotInterestedCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_feedbacks')
        .select('*, users!inner(creator_id)', {
          count: 'exact',
          head: true,
        })
        .eq('users.creator_id', user.creatorId)
        .eq('next_meeting_interested', 'no'),
    );

    const { count: nextMeetingMaybeCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_feedbacks')
        .select('*, users!inner(creator_id)', {
          count: 'exact',
          head: true,
        })
        .eq('users.creator_id', user.creatorId)
        .eq('next_meeting_interested', 'maybe'),
    );

    const { count: nextMeetingNoResponseCount } = await applyFiltersToQuery(
      supabase
        .from('meeting_feedbacks')
        .select('*, users!inner(creator_id)', {
          count: 'exact',
          head: true,
        })
        .eq('users.creator_id', user.creatorId)
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

  async getActivityStats(input: { user: UserDto; query: AnalyticsQueryDto }) {
    const { user, query } = input;
    const supabase = this.supabaseService.getAdminClient();

    const applyFiltersToQuery = (queryBuilder: any) => {
      if (query.meetingId)
        queryBuilder = queryBuilder.eq(
          'meeting_activities.meeting_id',
          query.meetingId,
        );
      if (query.userId)
        queryBuilder = queryBuilder.eq(
          'meeting_activities.user_id',
          query.userId,
        );
      if (query.startDate)
        queryBuilder = queryBuilder.gte(
          'meeting_activities.created_at',
          query.startDate,
        );
      if (query.endDate)
        queryBuilder = queryBuilder.lte(
          'meeting_activities.created_at',
          query.endDate,
        );
      return queryBuilder;
    };

    const { count: totalActivities } = await applyFiltersToQuery(
      supabase
        .from('meeting_activities')
        .select('*, users!inner(creator_id)', {
          count: 'exact',
          head: true,
        })
        .eq('users.creator_id', user.creatorId),
    );

    const { count: activeSessions } = await applyFiltersToQuery(
      supabase
        .from('meeting_activities')
        .select('*, users!inner(creator_id)', {
          count: 'exact',
          head: true,
        })
        .eq('users.creator_id', user.creatorId)
        .is('leaving_time', null),
    );

    const { count: completedSessions } = await applyFiltersToQuery(
      supabase
        .from('meeting_activities')
        .select('*, users!inner(creator_id)', {
          count: 'exact',
          head: true,
        })
        .eq('users.creator_id', user.creatorId)
        .not('leaving_time', 'is', null),
    );

    const { data: completedActivities } = await applyFiltersToQuery(
      supabase
        .from('meeting_activities')
        .select('joining_time, leaving_time, users!inner(creator_id)')
        .eq('users.creator_id', user.creatorId)
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
      supabase
        .from('meeting_activities')
        .select('user_id, users!inner(creator_id)')
        .eq('users.creator_id', user.creatorId),
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
