import {
  Module,
  DynamicModule,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import type * as http from 'http';
import { ReqlogMiddleware } from './reqlog.middleware.js';
import type { ReqlogOptions } from 'reqlog-core';

export const REQLOG_OPTIONS = 'REQLOG_OPTIONS';

@Module({})
export class ReqlogModule implements NestModule {
  private static options: ReqlogOptions = {};
  private static middleware: ReqlogMiddleware | null = null;

  static forRoot(options: ReqlogOptions = {}): DynamicModule {
    ReqlogModule.options = options;
    ReqlogModule.middleware = null;

    return {
      module: ReqlogModule,
    };
  }

  configure(consumer: MiddlewareConsumer) {
    const middleware =
      ReqlogModule.middleware ?? (ReqlogModule.middleware = new ReqlogMiddleware(ReqlogModule.options));

    consumer
      .apply((req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => {
        middleware.use(req, res, next);
      })
      .forRoutes('*');
  }
}
