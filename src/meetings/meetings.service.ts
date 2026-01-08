import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from 'src/supabase/supabase.service';
import { CreateZoomMeetingDto, UpdateZoomMeetingDto } from 'src/zoom/dto';
import { ZoomService } from 'src/zoom/zoom.service';
import {
  CreateMeetingInput,
  CreateMeetingOutput,
  DeleteMeetingInput,
  DeleteMeetingOutput,
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
  ) {
    this.supabaseAdmin = this.supabaseService.getAdminClient();
  }

  async createMeeting(input: CreateMeetingInput): Promise<CreateMeetingOutput> {
    const { topic, startTime, duration, invitees, creatorId } = input;

    // 1. Create Meeting in Zoom
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
      },
    };

    const zoomMeeting = await this.zoomService.createMeeting(zoomPayload);

    // 2. Save to DB
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

    // 3. Create Engagements
    if (invitees && invitees.length > 0) {
      await this.createMeetingEngagements(meetingId, invitees);
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

  private async createMeetingEngagements(meetingId: string, emails: string[]) {
    // Find users by emails
    const { data: users, error: usersError } = await this.supabaseAdmin
      .from('users')
      .select('id, email')
      .in('email', emails);

    if (usersError) {
      this.logger.error(
        `Failed to fetch users for engagement: ${usersError.message}`,
      );
      return;
    }

    if (!users || users.length === 0) {
      return;
    }

    const engagements = users.map((user: { id: string; email: string }) => ({
      user_id: user.id,
      user_email: user.email,
      meeting_id: meetingId,
      interested: 'no-response' as const,
    }));

    const { error: engagementError } = await this.supabaseAdmin
      .from('meeting_engagements')
      .insert(engagements);

    if (engagementError) {
      this.logger.error(
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

    const meetings = (data || []).map((meeting: MeetingRow) => ({
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
