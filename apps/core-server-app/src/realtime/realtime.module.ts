import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './gateways/chat.gateway';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { SocketManagerService } from './services/socket-manager.service';
import { AuthModule } from '../auth/auth.module';
import { ChatsModule } from '../chats/chats.module';
import { ChatEventsModule } from './chat-events.module';

@Module({
  imports: [
    // Import AuthModule to use AuthService for token validation
    AuthModule,

    // Import ChatsModule for ChatsService/MessagesService used by ChatGateway
    ChatsModule,

    // Provide ChatEventsService without creating circular dependency
    ChatEventsModule,

    // Import JwtModule for token verification in WsAuthGuard
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_ACCESS_SECRET') || 'default-secret',
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRES_IN') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ChatGateway, WsAuthGuard, SocketManagerService, Logger],
  exports: [SocketManagerService],
})
export class RealtimeModule {}
