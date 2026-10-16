import { eq } from 'drizzle-orm';

import { AgentNotFoundError, agentRead } from '@/lib/agent-api/response';
import { agentWrite } from '@/lib/agent-api/write';
import { saveProjectContent } from '@/lib/content-management/mutations';
import { parseAgentProjectInput } from '@/lib/content-management/json-input';
import { db } from '@/lib/db';
import { isCanonicalSlug } from '@/lib/slug-policy';
import { projects } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  return agentRead(request, async () => {
    const { slug } = await params;
    if (!isCanonicalSlug(slug)) throw new AgentNotFoundError();
    const rows = await db!.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!rows[0]) throw new AgentNotFoundError();
    return rows[0];
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  return agentWrite(request, async (patch, revision) => {
    const { slug } = await params;
    if (!isCanonicalSlug(slug)) throw new AgentNotFoundError();
    const [current] = await db!.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!current) throw new AgentNotFoundError();
    await saveProjectContent(parseAgentProjectInput(patch, current), current.id, revision);
  });
}
