---
alwaysApply: true
---


Respect the .continueignore file at infra/.continueignore. Never read the following:
- infra/node_modules/ or any node_modules/ directory
- package-lock.json or any lock files (yarn.lock, pnpm-lock.yaml, etc.)
- infra/site/index.html unless the user explicitly asks for it
- dist/, build/, cdk.out/, .cdk.out/, .git/ directories
- Any *.log files

Only work within these directories unless instructed otherwise:
- infra/ (excluding node_modules and generated output)
- infra/lambda/
- Backend documentation (README.md, docs/)

When exploring the project, always use ls or file_glob_search with targeted patterns rather than reading lock files or generated artifacts.
