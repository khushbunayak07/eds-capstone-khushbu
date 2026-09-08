/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-teaser. Base: cards.
 * Sources: https://www.wknd.site/us/en.html (article grid, .image-list.list)
 *          https://www.wknd.site/us/en/magazine.html (members-only teasers, .cmp-teaser--secure)
 *
 * Block structure (2 columns): first row = block name; each subsequent row is one
 * card: [image cell] | [title + description (+ CTA) cell].
 *
 * Handles two source DOM shapes that both map to cards-teaser:
 *  1. Image-list grid: multiple .cmp-image-list__item children inside one element.
 *  2. Standalone teaser (.cmp-teaser): a single card element (.cmp-teaser__content
 *     with title + description). One parse() call = one card row.
 */
export default function parse(element, { document }) {
  const cells = [];

  const pushCard = (img, contentNodes) => {
    if (img || (contentNodes && contentNodes.length)) {
      cells.push([img || '', contentNodes && contentNodes.length ? contentNodes : '']);
    }
  };

  const items = element.querySelectorAll('.cmp-image-list__item');
  if (items.length) {
    // Shape 1 — image-list grid
    items.forEach((item) => {
      const img = item.querySelector('.cmp-image-list__item-image img, .cmp-image img, img');
      const contentCell = [];
      const titleLink = item.querySelector('.cmp-image-list__item-title-link');
      const titleText = item.querySelector('.cmp-image-list__item-title, h3, h2');
      if (titleLink) {
        const link = titleLink.cloneNode(true);
        link.textContent = link.textContent.trim();
        const heading = document.createElement('h3');
        heading.append(link);
        contentCell.push(heading);
      } else if (titleText) {
        contentCell.push(titleText);
      }
      const description = item.querySelector('.cmp-image-list__item-description');
      if (description) contentCell.push(description);
      pushCard(img, contentCell);
    });
  } else {
    // Shape 2 — standalone teaser card (e.g. members-only .cmp-teaser--secure)
    const img = element.querySelector('.cmp-teaser__image img, .cmp-image img, img');
    const contentCell = [];
    const titleLink = element.querySelector('.cmp-teaser__title-link');
    const titleText = element.querySelector('.cmp-teaser__title, h3, h2');
    if (titleLink) {
      const link = titleLink.cloneNode(true);
      link.textContent = link.textContent.trim();
      const heading = document.createElement('h3');
      heading.append(link);
      contentCell.push(heading);
    } else if (titleText) {
      const heading = document.createElement('h3');
      heading.textContent = titleText.textContent.trim();
      contentCell.push(heading);
    }
    const description = element.querySelector('.cmp-teaser__description');
    if (description) contentCell.push(description);
    pushCard(img, contentCell);
  }

  // Empty-block guard
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-teaser', cells });
  element.replaceWith(block);
}
