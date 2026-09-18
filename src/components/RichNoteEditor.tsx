import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { ExternalLink, Copy, Check, Trash2, Edit3, Link as LinkIcon } from 'lucide-react';

export interface DetectedNoteLink {
  url: string;
  suggestedName: string;
  originalMatch: string;
  isMarkdown: boolean;
}

export function detectLinksInContent(htmlOrText: string): DetectedNoteLink[] {
  if (!htmlOrText) return [];
  const detected: DetectedNoteLink[] = [];
  const seenUrls = new Set<string>();

  // 1. Detect markdown links: [Name](URL) or [Name]\n(URL)
  const mdRegex = /\[([^\]]+)\]\s*\((https?:\/\/[^\s\)]+)\)/g;
  let mdMatch;
  while ((mdMatch = mdRegex.exec(htmlOrText)) !== null) {
    const name = mdMatch[1].trim();
    const url = mdMatch[2].trim();
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      detected.push({
        url,
        suggestedName: name,
        originalMatch: mdMatch[0],
        isMarkdown: true
      });
    }
  }

  // 2. Track existing HTML links so we don't re-detect them as raw
  const aRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let aMatch;
  while ((aMatch = aRegex.exec(htmlOrText)) !== null) {
    const url = aMatch[1].trim();
    seenUrls.add(url);
  }

  // 3. Detect raw URLs not wrapped in tags or markdown
  // Strip out HTML tags first to prevent matching href attributes
  const strippedText = htmlOrText.replace(/<a\b[^>]*>.*?<\/a>/gi, '').replace(/<[^>]+>/g, ' ');
  const rawUrlRegex = /(https?:\/\/[^\s<)"']+)/g;
  let rawMatch;
  while ((rawMatch = rawUrlRegex.exec(strippedText)) !== null) {
    let url = rawMatch[1].trim();
    url = url.replace(/[,.;:!?)]+$/, '');
    if (!seenUrls.has(url) && url.length > 8) {
      seenUrls.add(url);
      let suggested = '';
      try {
        const u = new URL(url);
        if (u.hostname.includes('drive.google.com')) {
          suggested = 'Google Drive File';
        } else if (u.hostname.includes('docs.google.com')) {
          suggested = 'Google Doc';
        } else if (u.hostname.includes('github.com')) {
          suggested = 'GitHub Repo';
        } else if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
          suggested = 'YouTube Video';
        } else {
          suggested = u.hostname.replace(/^www\./, '');
        }
      } catch {
        suggested = url;
      }
      detected.push({
        url,
        suggestedName: suggested,
        originalMatch: url,
        isMarkdown: false
      });
    }
  }

  return detected;
}

export function formatContentForDisplay(rawContent: string): string {
  if (!rawContent) return '';
  let result = rawContent;

  // Convert markdown links: [Name](URL) or [Name]\n(URL)
  result = result.replace(/\[([^\]]+)\]\s*\((https?:\/\/[^\s\)]+)\)/g, (_match, name, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" contenteditable="false" class="note-hyperlink" data-url="${url}" title="${url}"><span class="opacity-70 text-xs mr-0.5">🔗</span>${name.trim()}</a>`;
  });

  // If text is raw text with newlines and not HTML
  if (!/<[a-z][\s\S]*>/i.test(result)) {
    result = result.replace(/\n/g, '<br />');
  }

  return result;
}

export interface RichNoteEditorHandle {
  insertHyperlink: (name: string, url: string) => void;
  formatDetectedLinks: (urlMap: Record<string, string>) => void;
  insertCheckbox: () => void;
  getSelectedText: () => string;
}

interface RichNoteEditorProps {
  noteId: string;
  content: string;
  onChange: (content: string) => void;
  isDark: boolean;
  fontFamily?: string;
  fontSize?: number;
  placeholder?: string;
}

export const RichNoteEditor = forwardRef<RichNoteEditorHandle, RichNoteEditorProps>(({
  noteId,
  content,
  onChange,
  isDark,
  fontFamily = 'font-mono',
  fontSize = 14,
  placeholder = 'Start typing your note...'
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const lastSavedRange = useRef<Range | null>(null);

  // Floating tooltip for clicked/hovered link
  const [activeLink, setActiveLink] = useState<{
    url: string;
    text: string;
    targetEl: HTMLAnchorElement;
    x: number;
    y: number;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Initialize and update content
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    if (editorRef.current) {
      const formatted = formatContentForDisplay(content);
      if (editorRef.current.innerHTML !== formatted) {
        editorRef.current.innerHTML = formatted;
      }
    }
  }, [noteId, content]);

  // Track selection inside editor so modal insertions can target caret position
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      lastSavedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const currentHtml = editorRef.current.innerHTML;
    onChange(currentHtml);
  };

  useImperativeHandle(ref, () => ({
    getSelectedText: () => {
      const sel = window.getSelection();
      if (sel && editorRef.current?.contains(sel.anchorNode)) {
        return sel.toString().trim();
      }
      return '';
    },
    insertHyperlink: (name: string, url: string) => {
      if (!editorRef.current) return;
      editorRef.current.focus();

      const linkName = name.trim() || url;
      const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" contenteditable="false" class="note-hyperlink" data-url="${url}" title="${url}"><span class="opacity-70 text-xs mr-0.5">🔗</span>${linkName}</a>&nbsp;`;

      const sel = window.getSelection();
      if (lastSavedRange.current && sel) {
        try {
          sel.removeAllRanges();
          sel.addRange(lastSavedRange.current);
        } catch {
          // ignore
        }
      }

      // Try execCommand insertHTML
      const success = document.execCommand('insertHTML', false, linkHtml);
      if (!success) {
        // Fallback: append or replace
        editorRef.current.innerHTML += linkHtml;
      }

      handleInput();
    },
    formatDetectedLinks: (urlMap: Record<string, string>) => {
      if (!editorRef.current) return;
      let currentHtml = editorRef.current.innerHTML;

      // Replace each detected URL or markdown link
      Object.entries(urlMap).forEach(([url, customName]) => {
        const name = customName.trim() || url;
        const replacement = `<a href="${url}" target="_blank" rel="noopener noreferrer" contenteditable="false" class="note-hyperlink" data-url="${url}" title="${url}"><span class="opacity-70 text-xs mr-0.5">🔗</span>${name}</a>`;

        // 1. Replace markdown forms: [old name](url) or [old name]\n(url)
        const mdPattern = new RegExp(`\\[([^\\]]*)\\]\\s*\\(${escapeRegex(url)}\\)`, 'gi');
        currentHtml = currentHtml.replace(mdPattern, replacement);

        // 2. Replace existing <a> tags for this url
        const aPattern = new RegExp(`<a\\s+[^>]*href=["']${escapeRegex(url)}["'][^>]*>(.*?)<\\/a>`, 'gi');
        currentHtml = currentHtml.replace(aPattern, replacement);

        // 3. Replace standalone raw urls
        currentHtml = currentHtml.split(url).join(replacement);
      });

      editorRef.current.innerHTML = currentHtml;
      handleInput();
    },
    insertCheckbox: () => {
      if (!editorRef.current) return;
      editorRef.current.focus();
      const checkboxHtml = `<div><span class="opacity-50 select-none mr-2 font-mono">☐</span>&nbsp;</div>`;
      document.execCommand('insertHTML', false, checkboxHtml);
      handleInput();
    }
  }));

  const handleClick = (e: React.MouseEvent) => {
    const linkEl = (e.target as HTMLElement).closest('a.note-hyperlink') as HTMLAnchorElement | null;
    if (linkEl) {
      e.preventDefault();
      e.stopPropagation();
      const url = linkEl.getAttribute('data-url') || linkEl.href;
      const rect = linkEl.getBoundingClientRect();
      setActiveLink({
        url,
        text: linkEl.textContent?.replace(/^🔗\s*/, '') || url,
        targetEl: linkEl,
        x: rect.left,
        y: rect.bottom + 6
      });
    } else {
      setActiveLink(null);
    }
  };

  const handleOpenLink = () => {
    if (activeLink?.url) {
      window.open(activeLink.url, '_blank', 'noopener,noreferrer');
      setActiveLink(null);
    }
  };

  const handleCopyLink = () => {
    if (activeLink?.url) {
      navigator.clipboard.writeText(activeLink.url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleRemoveLink = () => {
    if (!activeLink?.targetEl || !editorRef.current) return;
    const textNode = document.createTextNode(activeLink.text);
    activeLink.targetEl.parentNode?.replaceChild(textNode, activeLink.targetEl);
    setActiveLink(null);
    handleInput();
  };

  return (
    <div className="relative flex-1 w-full flex flex-col min-h-0">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onClick={handleClick}
        data-placeholder={placeholder}
        className={`flex-1 w-full outline-none leading-relaxed overflow-y-auto px-1 py-2 ${fontFamily} ${
          isDark ? 'text-neutral-100 quill-dark' : 'text-neutral-900 quill-light'
        }`}
        style={{
          fontSize: `${fontSize}px`,
          minHeight: '200px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      />

      {/* Floating Link Tooltip Popup when a link is clicked */}
      {activeLink && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setActiveLink(null)} 
          />
          <div
            className={`fixed z-50 rounded-xl shadow-2xl border p-2.5 flex flex-col gap-2 max-w-sm animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md ${
              isDark ? 'bg-neutral-900/95 border-neutral-700 text-white' : 'bg-white/95 border-neutral-200 text-neutral-900'
            }`}
            style={{
              top: `${Math.min(activeLink.y, window.innerHeight - 120)}px`,
              left: `${Math.max(16, Math.min(activeLink.x, window.innerWidth - 320))}px`
            }}
          >
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="truncate text-xs font-semibold" title={activeLink.text}>
                {activeLink.text}
              </div>
            </div>
            <div className="truncate text-[11px] opacity-60 max-w-xs font-mono" title={activeLink.url}>
              {activeLink.url}
            </div>
            <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-500/20">
              <button
                type="button"
                onClick={handleOpenLink}
                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Link
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'
                }`}
                title="Copy URL"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleRemoveLink}
                className={`p-1.5 rounded-lg border transition-colors text-red-500 hover:bg-red-500/10 ${
                  isDark ? 'border-neutral-700' : 'border-neutral-200'
                }`}
                title="Remove Link (keep text)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

RichNoteEditor.displayName = 'RichNoteEditor';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
