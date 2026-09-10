/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import authorBioParser from './parsers/author-bio.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/wknd-cleanup.js';
import sectionsTransformer from './transformers/wknd-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'article-detail',
  description: 'Article detail page: hero image, article title, byline, long-form body content, and an author bio block.',
  urls: [
    'https://www.wknd.site/us/en/magazine/san-diego-surf.html',
  ],
  blocks: [
    {
      name: 'author-bio',
      instances: ['.cmp-byline'],
    },
  ],
  sections: [
    {
      id: 'rc1', name: 'Lead Image', selector: 'main > .cmp-container > .aem-Grid > .image',
      style: null, blocks: [], defaultContent: ['main > .cmp-container > .aem-Grid > .image'],
    },
    {
      id: 'rc3', name: 'Article Header', selector: 'article.contentfragment',
      style: null, blocks: [], defaultContent: ['h1'],
    },
    {
      id: 'rc4', name: 'Article Body', selector: 'article.contentfragment',
      style: null, blocks: [], defaultContent: ['article.contentfragment'],
    },
    {
      id: 'rc5', name: 'Author Bio', selector: '.cmp-byline',
      style: null, blocks: ['author-bio'], defaultContent: [],
    },
  ],
};

// PARSER REGISTRY
const parsers = {
  'author-bio': authorBioParser,
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

    // 3. Parse each block using registered parsers.
    //    For nested selectors like .cmp-byline (which match at multiple depths),
    //    parse only the first still-attached match to avoid duplicate blocks.
    const parsedNames = new Set();
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return; // already replaced
      if (parsedNames.has(block.name) && block.name === 'author-bio') return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
          parsedNames.add(block.name);
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
    // Tag the page with its template so EDS adds a `article-detail` body class
    // (aem.js decorateTemplateAndTheme reads the `template` metadata). This lets
    // article-only styling (e.g. the airy body line-height) be scoped to
    // `body.article-detail` without affecting other templates. createMetadata
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
