/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND section breaks and section metadata.
 *
 * Homepage template has 6 sections (from page-templates.json). Inserts an <hr>
 * before every section except the first, and a Section Metadata block for each
 * section that carries a `style`.
 *
 * IMPORTANT — non-unique selectors: several section selectors match more than
 * one element on this page (verified in migration-work/cleaned.html):
 *   - `.image-list.list`         → line 281 (rc5) AND line 391 (rc12)
 *   - `.title.cmp-title--underline` → line 276 (rc4) AND line 356 (non-section)
 * A plain `querySelector(selector)` always returns the first match, so rc5 and
 * rc12 would collapse onto the same element — the count-only hook validation
 * would still pass while the real import got wrong boundaries. To avoid that,
 * section elements are resolved in document order: each section consumes the
 * first not-yet-used match that follows the previously resolved section.
 *
 * Breaks are inserted in beforeTransform (while every section element still
 * exists — block parsers run between the hooks and replace matched elements).
 * A marker attribute keeps a stable anchor for styled sections so their
 * Section Metadata block can be placed in afterTransform.
 */
const SECTION_MARKER_ATTR = 'data-excat-section-id';

function resolveSectionElements(root, sections) {
  const resolved = new Map();
  const used = new Set();
  let lastEl = null;
  sections.forEach((section) => {
    const candidates = Array.from(root.querySelectorAll(section.selector));
    let chosen = null;
    for (let c = 0; c < candidates.length; c += 1) {
      const cand = candidates[c];
      if (used.has(cand)) continue;
      // Must appear at-or-after the previously resolved section in document order.
      if (lastEl) {
        const rel = lastEl.compareDocumentPosition(cand);
        const follows = rel & 4; // Node.DOCUMENT_POSITION_FOLLOWING
        if (!follows) continue;
      }
      chosen = cand;
      break;
    }
    if (chosen) {
      resolved.set(section.id, chosen);
      used.add(chosen);
      lastEl = chosen;
    }
  });
  return resolved;
}

export default function transform(hookName, element, payload) {
  const sections = (payload.template && payload.template.sections) || [];

  if (hookName === 'beforeTransform') {
    const resolved = resolveSectionElements(element, sections);
    // Insert in reverse so earlier insertions never shift later anchors.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (i === 0) continue; // first section gets no leading break
      const sectionEl = resolved.get(section.id);
      if (!sectionEl) continue; // selector didn't match on this page — skip, never guess

      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    // Parsers have run; styled sections are anchored by their marker <hr>.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || element.querySelector(section.selector);
      if (!anchor) continue; // neither survived — skip, never guess

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove();
      }
    }
  }
}
