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

    const validatedUsers = await this.supabaseAdmin
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

    // 2. Create Meeting in Zoom
    const zoomPayload: CreateZoomMeetingDto = {
      topic,
      start_time: startTime,
      duration,
      type: 2, // Scheduled
      timezone: 'UTC',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        auto_recording: 'cloud',
        meeting_authentication: true,
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
      // Try to rollback Zoom meeting?
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

    // Update Zoom
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
        } catch (e) {
          this.logger.warn(
            `Failed to delete from Zoom (might be already deleted): ${e}`,
          );
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

    query = query.order('start_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch meetings: ${error.message}`);
    }

    const meetings = (data ?? []).map((meeting: MeetingRow) => ({
      id: meeting.id,
      topic: meeting.topic || 'Untitled Meeting',
      link: meeting.link,
      startTime: meeting.start_date,
      scheduledEndDate: meeting.scheduled_end_date,
      recordingLink: meeting.recording_link,
      recordingPassword: meeting.recording_password || undefined,
    }));

    return { meetings };
  }
}
