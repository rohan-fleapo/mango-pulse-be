import { ApiProperty } from '@nestjs/swagger';

export class GetMeetingsStatsOutput {
  @ApiProperty({
    description: 'Total number of meetings in the selected period',
  })
  totalMeetings: number;
}
