'use server';

import { and, eq, gt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { agentContentProposals } from '@/lib/db/schema';
import { validateProposal } from '@/lib/agent-api/proposals';
import { parseAgentIdempotencyKey } from '@/lib/agent-api/write-policy';

async function decide(form: FormData, decision: 'approved' | 'rejected'): Promise<void> {
  await requireAuth();
  if (!db) throw new Error('Content unavailable.');
  const id = form.get('requestId');
  const confirmation = form.get('confirmation');
  if (typeof id !== 'string') throw new Error('Missing request ID.');
  const requestId = parseAgentIdempotencyKey(id);

  if (confirmation !== 'reviewed') throw new Error('Explicit review required.');
  const [pending] = await db.select().from(agentContentProposals)
    .where(and(eq(agentContentProposals.requestId, requestId),
      eq(agentContentProposals.status, 'pending'),
      gt(agentContentProposals.expiresAt, new Date()))).limit(1);
  if (!pending) throw new Error('Proposal expired or already decided.');

  if (decision === 'approved') {
    await validateProposal(pending.resource, pending.expectedRevision, pending.patch);
  }
  const [result] = await db.update(agentContentProposals)
    .set({ status: decision, decidedAt: new Date() })
    .where(and(eq(agentContentProposals.requestId, requestId),
      eq(agentContentProposals.status, 'pending'),
      gt(agentContentProposals.expiresAt, new Date())))
    .returning({ requestId: agentContentProposals.requestId });
  if (!result) throw new Error('Proposal was already decided.');
  revalidatePath('/admin/agent-approvals');
}

export async function approveProposal(form: FormData): Promise<void> {
  await decide(form, 'approved');
}

export async function rejectProposal(form: FormData): Promise<void> {
  await decide(form, 'rejected');
}
