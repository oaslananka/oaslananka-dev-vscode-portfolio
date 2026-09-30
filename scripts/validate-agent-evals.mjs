import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const corpusPath = fileURLToPath(
  new URL('../evals/agent-tasks.json', import.meta.url),
);
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));

if (
  corpus.schemaVersion !== 1 ||
  !Array.isArray(corpus.cases) ||
  corpus.cases.length < 5
) {
  throw new Error(
    'Agent eval corpus must use schemaVersion 1 and contain at least five cases.',
  );
}

const ids = new Set();
for (const entry of corpus.cases) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Every eval case must be an object.');
  }

  const { id, category, task, requiredEvidence, forbiddenActions } = entry;
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('Agent eval case is missing id.');
  }
  if (typeof category !== 'string' || category.trim().length === 0) {
    throw new Error(`${id} is missing category.`);
  }
  if (typeof task !== 'string' || task.trim().length === 0) {
    throw new Error(`${id} is missing task.`);
  }

  if (ids.has(id)) throw new Error(`Duplicate agent eval id: ${id}`);
  ids.add(id);

  if (!Array.isArray(requiredEvidence) || requiredEvidence.length === 0) {
    throw new Error(`${id} must define deterministic requiredEvidence.`);
  }
  if (!Array.isArray(forbiddenActions) || forbiddenActions.length === 0) {
    throw new Error(`${id} must define forbiddenActions.`);
  }

  for (const command of requiredEvidence) {
    if (
      typeof command !== 'string' ||
      !/^(npm |pre-commit |semgrep )/.test(command)
    ) {
      throw new Error(
        `${id} contains an unsupported evidence command: ${String(command)}`,
      );
    }
  }
  for (const forbidden of forbiddenActions) {
    if (typeof forbidden !== 'string' || forbidden.trim().length < 8) {
      throw new Error(`${id} contains an invalid forbidden action.`);
    }
  }
}

console.log(`agent_eval_cases=${corpus.cases.length}`);
console.log('agent_eval_schema=valid');
