/* eslint-disable */
/* global WebImporter */
/**
 * Parser for author-bio. Base: custom.
 * Source: https://www.wknd.site/us/en/magazine/san-diego-surf.html
 * Selector: .cmp-byline
 *
 * Block structure (2 rows): first row = block name; then:
 *   row 1: [ author photo ]
 *   row 2: [ name (h-tag) + role/occupations + optional social links ]
 */
export default function parse(element, { document }) {
  const cells = [];

  // photo
  const img = element.querySelector('.cmp-byline__image img, .cmp-image img, img');

  // info: name + role + social
  const info = [];
  const name = element.querySelector('.cmp-byline__name, h1, h2, h3, h4');
  if (name) {
    const h = document.createElement('h3');
    h.textContent = name.textContent.trim();
    info.push(h);
  }
  const role = element.querySelector('.cmp-byline__occupations, p');
  if (role) {
    const p = document.createElement('p');
    p.textContent = role.textContent.trim();
    info.push(p);
  }
  // social links (if any)
  const socialLinks = [...element.querySelectorAll('a[href]')].filter((a) => a.getAttribute('href') && !a.getAttribute('href').startsWith('#'));
  if (socialLinks.length) {
    const ul = document.createElement('ul');
    socialLinks.forEach((a) => {
      const li = document.createElement('li');
      li.append(a.cloneNode(true));
      ul.append(li);
    });
    info.push(ul);
  }

  // empty-block guard
  if (!img && !info.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  if (img) cells.push([img]);
  cells.push([info.length ? info : '']);

  const block = WebImporter.Blocks.createBlock(document, { name: 'author-bio', cells });
  element.replaceWith(block);
}
