import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log('NestJS app running on http://localhost:3000');
  console.log('reqlog dashboard on http://localhost:9000');
}

bootstrap();
