import { Injectable } from '@nestjs/common';
import { NotificationType } from '@repo/shared-types';

export interface EmailTemplate {
  subject: string;
  html: string;
}

export interface TemplateData {
  actorName: string;
  actorUsername: string;
  actorAvatar?: string;
  recipientName: string;
  entityType?: string;
  entityPreview?: string;
  actionUrl: string;
  frontendUrl: string;
}

@Injectable()
export class EmailTemplateService {
  generateEmail(
    type: NotificationType,
    data: TemplateData,
  ): EmailTemplate | null {
    switch (type) {
      case NotificationType.FOLLOW_REQUEST:
      case NotificationType.FOLLOW_ACCEPTED:
        return this.generateFollowEmail(type, data);
      case NotificationType.POST_LIKE:
        return this.generatePostLikeEmail(data);
      case NotificationType.POST_COMMENT:
        return this.generateCommentEmail(data);
      case NotificationType.COMMENT_REPLY:
        return this.generateReplyEmail(data);
      default:
        return null;
    }
  }

  private generateFollowEmail(
    type: NotificationType,
    data: TemplateData,
  ): EmailTemplate {
    const isRequest = type === NotificationType.FOLLOW_REQUEST;
    const subject = isRequest
      ? `${data.actorName} wants to follow you on Innogram`
      : `${data.actorName} accepted your follow request`;

    const actionText = isRequest ? 'View Profile' : 'View Their Profile';

    const html = this.baseTemplate(
      data,
      `
        <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #111;">
          ${isRequest ? 'New Follow Request' : 'Follow Request Accepted'}
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
          <strong>${data.actorName}</strong> (@${data.actorUsername}) ${isRequest ? 'wants to follow you' : 'accepted your follow request'}.
        </p>
        <div style="text-align: center;">
          <a href="${data.actionUrl}"
             style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white;
                    text-decoration: none; border-radius: 6px; font-weight: 500;">
            ${actionText}
          </a>
        </div>
      `,
    );

    return { subject, html };
  }

  private generatePostLikeEmail(data: TemplateData): EmailTemplate {
    const subject = `${data.actorName} liked your post`;

    const html = this.baseTemplate(
      data,
      `
        <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #111;">
          New Like on Your Post
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
          <strong>${data.actorName}</strong> (@${data.actorUsername}) liked your post.
        </p>
        ${
          data.entityPreview
            ? `
          <div style="margin: 0 0 24px 0; padding: 16px; background-color: #f9fafb;
                      border-radius: 8px; border-left: 3px solid #6366f1;">
            <p style="margin: 0; font-size: 14px; color: #666; font-style: italic;">
              "${data.entityPreview}"
            </p>
          </div>
        `
            : ''
        }
        <div style="text-align: center;">
          <a href="${data.actionUrl}"
             style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white;
                    text-decoration: none; border-radius: 6px; font-weight: 500;">
            View Post
          </a>
        </div>
      `,
    );

    return { subject, html };
  }

  private generateCommentEmail(data: TemplateData): EmailTemplate {
    const subject = `${data.actorName} commented on your post`;

    const html = this.baseTemplate(
      data,
      `
        <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #111;">
          New Comment on Your Post
        </h2>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #555;">
          <strong>${data.actorName}</strong> (@${data.actorUsername}) commented on your post:
        </p>
        ${
          data.entityPreview
            ? `
          <div style="margin: 0 0 24px 0; padding: 16px; background-color: #f9fafb;
                      border-radius: 8px; border-left: 3px solid #6366f1;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              "${data.entityPreview}"
            </p>
          </div>
        `
            : ''
        }
        <div style="text-align: center;">
          <a href="${data.actionUrl}"
             style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white;
                    text-decoration: none; border-radius: 6px; font-weight: 500;">
            View Comment
          </a>
        </div>
      `,
    );

    return { subject, html };
  }

  private generateReplyEmail(data: TemplateData): EmailTemplate {
    const subject = `${data.actorName} replied to your comment`;

    const html = this.baseTemplate(
      data,
      `
        <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #111;">
          New Reply to Your Comment
        </h2>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #555;">
          <strong>${data.actorName}</strong> (@${data.actorUsername}) replied to your comment:
        </p>
        ${
          data.entityPreview
            ? `
          <div style="margin: 0 0 24px 0; padding: 16px; background-color: #f9fafb;
                      border-radius: 8px; border-left: 3px solid #6366f1;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              "${data.entityPreview}"
            </p>
          </div>
        `
            : ''
        }
        <div style="text-align: center;">
          <a href="${data.actionUrl}"
             style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white;
                    text-decoration: none; border-radius: 6px; font-weight: 500;">
            View Reply
          </a>
        </div>
      `,
    );

    return { subject, html };
  }

  private baseTemplate(data: TemplateData, content: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Notification from Innogram</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: white; border-radius: 8px; padding: 40px 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Logo -->
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 28px; font-weight: bold; color: #6366f1;">
                  Innogram
                </div>
              </div>

              <!-- Content -->
              <div>
                <p style="margin: 0 0 24px 0; font-size: 16px; color: #555;">
                  Hi ${data.recipientName},
                </p>
                ${content}
              </div>

              <!-- Footer -->
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #888;">
                  You're receiving this email because you have notifications enabled.
                </p>
                <p style="margin: 0; font-size: 14px; color: #888;">
                  <a href="${data.frontendUrl}/app/settings/notifications"
                     style="color: #6366f1; text-decoration: none;">
                    Manage notification preferences
                  </a>
                </p>
                <p style="margin: 16px 0 0 0; font-size: 12px; color: #aaa;">
                  © ${new Date().getFullYear()} Innogram. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
