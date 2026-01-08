import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { TablesUpdate } from 'src/types/supabase';

export type UpdateMeetingDbData = TablesUpdate<'meetings'> & { topic?: string };

export class UpdateMeetingInput {
  @ApiProperty({
    description: 'Meeting ID (Database UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  meetingId: string;

  @ApiPropertyOptional({
    description: 'Updated meeting topic/title',
    example: 'Updated Team Standup',
  })
  @IsString()
  @IsOptional()
  topic?: string;

  @ApiPropertyOptional({
    description: 'Updated meeting start time in ISO 8601 format',
    example: '2026-01-15T11:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Updated meeting duration in minutes',
    example: 90,
  })
  @IsNumber()
  @IsOptional()
  duration?: number;
}

export class UpdateMeetingOutput {
  @ApiProperty({
    description: 'Whether the update was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Meeting ID that was updated',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  meetingId: string;
}
