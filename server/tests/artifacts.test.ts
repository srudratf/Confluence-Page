import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { auth, closeTestContext, createTestContext, login, type TestContext } from './helpers.ts'

describe('artifacts API', () => {
  let ctx: TestContext

  afterEach(() => {
    if (ctx) closeTestContext(ctx)
  })

  it('lists seeded artifacts with file counts', async () => {
    ctx = createTestContext()
    const token = await login(ctx.app, 'member@thoughtfocus.com', 'Member123!')
    const response = await request(ctx.app).get('/api/v1/artifacts').set(auth(token))

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(4)
    expect(response.body.meta.folderCounts.docs).toBe(2)
    expect(response.body.meta.folderCounts.ops).toBe(1)
    expect(response.body.meta.folderCounts.comms).toBe(1)
    expect(response.body.data.every((item: { fileCount: number }) => item.fileCount === 1)).toBe(true)
  })

  it('filters artifacts by folder and search', async () => {
    ctx = createTestContext()
    const token = await login(ctx.app)
    const docs = await request(ctx.app).get('/api/v1/artifacts?folder=docs').set(auth(token))
    expect(docs.body.data).toHaveLength(2)

    const tests = await request(ctx.app).get('/api/v1/artifacts?folder=tests').set(auth(token))
    expect(tests.body.data).toHaveLength(0)

    const search = await request(ctx.app).get('/api/v1/artifacts?q=BRD').set(auth(token))
    expect(search.body.data).toHaveLength(1)
    expect(search.body.data[0].slug).toBe('brd')
  })

  it('lets an admin create, patch, and delete an artifact', async () => {
    ctx = createTestContext()
    const token = await login(ctx.app)
    const created = await request(ctx.app)
      .post('/api/v1/artifacts')
      .set(auth(token))
      .send({
        name: 'Lab Notes',
        folder: 'ops',
        description: 'Session runbooks',
      })

    expect(created.status).toBe(201)
    expect(created.headers.location).toBe(`/api/v1/artifacts/${created.body.data.id}`)
    expect(created.body.data).toMatchObject({
      slug: 'lab-notes',
      path: 'ops/lab-notes/',
      status: 'draft',
      folder: 'ops',
    })

    const patched = await request(ctx.app)
      .patch(`/api/v1/artifacts/${created.body.data.id}`)
      .set(auth(token))
      .send({ status: 'in_review' })
    expect(patched.status).toBe(200)
    expect(patched.body.data.status).toBe('in_review')

    const deleted = await request(ctx.app)
      .delete(`/api/v1/artifacts/${created.body.data.id}`)
      .set(auth(token))
    expect(deleted.status).toBe(204)

    const missing = await request(ctx.app)
      .get(`/api/v1/artifacts/${created.body.data.id}`)
      .set(auth(token))
    expect(missing.status).toBe(404)
  })

  it('forbids members from creating artifacts', async () => {
    ctx = createTestContext()
    const token = await login(ctx.app, 'member@thoughtfocus.com', 'Member123!')
    const response = await request(ctx.app).post('/api/v1/artifacts').set(auth(token)).send({
      name: 'Nope',
      folder: 'docs',
      description: 'Should fail',
    })
    expect(response.status).toBe(403)
  })

  it('returns 409 when slug already exists', async () => {
    ctx = createTestContext()
    const token = await login(ctx.app)
    const response = await request(ctx.app).post('/api/v1/artifacts').set(auth(token)).send({
      name: 'BRD Copy',
      folder: 'docs',
      description: 'Duplicate slug',
      slug: 'brd',
    })
    expect(response.status).toBe(409)
  })

  it('returns 422 for an invalid folder', async () => {
    ctx = createTestContext()
    const token = await login(ctx.app)
    const response = await request(ctx.app).post('/api/v1/artifacts').set(auth(token)).send({
      name: 'Bad',
      folder: 'legal',
      description: 'Invalid folder',
    })
    expect(response.status).toBe(422)
  })

  it('requires authentication', async () => {
    ctx = createTestContext()
    const response = await request(ctx.app).get('/api/v1/artifacts')
    expect(response.status).toBe(401)
  })
})
