import fp from 'fastify-plugin';
import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  HookHandlerDoneFunction,
} from 'fastify';
import { ReqlogServer, createInterceptor } from 'reqlog-core';
import type { ReqlogOptions, InterceptorRequest, InterceptorResponse } from 'reqlog-core';

export const reqlogPlugin = fp(
  async (fastify: FastifyInstance, options: ReqlogOptions) => {
    const server = new ReqlogServer(options);
    await server.start();
    const intercept = createInterceptor(server, options);

    fastify.addHook(
      'preHandler',
      (
        request: FastifyRequest,
        reply: FastifyReply,
        done: HookHandlerDoneFunction
      ) => {
        const rawRequest = request.raw as InterceptorRequest;
        rawRequest.body = request.body;
        intercept(
          rawRequest,
          reply.raw as InterceptorResponse,
          (err?: unknown) => done(err as Error | undefined)
        );
      }
    );
  },
  { name: 'reqlog' }
);

export type { ReqlogOptions } from 'reqlog-core';
