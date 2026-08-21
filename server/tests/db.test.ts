import { afterEach, describe, expect, it } from 'vitest'
import { closeTestContext, createTestContext, type TestContext } from './helpers.ts'

describe('database schema', () => {
  let ctx: TestContext

  afterEach(() => {
    if (ctx) closeTestContext(ctx)
  })

  it('applies the initial migration and records it', () => {
    ctx = createTestContext()
    const rows = ctx.db.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]
    expect(rows.map((row) => row.id)).toContain('001_init.sql')
  })

  it('rejects duplicate emails', () => {
    ctx = createTestContext()
    expect(() => {
      ctx.db
        .prepare(
          `INSERT INTO users (id, email, password_hash, display_name, role, created_at, updated_at)
           VALUES ('x', 'admin@thoughtfocus.com', 'hash', 'Dup', 'member', datetime('now'), datetime('now'))`,
        )
        .run()
    }).toThrow(/UNIQUE/i)
  })

  it('rejects invalid artifact folders', () => {
    ctx = createTestContext()
    const admin = ctx.db.prepare('SELECT id FROM users WHERE email = ?').get('admin@thoughtfocus.com') as {
      id: string
    }
    expect(() => {
      ctx.db
        .prepare(
          `INSERT INTO artifacts (id, slug, name, folder, path, description, status, created_by, created_at, updated_at)
           VALUES ('z', 'bad', 'Bad', 'legal', 'legal/bad/', 'nope', 'draft', ?, datetime('now'), datetime('now'))`,
        )
        .run(admin.id)
    }).toThrow(/CHECK/i)
  })

  it('cascades artifact file rows when an artifact is deleted', () => {
    ctx = createTestContext()
    const artifact = ctx.db.prepare('SELECT id FROM artifacts WHERE slug = ?').get('brd') as { id: string }
    const before = ctx.db
      .prepare('SELECT COUNT(*) AS total FROM artifact_files WHERE artifact_id = ?')
      .get(artifact.id) as { total: number }
    expect(before.total).toBeGreaterThan(0)

    ctx.db.prepare('DELETE FROM artifacts WHERE id = ?').run(artifact.id)

    const after = ctx.db
      .prepare('SELECT COUNT(*) AS total FROM artifact_files WHERE artifact_id = ?')
      .get(artifact.id) as { total: number }
    expect(after.total).toBe(0)
  })

  it('seeds demo users and the four hub artifacts', () => {
    ctx = createTestContext()
    const users = ctx.db.prepare('SELECT email, role FROM users ORDER BY email').all()
    expect(users).toEqual([
      { email: 'admin@thoughtfocus.com', role: 'admin' },
      { email: 'member@thoughtfocus.com', role: 'member' },
    ])
    const artifacts = ctx.db.prepare('SELECT slug, folder, status FROM artifacts ORDER BY slug').all()
    expect(artifacts).toEqual([
      { slug: 'architecture', folder: 'docs', status: 'final' },
      { slug: 'blog', folder: 'comms', status: 'draft' },
      { slug: 'brd', folder: 'docs', status: 'final' },
      { slug: 'raci', folder: 'ops', status: 'draft' },
    ])
  })
})
