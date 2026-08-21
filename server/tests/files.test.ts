import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { SEED_BRD_ID, SEED_RACI_ID } from '../seeds/seed.ts'
import { auth, closeTestContext, createTestContext, login, type TestContext } from './helpers.ts'

describe('artifact files API', () => {
  let ctx: TestContext

  afterEach(() => {
    if (ctx) closeTestContext(ctx)
  })

  it('lists and downloads a seeded file', async () => {
    ctx = createTestContext()
    const token = await login(ctx.app, 'member@thoughtfocus.com', 'Member123!')
    const listed = await request(ctx.app)
      .get(`/api/v1/artifacts/${SEED_BRD_ID}/files`)
      .set(auth(token))

    expect(listed.status).toBe(200)
    expect(listed.body.data).toHaveLength(1)
    expect(listed.body.data[0].originalName).toBe('scope.md')
    expect(listed.body.data[0]).not.toHaveProperty('storedName')

    const fileId = listed.body.data[0].id as string
    const downloaded = await request(ctx.app)
      .get(`/api/v1/artifacts/${SEED_BRD_ID}/files/${fileId}/download`)
      .set(auth(token))
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        res.on('end', () => callback(null, Buffer.concat(chunks)))
      })

    expect(downloaded.status).toBe(200)
    expect(String(downloaded.body)).toContain('# BRD')
    expect(downloaded.headers['content-disposition']).toMatch(/scope\.md/)
  })

  it('lists and downloads seeded RACI matrix.md and lets a member upload onto it', async () => {
    ctx = createTestContext()
    const token = await login(ctx.app, 'member@thoughtfocus.com', 'Member123!')
    const listed = await request(ctx.app)
      .get(`/api/v1/artifacts/${SEED_RACI_ID}/files`)
      .set(auth(token))

    expect(listed.status).toBe(200)
    expect(listed.body.data).toHaveLength(1)
    expect(listed.body.data[0].originalName).toBe('matrix.md')

    const fileId = listed.body.data[0].id as string
    const downloaded = await request(ctx.app)
      .get(`/api/v1/artifacts/${SEED_RACI_ID}/files/${fileId}/download`)
      .set(auth(token))
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        res.on('end', () => callback(null, Buffer.concat(chunks)))
      })

    expect(downloaded.status).toBe(200)
    expect(String(downloaded.body)).toContain('# RACI')
    expect(downloaded.headers['content-disposition']).toMatch(/matrix\.md/)

    const uploaded = await request(ctx.app)
      .post(`/api/v1/artifacts/${SEED_RACI_ID}/files`)
      .set(auth(token))
      .attach('file', Buffer.from('notes'), 'notes.md')

    expect(uploaded.status).toBe(201)
    expect(uploaded.body.data.originalName).toBe('notes.md')
    expect(uploaded.headers.location).toBe(
      `/api/v1/artifacts/${SEED_RACI_ID}/files/${uploaded.body.data.id}`,
    )
  })

  it('lets a member upload an allowed file', async () => {
    ctx = createTestContext()
    const token = await login(ctx.app, 'member@thoughtfocus.com', 'Member123!')
    const uploaded = await request(ctx.app)
      .post(`/api/v1/artifacts/${SEED_BRD_ID}/files`)
      .set(auth(token))
      .attach('file', Buffer.from('notes'), 'notes.md')

    expect(uploaded.status).toBe(201)
    expect(uploaded.body.data.originalName).toBe('notes.md')
    expect(uploaded.headers.location).toBe(
      `/api/v1/artifacts/${SEED_BRD_ID}/files/${uploaded.body.data.id}`,
    )
  })

  it('rejects disallowed file types with 422', async () => {
    ctx = createTestContext()
    const token = await login(ctx.app)
    const response = await request(ctx.app)
      .post(`/api/v1/artifacts/${SEED_BRD_ID}/files`)
      .set(auth(token))
      .attach('file', Buffer.from('exe'), 'payload.exe')

    expect(response.status).toBe(422)
  })

  it('rejects oversized files with 413', async () => {
    ctx = createTestContext()
    const token = await login(ctx.app)
    const big = Buffer.alloc(10 * 1024 * 1024 + 1, 1)
    const response = await request(ctx.app)
      .post(`/api/v1/artifacts/${SEED_BRD_ID}/files`)
      .set(auth(token))
      .attach('file', big, 'huge.md')

    expect(response.status).toBe(413)
  })

  it('lets an admin delete any file and a member delete only their own', async () => {
    ctx = createTestContext()
    const memberToken = await login(ctx.app, 'member@thoughtfocus.com', 'Member123!')
    const adminToken = await login(ctx.app)

    const memberUpload = await request(ctx.app)
      .post(`/api/v1/artifacts/${SEED_BRD_ID}/files`)
      .set(auth(memberToken))
      .attach('file', Buffer.from('mine'), 'mine.md')

    const seedFiles = await request(ctx.app)
      .get(`/api/v1/artifacts/${SEED_BRD_ID}/files`)
      .set(auth(adminToken))
    const seeded = seedFiles.body.data.find((file: { originalName: string }) => file.originalName === 'scope.md')

    const memberDenied = await request(ctx.app)
      .delete(`/api/v1/artifacts/${SEED_BRD_ID}/files/${seeded.id}`)
      .set(auth(memberToken))
    expect(memberDenied.status).toBe(403)

    const memberOwn = await request(ctx.app)
      .delete(`/api/v1/artifacts/${SEED_BRD_ID}/files/${memberUpload.body.data.id}`)
      .set(auth(memberToken))
    expect(memberOwn.status).toBe(204)

    const adminDelete = await request(ctx.app)
      .delete(`/api/v1/artifacts/${SEED_BRD_ID}/files/${seeded.id}`)
      .set(auth(adminToken))
    expect(adminDelete.status).toBe(204)
  })
})
