import { ApiProperty } from '@nestjs/swagger';

export class MeetViewPercentageGraphOutput {
  @ApiProperty()
  bucket_start_min: number;

  @ApiProperty()
  bucket_end_min: number;

  @ApiProperty()
  view_percentage: number;
}
