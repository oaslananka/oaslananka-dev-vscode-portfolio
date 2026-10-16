import { getAdminProfile } from '@/lib/admin/data';
import { agentRead, AgentNotFoundError } from '@/lib/agent-api/response';
import { agentWrite } from '@/lib/agent-api/write';
import { parseAgentProfileInput } from '@/lib/content-management/json-input';
import { saveProfileContent } from '@/lib/content-management/mutations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return agentRead(request, getAdminProfile);
}

export async function PATCH(request: Request): Promise<Response> {
  return agentWrite(request, async (patch, revision) => {
    const current = await getAdminProfile();
    if (!current) throw new AgentNotFoundError();
    await saveProfileContent(parseAgentProfileInput(patch, current), revision);
  });
}
