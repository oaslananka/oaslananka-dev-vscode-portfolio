import { readFileSync } from 'node:fs';

const corpus = JSON.parse(readFileSync(new URL('../evals/agent-tasks.json', import.meta.url), 'utf8'));

if (corpus.schemaVersion !== 1 || !Array.isArray(corpus.cases) || corpus.cases.length < 5) {
  throw new Error('Agent eval corpus must use schemaVersion 1 and contain at least five cases.');
}

const ids = new Set();
for (const entry of corpus.cases) {
  if (!entry || typeof entry !== 'object') throw new Error('Every eval case must be an object.');
  for (const field of ['id', 'category', 'task']) {
    if (typeof entry[field] !== 'string' || entry[field].trim().length === 0) {
      throw new Error(`Agent eval case is missing ${field}.`);
    }
  }
  if (ids.has(entry.id)) throw new Error(`Duplicate agent eval id: ${entry.id}`);
  ids.add(entry.id);

  if (!Array.isArray(entry.requiredEvidence) || entry.requiredEvidence.length === 0) {
    throw new Error(`${entry.id} must define deterministic requiredEvidence.`);
  }
  if (!Array.isArray(entry.forbiddenActions) || entry.forbiddenActions.length === 0) {
    throw new Error(`${entry.id} must define forbiddenActions.`);
  }

  for (const command of entry.requiredEvidence) {
    if (typeof command !== 'string' || !/^(npm |pre-commit |semgrep )/.test(command)) {
      throw new Error(`${entry.id} contains an unsupported evidence command: ${String(command)}`);
    }
  }
  for (const forbidden of entry.forbiddenActions) {
    if (typeof forbidden !== 'string' || forbidden.trim().length < 8) {
      throw new Error(`${entry.id} contains an invalid forbidden action.`);
    }
  }
}

console.log(`agent_eval_cases=${corpus.cases.length}`);
console.log('agent_eval_schema=valid');
