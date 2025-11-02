export class SuggestedUserDto {
  id!: string;
  username!: string;
  displayName!: string;
  avatarUrl?: string | null;
  followersCount!: number;
}
