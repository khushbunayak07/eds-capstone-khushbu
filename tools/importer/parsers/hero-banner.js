/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-banner. Base: hero.
 * Source: https://www.wknd.site/us/en.html
 * Selector: .teaser.cmp-teaser--imagebottom
 *
 * Block structure (1 column, 3 rows): first row = block name;
 * 2nd row = background image; 3rd row = title + subheading + CTA.
 */
export default function parse(element, { document }) {
  // Background image (optional) — row 2
  const img = element.querySelector('.cmp-teaser__image img, .cmp-image img, img');

  // Text content — row 3
  const contentCell = [];
  const title = element.querySelector('.cmp-teaser__title, h1, h2, h3');
  if (title) contentCell.push(title);

  const description = element.querySelector('.cmp-teaser__description, .cmp-teaser__content p');
  if (description) contentCell.push(description);

  const ctaLinks = Array.from(
    element.querySelectorAll('.cmp-teaser__action-link, .cmp-teaser__action-container a'),
  );
  contentCell.push(...ctaLinks);

  // Empty-block guard
  if (!img && !contentCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // 1-column block: each row is a single cell.
  const cells = [];
  if (img) cells.push([img]);
  if (contentCell.length) cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-banner', cells });
  element.replaceWith(block);
}
