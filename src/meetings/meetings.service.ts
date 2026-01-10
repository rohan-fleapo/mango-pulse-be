import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { SchedulerService } from 'src/scheduler/scheduler.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { CreateZoomMeetingDto, UpdateZoomMeetingDto } from 'src/zoom/dto';
import { ZoomService } from 'src/zoom/zoom.service';
import {
  CreateMeetingEngagementsInput,
  CreateMeetingInput,
  CreateMeetingOutput,
  DeleteMeetingInput,
  DeleteMeetingOutput,
  GetMeetingDetailOutput,
  GetMeetingsInput,
  GetMeetingsOutput,
  MeetingRow,
  UpdateMeetingDbData,
  UpdateMeetingInput,
  UpdateMeetingOutput,
} from './dto';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);
  private supabaseAdmin: SupabaseClient;

  constructor(
    private readonly zoomService: ZoomService,
    private readonly supabaseService: SupabaseService,
    private readonly schedulerService: SchedulerService,
  ) {
    this.supabaseAdmin = this.supabaseService.getAdminClient();
  }

  async createMeeting(input: CreateMeetingInput): Promise<CreateMeetingOutput> {
    const { topic, startTime, duration, creatorId } = input;

    // Get all users for the creator
    const allUsers = await this.supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('creator_id', creatorId)
      .eq('role', 'member')
      .then(({ data, error }) => {
        if (error) {
          this.logger.error(
            `Failed to fetch users for creator ${creatorId}: ${error.message}`,
          );
          throw new Error(
            `Failed to fetch users for creator ${creatorId}: ${error.message}`,
          );
        }
        return data as Array<{ id: string; email: string }>;
      });

    // Find the last meeting created by this creator (before current meeting start time)
    // Use created_at to get the most recently created meeting
    const { data: lastMeeting, error: lastMeetingError } =
      await this.supabaseAdmin
        .from('meetings')
        .select('id, start_date')
        .eq('creator_id', creatorId)
        .lt('start_date', startTime)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    let validatedUsers: Array<{ id: string; email: string }> = [];

    if (lastMeetingError && lastMeetingError.code !== 'PGRST116') {
      // Error other than "not found" - log and use all users as fallback
      this.logger.warn(
        `Error finding last meeting: ${lastMeetingError.message}. Using all users.`,
      );
      validatedUsers = allUsers;
    } else if (!lastMeeting) {
      // No previous meeting found - invite all users
      this.logger.log(
        `No previous meeting found for creator ${creatorId}. Inviting all users.`,
      );
      validatedUsers = allUsers;
    } else {
      // Last meeting found - filter users based on feedback
      this.logger.log(
        `Found last meeting ${lastMeeting.id} for creator ${creatorId}. Filtering users based on feedback.`,
      );

      // Get feedback for the last meeting for all users
      const userIds = allUsers.map((u) => u.id);
      const { data: feedbacks, error: feedbacksError } =
        await this.supabaseAdmin
          .from('meeting_feedbacks')
          .select('user_id, next_meeting_interested')
          .eq('meeting_id', lastMeeting.id)
          .in('user_id', userIds);

      if (feedbacksError) {
        this.logger.warn(
          `Error fetching feedbacks: ${feedbacksError.message}. Using all users.`,
        );
        validatedUsers = allUsers;
      } else {
        // Create a map of user_id -> feedback
        const feedbackMap = new Map<
          string,
          'yes' | 'no' | 'maybe' | 'no-response'
        >();
        feedbacks?.forEach((feedback) => {
          feedbackMap.set(feedback.user_id, feedback.next_meeting_interested);
        });

        // Filter users: include if feedback is 'yes' or no feedback found
        validatedUsers = allUsers.filter((user) => {
          const feedback = feedbackMap.get(user.id);

          if (!feedback) {
            // No feedback found - invite by default
            this.logger.debug(
              `User ${user.email} has no feedback for last meeting. Including in invite.`,
            );
            return true;
          }

          if (feedback === 'yes') {
            // User said yes to next meeting - invite them
            this.logger.debug(
              `User ${user.email} said yes to next meeting. Including in invite.`,
            );
            return true;
          }

          // User said 'no', 'maybe', or 'no-response' - exclude them
          this.logger.debug(
            `User ${user.email} has feedback '${feedback}' for last meeting. Excluding from invite.`,
          );
          return false;
        });

        this.logger.log(
          `Filtered users: ${allUsers.length} total, ${validatedUsers.length} invited based on feedback`,
        );
      }
    }

    // Get creator's email to add as invitee
    const { data: creator, error: creatorError } = await this.supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', creatorId)
      .eq('role', 'creator')
      .single();

    if (creatorError || !creator) {
      this.logger.warn(
        `Failed to fetch creator email for ${creatorId}: ${creatorError?.message || 'Creator not found'}`,
      );
    }

    // 2. Create Meeting in Zoom
    const zoomPayload: CreateZoomMeetingDto = {
      topic,
      start_time: startTime,
      duration,
      type: 2, // Scheduled
      timezone: 'UTC',
      password: 'vadhjvfvsd',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: true,
        auto_recording: 'cloud',
        approval_type: 0,
        registration_type: 1,
        meeting_authentication: true,
        waiting_room: false,
        // Add creator's email as invitee if available
        ...(creator?.email && {
          meeting_invitees: [{ email: creator.email }],
        }),
      },
    };

    const zoomMeeting = await this.zoomService.createMeeting(zoomPayload);

    // 3. Save to DB
    const startObj = new Date(startTime);
    const endObj = new Date(startObj.getTime() + duration * 60000);

    const { data: meetingData, error: meetingError } = (await this.supabaseAdmin
      .from('meetings')
      .insert({
        link: zoomMeeting.join_url,
        start_date: startObj.toISOString(),
        scheduled_end_date: endObj.toISOString(),
        topic: topic,
        creator_id: creatorId || null,
        recording_password: null, // Zoom creation gives meeting password, not recording password. Recording isn't ready.
        meeting_id: zoomMeeting.id.toString(),
      } as any)
      .select()
      .single()) as { data: MeetingRow | null; error: PostgrestError | null };

    if (meetingError) {
      this.logger.error(
        `Failed to save meeting to DB: ${meetingError.message}`,
      );

      await this.zoomService
        .deleteMeeting(zoomMeeting.id)
        .catch((e) => this.logger.error(`Rollback failed: ${e}`));
      throw new Error(`Failed to save meeting to DB: ${meetingError.message}`);
    }

    const meetingId = meetingData.id;

    // 4. Create Engagements (using already validated users)
    if (validatedUsers && validatedUsers.length > 0) {
      await this.createMeetingEngagements({
        meetingId,
        validatedUsers,
      });
    }

    // if the start of the meeting in less than one hour, send notification immediately
    if (startObj.getTime() - Date.now() < 60 * 60 * 1000) {
      this.logger.log(
        `Meeting is starting in less than one hour, sending notifications immediately...`,
      );
      await this.schedulerService.processMeetingForNotification(meetingData);
    }

    return {
      id: meetingId,
      meetingId: zoomMeeting.id.toString(),
      topic: zoomMeeting.topic,
      joinUrl: zoomMeeting.join_url,
      recordingPassword: zoomMeeting.password,
      startDate: zoomMeeting.start_time,
      duration: zoomMeeting.duration,
    };
  }

  /**
   * Validates that all invitee emails exist and belong to the creator
   * @returns Array of validated user objects with id and email
   * @throws Error if validation fails
   */
  private async validateInvitees(
    emails: string[],
    creatorId: string,
  ): Promise<Array<{ id: string; email: string }>> {
    const { data: users, error: usersError } = await this.supabaseAdmin
      .from('users')
      .select('id, email')
      .in('email', emails)
      .eq('creator_id', creatorId);

    if (usersError) {
      this.logger.error(
        `Failed to fetch users for validation: ${usersError.message}`,
      );
      throw new Error(
        `Failed to fetch users for validation: ${usersError.message}`,
      );
    }

    // Check if all requested emails were found
    if (!users || users.length !== emails.length) {
      const foundEmails = users?.map((u: { email: string }) => u.email) ?? [];
      const missingEmails = emails.filter((e) => !foundEmails.includes(e));

      throw new Error(
        `One or more users does not exist or does not belong to this creator: ${missingEmails.join(', ')}`,
      );
    }

    return users as Array<{ id: string; email: string }>;
  }

  private async createMeetingEngagements(input: CreateMeetingEngagementsInput) {
    const {
      meetingId,
      validatedUsers,
    }: {
      meetingId: string;
      validatedUsers: Array<{ id: string; email: string }>;
    } = input;

    const { error: engagementError } = await this.supabaseAdmin
      .from('meeting_engagements')
      .insert(
        validatedUsers.map((user) => ({
          user_id: user.id,
          user_email: user.email,
          meeting_id: meetingId,
          interested: 'no-response' as const,
        })),
      );

    if (engagementError) {
      this.logger.error(
        `Failed to create engagements: ${engagementError.message}`,
      );
      throw new Error(
        `Failed to create engagements: ${engagementError.message}`,
      );
    }
  }

  async updateMeeting(input: UpdateMeetingInput): Promise<UpdateMeetingOutput> {
    const { meetingId, topic, startTime, duration } = input;

    // Fetch existing meeting
    const { data: meeting, error: fetchError } = await this.supabaseAdmin
      .from('meetings')
      .select('id, meeting_id, start_date, scheduled_end_date, topic')
      .eq('id', meetingId)
      .single();

    if (fetchError || !meeting) {
      throw new NotFoundException(`Meeting with ID ${meetingId} not found`);
    }

    const meetingTyped = meeting as unknown as MeetingRow;

    if (!meetingTyped.meeting_id) {
      throw new Error(
        `Meeting ${meetingId} is missing meeting_id, cannot sync with Zoom`,
      );
    }

    const updatePayload: UpdateZoomMeetingDto = {};
    if (topic) updatePayload.topic = topic;
    if (startTime) updatePayload.start_time = startTime;
    if (duration) updatePayload.duration = duration;

    // Need to parse meeting_id to number if stored as string
    const zoomIdNum = parseInt(meetingTyped.meeting_id, 10);
    if (!isNaN(zoomIdNum)) {
      await this.zoomService.updateMeeting(zoomIdNum, updatePayload);
    } else {
      this.logger.warn(
        `Invalid meeting_id for meeting ${meetingId}: ${meetingTyped.meeting_id}`,
      );
    }

    // Update DB
    const updateDbData: UpdateMeetingDbData = {};
    if (topic) updateDbData.topic = topic;
    if (startTime) {
      updateDbData.start_date = new Date(startTime).toISOString();
      if (duration || meetingTyped.scheduled_end_date) {
        const durationInMinutes =
          duration ||
          (new Date(meetingTyped.scheduled_end_date).getTime() -
            new Date(meetingTyped.start_date).getTime()) /
            60000;
        updateDbData.scheduled_end_date = new Date(
          new Date(startTime).getTime() + durationInMinutes * 60000,
        ).toISOString();
      }
    } else if (duration) {
      // Start time didn't change, but duration did
      updateDbData.scheduled_end_date = new Date(
        new Date(meetingTyped.start_date).getTime() + duration * 60000,
      ).toISOString();
    }

    if (Object.keys(updateDbData).length > 0) {
      const { error: updateError } = await this.supabaseAdmin
        .from('meetings')
        .update(updateDbData)
        .eq('id', meetingId);

      if (updateError) {
        throw new Error(
          `Failed to update meeting in DB: ${updateError.message}`,
        );
      }
    }

    return {
      success: true,
      meetingId,
    };
  }

  async deleteMeeting(input: DeleteMeetingInput): Promise<DeleteMeetingOutput> {
    const { meetingId } = input;

    const { data: meeting, error: fetchError } = await this.supabaseAdmin
      .from('meetings')
      .select('id, meeting_id')
      .eq('id', meetingId)
      .single();

    if (fetchError || !meeting) {
      throw new NotFoundException(`Meeting with ID ${meetingId} not found`);
    }

    const meetingTyped = meeting as unknown as MeetingRow;

    // Delete from Zoom
    if (meetingTyped.meeting_id) {
      const zoomIdNum = parseInt(meetingTyped.meeting_id, 10);
      if (!isNaN(zoomIdNum)) {
        try {
          await this.zoomService.deleteMeeting(zoomIdNum);
          // Host will be released automatically by deleteMeeting
        } catch (e) {
          this.logger.warn(
            `Failed to delete from Zoom (might be already deleted): ${e}`,
          );
          // If delete failed, still try to release the host
          try {
            await this.zoomService.releaseHost(meetingTyped.meeting_id);
          } catch (releaseError) {
            this.logger.warn(
              `Failed to release host for meeting ${meetingTyped.meeting_id}: ${releaseError}`,
            );
          }
        }
      }
    }

    // Delete from DB (or soft delete? Schema doesn't have deleted_at. Hard delete for now)
    const { error: deleteError } = await this.supabaseAdmin
      .from('meetings')
      .delete()
      .eq('id', meetingId);

    if (deleteError) {
      throw new Error(
        `Failed to delete meeting from DB: ${deleteError.message}`,
      );
    }

    return {
      success: true,
      meetingId,
    };
  }

  async getMeeting(id: string): Promise<GetMeetingDetailOutput> {
    const { data: meeting, error } = await this.supabaseAdmin
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !meeting) {
      throw new NotFoundException(`Meeting with ID ${id} not found`);
    }

    const { count: countCount } = await this.supabaseAdmin
      .from('meeting_activities')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_id', id);

    const startTime = new Date(meeting.start_date).getTime();
    const endTime = new Date(
      meeting.end_date || meeting.scheduled_end_date,
    ).getTime();
    const duration = Math.round((endTime - startTime) / 60000);

    return {
      id: meeting.id,
      title: meeting.topic || 'Untitled Meeting',
      date: meeting.start_date,
      duration: duration || 0,
      count: countCount || 0,
    };
  }

  async getMeetings(input: GetMeetingsInput): Promise<GetMeetingsOutput> {
    let query = this.supabaseAdmin.from('meetings').select('*');

    if (input.creatorId) {
      query = query.eq('creator_id', input.creatorId);
    }
    if (input.meetingId) {
      query = query.eq('id', input.meetingId);
    }

    query = query.order('start_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch meetings: ${error.message}`);
    }

    const meetingIds = (data ?? []).map((meeting: MeetingRow) => meeting.id);

    const { data: activities } = await this.supabaseAdmin
      .from('meeting_activities')
      .select('meeting_id, user_id')
      .in('meeting_id', meetingIds);

    const attendeeCountByMeeting = new Map<string, Set<string>>();
    activities?.forEach((activity) => {
      if (!attendeeCountByMeeting.has(activity.meeting_id)) {
        attendeeCountByMeeting.set(activity.meeting_id, new Set());
      }
      attendeeCountByMeeting.get(activity.meeting_id)?.add(activity.user_id);
    });

    const meetings = (data ?? []).map((meeting: MeetingRow) => {
      const start = new Date(meeting.start_date);
      const end = meeting.end_date
        ? new Date(meeting.end_date)
        : new Date(meeting.scheduled_end_date);

      const duration = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60),
      );

      const attendeesCount = attendeeCountByMeeting.get(meeting.id)?.size ?? 0;

      return {
        id: meeting.id,
        topic: meeting.topic || 'Untitled Meeting',
        link: meeting.link,
        startTime: meeting.start_date,
        scheduledEndDate: meeting.scheduled_end_date,
        recordingLink: meeting.recording_link,
        recordingPassword: meeting.recording_password || undefined,
        attendeesCount,
        duration,
      };
    });

    return { meetings };
  }
}
