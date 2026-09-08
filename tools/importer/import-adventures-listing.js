/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroBannerParser from './parsers/hero-banner.js';
import cardsTeaserParser from './parsers/cards-teaser.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/wknd-cleanup.js';
import sectionsTransformer from './transformers/wknd-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'adventures-listing',
  description: 'Adventures listing page: page title, an intro hero teaser, and a filterable grid of adventure teaser cards.',
  urls: [
    'https://www.wknd.site/us/en/adventures.html',
  ],
  blocks: [
    {
      name: 'hero-banner',
      instances: ['.teaser.cmp-teaser--hero'],
    },
    {
      // Only the active ("All") tab panel's grid — the category tabs are
      // client-side filtered duplicates of the same 16 cards.
      name: 'cards-teaser',
      instances: ['.cmp-tabs__tabpanel--active .image-list.list'],
    },
  ],
  sections: [
    {
      id: 'rc1', name: 'Adventures Title', selector: '.title.cmp-title',
      style: null, blocks: [], defaultContent: ['.title.cmp-title'],
    },
    {
      id: 'rc3', name: 'Intro Hero', selector: '.teaser.cmp-teaser--hero',
      style: null, blocks: ['hero-banner'], defaultContent: [],
    },
    {
      id: 'rc4', name: 'Current Adventures Heading', selector: '.title.cmp-title--underline',
      style: null, blocks: [], defaultContent: ['.title.cmp-title--underline'],
    },
    {
      id: 'rc5', name: 'Adventures Grid', selector: '.cmp-tabs__tabpanel--active .image-list.list',
      style: null, blocks: ['cards-teaser'], defaultContent: [],
    },
  ],
};

// PARSER REGISTRY
const parsers = {
  'hero-banner': heroBannerParser,
  'cards-teaser': cardsTeaserParser,
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook.
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration.
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;

    const main = document.body;

    // 1. beforeTransform (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return; // already replaced by an earlier parser
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (final cleanup + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path. Map the root URL to /index to avoid an empty path.
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
