/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import columnsFeatureParser from './parsers/columns-feature.js';
import cardsTeaserParser from './parsers/cards-teaser.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/wknd-cleanup.js';
import sectionsTransformer from './transformers/wknd-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'magazine-listing',
  description: 'Magazine landing/listing page: page title, a featured article, a grid of article teaser cards, and a members-only gated teaser section.',
  urls: [
    'https://www.wknd.site/us/en/magazine.html',
  ],
  blocks: [
    {
      name: 'columns-feature',
      instances: ['.teaser.cmp-teaser--featured'],
      section: 'grey',
    },
    {
      name: 'cards-teaser',
      instances: ['.image-list.list', '.teaser.cmp-teaser--secure'],
    },
  ],
  sections: [
    {
      id: 'rc1', name: 'Magazine Title', selector: '.title.cmp-title',
      style: null, blocks: [], defaultContent: ['.title.cmp-title'],
    },
    {
      id: 'rc2', name: 'Featured Article', selector: '.teaser.cmp-teaser--featured',
      style: 'grey', blocks: ['columns-feature'], defaultContent: [],
    },
    {
      id: 'rc3', name: 'All Articles Heading', selector: '.title.cmp-title--underline',
      style: null, blocks: [], defaultContent: ['.title.cmp-title--underline'],
    },
    {
      id: 'rc4', name: 'Article Grid', selector: '.image-list.list',
      style: null, blocks: ['cards-teaser'], defaultContent: [],
    },
    {
      id: 'rc5', name: 'Members Only Heading', selector: '.title.cmp-title--underline',
      style: null, blocks: [], defaultContent: ['.title.cmp-title--underline'],
    },
    {
      id: 'rc8', name: 'Members Only Teasers', selector: '.teaser.cmp-teaser--secure',
      style: null, blocks: ['cards-teaser'], defaultContent: [],
    },
  ],
};

// PARSER REGISTRY
const parsers = {
  'columns-feature': columnsFeatureParser,
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
      if (!block.element.parentNode) return; // Already replaced by an earlier parser
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
