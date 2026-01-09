import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import axios, { AxiosInstance } from 'axios';
import { SupabaseService } from '../supabase/supabase.service';
import {
  SendWhatsAppInteractiveDto,
  SendWhatsAppTemplateDto,
} from './dto/send-message.dto';
import { WhatsAppWebhookInput } from './dto/webhook.dto';
import { WhatsAppMessageResponse } from './interfaces/whatsapp.interface';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly phoneNumberId: string;
  private readonly apiVersion = 'v22.0';
  private readonly supabaseAdmin: SupabaseClient;

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {
    const apiToken = this.configService.get<string>('WHATSAPP_API_TOKEN');
    this.phoneNumberId = this.configService.get<string>(
      'WHATSAPP_PHONE_NUMBER_ID',
    );

    if (!apiToken || !this.phoneNumberId) {
      this.logger.warn(
        'WhatsApp API credentials not configured. Message sending will not work.',
      );
    }

    this.axiosInstance = axios.create({
      baseURL: `https://graph.facebook.com/${this.apiVersion}`,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    this.supabaseAdmin = this.supabaseService.getAdminClient();
  }

  /**
   * Send a template message (pre-approved templates from WhatsApp Business Manager)
   */
  async sendTemplateMessage(
    dto: SendWhatsAppTemplateDto,
  ): Promise<WhatsAppMessageResponse> {
    this.logger.log(
      `Preparing to send template message '${dto.template.name}' to ${dto.to}`,
    );

    const message = this.buildTemplateMessage(dto);

    try {
      const response = await this.axiosInstance.post(
        `/${this.phoneNumberId}/messages`,
        message,
      );

      const messageId = response.data?.messages?.[0]?.id;
      this.logger.log(
        `Template message sent successfully. Message ID: ${messageId}`,
      );

      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      this.logger.error(`Failed to send template message: ${errorMsg}`);

      throw new HttpException(
        {
          message: 'Failed to send WhatsApp template message',
          error: error.response?.data?.error || error.message,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Build template message payload for WhatsApp API
   */
  private buildTemplateMessage(dto: SendWhatsAppTemplateDto) {
    const components = dto.template.parameters
      ? [
          {
            type: 'body' as const,
            parameters: dto.template.parameters.map((param: any) => ({
              type: param.type || 'text',
              text: param.text,
            })),
          },
        ]
      : undefined;

    return {
      messaging_product: dto.messaging_product || 'whatsapp',
      recipient_type: 'individual',
      to: dto.to,
      type: dto.type || 'template',
      template: {
        name: dto.template.name,
        language: {
          code: dto.template.language.code,
        },
        components,
      },
    };
  }

  /**
   * Verify webhook (for Meta verification)
   */
  verifyWebhook(
    mode: string,
    token: string,
    challenge: string,
  ): string | { error: string } {
    const webhookVerifyToken = this.configService.get<string>(
      'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
    );

    if (mode === 'subscribe' && token === webhookVerifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }

    this.logger.warn('Webhook verification failed');
    return { error: 'Verification failed' };
  }

  /**
   * Send an interactive message with buttons
   */
  async sendInteractiveMessage(
    dto: SendWhatsAppInteractiveDto,
  ): Promise<WhatsAppMessageResponse> {
    this.logger.log(`Preparing to send interactive message to ${dto.to}`);

    if (dto.interactive.action.buttons.length > 3) {
      throw new HttpException(
        'Maximum 3 buttons allowed for interactive messages',
        HttpStatus.BAD_REQUEST,
      );
    }

    const message = {
      messaging_product: dto.messaging_product || 'whatsapp',
      recipient_type: 'individual',
      to: dto.to,
      type: dto.type || 'interactive',
      interactive: {
        type: dto.interactive.type,
        body: {
          text: dto.interactive.body.text,
        },
        action: {
          buttons: dto.interactive.action.buttons.map((button) => ({
            type: button.type,
            reply: {
              id: button.reply.id,
              title: button.reply.title,
            },
          })),
        },
      },
    };

    try {
      const response = await this.axiosInstance.post(
        `/${this.phoneNumberId}/messages`,
        message,
      );

      const messageId = response.data?.messages?.[0]?.id;
      this.logger.log(
        `Interactive message sent successfully. Message ID: ${messageId}`,
      );

      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      this.logger.error(`Failed to send interactive message: ${errorMsg}`);

      throw new HttpException(
        {
          message: 'Failed to send WhatsApp interactive message',
          error: error.response?.data?.error || error.message,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(body: WhatsAppWebhookInput): Promise<{ status: string }> {
    try {
      // Extract messages from webhook data structure
      const messages = body.data.messages || [];

      // Process incoming messages
      for (const message of messages) {
        this.logger.log(
          `Received message from ${message.from}: ${message.type}`,
        );

        if (message.type === 'text' && message.text) {
          await this.handleTextMessage(message.from, message.text.body);
        } else if (
          message.type === 'interactive' &&
          message.interactive?.button_reply
        ) {
          await this.handleInteractiveReply(
            message.from,
            message.interactive.button_reply.id,
          );
        }
      }

      return { status: 'success' };
    } catch (error: any) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      // Return success anyway to prevent Meta from retrying
      return { status: 'error' };
    }
  }

  getMeetingIdFromMessage(message: string): string | null {
    if (!message) return null;

    // Match any sequence of digits
    const match = message.match(/\d+/);

    // console.log(match[0]);

    return match ? match[0] : null;
  }

  /**
   * Handle text messages - extract meeting ID and send link with interactive message
   */
  private async handleTextMessage(from: string, text: string) {
    try {
      // Extract meeting ID from text (e.g., "Give link to meeting 12345")
      // console.log(text);
      const meetingId = this.getMeetingIdFromMessage(text);
      if (!meetingId) {
        this.logger.debug(
          `No meeting ID found in message from ${from}: ${text}`,
        );
        return;
      }
      this.logger.log(
        `Extracted meeting ID ${meetingId} from message: ${text}`,
      );

      // Find meeting by meeting_id
      const { data: meeting, error: meetingError } = await this.supabaseAdmin
        .from('meetings')
        .select('id, link, meeting_id, send_not_interested, topic')
        .eq('meeting_id', meetingId)
        .single();

      if (meetingError || !meeting) {
        this.logger.warn(`Meeting with meeting_id ${meetingId} not found`);
        return;
      }

      // Check if send_not_interested is false
      if (meeting.send_not_interested === true) {
        this.logger.debug(
          `Meeting ${meetingId} has send_not_interested=true, skipping`,
        );
        return;
      }

      // Find user by phone number (try with and without +)
      let user = null;

      // Try with + prefix
      const { data: userWithPlus } = await this.supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('phone', `+${from}`)
        .single();

      if (userWithPlus) {
        user = userWithPlus;
      } else {
        // Try without + prefix
        const { data: userWithoutPlus } = await this.supabaseAdmin
          .from('users')
          .select('id, email')
          .eq('phone', from)
          .single();

        if (userWithoutPlus) {
          user = userWithoutPlus;
        }
      }

      if (!user) {
        this.logger.warn(`User with phone ${from} not found`);
        return;
      }

      // Send meeting link as text message
      const meetingLinkMessage = `Here's your meeting link: ${meeting.link}`;
      await this.sendTextMessage(from, meetingLinkMessage);

      // Send interactive message with attendance buttons
      const buttonIdPrefix = `${meeting.meeting_id}:${user.id}`;
      await this.sendAttendanceInteractiveMessage(from, buttonIdPrefix);
    } catch (error: any) {
      this.logger.error(
        `Error handling text message: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle interactive button replies - update meeting engagement interest
   */
  private async handleInteractiveReply(from: string, buttonId: string) {
    try {
      // Parse button ID format: "meetingid:userid:ATTEND_REPLY_YES"
      const parts = buttonId.split(':');
      if (parts.length !== 3) {
        this.logger.warn(`Invalid button ID format: ${buttonId}`);
        return;
      }

      const [meetingId, userId, replyType] = parts;

      // Check if reply type is valid
      if (
        !replyType.includes('ATTEND_REPLY_YES') &&
        !replyType.includes('ATTEND_REPLY_NO') &&
        !replyType.includes('ATTEND_REPLY_MAYBE')
      ) {
        this.logger.debug(`Unknown reply type: ${replyType}`);
        return;
      }

      // Map reply type to interest value
      let interest: 'yes' | 'no' | 'maybe' = 'yes';
      if (replyType.includes('ATTEND_REPLY_NO')) {
        interest = 'no';
      } else if (replyType.includes('ATTEND_REPLY_MAYBE')) {
        interest = 'maybe';
      }

      // Find meeting by meeting_id
      const { data: meeting, error: meetingError } = await this.supabaseAdmin
        .from('meetings')
        .select('id')
        .eq('meeting_id', meetingId)
        .single();

      if (meetingError || !meeting) {
        this.logger.warn(`Meeting with meeting_id ${meetingId} not found`);
        return;
      }

      // Find user to get email
      const { data: user } = await this.supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (!user) {
        this.logger.warn(`User with id ${userId} not found`);
        return;
      }

      // Update meeting engagement (using meeting.id from database, not meeting_id)
      const { error: updateError } = await this.supabaseAdmin
        .from('meeting_engagements')
        .update({ interested: interest })
        .eq('meeting_id', meeting.id)
        .eq('user_id', userId)
        .eq('user_email', user.email);

      if (updateError) {
        this.logger.error(
          `Failed to update meeting engagement: ${updateError.message}`,
        );
      } else {
        this.logger.log(
          `Updated engagement for user ${userId}, meeting ${meeting.id} to ${interest}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Error handling interactive reply: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Send a text message
   */
  private async sendTextMessage(to: string, text: string): Promise<void> {
    try {
      const message = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          body: text,
        },
      };

      await this.axiosInstance.post(`/${this.phoneNumberId}/messages`, message);
      this.logger.log(`Sent text message to ${to}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send text message: ${error.response?.data?.error?.message || error.message}`,
      );
      throw error;
    }
  }

  /**
   * Send interactive message with attendance buttons
   */
  private async sendAttendanceInteractiveMessage(
    to: string,
    buttonIdPrefix: string,
  ): Promise<void> {
    try {
      const message = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: 'Will you be attending the meet?',
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: `${buttonIdPrefix}:ATTEND_REPLY_YES`,
                  title: 'Yes',
                },
              },
              {
                type: 'reply',
                reply: {
                  id: `${buttonIdPrefix}:ATTEND_REPLY_NO`,
                  title: 'No',
                },
              },
              {
                type: 'reply',
                reply: {
                  id: `${buttonIdPrefix}:ATTEND_REPLY_MAYBE`,
                  title: 'Maybe',
                },
              },
            ],
          },
        },
      };

      await this.axiosInstance.post(`/${this.phoneNumberId}/messages`, message);
      this.logger.log(`Sent attendance interactive message to ${to}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send interactive message: ${error.response?.data?.error?.message || error.message}`,
      );
      throw error;
    }
  }
}
