/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselHeroParser from './parsers/carousel-hero.js';
import columnsFeatureParser from './parsers/columns-feature.js';
import cardsTeaserParser from './parsers/cards-teaser.js';
import heroBannerParser from './parsers/hero-banner.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/wknd-cleanup.js';
import sectionsTransformer from './transformers/wknd-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: 'Localized landing page with a hero carousel, a featured article, article/adventure teaser grids, and a full-width adventures hero banner.',
  urls: [
    'https://www.wknd.site/us/en.html',
  ],
  blocks: [
    {
      name: 'carousel-hero',
      instances: ['.carousel.cmp-carousel--hero'],
    },
    {
      name: 'columns-feature',
      instances: ['.teaser.cmp-teaser--featured'],
      section: 'grey',
    },
    {
      name: 'cards-teaser',
      instances: ['.image-list.list'],
    },
    {
      name: 'hero-banner',
      instances: ['.teaser.cmp-teaser--imagebottom'],
    },
  ],
  sections: [
    {
      id: 'rc2', name: 'Hero Carousel', selector: '.carousel.cmp-carousel--hero',
      style: null, blocks: ['carousel-hero'], defaultContent: [],
    },
    {
      id: 'rc3', name: 'Featured Article', selector: '.teaser.cmp-teaser--featured',
      style: 'grey', blocks: ['columns-feature'], defaultContent: [],
    },
    {
      id: 'rc4', name: 'Recent Articles Heading', selector: '.title.cmp-title--underline',
      style: null, blocks: [], defaultContent: ['.title.cmp-title--underline'],
    },
    {
      id: 'rc5', name: 'Recent Articles Grid', selector: '.image-list.list',
      style: null, blocks: ['cards-teaser'], defaultContent: [],
    },
    {
      id: 'rc9-rc10', name: 'Adventures Hero', selector: '.teaser.cmp-teaser--imagebottom',
      style: null, blocks: ['hero-banner'], defaultContent: [],
    },
    {
      id: 'rc12', name: 'Next Adventures Grid', selector: '.image-list.list',
      style: null, blocks: ['cards-teaser'], defaultContent: [],
    },
  ],
};

// PARSER REGISTRY
const parsers = {
  'carousel-hero': carouselHeroParser,
  'columns-feature': columnsFeatureParser,
  'cards-teaser': cardsTeaserParser,
  'hero-banner': heroBannerParser,
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook.
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform (typically document.body)
 * @param {Object} payload - { document, url, html, params }
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
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Array of block instances found on the page
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

    // 6. Generate sanitized path. Map the root/homepage URL to `/index` so an
    //    empty path doesn't crash the bundled importer's path polyfill.
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
