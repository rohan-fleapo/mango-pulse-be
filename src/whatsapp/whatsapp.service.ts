import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  SendWhatsAppInteractiveDto,
  SendWhatsAppTemplateDto,
} from './dto/send-message.dto';
import { WhatsAppWebhookDto } from './dto/webhook.dto';
import { WhatsAppMessageResponse } from './interfaces/whatsapp.interface';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly phoneNumberId: string;
  private readonly apiVersion = 'v21.0';

  constructor(private configService: ConfigService) {
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
    this.logger.log(
      `Preparing to send interactive message to ${dto.to}`,
    );

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
  async handleWebhook(body: WhatsAppWebhookDto): Promise<{ status: string }> {
    try {
      // Process each entry in the webhook
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const { value } = change;

          // Process incoming messages
          if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
              this.logger.log(
                `Received message from ${message.from}: ${message.type}`,
              );
              // TODO: Add your business logic here
              // - Store message in database
              // - Trigger automated responses
              // - Update user engagement metrics
              // - Process button replies
            }
          }

          // Process status updates
          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              this.logger.log(`Message ${status.id} status: ${status.status}`);
              // TODO: Add your business logic here
              // - Update message delivery status in database
              // - Track engagement metrics
              // - Handle failed messages
            }
          }
        }
      }

      return { status: 'success' };
    } catch (error: any) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      // Return success anyway to prevent Meta from retrying
      return { status: 'error' };
    }
  }
}
