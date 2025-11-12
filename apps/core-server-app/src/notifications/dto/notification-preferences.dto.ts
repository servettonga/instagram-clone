import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO for updating notification preferences
 * Matches UpdateNotificationPreferencesDto in @repo/shared-types
 * but includes validation decorators for NestJS
 */
export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  followWeb?: boolean;

  @IsOptional()
  @IsBoolean()
  likeWeb?: boolean;

  @IsOptional()
  @IsBoolean()
  commentWeb?: boolean;

  @IsOptional()
  @IsBoolean()
  replyWeb?: boolean;

  @IsOptional()
  @IsBoolean()
  mentionWeb?: boolean;

  @IsOptional()
  @IsBoolean()
  followEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  likeEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  commentEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  replyEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  mentionEmail?: boolean;
}
