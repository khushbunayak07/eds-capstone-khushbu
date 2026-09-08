import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * cards-team — contributor/team-member grid (about-us template).
 * Each card row: [ avatar image ] , [ name (h3) + role (h5) + social links ].
 * Renders a centered circular avatar with name, role, and a row of social icon links.
 */
export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-team-card-image';
      else div.className = 'cards-team-card-body';
    });
    // tag any link list in the body as social links
    const socialList = li.querySelector('.cards-team-card-body ul');
    if (socialList) socialList.classList.add('cards-team-social');
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]);
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
}
