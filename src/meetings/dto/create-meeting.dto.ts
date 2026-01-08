import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMeetingInput {
  @ApiProperty({
    description: 'Meeting topic/title',
    example: 'Weekly Team Standup',
  })
  @IsString()
  topic: string;

  @ApiProperty({
    description: 'Meeting start time in ISO 8601 format',
    example: '2026-01-15T10:00:00Z',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'Meeting duration in minutes',
    example: 60,
  })
  @IsNumber()
  duration: number;

  @ApiProperty({
    description: 'Array of invitee email addresses',
    example: ['user1@example.com', 'user2@example.com'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  invitees: string[];

  @ApiPropertyOptional({
    description: 'Creator user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  creatorId?: string;
}

export class CreateMeetingOutput {
  @ApiProperty({
    description: 'Database meeting ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Zoom meeting ID',
    example: '1234567890',
  })
  meetingId: string;

  @ApiProperty({
    description: 'Meeting topic',
    example: 'Weekly Team Standup',
  })
  topic: string;

  @ApiProperty({
    description: 'Zoom meeting join URL',
    example: 'https://zoom.us/j/1234567890',
  })
  joinUrl: string;

  @ApiPropertyOptional({
    description: 'Recording password (if available)',
    example: 'abc123',
  })
  recordingPassword?: string;

  @ApiProperty({
    description: 'Meeting start date/time',
    example: '2026-01-15T10:00:00Z',
  })
  startDate: string;

  @ApiProperty({
    description: 'Meeting duration in minutes',
    example: 60,
  })
  duration: number;
}
