/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-hero. Base: carousel.
 * Source: https://www.wknd.site/us/en.html
 * Selector: .carousel.cmp-carousel--hero
 *
 * Block structure (2 columns): first row = block name; each subsequent row is one
 * slide: [image cell] | [title + description + CTA cell].
 */
export default function parse(element, { document }) {
  // Each carousel item is a slide (one teaser per slide)
  const items = element.querySelectorAll('.cmp-carousel__item');
  const cells = [];

  items.forEach((item) => {
    // Image (mandatory) — first cell
    const img = item.querySelector('.cmp-teaser__image img, .cmp-image img, img');

    // Text content (optional) — second cell
    const contentCell = [];
    const title = item.querySelector('.cmp-teaser__title, h1, h2, h3');
    if (title) contentCell.push(title);

    const description = item.querySelector('.cmp-teaser__description, .cmp-teaser__content p');
    if (description) contentCell.push(description);

    const ctaLinks = Array.from(
      item.querySelectorAll('.cmp-teaser__action-link, .cmp-teaser__action-container a'),
    );
    contentCell.push(...ctaLinks);

    // Only add a slide row if it has an image or some content
    if (img || contentCell.length) {
      cells.push([img || '', contentCell.length ? contentCell : '']);
    }
  });

  // Empty-block guard
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-hero', cells });
  element.replaceWith(block);
}
