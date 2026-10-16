import { eq } from 'drizzle-orm';

import { AgentNotFoundError, agentRead } from '@/lib/agent-api/response';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  return agentRead(request, async () => {
    const { slug } = await params;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new AgentNotFoundError();
    const rows = await db!.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!rows[0]) throw new AgentNotFoundError();
    return rows[0];
  });
}
