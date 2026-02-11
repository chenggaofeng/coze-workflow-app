declare global {
  interface CloudflareEnv {
    DB: D1Database;
    COZE_API_KEY?: string;
    JWT_SECRET?: string;
  }
}

export {};
