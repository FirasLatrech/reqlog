import {
  Module,
  DynamicModule,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { ReqlogMiddleware } from './reqlog.middleware.js';
import type { ReqlogOptions } from '@reqlog/core';

export const REQLOG_OPTIONS = 'REQLOG_OPTIONS';

@Module({})
export class ReqlogModule implements NestModule {
  static forRoot(options: ReqlogOptions = {}): DynamicModule {
    return {
      module: ReqlogModule,
      providers: [
        { provide: REQLOG_OPTIONS, useValue: options },
        ReqlogMiddleware,
      ],
      exports: [ReqlogMiddleware],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ReqlogMiddleware).forRoutes('*');
  }
}
