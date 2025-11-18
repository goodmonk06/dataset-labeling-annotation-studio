import 'dotenv/config'
import {
  PrismaClient,
  TaskType,
  ProjectStatus,
  ItemStatus,
  ItemPriority,
  AnnotatorRole,
  ReviewStatus,
} from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting comprehensive database seed...')

  // Clear existing data (in correct order due to foreign keys)
  console.log('📝 Clearing existing data...')
  await prisma.annotationReview.deleteMany()
  await prisma.annotation.deleteMany()
  await prisma.annotationTask.deleteMany()
  await prisma.item.deleteMany()
  await prisma.labelGuideline.deleteMany()
  await prisma.annotationBatch.deleteMany()
  await prisma.template.deleteMany()
  await prisma.annotator.deleteMany()
  await prisma.project.deleteMany()

  // ============================================================================
  // TEMPLATES
  // ============================================================================
  console.log('\n📋 Creating project templates...')
  const sentimentTemplate = await prisma.template.create({
    data: {
      name: 'Sentiment Analysis',
      description: 'Three-class sentiment classification for text data',
      taskType: TaskType.text_classification,
      labelsJson: JSON.stringify(['positive', 'negative', 'neutral']),
      guidelinesJson: JSON.stringify({
        positive: 'Clearly expresses satisfaction or approval',
        negative: 'Expresses dissatisfaction or disapproval',
        neutral: 'Factual or ambiguous sentiment',
      }),
      isPublic: true,
      usageCount: 5,
    },
  })

  const nerTemplate = await prisma.template.create({
    data: {
      name: 'Named Entity Recognition',
      description: 'Standard NER with PERSON, ORG, LOCATION, DATE entities',
      taskType: TaskType.text_span,
      labelsJson: JSON.stringify(['PERSON', 'ORGANIZATION', 'LOCATION', 'DATE']),
      isPublic: true,
      usageCount: 3,
    },
  })

  console.log(`✓ Created ${2} templates`)

  // ============================================================================
  // ANNOTATORS
  // ============================================================================
  console.log('\n👥 Creating annotators with different roles...')

  const alice = await prisma.annotator.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      externalUserId: 'alice',
      role: AnnotatorRole.admin,
      skillLevel: 5,
      isActive: true,
      statsJson: JSON.stringify({
        totalAnnotations: 150,
        accuracyScore: 0.95,
        throughputPerDay: 50,
      }),
    },
  })

  const bob = await prisma.annotator.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@example.com',
      externalUserId: 'bob',
      role: AnnotatorRole.reviewer,
      skillLevel: 4,
      isActive: true,
      statsJson: JSON.stringify({
        totalAnnotations: 120,
        accuracyScore: 0.92,
        throughputPerDay: 40,
      }),
    },
  })

  const charlie = await prisma.annotator.create({
    data: {
      name: 'Charlie Davis',
      email: 'charlie@example.com',
      externalUserId: 'charlie',
      role: AnnotatorRole.annotator,
      skillLevel: 3,
      isActive: true,
      statsJson: JSON.stringify({
        totalAnnotations: 80,
        accuracyScore: 0.88,
        throughputPerDay: 30,
      }),
    },
  })

  const dana = await prisma.annotator.create({
    data: {
      name: 'Dana Williams',
      email: 'dana@example.com',
      externalUserId: 'dana',
      role: AnnotatorRole.annotator,
      skillLevel: 2,
      isActive: true,
      statsJson: JSON.stringify({
        totalAnnotations: 45,
        accuracyScore: 0.85,
        throughputPerDay: 25,
      }),
    },
  })

  console.log(`✓ Created ${4} annotators (1 admin, 1 reviewer, 2 annotators)`)

  // ============================================================================
  // PROJECT 1: CUSTOMER SENTIMENT (Active, with workflow)
  // ============================================================================
  console.log('\n📊 Creating Project 1: Customer Sentiment Analysis...')

  const sentimentProject = await prisma.project.create({
    data: {
      name: 'Customer Review Sentiment Analysis',
      description: 'Classify customer reviews by sentiment to improve product feedback analysis',
      taskType: TaskType.text_classification,
      labelsJson: JSON.stringify(['positive', 'negative', 'neutral']),
      status: ProjectStatus.active,
      qualityThreshold: 0.85,
      guidelinesUrl: 'https://example.com/guidelines/sentiment',
      metadataJson: JSON.stringify({
        department: 'Customer Success',
        priority: 'high',
        expectedCompletion: '2024-02-15',
      }),
    },
  })

  // Add guidelines for sentiment project
  await prisma.labelGuideline.createMany({
    data: [
      {
        projectId: sentimentProject.id,
        label: 'positive',
        title: 'Positive Sentiment',
        description: 'Use when the review expresses clear satisfaction, praise, or approval. Look for words like "great", "excellent", "love", "recommend".',
        examples: JSON.stringify([
          'This product exceeded my expectations!',
          'Best purchase ever!',
        ]),
      },
      {
        projectId: sentimentProject.id,
        label: 'negative',
        title: 'Negative Sentiment',
        description: 'Use when the review expresses dissatisfaction, criticism, or disapproval. Look for complaints, problems, or recommendations against.',
        examples: JSON.stringify([
          'Terrible quality, broke after one use.',
          'Would not recommend to anyone.',
        ]),
      },
      {
        projectId: sentimentProject.id,
        label: 'neutral',
        title: 'Neutral Sentiment',
        description: 'Use for factual statements without clear positive or negative emotion, or mixed reviews with both pros and cons.',
        examples: JSON.stringify([
          'It works as described.',
          'Decent product for the price.',
        ]),
      },
    ],
  })

  // Create batch 1 for sentiment project
  const batch1 = await prisma.annotationBatch.create({
    data: {
      projectId: sentimentProject.id,
      name: 'Electronics Reviews - Batch 1',
      description: 'First batch of electronics product reviews',
      status: 'active',
      metadataJson: JSON.stringify({ category: 'electronics', source: 'amazon' }),
    },
  })

  // Create items for sentiment project
  const sentimentItems = [
    {
      text: 'This product exceeded my expectations! Absolutely love it.',
      sentiment: 'positive',
      priority: ItemPriority.medium,
      difficulty: 1,
    },
    {
      text: 'Terrible quality. Would not recommend to anyone.',
      sentiment: 'negative',
      priority: ItemPriority.high,
      difficulty: 1,
    },
    {
      text: 'It works fine, nothing special though.',
      sentiment: 'neutral',
      priority: ItemPriority.low,
      difficulty: 2,
    },
    {
      text: 'Amazing customer service and fast delivery!',
      sentiment: 'positive',
      priority: ItemPriority.medium,
      difficulty: 1,
    },
    {
      text: 'Received a damaged item and refund process was complicated.',
      sentiment: 'negative',
      priority: ItemPriority.high,
      difficulty: 2,
    },
    {
      text: 'The product is okay for the price.',
      sentiment: 'neutral',
      priority: ItemPriority.low,
      difficulty: 3,
    },
    {
      text: 'Best purchase I made this year!',
      sentiment: 'positive',
      priority: ItemPriority.medium,
      difficulty: 1,
    },
    {
      text: 'Completely disappointed with this purchase.',
      sentiment: 'negative',
      priority: ItemPriority.high,
      difficulty: 1,
    },
    {
      text: 'Average product, does what it says. Some features missing.',
      sentiment: 'neutral',
      priority: ItemPriority.medium,
      difficulty: 3,
    },
    {
      text: 'Highly recommend! Five stars! Changed my life.',
      sentiment: 'positive',
      priority: ItemPriority.medium,
      difficulty: 1,
    },
    {
      text: 'Good but could be better. Mixed feelings about quality.',
      sentiment: 'neutral',
      priority: ItemPriority.medium,
      difficulty: 4,
    },
    {
      text: 'Worst product ever. Immediate return.',
      sentiment: 'negative',
      priority: ItemPriority.urgent,
      difficulty: 1,
    },
  ]

  for (let i = 0; i < sentimentItems.length; i++) {
    const data = sentimentItems[i]
    const item = await prisma.item.create({
      data: {
        projectId: sentimentProject.id,
        batchId: batch1.id,
        inputText: data.text,
        inputMetaJson: JSON.stringify({ source: 'review', category: 'electronics', index: i }),
        status: i < 8 ? ItemStatus.annotated : ItemStatus.pending,
        priority: data.priority,
        difficulty: data.difficulty,
      },
    })

    // Annotate first 8 items
    if (i < 8) {
      const annotator = i % 2 === 0 ? alice : bob
      const timeSpent = 15000 + Math.random() * 30000 // 15-45 seconds
      const confidence = 0.8 + Math.random() * 0.2 // 0.8-1.0

      const annotation = await prisma.annotation.create({
        data: {
          projectId: sentimentProject.id,
          itemId: item.id,
          annotatorId: annotator.id,
          dataJson: JSON.stringify({ labels: [data.sentiment] }),
          confidence,
          timeSpentMs: Math.floor(timeSpent),
        },
      })

      // Add reviews for some annotations
      if (i < 4) {
        await prisma.annotationReview.create({
          data: {
            projectId: sentimentProject.id,
            annotationId: annotation.id,
            reviewerId: bob.id,
            status: i === 2 ? ReviewStatus.needs_revision : ReviewStatus.approved,
            feedback: i === 2 ? 'This seems more neutral than positive' : 'Good work!',
          },
        })
      }
    }

    // Create tasks for last 4 items (assigned but not completed)
    if (i >= 8) {
      const assignee = i % 2 === 0 ? charlie : dana
      await prisma.annotationTask.create({
        data: {
          projectId: sentimentProject.id,
          itemId: item.id,
          annotatorId: assignee.id,
          status: ItemStatus.assigned,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
      })
    }
  }

  console.log(`  ✓ Created ${sentimentItems.length} items (8 annotated, 4 assigned)`)
  console.log(`  ✓ Created 8 annotations with reviews`)
  console.log(`  ✓ Created 4 pending tasks`)

  // ============================================================================
  // PROJECT 2: NER (Active, for IAA testing)
  // ============================================================================
  console.log('\n📊 Creating Project 2: Named Entity Recognition...')

  const nerProject = await prisma.project.create({
    data: {
      name: 'Named Entity Recognition - News Articles',
      description: 'Extract named entities (people, organizations, locations, dates) from news text',
      taskType: TaskType.text_span,
      labelsJson: JSON.stringify(['PERSON', 'ORGANIZATION', 'LOCATION', 'DATE']),
      status: ProjectStatus.active,
      qualityThreshold: 0.80,
    },
  })

  const nerItems = [
    {
      text: 'Apple Inc. announced their new iPhone in Cupertino on September 15th.',
      entities: [
        { start: 0, end: 10, label: 'ORGANIZATION' },
        { start: 42, end: 51, label: 'LOCATION' },
        { start: 55, end: 68, label: 'DATE' },
      ],
    },
    {
      text: 'Elon Musk visited Tesla factory in Berlin last week.',
      entities: [
        { start: 0, end: 9, label: 'PERSON' },
        { start: 18, end: 23, label: 'ORGANIZATION' },
        { start: 35, end: 41, label: 'LOCATION' },
      ],
    },
    {
      text: 'Microsoft CEO Satya Nadella spoke at the conference in Seattle.',
      entities: [
        { start: 0, end: 9, label: 'ORGANIZATION' },
        { start: 14, end: 27, label: 'PERSON' },
        { start: 56, end: 63, label: 'LOCATION' },
      ],
    },
    {
      text: 'The United Nations held a summit in New York City in January 2024.',
      entities: [
        { start: 4, end: 18, label: 'ORGANIZATION' },
        { start: 37, end: 50, label: 'LOCATION' },
        { start: 54, end: 67, label: 'DATE' },
      ],
    },
    {
      text: 'Google announced a partnership with Amazon on Monday.',
      entities: [
        { start: 0, end: 6, label: 'ORGANIZATION' },
        { start: 37, end: 43, label: 'ORGANIZATION' },
        { start: 47, end: 53, label: 'DATE' },
      ],
    },
  ]

  for (const data of nerItems) {
    const item = await prisma.item.create({
      data: {
        projectId: nerProject.id,
        inputText: data.text,
        inputMetaJson: JSON.stringify({ source: 'news', domain: 'technology' }),
        status: data.entities.length > 0 ? ItemStatus.annotated : ItemStatus.pending,
        priority: ItemPriority.medium,
      },
    })

    // Annotate items with entities
    if (data.entities.length > 0) {
      // Create annotation from Alice
      await prisma.annotation.create({
        data: {
          projectId: nerProject.id,
          itemId: item.id,
          annotatorId: alice.id,
          dataJson: JSON.stringify({ spans: data.entities }),
          confidence: 0.9,
          timeSpentMs: 45000,
        },
      })

      // For IAA testing: Bob also annotates first 3 items
      if (nerItems.indexOf(data) < 3) {
        await prisma.annotation.create({
          data: {
            projectId: nerProject.id,
            itemId: item.id,
            annotatorId: bob.id,
            dataJson: JSON.stringify({ spans: data.entities }),
            confidence: 0.85,
            timeSpentMs: 50000,
          },
        })
      }
    }
  }

  console.log(`  ✓ Created ${nerItems.length} items`)
  console.log(`  ✓ Created ${nerItems.filter(d => d.entities.length > 0).length} single annotations`)
  console.log(`  ✓ Created 3 dual annotations for IAA testing`)

  // ============================================================================
  // PROJECT 3: INTENT CLASSIFICATION (Draft)
  // ============================================================================
  console.log('\n📊 Creating Project 3: Intent Classification (Draft)...')

  const intentProject = await prisma.project.create({
    data: {
      name: 'Customer Support Intent Classification',
      description: 'Classify customer support messages by intent',
      taskType: TaskType.text_classification,
      labelsJson: JSON.stringify([
        'technical_issue',
        'billing_question',
        'feature_request',
        'general_inquiry',
        'complaint',
      ]),
      status: ProjectStatus.draft,
    },
  })

  // Add batch but no items yet (project in draft)
  await prisma.annotationBatch.create({
    data: {
      projectId: intentProject.id,
      name: 'Support Tickets - Week 1',
      description: 'First week of support tickets for labeling',
      status: 'active',
    },
  })

  console.log(`  ✓ Created draft project with empty batch`)

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n📊 Seed Summary:')
  console.log(`   Templates: 2`)
  console.log(`   Projects: 3 (2 active, 1 draft)`)
  console.log(`   Items: ${sentimentItems.length + nerItems.length}`)
  console.log(`   Annotations: ${sentimentItems.filter((_, i) => i < 8).length + nerItems.filter(d => d.entities.length > 0).length * 2}`)
  console.log(`   Annotators: 4 (1 admin, 1 reviewer, 2 annotators)`)
  console.log(`   Batches: 2`)
  console.log(`   Tasks: 4 pending`)
  console.log(`   Reviews: 4`)

  console.log('\n✅ Database seeded successfully!')

  console.log('\n🔑 Demo Credentials:')
  console.log('   Admin: alice@example.com (Alice Johnson)')
  console.log('   Reviewer: bob@example.com (Bob Smith)')
  console.log('   Annotator: charlie@example.com (Charlie Davis)')
  console.log('   Annotator: dana@example.com (Dana Williams)')

  console.log('\n🌐 Available Workflows:')
  console.log('   1. Basic Annotation: Project 1 has 4 pending tasks')
  console.log('   2. Review Workflow: Project 1 has annotations awaiting review')
  console.log('   3. IAA Testing: Project 2 has dual-annotated items for agreement calculation')
  console.log('   4. Draft Setup: Project 3 ready for configuration and item import')

  console.log('\n💡 Next Steps:')
  console.log('   - Visit http://localhost:3000 to explore projects')
  console.log('   - Try annotating pending tasks')
  console.log('   - Review annotations and calculate quality metrics')
  console.log('   - Export annotations in multiple formats')
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
