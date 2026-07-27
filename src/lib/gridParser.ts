export interface GridData {
  layout: 'grid' | 'text';
  columns?: string[];
  rows?: string[][];
}

export function parseToGrid(text: string): GridData {
  if (!text || text.trim() === '') {
    return { layout: 'text' };
  }

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length < 1) {
    return { layout: 'text' };
  }

  // Common separators: |, -, =, :, ,, or multiple spaces
  const separators = ['|', '=', '-', ':', ',', '  '];
  let bestSeparator = '';
  let bestColumnCount = 0;
  
  const firstLine = lines[0];

  for (const sep of separators) {
    let parts;
    if (sep === '  ') {
      parts = firstLine.split(/\s{2,}/);
    } else {
      parts = firstLine.split(sep);
    }
    
    // Require at least 2 columns to consider it a grid
    if (parts.length > 1 && parts.length > bestColumnCount) {
      bestSeparator = sep;
      bestColumnCount = parts.length;
    }
  }

  if (bestColumnCount < 2) {
    return { layout: 'text' };
  }

  // Parse columns
  let columns: string[];
  if (bestSeparator === '  ') {
    columns = firstLine.split(/\s{2,}/).map(c => c.trim()).filter(c => c !== '');
  } else {
    columns = firstLine.split(bestSeparator).map(c => c.trim());
    // In markdown tables, sometimes ends have empty strings due to |Col1|Col2|
    if (columns.length > 0 && columns[0] === '') columns.shift();
    if (columns.length > 0 && columns[columns.length - 1] === '') columns.pop();
  }

  if (columns.length < 2) {
     return { layout: 'text' };
  }

  const rows: string[][] = [];
  // Parse rows starting from line 1
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Skip markdown table separator lines like |---|---|
    if (/^[\s\|\-\:\=]+$/.test(line)) continue;

    let parts: string[];
    if (bestSeparator === '  ') {
      parts = line.split(/\s{2,}/).map(c => c.trim()).filter(c => c !== '');
    } else {
      parts = line.split(bestSeparator).map(c => c.trim());
      if (parts.length > 0 && parts[0] === '') parts.shift();
      if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
    }
    
    // Ignore lines that don't match column count closely
    // Or we just pad/truncate
    if (parts.length >= columns.length - 1 && parts.length <= columns.length + 1) {
        // Normalize row length to match columns
        while(parts.length < columns.length) parts.push('');
        if (parts.length > columns.length) parts = parts.slice(0, columns.length);
        rows.push(parts);
    }
  }

  return {
    layout: 'grid',
    columns,
    rows
  };
}
