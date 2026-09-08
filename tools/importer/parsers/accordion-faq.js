/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-faq. Base: accordion (Block Collection).
 * Source: https://www.wknd.site/us/en/faqs.html
 * Selector: .accordion.panelcontainer
 *
 * Block table (2 columns): first row = block name; each subsequent row is one
 * accordion item with exactly 2 cells:
 *   - Title cell (mandatory): the clickable question/label.
 *   - Content cell (mandatory): the answer body shown when expanded.
 * Source uses AEM Core accordion: .cmp-accordion__item with a
 * .cmp-accordion__title (question) and a .cmp-accordion__panel (answer body).
 */
export default function parse(element, { document }) {
  const items = element.querySelectorAll('.cmp-accordion__item');
  const cells = [];

  items.forEach((item) => {
    // Title cell — the question
    const titleEl = item.querySelector('.cmp-accordion__title, .cmp-accordion__button, h3, h2');
    const question = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : '';
    const titleCell = document.createElement('div');
    titleCell.textContent = question;

    // Content cell — the answer body
    const panel = item.querySelector('.cmp-accordion__panel');
    const answerCell = [];
    if (panel) {
      const contentRoot = panel.querySelector('.cmp-container, .text, .cmp-text') || panel;
      [...contentRoot.children].forEach((child) => {
        const inner = child.querySelector('.cmp-text') || child;
        answerCell.push(inner.cloneNode(true));
      });
      if (!answerCell.length) {
        const text = panel.textContent.replace(/\s+/g, ' ').trim();
        if (text) {
          const p = document.createElement('p');
          p.textContent = text;
          answerCell.push(p);
        }
      }
    }

    if (question || answerCell.length) {
      cells.push([titleCell, answerCell.length ? answerCell : '']);
    }
  });

  // empty-block guard
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-faq', cells });
  element.replaceWith(block);
}
