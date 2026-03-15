export declare class AppController {
    getUsers(): {
        users: string[];
    };
    login(body: {
        username?: string;
    }): {
        error: string;
        token?: undefined;
        user?: undefined;
    } | {
        token: string;
        user: string;
        error?: undefined;
    };
    health(): {
        status: string;
    };
}
//# sourceMappingURL=app.controller.d.ts.map