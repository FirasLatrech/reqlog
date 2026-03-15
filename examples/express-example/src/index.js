"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_2 = require("@reqlog/express");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, express_2.reqlog)({ port: 9000 }));
app.get('/api/users', (_req, res) => {
    res.json({ users: ['alice', 'bob', 'carol'] });
});
app.post('/api/login', (req, res) => {
    const { username } = req.body;
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
//# sourceMappingURL=index.js.map