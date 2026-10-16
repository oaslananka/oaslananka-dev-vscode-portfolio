import { getAdminSettings } from '@/lib/admin/data';
import { eq } from 'drizzle-orm';
import { siteSettings as settingsTable } from '@/lib/db/schema';
import { agentRead, AgentNotFoundError } from '@/lib/agent-api/response';
import { agentWrite } from '@/lib/agent-api/write';
import { parseAgentSettingsInput } from '@/lib/content-management/json-input';
import { saveSettingsContent } from '@/lib/content-management/mutations';
import { isThemeKey } from '@/lib/themes';
import { AdminValidationError } from '@/lib/admin/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return agentRead(request, getAdminSettings);
}

export async function PATCH(request: Request): Promise<Response> {
  return agentWrite(request, async (patch, revision, scope) => {
    const [current] = await scope.database.select().from(settingsTable)
      .where(eq(settingsTable.id, 1)).limit(1);
    if (!current) throw new AgentNotFoundError();
    if (!isThemeKey(current.defaultTheme)) throw new AdminValidationError('Unsupported stored theme.');
    const validated = { ...current, defaultTheme: current.defaultTheme };
    await saveSettingsContent(parseAgentSettingsInput(patch, validated), revision, scope);
  });
}
