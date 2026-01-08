import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

class ZoomParticipantPayload {
  @ApiProperty({ example: 'participant123' })
  id: string;

  @ApiProperty({ example: 'user123' })
  user_id: string;

  @ApiProperty({ example: 'John Doe' })
  user_name: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: '2026-01-08T10:00:00Z' })
  join_time: string;

  @ApiPropertyOptional({ example: '2026-01-08T11:00:00Z' })
  leave_time?: string;
}

class ZoomMeetingObject {
  @ApiProperty({ example: '123456789' })
  id: string;

  @ApiProperty({ example: 'abc-def-ghi' })
  uuid: string;

  @ApiProperty({ example: 'host123' })
  host_id: string;

  @ApiProperty({ example: 'Weekly Team Standup' })
  topic: string;

  @ApiProperty({ example: 2 })
  type: number;

  @ApiProperty({ example: '2026-01-08T10:00:00Z' })
  start_time: string;

  @ApiPropertyOptional({ example: '2026-01-08T11:00:00Z' })
  end_time?: string;

  @ApiProperty({ example: 60 })
  duration: number;

  @ApiProperty({ example: 'America/New_York' })
  timezone: string;

  @ApiPropertyOptional({ type: ZoomParticipantPayload })
  participant?: ZoomParticipantPayload;
}

class ZoomPayload {
  @ApiProperty({ example: 'account123' })
  account_id: string;

  @ApiProperty({ type: ZoomMeetingObject })
  object: ZoomMeetingObject;
}

export class ZoomWebhookDto {
  @ApiProperty({
    description: 'Zoom webhook event type',
    example: 'meeting.ended',
    enum: [
      'meeting.started',
      'meeting.ended',
      'meeting.participant_joined',
      'meeting.participant_left',
    ],
  })
  @IsString()
  event: string;

  @ApiProperty({
    description: 'Webhook payload containing meeting/participant data',
    type: ZoomPayload,
  })
  @IsObject()
  payload: ZoomPayload;

  @ApiPropertyOptional({
    description: 'Event timestamp',
    example: '1704700800000',
  })
  @IsOptional()
  @IsString()
  event_ts?: string;
}

export class ZoomValidationDto {
  @ApiPropertyOptional({
    description: 'Validation payload from Zoom',
  })
  payload?: {
    plainToken?: string;
  };
}

export class ZoomMeetingEndedDto {
  @ApiProperty({ example: '123456789' })
  meetingId: string;

  @ApiProperty({ example: 'abc-def-ghi' })
  meetingUuid: string;

  @ApiProperty({ example: 'host123' })
  hostId: string;

  @ApiProperty({ example: 'Weekly Team Standup' })
  topic: string;

  @ApiProperty({ example: '2026-01-08T10:00:00Z' })
  startTime: string;

  @ApiProperty({ example: '2026-01-08T11:00:00Z' })
  endTime: string;

  @ApiProperty({ example: 60 })
  duration: number;

  @ApiPropertyOptional({
    description: 'List of meeting participants',
    isArray: true,
  })
  participants?: Array<{
    id: string;
    email: string;
    userName: string;
    joinTime: string;
    leaveTime: string;
  }>;
}

export class ZoomParticipantDto {
  @ApiProperty({ example: 'participant123' })
  id: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  userName: string;

  @ApiProperty({ example: '123456789' })
  meetingId: string;

  @ApiProperty({ example: '2026-01-08T10:00:00Z' })
  joinTime: string;

  @ApiPropertyOptional({ example: '2026-01-08T11:00:00Z' })
  leaveTime?: string;
}
