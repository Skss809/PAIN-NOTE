/**
 * Utilities for cleaning and converting HTML content to plain text,
 * and securely copying text to the clipboard while preserving line shifts.
 */

const BLOCK_TAGS = new Set([
  'P', 'DIV', 'LI', 'TR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
  'BLOCKQUOTE', 'PRE', 'HR', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER'
]);

/**
 * Recursively extracts plain text from a DOM node tree, ensuring
 * block elements and <br> tags produce correct line breaks and spacing.
 */
function nodeToPlainText(root: Node): string {
  let result = '';

  function ensureNewline() {
    if (result.length > 0 && !result.endsWith('\n')) {
      result += '\n';
    }
  }

  function traverse(n: Node) {
    if (!n) return;

    if (n.nodeType === 3) { // TEXT_NODE
      const val = (n.nodeValue || '').replace(/\u00a0/g, ' ');
      result += val;
      return;
    }

    if (n.nodeType !== 1) return; // Only ELEMENT_NODE from here

    const el = n as HTMLElement;
    const tagName = (el.tagName || '').toUpperCase();

    if (tagName === 'BR') {
      result += '\n';
      return;
    }

    if (tagName === 'A') {
      const url = el.getAttribute('data-url') || el.getAttribute('href') || '';
      const rawText = (el.textContent || '').replace(/\u00a0/g, ' ');
      const text = rawText.replace(/^🔗\s*/, '').trim();
      if (text && url && text !== url) {
        result += `${text} (${url})`;
      } else if (text) {
        result += text;
      } else if (url) {
        result += url;
      }
      return;
    }

    const isBlock = BLOCK_TAGS.has(tagName);
    if (isBlock) {
      ensureNewline();
    }

    for (let child = el.firstChild; child; child = child.nextSibling) {
      traverse(child);
    }

    if (isBlock) {
      ensureNewline();
    }
  }

  traverse(root);

  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

export function htmlToPlainText(htmlOrText: string): string {
  if (!htmlOrText) return '';

  // If there are no HTML tags, normalize line endings and return
  if (!/<[a-z/][\s\S]*>/i.test(htmlOrText)) {
    return htmlOrText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  }

  // In browser environment, use DOMParser with recursive node traversal
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlOrText, 'text/html');
      return nodeToPlainText(doc.body);
    } catch {
      // If DOMParser fails, fallback to regex below
    }
  }

  // Robust Regex Fallback
  let str = htmlOrText;
  str = str.replace(/<br\s*\/?>/gi, '\n');
  str = str.replace(/<a\b[^>]*data-url=["']([^"']+)["'][^>]*>(?:<span[^>]*>.*?<\/span>)?([\s\S]*?)<\/a>/gi, (_match, url, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').replace(/^🔗\s*/, '').trim();
    if (cleanText && url && cleanText !== url) return `${cleanText} (${url})`;
    return cleanText || url;
  });
  str = str.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>(?:<span[^>]*>.*?<\/span>)?([\s\S]*?)<\/a>/gi, (_match, url, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').replace(/^🔗\s*/, '').trim();
    if (cleanText && url && cleanText !== url) return `${cleanText} (${url})`;
    return cleanText || url;
  });
  str = str.replace(/<(p|div|li|tr|h[1-6]|blockquote|pre|header|footer|section|article)\b[^>]*>/gi, '\n');
  str = str.replace(/<\/(p|div|li|tr|h[1-6]|blockquote|pre|header|footer|section|article)>/gi, '\n');
  str = str.replace(/<[^>]+>/g, '');
  str = str.replace(/&nbsp;/gi, ' ');
  str = str.replace(/&amp;/gi, '&');
  str = str.replace(/&lt;/gi, '<');
  str = str.replace(/&gt;/gi, '>');
  str = str.replace(/&quot;/gi, '"');
  str = str.replace(/&#39;/gi, "'");
  str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  str = str.replace(/\n{3,}/g, '\n\n');
  return str.trim();
}

/**
 * Strips redundant font-size or empty spans injected by browser contentEditable
 */
export function cleanHtmlSpans(html: string): string {
  if (!html) return '';
  let result = html;
  // Unwrap spans that only define inline font-size (e.g. style="font-size: 14px;")
  result = result.replace(/<span\s+style=["']font-size:\s*\d+px;?["']>([\s\S]*?)<\/span>/gi, '$1');
  // Unwrap completely empty styled spans
  result = result.replace(/<span\s*>([\s\S]*?)<\/span>/gi, '$1');
  return result;
}

/**
 * Copies clean plain text to clipboard, with fallback for iframe contexts
 */
export async function copyTextToClipboard(textOrHtml: string): Promise<boolean> {
  const cleanText = htmlToPlainText(textOrHtml);

  // Modern clipboard API (when permissions allow)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(cleanText);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, attempting fallback...', err);
    }
  }

  // Fallback using temporary textarea + execCommand('copy')
  try {
    const textArea = document.createElement('textarea');
    textArea.value = cleanText;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}
