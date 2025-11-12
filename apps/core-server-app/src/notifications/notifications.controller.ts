import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationProducerService } from './services/notification-producer.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { AccessGuard } from '../auth/guards/access.guard';
import { NotificationType } from '@repo/shared-types';
import type { AuthenticatedRequest } from '@repo/shared-types';

/**
 * REST API controller for managing user notifications
 *
 * Handles endpoints for:
 * - Fetching user notifications (paginated)
 * - Checking unread notification status
 * - Marking individual notifications as read
 * - Marking all notifications as read
 * - Testing notification system (dev/debug)
 */
@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(AccessGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationProducer: NotificationProducerService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications (paginated)' })
  async getNotifications(
    @Req() req: AuthenticatedRequest,
    @Query() query: NotificationQueryDto,
  ) {
    if (!req.user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return this.notificationsService.getUserNotifications(req.user.id, query);
  }

  @Get('unread/status')
  @ApiOperation({ summary: 'Check if user has unread notifications' })
  async getUnreadStatus(@Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return this.notificationsService.getUnreadStatus(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    if (!req.user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    await this.notificationsService.markAsRead(req.user.id, id);
    return { success: true };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  // Test endpoint to verify notification system
  @Get('test')
  @ApiOperation({
    summary: 'Test notification system (creates a test notification)',
  })
  async testNotification(@Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    await this.notificationProducer.sendNotification({
      userId: req.user.id,
      type: NotificationType.SYSTEM,
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working',
      entityType: 'system',
      entityId: 'test',
      actorId: req.user.id,
      metadata: { test: true, actorUsername: 'System' },
      sendEmail: false,
    });

    return {
      success: true,
      message: 'Test notification sent. Check consumer logs and database.',
    };
  }
}
