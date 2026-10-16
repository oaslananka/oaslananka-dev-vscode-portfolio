import { and, desc, eq, gt } from 'drizzle-orm';

import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { agentContentProposals } from '@/lib/db/schema';
import { validateProposal } from '@/lib/agent-api/proposals';
import { isAgentWriteConfigured } from '@/lib/agent-api/write-policy';
import { approveProposal, rejectProposal } from './actions';
import styles from '@/styles/Admin.module.css';

export const dynamic = 'force-dynamic';

function display(value: unknown): string {
  if (value === undefined) return '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
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
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>AI change approvals</h1>
        <p className={styles.subtitle}>
          Review each requested content change before allowing the agent to apply it.
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
      {proposals.map(({ item, current, valid }) => (
        <section className={styles.card} key={item.requestId} style={{ marginBottom: 20 }}>
          <h2 style={{ marginTop: 0, overflowWrap: 'anywhere' }}>{item.resource}</h2>
          <p className={styles.subtitle}>
            Agent: <strong>{item.actorId}</strong> · Existing revision: {item.expectedRevision}
          </p>
          <p className={styles.subtitle}>
            Requested {item.createdAt.toLocaleString('en-GB', { timeZone: 'UTC' })} UTC ·
            Expires {item.expiresAt.toLocaleString('en-GB', { timeZone: 'UTC' })} UTC
          </p>
          {!valid && (
            <div className={styles.notice}>
              This request is stale or invalid. It cannot be approved.
            </div>
          )}
          {Object.entries(item.patch).map(([field, next]) => (
            <div key={field} style={{ marginBottom: 14 }}>
              <strong>{field}</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginTop: 6 }}>
                <div>
                  <span className={styles.subtitle}>Current</span>
                  <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 180, overflowY: 'auto', fontSize: 13 }}>
                    {display(current[field])}
                  </pre>
                </div>
                <div>
                  <span className={styles.subtitle}>Proposed</span>
                  <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 180, overflowY: 'auto', fontSize: 13 }}>
                    {display(next)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <form action={approveProposal}>
              <input type="hidden" name="requestId" value={item.requestId} />
              <label style={{ display: 'block', marginBottom: 8 }}>
                <input type="checkbox" name="confirmation" value="reviewed" required />{' '}
                I reviewed the exact changes above.
              </label>
              <button className={[styles.button, styles.buttonPrimary].join(' ')} disabled={!valid}>
                Approve this change
              </button>
            </form>
            <form action={rejectProposal}>
              <input type="hidden" name="requestId" value={item.requestId} />
              <input type="hidden" name="confirmation" value="reviewed" />
              <button className={styles.button}>Reject</button>
            </form>
          </div>
        </section>
      ))}
    </>
  );
}
