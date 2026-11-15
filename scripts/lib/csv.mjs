// Minimal streaming CSV reader (RFC 4180: quoted fields, "" escapes, newlines inside quotes).
// No dependencies, so the data workflow needs no npm install.
import { createReadStream } from 'node:fs';

export async function* readCsv(source) {
  const stream = typeof source === 'string' ? createReadStream(source, { encoding: 'utf8' }) : source;
  let field = '';
  let row = [];
  let inQuotes = false;
  let pendingQuote = false; // saw a quote inside a quoted field; next char decides
  let header = null;

  const emitRow = function* () {
    row.push(field);
    field = '';
    if (!header) header = row.map((h) => h.replace(/^﻿/, '').trim());
    else if (row.length > 1 || row[0] !== '') {
      const obj = {};
      for (let i = 0; i < header.length; i++) obj[header[i]] = row[i] ?? '';
      yield obj;
    }
    row = [];
  };

  for await (const chunk of stream) {
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (pendingQuote) {
        pendingQuote = false;
        if (c === '"') {
          field += '"';
          continue;
        }
        inQuotes = false; // the quote closed the field; fall through to handle c
      }
      if (inQuotes) {
        if (c === '"') pendingQuote = true;
        else field += c;
        continue;
      }
      if (c === '"') inQuotes = true;
      else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n') yield* emitRow();
      else if (c !== '\r') field += c;
    }
  }
  if (field !== '' || row.length) yield* emitRow();
}
