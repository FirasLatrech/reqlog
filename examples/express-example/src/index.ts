import express from 'express';
import { reqlog } from '@reqlog/express';

const app = express();

app.use(express.json());
app.use(reqlog({ port: 9000 }));

app.get('/api/users', (_req, res) => {
  res.json({ users: ['alice', 'bob', 'carol'] });
});

app.post('/api/login', (req, res) => {
  const { username } = req.body as { username?: string };
  if (!username) {
    res.status(400).json({ error: 'username required' });
    return;
  }
  res.status(201).json({ token: 'abc123', user: username });
});

app.get('/api/slow', async (_req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 350));
  res.json({ message: 'this was slow', took: 350 });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => {
  console.log('App running on http://localhost:3000');
  console.log('reqlog dashboard on http://localhost:9000');
});
