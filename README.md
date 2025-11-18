# Dataset Labeling Annotation Studio

A production-ready web-based annotation tool for creating labeled datasets for machine learning and LLM fine-tuning. Features a complete vertical slice implementation with full CRUD operations, validation, error handling, and Docker deployment support.

## Overview

This annotation studio provides a **complete end-to-end workflow** for dataset labeling:
1. **Create projects** with customizable labels and task types
2. **Import data** via JSONL for bulk upload
3. **Annotate items** with keyboard shortcuts for efficiency
4. **Export annotations** in LLM-ready formats
5. **Track progress** with real-time statistics

**Implemented Vertical Slice:**
- ✅ Project Management: Full CRUD (Create, Read, Update, Delete)
- ✅ Item Management: Bulk import and individual item handling
- ✅ Annotation Workflow: Text classification and span labeling
- ✅ Statistics Dashboard: Label distribution and progress tracking
- ✅ Data Export: JSONL format optimized for fine-tuning
- ✅ API Layer: Fully validated REST endpoints with error handling
- ✅ UI Layer: Interactive frontend with keyboard navigation

## Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- React 19

**Backend:**
- Next.js API Routes
- Zod validation
- Centralized error handling

**Database:**
- PostgreSQL 16
- Prisma ORM
- Type-safe queries

**DevOps:**
- Docker & Docker Compose
- Vitest for testing
- Database seeding for demos

## Domain Model

### Core Entities

```
┌─────────────┐       ┌──────────┐       ┌──────────────┐
│   Project   │──────<│   Item   │──────<│  Annotation  │
└─────────────┘       └──────────┘       └──────────────┘
      │                                          │
      │                                          ▼
      │                                   ┌──────────────┐
      │                                   │  Annotator   │
      └───────────────────────────────────└──────────────┘
```

**Project**: Container for annotation work
- `id`, `name`, `taskType`, `labelsJson`
- Task types: `text_classification`, `text_span`, `image_tagging`

**Item**: Data to be annotated
- `id`, `projectId`, `inputText`, `inputMetaJson`
- Supports metadata for tracking sources, categories, etc.

**Annotation**: Labeled data
- `id`, `projectId`, `itemId`, `annotatorId`, `dataJson`
- Flexible JSON format adapts to task type

**Annotator**: User who creates annotations
- `id`, `name`, `externalUserId`
- Optional for anonymous annotation

## Getting Started

### Requirements

- **Node.js** 18+
- **PostgreSQL** 16+ (or use Docker Compose)
- **npm** or **pnpm**

### Setup Steps

#### Option 1: Docker Compose (Recommended)

The fastest way to get started:

```bash
# 1. Clone the repository
git clone <repository-url>
cd dataset-labeling-annotation-studio

# 2. Copy environment file
cp .env.example .env

# 3. Start all services (PostgreSQL + App)
docker compose up

# The app will be available at http://localhost:3000
# Database is automatically migrated and seeded with demo data
```

#### Option 2: Local Development

For active development with hot reload:

```bash
# 1. Install dependencies
npm install

# 2. Configure database
cp .env.example .env
# Edit .env and set your DATABASE_URL

# 3. Run database migrations
npm run db:migrate

# 4. Seed demo data
npm run db:seed

# 5. Start development server
npm run dev

# Open http://localhost:3000
```

### Available Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload

# Building
npm run build        # Production build
npm start            # Run production build

# Database
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:push      # Push schema without migration
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio (DB GUI)
npm run db:reset     # Reset and reseed database

# Testing
npm test             # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run with coverage

# Code Quality
npm run lint         # Lint code
```

## Example Flow: Sentiment Analysis Project

This walkthrough demonstrates the complete vertical slice using the seeded demo data.

### 1. View Projects

Navigate to `http://localhost:3000/projects`

You'll see two demo projects:
- **Customer Review Sentiment Analysis** (text_classification)
- **Named Entity Recognition - News Articles** (text_span)

### 2. Annotate Items

Click "Annotate" on the Sentiment Analysis project:

```
URL: /projects/{id}/annotate

Workflow:
1. Read the review text
2. Select label(s): positive, negative, or neutral
   - Click labels OR use number keys (1, 2, 3)
3. Press Enter or 's' to submit
4. Navigate with arrow keys or 'n'/'p'
5. System auto-advances to next item
```

**Keyboard Shortcuts:**
- `1-9`: Toggle labels
- `Enter` or `s`: Submit annotation
- `n` or `→`: Next item
- `p` or `←`: Previous item

### 3. View Statistics

Click "Stats" to see:
- Total items: 10
- Annotated items: 5 (from seed data)
- Label distribution chart
- Recent annotations
- Export button

### 4. Export Data

Click "Export Annotations (JSONL)":

```jsonl
{
  "input": "This product exceeded my expectations! Absolutely love it.",
  "annotation": {"labels": ["positive"]},
  "metadata": {
    "projectId": "...",
    "projectName": "Customer Review Sentiment Analysis",
    "taskType": "text_classification",
    "itemId": "...",
    "annotationId": "...",
    "annotatedAt": "2024-01-15T10:30:00.000Z",
    "inputMeta": {"source": "review", "category": "electronics"}
  }
}
```

### 5. Import New Items

Click "Import" on any project:

```jsonl
{"inputText": "Great product!", "inputMeta": {"source": "twitter"}}
{"inputText": "Not worth the price.", "inputMeta": {"source": "reddit"}}
```

Paste the JSONL and click "Import Items" - they appear immediately in the annotation interface.

## API Endpoints

All endpoints use **Zod validation** and **centralized error handling**.

### Projects

```typescript
GET    /api/projects              // List all projects
POST   /api/projects              // Create project
GET    /api/projects/[id]         // Get project details
PATCH  /api/projects/[id]         // Update project
DELETE /api/projects/[id]         // Delete project
```

**Create Project Example:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Email Classification",
    "taskType": "text_classification",
    "labels": ["spam", "not_spam"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "name": "Email Classification",
    "taskType": "text_classification",
    "labelsJson": "[\"spam\",\"not_spam\"]",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### Items

```typescript
GET  /api/projects/[id]/items            // List items
POST /api/projects/[id]/items            // Create item
POST /api/projects/[id]/items/import     // Bulk import
```

### Annotations

```typescript
GET  /api/projects/[id]/annotations        // List annotations
POST /api/projects/[id]/annotations        // Create annotation
GET  /api/projects/[id]/annotations/export // Export as JSONL
```

### Error Responses

All errors follow a consistent format:

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "path": "name",
      "message": "Project name is required"
    }
  ]
}
```

Error codes:
- `VALIDATION_ERROR` (400)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `INTERNAL_ERROR` (500)

## Using with LLM Fine-Tuning

### OpenAI Format

Convert exported annotations:

```javascript
// scripts/convert-to-openai.js
const fs = require('fs')
const readline = require('readline')

async function convert(inputFile, outputFile) {
  const rl = readline.createInterface({
    input: fs.createReadStream(inputFile)
  })

  const output = []
  for await (const line of rl) {
    const item = JSON.parse(line)
    output.push({
      messages: [
        { role: "system", content: "Classify the sentiment." },
        { role: "user", content: item.input },
        { role: "assistant", content: item.annotation.labels[0] }
      ]
    })
  }

  fs.writeFileSync(outputFile, output.map(o => JSON.stringify(o)).join('\n'))
}

convert('annotations-export.jsonl', 'openai-format.jsonl')
```

Then fine-tune:
```bash
openai api fine_tuning.jobs.create \
  -t openai-format.jsonl \
  -m gpt-4o-mini
```

### Hugging Face / spaCy

```python
# scripts/load_annotations.py
import json
from sklearn.model_selection import train_test_split

def load_annotations(path):
    data = []
    with open(path) as f:
        for line in f:
            item = json.loads(line)
            data.append({
                'text': item['input'],
                'label': item['annotation']['labels'][0],
                'meta': item['metadata']
            })
    return data

# Load and split
data = load_annotations('annotations-export.jsonl')
train, test = train_test_split(data, test_size=0.2)
print(f"Train: {len(train)}, Test: {len(test)}")
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

Tests cover:
- ✅ Validation schemas (Zod)
- ✅ Error handling
- ✅ API utilities
- 📝 Integration tests (planned)

### Database Management

```bash
# View data in GUI
npm run db:studio

# Create new migration
npm run db:migrate

# Reset everything
npm run db:reset
```

### Project Structure

```
.
├── app/
│   ├── api/                 # API routes
│   │   └── projects/
│   │       ├── route.ts     # List & create projects
│   │       └── [id]/
│   │           ├── route.ts # Get, update, delete project
│   │           ├── items/
│   │           └── annotations/
│   ├── projects/            # UI pages
│   │   ├── page.tsx         # Project list
│   │   └── [id]/
│   │       ├── annotate/    # Main annotation UI
│   │       ├── stats/       # Statistics dashboard
│   │       └── import/      # JSONL import
│   └── layout.tsx
├── lib/
│   ├── prisma.ts            # Prisma client
│   ├── validations.ts       # Zod schemas
│   ├── errors.ts            # Error handling
│   └── __tests__/           # Unit tests
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data
├── Dockerfile
├── docker-compose.yml
└── vitest.config.ts
```

## Deployment

### Docker Production

```bash
# Build image
docker build -t annotation-studio .

# Run with external PostgreSQL
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  annotation-studio
```

### Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variable: `DATABASE_URL`
4. Deploy

**Note:** Run migrations manually on your database before deploying:
```bash
DATABASE_URL="your-production-db-url" npx prisma migrate deploy
```

## Future Extensions

**Phase 3 Priorities:**
- [ ] **Multi-user support** with role-based access control
- [ ] **Inter-annotator agreement** metrics (Cohen's Kappa, Fleiss' Kappa)
- [ ] **Annotation history** and conflict resolution
- [ ] **Image tagging** task type implementation
- [ ] **Active learning** integration for smart item selection
- [ ] **Batch operations** for bulk annotation updates
- [ ] **Webhook notifications** for annotation events
- [ ] **Export formats** for more ML frameworks

**Infrastructure:**
- [ ] Cloud storage integration (S3, GCS) for large files
- [ ] Redis caching for API responses
- [ ] Rate limiting and API authentication
- [ ] Audit logs for all operations
- [ ] Backup and restore utilities

**UX Improvements:**
- [ ] Annotation guidelines editor
- [ ] Custom keyboard shortcut configuration
- [ ] Annotation templates and presets
- [ ] Dark mode support
- [ ] Mobile-responsive annotation interface

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Follow TypeScript best practices
- Use Zod for validation
- Keep API responses consistent
- Update documentation

## License

MIT

## Support

**Issues:** [GitHub Issues](https://github.com/your-org/dataset-labeling-annotation-studio/issues)

**Documentation:** This README and inline code comments

---

**Demo Credentials** (after seeding):
- Annotator 1: `alice@example.com` (Alice Johnson)
- Annotator 2: `bob@example.com` (Bob Smith)

**Quick Start:** `docker compose up` → Open `http://localhost:3000`

Built for the ML community with ❤️
