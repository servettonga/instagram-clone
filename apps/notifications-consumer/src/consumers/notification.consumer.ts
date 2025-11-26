import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "../services/rabbitmq.service";
import { NotificationService } from "../services/notification.service";
import { EmailService } from "../services/email.service";
import { EmailTemplateService } from "../templates/email-template.service";
import { RABBITMQ_QUEUES, NotificationPayload } from "@repo/shared-types";

interface PasswordResetPayload {
  type: "password_reset";
  email: string;
  username: string;
  resetUrl: string;
}

/**
 * Main consumer that processes notification events from RabbitMQ
 *
 * Listens to the notifications queue and for each message:
 * 1. Saves web notification to database (if sendWeb=true in payload)
 * 2. Sends email notification (if sendEmail=true in payload)
 *
 * User preferences are checked by the PRODUCER before publishing to queue.
 * This prevents unnecessary queue messages and consumer processing.
 *
 * Runs as a standalone microservice separate from core-server-app.
 * Ensures notification processing doesn't block main API operations.
 */
@Injectable()
export class NotificationConsumer implements OnModuleInit {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    private readonly emailTemplate: EmailTemplateService,
    private readonly logger: Logger,
  ) {}

  async onModuleInit() {
    // Start consuming when app starts
    await this.startConsuming();
  }

  private async startConsuming(): Promise<void> {
    this.logger.log("Starting notification consumer...");

    // Listen to 'notifications' queue
    await this.rabbitMQService.consume(
      RABBITMQ_QUEUES.NOTIFICATIONS,
      async (content: NotificationPayload) => this.handleNotification(content),
    );

    this.logger.log("✓ Notification consumer started");
  }

  private async handleNotification(
    payload: NotificationPayload | PasswordResetPayload,
  ): Promise<void> {
    try {
      // Handle password reset emails separately (no database storage, just email)
      if (this.isPasswordResetPayload(payload)) {
        await this.handlePasswordResetEmail(payload);
        return;
      }

      // 1. Save web notification to database (if enabled in producer)
      let notification: { id: string } | null = null;
      if (payload.sendWeb !== false) {
        // Default to true if not specified (for backward compatibility)
        notification =
          await this.notificationService.createNotification(payload);
      }

      // 2. Send email notification (if enabled in producer)
      if (payload.sendEmail === true) {
        try {
          const user = await this.notificationService.getUserWithProfile(
            payload.userId,
          );

          if (user && user.email) {
            // Get enriched notification data (including thumbnail and avatar)
            const { notificationData } =
              await this.notificationService.enrichNotificationData(payload);

            // Generate email content from template
            const { subject, html } = this.emailTemplate.generateEmail(
              payload.type,
              {
                actorUsername: payload.metadata?.actorUsername as string,
                actorId: payload.actorId || "",
                entityId: payload.entityId,
                entityType: payload.entityType,
                postImageUrl: notificationData.postImageUrl as
                  | string
                  | undefined,
                metadata: payload.metadata,
              },
            );

            await this.emailService.sendEmail({
              to: user.email,
              subject,
              html,
            });

            // Mark notification as email sent (if web notification was created)
            if (notification) {
              await this.notificationService.markEmailSent(notification.id);
            }
          } else {
            this.logger.warn(
              `User ${payload.userId} not found or has no email`,
            );
          }
        } catch (emailError) {
          this.logger.error(
            `Failed to send email: ${emailError instanceof Error ? emailError.message : String(emailError)}`,
          );
          // Don't throw - we still want to acknowledge the message
        }
      }
    } catch (error) {
      this.logger.error("Error handling notification", error);
      throw error; // This will trigger message requeue
    }
  }

  /**
   * Type guard for password reset payloads
   */
  private isPasswordResetPayload(
    payload: NotificationPayload | PasswordResetPayload,
  ): payload is PasswordResetPayload {
    return (payload as PasswordResetPayload).type === "password_reset";
  }

  /**
   * Handle password reset email - separate flow without database storage
   */
  private async handlePasswordResetEmail(payload: {
    email: string;
    username: string;
    resetUrl: string;
  }): Promise<void> {
    try {
      this.logger.log(`Sending password reset email to ${payload.email}`);

      const subject = "Reset Your Innogram Password";
      const html = this.generatePasswordResetEmail(
        payload.username,
        payload.resetUrl,
      );

      await this.emailService.sendEmail({
        to: payload.email,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error; // Trigger requeue for retry
    }
  }

  /**
   * Generate HTML for password reset email
   */
  private generatePasswordResetEmail(
    username: string,
    resetUrl: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0066FF; padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                Innogram
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <div style="padding: 20px 0;">
                <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">
                  Reset Your Password
                </h2>
                <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
                  Hi <strong>${username}</strong>,
                </p>
                <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
                  We received a request to reset the password for your Innogram account. Click the button below to create a new password:
                </p>
                
                <table cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                  <tr>
                    <td style="background-color: #0066FF; border-radius: 8px; padding: 14px 32px;">
                      <a href="${resetUrl}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                </table>

                <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 24px 0; border-radius: 4px;">
                  <p style="color: #856404; margin: 0; font-size: 14px; font-weight: 600;">
                    ⚠️ This link expires in 1 hour
                  </p>
                  <p style="color: #856404; margin: 8px 0 0 0; font-size: 14px;">
                    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                  </p>
                </div>

                <p style="color: #999; font-size: 14px; line-height: 1.5; margin: 24px 0 0 0;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="color: #0066FF; font-size: 12px; word-break: break-all; margin: 8px 0 0 0;">
                  ${resetUrl}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 24px 32px; border-top: 1px solid #e5e5e5;">
              <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 0 0 8px 0; text-align: center;">
                This is an automated security email from Innogram.
              </p>
              <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                <a href="${process.env.CLIENT_URL}/app/feed" style="color: #0066FF; text-decoration: none;">
                  Visit Innogram
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
