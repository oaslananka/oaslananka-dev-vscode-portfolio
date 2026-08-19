import { AGENT_INSTRUCTIONS } from '@/lib/agent-discovery';
import { markdownResponse } from '@/lib/markdown-response';

export const revalidate = 86400;

export async function GET() {
  return markdownResponse(AGENT_INSTRUCTIONS, {
    contentLocation: '/AGENTS.md',
    maxAgeSeconds: 86400,
  });
}
