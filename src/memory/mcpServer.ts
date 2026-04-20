import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { EntitySchema, RelationSchema } from './schemas.js';
import { KnowledgeGraphManager } from './knowledgeGraphManager.js';

export const getMcpServer = (knowledgeGraphManager: KnowledgeGraphManager): McpServer => {
  const server = new McpServer(
    {
      name: 'mcp-memory',
      version: '0.6.3'
    },
    {
      capabilities: { logging: {} }
    }
  );

  server.registerTool(
    'create_entities',
    {
      title: 'Create Entities',
      description: 'Create multiple new entities in the knowledge graph',
      inputSchema: {
        entities: z.array(EntitySchema)
      },
      outputSchema: {
        entities: z.array(EntitySchema)
      }
    },
    async ({ entities }) => {
      const result = await knowledgeGraphManager.createEntities(entities);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { entities: result }
      };
    }
  );

  server.registerTool(
    'create_relations',
    {
      title: 'Create Relations',
      description: 'Create multiple new relations between entities in the knowledge graph. Relations should be in active voice',
      inputSchema: {
        relations: z.array(RelationSchema)
      },
      outputSchema: {
        relations: z.array(RelationSchema)
      }
    },
    async ({ relations }) => {
      const result = await knowledgeGraphManager.createRelations(relations);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { relations: result }
      };
    }
  );

  server.registerTool(
    'add_observations',
    {
      title: 'Add Observations',
      description: 'Add new observations to existing entities in the knowledge graph',
      inputSchema: {
        observations: z.array(
          z.object({
            entityName: z.string().describe('The name of the entity to add the observations to'),
            contents: z.array(z.string()).describe('An array of observation contents to add')
          })
        )
      },
      outputSchema: {
        results: z.array(
          z.object({
            entityName: z.string(),
            addedObservations: z.array(z.string())
          })
        )
      }
    },
    async ({ observations }) => {
      const result = await knowledgeGraphManager.addObservations(observations);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { results: result }
      };
    }
  );

  server.registerTool(
    'delete_entities',
    {
      title: 'Delete Entities',
      description: 'Deletes multiple entities and their associated relations from the knowledge graph',
      inputSchema: {
        entityNames: z.array(z.string()).describe('An array of entity names to delete')
      },
      outputSchema: {
        success: z.boolean(),
        message: z.string()
      }
    },
    async ({ entityNames }) => {
      await knowledgeGraphManager.deleteEntities(entityNames);

      return {
        content: [{ type: 'text' as const, text: 'Entities deleted successfully' }],
        structuredContent: { success: true, message: 'Entities deleted successfully' }
      };
    }
  );

  server.registerTool(
    'delete_observations',
    {
      title: 'Delete Observations',
      description: 'Deletes specific observations from entities in the knowledge graph',
      inputSchema: {
        deletions: z.array(
          z.object({
            entityName: z.string().describe('The name of the entity containing the observations'),
            observations: z.array(z.string()).describe('An array of observations to delete')
          })
        )
      },
      outputSchema: {
        success: z.boolean(),
        message: z.string()
      }
    },
    async ({ deletions }) => {
      await knowledgeGraphManager.deleteObservations(deletions);

      return {
        content: [{ type: 'text' as const, text: 'Observations deleted successfully' }],
        structuredContent: { success: true, message: 'Observations deleted successfully' }
      };
    }
  );

  server.registerTool(
    'delete_relations',
    {
      title: 'Delete Relations',
      description: 'Deletes multiple relations from the knowledge graph',
      inputSchema: {
        relations: z.array(RelationSchema).describe('An array of relations to delete')
      },
      outputSchema: {
        success: z.boolean(),
        message: z.string()
      }
    },
    async ({ relations }) => {
      await knowledgeGraphManager.deleteRelations(relations);

      return {
        content: [{ type: 'text' as const, text: 'Relations deleted successfully' }],
        structuredContent: { success: true, message: 'Relations deleted successfully' }
      };
    }
  );

  server.registerTool(
    'read_graph',
    {
      title: 'Read Graph',
      description: 'Read the entire knowledge graph',
      inputSchema: {},
      outputSchema: {
        entities: z.array(EntitySchema),
        relations: z.array(RelationSchema)
      }
    },
    async () => {
      const graph = await knowledgeGraphManager.readGraph();

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(graph, null, 2) }],
        structuredContent: { ...graph }
      };
    }
  );

  server.registerTool(
    'search_nodes',
    {
      title: 'Search Nodes',
      description: 'Search for nodes in the knowledge graph based on a query',
      inputSchema: {
        query: z.string().describe('The search query to match against entity names, types, and observation content')
      },
      outputSchema: {
        entities: z.array(EntitySchema),
        relations: z.array(RelationSchema)
      }
    },
    async ({ query }) => {
      const graph = await knowledgeGraphManager.searchNodes(query);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(graph, null, 2) }],
        structuredContent: { ...graph }
      };
    }
  );

  server.registerTool(
    'open_nodes',
    {
      title: 'Open Nodes',
      description: 'Open specific nodes in the knowledge graph by their names',
      inputSchema: {
        names: z.array(z.string()).describe('An array of entity names to retrieve')
      },
      outputSchema: {
        entities: z.array(EntitySchema),
        relations: z.array(RelationSchema)
      }
    },
    async ({ names }) => {
      const graph = await knowledgeGraphManager.openNodes(names);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(graph, null, 2) }],
        structuredContent: { ...graph }
      };
    }
  );

  return server;
};
