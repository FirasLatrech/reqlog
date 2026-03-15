"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_js_1 = require("./app.module.js");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_js_1.AppModule);
    await app.listen(3000);
    console.log('NestJS app running on http://localhost:3000');
    console.log('reqlog dashboard on http://localhost:9000');
}
bootstrap();
//# sourceMappingURL=main.js.map