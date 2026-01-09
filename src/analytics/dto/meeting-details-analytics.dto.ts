import { ApiProperty } from '@nestjs/swagger';

export class MeetingTimeline {
  @ApiProperty()
  time: string;

  @ApiProperty()
  count: number;
}

export class EngagementDistribution {
  @ApiProperty()
  name: string;

  @ApiProperty()
  value: number;

  @ApiProperty()
  color: string;
}

export class ParticipantDuration {
  @ApiProperty()
  name: string;

  @ApiProperty()
  duration: number;
}

export class JoinTimeDistribution {
  @ApiProperty()
  time: number;

  @ApiProperty()
  count: number;
}

export class MeetingDetailsAnalyticsOutput {
  @ApiProperty()
  attendanceRate: number;

  @ApiProperty()
  avgDuration: number;

  @ApiProperty()
  engagementScore: number;

  @ApiProperty({ type: [MeetingTimeline] })
  attendanceOverTime: MeetingTimeline[];

  @ApiProperty({ type: [EngagementDistribution] })
  engagementDistribution: EngagementDistribution[];

  @ApiProperty({ type: [ParticipantDuration] })
  participantDurations: ParticipantDuration[];

  @ApiProperty({ type: [JoinTimeDistribution] })
  joinTimeDistribution: JoinTimeDistribution[];
}
