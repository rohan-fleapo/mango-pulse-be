import { ApiProperty } from '@nestjs/swagger';

export class GetMeetingDetailOutput {
  @ApiProperty({
    description: 'Meeting ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Meeting title/topic',
    example: 'Weekly Team Standup',
  })
  title: string;

  @ApiProperty({
    description: 'Meeting start date',
    example: '2026-01-15T10:00:00Z',
  })
  date: string;

  @ApiProperty({
    description: 'Meeting duration in minutes',
    example: 60,
  })
  duration: number;

  @ApiProperty({
    description: 'Number of attendees',
    example: 10,
  })
  attendees: number;

  @ApiProperty({
    description: 'Attendance list (simplified)',
    example: [],
    isArray: true,
  })
  attendance: any[];
}
