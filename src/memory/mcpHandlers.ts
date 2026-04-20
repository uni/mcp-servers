import { randomUUID } from 'node:crypto';

import type { Request, Response } from 'express';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { KnowledgeGraphManager } from './knowledgeGraphManager.js';
import { InMemoryEventStore } from './inMemoryEventStore.js';
import { getMcpServer } from './mcpServer.js';
import { ensureMemoryFilePath } from './utils.js';

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

export const getAllTransports = (): { [sessionId: string]: StreamableHTTPServerTransport } => transports;

export const closeTransport = async (sessionId: string) => {
  await transports[sessionId]!.close();
};

export const deleteTransport = (sessionId: string) => {
  delete transports[sessionId];
};

const handleSessionRequest = async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (!sessionId) {
    res.status(400).send('Missing session ID');
    return;
  }

  if (!transports[sessionId]) {
    res.status(404).send('Session not found');
    return;
  }

  return sessionId;
};

export const mcpPostHandler = async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (sessionId) {
    console.log(`Received MCP request for session: ${sessionId}`);
  } else {
    console.log('Request body:', req.body);
  }

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      const eventStore = new InMemoryEventStore();

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        eventStore, // Enable resumability
        onsessioninitialized: sessionId => {
          // Store the transport by session ID when session is initialized
          // This avoids race conditions where requests might come in before the session is stored
          console.log(`Session initialized with ID: ${sessionId}`);
          transports[sessionId] = transport;
        }
      });

      // Set up onclose handler to clean up transport when closed
      transport.onclose = () => {
        const sid = transport.sessionId;

        if (sid && transports[sid]) {
          console.log(`Transport closed for session ${sid}, removing from transports map`);
          delete transports[sid];
        }
      };

      const MEMORY_FILE_PATH = await ensureMemoryFilePath();
      const knowledgeGraphManager = new KnowledgeGraphManager(MEMORY_FILE_PATH);

      const server = getMcpServer(knowledgeGraphManager);
      await server.connect(transport);

      await transport.handleRequest(req, res, req.body);
      return;
    } else if (sessionId) {
      res.status(404).json({
        jsonrpc: '2.0',
        error: { code: -32_001, message: 'Session not found' },
        id: null
      });
      return;
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32_000, message: 'Bad Request: Session ID required' },
        id: null
      });
      return;
    }

    // Handle the request with existing transport - no need to reconnect
    // The existing transport is already connected to the server
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32_603,
          message: 'Internal server error'
        },
        id: null
      });
    }
  }
};

export const mcpGetHandler = async (req: Request, res: Response) => {
  const sessionId = await handleSessionRequest(req, res);

  if (!sessionId) {
    return;
  }

  // Check for Last-Event-ID header for resumability
  const lastEventId = req.headers['last-event-id'] as string | undefined;

  if (lastEventId) {
    console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
  } else {
    console.log(`Establishing new SSE stream for session ${sessionId}`);
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

export const mcpDeleteHandler = async (req: Request, res: Response) => {
  const sessionId = await handleSessionRequest(req, res);

  if (!sessionId) {
    return;
  }

  console.log(`Received session termination request for session ${sessionId}`);

  try {
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('Error handling session termination:', error);

    if (!res.headersSent) {
      res.status(500).send('Error processing session termination');
    }
  }
};
