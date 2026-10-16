import { eq } from 'drizzle-orm';

import { AgentNotFoundError, agentRead } from '@/lib/agent-api/response';
import { agentWrite } from '@/lib/agent-api/write';
import { savePostContent } from '@/lib/content-management/mutations';
import { parseAgentPostInput } from '@/lib/content-management/json-input';
import { rejectImplicitPublication, AgentWriteInputError } from '@/lib/agent-api/write-policy';
import { db } from '@/lib/db';
import { isCanonicalSlug } from '@/lib/slug-policy';
import { posts } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  return agentRead(request, async () => {
    const { slug } = await params;
    if (!isCanonicalSlug(slug)) throw new AgentNotFoundError();
    const rows = await db!.select().from(posts).where(eq(posts.slug, slug)).limit(1);
    if (!rows[0]) throw new AgentNotFoundError();
    return rows[0];
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  return agentWrite(request, async (patch, revision, scope) => {
    const { slug } = await params;
    if (!isCanonicalSlug(slug)) throw new AgentNotFoundError();
    rejectImplicitPublication(patch);
    const [current] = await scope.database.select().from(posts).where(eq(posts.slug, slug)).limit(1);
    if (!current) throw new AgentNotFoundError();
    if (current.published) {
      throw new AgentWriteInputError(403, 'Editing a published article requires the separate publication workflow.');
    }
    await savePostContent(parseAgentPostInput(patch, current), current.id, revision, scope);
  });
}
