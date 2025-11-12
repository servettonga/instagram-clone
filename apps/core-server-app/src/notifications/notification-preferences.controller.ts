import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';
import { AccessGuard } from '../auth/guards/access.guard';
import type { AuthenticatedRequest } from '@repo/shared-types';

/**
 * REST API controller for managing user notification preferences
 *
 * Allows users to configure which notifications they want to receive
 * via web (in-app) and email for different notification types:
 * - Follow requests/acceptances
 * - Post/comment likes
 * - Comments and replies
 * - Mentions
 */
@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications/preferences')
@UseGuards(AccessGuard)
export class NotificationPreferencesController {
  constructor(
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user notification preferences' })
  async getPreferences(@Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return this.preferencesService.getPreferences(req.user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update user notification preferences' })
  async updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    if (!req.user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return this.preferencesService.updatePreferences(req.user.id, dto);
  }
}
