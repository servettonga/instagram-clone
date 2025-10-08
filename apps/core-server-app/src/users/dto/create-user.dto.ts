import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: 'email must be an email' })
  @IsNotEmpty({ message: 'email should not be empty' })
  email: string;

  @ApiProperty({ example: 'john.doe' })
  @IsString({ message: 'username must be a string' })
  @IsNotEmpty({ message: 'username should not be empty' })
  @MaxLength(50, {
    message: 'username must be shorter than or equal to 50 characters',
  })
  username: string;

  // Optional for OAuth users
  @ApiPropertyOptional({ example: 'SecurePass123!', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'password must be at least 6 characters' })
  password?: string;

  // Optional fields - for OAuth or admin-created users
  @ApiProperty({ example: 'John Doe', required: false })
  @IsString({ message: 'displayName must be a string' })
  @IsOptional()
  @MaxLength(100, {
    message: 'displayName must be shorter than or equal to 100 characters',
  })
  displayName?: string;

  @ApiProperty({ example: 'Love photography and travel', required: false })
  @IsString({ message: 'bio must be a string' })
  @IsOptional()
  bio?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsString({ message: 'avatarUrl must be a string' })
  @IsOptional()
  avatarUrl?: string;
}
