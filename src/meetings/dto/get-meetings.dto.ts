import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetMeetingsInput {
  @ApiPropertyOptional({
    description: 'Filter meetings by creator ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  creatorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific meeting ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  meetingId?: string;
}

export class MeetingItemDto {
  @ApiProperty({
    description: 'Meeting ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Meeting topic/title',
    example: 'Weekly Team Standup',
  })
  topic: string;

  @ApiProperty({
    description: 'Meeting join link',
    example: 'https://zoom.us/j/1234567890',
  })
  link: string;

  @ApiProperty({
    description: 'Meeting start time',
    example: '2026-01-15T10:00:00Z',
  })
  startTime: string;

  @ApiProperty({
    description: 'Scheduled end date/time',
    example: '2026-01-15T11:00:00Z',
  })
  scheduledEndDate: string;

  @ApiPropertyOptional({
    description: 'Recording link (if available)',
    example: 'https://zoom.us/rec/share/abc123',
  })
  recordingLink?: string;

  @ApiPropertyOptional({
    description: 'Recording password (if available)',
    example: 'abc123',
  })
  recordingPassword?: string;

  @ApiProperty({
    description: 'Number of attendees in the meeting',
    example: 10,
  })
  attendeesCount: number;

  @ApiProperty({
    description: 'Duration of the meeting in minutes',
    example: 60,
  })
  duration: number;
}

export class GetMeetingsOutput {
  @ApiProperty({
    description: 'Array of meetings',
    type: [MeetingItemDto],
  })
  meetings: MeetingItemDto[];
}
