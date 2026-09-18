import React, { useState, useRef, useEffect } from 'react';

const renderFormattedContent = (content: string) => {
  const escaped = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s()]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline cursor-pointer">$1</a>');
  html = html.replace(/\n/g, '<br />');
  return html;
};

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  isDark?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ content, onChange, className, style, placeholder, isDark }) => {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setIsEditing(false)}
        className={className}
        style={{ ...style, resize: 'none' }}
        placeholder={placeholder}
      />
    );
  }

  const htmlContent = renderFormattedContent(content);

  return (
    <div 
      className={className + " cursor-text"}
      style={{ ...style, minHeight: '100%', overflowY: 'auto' }}
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName === 'A') {
          return;
        }
        if (window.getSelection()?.toString().length) {
          return;
        }
        setIsEditing(true);
      }}
      dangerouslySetInnerHTML={{ __html: htmlContent || (placeholder ? `<span class="opacity-50 italic">${placeholder}</span>` : '') }}
    />
  );
};
