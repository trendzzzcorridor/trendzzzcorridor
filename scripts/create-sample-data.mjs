/** ==================== SAMPLE DATA GENERATOR START ====================
 * This optional, explicit development script creates the original demo database.
 * It is never run by the website or development server.
 * Existing data is protected unless you deliberately pass --replace-demo-data.
 * Product images are already included; this script does not generate photography.
 */
import { access, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const productsFile = new URL('../data/products.json', import.meta.url);
let productsExist = false;
try { await access(productsFile); productsExist = true; } catch { /* First run. */ }
if (productsExist && !process.argv.includes('--replace-demo-data')) {
  console.error('products.json already exists. Your product data has not been changed.');
  console.error('To deliberately restore sample data, run: node scripts/create-sample-data.mjs --replace-demo-data');
  process.exit(1);
}

/* ==================== EDITABLE SAMPLE COLLECTIONS START ==================== */
const collections = [
  { category: 'tshirt', subcategory: 'relaxed', prefix: 'tshirt', start: 1,
    name: 'Essential Relaxed Tee', colors: ['Ecru', 'Black', 'Olive'], price: 899,
    material: '100% cotton jersey, 220 GSM',
    description: 'An easy everyday tee with a soft crew neckline, a relaxed silhouette and a clean finish. Designed to pair with denim or your favourite joggers.' },
  { category: 'tshirt', subcategory: 'oversized', prefix: 'tshirt', start: 16,
    name: 'Everyday Oversized Tee', colors: ['Olive', 'Ecru', 'Black'], price: 1199,
    material: '100% cotton jersey, 260 GSM',
    description: 'A substantial cotton tee with dropped shoulders and a generous, boxy fit. An effortless foundation for a thoughtfully considered everyday wardrobe.' },
  { category: 'bottom-wear', subcategory: 'joggers', prefix: 'jogger', start: 1,
    name: 'Off-Duty Joggers', colors: ['Charcoal', 'Black', 'Stone'], price: 1499,
    material: '80% cotton, 20% polyester French terry',
    description: 'Comfortable tapered joggers with an adjustable drawstring waist, useful side pockets and soft ribbed ankle cuffs. Made for unhurried days and everyday movement.' },
  { category: 'bottom-wear', subcategory: 'jeans', prefix: 'jeans', start: 1,
    name: 'Straight-Leg Denim', colors: ['Indigo', 'Washed Black'], price: 1999,
    material: '99% cotton denim, 1% elastane',
    description: 'A straight-leg denim silhouette with a comfortable mid rise and classic five-pocket construction. A versatile washed finish makes styling simple.' },
  { category: 'winter-wear', subcategory: 'hoodies', prefix: 'hoodie', start: 1,
    name: 'Cloud Fleece Hoodie', colors: ['Stone', 'Charcoal', 'Olive'], price: 1899,
    material: '80% cotton, 20% polyester brushed fleece, 320 GSM',
    description: 'A soft pullover layer with a roomy hood, ribbed cuffs and a kangaroo pocket. The relaxed shape leaves comfortable space for your favourite tee underneath.' },
  { category: 'winter-wear', subcategory: 'jackets', prefix: 'jacket', start: 1,
    name: 'Everyday Bomber Jacket', colors: ['Black', 'Olive'], price: 2999,
    material: '100% nylon outer; 100% polyester lining',
    description: 'A clean zip-front bomber with a lightly structured silhouette, ribbed collar and practical side pockets. An understated outer layer for cooler days.' },
  { category: 'shirts', subcategory: 'printed', prefix: 'shirt', start: 1,
    name: 'Botanical Resort Shirt', colors: ['Ecru Print', 'Black Print'], price: 1399,
    material: '100% cotton woven fabric',
    description: 'A short-sleeve resort shirt with a subtle botanical print and an open camp collar. The easy shape works worn loose or layered over a simple tee.' },
  { category: 'shirts', subcategory: 'plain', prefix: 'shirt', start: 16,
    name: 'Everyday Linen Shirt', colors: ['Ecru', 'Stone', 'Sky Blue'], price: 1599,
    material: '55% linen, 45% cotton',
    description: 'A breathable button-up with a naturally textured finish, a classic collar and long sleeves. An everyday staple that moves easily from casual mornings to relaxed evenings.' },
  { category: 'shirts', subcategory: 'oversized', prefix: 'shirt', start: 31,
    name: 'Airy Oversized Shirt', colors: ['Sky Blue', 'Ecru'], price: 1699,
    material: '100% cotton poplin',
    description: 'A generous button-up silhouette with dropped shoulders and a light, crisp feel. Wear it open over a tee or buttoned for a simple, considered look.' }
];
/* ==================== EDITABLE SAMPLE COLLECTIONS END ==================== */

const heroIds = new Set(['tshirt16', 'jogger1', 'hoodie1', 'shirt16']);
const editions = ['', 'Studio', 'Weekender', 'Daily', 'Signature', 'Classic', 'Modern', 'Essential', 'Soft', 'Refined', 'Daylight', 'Edition', 'Core', 'Utility', 'Archive'];
const products = collections.flatMap((collection, collectionIndex) =>
  Array.from({ length: 15 }, (_, index) => {
    const id = `${collection.prefix}${collection.start + index}`;
    const image = `images/${id}.jpeg`;
    const newArrival = index < 6;
    const tags = [];
    if (heroIds.has(id)) tags.push('main-index');
    if (index < 12) tags.push('product-image');
    if (index < 3) tags.push(`${collection.category}-heading`);
    if (newArrival) tags.push('new-arrival');
    const price = collection.price + (index % 5) * 100;
    const createdAt = new Date(Date.UTC(2026, 8, 14 - index * 3 - collectionIndex));
    return {
      id,
      name: index === 0 ? collection.name : `${collection.name} — ${editions[index]}`,
      category: collection.category,
      subcategory: collection.subcategory,
      image,
      images: [image],
      price,
      originalPrice: index % 4 === 3 ? null : price + 300 + (index % 3) * 100,
      sizes: index % 5 === 4 ? ['M', 'L', 'XL'] : index % 5 === 3 ? ['S', 'M', 'L'] : ['S', 'M', 'L', 'XL', 'XXL'],
      colors: collection.colors,
      stock: index === 13 ? 0 : index === 12 ? 3 : 12 + (index * 7 + collectionIndex * 3) % 35,
      description: collection.description,
      tags,
      newArrival,
      createdAt: createdAt.toISOString().slice(0, 10),
      material: collection.material,
      care: collection.subcategory === 'jackets'
        ? 'Cold gentle wash with similar colours. Do not bleach. Air dry. Follow the garment care label.'
        : 'Machine wash cold with similar colours. Wash inside out. Do not bleach. Line dry in shade. Cool iron if needed.'
    };
  })
);

await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(productsFile, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
console.log(`Created ${products.length} sample products in ${fileURLToPath(productsFile)}.`);
/* ==================== SAMPLE DATA GENERATOR END ==================== */
