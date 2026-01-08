import { ApiProperty } from '@nestjs/swagger';

export class EngagementStatsDto {
  @ApiProperty({
    description: 'Total number of engagements',
    example: 250,
  })
  totalEngagements: number;

  @ApiProperty({
    description: 'Number of users interested (yes)',
    example: 120,
  })
  interestedCount: number;

  @ApiProperty({
    description: 'Number of users not interested (no)',
    example: 80,
  })
  notInterestedCount: number;

  @ApiProperty({
    description: 'Number of users with maybe response',
    example: 30,
  })
  maybeCount: number;

  @ApiProperty({
    description: 'Number of users with no response',
    example: 20,
  })
  noResponseCount: number;

  @ApiProperty({
    description: 'Number of users who attended',
    example: 100,
  })
  attendedCount: number;

  @ApiProperty({
    description: 'Attendance rate percentage',
    example: 40.0,
  })
  attendanceRate: number;

  @ApiProperty({
    description: 'Average rating (1-5)',
    example: 4.2,
    nullable: true,
  })
  averageRating: number | null;
}

export class FeedbackStatsDto {
  @ApiProperty({
    description: 'Total number of feedbacks',
    example: 150,
  })
  totalFeedbacks: number;

  @ApiProperty({
    description: 'Average rating (1-5)',
    example: 4.3,
    nullable: true,
  })
  averageRating: number | null;

  @ApiProperty({
    description: 'Number interested in next meeting',
    example: 90,
  })
  nextMeetingInterestedCount: number;

  @ApiProperty({
    description: 'Number not interested in next meeting',
    example: 40,
  })
  nextMeetingNotInterestedCount: number;

  @ApiProperty({
    description: 'Number with maybe response for next meeting',
    example: 15,
  })
  nextMeetingMaybeCount: number;

  @ApiProperty({
    description: 'Number with no response for next meeting',
    example: 5,
  })
  nextMeetingNoResponseCount: number;
}

export class ActivityStatsDto {
  @ApiProperty({
    description: 'Total number of activities',
    example: 300,
  })
  totalActivities: number;

  @ApiProperty({
    description: 'Number of active sessions (not ended)',
    example: 15,
  })
  activeSessions: number;

  @ApiProperty({
    description: 'Number of completed sessions',
    example: 285,
  })
  completedSessions: number;

  @ApiProperty({
    description: 'Average session duration in minutes',
    example: 45.5,
    nullable: true,
  })
  averageSessionDuration: number | null;

  @ApiProperty({
    description: 'Number of unique users with activities',
    example: 85,
  })
  uniqueUsersCount: number;
}
