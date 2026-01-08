import { Injectable, Logger } from '@nestjs/common';
import { ZoomMeetingEndedDto, ZoomParticipantDto, ZoomWebhookDto } from './dto';

@Injectable()
export class ZoomService {
  private readonly logger = new Logger(ZoomService.name);

  // Store for tracking participants (in production, use database)
  private meetingParticipants: Map<string, ZoomParticipantDto[]> = new Map();

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
}
