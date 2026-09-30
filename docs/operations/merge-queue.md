# Merge queue operations

The repository uses Mergify with GitHub branch protection as the source of truth for merge gates.

## Queue model

The queue is configured for serial, single-pull-request processing:

- `merge_queue.mode: serial`
- `merge_queue.max_parallel_checks: 1`
- `queue_rules[*].batch_size: 1`
- `queue_rules[*].max_checks_retries: 0`
- squash merge

This keeps queue validation on the original pull request instead of relying on speculative batch pull requests.

## Automatic queueing

Non-draft pull requests targeting `main` are submitted to the `default` queue automatically.

Mergify reads the active GitHub branch protections and rulesets and applies those requirements to queue processing. Required check names are intentionally not duplicated in `.mergify.yml`, which avoids configuration drift between GitHub and Mergify.

## Protection policy

Do not weaken branch protection to make the queue progress.

If a pull request cannot enter or leave the queue:

1. confirm the pull request is not a draft and targets `main`;
2. resolve all review threads;
3. inspect the Mergify queue check and activity log for the failing injected condition;
4. fix the pull request, queue configuration, or CI source of the failure;
5. preserve the GitHub-required checks and ruleset requirements.

A configuration change to `.mergify.yml` must pass Mergify's `Configuration changed` check before it is merged.
