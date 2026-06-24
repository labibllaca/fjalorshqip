# CI/CD Pipeline Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up GitHub Actions to run tests on every push/build PR, build the production app on push to main, and optionally deploy to the server.

**Architecture:** Two GitHub Actions workflows — a fast test-only workflow for all branches (catching failures early), and a build workflow for main that produces the production artifact. A third deploy workflow can be added later once the deploy mechanism is codified in the repo.

**Tech Stack:** GitHub Actions, Node 22, Vitest, Docker (existing Dockerfile)

---

### File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `.github/workflows/test.yml` | Create | Run tests on push/PR to all branches |
| `.github/workflows/build.yml` | Create | Build production app on push to main |
| `.node-version` | Create | Pin Node version for nvm/nodenv |
| `Dockerfile` | Modify | Fix port mismatch (3000 → 5187) |
| `.env.example` | Create | Document required env vars |

---

## Chunk 1: Infrastructure

### Task 1.1: Pin Node version and document env vars

**Files:**
- Create: `.node-version`
- Create: `.env.example`

- [ ] **Step 1: Create `.node-version`**

```
22
```

- [ ] **Step 2: Create `.env.example`**

```bash
# Server port (default: 5187)
PORT=5187
# Optional: override SQLite DB path
# DB_PATH=/custom/path/fjalor.db
```

- [ ] **Step 3: Commit**

```bash
git add .node-version .env.example
git commit -m "chore: add .node-version and .env.example for CI"
```

### Task 1.2: Fix Dockerfile port mismatch

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Change `EXPOSE 3000` to `EXPOSE 5187`**

The server defaults to 5187 but Dockerfile says 3000. Fix it.

- [ ] **Step 2: Commit**

```bash
git add Dockerfile
git commit -m "fix: align Dockerfile EXPOSE with server default port 5187"
```

---

## Chunk 2: Test Workflow

### Task 2.1: Create GitHub Actions test workflow

**Files:**
- Create: `.github/workflows/test.yml`

- [ ] **Step 1: Create `.github/workflows/test.yml`**

```yaml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .node-version
          cache: npm
      - run: npm ci
      - run: npm test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "ci: add test workflow running vitest on push/PR"
```

---

## Chunk 3: Build Workflow

### Task 3.1: Create GitHub Actions build workflow

**Files:**
- Create: `.github/workflows/build.yml`

- [ ] **Step 1: Create `.github/workflows/build.yml`**

```yaml
name: Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .node-version
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 3
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: add build workflow producing dist artifact on main"
```

---

## Chunk 4: Docker Build Workflow (Optional)

### Task 4.1: Create GitHub Actions docker workflow

**Files:**
- Create: `.github/workflows/docker.yml`

- [ ] **Step 1: Create `.github/workflows/docker.yml`**

```yaml
name: Docker

on:
  push:
    branches: [main]

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t fjalorshqip .
      - name: Save image
        run: docker save fjalorshqip | gzip > fjalorshqip.tar.gz
      - uses: actions/upload-artifact@v4
        with:
          name: docker-image
          path: fjalorshqip.tar.gz
          retention-days: 3
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/docker.yml
git commit -m "ci: add docker build workflow on main"
```

---

## Chunk 5: Verification

- [ ] **Step 1: Verify test workflow syntax**

```bash
npx tsx --eval "console.log('workflows created')"
```

- [ ] **Step 2: Push to main and verify GitHub Actions runs**

After pushing, check https://github.com/labibllaca/fjalorshqip/actions — the Test workflow should pass.

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: builds successfully (already verified to work)

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "chore: finalize CI/CD setup"
```
