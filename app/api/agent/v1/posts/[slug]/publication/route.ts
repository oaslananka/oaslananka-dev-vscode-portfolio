import { eq } from 'drizzle-orm';

import { AgentNotFoundError } from '@/lib/agent-api/response';
import { parsePublicationPatch } from '@/lib/agent-api/proposals';
import { agentWrite } from '@/lib/agent-api/write';
import { setPostPublication } from '@/lib/content-management/mutations';
import { posts } from '@/lib/db/schema';
import { isCanonicalSlug } from '@/lib/slug-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Publication is separate from ordinary content PATCH and requires human approval. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  return agentWrite(request, async (patch, revision, scope) => {
    const { slug } = await params;
    if (!isCanonicalSlug(slug)) throw new AgentNotFoundError();
    const desired = parsePublicationPatch(patch);
    const [current] = await scope.database.select({ id: posts.id })
      .from(posts).where(eq(posts.slug, slug)).limit(1);
    if (!current) throw new AgentNotFoundError();
    await setPostPublication(current.id, slug, desired, revision, scope);
  });
}
