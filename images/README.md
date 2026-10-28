# Product photography

All 135 product image paths in `data/products.json` have a matching local `.jpeg` file. The storefront does not depend on an external image server. The images are original **AI-generated sample fashion photographs**, created with the built-in imagegen tool on 14 September 2026. They illustrate this demo catalogue; they do not represent actual manufactured products, real models, or company claims. No third-party stock or retailer photos are included.

There are nine distinct photographs, one per subcategory. Each is reused across its fifteen sample entries, which intentionally vary in stock, price, size and tags for testing. Colour choices beyond the pictured colour are illustrative; replace them and the photographs with your actual product variants before selling real products.

| Product files | Photograph | Main pictured colour |
| --- | --- | --- |
| `tshirt1.jpeg`–`tshirt15.jpeg` | Relaxed cotton T-shirt | Ecru |
| `tshirt16.jpeg`–`tshirt30.jpeg` | Oversized cotton T-shirt | Olive |
| `jogger1.jpeg`–`jogger15.jpeg` | Tapered cuffed joggers | Charcoal |
| `jeans1.jpeg`–`jeans15.jpeg` | Straight-leg jeans | Indigo |
| `hoodie1.jpeg`–`hoodie15.jpeg` | Pullover fleece hoodie | Stone |
| `jacket1.jpeg`–`jacket15.jpeg` | Zip-front bomber jacket | Black |
| `shirt1.jpeg`–`shirt15.jpeg` | Botanical resort shirt | Ecru print |
| `shirt16.jpeg`–`shirt30.jpeg` | Linen button-up shirt | Ecru |
| `shirt31.jpeg`–`shirt45.jpeg` | Oversized poplin shirt | Sky blue |

The JPEG files are 1122 × 1402 pixels, encoded at quality 86 to balance detail and download size. Converting to JPEG preserved the original compositions. The application lazy-loads product grid photographs.

## Replacing sample images

1. Prepare the photograph of your actual product as JPEG.
2. Use lowercase letters, no spaces, predictable numbering, and the `.jpeg` extension (for example `tshirt7.jpeg`).
3. Replace that file in this folder or update that product's `image` field in `data/products.json`.
4. Add more photographs to its `images` array if needed, such as `images/tshirt7-2.jpeg`.

All product image references belong in `products.json`. Do not scatter product image paths through page HTML or JavaScript. The website has a reusable fallback for genuinely missing images.

## Generation record

Built-in imagegen mode was used, with one generation per photograph. These are the final prompts, retained so you can understand or recreate the visual direction.

### Olive oversized T-shirt (`tshirt16.jpeg`)

> Use case: ads-marketing. Asset: original fashion ecommerce campaign portrait and product sample photo. Create a high-end photorealistic studio fashion photograph, vertical 4:5 aspect ratio. One adult male fashion model with short dark hair wearing a plain olive green oversized heavyweight cotton crew-neck T-shirt with dropped shoulders and elbow-length sleeves, beige relaxed trousers. Full upper body and trousers visible to below knees, model standing naturally with one hand in a pocket, looking just off camera. Warm light beige seamless plaster studio background, soft natural side lighting, subtle shadows, elegant editorial feel, real cotton texture. Model centered, generous space above head, silhouette not clipped. Premium minimal Indian contemporary casual fashion mood. No logos, no text, no typography, no watermarks, no accessories covering garment. Output JPEG if possible.

### Shared prompt for the other eight photographs

> Use case: product-mockup. Asset: original fashion ecommerce sample product portrait. Create a high-end photorealistic studio fashion photograph, vertical 4:5 aspect ratio. Subject: [SUBJECT BELOW] Adult Indian or South Asian fashion model with natural expression and relaxed standing pose, looking just off camera. Model centered with entire head and shoes visible, generous negative space above head. Warm light beige seamless plaster studio background, soft natural side lighting, realistic gentle shadows, elegant editorial photography with real textile texture. Cohesive premium minimal contemporary casual clothing brand look. Main garment must be fully visible, anatomically accurate hands and limbs, no logos, no text, no watermark, no props. Output JPEG if possible.

The exact subject inserted in each prompt:

- `tshirt1.jpeg`: one adult male model wearing a plain off-white relaxed-fit cotton crew-neck T-shirt, washed black straight trousers. Hands naturally beside body.
- `jogger1.jpeg`: one adult male model wearing charcoal grey tapered cotton jogger pants with cuffed ankles and drawstring waist, plain light grey sweatshirt slightly tucked to show the elastic waistband. Minimal off-white sneakers. Model standing casually, full body.
- `jeans1.jpeg`: one adult male model wearing medium indigo blue straight-leg denim jeans, plain white tucked T-shirt, off-white sneakers. Full body with jean cut and waist clearly visible.
- `hoodie1.jpeg`: one adult male model wearing a plain stone-beige heavyweight pullover hoodie with a kangaroo pocket, charcoal trousers, white minimal sneakers. Hood resting down, full body.
- `jacket1.jpeg`: one adult male model wearing an unbranded black minimalist zip-front bomber jacket over a cream tee, black relaxed trousers, white minimal sneakers. Full body.
- `shirt1.jpeg`: one adult male model wearing a short-sleeve resort button-up shirt with a tasteful small black botanical print on ecru fabric, tan relaxed trousers, beige slip-on shoes. Full body.
- `shirt16.jpeg`: one adult male model wearing a plain warm white long-sleeve linen button-up shirt with sleeves casually rolled at wrist, tan relaxed trousers, minimal white sneakers. Full body.
- `shirt31.jpeg`: one adult male model wearing a pale powder blue oversized long-sleeve cotton poplin button-up shirt with dropped shoulders, cream straight trousers, white sneakers. Shirt untucked, full body.
