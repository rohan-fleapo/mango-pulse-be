import { ApiProperty } from '@nestjs/swagger';

export class EngagementTrendPoint {
  @ApiProperty({ description: 'Meeting ID' })
  meetingId: string;

  @ApiProperty({ description: 'Date of the meeting (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ description: 'Attendance rate (%)' })
  attendanceRate: number;

  @ApiProperty({ description: 'Average viewed percentage (%) across attendees' })
  averageViewedPercentage: number;

  @ApiProperty({ description: 'Number of attendees detected from activity' })
  attendees: number;

  @ApiProperty({ description: 'Number of invited users' })
  invited: number;
}

