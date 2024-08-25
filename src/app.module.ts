import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { NftModule } from './nft/nft.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', '.env.local'],
    }),
    NftModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
