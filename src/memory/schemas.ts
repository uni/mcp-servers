import { z } from 'zod';

// Zod schemas for entities and relations
export const EntitySchema = z.object({
  name: z.string().describe('The name of the entity'),
  entityType: z.string().describe('The type of the entity'),
  observations: z.array(z.string()).describe('An array of observation contents associated with the entity')
});

export const RelationSchema = z.object({
  from: z.string().describe('The name of the entity where the relation starts'),
  to: z.string().describe('The name of the entity where the relation ends'),
  relationType: z.string().describe('The type of the relation')
});
