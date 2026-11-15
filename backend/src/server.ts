import { app } from './app.js';
import { ENV, assertRuntimeConfiguration } from './config/env.js';
import { connectDB, prisma } from './config/database.js';
import { emailQueue } from './queues/emailQueue.js';

async function bootstrap() {
  try {
    assertRuntimeConfiguration('api');
    console.log('====================================================');
    console.log('   Starting Outbox Labs Email Scheduler API Server  ');
    console.log('====================================================');

    // 1. Establish MySQL Database Connection
    await connectDB();

    // 2. Start HTTP Server. The persistent worker owns queue reconciliation.
    const server = app.listen(ENV.PORT, () => {
      console.log(`[Server] API Server listening on http://localhost:${ENV.PORT}`);
      console.log(`[Server] Environment: ${ENV.NODE_ENV}`);
      console.log(`[Server] Health Check: http://localhost:${ENV.PORT}/api/health`);
    });

    // 4. Graceful Shutdown Handlers
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        try {
          await emailQueue.close();
          await prisma.$disconnect();
          console.log('[Server] Database and Queue connections closed. Exiting process.');
          process.exit(0);
        } catch (err) {
          console.error('[Server] Error during shutdown cleanup:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[Server] Fatal startup failure:', error);
    process.exit(1);
  }
}

bootstrap();
