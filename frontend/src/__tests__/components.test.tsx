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
  uploadFile:     vi.fn(),
  uploadUrl:      vi.fn(),
  deleteDocument: vi.fn(),
  getHealth:      vi.fn(),
  getProvider:    vi.fn(),
  setProvider:    vi.fn(),
  clearHistory:   vi.fn(),
  streamMessage:  vi.fn(),
  speakWithAI:    vi.fn(),
}));

import {
  uploadFile,
  uploadUrl,
  deleteDocument,
  getHealth,
  getProvider,
  setProvider,
} from '../lib/api';

// Cast to typed mocks for convenience
const mockUploadFile     = uploadFile     as ReturnType<typeof vi.fn>;
const mockUploadUrl      = uploadUrl      as ReturnType<typeof vi.fn>;
const mockDeleteDocument = deleteDocument as ReturnType<typeof vi.fn>;
const mockGetHealth      = getHealth      as ReturnType<typeof vi.fn>;
const mockGetProvider    = getProvider    as ReturnType<typeof vi.fn>;
const mockSetProvider    = setProvider    as ReturnType<typeof vi.fn>;

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

  it('calls uploadFile and shows success status after upload', async () => {
    mockUploadFile.mockResolvedValue({
      success: true,
      message: 'Uploaded successfully',
      provider: 'claude',
      type: 'pdf',
    });

    render(<FileUpload />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hello'], 'test.pdf', { type: 'application/pdf' });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(file);
      expect(screen.getByText('Uploaded successfully')).toBeInTheDocument();
    });
  });

  it('shows error status when uploadFile rejects', async () => {
    mockUploadFile.mockRejectedValue(new Error('Server error'));

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
    mockUploadFile.mockResolvedValue({ success: true, message: 'ok' });

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
  knowledgeBase: { totalChunks: 0, sources: [] },
};

const WITH_DOCS_HEALTH = {
  status: 'ok',
  provider: 'gemini',
  availableProviders: ['claude', 'gemini'],
  sessions: 1,
  knowledgeBase: {
    totalChunks: 42,
    sources: [
      { sourceId: 'src-1', filename: 'notes.pdf',  chunks: 20, type: 'pdf'  },
      { sourceId: 'src-2', filename: 'readme.md',  chunks: 22, type: 'markdown' },
    ],
  },
};

describe('KnowledgeBaseStatus', () => {
  beforeEach(() => {
    mockGetHealth.mockReset();
    mockDeleteDocument.mockReset();
  });

  it('renders null (nothing) while health is loading', () => {
    // getHealth never resolves during this test
    mockGetHealth.mockReturnValue(new Promise(() => {}));
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

  it('renders chunk and doc counts from health response', async () => {
    mockGetHealth.mockResolvedValue(WITH_DOCS_HEALTH);
    render(<KnowledgeBaseStatus />);
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument(); // totalChunks
      expect(screen.getByText('2')).toBeInTheDocument();  // sources.length
    });
  });

  it('renders document filenames in the list', async () => {
    mockGetHealth.mockResolvedValue(WITH_DOCS_HEALTH);
    render(<KnowledgeBaseStatus />);
    await waitFor(() => {
      expect(screen.getByText('notes.pdf')).toBeInTheDocument();
      expect(screen.getByText('readme.md')).toBeInTheDocument();
    });
  });

  it('renders the active provider name', async () => {
    mockGetHealth.mockResolvedValue(WITH_DOCS_HEALTH);
    render(<KnowledgeBaseStatus />);
    await waitFor(() => {
      expect(screen.getByText('gemini')).toBeInTheDocument();
    });
  });

  it('calls deleteDocument with correct sourceId on delete click', async () => {
    mockGetHealth.mockResolvedValue(WITH_DOCS_HEALTH);
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
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const stored = sessionStorage.getItem('ai-tutor-session-id');
    expect(stored).toBe(result.current.sessionId);
  });

  it('reuses an existing sessionId from sessionStorage', () => {
    const existing = '11111111-1111-4111-8111-111111111111';
    sessionStorage.setItem('ai-tutor-session-id', existing);
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

    expect(sessionStorage.getItem('ai-tutor-session-id')).toBe(newId);
  });
});
