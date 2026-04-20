import 'dotenv/config';

import cors from 'cors';
import type { Express } from 'express';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';

import { authMiddleware, createRequestLogger } from './utils.js';
import { closeTransport, deleteTransport, getAllTransports, mcpDeleteHandler, mcpGetHandler, mcpPostHandler } from './mcpHandlers.js';

const CONFIG = {
  host: process.env.HOST || 'localhost',
  port: Number(process.env.PORT) || 3000,
  mcpPath: process.env.MCP_PATH || '/mcp'
};
const mcpServerUrl = new URL(`http://${CONFIG.host}:${CONFIG.port}`);

const app: Express = createMcpExpressApp();

app.use(
  cors({
    origin: '*', // WARNING: This allows all origins to access the MCP server. In production, you should restrict this to specific origins.
    exposedHeaders: ['WWW-Authenticate', 'Mcp-Session-Id', 'Last-Event-Id', 'Mcp-Protocol-Version']
  })
);

app.use(createRequestLogger());

app.post(CONFIG.mcpPath, authMiddleware, mcpPostHandler);
app.get(CONFIG.mcpPath, authMiddleware, mcpGetHandler);
app.delete(CONFIG.mcpPath, authMiddleware, mcpDeleteHandler);

app.listen(CONFIG.port, CONFIG.host, (error: any) => {
  if (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }

  console.log(`🚀 MCP Server running on ${mcpServerUrl.origin}`);
  console.log(`📡 MCP endpoint available at ${mcpServerUrl.origin}${CONFIG.mcpPath}`);
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');

  // Close all active transports to properly clean up resources
  for (const sessionId in getAllTransports()) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      await closeTransport(sessionId);
      deleteTransport(sessionId);
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }

  console.log('Server shutdown complete');
  process.exit(0);
});
