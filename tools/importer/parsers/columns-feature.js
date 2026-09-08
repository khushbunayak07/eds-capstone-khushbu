/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-feature. Base: columns.
 * Source: https://www.wknd.site/us/en.html
 * Selector: .teaser.cmp-teaser--featured
 *
 * Block structure (2 columns, single content row): first row = block name;
 * second row = [image cell] | [pretitle + title + description + CTA cell].
 */
export default function parse(element, { document }) {
  // Left column: featured image
  const img = element.querySelector('.cmp-teaser__image img, .cmp-image img, img');

  // Right column: text content
  const contentCell = [];
  const pretitle = element.querySelector('.cmp-teaser__pretitle');
  if (pretitle) contentCell.push(pretitle);

  const title = element.querySelector('.cmp-teaser__title, h1, h2, h3');
  if (title) contentCell.push(title);

  const description = element.querySelector('.cmp-teaser__description, .cmp-teaser__content p:not(.cmp-teaser__pretitle)');
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

  const cells = [[img || '', contentCell.length ? contentCell : '']];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-feature', cells });
  element.replaceWith(block);
}
