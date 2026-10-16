import { getAdminProfile } from '@/lib/admin/data';
import { eq } from 'drizzle-orm';
import { profile as profileTable } from '@/lib/db/schema';
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
  return agentWrite(request, async (patch, revision, scope) => {
    const [current] = await scope.database.select().from(profileTable)
      .where(eq(profileTable.id, 1)).limit(1);
    if (!current) throw new AgentNotFoundError();
    await saveProfileContent(parseAgentProfileInput(patch, current), revision, scope);
  });
}
