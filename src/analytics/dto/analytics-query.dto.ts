import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for filtering (ISO 8601 format)',
    example: '2026-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering (ISO 8601 format)',
    example: '2026-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
