// Postgres columns are snake_case; the API speaks camelCase, like the mock the
// admin screens were built against. These convert in both directions.

const toCamel = (text) => text.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase())
export const toSnake = (text) => text.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)

export const camel = (row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [toCamel(key), value]))

// Every row of a table, as camelCase objects.
export async function all(db, table, orderBy = '') {
  const { rows } = await db.query(`SELECT * FROM ${table} ${orderBy}`)
  return rows.map(camel)
}

// The tables the routes build their answers from. The data is a portfolio's:
// tens to hundreds of rows, so each request reads what it needs whole and
// assembles it in JavaScript, which keeps the rules readable next to the
// screens that show them.
const TABLES = {
  admins: 'admins',
  media: 'media',
  categories: 'categories',
  works: 'works',
  modelDetails: 'model_details',
  videoDetails: 'video_details',
  workMedia: 'work_media',
  siteText: 'site_text',
  socialLinks: 'social_links',
  experience: 'experience',
  settings: 'settings',
  activityLog: 'activity_log',
}

//
// A transaction's single connection can only run one query at a time, so by
// default they go one after another. Reads straight from the pool pass
// { parallel: true } and send them all at once: every query is a round trip to
// the database, and waiting on ten of them in a row is most of a request.
export async function loadDb(db, names, { parallel = false } = {}) {
  const loaded = {}
  // A work's categories live in work_categories; they come with the work.
  const linksQuery = 'SELECT work_id, category_id FROM work_categories ORDER BY position'
  let links
  if (parallel) {
    const [tables, linkRows] = await Promise.all([
      Promise.all(names.map((name) => all(db, TABLES[name]))),
      names.includes('works') ? db.query(linksQuery) : null,
    ])
    names.forEach((name, i) => { loaded[name] = tables[i] })
    links = linkRows?.rows
  } else {
    for (const name of names) loaded[name] = await all(db, TABLES[name])
    if (loaded.works) links = (await db.query(linksQuery)).rows
  }
  if (loaded.works) {
    for (const work of loaded.works) work.categoryIds = links.filter((row) => row.work_id === work.id).map((row) => row.category_id)
  }
  return loaded
}

// UPDATE one row by id (or another key) from an object of camelCase fields,
// restricted to `columns` so nothing else in the object can be written.
export async function updateRow(db, table, key, value, fields, columns) {
  const names = columns.filter((column) => fields[column] !== undefined)
  if (names.length === 0) return
  const sets = names.map((name, i) => `${toSnake(name)} = $${i + 1}`)
  await db.query(`UPDATE ${table} SET ${sets.join(', ')} WHERE ${toSnake(key)} = $${names.length + 1}`, [...names.map((name) => fields[name]), value])
}

export async function insertRow(db, table, fields, columns) {
  const names = columns.filter((column) => fields[column] !== undefined)
  const marks = names.map((_, i) => `$${i + 1}`)
  await db.query(`INSERT INTO ${table} (${names.map(toSnake).join(', ')}) VALUES (${marks.join(', ')})`, names.map((name) => fields[name]))
}

// Keeps only the fields a caller may set. Anything else in the body is ignored.
export const pick = (source, fields) => Object.fromEntries(fields.filter((field) => source?.[field] !== undefined).map((field) => [field, source[field]]))
