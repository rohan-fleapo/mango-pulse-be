import { ApiProperty } from '@nestjs/swagger';

export class MeetingDurationBreakdown {
  @ApiProperty({
    description: 'Number of meetings 0-15 minutes',
    example: 5,
  })
  '0-15': number;

  @ApiProperty({
    description: 'Number of meetings 15-30 minutes',
    example: 10,
  })
  '15-30': number;

  @ApiProperty({
    description: 'Number of meetings 30-45 minutes',
    example: 8,
  })
  '30-45': number;

  @ApiProperty({
    description: 'Number of meetings 45-60 minutes',
    example: 3,
  })
  '45-60': number;

  @ApiProperty({
    description: 'Number of meetings 60+ minutes',
    example: 2,
  })
  '60+': number;
}

export class MeetingTimelineItem {
  @ApiProperty({
    description: 'Date of the meeting',
    example: 'Jan 11',
  })
  date: string;

  @ApiProperty({
    description: 'Number of meetings on that date',
    example: 2,
  })
  count: number;
}

export class GetMeetingsStatsOutput {
  @ApiProperty({
    description: 'Total number of members under the creator',
  })
  totalMembers: number;

  @ApiProperty({
    description: 'Total number of meetings in the selected period',
  })
  totalMeetings: number;

  @ApiProperty({
    description: 'Average engagement rate (%) across meetings in the period',
  })
  avgEngagementRate: number;

  @ApiProperty({
    description: 'Meeting duration breakdown by time ranges',
    type: MeetingDurationBreakdown,
  })
  durationBreakdown: MeetingDurationBreakdown;

  @ApiProperty({
    description: 'Timeline of meetings over the past 15 days',
    type: [MeetingTimelineItem],
  })
  timeline: MeetingTimelineItem[];
}
