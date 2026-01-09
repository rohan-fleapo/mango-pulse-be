import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

class ZoomRecordingFile {
  @ApiProperty({ example: 'ed6c2f27-2ae7-42f4-b3d0-835b493e4fa8' })
  id: string;

  @ApiProperty({ example: '098765ABCD' })
  meeting_id: string;

  @ApiProperty({ example: '2021-03-23T22:14:57Z' })
  recording_start: string;

  @ApiProperty({ example: '2021-03-23T23:15:41Z' })
  recording_end: string;

  @ApiPropertyOptional({ example: 'audio_only' })
  recording_type?: string;

  @ApiProperty({ example: 'MP4' })
  file_type: string;

  @ApiProperty({ example: 246560 })
  file_size: number;

  @ApiProperty({ example: 'MP4' })
  file_extension: string;

  @ApiProperty({ example: 'https://example.com/recording/play/...' })
  play_url: string;

  @ApiProperty({ example: 'https://example.com/recording/download/...' })
  download_url: string;

  @ApiProperty({ example: 'completed' })
  status: string;
}

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
  // Allow string or number for ID as Zoom can send either
  @ApiProperty({ example: '123456789' })
  id: number;

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

  // Recording specific fields
  @ApiPropertyOptional({ example: 'https://example.com' })
  share_url?: string;

  @ApiPropertyOptional({ example: 3328371 })
  total_size?: number;

  @ApiPropertyOptional({ example: 2 })
  recording_count?: number;

  @ApiPropertyOptional({ type: [ZoomRecordingFile] })
  recording_files?: ZoomRecordingFile[];

  @ApiPropertyOptional({ example: '132456' })
  password?: string;
}

class ZoomPayload {
  @ApiProperty({ example: 'account123' })
  account_id: string;

  @ApiPropertyOptional({ example: 'admin@example.com' })
  operator?: string;

  @ApiPropertyOptional({ example: 'operator123' })
  operator_id?: string;

  @ApiPropertyOptional({ example: 'single' })
  operation?: string;

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
      'recording.completed',
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
  // Can be string or number
  event_ts?: string | number;

  @ApiPropertyOptional({
    description: 'Download token for recordings',
    example: 'abJhbGciOiJIUzUxMiJ9...',
  })
  @IsOptional()
  @IsString()
  download_token?: string;
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
  meetingId: string | number;

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
  meetingId: string | number;

  @ApiProperty({ example: '2026-01-08T10:00:00Z' })
  joinTime: string;

  @ApiPropertyOptional({ example: '2026-01-08T11:00:00Z' })
  leaveTime?: string;
}
