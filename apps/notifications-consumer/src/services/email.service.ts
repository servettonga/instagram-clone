import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { getConfig } from "../config/app.config";
import { NotificationUser } from "@repo/shared-types";
import { Notification } from "@prisma/client";

/**
 * Email delivery service using Nodemailer with Gmail SMTP
 *
 * Configures and manages the SMTP transport for sending emails.
 * Uses Gmail as the SMTP provider with app-specific password.
 *
 * Initialized once on startup and reused for all email sends.
 * Handles errors gracefully without crashing the consumer.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;

  constructor(private readonly logger: Logger) {}

  onModuleInit(): void {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const config = getConfig();
    const mailConfig = config.mailConfig;

    this.transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.port === 465, // true for 465, false for other ports
      auth: {
        user: mailConfig.user,
        pass: mailConfig.password,
      },
    });

    this.logger.log("Email transporter initialized");
  }

  /**
   * Send a generic email with custom HTML content
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      const config = getConfig();
      const mailConfig = config.mailConfig;

      await this.transporter.sendMail({
        from: `"Innogram" <${mailConfig.from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    } catch (error) {
      this.logger.error("Error sending email", error);
      throw error;
    }
  }

  async sendNotificationEmail(
    user: NotificationUser,
    notification: Notification,
  ): Promise<void> {
    try {
      const config = getConfig();
      const mailConfig = config.mailConfig;
      const frontendUrl = config.frontendUrl;

      const displayName = user.profile?.displayName || user.username || "User";

      const htmlContent = this.generateEmailHtml(
        displayName,
        notification,
        frontendUrl,
      );

      await this.transporter.sendMail({
        from: `"Innogram" <${mailConfig.from}>`,
        to: user.email,
        subject: notification.title,
        html: htmlContent,
      });

      this.logger.log(
        `Email sent to ${user.email} for notification ${notification.id}`,
      );
    } catch (error) {
      this.logger.error("Error sending email", error);
      throw error;
    }
  }

  private generateEmailHtml(
    displayName: string,
    notification: Notification,
    frontendUrl: string,
  ): string {
    const notificationUrl = `${frontendUrl}/notifications`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${notification.title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #6366f1;
              margin-bottom: 10px;
            }
            .title {
              font-size: 20px;
              font-weight: 600;
              color: #111;
              margin-bottom: 15px;
            }
            .message {
              font-size: 16px;
              color: #555;
              margin-bottom: 25px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #6366f1;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
            }
            .button:hover {
              background-color: #4f46e5;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e5e5;
              font-size: 14px;
              color: #888;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Innogram</div>
            </div>
            <div class="content">
              <div class="title">Hi ${displayName},</div>
              <div class="message">${notification.message}</div>
              <div style="text-align: center;">
                <a href="${notificationUrl}" class="button">View Notification</a>
              </div>
            </div>
            <div class="footer">
              <p>You're receiving this email because you have notifications enabled.</p>
              <p>© ${new Date().getFullYear()} Innogram. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
