import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configValidationSchema } from './config.validation';

const envFile =
  process.env.NODE_ENV === 'development' ? '.env' : '.env.production';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `../../${envFile}`,
      validationSchema: configValidationSchema,
    }),
  ],
})
export class ConfigModule {}
