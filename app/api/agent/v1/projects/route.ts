import { getAdminProjects } from '@/lib/admin/data';
import { agentRead } from '@/lib/agent-api/response';
import { agentWrite } from '@/lib/agent-api/write';
import { parseAgentDraftProjectInput } from '@/lib/content-management/json-input';
import { saveProjectContent } from '@/lib/content-management/mutations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return agentRead(request, getAdminProjects);
}


/** Create a hidden project draft; public publication is a separate action. */
export async function POST(request: Request): Promise<Response> {
  return agentWrite(request, async (body, _revision, scope) => {
    await saveProjectContent(
      parseAgentDraftProjectInput(body),
      undefined, undefined, { ...scope, createProjectDraft: true },
    );
  }, { createDraft: true });
}
