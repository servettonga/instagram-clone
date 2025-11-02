import { IsIn, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export const SUGGESTION_TYPES = [
  'popular_followers',
  'friends_of_following',
  'most_followers',
] as const;

export type SuggestionType = (typeof SUGGESTION_TYPES)[number];

export class SuggestionsQueryDto {
  @IsOptional()
  @IsIn(SUGGESTION_TYPES)
  type?: SuggestionType = 'most_followers';

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 5;
}
