import { Injectable } from "@nestjs/common";
import { NotificationType } from "@repo/shared-types";
import { getConfig } from "../config/app.config";

interface EmailTemplateData {
  actorUsername: string;
  actorId: string;
  entityId?: string;
  entityType?: string;
  postContent?: string;
  commentContent?: string;
  replyContent?: string;
  postImageUrl?: string;
  metadata?: {
    postId?: string;
    [key: string]: unknown;
  };
}

/**
 * Service for generating branded HTML email templates
 *
 * Creates formatted, responsive HTML emails for:
 * - Follow requests and acceptances
 * - Post and comment likes
 * - New comments and replies
 * - Mentions
 */
@Injectable()
export class EmailTemplateService {
  private readonly config = getConfig();
  /**
   * Generate HTML email content based on notification type
   */
  generateEmail(
    type: NotificationType,
    data: EmailTemplateData,
  ): { subject: string; html: string } {
    switch (type) {
      case NotificationType.FOLLOW_REQUEST:
        return this.buildEmail(
          `${data.actorUsername} requested to follow you`,
          "New Follow Request",
          `<strong>${data.actorUsername}</strong> requested to follow you`,
          this.createButton(
            "View Profile",
            `/app/profile/${data.actorUsername}`,
          ),
        );

      case NotificationType.FOLLOW_ACCEPTED:
        return this.buildEmail(
          `${data.actorUsername} accepted your follow request`,
          "Follow Request Accepted!",
          `<strong>${data.actorUsername}</strong> accepted your follow request`,
          this.createButton(
            "View Profile",
            `/app/profile/${data.actorUsername}`,
          ),
        );

      case NotificationType.POST_LIKE:
        return this.buildEmail(
          `${data.actorUsername} liked your post`,
          "New Like on Your Post",
          `<strong>${data.actorUsername}</strong> liked your post`,
          this.createButton("View Post", `/app/post/${data.entityId}`),
          data.postContent,
          data.postImageUrl,
        );

      case NotificationType.COMMENT_LIKE:
        return this.buildEmail(
          `${data.actorUsername} liked your comment`,
          "New Like on Your Comment",
          `<strong>${data.actorUsername}</strong> liked your comment`,
          this.createButton("View Comment", `/app/post/${data.entityId}`),
          data.commentContent,
          data.postImageUrl,
        );

      case NotificationType.POST_COMMENT:
        return this.buildEmail(
          `${data.actorUsername} commented on your post`,
          "New Comment on Your Post",
          `<strong>${data.actorUsername}</strong> commented on your post`,
          this.createButton("View Post", `/app/post/${data.metadata?.postId}`),
          data.commentContent,
          data.postImageUrl,
        );

      case NotificationType.COMMENT_REPLY:
        return this.buildEmail(
          `${data.actorUsername} replied to your comment`,
          "New Reply to Your Comment",
          `<strong>${data.actorUsername}</strong> replied to your comment`,
          this.createButton(
            "View Thread",
            `/app/post/${data.metadata?.postId}`,
          ),
          data.replyContent,
          data.postImageUrl,
        );

      case NotificationType.MENTION: {
        const entityText = data.entityType === "post" ? "a post" : "a comment";
        const linkText = data.entityType === "post" ? "Post" : "Comment";
        return this.buildEmail(
          `${data.actorUsername} mentioned you in ${entityText}`,
          "You Were Mentioned!",
          `<strong>${data.actorUsername}</strong> mentioned you in ${entityText}`,
          this.createButton(
            `View ${linkText}`,
            `/app/${data.entityType}s/${data.entityId}`,
          ),
        );
      }

      default:
        return this.buildEmail(
          "New Notification",
          "New Notification",
          `You have a new notification from ${data.actorUsername}`,
        );
    }
  }

  /**
   * Build a complete email with consistent structure
   */
  private buildEmail(
    subject: string,
    heading: string,
    message: string,
    button?: string,
    content?: string,
    postImageUrl?: string,
  ): { subject: string; html: string } {
    const contentBlock = content
      ? `<div style="background-color: #f5f5f5; border-left: 4px solid #0066FF; padding: 16px; margin: 16px 0; border-radius: 4px;">
           <p style="color: #666; margin: 0; font-size: 14px;">${content.startsWith('"') ? content : `"${content}"`}</p>
         </div>`
      : "";

    // Prepend frontend URL to image path if it's relative
    const absoluteImageUrl =
      postImageUrl && !postImageUrl.startsWith("http")
        ? `${this.config.frontendUrl}${postImageUrl}`
        : postImageUrl;

    const thumbnailBlock = absoluteImageUrl
      ? `<div style="margin: 16px 0;">
           <img src="${absoluteImageUrl}"
                alt="Post thumbnail"
                style="max-width: 200px; height: auto; border-radius: 8px; display: block;" />
         </div>`
      : "";

    const bodyContent = `
      <div style="padding: 20px 0;">
        <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">
          ${heading}
        </h2>
        <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          ${message}
        </p>
        ${thumbnailBlock}
        ${contentBlock}
        ${button || ""}
      </div>
    `;

    return {
      subject,
      html: this.baseTemplate(subject, bodyContent),
    };
  }

  /**
   * Create a styled action button
   */
  private createButton(text: string, path: string): string {
    return `
      <table cellpadding="0" cellspacing="0" style="margin: 24px 0;">
        <tr>
          <td style="background-color: #0066FF; border-radius: 8px; padding: 12px 24px;">
            <a href="${process.env.CLIENT_URL}${path}" style="color: #ffffff; text-decoration: none; font-weight: 600;">
              ${text}
            </a>
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Base HTML email template with Innogram branding
   */
  private baseTemplate(title: string, bodyContent: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 24px 32px; border-top: 1px solid #e5e5e5;">
              <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 0 0 8px 0; text-align: center;">
                You're receiving this email because you have notifications enabled for this type of activity.
              </p>
              <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                <a href="${process.env.CLIENT_URL}/app/settings/notifications" style="color: #0066FF; text-decoration: none;">
                  Manage notification preferences
                </a> |
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
