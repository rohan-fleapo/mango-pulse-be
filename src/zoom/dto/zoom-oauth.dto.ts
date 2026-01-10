import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ZoomMeetingInviteeDto {
  @ApiProperty({ example: 'vikash@fleapo.com' })
  @IsEmail()
  email: string;
}

export class ZoomPastMeetingParticipantDto {
  @ApiProperty({ example: '87mXQJ9vTjCQOtmOPe4WkQ' })
  @IsString()
  id: string;

  @ApiProperty({ example: '16778240' })
  @IsString()
  user_id: string;

  @ApiProperty({ example: 'Avilash Ghosh' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'avilash@fleapo.com' })
  @IsOptional()
  @IsString()
  user_email?: string;

  @ApiProperty({ example: '2026-01-08T11:34:58Z' })
  @IsString()
  join_time: string;

  @ApiProperty({ example: '2026-01-08T12:04:43Z' })
  @IsString()
  leave_time: string;

  @ApiProperty({ example: 1785, description: 'Duration in seconds' })
  @IsNumber()
  duration: number;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  registrant_id?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  failover: boolean;

  @ApiProperty({
    example: 'in_meeting',
    description: 'Status: in_meeting, in_waiting_room, etc.',
  })
  @IsString()
  status: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  internal_user: boolean;
}

export class ZoomPastMeetingParticipantsResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  page_count: number;

  @ApiProperty({ example: 30 })
  @IsNumber()
  page_size: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  total_records: number;

  @ApiProperty({ example: '' })
  @IsString()
  next_page_token: string;

  @ApiProperty({
    type: [ZoomPastMeetingParticipantDto],
    description: 'List of meeting participants',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ZoomPastMeetingParticipantDto)
  participants: ZoomPastMeetingParticipantDto[];
}

export class ZoomRecordingFileDto {
  @ApiProperty({ example: '64be5420-09e8-4ad6-b1ba-5306f5d24380' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'boi0qSHPQgiyADrAX/lz5Q==' })
  @IsString()
  meeting_id: string;

  @ApiProperty({ example: '2026-01-08T15:33:31Z' })
  @IsString()
  recording_start: string;

  @ApiProperty({ example: '2026-01-08T15:38:11Z' })
  @IsString()
  recording_end: string;

  @ApiProperty({ example: 'MP4' })
  @IsString()
  file_type: string;

  @ApiProperty({ example: 'MP4' })
  @IsString()
  file_extension: string;

  @ApiProperty({ example: 830333 })
  @IsNumber()
  file_size: number;

  @ApiPropertyOptional({
    example:
      'https://us06web.zoom.us/rec/play/uJ458zZo-kaDgG2qeuLkMEgO06o5vLLY-aN_JJvmBxuiWB-9sPg4Oqo-bZhk-LXJGRsachmBDvHUua8.U3P0dxr4SzYFglBV',
  })
  @IsOptional()
  @IsString()
  play_url?: string;

  @ApiProperty({
    example:
      'https://us06web.zoom.us/rec/download/uJ458zZo-kaDgG2qeuLkMEgO06o5vLLY-aN_JJvmBxuiWB-9sPg4Oqo-bZhk-LXJGRsachmBDvHUua8.U3P0dxr4SzYFglBV',
  })
  @IsString()
  download_url: string;

  @ApiProperty({ example: 'completed' })
  @IsString()
  status: string;

  @ApiProperty({
    example: 'shared_screen_with_speaker_view',
    description:
      'Recording type: shared_screen_with_speaker_view, audio_only, timeline, etc.',
  })
  @IsString()
  recording_type: string;
}

export class ZoomMeetingRecordingsResponseDto {
  @ApiProperty({ example: 'boi0qSHPQgiyADrAX/lz5Q==' })
  @IsString()
  uuid: string;

  @ApiProperty({ example: 88086032604 })
  @IsNumber()
  id: number;

  @ApiProperty({ example: '27r8j9ECQ1OzHNbY5CPstQ' })
  @IsString()
  account_id: string;

  @ApiProperty({ example: '87mXQJ9vTjCQOtmOPe4WkQ' })
  @IsString()
  host_id: string;

  @ApiProperty({ example: 'Test meeting 78' })
  @IsString()
  topic: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  type: number;

  @ApiProperty({ example: '2026-01-08T15:33:28Z' })
  @IsString()
  start_time: string;

  @ApiProperty({ example: 'UTC' })
  @IsString()
  timezone: string;

  @ApiProperty({ example: 'avilash@fleapo.com' })
  @IsEmail()
  host_email: string;

  @ApiProperty({ example: 4 })
  @IsNumber()
  duration: number;

  @ApiProperty({ example: 990441 })
  @IsNumber()
  total_size: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  recording_count: number;

  @ApiProperty({
    example:
      'https://us06web.zoom.us/rec/share/v40G_7kvL7qRNAjcTNz2NsN0pXeQhvHTqJVSzXL6LtPg3mZ7cbdgTmlOo8qGL8D5.T3Bs_JQWtssBAImf',
  })
  @IsString()
  share_url: string;

  @ApiProperty({
    type: [ZoomRecordingFileDto],
    description: 'List of recording files',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ZoomRecordingFileDto)
  recording_files: ZoomRecordingFileDto[];

  @ApiProperty({ example: 'NH*5+dxB' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'DJzj9MuEOr54kSIkrQAAIAAAABj8FednY8znba0' })
  @IsString()
  recording_play_passcode: string;
}

class ZoomMeetingSettingsDto {
  @ApiPropertyOptional({
    description: 'List of meeting invitees',
    type: [ZoomMeetingInviteeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ZoomMeetingInviteeDto)
  meeting_invitees?: ZoomMeetingInviteeDto[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  host_video?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  participant_video?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  mute_upon_entry?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  join_before_host?: boolean;

  @ApiPropertyOptional({ example: 'cloud' })
  @IsOptional()
  @IsString()
  auto_recording?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  approval_type?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  registration_type?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  meeting_authentication?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  waiting_room?: boolean;
}

export class CreateZoomMeetingDto {
  @ApiProperty({ example: 'Test meeting 2' })
  @IsString()
  topic: string;

  @ApiProperty({
    example: 2,
    description: 'Meeting type: 1=Instant, 2=Scheduled, 3=Recurring, 8=PMI',
  })
  @IsNumber()
  type: number;

  @ApiProperty({ example: '2026-01-09T10:00:00Z' })
  @IsString()
  start_time: string;

  @ApiProperty({ example: 60, description: 'Duration in minutes' })
  @IsNumber()
  duration: number;

  @ApiProperty({ example: 'UTC' })
  @IsString()
  timezone: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiPropertyOptional({ type: ZoomMeetingSettingsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ZoomMeetingSettingsDto)
  settings?: ZoomMeetingSettingsDto;
}

export class UpdateZoomMeetingDto {
  @ApiPropertyOptional({ example: 'Updated meeting topic' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Meeting type: 1=Instant, 2=Scheduled, 3=Recurring, 8=PMI',
  })
  @IsOptional()
  @IsNumber()
  type?: number;

  @ApiPropertyOptional({ example: '2026-01-09T10:00:00Z' })
  @IsOptional()
  @IsString()
  start_time?: string;

  @ApiPropertyOptional({ example: 60, description: 'Duration in minutes' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ example: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ type: ZoomMeetingSettingsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ZoomMeetingSettingsDto)
  settings?: ZoomMeetingSettingsDto;
}

export class ZoomOAuthTokenResponseDto {
  @ApiProperty({
    example:
      'eyJzdiI6IjAwMDAwMiIsImFsZyI6IkhTNTEyIiwidiI6IjIuMCIsImtpZCI6IjA3OGViMGFkLWNhMjctNDIyMS04NmVhLTQ0MmFlYjdjMzVlZiJ9...',
    description: 'Bearer access token for Zoom API',
  })
  @IsString()
  access_token: string;

  @ApiProperty({
    example: 'bearer',
    description: 'Token type, typically "bearer"',
  })
  @IsString()
  token_type: string;

  @ApiProperty({
    example: 3600,
    description: 'Token expiration time in seconds',
  })
  @IsNumber()
  expires_in: number;

  @ApiPropertyOptional({
    example:
      'user:read:user:admin meeting:write:meeting:admin meeting:read:meeting:admin',
    description: 'Space-separated list of OAuth scopes granted to the token',
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiProperty({
    example: 'https://api-us.zoom.us',
    description: 'Zoom API base URL for the account region',
  })
  @IsString()
  api_url: string;
}

export class ZoomCreateMeetingResponseDto {
  @ApiProperty({ example: 'ZjZvbLh/QaWxVnSNZA1sRA==' })
  @IsString()
  uuid: string;

  @ApiProperty({ example: 85367388662 })
  @IsNumber()
  id: number;

  @ApiProperty({ example: '87mXQJ9vTjCQOtmOPe4WkQ' })
  @IsString()
  host_id: string;

  @ApiProperty({ example: 'avilash@fleapo.com' })
  @IsEmail()
  host_email: string;

  @ApiProperty({ example: 'Test meeting 5' })
  @IsString()
  topic: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  type: number;

  @ApiProperty({ example: 'waiting' })
  @IsString()
  status: string;

  @ApiProperty({ example: '2026-01-08T11:30:00Z' })
  @IsString()
  start_time: string;

  @ApiProperty({ example: 60 })
  @IsNumber()
  duration: number;

  @ApiProperty({ example: 'UTC' })
  @IsString()
  timezone: string;

  @ApiProperty({ example: '2026-01-08T11:34:44Z' })
  @IsString()
  created_at: string;

  @ApiProperty({
    example:
      'https://us06web.zoom.us/s/85367388662?zak=eyJ0eXAiOiJKV1QiLCJzdiI6IjAwMDAwMiIsInptX3NrbSI6InptX28ybSIsImFsZyI6IkhTMjU2In0...',
  })
  @IsString()
  start_url: string;

  @ApiProperty({
    example:
      'https://us06web.zoom.us/j/85367388662?pwd=eFdJvu2wnn6VTcUmVLbffdw8dPIH7b.1',
  })
  @IsString()
  join_url: string;

  @ApiProperty({ example: '641637' })
  @IsString()
  password: string;

  @ApiProperty({ example: '641637' })
  @IsString()
  h323_password: string;

  @ApiProperty({ example: '641637' })
  @IsString()
  pstn_password: string;

  @ApiProperty({ example: 'eFdJvu2wnn6VTcUmVLbffdw8dPIH7b.1' })
  @IsString()
  encrypted_password: string;

  @ApiPropertyOptional({ type: ZoomMeetingSettingsDto })
  @IsOptional()
  @IsObject()
  settings?: ZoomMeetingSettingsDto;

  @ApiProperty({ example: 'open_api' })
  @IsString()
  creation_source: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  pre_schedule: boolean;
}

export class ZoomUserResponseDto {
  @ApiProperty({ example: '87mXQJ9vTjCQOtmOPe4WkQ' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Avilash' })
  @IsString()
  first_name: string;

  @ApiProperty({ example: 'Ghosh' })
  @IsString()
  last_name: string;

  @ApiProperty({ example: 'Avilash Ghosh' })
  @IsString()
  display_name: string;

  @ApiProperty({ example: 'avilash@fleapo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 2,
    description: 'User type: 1=Basic, 2=Licensed, 3=On-prem',
  })
  @IsNumber()
  type: number;

  @ApiProperty({ example: 'Owner' })
  @IsString()
  role_name: string;

  @ApiProperty({ example: 9219524525 })
  @IsNumber()
  pmi: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  use_pmi: boolean;

  @ApiProperty({ example: 'https://us06web.zoom.us/j/9219524525?pwd=...' })
  @IsString()
  personal_meeting_url: string;

  @ApiProperty({ example: 'Asia/Calcutta' })
  @IsString()
  timezone: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  verified: number;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  dept?: string;

  @ApiProperty({ example: '2022-09-06T06:17:13Z' })
  @IsString()
  created_at: string;

  @ApiProperty({ example: '2026-01-08T10:30:37Z' })
  @IsString()
  last_login_time: string;

  @ApiProperty({ example: '5.10.7.6120(win)' })
  @IsString()
  last_client_version: string;

  @ApiProperty({ example: 'https://us06web.zoom.us/p/v2/...' })
  @IsString()
  pic_url: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  cms_user_id?: string;

  @ApiProperty({ example: '87mxqj9vtjcqotmope4wkq@xmpp.zoom.us' })
  @IsString()
  jid: string;

  @ApiProperty({ example: [], type: [String] })
  @IsArray()
  @IsString({ each: true })
  group_ids: string[];

  @ApiProperty({ example: [], type: [String] })
  @IsArray()
  @IsString({ each: true })
  im_group_ids: string[];

  @ApiProperty({ example: '27r8j9ECQ1OzHNbY5CPstQ' })
  @IsString()
  account_id: string;

  @ApiProperty({ example: 'en-US' })
  @IsString()
  language: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  phone_country?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiProperty({ example: 'active' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  job_title?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  cost_center?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: [1], type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  login_types: number[];

  @ApiProperty({ example: '0' })
  @IsString()
  role_id: string;

  @ApiProperty({ example: 5148211214 })
  @IsNumber()
  account_number: number;

  @ApiProperty({ example: 'us06' })
  @IsString()
  cluster: string;

  @ApiProperty({ example: '2022-09-06T06:17:13Z' })
  @IsString()
  user_created_at: string;
}
