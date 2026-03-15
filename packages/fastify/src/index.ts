import fp from 'fastify-plugin';
import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  HookHandlerDoneFunction,
} from 'fastify';
import { ReqlogServer, createInterceptor } from '@reqlog/core';
import type { ReqlogOptions, InterceptorRequest, InterceptorResponse } from '@reqlog/core';

export const reqlogPlugin = fp(
  async (fastify: FastifyInstance, options: ReqlogOptions) => {
    const server = new ReqlogServer(options);
    await server.start();
    const intercept = createInterceptor(server, options);

    fastify.addHook(
      'onRequest',
      (
        request: FastifyRequest,
        reply: FastifyReply,
        done: HookHandlerDoneFunction
      ) => {
        intercept(request.raw as InterceptorRequest, reply.raw as InterceptorResponse, (err?: unknown) => done(err as Error | undefined));
      }
    );
  },
  { name: 'reqlog' }
);

export type { ReqlogOptions } from '@reqlog/core';
