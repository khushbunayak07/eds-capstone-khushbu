/* eslint-disable */
/* global WebImporter */
/**
 * Parser for adventure-details. Base: custom (key/value metadata panel).
 * Source: https://www.wknd.site/us/en/adventures/downhill-skiing-wyoming.html
 * Selector: .cmp-contentfragment__elements
 *
 * Block structure (2 columns): first row = block name; each subsequent row is one
 * label/value pair: [label] | [value].
 * Source is a <dl> with .cmp-contentfragment__element blocks, each holding a
 * <dt> (title/label) and <dd> (value).
 */
export default function parse(element, { document }) {
  const cells = [];

  // Prefer the structured element blocks; fall back to raw dt/dd pairs.
  const items = element.querySelectorAll('.cmp-contentfragment__element');
  if (items.length) {
    items.forEach((item) => {
      const label = item.querySelector('.cmp-contentfragment__element-title, dt');
      const value = item.querySelector('.cmp-contentfragment__element-value, dd');
      const labelText = label ? label.textContent.trim() : '';
      const valueText = value ? value.textContent.replace(/\s+/g, ' ').trim() : '';
      if (labelText || valueText) cells.push([labelText, valueText]);
    });
  } else {
    // fallback: walk dt/dd siblings
    const dts = element.querySelectorAll('dt');
    dts.forEach((dt) => {
      const dd = dt.nextElementSibling && dt.nextElementSibling.tagName === 'DD'
        ? dt.nextElementSibling : null;
      const labelText = dt.textContent.trim();
      const valueText = dd ? dd.textContent.replace(/\s+/g, ' ').trim() : '';
      if (labelText || valueText) cells.push([labelText, valueText]);
    });
  }

  // empty-block guard
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'adventure-details', cells });
  element.replaceWith(block);
}
