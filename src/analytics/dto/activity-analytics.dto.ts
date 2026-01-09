import { ApiProperty } from '@nestjs/swagger';

export class ActivityAnalyticsOutput {
  @ApiProperty()
  attendanceRate!: number;

  @ApiProperty()
  averageViewedPercentage!: number;
}
