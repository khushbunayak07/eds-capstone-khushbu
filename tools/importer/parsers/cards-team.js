/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-team. Base: cards (team-member grid).
 * Source: https://www.wknd.site/us/en/about-us.html
 * Selector: .cmp-experience-fragment--contributor
 *
 * Follows the Cards convention: 2-column table; first row = block name; each
 * subsequent row is one card with an image cell (mandatory) + a text cell
 * (name as Heading, role as description, social links as CTAs).
 *
 * Each source contributor is a separate .cmp-experience-fragment--contributor
 * sibling. The page shows TWO grids (Our Contributors, WKND Guides) as two runs
 * of consecutive contributor siblings separated by a heading. This parser,
 * invoked on the FIRST contributor of a run, collects that run into ONE
 * cards-team block and consumes the rest; invoked on an already-consumed
 * (detached) contributor, it no-ops.
 */
export default function parse(element, { document }) {
  // Skip if this element was already consumed by an earlier run.
  if (!element.parentNode) return;

  // Collect this contributor plus consecutive contributor siblings (one grid run).
  const run = [element];
  let sib = element.nextElementSibling;
  while (sib && sib.classList && sib.classList.contains('cmp-experience-fragment--contributor')) {
    run.push(sib);
    sib = sib.nextElementSibling;
  }

  const cells = [];
  run.forEach((card) => {
    // Image cell (mandatory) — avatar
    const img = card.querySelector('.cmp-image__image, .cmp-image img, img');

    // Text cell — name (heading) + role (description) + social links (CTAs)
    const body = [];
    const titles = card.querySelectorAll('.cmp-title__text');
    if (titles[0]) {
      const h3 = document.createElement('h3');
      h3.textContent = titles[0].textContent.trim();
      body.push(h3);
    }
    if (titles[1]) {
      const p = document.createElement('p');
      p.textContent = titles[1].textContent.trim();
      body.push(p);
    }
    const socialLinks = [...card.querySelectorAll('a.cmp-button, a[href]')]
      .filter((a) => a.getAttribute('href'));
    if (socialLinks.length) {
      const ul = document.createElement('ul');
      socialLinks.forEach((a) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = a.getAttribute('href');
        link.textContent = (a.querySelector('.cmp-button__text') || a).textContent.trim();
        li.append(link);
        ul.append(li);
      });
      body.push(ul);
    }

    if (img || body.length) cells.push([img || '', body.length ? body : '']);
  });

  // empty-block guard
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-team', cells });
  // replace the first card with the block; remove the remaining consumed siblings
  element.replaceWith(block);
  run.slice(1).forEach((card) => card.remove());
}
