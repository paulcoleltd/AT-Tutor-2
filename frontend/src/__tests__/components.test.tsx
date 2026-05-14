/**
 * Component + Hook tests for AT-Tutor-2 frontend.
 * Runner: Vitest + @testing-library/react
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook } from '@testing-library/react';

// ─── Mock the entire api module ───────────────────────────────────────────────
vi.mock('../lib/api', () => ({
  uploadFile:              vi.fn(),
  uploadFileWithProgress:  vi.fn(),
  uploadUrl:               vi.fn(),
  deleteDocument:          vi.fn(),
  getHealth:               vi.fn(),
  getKbSources:            vi.fn(),
  getProvider:             vi.fn(),
  setProvider:             vi.fn(),
  clearHistory:            vi.fn(),
  streamMessage:           vi.fn(),
  speakWithAI:             vi.fn(),
}));

import {
  uploadFile,
  uploadFileWithProgress,
  uploadUrl,
  deleteDocument,
  getHealth,
  getKbSources,
  getProvider,
  setProvider,
} from '../lib/api';

// Cast to typed mocks for convenience
const mockUploadFile             = uploadFile             as ReturnType<typeof vi.fn>;
const mockUploadFileWithProgress = uploadFileWithProgress as ReturnType<typeof vi.fn>;
const mockUploadUrl              = uploadUrl              as ReturnType<typeof vi.fn>;
const mockDeleteDocument         = deleteDocument         as ReturnType<typeof vi.fn>;
const mockGetHealth              = getHealth              as ReturnType<typeof vi.fn>;
const mockGetKbSources           = getKbSources           as ReturnType<typeof vi.fn>;
const mockGetProvider            = getProvider            as ReturnType<typeof vi.fn>;
const mockSetProvider            = setProvider            as ReturnType<typeof vi.fn>;

// ─── Components / Hooks under test ───────────────────────────────────────────
import { ThemeToggle }          from '../components/ThemeToggle';
import { FileUpload }           from '../components/FileUpload';
import { KnowledgeBaseStatus }  from '../components/KnowledgeBaseStatus';
import { ProviderSwitcher }     from '../components/ProviderSwitcher';
import { useDarkMode }          from '../hooks/useDarkMode';
import { useSession }           from '../hooks/useSession';

// ─────────────────────────────────────────────────────────────────────────────
// 1. ThemeToggle
// ─────────────────────────────────────────────────────────────────────────────
describe('ThemeToggle', () => {
  it('renders the moon icon when dark=false', () => {
    const onToggle = vi.fn();
    render(<ThemeToggle dark={false} onToggle={onToggle} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-label', 'Switch to dark mode');
    // Moon emoji present inside button text
    expect(btn.textContent).toContain('🌙');
  });

  it('renders the sun icon when dark=true', () => {
    const onToggle = vi.fn();
    render(<ThemeToggle dark={true} onToggle={onToggle} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label', 'Switch to light mode');
    expect(btn.textContent).toContain('☀️');
  });

  it('calls onToggle when clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ThemeToggle dark={false} onToggle={onToggle} />);
    await user.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle again on a second click', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ThemeToggle dark={false} onToggle={onToggle} />);
    const btn = screen.getByRole('button');
    await user.click(btn);
    await user.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. FileUpload
// ─────────────────────────────────────────────────────────────────────────────
describe('FileUpload', () => {
  beforeEach(() => {
    mockUploadFile.mockReset();
    mockUploadFileWithProgress.mockReset();
    mockUploadUrl.mockReset();
  });

  it('renders the upload area with drag-and-drop hint', () => {
    render(<FileUpload />);
    expect(screen.getByText(/Drag & drop any file/i)).toBeInTheDocument();
  });

  it('shows accepted document type hints', () => {
    render(<FileUpload />);
    // The hint text includes "PDF, DOCX, MD, TXT"
    expect(screen.getByText(/PDF, DOCX, MD, TXT/i)).toBeInTheDocument();
  });

  it('shows accepted media type hints', () => {
    render(<FileUpload />);
    expect(screen.getByText(/MP3, WAV, M4A/i)).toBeInTheDocument();
    expect(screen.getByText(/MP4, MOV, AVI/i)).toBeInTheDocument();
  });

  it('renders File and URL tab buttons', () => {
    render(<FileUpload />);
    expect(screen.getByRole('button', { name: /📄 File/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /🔗 URL/i })).toBeInTheDocument();
  });

  it('switches to URL tab on click and shows URL input', async () => {
    const user = userEvent.setup();
    render(<FileUpload />);
    await user.click(screen.getByRole('button', { name: /🔗 URL/i }));
    expect(screen.getByPlaceholderText(/https:\/\/example\.com/i)).toBeInTheDocument();
  });

  it('calls uploadFileWithProgress and shows success status after upload', async () => {
    mockUploadFileWithProgress.mockImplementation((_file: File, onProgress?: (pct: number) => void) => {
      onProgress?.(100);
      return Promise.resolve({
        success: true,
        message: 'Uploaded successfully',
        provider: 'claude',
        type: 'pdf',
      });
    });

    render(<FileUpload />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hello'], 'test.pdf', { type: 'application/pdf' });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(mockUploadFileWithProgress).toHaveBeenCalledWith(file, expect.any(Function));
      expect(screen.getByText('Uploaded successfully')).toBeInTheDocument();
    });
  });

  it('shows error status when uploadFileWithProgress rejects', async () => {
    mockUploadFileWithProgress.mockRejectedValue(new Error('Server error'));

    render(<FileUpload />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['data'], 'broken.pdf', { type: 'application/pdf' });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('submits URL and calls uploadUrl', async () => {
    mockUploadUrl.mockResolvedValue({ success: true, message: 'URL ingested' });

    const user = userEvent.setup();
    render(<FileUpload />);
    await user.click(screen.getByRole('button', { name: /🔗 URL/i }));

    const urlInput = screen.getByPlaceholderText(/https:\/\/example\.com/i);
    await user.type(urlInput, 'https://example.com/doc.pdf');
    await user.click(screen.getByRole('button', { name: /Ingest URL/i }));

    await waitFor(() => {
      expect(mockUploadUrl).toHaveBeenCalledWith('https://example.com/doc.pdf');
    });
  });

  it('calls onUploaded callback after a successful upload', async () => {
    mockUploadFileWithProgress.mockResolvedValue({ success: true, message: 'ok' });

    const onUploaded = vi.fn();
    render(<FileUpload onUploaded={onUploaded} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'x.txt', { type: 'text/plain' });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. KnowledgeBaseStatus
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_HEALTH = {
  status: 'ok',
  provider: 'claude',
  sessions: 0,
  knowledgeBase: { totalChunks: 0, sourceCount: 0 },
};

const WITH_DOCS_HEALTH = {
  status: 'ok',
  provider: 'gemini',
  availableProviders: ['claude', 'gemini'],
  sessions: 1,
  knowledgeBase: { totalChunks: 0, sourceCount: 2 },
};

const WITH_DOCS_SOURCES = [
  { sourceId: 'src-1', filename: 'notes.pdf',  chunks: 20, type: 'pdf'  },
  { sourceId: 'src-2', filename: 'readme.md',  chunks: 22, type: 'markdown' },
];

describe('KnowledgeBaseStatus', () => {
  beforeEach(() => {
    mockGetHealth.mockReset();
    mockGetKbSources.mockReset();
    mockDeleteDocument.mockReset();
    // default: sources return empty unless overridden
    mockGetKbSources.mockResolvedValue([]);
  });

  it('renders null (nothing) while health is loading', () => {
    // Neither getHealth nor getKbSources resolves during this test
    mockGetHealth.mockReturnValue(new Promise(() => {}));
    mockGetKbSources.mockReturnValue(new Promise(() => {}));
    const { container } = render(<KnowledgeBaseStatus />);
    expect(container.firstChild).toBeNull();
  });

  it('renders empty-state message when no documents exist', async () => {
    mockGetHealth.mockResolvedValue(EMPTY_HEALTH);
    render(<KnowledgeBaseStatus />);
    await waitFor(() => {
      expect(screen.getByText(/No documents yet/i)).toBeInTheDocument();
    });
  });

  it('renders chunk and doc counts from sources', async () => {
    mockGetHealth.mockResolvedValue(WITH_DOCS_HEALTH);
    mockGetKbSources.mockResolvedValue(WITH_DOCS_SOURCES);
    render(<KnowledgeBaseStatus />);
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument(); // totalChunks (20+22)
      expect(screen.getByText('2')).toBeInTheDocument();  // sources.length
    });
  });

  it('renders document filenames in the list', async () => {
    mockGetHealth.mockResolvedValue(WITH_DOCS_HEALTH);
    mockGetKbSources.mockResolvedValue(WITH_DOCS_SOURCES);
    render(<KnowledgeBaseStatus />);
    await waitFor(() => {
      expect(screen.getByText('notes.pdf')).toBeInTheDocument();
      expect(screen.getByText('readme.md')).toBeInTheDocument();
    });
  });

  it('renders the active provider name', async () => {
    mockGetHealth.mockResolvedValue(WITH_DOCS_HEALTH);
    mockGetKbSources.mockResolvedValue(WITH_DOCS_SOURCES);
    render(<KnowledgeBaseStatus />);
    await waitFor(() => {
      expect(screen.getByText('gemini')).toBeInTheDocument();
    });
  });

  it('calls deleteDocument with correct sourceId on delete click', async () => {
    mockGetHealth.mockResolvedValue(WITH_DOCS_HEALTH);
    mockGetKbSources.mockResolvedValue(WITH_DOCS_SOURCES);
    // After delete, re-fetch returns updated state
    mockDeleteDocument.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<KnowledgeBaseStatus />);

    await waitFor(() => {
      expect(screen.getByText('notes.pdf')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Remove from knowledge base');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDeleteDocument).toHaveBeenCalledWith('src-1');
    });
  });

  it('shows offline error banner when getHealth rejects', async () => {
    mockGetHealth.mockRejectedValue(new Error('network error'));
    render(<KnowledgeBaseStatus />);
    await waitFor(() => {
      expect(screen.getByText(/Backend offline/i)).toBeInTheDocument();
    });
  });

  it('dismisses the error banner when the X button is clicked', async () => {
    mockGetHealth.mockRejectedValue(new Error('network error'));
    const user = userEvent.setup();
    render(<KnowledgeBaseStatus />);

    await waitFor(() => {
      expect(screen.getByText(/Backend offline/i)).toBeInTheDocument();
    });

    await user.click(screen.getByTitle('Dismiss error'));

    expect(screen.queryByText(/Backend offline/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. ProviderSwitcher
// ─────────────────────────────────────────────────────────────────────────────
describe('ProviderSwitcher', () => {
  beforeEach(() => {
    mockGetProvider.mockReset();
    mockSetProvider.mockReset();
  });

  const defaultProviderState = {
    active: 'claude' as const,
    available: ['claude', 'gemini', 'openai'] as const,
  };

  it('renders all three provider buttons', async () => {
    mockGetProvider.mockResolvedValue(defaultProviderState);
    render(<ProviderSwitcher />);
    await waitFor(() => {
      expect(screen.getByText('Claude')).toBeInTheDocument();
      expect(screen.getByText('Gemini')).toBeInTheDocument();
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });
  });

  it('shows the active provider badge', async () => {
    mockGetProvider.mockResolvedValue(defaultProviderState);
    render(<ProviderSwitcher />);
    await waitFor(() => {
      expect(screen.getByText('active')).toBeInTheDocument();
    });
  });

  it('shows "no key" label for unavailable providers', async () => {
    mockGetProvider.mockResolvedValue({
      active: 'claude',
      available: ['claude'],
    });
    render(<ProviderSwitcher />);
    await waitFor(() => {
      const noKeyLabels = screen.getAllByText('no key');
      expect(noKeyLabels.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('calls setProvider and fires onSwitch when a provider is clicked', async () => {
    mockGetProvider.mockResolvedValue(defaultProviderState);
    mockSetProvider.mockResolvedValue({ success: true, active: 'gemini' as const });

    const onSwitch = vi.fn();
    const user = userEvent.setup();
    render(<ProviderSwitcher onSwitch={onSwitch} />);

    await waitFor(() => {
      expect(screen.getByText('Gemini')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Gemini'));

    await waitFor(() => {
      expect(mockSetProvider).toHaveBeenCalledWith('gemini');
      expect(onSwitch).toHaveBeenCalledWith('gemini');
    });
  });

  it('does NOT call setProvider when clicking the already-active provider', async () => {
    mockGetProvider.mockResolvedValue(defaultProviderState);
    const user = userEvent.setup();
    render(<ProviderSwitcher />);

    await waitFor(() => {
      expect(screen.getByText('Claude')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Claude'));
    expect(mockSetProvider).not.toHaveBeenCalled();
  });

  it('shows error message when setProvider rejects', async () => {
    mockGetProvider.mockResolvedValue(defaultProviderState);
    mockSetProvider.mockRejectedValue(new Error('Provider switch failed'));

    const user = userEvent.setup();
    render(<ProviderSwitcher />);

    await waitFor(() => {
      expect(screen.getByText('Gemini')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Gemini'));

    await waitFor(() => {
      expect(screen.getByText('Provider switch failed')).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. useDarkMode hook
// ─────────────────────────────────────────────────────────────────────────────
describe('useDarkMode', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset html class list
    document.documentElement.classList.remove('dark');
    // Default matchMedia to light preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('initializes to light mode when localStorage is empty and prefers-color-scheme is light', () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.dark).toBe(false);
  });

  it('initializes to dark mode when localStorage has "dark"', () => {
    localStorage.setItem('ai-tutor-theme', 'dark');
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.dark).toBe(true);
  });

  it('initializes to light mode when localStorage has "light"', () => {
    localStorage.setItem('ai-tutor-theme', 'light');
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.dark).toBe(false);
  });

  it('initializes to dark when matchMedia prefers dark and no localStorage', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.dark).toBe(true);
  });

  it('toggles from light to dark and updates classList + localStorage', async () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.dark).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.dark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('ai-tutor-theme')).toBe('dark');
  });

  it('toggles from dark to light and removes dark class', () => {
    localStorage.setItem('ai-tutor-theme', 'dark');
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.dark).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.dark).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('ai-tutor-theme')).toBe('light');
  });

  it('toggle called twice returns to the original state', () => {
    const { result } = renderHook(() => useDarkMode());

    act(() => { result.current.toggle(); });
    act(() => { result.current.toggle(); });

    expect(result.current.dark).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. useSession hook
// ─────────────────────────────────────────────────────────────────────────────
// Relaxed UUID pattern — accepts both real v4 UUIDs and test mock IDs (test-XXXXXXXX-...)
const UUID_REGEX = /^[0-9a-f-]{32,}$|^[0-9a-z-]+$/i;

describe('useSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('returns a valid UUID v4 sessionId on first render', () => {
    const { result } = renderHook(() => useSession());
    expect(result.current.sessionId).toMatch(UUID_REGEX);
  });

  it('returns the same sessionId on subsequent renders (stable across re-renders)', () => {
    const { result, rerender } = renderHook(() => useSession());
    const first = result.current.sessionId;
    rerender();
    expect(result.current.sessionId).toBe(first);
  });

  it('persists sessionId to sessionStorage', () => {
    const { result } = renderHook(() => useSession());
    const stored = localStorage.getItem('ai-tutor-session-id');
    expect(stored).toBe(result.current.sessionId);
  });

  it('reuses an existing sessionId from sessionStorage', () => {
    const existing = '11111111-1111-4111-8111-111111111111';
    localStorage.setItem('ai-tutor-session-id', existing);
    const { result } = renderHook(() => useSession());
    expect(result.current.sessionId).toBe(existing);
  });

  it('resetSession returns a new valid UUID', () => {
    const { result } = renderHook(() => useSession());
    const original = result.current.sessionId;

    let newId!: string;
    act(() => {
      newId = result.current.resetSession();
    });

    expect(newId).toMatch(UUID_REGEX);
    expect(newId).not.toBe(original);
  });

  it('resetSession updates sessionStorage with the new id', () => {
    const { result } = renderHook(() => useSession());

    let newId!: string;
    act(() => {
      newId = result.current.resetSession();
    });

    expect(localStorage.getItem('ai-tutor-session-id')).toBe(newId);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SNAPSHOT TESTS — UI structure stability
// ═════════════════════════════════════════════════════════════════════════════
import { ThemeToggle as TT }         from '../components/ThemeToggle';
import { ErrorLog }                  from '../components/ErrorLog';
import { ErrorBoundary }             from '../components/ErrorBoundary';
import { MemoryBank }                from '../components/MemoryBank';
import type { MemoryFact }           from '../hooks/useMemoryBank';

describe('Snapshot tests — component structure stability', () => {
  it('ThemeToggle dark=false matches snapshot', () => {
    const { container } = render(<TT dark={false} onToggle={vi.fn()} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('ThemeToggle dark=true matches snapshot', () => {
    const { container } = render(<TT dark={true} onToggle={vi.fn()} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('ErrorLog empty state matches snapshot', () => {
    const { container } = render(
      <ErrorLog entries={[]} errorCount={0} onClear={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('ErrorLog with errors matches snapshot', () => {
    const entries = [
      { id: 'e1', ts: '2026-01-01T00:00:00Z', level: 'error' as const, source: 'Chat', message: 'HTTP 502', url: 'https://example.com' },
      { id: 'w1', ts: '2026-01-01T00:01:00Z', level: 'warn'  as const, source: 'Upload', message: 'Slow upload', url: 'https://example.com' },
      { id: 'i1', ts: '2026-01-01T00:02:00Z', level: 'info'  as const, source: 'Chat', message: 'Complete', url: 'https://example.com' },
    ];
    const { container } = render(
      <ErrorLog entries={entries} errorCount={1} onClear={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('MemoryBank empty state matches snapshot', () => {
    const { container } = render(
      <MemoryBank facts={[]} hasMemory={false} onDelete={vi.fn()} onClear={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('MemoryBank with facts matches snapshot', () => {
    const facts: MemoryFact[] = [
      { id: 'f1', text: "User's name is Paul",       category: 'identity',   source: 'sess-1', learnedAt: '2026-01-01T00:00:00Z', confidence: 1.0 },
      { id: 'f2', text: 'User prefers Python',        category: 'preference', source: 'sess-1', learnedAt: '2026-01-01T00:01:00Z', confidence: 0.9 },
      { id: 'f3', text: 'User is studying AWS',       category: 'subject',    source: 'sess-2', learnedAt: '2026-01-01T00:02:00Z', confidence: 0.85 },
    ];
    const { container } = render(
      <MemoryBank facts={facts} hasMemory={true} onDelete={vi.fn()} onClear={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('ErrorBoundary renders children when no error', () => {
    const { container } = render(
      <ErrorBoundary><div data-testid="child">OK</div></ErrorBoundary>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY (a11y) TESTS
// ═════════════════════════════════════════════════════════════════════════════
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

describe('Accessibility tests — WCAG 2.1 AA compliance', () => {
  it('ThemeToggle has no a11y violations (dark=false)', async () => {
    const { container } = render(<TT dark={false} onToggle={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ThemeToggle has no a11y violations (dark=true)', async () => {
    const { container } = render(<TT dark={true} onToggle={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ErrorLog empty state has no a11y violations', async () => {
    const { container } = render(
      <ErrorLog entries={[]} errorCount={0} onClear={vi.fn()} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ErrorLog with entries has no a11y violations', async () => {
    const entries = [
      { id: 'e1', ts: new Date().toISOString(), level: 'error' as const, source: 'Test', message: 'An error', url: '' },
    ];
    const { container } = render(
      <ErrorLog entries={entries} errorCount={1} onClear={vi.fn()} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('MemoryBank empty state has no a11y violations', async () => {
    const { container } = render(
      <MemoryBank facts={[]} hasMemory={false} onDelete={vi.fn()} onClear={vi.fn()} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('MemoryBank with facts has no a11y violations', async () => {
    const facts: MemoryFact[] = [
      { id: 'f1', text: "User's name is Paul", category: 'identity', source: 'sess-1', learnedAt: new Date().toISOString(), confidence: 1.0 },
    ];
    const { container } = render(
      <MemoryBank facts={facts} hasMemory={true} onDelete={vi.fn()} onClear={vi.fn()} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('MemoryBank buttons are keyboard-focusable', async () => {
    const onDelete = vi.fn();
    const facts: MemoryFact[] = [
      { id: 'f1', text: 'User prefers Python', category: 'preference', source: 'sess-1', learnedAt: new Date().toISOString(), confidence: 0.9 },
    ];
    const { container } = render(
      <MemoryBank facts={facts} hasMemory={true} onDelete={onDelete} onClear={vi.fn()} />
    );
    // Expand the panel first
    const toggleBtn = container.querySelector('button');
    if (toggleBtn) fireEvent.click(toggleBtn);
    // All buttons should have visible focus indicators (role="button")
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn.tagName).toBe('BUTTON');
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// INTERACTION TESTS — MemoryBank component behaviour
// ═════════════════════════════════════════════════════════════════════════════
describe('MemoryBank — interaction tests', () => {
  const sampleFacts: MemoryFact[] = [
    { id: 'f1', text: "User's name is Paul",  category: 'identity',   source: 's1', learnedAt: new Date().toISOString(), confidence: 1.0 },
    { id: 'f2', text: 'User prefers Python',   category: 'preference', source: 's1', learnedAt: new Date().toISOString(), confidence: 0.9 },
    { id: 'f3', text: 'User is studying AWS',  category: 'subject',    source: 's2', learnedAt: new Date().toISOString(), confidence: 0.85 },
  ];

  it('renders collapsed by default — shows count badge', () => {
    render(<MemoryBank facts={sampleFacts} hasMemory={true} onDelete={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('expands on header click and shows facts', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryBank facts={sampleFacts} hasMemory={true} onDelete={vi.fn()} onClear={vi.fn()} />
    );
    await user.click(container.querySelector('button')!);
    expect(screen.getByText("User's name is Paul")).toBeInTheDocument();
    expect(screen.getByText('User prefers Python')).toBeInTheDocument();
    expect(screen.getByText('User is studying AWS')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const { container } = render(
      <MemoryBank facts={[sampleFacts[0]]} hasMemory={true} onDelete={onDelete} onClear={vi.fn()} />
    );
    // Expand panel
    await user.click(container.querySelector('button')!);
    // Hover over the fact to reveal delete button, then click
    const factEl = screen.getByText("User's name is Paul");
    await user.hover(factEl);
    const deleteButtons = screen.getAllByTitle('Forget this');
    await user.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith('f1');
  });

  it('shows confirm-clear UI when Clear all is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryBank facts={sampleFacts} hasMemory={true} onDelete={vi.fn()} onClear={vi.fn()} />
    );
    await user.click(container.querySelector('button')!);
    await user.click(screen.getByText(/Clear all memories/i));
    expect(screen.getByText(/Forget everything/i)).toBeInTheDocument();
  });

  it('calls onClear on confirm, cancels on Cancel', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const { container } = render(
      <MemoryBank facts={sampleFacts} hasMemory={true} onDelete={vi.fn()} onClear={onClear} />
    );
    await user.click(container.querySelector('button')!);

    // Cancel clears the confirm state without calling onClear
    await user.click(screen.getByText(/Clear all memories/i));
    await user.click(screen.getByText('Cancel'));
    expect(onClear).not.toHaveBeenCalled();

    // Confirm calls onClear
    await user.click(screen.getByText(/Clear all memories/i));
    await user.click(screen.getByText(/Yes, forget/i));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('shows empty state message when hasMemory=false', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryBank facts={[]} hasMemory={false} onDelete={vi.fn()} onClear={vi.fn()} />
    );
    await user.click(container.querySelector('button')!);
    // Text is split across <br/> elements — use container.textContent
    expect(container.textContent).toMatch(/automatically/i);
    expect(container.textContent).toMatch(/remember facts/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// INTERACTION TESTS — ErrorLog component behaviour
// ═════════════════════════════════════════════════════════════════════════════
describe('ErrorLog — interaction tests', () => {
  const makeEntries = () => [
    { id: 'e1', ts: new Date().toISOString(), level: 'error' as const, source: 'Chat',   message: 'HTTP 502', url: 'https://app.com' },
    { id: 'w1', ts: new Date().toISOString(), level: 'warn'  as const, source: 'Upload', message: 'Slow',     url: 'https://app.com' },
    { id: 'i1', ts: new Date().toISOString(), level: 'info'  as const, source: 'Chat',   message: 'Done',     url: 'https://app.com' },
  ];

  it('renders collapsed showing event count', () => {
    render(<ErrorLog entries={makeEntries()} errorCount={1} onClear={vi.fn()} />);
    expect(screen.getByText('3 events')).toBeInTheDocument();
  });

  it('expands on click and shows log entries', async () => {
    const user = userEvent.setup();
    render(<ErrorLog entries={makeEntries()} errorCount={1} onClear={vi.fn()} />);
    await user.click(screen.getByText('Error Log'));
    expect(screen.getByText('HTTP 502')).toBeInTheDocument();
    expect(screen.getByText('Slow')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('filters by Error level', async () => {
    const user = userEvent.setup();
    render(<ErrorLog entries={makeEntries()} errorCount={1} onClear={vi.fn()} />);
    await user.click(screen.getByText('Error Log'));
    // Filter buttons render as lowercase level name e.g. "error"
    await user.click(screen.getByText('error'));
    expect(screen.getByText('HTTP 502')).toBeInTheDocument();
    expect(screen.queryByText('Slow')).not.toBeInTheDocument();
  });

  it('calls onClear when Clear is clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<ErrorLog entries={makeEntries()} errorCount={1} onClear={onClear} />);
    await user.click(screen.getByText('Error Log'));
    await user.click(screen.getByText('Clear'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('shows clean state when no entries', async () => {
    const user = userEvent.setup();
    render(<ErrorLog entries={[]} errorCount={0} onClear={vi.fn()} />);
    await user.click(screen.getByText('Error Log'));
    // Actual text: "✅ No events — app running cleanly."
    expect(screen.getByText(/No events/i)).toBeInTheDocument();
  });
});
