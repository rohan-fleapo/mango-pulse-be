import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OpenRouter } from '@openrouter/sdk';
import { SupabaseService } from '../supabase/supabase.service';
import { UserDto } from '../users/dto';
import {
  ActivityAnalyticsOutput,
  AiInsightsOutput,
  AnalyticsQueryDto,
  GetEngagementLeaderboardOutput,
  MeetingDetailsAnalyticsOutput,
  MeetViewPercentageGraphOutput,
} from './dto';
import {
  GetMeetingsStatsOutput,
  MeetingDurationBreakdown,
  MeetingTimelineItem,
} from './dto/meeting-stats.dto';
import { MEETING_INSIGHTS_PROMPT } from './prompts/meeting-insights.prompt';

@Injectable()
export class AnalyticsService {
  constructor(private supabaseService: SupabaseService) {}

  async getMeetingsStats(input: {
    user: UserDto;
    query: AnalyticsQueryDto;
  }): Promise<GetMeetingsStatsOutput> {
    const { user, query } = input;
    const supabase = this.supabaseService.getAdminClient();

    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', user.id)
      .neq('id', user.id);

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

    const durationBreakdown = this.getMeetingsDurationBreakdown(meetings);
    const timeline = await this.getMeetingsTimeline(user, query);

    return {
      totalMembers: count,
      totalMeetings: meetings?.length ?? 0,
      avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
      durationBreakdown,
      timeline,
    };
  }

  private getMeetingsDurationBreakdown(meetings) {
    const breakdown = {
      '0-15': 0,
      '15-30': 0,
      '30-45': 0,
      '45-60': 0,
      '60+': 0,
    };

    meetings?.forEach((meeting) => {
      if (
        meeting.start_date &&
        (meeting.end_date || meeting.scheduled_end_date)
      ) {
        const startTime = new Date(meeting.start_date).getTime();
        const endTime = new Date(
          meeting.end_date || meeting.scheduled_end_date,
        ).getTime();
        const durationMinutes = (endTime - startTime) / (1000 * 60);

        if (durationMinutes <= 15) {
          breakdown['0-15']++;
        } else if (durationMinutes <= 30) {
          breakdown['15-30']++;
        } else if (durationMinutes <= 45) {
          breakdown['30-45']++;
        } else if (durationMinutes <= 60) {
          breakdown['45-60']++;
        } else {
          breakdown['60+']++;
        }
      }
    });

    return breakdown;
  }

  private async getMeetingsTimeline(
    user: UserDto,
    query: AnalyticsQueryDto,
  ): Promise<MeetingTimelineItem[]> {
    const supabase = this.supabaseService.getAdminClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate
      ? new Date(query.endDate)
      : new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const { data: meetings } = await supabase
      .from('meetings')
      .select('start_date')
      .eq('creator_id', user.id)
      .gte('start_date', startDate.toISOString())
      .lt('start_date', endDate.toISOString());

    const countsByDate = new Map<string, number>();
    meetings?.forEach((meeting) => {
      const date = meeting.start_date.split('T')[0];
      countsByDate.set(date, (countsByDate.get(date) || 0) + 1);
    });

    const timeline: MeetingTimelineItem[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      timeline.push({
        date: dateStr,
        count: countsByDate.get(dateStr) || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return timeline;
  }

  async getAiInsights(input: {
    user: UserDto;
    query: AnalyticsQueryDto;
  }): Promise<AiInsightsOutput> {
    const stats = await this.getMeetingsStats(input);
    const aiInsights = await this.generateAiInsights(stats);

    return aiInsights;
  }

  private formatDurationBreakdown(breakdown: MeetingDurationBreakdown) {
    return Object.entries(breakdown)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }

  private formatTimeline(timeline: MeetingTimelineItem[]) {
    return timeline.map((item) => `${item.date}: ${item.count}`).join(', ');
  }

  private async generateAiInsights(
    stats: GetMeetingsStatsOutput,
  ): Promise<AiInsightsOutput> {
    const openrouter = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const durationBreakdownText = this.formatDurationBreakdown(
      stats.durationBreakdown,
    );
    const timelineText = this.formatTimeline(stats.timeline);

    const prompt = MEETING_INSIGHTS_PROMPT.replace(
      '{{totalMembers}}',
      stats.totalMembers.toString(),
    )
      .replace('{{totalMeetings}}', stats.totalMeetings.toString())
      .replace('{{avgEngagementRate}}', stats.avgEngagementRate.toFixed(2))
      .replace('{{durationBreakdown}}', durationBreakdownText)
      .replace('{{timeline}}', timelineText);

    const stream = await openrouter.chat.send({
      model: 'mistralai/devstral-2512:free',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: true,
    });

    let aiResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        aiResponse += content;
      }
    }

    try {
      const parsed = JSON.parse(aiResponse.trim()) as AiInsightsOutput;
      return {
        communityInsights: parsed.communityInsights ?? [],
        recommendations: parsed.recommendations ?? [],
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {
        communityInsights: [],
        recommendations: [],
      };
    }
  }

  async getActivityAnalytics(input: {
    meetingId: string;
    user: UserDto;
  }): Promise<ActivityAnalyticsOutput> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: meeting } = await supabase
      .from('meetings')
      .select('start_date, end_date, scheduled_end_date, creator_id')
      .eq('id', input.meetingId)
      .single()
      .throwOnError();

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.creator_id !== input.user.id) {
      throw new ForbiddenException(
        'You are not authorized to view analytics for this meeting',
      );
    }

    const meetingStart = Date.parse(meeting.start_date);
    const meetingEnd = Date.parse(
      meeting.end_date ?? meeting.scheduled_end_date,
    );

    const meetingDurationMs = meetingEnd - meetingStart;
    if (meetingDurationMs <= 0) {
      return { attendanceRate: 0, averageViewedPercentage: 0 };
    }

    const [{ count: totalInvited }, { data: activities }] = await Promise.all([
      supabase
        .from('meeting_engagements')
        .select('*', { count: 'exact', head: true })
        .eq('meeting_id', input.meetingId)
        .throwOnError(),

      supabase
        .from('meeting_activities')
        .select('user_id, joining_time, leaving_time')
        .eq('meeting_id', input.meetingId)
        .throwOnError(),
    ]);

    if (!activities?.length || !totalInvited) {
      return { attendanceRate: 0, averageViewedPercentage: 0 };
    }

    const durations = new Map<string, number>();

    for (let i = 0; i < activities.length; i++) {
      const a = activities[i];

      const join = Math.max(meetingStart, Date.parse(a.joining_time));

      const leave = Math.min(
        meetingEnd,
        a.leaving_time ? Date.parse(a.leaving_time) : meetingEnd,
      );

      if (leave > join) {
        durations.set(
          a.user_id,
          (durations.get(a.user_id) ?? 0) + (leave - join),
        );
      }
    }

    const attendeeCount = durations.size;
    if (!attendeeCount) {
      return { attendanceRate: 0, averageViewedPercentage: 0 };
    }

    let viewedSum = 0;

    for (const duration of durations.values()) {
      viewedSum += Math.min(1, duration / meetingDurationMs);
    }

    return {
      attendanceRate: Number(((attendeeCount / totalInvited) * 100).toFixed(2)),
      averageViewedPercentage: Number(
        ((viewedSum / attendeeCount) * 100).toFixed(2),
      ),
    };
  }

  async getMeetingAnalyticsDetails(input: {
    meetingId: string;
    user: UserDto;
  }): Promise<MeetingDetailsAnalyticsOutput> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: meeting } = await supabase
      .from('meetings')
      .select('start_date, end_date, scheduled_end_date, creator_id')
      .eq('id', input.meetingId)
      .single()
      .throwOnError();

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // Authorization check
    // if (meeting.creator_id !== input.user.id) {
    //   throw new ForbiddenException(
    //     'You are not authorized to view analytics for this meeting',
    //   );
    // }
    //

    const meetingStart = Date.parse(meeting.start_date);
    const meetingEnd = Date.parse(
      meeting.end_date ?? meeting.scheduled_end_date,
    );
    const meetingDurationMs = meetingEnd - meetingStart;

    const [{ count: totalInvited }, { data: activities }] = await Promise.all([
      supabase
        .from('meeting_engagements')
        .select('*', { count: 'exact', head: true })
        .eq('meeting_id', input.meetingId)
        .throwOnError(),

      supabase
        .from('meeting_activities')
        .select('user_id, joining_time, leaving_time')
        .eq('meeting_id', input.meetingId)
        .throwOnError(),
    ]);

    if (!activities?.length) {
      return {
        attendanceRate: 0,
        avgDuration: 0,
        engagementScore: 0,
        attendanceOverTime: [],
        engagementDistribution: [],
        participantDurations: [],
        joinTimeDistribution: [],
      };
    }

    const userIds = [...new Set(activities.map((a) => a.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);

    const userMap = new Map(users?.map((u) => [u.id, u.name]) ?? []);

    const attendeeDurations = new Map<string, number>();
    const joinTimes = new Map<string, number>();

    activities.forEach((a) => {
      const join = Math.max(meetingStart, Date.parse(a.joining_time));
      const leave = Math.min(
        meetingEnd,
        a.leaving_time ? Date.parse(a.leaving_time) : meetingEnd,
      );

      if (leave > join) {
        attendeeDurations.set(
          a.user_id,
          (attendeeDurations.get(a.user_id) ?? 0) + (leave - join),
        );
      }

      const actualJoinTime = Date.parse(a.joining_time);
      if (
        !joinTimes.has(a.user_id) ||
        actualJoinTime < joinTimes.get(a.user_id)
      ) {
        joinTimes.set(a.user_id, actualJoinTime);
      }
    });

    const attendeeCount = attendeeDurations.size;
    const totalDuration = Array.from(attendeeDurations.values()).reduce(
      (a, b) => a + b,
      0,
    );
    const avgDurationMs = attendeeCount > 0 ? totalDuration / attendeeCount : 0;
    const avgDurationMinutes = avgDurationMs / 60000;

    // Engagement Distribution
    let high = 0,
      medium = 0,
      low = 0;
    attendeeDurations.forEach((d) => {
      if (d >= avgDurationMs * 0.9) high++;
      else if (d >= avgDurationMs * 0.6) medium++;
      else low++;
    });

    // Attendance Over Time
    const attendanceOverTime = [];
    const interval = 5 * 60 * 1000; // 5 minutes
    for (let t = meetingStart; t <= meetingEnd; t += interval) {
      const timeOffset = Math.round((t - meetingStart) / 60000);
      let count = 0;
      activities.forEach((a) => {
        const join = Date.parse(a.joining_time);
        const leave = a.leaving_time ? Date.parse(a.leaving_time) : meetingEnd;
        if (join <= t && leave >= t) count++;
      });
      attendanceOverTime.push({ time: `${timeOffset}m`, count });
    }

    // Participant Durations
    const participantDurations = Array.from(attendeeDurations.entries())
      .map(([id, duration]) => ({
        name: userMap.get(id) ?? id,
        duration: Math.round(duration / 60000),
      }))
      .sort((a, b) => b.duration - a.duration);

    // Join Time Distribution
    const bucketSize = 5 * 60 * 1000;
    const joinTimeBuckets = new Map<number, number>();
    joinTimes.forEach((time) => {
      const diff = Math.max(0, time - meetingStart);
      const bucket = Math.floor(diff / bucketSize) * 5;
      joinTimeBuckets.set(bucket, (joinTimeBuckets.get(bucket) || 0) + 1);
    });
    const joinTimeDistribution = Array.from(joinTimeBuckets.entries())
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time - b.time);

    return {
      attendanceRate: totalInvited
        ? Number(((attendeeCount / totalInvited) * 100).toFixed(2))
        : 0,
      avgDuration: Math.round(avgDurationMinutes),
      engagementScore: meetingDurationMs
        ? Math.round((avgDurationMs / meetingDurationMs) * 100)
        : 0,
      attendanceOverTime,
      engagementDistribution: [
        { name: 'High Engagement', value: high, color: '#22c55e' },
        { name: 'Medium Engagement', value: medium, color: '#f59e0b' },
        { name: 'Low Engagement', value: low, color: '#ef4444' },
      ],
      participantDurations: participantDurations.slice(0, 10), // Top 10
      joinTimeDistribution,
    };
  }

  async getMeetViewPercentageGraph(input: {
    meetingId: string;
    user: UserDto;
  }): Promise<MeetViewPercentageGraphOutput[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: meeting } = await supabase
      .from('meetings')
      .select('creator_id')
      .eq('id', input.meetingId)
      .single();

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.creator_id !== input.user.id) {
      throw new ForbiddenException(
        'You are not authorized to view analytics for this meeting',
      );
    }

    const { data, error } = await supabase.rpc('get_meet_view_percentage', {
      p_meeting_id: input.meetingId,
    });

    if (error) {
      throw new Error(`Failed to fetch view percentage: ${error.message}`);
    }

    return data as MeetViewPercentageGraphOutput[];
  }

  async getEngagementLeaderboard(input: {
    user: UserDto;
    query: AnalyticsQueryDto;
  }): Promise<GetEngagementLeaderboardOutput[]> {
    const supabase = this.supabaseService.getAdminClient();

    // Get all meetings created by the user with date filters
    let meetingsQuery = supabase
      .from('meetings')
      .select('id, start_date, end_date, scheduled_end_date')
      .eq('creator_id', input.user.id);

    if (input.query.startDate) {
      meetingsQuery = meetingsQuery.gte('start_date', input.query.startDate);
    }

    if (input.query.endDate) {
      meetingsQuery = meetingsQuery.lte('start_date', input.query.endDate);
    }

    const { data: meetings } = await meetingsQuery;

    if (!meetings?.length) {
      return [];
    }

    const totalMeetings = meetings.length;
    const meetingIds = meetings.map((m) => m.id);

    // Get all activities for these meetings
    const { data: activities } = await supabase
      .from('meeting_activities')
      .select('user_id, meeting_id, joining_time, leaving_time')
      .in('meeting_id', meetingIds);

    if (!activities?.length) {
      return [];
    }

    // Build meeting info map
    const meetingMap = new Map();
    meetings.forEach((meeting) => {
      const start = Date.parse(meeting.start_date);
      const end = Date.parse(meeting.end_date ?? meeting.scheduled_end_date);
      meetingMap.set(meeting.id, {
        start,
        end,
        duration: end - start,
      });
    });

    // Calculate metrics per user
    const userMetrics = new Map();

    activities.forEach((activity) => {
      const meetingInfo = meetingMap.get(activity.meeting_id);
      if (!meetingInfo) return;

      const join = Math.max(
        meetingInfo.start,
        Date.parse(activity.joining_time),
      );

      const leave = Math.min(
        meetingInfo.end,
        activity.leaving_time
          ? Date.parse(activity.leaving_time)
          : meetingInfo.end,
      );

      if (leave > join) {
        const duration = leave - join;

        if (!userMetrics.has(activity.user_id)) {
          userMetrics.set(activity.user_id, {
            totalDuration: 0,
            meetingsAttended: new Set(),
            totalMeetingDuration: 0,
          });
        }

        const metrics = userMetrics.get(activity.user_id);

        metrics.totalDuration += duration;

        if (!metrics.meetingsAttended.has(activity.meeting_id)) {
          metrics.totalMeetingDuration += meetingInfo.duration;
          metrics.meetingsAttended.add(activity.meeting_id);
        }
      }
    });

    // Get user names
    const userIds = Array.from(userMetrics.keys());
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);

    const userMap = new Map();
    users?.forEach((u) => userMap.set(u.id, u.name));

    // Calculate engagement scores
    const engagingUsers = [];

    userMetrics.forEach((metrics, userId) => {
      const avgDurationPerMeeting =
        metrics.totalDuration / metrics.meetingsAttended.size;
      const avgMeetingDuration =
        metrics.totalMeetingDuration / metrics.meetingsAttended.size;

      const durationScore =
        avgMeetingDuration > 0 ? avgDurationPerMeeting / avgMeetingDuration : 0;
      const attendanceScore = metrics.meetingsAttended.size / totalMeetings;
      const engagementScore = durationScore * 0.5 + attendanceScore * 0.5;

      engagingUsers.push({
        userId,
        userName: userMap.get(userId) ?? userId,
        engagementScore: Number((engagementScore * 100).toFixed(2)),
        totalMeetingsAttended: metrics.meetingsAttended.size,
      });
    });

    return engagingUsers
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 5);
  }

  async getEngagementTrend(input: {
    user: UserDto;
    query: AnalyticsQueryDto;
  }) {
    const supabase = this.supabaseService.getAdminClient();

    // Fetch meetings in range
    let meetingsQuery = supabase
      .from('meetings')
      .select('id, start_date, end_date, scheduled_end_date')
      .eq('creator_id', input.user.id);

    if (input.query.startDate) {
      meetingsQuery = meetingsQuery.gte('start_date', input.query.startDate);
    }
    if (input.query.endDate) {
      meetingsQuery = meetingsQuery.lte('start_date', input.query.endDate);
    }

    const { data: meetings } = await meetingsQuery;
    if (!meetings?.length) return [];

    const meetingIds = meetings.map((m) => m.id);

    // Get invite counts per meeting
    const { data: invites } = await supabase
      .from('meeting_engagements')
      .select('meeting_id, id')
      .in('meeting_id', meetingIds);

    // Get activities to compute viewed percentage per meeting
    const { data: activities } = await supabase
      .from('meeting_activities')
      .select('meeting_id, user_id, joining_time, leaving_time')
      .in('meeting_id', meetingIds);

    const invitesByMeeting = new Map<string, number>();
    invites?.forEach((i) => {
      invitesByMeeting.set(
        i.meeting_id,
        (invitesByMeeting.get(i.meeting_id) || 0) + 1,
      );
    });

    const activitiesByMeeting = new Map<string, any[]>();
    activities?.forEach((a) => {
      const arr = activitiesByMeeting.get(a.meeting_id) || [];
      arr.push(a);
      activitiesByMeeting.set(a.meeting_id, arr);
    });

    const points = meetings
      .map((m) => {
        const start = Date.parse(m.start_date);
        const end = Date.parse(m.end_date ?? m.scheduled_end_date);
        const duration = Math.max(0, end - start);
        const date = m.start_date.split('T')[0];

        const acts = activitiesByMeeting.get(m.id) || [];
        const inviteCount = invitesByMeeting.get(m.id) || 0;

        // Compute attendance and viewed percentage
        const durations = new Map<string, number>();
        acts.forEach((a) => {
          const join = Math.max(start, Date.parse(a.joining_time));
          const leave = Math.min(
            end,
            a.leaving_time ? Date.parse(a.leaving_time) : end,
          );
          if (leave > join) {
            durations.set(a.user_id, (durations.get(a.user_id) || 0) + (leave - join));
          }
        });

        const attendees = durations.size;
        const attendanceRate = inviteCount
          ? Number(((attendees / inviteCount) * 100).toFixed(2))
          : 0;

        let viewedSum = 0;
        durations.forEach((ms) => {
          viewedSum += duration > 0 ? Math.min(1, ms / duration) : 0;
        });
        const averageViewedPercentage = attendees
          ? Number(((viewedSum / attendees) * 100).toFixed(2))
          : 0;

        return {
          meetingId: m.id,
          date,
          attendanceRate,
          averageViewedPercentage,
          attendees,
          invited: inviteCount,
        };
      })
      // sort by date ascending
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    return points;
  }
}
