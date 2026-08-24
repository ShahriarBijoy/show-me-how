export function slugify(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function topicSlug(topic) {
  const s = slugify(topic).slice(0, 60).replace(/^-+|-+$/g, '');
  return s || 'untitled';
}

export function shotFilename(n, title) {
  return `${String(n).padStart(2, '0')}-${topicSlug(title)}`;
}
