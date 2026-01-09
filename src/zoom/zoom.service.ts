import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
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
  private readonly supabaseAdmin: SupabaseClient;

  // Store for tracking participants (in production, use database)
  private meetingParticipants: Map<string, ZoomParticipantDto[]> = new Map();

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
    private whatsAppService: WhatsAppService,
  ) {
    this.zoomApiBaseUrl =
      this.configService.getOrThrow<string>('ZOOM_API_BASE_URL');
    this.zoomOAuthUrl = this.configService.getOrThrow<string>('ZOOM_AUTH_URL');
    this.supabaseAdmin = this.supabaseService.getAdminClient();
  }

  async handleWebhook(input: { webhookData: any }) {
    const { event, payload, download_token } = input.webhookData;

    this.logger.log(`Received Zoom webhook event: ${event}`);

    switch (event) {
      case 'endpoint.url_validation':
        const hashForValidate = crypto
          .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN)
          .update(payload?.plainToken)
          .digest('hex');

        console.log({
          message: {
            plainToken: payload.plainToken,
            encryptedToken: hashForValidate,
          },
        });

        return {
          plainToken: payload.plainToken,
          encryptedToken: hashForValidate,
        };

      case 'meeting.started':
        return this.handleMeetingStarted({ payload });

      case 'meeting.ended':
        return this.handleMeetingEnded({ payload });

      case 'meeting.participant_joined':
        return this.handleParticipantJoined({ payload });

      case 'meeting.participant_left':
        return this.handleParticipantLeft({ payload });

      case 'recording.completed':
        return await this.handleRecordingCompleted({
          payload,
          downloadToken: download_token,
        });

      default:
        this.logger.warn(`Unhandled webhook event: ${event}`);
        return { status: 'unhandled', event };
    }
  }

  private handleMeetingStarted(input: { payload: ZoomWebhookDto['payload'] }) {
    const { object } = input.payload;

    this.logger.log(`Meeting started: ${object.topic} (ID: ${object.id})`);

    // Initialize participant tracking for this meeting
    // Ensure ID is string for map key
    this.meetingParticipants.set(String(object.id), []);

    return {
      status: 'meeting_started',
      meetingId: object.id,
      topic: object.topic,
      startTime: object.start_time,
    };
  }

  private async handleMeetingEnded(input: {
    payload: ZoomWebhookDto['payload'];
  }) {
    const { object } = input.payload;

    this.logger.log(`Meeting ended: ${object.topic} (ID: ${object.id})`);

    const participants = await this.getPastMeetingParticipants(
      input.payload.object.id,
    );

    const temp = participants.participants;

    console.dir({ temp, depth: null });

    // Find the meeting in database to get creator_id
    const meetingIdStr = String(object.id);
    const { data: meeting, error: meetingError } = await this.supabaseAdmin
      .from('meetings')
      .select('id, creator_id')
      .eq('meeting_id', meetingIdStr)
      .single();

    let creatorEmail: string | null = null;

    if (!meetingError && meeting?.creator_id) {
      // Get creator's email
      const { data: creator, error: creatorError } = await this.supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', meeting.creator_id)
        .single();

      if (!creatorError && creator) {
        creatorEmail = creator.email;
        this.logger.debug(
          `Found meeting creator email: ${creatorEmail} (user_id: ${meeting.creator_id})`,
        );
      }
    } else {
      this.logger.debug(
        `Meeting not found in database or has no creator_id. Meeting ID: ${meetingIdStr}`,
      );
    }

    // Filter out creator from participants
    const filteredParticipants = participants.participants.filter((p) => {
      if (creatorEmail && p.user_email === creatorEmail) {
        this.logger.debug(
          `Skipping creator participant: ${p.user_email} (${p.name})`,
        );
        return false;
      }
      return true;
    });

    this.logger.log(
      `Total participants: ${participants.participants.length}, After filtering creator: ${filteredParticipants.length}`,
    );

    const meetingData: ZoomMeetingEndedDto = {
      meetingId: object.id,
      meetingUuid: object.uuid,
      hostId: object.host_id,
      topic: object.topic,
      startTime: object.start_time,
      endTime: object.end_time || new Date().toISOString(),
      duration: object.duration,
      participants: filteredParticipants.map((p) => ({
        id: p.id,
        email: p.user_email,
        joinTime: p.join_time,
        leaveTime: p.leave_time,
        userName: p.name,
      })),
    };

    // Trigger post-meeting workflows (attendance fork logic)
    await this.triggerPostMeetingWorkflows({ meetingData });

    // Cleanup
    this.meetingParticipants.delete(String(object.id));

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
    const participants = this.meetingParticipants.get(String(object.id)) || [];
    participants.push(participantData);
    this.meetingParticipants.set(String(object.id), participants);

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
    const participants = this.meetingParticipants.get(String(object.id)) || [];
    const participantIndex = participants.findIndex(
      (p) => p.email === participant.email,
    );

    if (participantIndex !== -1) {
      participants[participantIndex].leaveTime = participant.leave_time;
      this.meetingParticipants.set(String(object.id), participants);
    }

    return {
      status: 'participant_left',
      email: participant.email,
      leaveTime: participant.leave_time,
    };
  }

  private async handleRecordingCompleted(input: {
    payload: ZoomWebhookDto['payload'];
    downloadToken?: string;
  }) {
    const { object } = input.payload;
    const { downloadToken } = input;

    this.logger.log(`Recording completed: ${object.topic} (ID: ${object.id})`);

    // Log recording details
    if (object.recording_files) {
      this.logger.log(
        `Received ${object.recording_files.length} recording files. Total size: ${object.total_size} bytes.`,
      );
    }

    if (downloadToken) {
      this.logger.log(
        'Download token received available for accessing recordings.',
      );
    }

    try {
      // 1. Find meeting in database using meeting_id (Zoom meeting ID)
      const meetingIdStr = String(object.id);
      const { data: meeting, error: meetingError } = await this.supabaseAdmin
        .from('meetings')
        .select('id, meeting_id, topic')
        .eq('meeting_id', meetingIdStr)
        .single();

      if (meetingError || !meeting) {
        this.logger.error(
          `Meeting not found in database for meeting_id: ${meetingIdStr}. Error: ${meetingError?.message}`,
        );
        return {
          status: 'error',
          meetingId: object.id,
          error: 'Meeting not found in database',
        };
      }

      // 2. Save recording link and password to meetings table
      const recordingLink = object.share_url || null;
      const recordingPassword = object.password || null;

      if (recordingLink || recordingPassword) {
        const { error: updateError } = await this.supabaseAdmin
          .from('meetings')
          .update({
            recording_link: recordingLink,
            recording_password: recordingPassword,
          })
          .eq('id', meeting.id);

        if (updateError) {
          this.logger.error(
            `Error updating recording info: ${updateError.message}`,
          );
        } else {
          this.logger.log(
            `Saved recording link and password for meeting ${meeting.id}`,
          );
        }
      }

      // 3. Find users who did NOT attend (attended = false)
      const { data: invities, error: engagementsError } =
        await this.supabaseAdmin
          .from('meeting_engagements')
          .select('user_id, user_email')
          .eq('meeting_id', meeting.id)

      if (engagementsError) {
        this.logger.error(
          `Error fetching non-attendees: ${engagementsError.message}`,
        );
      } else if (invities && invities.length > 0) {
        // 4. Get user phone numbers for non-attendees
        const userIds = invities.map((e) => e.user_id);
        const { data: users, error: usersError } = await this.supabaseAdmin
          .from('users')
          .select('id, email, phone')
          .in('id', userIds);

        if (usersError) {
          this.logger.error(`Error fetching users: ${usersError.message}`);
        } else if (users && users.length > 0) {
          // 5. Send WhatsApp messages to non-attendees who have phone numbers
          // Only send if we have a recording link
          if (recordingLink) {
            const messagePromises = users
              .filter((user) => user.phone)
              .map(async (user) => {
                try {
                  // Remove + prefix from phone number if present
                  const phoneNumber = user.phone!.startsWith('+')
                    ? user.phone!.substring(1)
                    : user.phone!;

                  await this.whatsAppService.sendMissedMeetingMessage(
                    phoneNumber,
                    meeting.topic || object.topic,
                    recordingLink,
                    recordingPassword || '',
                  );
                  this.logger.debug(
                    `Sent missed meeting message to ${user.email} (${phoneNumber})`,
                  );
                } catch (error: any) {
                  this.logger.warn(
                    `Failed to send missed meeting message to ${user.email}: ${error.message}`,
                  );
                }
              });

            await Promise.all(messagePromises);
            this.logger.log(
              `Sent missed meeting messages to ${messagePromises.length} non-attendees`,
            );

            // 6. Send "Next Event" nudge messages to non-attendees
            const nextEventNudgePromises = users
              .filter((user) => user.phone)
              .map(async (user) => {
                try {
                  // Remove + prefix from phone number if present
                  const phoneNumber = user.phone!.startsWith('+')
                    ? user.phone!.substring(1)
                    : user.phone!;

                  await this.whatsAppService.sendNextEventNudgeMessage(
                    phoneNumber,
                    meeting.id,
                    user.id,
                  );
                  this.logger.debug(
                    `Sent next event nudge to ${user.email} (${phoneNumber})`,
                  );
                } catch (error: any) {
                  this.logger.warn(
                    `Failed to send next event nudge to ${user.email}: ${error.message}`,
                  );
                }
              });

            await Promise.all(nextEventNudgePromises);
            this.logger.log(
              `Sent next event nudge messages to ${nextEventNudgePromises.length} non-attendees`,
            );
          } else {
            this.logger.warn(
              'Recording link not available, skipping missed meeting messages',
            );
          }
        }
      } else {
        this.logger.log('No non-attendees found for this meeting');
      }

      return {
        status: 'recording_completed',
        meetingId: object.id,
        topic: object.topic,
        recordingFiles: object.recording_files,
        shareUrl: object.share_url,
        downloadToken: downloadToken,
      };
    } catch (error: any) {
      this.logger.error(
        `Error in handleRecordingCompleted: ${error.message}`,
        error.stack,
      );
      return {
        status: 'error',
        meetingId: object.id,
        error: error.message,
      };
    }
  }

  private async triggerPostMeetingWorkflows(input: {
    meetingData: ZoomMeetingEndedDto;
  }) {
    // This is where the "Attendance Fork" logic will be implemented
    this.logger.log(
      `Triggering post-meeting workflows for: ${input.meetingData.topic}`,
    );

    try {
      const participants = input.meetingData.participants || [];

      console.dir({ participants, depth: null });
      if (participants.length === 0) {
        this.logger.warn('No participants found in meeting data');
        return {
          status: 'workflows_triggered',
          meetingId: input.meetingData.meetingId,
          participantCount: 0,
        };
      }

      // 1. Collect list of emails from participants
      const emails = Array.from(
        new Set(participants.map((p) => p.email).filter(Boolean)),
      );

      this.logger.log(`Processing ${emails.length} participant emails`);

      // 2. Get userIds for each email and create email->userId map
      const emailToUserIdMap = new Map<string, string>();
      const emailToUserDataMap = new Map<
        string,
        { id: string; email: string; phone: string | null }
      >();

      // Query all users at once using 'in' filter
      const { data: users, error: usersError } = await this.supabaseAdmin
        .from('users')
        .select('id, email, phone,name')
        .in('email', emails);

      if (usersError) {
        this.logger.error(`Error fetching users: ${usersError.message}`);
      } else if (users && users.length > 0) {
        // Create maps from the results
        for (const user of users) {
          emailToUserIdMap.set(user.email, user.id);
          emailToUserDataMap.set(user.email, {
            id: user.id,
            email: user.email,
            phone: user.phone,
          });
          this.logger.debug(`Mapped email ${user.email} to userId ${user.id}`);
        }

        // Log any emails that weren't found
        // const foundEmails = new Set(users.map((u) => u.email));
        // const notFoundEmails = emails.filter((e) => !foundEmails.has(e));
        // if (notFoundEmails.length > 0) {
        //   this.logger.warn(
        //     `Users not found for emails: ${notFoundEmails.join(', ')}`,
        //   );
        // }
      } else {
        this.logger.warn('No users found for any of the participant emails');
      }

      this.logger.log(
        `Created email->userId map for ${emailToUserIdMap.size} users`,
      );

      // 3. Find meeting in database using meeting_id (Zoom meeting ID)
      const meetingIdStr = String(input.meetingData.meetingId);
      const { data: meeting, error: meetingError } = await this.supabaseAdmin
        .from('meetings')
        .select('id, meeting_id')
        .eq('meeting_id', meetingIdStr)
        .single();

      if (meetingError || !meeting) {
        this.logger.error(
          `Meeting not found in database for meeting_id: ${meetingIdStr}. Error: ${meetingError?.message}`,
        );
        return {
          status: 'error',
          meetingId: input.meetingData.meetingId,
          error: 'Meeting not found in database',
        };
      }

      this.logger.log(
        `Found meeting in database: ${meeting.id} (Zoom ID: ${meeting.meeting_id})`,
      );

      // 4. Insert records into meeting_activities table
      // Filter to only include participants who exist in our users table
      // (prevents foreign key constraint violations)
      const activitiesToInsert = participants
        .filter((p) => {
          const exists = emailToUserIdMap.has(p.email);
          if (!exists) {
            this.logger.debug(
              `Skipping activity record for participant ${p.email} - user not found in database`,
            );
          }
          return exists;
        })
        .map((participant) => {
          const userId = emailToUserIdMap.get(participant.email)!;
          return {
            user_id: userId,
            meeting_id: meeting.id,
            joining_time: participant.joinTime,
            leaving_time: participant.leaveTime || input.meetingData.endTime,
          };
        });

      if (activitiesToInsert.length > 0) {
        const { error: activitiesError } = await this.supabaseAdmin
          .from('meeting_activities')
          .insert(activitiesToInsert);

        if (activitiesError) {
          this.logger.error(
            `Error inserting meeting activities: ${activitiesError.message}`,
          );
        } else {
          this.logger.log(
            `Inserted ${activitiesToInsert.length} meeting activity records`,
          );
        }
      }

      // 5. Update meeting_engagements to mark attended=true for participants
      const updatePromises = Array.from(emailToUserDataMap.values()).map(
        async (userData) => {
          const participant = participants.find(
            (p) => p.email === userData.email,
          );
          if (!participant) return;

          const { error: updateError } = await this.supabaseAdmin
            .from('meeting_engagements')
            .update({ attended: true })
            .eq('meeting_id', meeting.id)
            .eq('user_id', userData.id)
            .eq('user_email', userData.email);

          if (updateError) {
            this.logger.warn(
              `Error updating engagement for user ${userData.email}: ${updateError.message}`,
            );
          } else {
            this.logger.debug(
              `Marked user ${userData.email} as attended for meeting ${meeting.id}`,
            );
          }
        },
      );

      await Promise.all(updatePromises);
      this.logger.log(
        `Updated attendance for ${emailToUserDataMap.size} participants`,
      );

      // 6. Send rating survey messages to all participants who attended
      const ratingSurveyPromises = Array.from(emailToUserDataMap.values())
        .filter((userData) => userData.phone) // Only send to users with phone numbers
        .map(async (userData) => {
          try {
            // Remove + prefix from phone number if present
            const phoneNumber = userData.phone!.startsWith('+')
              ? userData.phone!.substring(1)
              : userData.phone!;

            await this.whatsAppService.sendRatingSurveyMessage(
              phoneNumber,
              meeting.id,
              userData.id,
              input.meetingData.topic,
            );
            this.logger.debug(
              `Sent rating survey to ${userData.email} (${phoneNumber})`,
            );
          } catch (error: any) {
            this.logger.warn(
              `Failed to send rating survey to ${userData.email}: ${error.message}`,
            );
          }
        });

      await Promise.all(ratingSurveyPromises);
      this.logger.log(
        `Sent rating survey messages to ${ratingSurveyPromises.length} participants`,
      );

      return {
        status: 'workflows_triggered',
        meetingId: input.meetingData.meetingId,
        participantCount: participants.length,
        processedCount: emailToUserIdMap.size,
        activitiesInserted: activitiesToInsert.length,
        ratingSurveysSent: ratingSurveyPromises.length,
      };
    } catch (error: any) {
      this.logger.error(
        `Error in triggerPostMeetingWorkflows: ${error}`,
        error,
      );
      return {
        status: 'error',
        meetingId: input.meetingData.meetingId,
        error: error,
      };
    }
  }

  getMeetingParticipants(input: { meetingId: string }): ZoomParticipantDto[] {
    return this.meetingParticipants.get(input.meetingId) || [];
  }

  async verifyWebhookSignature(input: {
    signature?: string;
    timestamp?: string;
    rawBody: string;
    event?: string;
  }): Promise<boolean> {
    const { signature, timestamp, rawBody, event } = input;

    // Skip signature verification for URL validation events
    // These are used by Zoom to verify the webhook endpoint during setup
    if (event === 'endpoint.url_validation') {
      this.logger.debug(
        'Skipping signature verification for URL validation event',
      );
      return true;
    }

    // Get webhook secret token from config
    const webhookSecret = this.configService.get<string>(
      'ZOOM_WEBHOOK_SECRET_TOKEN',
    );

    // If webhook secret is not configured, skip verification (for development)
    if (!webhookSecret) {
      this.logger.warn(
        'ZOOM_WEBHOOK_SECRET_TOKEN not configured. Skipping signature verification.',
      );
      return true; // Allow in development, but should be false in production
    }

    // Check if required headers are present
    if (!signature || !timestamp) {
      this.logger.warn(
        'Missing required webhook headers (x-zm-signature or x-zm-request-timestamp)',
      );
      return false;
    }

    try {
      // Extract hash from signature (Zoom sends it as "v0={hash}")
      const signatureHash = signature.startsWith('v0=')
        ? signature.substring(3)
        : signature;

      // Verify timestamp is within acceptable window (5 minutes)
      // Zoom sends timestamp in milliseconds, convert to seconds for comparison
      let requestTimestamp = parseInt(timestamp, 10);

      // If timestamp is in milliseconds (13 digits), convert to seconds for comparison
      if (requestTimestamp > 1000000000000) {
        requestTimestamp = Math.floor(requestTimestamp / 1000);
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const timeDifference = Math.abs(currentTimestamp - requestTimestamp);

      // Allow 5 minute window for clock skew
      const MAX_TIME_DIFF = 5 * 60; // 5 minutes in seconds
      if (timeDifference > MAX_TIME_DIFF) {
        this.logger.warn(
          `Webhook timestamp is too old or too far in future. Difference: ${timeDifference}s`,
        );
        // Don't fail for URL validation events even if timestamp is off
        if (event === 'endpoint.url_validation') {
          this.logger.debug(
            'Allowing URL validation event despite timestamp difference',
          );
        } else {
          return false;
        }
      }

      // Create message string: timestamp:rawBody
      // Use the original timestamp string as received (not converted) for the message
      const message = `v0:${timestamp}:${rawBody}`;

      // Compute HMAC SHA-256 hash
      const crypto = await import('crypto');
      const computedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(message)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      const isValid = this.constantTimeCompare(computedHash, signatureHash);

      if (!isValid) {
        this.logger.warn('Webhook signature verification failed');
        this.logger.debug(
          `Expected: ${computedHash}, Received: ${signatureHash} (from ${signature})`,
        );
        this.logger.debug(
          `Message used: ${timestamp}:${rawBody.substring(0, 100)}...`,
        );
      } else {
        this.logger.debug('Webhook signature verified successfully');
      }

      return isValid;
    } catch (error: any) {
      this.logger.error(
        `Error verifying webhook signature: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
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
