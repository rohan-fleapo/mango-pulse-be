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
} from './dto';
import {
  GetMeetingsStatsOutput,
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

    const durationBreakdown = {
      '0-15': 0,
      '15-30': 0,
      '30-45': 0,
      '45-60': 0,
      '60+': 0,
    };

    if (meetings) {
      meetings.forEach((meeting) => {
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
            durationBreakdown['0-15']++;
          } else if (durationMinutes <= 30) {
            durationBreakdown['15-30']++;
          } else if (durationMinutes <= 45) {
            durationBreakdown['30-45']++;
          } else if (durationMinutes <= 60) {
            durationBreakdown['45-60']++;
          } else {
            durationBreakdown['60+']++;
          }
        }
      });
    }

    const timeline = await this.getMeetingsTimeline(user);

    return {
      totalMembers: members?.length ?? 0,
      totalMeetings: meetings?.length ?? 0,
      avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
      durationBreakdown,
      timeline,
    };
  }

  private async getMeetingsTimeline(
    user: UserDto,
  ): Promise<MeetingTimelineItem[]> {
    const supabase = this.supabaseService.getAdminClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 14);
    const endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);

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
    for (let i = 14; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      timeline.push({
        date: dateStr,
        attendees: countsByDate.get(dateStr) || 0,
      });
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

  private async generateAiInsights(stats: {
    totalMembers: number;
    totalMeetings: number;
    avgEngagementRate: number;
  }): Promise<AiInsightsOutput> {
    const openrouter = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const prompt = MEETING_INSIGHTS_PROMPT.replace(
      '{{totalMembers}}',
      stats.totalMembers.toString(),
    )
      .replace('{{totalMeetings}}', stats.totalMeetings.toString())
      .replace('{{avgEngagementRate}}', stats.avgEngagementRate.toFixed(2));

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
}
