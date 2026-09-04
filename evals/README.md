# Agent acceptance corpus

`agent-tasks.json` is a small deterministic corpus for repository-agent evaluation. Each case defines a representative task, the evidence that must be produced, and actions that are prohibited even if they would make a check pass.

Run:

```bash
npm run test:agent-evals
```

The validator checks the corpus shape, unique case identifiers, deterministic evidence commands, and explicit forbidden actions. `npm run verify` includes this validation.

This is the feed-forward/acceptance layer, not a claim that an LLM agent has achieved a measured success rate. To measure agent quality, execute the cases with the candidate agent, record whether the required evidence actually passed without a forbidden action, and report `verified_successes / attempted_cases`. Store only redacted task/evidence metadata; never store credentials or production data in eval fixtures.
