import { ApiProperty } from '@nestjs/swagger';

export class GetEngagementLeaderboardOutput {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  userName: string;

  @ApiProperty()
  engagementScore: number;

  @ApiProperty()
  totalMeetingsAttended: number;
}
