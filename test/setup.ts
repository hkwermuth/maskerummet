import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Global mock af next/navigation. Tests der har brug for konkret routing-
// adfærd kan overstyre med vi.mock('next/navigation', () => ({...})) i deres
// egen describe-blok. Default-mock'en sørger bare for at useRouter() og
// useSearchParams() ikke kaster "invariant expected app router to be mounted"
// i jsdom-tests der renderer komponenter med disse hooks.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
}))
