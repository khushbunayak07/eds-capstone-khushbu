import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Recent articles block (homepage).
 *
 * Fetches the magazine query-index, sorts by date (newest first), keeps the
 * latest few articles, and renders one card per row — image (optimized
 * <picture>), title, description, and a link to the article. Replaces the
 * static author-placed featured cards.
 *
 * Authoring: the block's first cell may optionally override the query-index
 * path (a link or plain text). Defaults to the magazine section index.
 */

const DEFAULT_INDEX = '/us/en/magazine/query-index.json';
const DEFAULT_LIMIT = 3;

/**
 * Resolve the query-index URL from optional block content, else the default.
 * @param {Element} block
 * @returns {string}
 */
function resolveIndexPath(block) {
  const link = block.querySelector('a[href]');
  if (link) return link.getAttribute('href');
  const text = block.textContent.trim();
  if (text && text.includes('query-index')) return text;
  return DEFAULT_INDEX;
}

/**
 * Parse a YYYY-MM-DD date string into a sortable timestamp.
 * Empty or unparseable dates return -Infinity so they sort last in the
 * date-descending order.
 * @param {*} value
 * @returns {number}
 */
function toTimestamp(value) {
  if (!value || String(value).trim() === '') return -Infinity;
  const parsed = Date.parse(String(value).trim());
  return Number.isNaN(parsed) ? -Infinity : parsed;
}

/**
 * Build a single card element from a query-index row.
 * @param {object} row
 * @param {Document} doc
 * @returns {HTMLLIElement}
 */
function buildCard(row, doc) {
  const li = doc.createElement('li');
  const link = row.path || '#';

  // image cell — optimized picture wrapped in the article link
  if (row.image) {
    const imageCell = doc.createElement('div');
    imageCell.className = 'recent-articles-card-image';
    const picture = createOptimizedPicture(row.image, row.title || '', false, [{ width: '750' }]);
    const imgAnchor = doc.createElement('a');
    imgAnchor.href = link;
    imgAnchor.append(picture);
    imageCell.append(imgAnchor);
    li.append(imageCell);
  }

  // body cell — title (linked) + description
  const body = doc.createElement('div');
  body.className = 'recent-articles-card-body';

  if (row.title) {
    const h3 = doc.createElement('h3');
    const titleLink = doc.createElement('a');
    titleLink.href = link;
    titleLink.textContent = row.title;
    h3.append(titleLink);
    body.append(h3);
  }

  if (row.description) {
    const p = doc.createElement('p');
    p.textContent = row.description;
    body.append(p);
  }

  li.append(body);
  return li;
}

export default async function decorate(block) {
  const indexPath = resolveIndexPath(block);

  // clear any static author-placed content — this block is fully dynamic
  block.textContent = '';

  let rows = [];
  try {
    const resp = await fetch(indexPath);
    if (resp.ok) {
      const json = await resp.json();
      rows = Array.isArray(json.data) ? json.data : [];
    }
  } catch (e) {
    rows = [];
  }

  // sort by date descending (newest first); rows without a date fall to the end
  rows.sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));

  // keep only the latest few
  const latest = rows.slice(0, DEFAULT_LIMIT);

  const ul = document.createElement('ul');
  latest.forEach((row) => ul.append(buildCard(row, document)));
  block.append(ul);
}
