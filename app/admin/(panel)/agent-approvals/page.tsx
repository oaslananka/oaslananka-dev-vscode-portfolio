import { and, desc, eq, gt } from 'drizzle-orm';

import ApprovalFieldReview from '@/components/admin/ApprovalFieldReview';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { agentContentProposals } from '@/lib/db/schema';
import { validateProposal } from '@/lib/agent-api/proposals';
import { isPersistentProposalExpiry } from '@/lib/agent-api/proposal-expiration';
import { isAgentWriteConfigured } from '@/lib/agent-api/write-policy';
import { approveProposal, rejectProposal } from './actions';
import styles from '@/styles/Admin.module.css';
import review from '@/styles/ApprovalReview.module.css';

export const dynamic = 'force-dynamic';

function proposalLabel(resource: string, revision: number): string {
  if (revision === 0 && resource === '/api/agent/v1/projects') return 'New private project draft';
  if (revision === 0 && resource === '/api/agent/v1/posts') return 'New private article draft';
  if (resource.endsWith('/publication')) return 'Publication change';
  return 'Content update';
}

export default async function AgentApprovalsPage() {
  await requireAuth();

  const configured = isAgentWriteConfigured({
    AGENT_CONTENT_WRITE_ENABLED: process.env.AGENT_CONTENT_WRITE_ENABLED,
    AGENT_API_SECRET_KEY: process.env.AGENT_API_SECRET_KEY,
    AGENT_API_WRITE_KEY: process.env.AGENT_API_WRITE_KEY,
    AGENT_WRITE_ACTOR_ID: process.env.AGENT_WRITE_ACTOR_ID,
  });

  const pending = db && configured
    ? await db.select().from(agentContentProposals)
      .where(and(eq(agentContentProposals.status, 'pending'),
        gt(agentContentProposals.expiresAt, new Date())))
      .orderBy(desc(agentContentProposals.createdAt)).limit(50)
    : [];

  const proposals = await Promise.all(pending.map(async (item) => {
    try {
      const { current } = await validateProposal(
        item.resource, item.expectedRevision, item.patch,
      );
      return { item, current, valid: true };
    } catch {
      return { item, current: {} as Record<string, unknown>, valid: false };
    }
  }));

  return (
    <div className={review.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>AI change approvals</h1>
        <p className={styles.subtitle}>
          Review the readable preview and exact request before authorizing changes.
          Approving a private draft does not publish it.
        </p>
      </header>
      {!configured && (
        <div className={styles.notice}>
          Agent content writes are disabled. No approval requests can be accepted until
          the separate controlled rollout is authorized.
        </div>
      )}
      {configured && proposals.length === 0 && (
        <div className={styles.card}>
          <p className={styles.subtitle}>No pending AI content changes.</p>
        </div>
      )}
      {proposals.map(({ item, current, valid }) => {
        const title = typeof item.patch.title === 'string' && item.patch.title
          ? item.patch.title : item.resource;
        return (
          <section className={[styles.card, review.proposal].join(' ')} key={item.requestId}>
            <div className={review.proposalHeader}>
              <div>
                <p className={review.eyebrow}>{proposalLabel(item.resource, item.expectedRevision)}</p>
                <h2 className={review.proposalTitle}>{title}</h2>
              </div>
              <span className={review.badge}>Owner review required</span>
            </div>
            <div className={review.details}>
              <span>Agent: <strong>{item.actorId}</strong></span>
              <span>Revision: <strong>{item.expectedRevision}</strong></span>
              <span>Requested: {item.createdAt.toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</span>
              <span>{isPersistentProposalExpiry(item.expiresAt)
                ? 'Does not expire' : `Expires: ${item.expiresAt.toLocaleString('en-GB', { timeZone: 'UTC' })} UTC`}</span>
              <code>{item.resource}</code>
            </div>
            {!valid && (
              <div className={[styles.notice, review.rejectedNotice].join(' ')}>
                This request is stale or invalid. It cannot be approved.
              </div>
            )}
            <ApprovalFieldReview patch={item.patch} current={current} />
            <div className={review.actionBar}>
              <form action={rejectProposal}>
                <input type="hidden" name="requestId" value={item.requestId} />
                <input type="hidden" name="confirmation" value="reviewed" />
                <button type="submit" className={styles.button}>Reject</button>
              </form>
              <form action={approveProposal} className={review.approveForm}>
                <input type="hidden" name="requestId" value={item.requestId} />
                <label className={review.confirmLabel}>
                  <input type="checkbox" name="confirmation" value="reviewed" required />
                  <span>I reviewed the exact changes above.</span>
                </label>
                <button type="submit" className={[styles.button, styles.buttonPrimary].join(' ')} disabled={!valid}>
                  Approve this change
                </button>
              </form>
            </div>
          </section>
        );
      })}
    </div>
  );
}
