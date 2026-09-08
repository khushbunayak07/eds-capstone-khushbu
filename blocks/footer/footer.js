import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment — metadata-independent dual-fetch:
  // /content first (localhost / aem up), then root (DA/EDS production).
  let footerPath = '/content/footer';
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) {
    resp = await fetch('/footer.plain.html');
    if (resp.ok) footerPath = '/footer';
  }
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  // resolve relative image paths (images/*) against the footer fragment's folder
  const footerBase = new URL(`${footerPath.replace(/[^/]+$/, '')}`, window.location).href;
  footer.querySelectorAll('img[src]').forEach((img) => {
    const raw = img.getAttribute('src');
    if (raw && !/^(https?:)?\/\//.test(raw) && !raw.startsWith('/')) {
      img.src = new URL(raw, footerBase).href;
    }
  });

  // tag structural sections: brand+nav, social, legal/description
  const sections = [...footer.children];
  const [brand, social, legal] = sections;
  if (brand) brand.classList.add('footer-brand');
  if (social) social.classList.add('footer-social');
  if (legal) legal.classList.add('footer-legal');

  // brand: strip button styling from the logo link, mark the nav list
  if (brand) {
    const logoLink = brand.querySelector('a.button');
    if (logoLink) {
      logoLink.className = '';
      const bc = logoLink.closest('.button-container');
      if (bc) bc.className = '';
    }
    const navList = brand.querySelector('ul');
    if (navList) navList.classList.add('footer-nav');
  }

  // social: mark the social link list (each link carries an inline icon + label)
  if (social) {
    const socialList = social.querySelector('ul');
    if (socialList) socialList.classList.add('footer-social-list');
  }

  block.append(footer);
}
