# Jelu Deployment Notes

## Infrastructure Overview

### Hosts & Containers

| Host/IP | Container | Purpose |
|---------|-----------|---------|
| Proxmox Node (192.168.1.12) | - | Runtime data, backups |
| LXC 101 (docker) | - | Build environment, Docker host |
| LXC 201 | - | Backup source |

### Directory Structure

| Path | Location | Purpose |
|------|----------|---------|
| `/opt/jelu/` | LXC 101 | Dev/Build environment - source code, Gradle build |
| `/root/jelu/` | LXC 101 | **Runtime data** - DB, config, images |
| `/root/jelu/database/jelu.db` | LXC 101 | SQLite database |
| `/root/jelu/config/` | LXC 101 | Configuration |
| `/root/jelu/files/images/` | LXC 101 | Book cover images |
| `/root/jelu/files/imports/` | LXC 101 | Import files |

### Docker Container Mounts

Container `jelu` mounts:
- `/database` → `/root/jelu/database`
- `/config` → `/root/jelu/config`
- `/files/images` → `/root/jelu/files/images`
- `/files/imports` → `/root/jelu/files/imports`

## Build & Deployment Workflow

### WICHTIGE REGELN

**NIEMALS** lokal oder auf LXC kompilieren!
- Immer nur auf GitHub pushen
- GitHub Actions baut alles automatisch
- Lokales Bauen führt zu Build-Fehlern (Caching-Probleme)

**Immer clean bauen:**
- Vor jedem `./gradlew` → `./gradlew clean` ausführen
- npm Cache leeren: `rm -rf src/jelu-ui/node_modules/.vite`
- Build mit: `JAVA_HOME=/usr/local/opt/openjdk@17 ./gradlew npmBuild copyWebDist processResources`

### CRITICAL: Never Delete the Database!

**Wrong way (DANGEROUS):**
```bash
docker rm -f jelu && docker run ...
```


## Push & Test Build Workflow

### CI Tests (Automatic on Push)

Pushing to any branch triggers `ci.yml`:
- Runs `./gradlew build` (includes tests)
- Runs `./gradlew npmBuild` (frontend build check)
- Results visible in GitHub Actions tab

```bash
# Push changes to trigger CI tests
git push origin frontend-refactor

# Check CI status
# Visit: https://github.com/fabian1512/jelu/actions
```

### Docker Image Build (Automatic on Push)

Pushing to `main`, `test`, or `frontend-refactor` triggers `docker-publish.yml`:
- Builds Docker image with JDK 21
- Pushes to `ghcr.io/fabian1512/jelu` with tags:
  - `main` → `latest`
  - `frontend-refactor` → `test`, `frontend-refactor`, and SHA

```bash
# Push to trigger Docker build
git push origin frontend-refactor

# Image will be available at:
# ghcr.io/fabian1512/jelu:frontend-refactor
# ghcr.io/fabian1512/jelu:test
```

### Local Pre-Push Checks

```bash
# Run tests locally before pushing (requires JDK 21)
cd /Users/Roman/Opencode/jelu
./gradlew build

# Or with Java 17 (as noted in Current Status)
JAVA_HOME=/usr/local/opt/openjdk@17 ./gradlew build
```

### Database Backup/Restore

**Backup** (before any risky operation):
```bash
cp /root/jelu/database/jelu.db /root/jelu/database/jelu.db.$(date +%Y%m%d_%H%M%S)
```

**Restore from LXC 201 backup:**
```bash
# On Proxmox Node:
# Copy from LXC 201 to /tmp on Node
pct exec 201 -- cat /root/jelu/database/jelu.db > /tmp/jelu.db

# In LXC 101: first delete old, then copy
pct exec 101 -- rm /opt/jelu/data/jelu.db
pct exec 101 -- sh -c "cat > /opt/jelu/data/jelu.db" < /tmp/jelu.db
```

Or using the correct paths:
```bash
# LXC 201 -> Node
pct exec 201 -- cat /root/jelu/database/jelu.db > /tmp/jelu.db

# Node -> LXC 101 (ensure directory exists first)
pct exec 101 -- mkdir -p /root/jelu/database
pct exec 101 -- sh -c "cat > /root/jelu/database/jelu.db" < /tmp/jelu.db
```

## Java Version Notes

- **LXC 101** has Java 21 installed (no Java 17)
- **Docker base image** uses Java 21: `eclipse-temurin:21-jre-noble`
- Build requires `jvmToolchain(21)` and `jvmTarget = JVM_21` in `build.gradle.kts`

### Build Configuration Changes Made

In `/opt/jelu/build.gradle.kts`:
- Changed `jvmToolchain(17)` → `java.toolchain.languageVersion.set(JavaLanguageVersion.of(21))`
- Changed `jvmTarget = JVM_17` → `jvmTarget = JVM_21`
- Added task dependency:
  ```kotlin
  tasks.named("processResources") {
      dependsOn("copyWebDist")
  }
  ```

In `/opt/jelu/Dockerfile`:
- Changed base image: `eclipse-temurin:17-jre-noble` → `eclipse-temurin:21-jre-noble`

## Git / Fork Information

- **Upstream**: github.com/jelu/jelu
- **User Fork**: github.com/fabian1512/jelu
- **Branch (remote)**: main
- **Branch (development)**: `frontend-refactor`

## Fixes Applied

1. **iOS barcode scanning**: Added ZXing fallback for EAN barcodes
2. **Author search**: Added "author" to LuceneEntity.Book.defaultFields
3. **Edit button visibility**: Removed `sm:hidden` class in BookDetail.vue
4. **Review card size**: Changed `card-sm` to `card-normal` in ReviewCard.vue
5. **Tag/Author deletion**: `BookRepository.kt` lines 1044/1097 - changed `isNotEmpty()` → `!= null` so clearing all tags/authors works
6. **Filter sidebar typography/spacing**: Unified label structure (`div.field > span.label-text`), reduced margins (`my-2`→`my-1`, `mb-2`→`mb-1`, `gap-2`→`gap-1.5`), removed scoped CSS overrides (`label.label { font-weight: bold }`, negative margins in RandomList.vue), fixed nested `div.field` for "random" sort

## Development Workflow

### Local Development Steps

1. **Make changes** in local repository `/Users/Roman/Opencode/jelu`
2. **Test locally** - run build:
   ```bash
   cd /Users/Roman/Opencode/jelu
   JAVA_HOME=/usr/local/opt/openjdk@17 ./gradlew build
   # or just frontend:
   JAVA_HOME=/usr/local/opt/openjdk@17 ./gradlew npmBuild copyWebDist processResources
   ```
3. **If successful** - commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin frontend-refactor
   ```
4. **GitHub CI/CD** automatically runs:
   - `ci.yml` - runs tests and npmBuild
   - `docker-publish.yml` - builds and pushes Docker image

### Files Changed in This Session

1. **NEW**: `SearchResultsModal.vue` - Suchergebnis-Modal
2. **MODIFIED**: `AutoImportFormModal.vue` - Scan→EditBookModal, fetchMetadata→SearchResultsModal
3. **MODIFIED**: `EditBookModal.vue` - Kompaktes Status/Eigenschaften Div
4. **MODIFIED**: `en.json`, `de.json` - Neue Übersetzungen

## Current Status

- **Container**: Running on LXC 101 (docker) — image: `jelu-ios-scan-test`, port: 11111
- **GitHub**: Branch `frontend-refactor`, commit `bf8481a` pushed — CI/CD will build Docker image
- **Database**: /root/jelu/database/jelu.db on Proxmox Node
- **Working directory (local)**: `/Users/Roman/Opencode/jelu` — build with `JAVA_HOME=/usr/local/opt/openjdk@17 ./gradlew build`
