export function el(tag, opts = {}, children = []) {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.id) node.id = opts.id;
  if (opts.text != null) node.textContent = String(opts.text);
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  if (opts.style) for (const [k, v] of Object.entries(opts.style)) node.style[k] = v;
  if (opts.on) for (const [evt, fn] of Object.entries(opts.on)) node.addEventListener(evt, fn);
  for (const child of children) if (child) node.appendChild(child);
  return node;
}
