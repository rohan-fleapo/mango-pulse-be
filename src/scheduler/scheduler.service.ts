import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly supabaseAdmin: SupabaseClient;
  private readonly webhookUrl: string;
  private readonly whatsAppNumber: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.supabaseAdmin = this.supabaseService.getAdminClient();
    this.webhookUrl = this.configService.get<string>(
      'N8N_WEBHOOK_URL',
      'https://avilash.app.n8n.cloud/webhook-test/send-email',
    );
    this.whatsAppNumber = this.configService.get('WHATSAPP_NUMER');
  }

  /**
   * Cron job that runs every minute
   * Checks for meetings starting in the next hour
   */
  // @Cron(CronExpression.EVERY_MINUTE)
  async checkUpcomingMeetings() {
    this.logger.log('Checking for meetings in the next hour...');

    try {
      const now = new Date();
      const fiftyNineMinutesFromNow = new Date(now.getTime() + 59 * 60 * 1000);
      const sixtyOneMinutesFromNow = new Date(now.getTime() + 61 * 60 * 1000);

      // Find meetings starting in approximately 1 hour (between 59 and 61 minutes from now)
      // This ensures we catch meetings that are exactly 1 hour away with a small window for timing precision
      const { data: meetings, error: meetingsError } = await this.supabaseAdmin
        .from('meetings')
        .select('id, start_date, topic, creator_id, meeting_id')
        .gte('start_date', fiftyNineMinutesFromNow.toISOString())
        .lte('start_date', sixtyOneMinutesFromNow.toISOString())
        .is('invite_sent_at', null); // Only get meetings that haven't had invites sent

      if (meetingsError) {
        this.logger.error(
          `Error fetching upcoming meetings: ${meetingsError.message}`,
        );
        return;
      }

      if (!meetings || meetings.length === 0) {
        this.logger.debug('No meetings found in the next hour');
        return;
      }

      this.logger.log(
        `Found ${meetings.length} meeting(s) starting in the next hour`,
      );

      // Process each meeting
      for (const meeting of meetings) {
        await this.processMeetingForNotification(meeting as any);
      }
    } catch (error: any) {
      this.logger.error(`Error in checkUpcomingMeetings: ${error}`);
    }
  }

  /**
   * Process a meeting and send notifications to all engaged users
   */
  async processMeetingForNotification(meeting: {
    creator_id?: string;
    id?: string;
    meeting_id?: string;
    topic?: string;
    user_email?: string;
    start_date?: string;
  }) {
    try {
      // Get creator details
      const { data: creator, error: creatorError } = await this.supabaseAdmin
        .from('users')
        .select('id, name, email')
        .eq('id', meeting.creator_id)
        .single();

      if (creatorError || !creator) {
        this.logger.warn(
          `Meeting ${meeting.id} has no creator, skipping notification`,
        );
        return;
      }

      // Get all users engaged with this meeting
      const { data: engagements, error: engagementsError } =
        await this.supabaseAdmin
          .from('meeting_engagements')
          .select('user_id, user_email')
          .eq('meeting_id', meeting.id);

      if (engagementsError) {
        this.logger.error(
          `Error fetching engagements for meeting ${meeting.id}: ${engagementsError.message}`,
        );
        return;
      }

      if (!engagements || engagements.length === 0) {
        this.logger.debug(
          `No users engaged with meeting ${meeting.id}, skipping notification`,
        );
        // Mark meeting as processed even if no users
        await this.markMeetingAsNotified(meeting.id);
        return;
      }

      // Get creator name parts
      const creatorNameParts = this.splitName(creator.name);
      const creatorName = {
        firstName: creatorNameParts.firstName,
        lastName: creatorNameParts.lastName,
      };

      // Process each user
      for (const engagement of engagements) {
        // Get user details
        const { data: user, error: userError } = await this.supabaseAdmin
          .from('users')
          .select('name, phone')
          .eq('id', engagement.user_id)
          .single();

        if (userError || !user) {
          this.logger.warn(
            `User ${engagement.user_id} not found, skipping notification`,
          );
          continue;
        }

        const userNameParts = this.splitName(user.name);
        const meetingId = meeting.meeting_id || meeting.id;

        // Generate WhatsApp CTA link
        const ctaLink = this.generateWhatsAppCTALink(meetingId);

        // Format date for meeting start
        const meetingStartDate = new Date(meeting.start_date);
        const formattedDate = this.formatDate(meetingStartDate);

        const payload = {
          meeting: {
            startAt: formattedDate,
            id: meetingId,
            name: meeting.topic || 'Untitled Meeting',
          },
          ctaLink: ctaLink,
          user: {
            firstName: userNameParts.firstName,
            lastName: userNameParts.lastName,
            email: engagement.user_email,
          },
          creator: creatorName,
        };

        // Send webhook
        await this.sendWebhook(payload);

        this.logger.log(
          `Sent notification for meeting ${meeting.id} to user ${engagement.user_email}`,
        );
      }

      // Mark meeting as notified
      await this.markMeetingAsNotified(meeting.id);
    } catch (error: any) {
      this.logger.error(
        `Error processing meeting ${meeting.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(payload: any): Promise<void> {
    try {
      const response = await axios.post(this.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.status >= 200 && response.status < 300) {
        this.logger.debug(`Webhook sent successfully: ${response.status}`);
      } else {
        this.logger.warn(
          `Webhook returned unexpected status: ${response.status}`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Failed to send webhook: ${error.message}`);
      // Don't throw - we don't want to break the cron job
    }
  }

  /**
   * Mark meeting as notified
   */
  private async markMeetingAsNotified(meetingId: string): Promise<void> {
    try {
      const { error } = await this.supabaseAdmin
        .from('meetings')
        .update({ invite_sent_at: new Date().toISOString() })
        .eq('id', meetingId);

      if (error) {
        this.logger.error(
          `Failed to mark meeting ${meetingId} as notified: ${error.message}`,
        );
      } else {
        this.logger.debug(`Marked meeting ${meetingId} as notified`);
      }
    } catch (error: any) {
      this.logger.error(`Error marking meeting as notified: ${error.message}`);
    }
  }

  /**
   * Split name into first and last name
   */
  private splitName(fullName: string): {
    firstName: string;
    lastName: string;
  } {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    return { firstName, lastName };
  }

  /**
   * Format date as DD-MM-YYYY
   */
  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * Generate WhatsApp CTA link
   */
  private generateWhatsAppCTALink(meetingId: string): string {
    const message = encodeURIComponent(`Hi, Get meeting link for ${meetingId}`);
    return `https://api.whatsapp.com/send/?phone=${this.whatsAppNumber}&text=${message}&type=phone_number&app_absent=0`;
  }
}
