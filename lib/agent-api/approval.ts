import { createHash, randomUUID } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';

import { getSecretKey } from '@/lib/auth-edge';
import { AgentWriteInputError } from './write-policy';

export interface AgentApprovalSubject {
  actorId: string;
  requestId: string;
  resource: string;
  revision: number;
  patch: Record<string, unknown>;
}

const APPROVAL_ISSUER = 'oaslananka.dev';
const APPROVAL_AUDIENCE = 'portfolio-agent-content-write';
const APPROVAL_TTL_SECONDS = 180;

export function approvalFingerprint(subject: AgentApprovalSubject): string {
  return createHash('sha256')
    .update(JSON.stringify([
      subject.actorId,
      subject.requestId,
      subject.resource,
      subject.revision,
      subject.patch,
    ]))
    .digest('hex');
}

/** Only call from an authenticated, deliberately confirmed admin action. */
export function issueAgentApproval(subject: AgentApprovalSubject): Promise<string> {
  return new SignJWT({ fingerprint: approvalFingerprint(subject) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(APPROVAL_ISSUER)
    .setAudience(APPROVAL_AUDIENCE)
    .setSubject('admin')
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${APPROVAL_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

/** Verify an exact request-specific approval separately from the agent API key. */
export async function verifyAgentApproval(
  token: string | null,
  subject: AgentApprovalSubject,
): Promise<string> {
  if (!token || token.length > 4_096) {
    throw new AgentWriteInputError(403, 'An explicit administrator approval is required.');
  }
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: APPROVAL_ISSUER,
      audience: APPROVAL_AUDIENCE,
      algorithms: ['HS256'],
    });
    if (
      payload.sub !== 'admin' ||
      typeof payload.jti !== 'string' ||
      payload.fingerprint !== approvalFingerprint(subject)
    ) {
      throw new Error('Approval does not match this change.');
    }
    return payload.jti;
  } catch {
    throw new AgentWriteInputError(403, 'Approval missing, expired, or does not match this change.');
  }
}
