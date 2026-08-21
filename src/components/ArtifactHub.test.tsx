/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../auth/AuthContext'
import App from '../App'
import { stubConfluenceApi } from '../test/stubApi'

async function signInAsAdmin() {
  const user = userEvent.setup()
  render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  )
  await user.type(screen.getByLabelText(/email/i), 'admin@thoughtfocus.com')
  await user.type(screen.getByLabelText(/password/i), 'Admin123!')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  await screen.findByRole('heading', { name: /Confluence Page/i })
  await screen.findByText('BRD')
  return user
}

describe('ArtifactHub data flow', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows seeded file counts from the API', async () => {
    stubConfluenceApi()
    await signInAsAdmin()

    const brd = screen.getByText('BRD').closest('article')
    expect(brd).not.toBeNull()
    expect(brd).toHaveTextContent('1 file')
  })

  it('opens the new artifact modal and creates via POST', async () => {
    const fetchMock = stubConfluenceApi()
    const user = await signInAsAdmin()

    await user.click(screen.getByRole('button', { name: /new artifact/i }))
    expect(screen.getByRole('dialog', { name: /new artifact/i })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^name$/i), 'Lab Notes')
    await user.selectOptions(screen.getByLabelText(/folder/i), 'ops')
    await user.type(screen.getByLabelText(/description/i), 'Session runbooks')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          String(url) === '/api/v1/artifacts' && (init as RequestInit | undefined)?.method === 'POST',
      ),
    ).toBe(true)
    expect(await screen.findByText('Lab Notes')).toBeInTheDocument()
  })

  it('opens a file panel with seeded files when a card is selected', async () => {
    stubConfluenceApi()
    const user = await signInAsAdmin()

    await user.click(screen.getByRole('button', { name: /BRD/i }))
    expect(await screen.findByRole('heading', { name: 'BRD' })).toBeInTheDocument()
    expect(await screen.findByText('scope.md')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
  })

  it('shows RACI and Blog cards and opens RACI with matrix.md', async () => {
    stubConfluenceApi()
    const user = await signInAsAdmin()

    expect(screen.getByText('RACI')).toBeInTheDocument()
    expect(screen.getByText('Blog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /RACI/i }))
    expect(await screen.findByRole('heading', { name: 'RACI' })).toBeInTheDocument()
    expect(await screen.findByText('matrix.md')).toBeInTheDocument()
  })
})
