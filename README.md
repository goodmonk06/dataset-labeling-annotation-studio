# Dataset Labeling Annotation Studio

A web-based annotation tool for creating labeled datasets for machine learning and LLM fine-tuning. Built with Next.js, TypeScript, Prisma, and PostgreSQL.

## Features

- **Multiple Task Types**
  - Text Classification (single or multi-label)
  - Text Span Labeling (NER, entity extraction)
  - Image Tagging (planned)

- **Efficient Annotation UI**
  - Keyboard shortcuts for rapid annotation
  - Progress tracking
  - Real-time statistics

- **Data Management**
  - JSONL import for bulk item upload
  - JSONL export for annotations
  - Compatible with LLM fine-tuning formats

## Tech Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Prisma ORM + PostgreSQL
- **Storage**: Local filesystem (abstracted for future cloud storage)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dataset-labeling-annotation-studio
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure your database URL:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/annotation_studio?schema=public"
```

4. Run database migrations:
```bash
npx prisma migrate dev --name init
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### 1. Create a Project

1. Navigate to the Projects page (home)
2. Click "New Project"
3. Fill in:
   - **Project Name**: e.g., "Sentiment Analysis"
   - **Task Type**: Choose from text_classification, text_span, or image_tagging
   - **Labels**: Comma-separated labels (e.g., "positive, negative, neutral")

### 2. Import Data

#### JSONL Format

Each line should be a valid JSON object:

```jsonl
{"inputText": "This product is amazing!", "inputMeta": {"source": "review"}}
{"inputText": "Terrible customer service.", "inputMeta": {"source": "review"}}
{"text": "It's okay, nothing special."}
```

**Field Options:**
- `inputText` or `text`: The text content to annotate (required)
- `inputMeta` or `meta`: Optional metadata (object)

#### Import Steps

1. From the Projects page, click "Import" on your project
2. Paste JSONL data or load the example
3. Click "Import Items"

### 3. Annotate

1. Click "Annotate" on your project
2. Use the annotation interface:

#### Text Classification
- Click labels or use number keys (1-9) to select
- Press Enter or 's' to submit
- Use arrow keys or 'n'/'p' to navigate

#### Text Span Labeling
- Select text with your mouse
- Choose a label from the dropdown
- Click "Add Span"
- Repeat for all entities
- Click "Submit All Spans"

#### Keyboard Shortcuts
- `n` or `→`: Next item
- `p` or `←`: Previous item
- `1-9`: Toggle labels (text classification)
- `Enter` or `s`: Submit annotation

### 4. View Statistics

1. Click "Stats" on your project
2. View:
   - Total items and annotations
   - Annotated items count
   - Coverage percentage
   - Label distribution
   - Recent annotations

### 5. Export Annotations

From the Stats page, click "Export Annotations (JSONL)" to download your annotated dataset.

#### Export Format

The exported JSONL is optimized for LLM fine-tuning:

```jsonl
{
  "input": "This product is amazing!",
  "annotation": {"labels": ["positive"]},
  "metadata": {
    "projectId": "...",
    "projectName": "Sentiment Analysis",
    "taskType": "text_classification",
    "itemId": "...",
    "annotationId": "...",
    "annotatedAt": "2024-01-15T10:30:00.000Z",
    "inputMeta": {"source": "review"}
  }
}
```

## Using with LLM Fine-Tuning

### OpenAI Fine-Tuning

Convert exported annotations to OpenAI's format:

```javascript
// convert.js
const fs = require('fs');
const readline = require('readline');

async function convertToOpenAI(inputFile, outputFile) {
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const output = [];

  for await (const line of rl) {
    const item = JSON.parse(line);

    // For text classification
    const systemPrompt = "You are a sentiment analysis classifier. Classify the following text as positive, negative, or neutral.";
    const userMessage = item.input;
    const assistantMessage = item.annotation.labels.join(', ');

    output.push({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
        { role: "assistant", content: assistantMessage }
      ]
    });
  }

  fs.writeFileSync(outputFile, output.map(o => JSON.stringify(o)).join('\n'));
  console.log(`Converted ${output.length} examples to ${outputFile}`);
}

convertToOpenAI('annotations-export.jsonl', 'openai-format.jsonl');
```

Run the conversion:
```bash
node convert.js
```

Then fine-tune with OpenAI:
```bash
openai api fine_tuning.jobs.create \
  -t openai-format.jsonl \
  -m gpt-4o-mini
```

### Custom Fine-Tuning Pipeline

For other frameworks (Hugging Face, LangChain, etc.):

```python
# load_annotations.py
import json

def load_annotations(file_path):
    """Load annotations from exported JSONL"""
    annotations = []
    with open(file_path, 'r') as f:
        for line in f:
            item = json.loads(line)
            annotations.append({
                'text': item['input'],
                'label': item['annotation']['labels'][0] if item['annotation']['labels'] else None,
                'metadata': item['metadata']
            })
    return annotations

# Usage
data = load_annotations('annotations-export.jsonl')
print(f"Loaded {len(data)} annotated examples")

# Split into train/val/test
from sklearn.model_selection import train_test_split
train, test = train_test_split(data, test_size=0.2, random_state=42)
train, val = train_test_split(train, test_size=0.1, random_state=42)

print(f"Train: {len(train)}, Val: {len(val)}, Test: {len(test)}")
```

### For Text Span Labeling (NER)

Convert to spaCy or Hugging Face NER format:

```python
# convert_spans.py
import json

def convert_to_ner_format(file_path):
    """Convert text span annotations to NER training format"""
    ner_data = []

    with open(file_path, 'r') as f:
        for line in f:
            item = json.loads(line)
            text = item['input']
            entities = []

            for span in item['annotation'].get('spans', []):
                entities.append((
                    span['start'],
                    span['end'],
                    span['label']
                ))

            ner_data.append((text, {'entities': entities}))

    return ner_data

# Usage with spaCy
import spacy
from spacy.training import Example

nlp = spacy.blank("en")
ner = nlp.add_pipe("ner")

data = convert_to_ner_format('annotations-export.jsonl')

# Add labels
for text, annotations in data:
    for _, _, label in annotations['entities']:
        ner.add_label(label)

# Train
nlp.begin_training()
for text, annotations in data:
    doc = nlp.make_doc(text)
    example = Example.from_dict(doc, annotations)
    nlp.update([example])
```

## Database Schema

### Project
- `id`: Unique identifier
- `name`: Project name
- `taskType`: text_classification | text_span | image_tagging
- `labelsJson`: JSON array of available labels

### Item
- `id`: Unique identifier
- `projectId`: Reference to project
- `inputText`: Text content to annotate
- `inputMetaJson`: Optional metadata (JSON)

### Annotation
- `id`: Unique identifier
- `projectId`: Reference to project
- `itemId`: Reference to item
- `annotatorId`: Optional reference to annotator
- `dataJson`: Annotation data (format varies by task type)

### Annotator
- `id`: Unique identifier
- `name`: Annotator name (optional)
- `externalUserId`: External user ID for integration (optional)

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/[id]` - Get project details
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### Items
- `GET /api/projects/[id]/items` - List items
- `POST /api/projects/[id]/items` - Create item
- `POST /api/projects/[id]/items/import` - Bulk import items

### Annotations
- `GET /api/projects/[id]/annotations` - List annotations
- `POST /api/projects/[id]/annotations` - Create annotation
- `GET /api/projects/[id]/annotations/export` - Export as JSONL

## Development

### Database Migrations

After modifying `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name describe_your_changes
```

### Reset Database

```bash
npx prisma migrate reset
```

### Prisma Studio

Explore your database with a GUI:

```bash
npx prisma studio
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
4. Deploy

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t annotation-studio .
docker run -p 3000:3000 -e DATABASE_URL="..." annotation-studio
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Roadmap

- [ ] Image tagging support
- [ ] Multi-user annotation with conflict resolution
- [ ] Inter-annotator agreement metrics
- [ ] Cloud storage integration (S3, GCS)
- [ ] Active learning integration
- [ ] Annotation guidelines editor
- [ ] API authentication
- [ ] Webhooks for annotation events

## License

MIT

## Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation
- Review the code examples above

---

Built with ❤️ for the ML community
