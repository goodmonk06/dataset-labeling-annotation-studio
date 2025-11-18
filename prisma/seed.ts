import 'dotenv/config'
import { PrismaClient, TaskType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing data
  console.log('Clearing existing data...')
  await prisma.annotation.deleteMany()
  await prisma.item.deleteMany()
  await prisma.annotator.deleteMany()
  await prisma.project.deleteMany()

  // Create annotators
  console.log('Creating annotators...')
  const annotator1 = await prisma.annotator.create({
    data: {
      name: 'Alice Johnson',
      externalUserId: 'alice@example.com',
    },
  })

  const annotator2 = await prisma.annotator.create({
    data: {
      name: 'Bob Smith',
      externalUserId: 'bob@example.com',
    },
  })

  console.log(`✓ Created ${2} annotators`)

  // Create text classification project
  console.log('Creating text classification project...')
  const sentimentProject = await prisma.project.create({
    data: {
      name: 'Customer Review Sentiment Analysis',
      taskType: TaskType.text_classification,
      labelsJson: JSON.stringify(['positive', 'negative', 'neutral']),
    },
  })

  // Create items for sentiment project
  const sentimentTexts = [
    { text: 'This product exceeded my expectations! Absolutely love it.', sentiment: 'positive' },
    { text: 'Terrible quality. Would not recommend to anyone.', sentiment: 'negative' },
    { text: 'It works fine, nothing special though.', sentiment: 'neutral' },
    { text: 'Amazing customer service and fast delivery!', sentiment: 'positive' },
    { text: 'Received a damaged item and refund process was complicated.', sentiment: 'negative' },
    { text: 'The product is okay for the price.', sentiment: 'neutral' },
    { text: 'Best purchase I made this year!', sentiment: 'positive' },
    { text: 'Completely disappointed with this purchase.', sentiment: 'negative' },
    { text: 'Average product, does what it says.', sentiment: 'neutral' },
    { text: 'Highly recommend! Five stars!', sentiment: 'positive' },
  ]

  for (const { text, sentiment } of sentimentTexts) {
    const item = await prisma.item.create({
      data: {
        projectId: sentimentProject.id,
        inputText: text,
        inputMetaJson: JSON.stringify({ source: 'review', category: 'electronics' }),
      },
    })

    // Add annotations for first 5 items
    if (sentimentTexts.indexOf({ text, sentiment }) < 5) {
      await prisma.annotation.create({
        data: {
          projectId: sentimentProject.id,
          itemId: item.id,
          annotatorId: Math.random() > 0.5 ? annotator1.id : annotator2.id,
          dataJson: JSON.stringify({ labels: [sentiment] }),
        },
      })
    }
  }

  console.log(`✓ Created text classification project with ${sentimentTexts.length} items and 5 annotations`)

  // Create text span (NER) project
  console.log('Creating text span project...')
  const nerProject = await prisma.project.create({
    data: {
      name: 'Named Entity Recognition - News Articles',
      taskType: TaskType.text_span,
      labelsJson: JSON.stringify(['PERSON', 'ORGANIZATION', 'LOCATION', 'DATE']),
    },
  })

  // Create items for NER project
  const nerTexts = [
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
      entities: [],
    },
    {
      text: 'Google announced a partnership with Amazon on Monday.',
      entities: [],
    },
  ]

  for (const { text, entities } of nerTexts) {
    const item = await prisma.item.create({
      data: {
        projectId: nerProject.id,
        inputText: text,
        inputMetaJson: JSON.stringify({ source: 'news', domain: 'technology' }),
      },
    })

    // Add annotations for items with entities
    if (entities.length > 0) {
      await prisma.annotation.create({
        data: {
          projectId: nerProject.id,
          itemId: item.id,
          annotatorId: annotator1.id,
          dataJson: JSON.stringify({ spans: entities }),
        },
      })
    }
  }

  console.log(`✓ Created text span project with ${nerTexts.length} items and 3 annotations`)

  // Summary
  console.log('\n📊 Seed Summary:')
  console.log(`   Projects: 2`)
  console.log(`   Items: ${sentimentTexts.length + nerTexts.length}`)
  console.log(`   Annotations: 8`)
  console.log(`   Annotators: 2`)

  console.log('\n✅ Database seeded successfully!')
  console.log('\n🔑 Demo Credentials:')
  console.log('   Annotator 1: alice@example.com (Alice Johnson)')
  console.log('   Annotator 2: bob@example.com (Bob Smith)')
  console.log('\n🌐 Access the app at: http://localhost:3000')
  console.log('   → View projects and start annotating!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
