#!/usr/bin/env node
/**
 * 统一技能专名：persuasion 说服→游说；classes/traits 中 技能：说服→技能：游说、技能：杂技→技能：体操
 *
 * MONGODB_URI=mongodb://localhost/5e-database node scripts/fix-skill-terminology.mjs
 */

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/5e-database'

async function main() {
  console.log('Connecting to MongoDB:', MONGODB_URI)
  await mongoose.connect(MONGODB_URI)
  const db = mongoose.connection.db

  const skills = await db.collection('2014-skills').updateOne(
    { index: 'persuasion' },
    {
      $set: {
        name: '游说',
        'desc.0': (await db.collection('2014-skills').findOne({ index: 'persuasion' }))?.desc?.[0]
          ?.replace(/魅力（说服）/g, '魅力（游说）')
          ?.replace(/使用说服/g, '使用游说')
          ?.replace(/说服他人的例子/g, '游说他人的例子')
      }
    }
  )
  console.log('2014-skills persuasion:', skills.modifiedCount)

  const prof = await db.collection('2014-proficiencies').updateOne(
    { index: 'skill-persuasion' },
    {
      $set: {
        name: '游说',
        'reference.name': '游说'
      }
    }
  )
  console.log('2014-proficiencies skill-persuasion:', prof.modifiedCount)

  const collections = ['2014-classes', '2014-traits', '2014-backgrounds', '2014-races', '2014-subraces']
  for (const collName of collections) {
    const coll = db.collection(collName)
    const docs = await coll.find({}).toArray()
    let updated = 0
    for (const doc of docs) {
      const json = JSON.stringify(doc)
      if (!json.includes('技能：说服') && !json.includes('技能：杂技')) continue
      const replaced = json
        .replaceAll('技能：说服', '技能：游说')
        .replaceAll('技能：杂技', '技能：体操')
      const next = JSON.parse(replaced)
      delete next._id
      await coll.replaceOne({ _id: doc._id }, next)
      updated++
    }
    if (updated) console.log(`${collName}: updated ${updated} documents`)
  }

  await mongoose.disconnect()
  console.log('Done fix-skill-terminology.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
