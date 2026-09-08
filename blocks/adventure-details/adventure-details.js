export default function decorate(block) {
  // Each row is a label/value pair: column 1 = label, column 2 = value.
  [...block.children].forEach((row) => {
    row.classList.add('adventure-details-item');
    const cells = [...row.children];
    if (cells[0]) cells[0].classList.add('adventure-details-label');
    if (cells[1]) cells[1].classList.add('adventure-details-value');
  });
}
