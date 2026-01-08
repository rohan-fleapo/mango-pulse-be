import { ApiProperty } from '@nestjs/swagger';

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
}
