import { getAdminPosts } from '@/lib/admin/data';
import { agentRead } from '@/lib/agent-api/response';
import { agentWrite } from '@/lib/agent-api/write';
import { parseAgentDraftPostInput } from '@/lib/content-management/json-input';
import { savePostContent } from '@/lib/content-management/mutations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return agentRead(request, getAdminPosts);
}

/** Create only a private draft, after review in /admin/agent-approvals. */
export async function POST(request: Request): Promise<Response> {
  return agentWrite(request, async (body, _revision, scope) => {
    await savePostContent(parseAgentDraftPostInput(body), undefined, undefined, scope);
  }, { createDraft: true });
}
