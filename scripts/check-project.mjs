// ==================== PROJECT VALIDATOR START ====================
// Run npm run check. This reads the storefront and never changes your files.
// The preserved legacy/ project is deliberately outside this validation scope.
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const problems = [];
let checkedReferences = 0;
const expectedCollections = {
  tshirt: ['relaxed', 'oversized'],
  'bottom-wear': ['joggers', 'jeans'],
  'winter-wear': ['hoodies', 'jackets'],
  shirts: ['printed', 'plain', 'oversized']
};
const requiredPages = ['index.html', 'header.html', 'cart.html', 'about-us.html', 'product.html', 'product-details.html', 'tracking.html', 'my-account.html', 'admin-dashboard.html', 'tshirt.html', 'bottom-wear.html', 'winter-wear.html', 'shirts.html', 'privacy-policy.html'];
const htmlFiles = (await readdir(root)).filter(filename => filename.endsWith('.html'));
const htmlByFile = new Map();
const idsByFile = new Map();
function requireCondition(condition, message) { if (!condition) problems.push(message); }
async function isFile(filename) {
  try { return (await stat(filename)).isFile(); } catch { return false; }
}
function attributes(markup, attribute) {
  const expression = new RegExp(`\\b${attribute}\\s*=\\s*(["'])(.*?)\\1`, 'gi');
  return [...markup.matchAll(expression)].map(match => match[2]);
}
function hasMeta(markup, name) {
  return [...markup.matchAll(/<meta\b[^>]*>/gi)].some(([tag]) =>
    attributes(tag, 'name')[0]?.toLowerCase() === name && Boolean(attributes(tag, 'content')[0]?.trim())
  );
}

/* ==================== HTML DOCUMENTS START ==================== */
for (const filename of requiredPages) requireCondition(htmlFiles.includes(filename), `Missing required page: ${filename}`);
for (const filename of htmlFiles) {
  const markup = await readFile(path.join(root, filename), 'utf8');
  htmlByFile.set(filename, markup);
  const ids = attributes(markup, 'id');
  idsByFile.set(filename, new Set(ids));
  requireCondition(new Set(ids).size === ids.length, `${filename}: duplicate HTML IDs.`);
  if (filename === 'header.html') continue; // A shared fragment, not a standalone document.
  requireCondition(/<!doctype\s+html>/i.test(markup), `${filename}: missing HTML5 doctype.`);
  requireCondition(/<html\b[^>]*\blang=["'][^"']+["']/i.test(markup), `${filename}: missing page language.`);
  requireCondition(/<title>[^<]+<\/title>/i.test(markup), `${filename}: missing page title.`);
  requireCondition(hasMeta(markup, 'description'), `${filename}: missing meta description.`);
  requireCondition(hasMeta(markup, 'viewport'), `${filename}: missing viewport metadata.`);
  requireCondition(/<meta\b[^>]*charset\s*=/i.test(markup), `${filename}: missing character encoding.`);
  requireCondition(/<main\b/i.test(markup), `${filename}: missing semantic main element.`);
  requireCondition(ids.includes('main-content'), `${filename}: missing #main-content skip-link destination.`);
  requireCondition(/<h1\b/i.test(markup) || filename === 'product-details.html', `${filename}: missing primary heading.`);
  if (filename !== 'admin-dashboard.html') {
    requireCondition(ids.includes('site-header'), `${filename}: missing reusable header mount.`);
    requireCondition(attributes(markup, 'src').includes('js/header.js'), `${filename}: shared header loader is missing.`);
  }
  // Category sections are rendered from JSON; their valid anchors are known here.
  const category = attributes(markup, 'data-category')[0];
  if (expectedCollections[category]) {
    expectedCollections[category].forEach(subcategory => idsByFile.get(filename).add(subcategory));
  }
  if (filename === 'product.html') {
    Object.entries(expectedCollections).forEach(([categoryId, subcategories]) =>
      subcategories.forEach(subcategory => idsByFile.get(filename).add(`${categoryId}-${subcategory}`))
    );
  }
}
/* ==================== HTML DOCUMENTS END ==================== */

/* ==================== LOCAL REFERENCES START ==================== */
async function checkReference(reference, source, { checkHash = false } = {}) {
  if (!reference || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference) || reference.includes('${')) return;
  const normalized = reference.replaceAll('&amp;', '&');
  let parsed;
  try { parsed = new URL(normalized, `https://local.test/${source.replaceAll(path.sep, '/')}`); }
  catch { problems.push(`${source}: malformed local URL ${reference}`); return; }
  let pathname;
  let hash;
  try { pathname = decodeURIComponent(parsed.pathname); hash = decodeURIComponent(parsed.hash.slice(1)); }
  catch { problems.push(`${source}: malformed URL encoding ${reference}`); return; }
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const absolute = path.resolve(root, relative);
  const relativeToRoot = path.relative(root, absolute);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    problems.push(`${source}: reference escapes project directory: ${reference}`); return;
  }
  checkedReferences += 1;
  if (!(await isFile(absolute))) { problems.push(`${source}: missing target ${reference}`); return; }
  if (!checkHash || !hash || !relative.endsWith('.html')) return;
  // The header fragment's skip link is inserted into every customer document.
  if (source === 'header.html' && reference.startsWith('#')) {
    requireCondition(hash === 'main-content' || idsByFile.get('header.html')?.has(hash), `${source}: unknown fragment ${reference}`);
    return;
  }
  const targetIds = idsByFile.get(relative);
  requireCondition(targetIds?.has(hash), `${source}: unknown anchor ${reference}`);
}
for (const [filename, markup] of htmlByFile) {
  for (const reference of attributes(markup, 'href')) await checkReference(reference, filename, { checkHash: true });
  for (const reference of attributes(markup, 'src')) await checkReference(reference, filename);
}
const cssFiles = (await readdir(path.join(root, 'css'))).filter(filename => filename.endsWith('.css'));
for (const filename of cssFiles) {
  const content = await readFile(path.join(root, 'css', filename), 'utf8');
  for (const match of content.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)) await checkReference(match[1], `css/${filename}`);
}
const jsFiles = (await readdir(path.join(root, 'js'))).filter(filename => filename.endsWith('.js'));
for (const filename of jsFiles) {
  const absolute = path.join(root, 'js', filename);
  const content = await readFile(absolute, 'utf8');
  const syntax = spawnSync(process.execPath, ['--check', absolute], { encoding: 'utf8' });
  requireCondition(syntax.status === 0, `js/${filename}: ${syntax.stderr?.trim() || 'JavaScript syntax check failed.'}`);
  const imports = /(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.{1,2}\/[^"']+)["']/g;
  for (const match of content.matchAll(imports)) await checkReference(match[1], `js/${filename}`);
  // Static URLs in shared footer/UI markup are relative to the customer page.
  for (const reference of attributes(content, 'href')) {
    if (!reference.startsWith('#')) await checkReference(reference, 'index.html', { checkHash: true });
  }
}
/* ==================== LOCAL REFERENCES END ==================== */

/* ==================== PRODUCT DATABASE START ==================== */
let products = [];
try {
  products = JSON.parse(await readFile(path.join(root, 'data/products.json'), 'utf8'));
  requireCondition(Array.isArray(products), 'data/products.json must be a top-level product array.');
  if (!Array.isArray(products)) products = [];
} catch (error) { problems.push(`Cannot read product database: ${error.message}`); }
requireCondition(products.length >= 135, `Expected at least 135 sample products; found ${products.length}.`);
const productIds = new Set();
for (const product of products) {
  const label = product?.id || '(unnamed product)';
  requireCondition(product && typeof product === 'object', 'Every product must be an object.');
  if (!product || typeof product !== 'object') continue;
  requireCondition(typeof product.id === 'string' && /^[a-z]+\d+$/.test(product.id), `${label}: invalid product ID.`);
  requireCondition(!productIds.has(product.id), `${label}: duplicate product ID.`);
  productIds.add(product.id);
  requireCondition(expectedCollections[product.category]?.includes(product.subcategory), `${label}: invalid category/subcategory relationship.`);
  for (const field of ['name', 'description', 'material', 'care', 'createdAt']) {
    requireCondition(typeof product[field] === 'string' && product[field].trim(), `${label}: missing ${field}.`);
  }
  requireCondition(Number.isFinite(Date.parse(product.createdAt)), `${label}: invalid createdAt date.`);
  requireCondition(Number.isFinite(product.price) && product.price >= 0, `${label}: invalid price.`);
  requireCondition(product.originalPrice == null || (Number.isFinite(product.originalPrice) && product.originalPrice > product.price), `${label}: originalPrice must exceed price or be null.`);
  requireCondition(Number.isInteger(product.stock) && product.stock >= 0, `${label}: stock must be a non-negative integer.`);
  requireCondition(typeof product.newArrival === 'boolean', `${label}: newArrival must be true or false.`);
  for (const field of ['sizes', 'colors', 'tags']) {
    requireCondition(Array.isArray(product[field]) && product[field].every(value => typeof value === 'string'), `${label}: ${field} must be an array of strings.`);
    if (Array.isArray(product[field])) requireCondition(new Set(product[field]).size === product[field].length, `${label}: duplicate ${field} values.`);
  }
  requireCondition(Array.isArray(product.images) && product.images.length > 0, `${label}: add at least one gallery image.`);
  const imagePaths = new Set([product.image, ...(Array.isArray(product.images) ? product.images : [])]);
  for (const imagePath of imagePaths) {
    requireCondition(typeof imagePath === 'string' && /^images\/[a-z]+\d+(?:-\d+)?\.jpeg$/.test(imagePath), `${label}: expected a lowercase numbered local .jpeg image path.`);
    if (typeof imagePath === 'string') await checkReference(imagePath, 'index.html');
  }
}
const withTag = (product, tag) => Array.isArray(product.tags) && product.tags.includes(tag);
for (const [category, subcategories] of Object.entries(expectedCollections)) {
  const categoryProducts = products.filter(product => product?.category === category);
  const headingProducts = categoryProducts.filter(product => withTag(product, `${category}-heading`));
  requireCondition(headingProducts.length >= 6, `${category}: heading slider needs at least 6 tagged sample products.`);
  const newProducts = categoryProducts.filter(product => withTag(product, 'new-arrival') || product.newArrival === true);
  requireCondition(newProducts.length >= 4, `${category}: need at least 4 new arrivals for homepage balance.`);
  requireCondition(categoryProducts.some(product => withTag(product, 'main-index')), `${category}: missing a sample homepage hero product.`);
  for (const subcategory of subcategories) {
    const members = categoryProducts.filter(product => product.subcategory === subcategory);
    requireCondition(members.length >= 15, `${category}/${subcategory}: expected at least 15 products; found ${members.length}.`);
    requireCondition(members.filter(product => withTag(product, 'product-image')).length >= 8, `${category}/${subcategory}: need at least 8 tagged discovery preview samples.`);
    if (category === 'tshirt') {
      requireCondition(members.filter(product => withTag(product, 'tshirt-heading')).length >= 3, `${category}/${subcategory}: need 3 heading slider samples.`);
    }
  }
}
/* ==================== PRODUCT DATABASE END ==================== */

if (problems.length) {
  console.error(`Project check found ${problems.length} issue${problems.length === 1 ? '' : 's'}:`);
  problems.forEach(problem => console.error(`- ${problem}`));
  process.exitCode = 1;
} else {
  console.log(`Project check passed: ${htmlFiles.length} HTML files, ${cssFiles.length} CSS files, ${jsFiles.length} JavaScript modules and ${checkedReferences} local references.`);
  console.log(`${products.length} unique products cover all 9 subcategories, with valid images, prices, stock and promotional tags.`);
}
// ==================== PROJECT VALIDATOR END ====================
