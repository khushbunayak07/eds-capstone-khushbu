/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselHeroParser from './parsers/carousel-hero.js';
import adventureDetailsParser from './parsers/adventure-details.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/wknd-cleanup.js';
import sectionsTransformer from './transformers/wknd-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'adventure-detail',
  description: 'Adventure detail page: hero image carousel, adventure title, a trip-details metadata panel, and long-form overview/itinerary body content.',
  urls: [
    'https://www.wknd.site/us/en/adventures/downhill-skiing-wyoming.html',
  ],
  blocks: [
    {
      name: 'carousel-hero',
      instances: ['.carousel.cmp-carousel--mini'],
    },
    {
      name: 'adventure-details',
      instances: ['dl.cmp-contentfragment__elements'],
    },
  ],
  sections: [
    {
      id: 'sec1', name: 'Hero Carousel', selector: '.carousel.cmp-carousel--mini',
      style: null, blocks: ['carousel-hero'], defaultContent: [],
    },
    {
      id: 'sec2', name: 'Adventure Title', selector: '.title.cmp-title--underline',
      style: null, blocks: [], defaultContent: ['.title.cmp-title--underline'],
    },
    {
      id: 'sec3', name: 'Trip Details', selector: 'dl.cmp-contentfragment__elements',
      style: null, blocks: ['adventure-details'], defaultContent: [],
    },
    {
      id: 'sec4', name: 'Overview / Itinerary Body', selector: '.tabs.panelcontainer',
      style: null, blocks: [], defaultContent: ['.tabs.panelcontainer'],
    },
  ],
};

// PARSER REGISTRY
const parsers = {
  'carousel-hero': carouselHeroParser,
  'adventure-details': adventureDetailsParser,
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
    // Tag the page with its template so EDS adds an `adventure-detail` body class
    // (aem.js decorateTemplateAndTheme reads the `template` metadata). This lets
    // article-only styling (e.g. the airy body line-height) be scoped to
    // `body.adventure-detail` without affecting other templates. createMetadata
    // appends a Metadata <table> to main; add a Template row to the last one.
    const metaTables = main.querySelectorAll('table');
    const metaTable = metaTables[metaTables.length - 1];
    if (metaTable) {
      const tr = document.createElement('tr');
      const th = document.createElement('td');
      th.textContent = 'Template';
      const td = document.createElement('td');
      td.textContent = PAGE_TEMPLATE.name;
      tr.append(th, td);
      (metaTable.querySelector('tbody') || metaTable).append(tr);
    }
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
