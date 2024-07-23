export function isInputElement(node: Node): node is HTMLInputElement {
  return node instanceof HTMLElement && node.tagName.toLowerCase() === 'input';
}

export function isButtonElement(node: Node): node is HTMLButtonElement {
  return node instanceof HTMLElement && node.tagName.toLowerCase() === 'button';
}

export function isImgElement(node: Node): node is HTMLImageElement {
  return node instanceof HTMLElement && node.tagName.toLowerCase() === 'img';
}
