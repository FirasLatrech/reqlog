import Fastify from 'fastify';
import { reqlogPlugin } from 'reqlog-fastify';

const app = Fastify();

await app.register(reqlogPlugin, { port: 9000 });

app.get('/api/users', async () => {
  return { users: ['alice', 'bob', 'carol'] };
});

app.post('/api/login', async (req) => {
  const { username } = req.body as { username?: string };
  if (!username) {
    return { error: 'username required' };
  }
  return { token: 'abc123', user: username };
});

app.get('/health', async () => {
  return { status: 'ok' };
});

await app.listen({ port: 3000 });
console.log('Fastify app running on http://localhost:3000');
console.log('reqlog dashboard on http://localhost:9000');
