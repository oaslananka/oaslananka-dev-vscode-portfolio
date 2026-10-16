import { getAdminProjects } from '@/lib/admin/data';
import { agentRead } from '@/lib/agent-api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return agentRead(request, getAdminProjects);
}
