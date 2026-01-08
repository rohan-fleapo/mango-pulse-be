import { ApiProperty } from '@nestjs/swagger';

export class AiInsightsOutput {
  @ApiProperty({
    description: 'Community insights based on meeting data',
  })
  communityInsights: string[];

  @ApiProperty({
    description: 'AI-generated recommendations',
  })
  recommendations: string[];
}
