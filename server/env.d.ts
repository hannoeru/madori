/// <reference path="../worker-configuration.d.ts" />

declare module 'h3' {
  interface H3EventContext {
    cloudflare?: {
      request: Request
      env: CloudflareEnv
      context: ExecutionContext
    }
  }
}

export {}
