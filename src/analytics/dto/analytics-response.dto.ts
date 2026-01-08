import { ApiProperty } from '@nestjs/swagger';

export class AnalyticsResponseDto {
  @ApiProperty({
    description: 'Total number of users',
    example: 150,
  })
  totalUsers: number;

  @ApiProperty({
    description: 'Total number of creators',
    example: 25,
  })
  totalCreators: number;

  @ApiProperty({
    description: 'Number of new users this month',
    example: 12,
  })
  newUsersThisMonth: number;

  @ApiProperty({
    description: 'Number of new users today',
    example: 3,
  })
  newUsersToday: number;
}
