import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateZoomMeetingDto,
  UpdateZoomMeetingDto,
  ZoomCreateMeetingResponseDto,
  ZoomMeetingEndedDto,
  ZoomMeetingRecordingsResponseDto,
  ZoomOAuthTokenResponseDto,
  ZoomParticipantDto,
  ZoomPastMeetingParticipantsResponseDto,
  ZoomUserResponseDto,
  ZoomWebhookDto,
} from './dto';

@Injectable()
export class ZoomService {
  private readonly logger = new Logger(ZoomService.name);
  private readonly zoomApiBaseUrl: string;
  private readonly zoomOAuthUrl: string;

  // Store for tracking participants (in production, use database)
  private meetingParticipants: Map<string, ZoomParticipantDto[]> = new Map();

  constructor(private configService: ConfigService) {
    this.zoomApiBaseUrl =
      this.configService.getOrThrow<string>('ZOOM_API_BASE_URL');
    this.zoomOAuthUrl = this.configService.getOrThrow<string>('ZOOM_AUTH_URL');
  }

  handleWebhook(input: { webhookData: ZoomWebhookDto }) {
    const { event, payload } = input.webhookData;

    this.logger.log(`Received Zoom webhook event: ${event}`);

    switch (event) {
      case 'meeting.started':
        return this.handleMeetingStarted({ payload });

      case 'meeting.ended':
        return this.handleMeetingEnded({ payload });

      case 'meeting.participant_joined':
        return this.handleParticipantJoined({ payload });

      case 'meeting.participant_left':
        return this.handleParticipantLeft({ payload });

      default:
        this.logger.warn(`Unhandled webhook event: ${event}`);
        return { status: 'unhandled', event };
    }
  }

  private handleMeetingStarted(input: { payload: ZoomWebhookDto['payload'] }) {
    const { object } = input.payload;

    this.logger.log(`Meeting started: ${object.topic} (ID: ${object.id})`);

    // Initialize participant tracking for this meeting
    this.meetingParticipants.set(object.id, []);

    return {
      status: 'meeting_started',
      meetingId: object.id,
      topic: object.topic,
      startTime: object.start_time,
    };
  }

  private handleMeetingEnded(input: { payload: ZoomWebhookDto['payload'] }) {
    const { object } = input.payload;

    this.logger.log(`Meeting ended: ${object.topic} (ID: ${object.id})`);

    const participants = this.meetingParticipants.get(object.id) || [];

    const meetingData: ZoomMeetingEndedDto = {
      meetingId: object.id,
      meetingUuid: object.uuid,
      hostId: object.host_id,
      topic: object.topic,
      startTime: object.start_time,
      endTime: object.end_time || new Date().toISOString(),
      duration: object.duration,
      participants: participants.map((p) => ({
        id: p.id,
        email: p.email,
        userName: p.userName,
        joinTime: p.joinTime,
        leaveTime: p.leaveTime || object.end_time || new Date().toISOString(),
      })),
    };

    // Trigger post-meeting workflows (attendance fork logic)
    this.triggerPostMeetingWorkflows({ meetingData });

    // Cleanup
    this.meetingParticipants.delete(object.id);

    return {
      status: 'meeting_ended',
      ...meetingData,
    };
  }

  private handleParticipantJoined(input: {
    payload: ZoomWebhookDto['payload'];
  }) {
    const { object } = input.payload;
    const participant = object.participant;

    if (!participant) {
      return { status: 'no_participant_data' };
    }

    this.logger.log(
      `Participant joined: ${participant.user_name} (${participant.email}) to meeting ${object.id}`,
    );

    const participantData: ZoomParticipantDto = {
      id: participant.id,
      email: participant.email,
      userName: participant.user_name,
      meetingId: object.id,
      joinTime: participant.join_time,
    };

    // Add to meeting participants
    const participants = this.meetingParticipants.get(object.id) || [];
    participants.push(participantData);
    this.meetingParticipants.set(object.id, participants);

    return {
      status: 'participant_joined',
      participant: participantData,
    };
  }

  private handleParticipantLeft(input: { payload: ZoomWebhookDto['payload'] }) {
    const { object } = input.payload;
    const participant = object.participant;

    if (!participant) {
      return { status: 'no_participant_data' };
    }

    this.logger.log(
      `Participant left: ${participant.user_name} (${participant.email}) from meeting ${object.id}`,
    );

    // Update participant leave time
    const participants = this.meetingParticipants.get(object.id) || [];
    const participantIndex = participants.findIndex(
      (p) => p.email === participant.email,
    );

    if (participantIndex !== -1) {
      participants[participantIndex].leaveTime = participant.leave_time;
      this.meetingParticipants.set(object.id, participants);
    }

    return {
      status: 'participant_left',
      email: participant.email,
      leaveTime: participant.leave_time,
    };
  }

  private triggerPostMeetingWorkflows(input: {
    meetingData: ZoomMeetingEndedDto;
  }) {
    // This is where the "Attendance Fork" logic will be implemented
    this.logger.log(
      `Triggering post-meeting workflows for: ${input.meetingData.topic}`,
    );
    this.logger.log(
      `Total participants: ${input.meetingData.participants?.length || 0}`,
    );

    // TODO: Implement attendance fork logic
    // - If attended: Send "Experience Rating" survey (1-5 scale)
    // - If not attended: Send "Missed You" message with recording link
    // - Provide "Next Event" nudge option

    return {
      status: 'workflows_triggered',
      meetingId: input.meetingData.meetingId,
      participantCount: input.meetingData.participants?.length || 0,
    };
  }

  getMeetingParticipants(input: { meetingId: string }): ZoomParticipantDto[] {
    return this.meetingParticipants.get(input.meetingId) || [];
  }

  verifyWebhookSignature(): boolean {
    // TODO: Implement Zoom webhook signature verification
    // Using HMAC SHA-256 with the webhook secret token
    this.logger.warn('Webhook signature verification not implemented');
    return true;
  }

  async getBearerToken(): Promise<ZoomOAuthTokenResponseDto> {
    const accountId = this.configService.getOrThrow<string>('ZOOM_ACCOUNT_ID');
    const clientId = this.configService.getOrThrow<string>('ZOOM_CLIENT_ID');
    const clientSecret =
      this.configService.getOrThrow<string>('ZOOM_CLIENT_SECRET');

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    const url = `${this.zoomOAuthUrl}?grant_type=account_credentials&account_id=${accountId}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Failed to get Zoom OAuth token: ${response.status} - ${errorText}`,
        );
        throw new Error(
          `Failed to get Zoom OAuth token: ${response.status} - ${errorText}`,
        );
      }

      const data = (await response.json()) as ZoomOAuthTokenResponseDto;
      return data;
    } catch (error) {
      this.logger.error(`Error getting Zoom OAuth token: ${error}`);
      throw error;
    }
  }

  /**
   * Create a Zoom meeting
   */
  async createMeeting(
    meetingData: CreateZoomMeetingDto,
  ): Promise<ZoomCreateMeetingResponseDto> {
    const accessToken = await this.getBearerToken();
    const user = await this.getCurrentUser(accessToken.access_token);
    const userId = user.id;

    const url = `${this.zoomApiBaseUrl}/users/${userId}/meetings`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken.access_token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(meetingData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Failed to create Zoom meeting: ${response.status} - ${errorText}`,
        );
        throw new Error(
          `Failed to create Zoom meeting: ${response.status} - ${errorText}`,
        );
      }

      const data = (await response.json()) as ZoomCreateMeetingResponseDto;
      this.logger.log(`Successfully created Zoom meeting: ${data.id}`);
      return data;
    } catch (error) {
      this.logger.error(`Error creating Zoom meeting: ${error}`);
      throw error;
    }
  }

  /**
   * Get current Zoom user information
   */
  async getCurrentUser(accessToken?: string): Promise<ZoomUserResponseDto> {
    const token = accessToken || (await this.getBearerToken()).access_token;

    const url = `${this.zoomApiBaseUrl}/users/me`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Failed to get Zoom user: ${response.status} - ${errorText}`,
        );
        throw new Error(
          `Failed to get Zoom user: ${response.status} - ${errorText}`,
        );
      }

      const data = (await response.json()) as ZoomUserResponseDto;
      this.logger.log(`Successfully retrieved Zoom user: ${data.id}`);
      return data;
    } catch (error) {
      this.logger.error(`Error getting Zoom user: ${error}`);
      throw error;
    }
  }

  /**
   * Update a Zoom meeting
   */
  async updateMeeting(
    meetingId: number,
    meetingData: UpdateZoomMeetingDto,
  ): Promise<string> {
    const accessToken = await this.getBearerToken();

    const url = `${this.zoomApiBaseUrl}/meetings/${meetingId}`;

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken.access_token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(meetingData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Failed to update Zoom meeting: ${response.status} - ${errorText}`,
        );
        throw new Error(
          `Failed to update Zoom meeting: ${response.status} - ${errorText}`,
        );
      }

      this.logger.log(`Successfully updated Zoom meeting: ${meetingId}`);
      return 'Update succesful';
    } catch (error) {
      this.logger.error(`Error updating Zoom meeting: ${error}`);
      throw error;
    }
  }

  /**
   * Delete a Zoom meeting
   */
  async deleteMeeting(meetingId: number): Promise<void> {
    const accessToken = await this.getBearerToken();

    const url = `${this.zoomApiBaseUrl}/meetings/${meetingId}`;

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken.access_token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Failed to delete Zoom meeting: ${response.status} - ${errorText}`,
        );
        throw new Error(
          `Failed to delete Zoom meeting: ${response.status} - ${errorText}`,
        );
      }

      this.logger.log(`Successfully deleted Zoom meeting: ${meetingId}`);
    } catch (error) {
      this.logger.error(`Error deleting Zoom meeting: ${error}`);
      throw error;
    }
  }

  /**
   * Get past meeting participants
   */
  async getPastMeetingParticipants(
    meetingId: number,
    pageSize: number = 30,
    nextPageToken?: string,
  ): Promise<ZoomPastMeetingParticipantsResponseDto> {
    const accessToken = await this.getBearerToken();

    let url = `${this.zoomApiBaseUrl}/past_meetings/${meetingId}/participants?page_size=${pageSize}`;
    if (nextPageToken) {
      url += `&next_page_token=${nextPageToken}`;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken.access_token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Failed to get past meeting participants: ${response.status} - ${errorText}`,
        );
        throw new Error(
          `Failed to get past meeting participants: ${response.status} - ${errorText}`,
        );
      }

      const data =
        (await response.json()) as ZoomPastMeetingParticipantsResponseDto;
      this.logger.log(
        `Successfully retrieved past meeting participants for meeting: ${meetingId}`,
      );
      return data;
    } catch (error) {
      this.logger.error(`Error getting past meeting participants: ${error}`);
      throw error;
    }
  }

  /**
   * Get meeting recordings
   */
  async getMeetingRecordings(
    meetingId: number,
    includeFields?: string,
    ttl: number = 1,
  ): Promise<ZoomMeetingRecordingsResponseDto> {
    const accessToken = await this.getBearerToken();

    let url = `${this.zoomApiBaseUrl}/meetings/${meetingId}/recordings?ttl=${ttl}`;
    if (includeFields) {
      url += `&include_fields=${includeFields}`;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken.access_token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Failed to get meeting recordings: ${response.status} - ${errorText}`,
        );
        throw new Error(
          `Failed to get meeting recordings: ${response.status} - ${errorText}`,
        );
      }

      const data = (await response.json()) as ZoomMeetingRecordingsResponseDto;
      this.logger.log(
        `Successfully retrieved recordings for meeting: ${meetingId}`,
      );
      return data;
    } catch (error) {
      this.logger.error(`Error getting meeting recordings: ${error}`);
      throw error;
    }
  }
}
