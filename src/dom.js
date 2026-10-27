/**
 * Small DOM helpers. Elements are built with createElement and textContent
 * only, never from HTML strings.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Creates an element.
 * @param {string} tag
 * @param {Record<string, string|number|boolean|null|undefined>} [attrs] 'class' sets the class
 *   name, 'text' the text content; true gives an empty attribute; false, null and undefined are skipped.
 * @param {(Node|null|false)[]} [children]
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (name === 'class') node.className = String(value);
    else if (name === 'text') node.textContent = String(value);
    else node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child) node.append(child);
  }
  return node;
}

/**
 * A suit symbol from the SVG sprite in index.html, drawn in the current text colour.
 * @param {string} suit 'C', 'D', 'H' or 'S'
 * @param {string} className
 * @returns {SVGSVGElement}
 */
export function suitIcon(suit, className) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#suit-${suit}`);
  svg.append(use);
  return svg;
}

/**
 * A table row: a label cell and one cell per value.
 * @param {string} label
 * @param {(string|number)[]} values
 * @param {string} [className]
 * @returns {HTMLElement}
 */
export function tableRow(label, values, className) {
  return el('tr', { class: className }, [el('th', { scope: 'row', text: label }), ...values.map((value) => el('td', { text: value }))]);
}
