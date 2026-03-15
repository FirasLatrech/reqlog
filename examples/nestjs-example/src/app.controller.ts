import { Controller, Get, Post, Body } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('/api/users')
  getUsers() {
    return { users: ['alice', 'bob', 'carol'] };
  }

  @Post('/api/login')
  login(@Body() body: { username?: string }) {
    if (!body.username) {
      return { error: 'username required' };
    }
    return { token: 'abc123', user: body.username };
  }

  @Get('/health')
  health() {
    return { status: 'ok' };
  }
}
