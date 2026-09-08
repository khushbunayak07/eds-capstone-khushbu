import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Author bio block (article-detail template).
 * Expected content (2 rows): [ author photo ] , [ name (h-tag) + role + optional social links ].
 * Renders a circular photo beside the author's name, role, and social links.
 */
export default function decorate(block) {
  const rows = [...block.children];
  const photoCell = rows[0]?.querySelector(':scope > div') || rows[0];
  const infoCell = rows[1]?.querySelector(':scope > div') || rows[1];

  block.textContent = '';

  // photo
  const photo = document.createElement('div');
  photo.className = 'author-bio-photo';
  const img = photoCell?.querySelector('img');
  if (img) {
    const optimized = createOptimizedPicture(img.src, img.alt || '', false, [{ width: '200' }]);
    photo.append(optimized);
  }

  // info (name + role + social)
  const info = document.createElement('div');
  info.className = 'author-bio-info';
  if (infoCell) {
    while (infoCell.firstElementChild) info.append(infoCell.firstElementChild);
  }
  // tag any link list as social links
  const socialList = info.querySelector('ul');
  if (socialList) socialList.classList.add('author-bio-social');

  if (photo.childElementCount) block.append(photo);
  block.append(info);
}
