import { Module } from '@nestjs/common';
import { ReqlogModule } from 'reqlog-nestjs';
import { AppController } from './app.controller.js';

@Module({
  imports: [ReqlogModule.forRoot({ port: 9000 })],
  controllers: [AppController],
})
export class AppModule {}
