import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates desktop width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('.nav-hamburger button').focus();
    }
  }
}

/**
 * Toggles the entire nav (mobile drawer)
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  if (button) {
    button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  }
  // collapse menu on escape keypress
  if (!expanded || isDesktop.matches) {
    window.addEventListener('keydown', closeOnEscape);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
  }
}

/**
 * Builds a search form from the plain "Search" placeholder in the nav fragment.
 * Form controls live in JS (not the plain fragment) per the EDS nav contract.
 * @param {Element} navTools The tools section element
 */
function decorateSearch(navTools) {
  // find the paragraph whose text is the search placeholder
  const searchP = [...navTools.querySelectorAll('p')]
    .find((p) => !p.querySelector('a, img') && /search/i.test(p.textContent.trim()));
  if (!searchP) return;
  const placeholder = searchP.textContent.trim() || 'Search';
  const form = document.createElement('form');
  form.className = 'nav-search';
  form.setAttribute('role', 'search');
  form.setAttribute('action', '/us/en/search');
  form.innerHTML = `
    <button type="submit" class="nav-search-submit" aria-label="Search"></button>
    <input type="search" name="q" placeholder="${placeholder}" aria-label="${placeholder}">
  `;
  searchP.replaceWith(form);
}

/**
 * Builds the locale selector from the plain list in the nav fragment.
 * The trigger is generated in JS; the entries (names + flags) come from the DOM.
 * @param {Element} navTools The tools section element
 */
function decorateLocale(navTools) {
  const localeList = navTools.querySelector('ul');
  if (!localeList) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-locale';

  const current = localeList.querySelector('li:first-child a');
  const label = current ? current.textContent.replace(/\s+/g, ' ').trim() : 'Locale';
  const flag = current ? current.querySelector('img') : null;
  const currentHref = current ? current.getAttribute('href') : '#';

  // current locale kept as a real link (content parity with source)
  const currentLink = document.createElement('a');
  currentLink.href = currentHref;
  currentLink.className = 'nav-locale-current';
  if (flag) currentLink.append(flag.cloneNode(true));
  currentLink.append(document.createTextNode(label));

  // separate toggle button opens the full locale list
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'nav-locale-trigger';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-label', 'Choose a region');

  localeList.classList.add('nav-locale-menu');
  wrapper.append(currentLink, trigger, localeList);

  trigger.addEventListener('click', () => {
    const open = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
  });
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) trigger.setAttribute('aria-expanded', 'false');
  });

  navTools.prepend(wrapper);
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment — metadata-independent dual-fetch:
  // /content first (localhost / aem up), then root (DA/EDS production).
  // Probe with fetch so the fallback is chosen from the actual response.
  let navPath = '/content/nav';
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) {
    resp = await fetch('/nav.plain.html');
    if (resp.ok) navPath = '/nav';
  }
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  // resolve relative image paths (images/*) against the nav fragment's folder,
  // not the current page URL (e.g. /content/us/en would break the relative ref)
  const navBase = new URL(`${navPath.replace(/[^/]+$/, '')}`, window.location).href;
  nav.querySelectorAll('img[src]').forEach((img) => {
    const raw = img.getAttribute('src');
    if (raw && !/^(https?:)?\/\//.test(raw) && !raw.startsWith('/')) {
      img.src = new URL(raw, navBase).href;
    }
  });

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  // brand: strip button styling from the logo link
  const navBrand = nav.querySelector('.nav-brand');
  if (navBrand) {
    const brandLink = navBrand.querySelector('a.button');
    if (brandLink) {
      brandLink.className = '';
      const bc = brandLink.closest('.button-container');
      if (bc) bc.className = '';
    }
  }

  // tools: build the locale selector and the search form
  const navTools = nav.querySelector('.nav-tools');
  if (navTools) {
    decorateLocale(navTools);
    decorateSearch(navTools);

    // lift the utility items (Sign In link + locale selector) into a top bar
    const utility = document.createElement('div');
    utility.className = 'nav-utility';
    const signIn = [...navTools.querySelectorAll('p')]
      .find((p) => p.querySelector('a'));
    const locale = navTools.querySelector('.nav-locale');
    if (signIn) utility.append(signIn);
    if (locale) utility.append(locale);
    if (utility.children.length) nav.prepend(utility);
  }

  // sections: expose the primary nav list as `nav > ul` with `.nav-list` so it
  // is a recognizable top-level nav structure (matches source `nav > ul > li > a`)
  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    const list = navSections.querySelector(':scope .default-content-wrapper > ul, :scope > ul');
    if (list) {
      list.classList.add('nav-list');
      // tag each top-level item's link as a nav trigger (top-level nav item)
      list.querySelectorAll(':scope > li > a').forEach((a) => a.classList.add('nav-trigger'));
    }
  }
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');

  // reset mobile state when crossing the breakpoint (no page reload)
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
