# Architecture Documentation

## Overview

The Dataset Labeling Annotation Studio is built as a **layered, event-driven architecture** with clean separation of concerns and extensive use of the adapter pattern for flexibility.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Next.js UI  │  │   API Routes │  │     CLI      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ TaskService  │  │QualityService│  │   Validators │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │  Event Bus   │  │   Logger     │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                     Domain Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Types     │  │    Events    │  │  Business    │  │
│  │              │  │              │  │    Logic     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│               Infrastructure/Adapter Layer               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Storage    │  │Notification  │  │   Metrics    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │    Export    │  │   Database   │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. Presentation Layer

**Next.js UI** (`/app/*`)
- Server components for static content
- Client components for interactive annotation interfaces
- Keyboard shortcut handlers
- Real-time progress tracking

**API Routes** (`/app/api/*`)
- RESTful API endpoints
- Request validation using Zod
- Centralized error handling
- Response formatting

**CLI** (future)
- Batch operations
- Administrative tasks
- Reporting and analytics

### 2. Application Layer

**Services** (`/lib/services/*`)
- `TaskService`: Task assignment, tracking, completion
- `QualityService`: IAA calculations, quality metrics
- Orchestrates domain logic
- Emits domain events

**Event Bus** (`/lib/domain/events.ts`)
- Publish/subscribe pattern
- Decouples components
- Enables asynchronous workflows
- Extensible event handlers

**Validation** (`/lib/validations.ts`)
- Zod schemas for all inputs
- Type-safe validation
- Consistent error messages

**Logging** (`/lib/logger.ts`)
- Structured logging
- Contextual information
- Log levels (DEBUG, INFO, WARN, ERROR)

### 3. Domain Layer

**Types** (`/lib/domain/types.ts`)
- Value objects
- Aggregates
- Domain-specific types
- Business concepts

**Events** (`/lib/domain/events.ts`)
- Domain event definitions
- Event types and payloads
- Event creation utilities

**Business Logic**
- Embedded in services
- Pure, testable functions
- No infrastructure dependencies

### 4. Infrastructure/Adapter Layer

**Storage Adapter** (`/lib/adapters/storage.adapter.ts`)
- Abstraction over file storage
- Implementations: Local, S3
- Uniform interface for file operations

**Notification Adapter** (`/lib/adapters/notification.adapter.ts`)
- Abstraction over notification delivery
- Implementations: Console, Webhook, Email
- Batch and individual notifications

**Metrics Adapter** (`/lib/adapters/metrics.adapter.ts`)
- Abstraction over metrics collection
- Implementations: Console, In-Memory, Prometheus
- Counters, gauges, histograms

**Export Adapter** (`/lib/adapters/export.adapter.ts`)
- Abstraction over export formats
- Implementations: JSONL, OpenAI, Hugging Face, spaCy
- Pluggable export formats

**Database** (`/lib/prisma.ts`)
- Prisma ORM
- Type-safe queries
- Migration management

## Design Patterns

### Adapter Pattern

Used extensively to decouple the application from external systems:

```typescript
interface StorageAdapter {
  upload(key: string, data: Buffer): Promise<StorageObject>
  download(key: string): Promise<Buffer>
  // ...
}

// Swap implementations without changing business logic
const storage: StorageAdapter =
  process.env.STORAGE === 's3'
    ? new S3StorageAdapter()
    : new LocalStorageAdapter()
```

### Event-Driven Architecture

Domain events enable loose coupling and extensibility:

```typescript
// Service emits event
await eventBus.publish(
  createDomainEvent(DomainEventType.TaskCompleted, {
    taskId,
    projectId,
  })
)

// Multiple handlers can react
eventBus.subscribe(DomainEventType.TaskCompleted, notificationHandler)
eventBus.subscribe(DomainEventType.TaskCompleted, metricsHandler)
eventBus.subscribe(DomainEventType.TaskCompleted, workflowHandler)
```

### Registry Pattern

For dynamic plugin systems:

```typescript
const registry = new ExportAdapterRegistry()

// Register custom adapter
registry.register('custom-format', new MyCustomExportAdapter())

// Use any registered adapter
const adapter = registry.get(formatName)
const result = await adapter.export(data)
```

## Data Flow

### Annotation Creation Flow

```
1. User selects labels in UI
2. Frontend sends POST /api/projects/{id}/annotations
3. API validates request with Zod schema
4. Service creates annotation in database
5. Service emits AnnotationCreated event
6. Event handlers:
   - Metrics: Record annotation count
   - Notification: Notify reviewer if needed
   - Workflow: Update item status
7. Response returned to frontend
```

### Quality Report Generation

```
1. Request for quality report
2. QualityService.generateQualityReport()
3. Fetch annotations from database
4. Calculate metrics:
   - Average confidence
   - Average time
   - Review acceptance rate
   - Per-annotator statistics
5. Return QualityReport aggregate
6. Optionally emit QualityReport event
```

## Scalability Considerations

### Current Implementation
- Single-server deployment
- In-memory event bus
- Local or S3 storage
- PostgreSQL database

### Future Scaling
- **Horizontal Scaling**: Load balanced Next.js servers
- **Event Bus**: Replace with Redis Pub/Sub or Kafka
- **Database**: Read replicas, connection pooling
- **Caching**: Redis for frequently accessed data
- **Storage**: CDN for static assets
- **Queue**: Background jobs for bulk operations

## Security

### Authentication
- Currently delegated to external system via `externalUserId`
- Ready for OAuth2/JWT integration
- Role-based access control (RBAC) via `AnnotatorRole`

### Authorization
- Project-level permissions
- Annotator-level permissions
- Review workflow enforces separation of duties

### Data Protection
- Input validation on all endpoints
- SQL injection prevention via Prisma
- XSS prevention via React
- CSRF protection via Next.js

## Testing Strategy

### Unit Tests
- Domain logic (services, utilities)
- Adapters (with mocks)
- Validators
- Event handlers

### Integration Tests
- API endpoints with test database
- Complete workflows
- Database transactions

### E2E Tests (Future)
- Playwright for UI testing
- Complete user journeys
- Cross-browser testing

## Monitoring & Observability

### Logging
- Structured logs with context
- Request IDs for tracing
- Error tracking

### Metrics
- Annotation throughput
- Response times
- Error rates
- Quality scores

### Alerting (Future)
- Quality threshold violations
- System errors
- Performance degradation

## Extension Points

### Adding New Task Types

1. Add to `TaskType` enum in schema
2. Create validator for new format
3. Update annotation UI component
4. Add export adapter if needed

### Adding New Export Formats

```typescript
class MyFormatAdapter implements ExportAdapter {
  async export(records: ExportRecord[]): Promise<ExportResult> {
    // Transform records to your format
    return { data, contentType, filename }
  }
  getFormatName() { return 'my-format' }
  getDescription() { return 'My custom format' }
}

// Register
exportRegistry.register('my-format', new MyFormatAdapter())
```

### Adding Event Handlers

```typescript
const myHandler: EventHandler = {
  async handle(event) {
    // React to domain events
    if (event.type === DomainEventType.AnnotationCreated) {
      // Custom logic
    }
  }
}

eventBus.subscribe(DomainEventType.AnnotationCreated, myHandler)
```

## Dependencies

### Core
- Next.js 15: Framework
- React 19: UI library
- TypeScript 5: Type safety
- Prisma 6: ORM

### Validation & Types
- Zod: Schema validation
- @prisma/client: Generated types

### Testing
- Vitest: Test runner
- @testing-library/react: React testing

### Development
- ESLint: Linting
- tsx: TypeScript execution

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure `DATABASE_URL`
- [ ] Run `prisma migrate deploy`
- [ ] Set up monitoring
- [ ] Configure logging
- [ ] Enable HTTPS
- [ ] Set up backup strategy
- [ ] Configure CORS if needed

### Environment Variables
```bash
# Required
DATABASE_URL=postgresql://...

# Optional
LOG_LEVEL=info
STORAGE_TYPE=local|s3
NOTIFICATION_WEBHOOK_URL=https://...
METRICS_ENABLED=true
```

## Further Reading

- [Domain Model](./DOMAIN_NOTES.md)
- [Integration Recipes](./INTEGRATION_RECIPES.md)
- [Phase 3 Overview](./PHASE3_OVERVIEW.md)
