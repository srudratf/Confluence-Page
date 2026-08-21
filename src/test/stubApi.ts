/** @vitest-environment jsdom */
import { vi } from 'vitest'
import { DEMO_USERS } from '../auth/credentials'
import type { ArtifactDetail, ArtifactSummary } from '../api/types'

export const SEED_BRD: ArtifactSummary = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  slug: 'brd',
  name: 'BRD',
  folder: 'docs',
  path: 'docs/BRD/',
  description: 'Scope, objectives, and success metrics for the 10-session program.',
  status: 'final',
  fileCount: 1,
  createdAt: '2026-07-26T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
}

export const SEED_ARCH: ArtifactSummary = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  slug: 'architecture',
  name: 'Architecture',
  folder: 'docs',
  path: 'docs/architecture/',
  description: 'Lab environment design, reference builds, and the RAG + MCP setup used in exercises.',
  status: 'final',
  fileCount: 1,
  createdAt: '2026-07-26T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
}

export const SEED_RACI: ArtifactSummary = {
  id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  slug: 'raci',
  name: 'RACI',
  folder: 'ops',
  path: 'ops/raci/',
  description: 'Roles and accountable parties for program operations.',
  status: 'draft',
  fileCount: 1,
  createdAt: '2026-07-26T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
}

export const SEED_BLOG: ArtifactSummary = {
  id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  slug: 'blog',
  name: 'Blog',
  folder: 'comms',
  path: 'comms/blog/',
  description: 'Cohort posts and program communications.',
  status: 'draft',
  fileCount: 1,
  createdAt: '2026-07-26T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
}

function json(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    blob: async () => new Blob([JSON.stringify(body)]),
    headers: new Headers(),
  }
}

function publicUser(email: string) {
  const user = DEMO_USERS.find((item) => item.email === email)!
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
  }
}

function permissions(role: string) {
  return role === 'admin'
    ? ['artifacts:read', 'artifacts:manage', 'uploads:create']
    : ['artifacts:read', 'uploads:create']
}

export function stubConfluenceApi() {
  const artifacts: ArtifactSummary[] = [
    { ...SEED_BRD },
    { ...SEED_ARCH },
    { ...SEED_RACI },
    { ...SEED_BLOG },
  ]
  const details = new Map<string, ArtifactDetail>([
    [
      SEED_BRD.id,
      {
        ...SEED_BRD,
        createdBy: DEMO_USERS[0].id,
        updatedBy: DEMO_USERS[0].id,
        files: [
          {
            id: 'file-brd',
            artifactId: SEED_BRD.id,
            originalName: 'scope.md',
            mimeType: 'text/markdown',
            sizeBytes: 120,
            relativePath: 'docs/BRD/scope.md',
            uploadedBy: DEMO_USERS[0].id,
            createdAt: SEED_BRD.createdAt,
          },
        ],
      },
    ],
    [
      SEED_ARCH.id,
      {
        ...SEED_ARCH,
        createdBy: DEMO_USERS[0].id,
        updatedBy: DEMO_USERS[0].id,
        files: [
          {
            id: 'file-arch',
            artifactId: SEED_ARCH.id,
            originalName: 'overview.md',
            mimeType: 'text/markdown',
            sizeBytes: 160,
            relativePath: 'docs/architecture/overview.md',
            uploadedBy: DEMO_USERS[0].id,
            createdAt: SEED_ARCH.createdAt,
          },
        ],
      },
    ],
    [
      SEED_RACI.id,
      {
        ...SEED_RACI,
        createdBy: DEMO_USERS[0].id,
        updatedBy: DEMO_USERS[0].id,
        files: [
          {
            id: 'file-raci',
            artifactId: SEED_RACI.id,
            originalName: 'matrix.md',
            mimeType: 'text/markdown',
            sizeBytes: 140,
            relativePath: 'ops/raci/matrix.md',
            uploadedBy: DEMO_USERS[0].id,
            createdAt: SEED_RACI.createdAt,
          },
        ],
      },
    ],
    [
      SEED_BLOG.id,
      {
        ...SEED_BLOG,
        createdBy: DEMO_USERS[0].id,
        updatedBy: DEMO_USERS[0].id,
        files: [
          {
            id: 'file-blog',
            artifactId: SEED_BLOG.id,
            originalName: 'intro.md',
            mimeType: 'text/markdown',
            sizeBytes: 110,
            relativePath: 'comms/blog/intro.md',
            uploadedBy: DEMO_USERS[0].id,
            createdAt: SEED_BLOG.createdAt,
          },
        ],
      },
    ],
  ])

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method ?? 'GET').toUpperCase()

    if (url.endsWith('/api/v1/auth/login') && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as { email: string; password: string }
      const match = DEMO_USERS.find(
        (user) => user.email === body.email.trim().toLowerCase() && user.password === body.password,
      )
      if (!match) {
        return json(401, {
          error: { code: 'invalid_credentials', message: 'Invalid email or password' },
        })
      }
      return json(200, {
        data: {
          user: publicUser(match.email),
          token: `test.${match.role}`,
          permissions: permissions(match.role),
        },
      })
    }

    if (url.endsWith('/api/v1/auth/signup') && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as { email: string; password: string }
      const email = body.email.trim().toLowerCase()
      const existing = DEMO_USERS.find((user) => user.email === email)
      if (existing) {
        return json(409, {
          error: { code: 'conflict', message: 'An account with this email already exists' },
        })
      }
      const local = email.split('@')[0] ?? ''
      const displayName =
        local
          .split(/[._-]+/)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ') || 'Member'
      return json(201, {
        data: {
          user: {
            id: '33333333-3333-3333-3333-333333333333',
            email,
            role: 'member',
            displayName,
          },
          token: 'test.member',
          permissions: permissions('member'),
        },
      })
    }

    const detailMatch = url.match(/\/api\/v1\/artifacts\/([^/?]+)$/)
    if (detailMatch && method === 'GET') {
      const detail = details.get(detailMatch[1])
      if (!detail) {
        return json(404, { error: { code: 'not_found', message: 'Artifact not found' } })
      }
      return json(200, { data: detail })
    }

    if (url.includes('/api/v1/artifacts') && method === 'GET') {
      const parsed = new URL(url, 'http://localhost')
      const folder = parsed.searchParams.get('folder')
      const query = (parsed.searchParams.get('q') ?? '').toLowerCase()
      let data = artifacts.filter((item) => {
        const folderMatch = !folder || item.folder === folder
        const searchMatch =
          !query || `${item.name} ${item.description}`.toLowerCase().includes(query)
        return folderMatch && searchMatch
      })
      return json(200, {
        data,
        meta: {
          total: data.length,
          page: 1,
          perPage: 100,
          totalPages: 1,
          folderCounts: {
            all: artifacts.length,
            docs: artifacts.filter((item) => item.folder === 'docs').length,
            tests: 0,
            ops: artifacts.filter((item) => item.folder === 'ops').length,
            tools: 0,
            comms: artifacts.filter((item) => item.folder === 'comms').length,
          },
        },
      })
    }

    if (url.endsWith('/api/v1/artifacts') && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as {
        name: string
        folder: ArtifactSummary['folder']
        description: string
        status?: ArtifactSummary['status']
      }
      const created: ArtifactSummary = {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        slug: body.name.toLowerCase().replace(/\s+/g, '-'),
        name: body.name,
        folder: body.folder,
        path: `${body.folder}/${body.name.toLowerCase().replace(/\s+/g, '-')}/`,
        description: body.description,
        status: body.status ?? 'draft',
        fileCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      artifacts.push(created)
      const detail: ArtifactDetail = {
        ...created,
        createdBy: DEMO_USERS[0].id,
        updatedBy: DEMO_USERS[0].id,
        files: [],
      }
      details.set(created.id, detail)
      return json(201, { data: detail })
    }

    return json(404, { error: { code: 'not_found', message: url } })
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
