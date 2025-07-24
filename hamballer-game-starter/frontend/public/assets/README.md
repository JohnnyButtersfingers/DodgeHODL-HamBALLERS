# Background Asset Guidelines for HamBaller.xyz

This directory tree contains every **background image** rendered by the HamBaller.xyz frontend.

```
frontend/public/assets/
└── backgrounds/   # <-- raster or vector background files live here
    ├── bg-main-4k.webp
    ├── bg-main-hd.webp
    ├── bg-main-mobile.webp
    └── bg-stats.svg
```

## Compression & Delivery Rules
1. **Preferred formats**: `.webp` (lossy, ~85 % quality) or `.avif`.  Fallback `.svg` for purely-vector artwork.
2. **File-size budget**: ≤ **400 KB** per image after compression.
3. **Resolutions to supply**:
   • Desktop 4 K – 3840 × 2160  
   • Desktop HD – 1920 × 1080 (fallback)  
   • Mobile – 1280 × 720
4. **Colour profile**: sRGB (convert if necessary).
5. **Metadata**: Strip all EXIF, ICC, GPS or other metadata.
6. **Optimization tools (examples)**:
   - `squoosh-cli --oxipng auto --webp auto input.png -d ./out`
   - `cwebp -q 85 input.png -o output.webp`
   - `avifenc --min 25 --max 35 input.png output.avif`

## Naming Conventions
Use **kebab-case**; include the context and resolution where applicable:

| Context         | Example File                |
|-----------------|-----------------------------|
| Main global bg  | `bg-main-4k.webp`           |
|                 | `bg-main-hd.webp`           |
|                 | `bg-main-mobile.webp`       |
| Stats overlay   | `bg-stats.svg`              |

Avoid spaces, camelCase, or dots other than the extension.

## Licensing / Attribution
Only add assets that you **own**, created yourself, or that are licensed for commercial redistribution.

If attribution is required by the licence, list details in `ATTRIBUTIONS.md` at the project root **and** reference the asset filename here:

```text
### Attributions
- bg-stats.svg – © Some Artist, CC-BY 4.0 (see ATTRIBUTIONS.md)
```

## Pull Request Checklist
- [ ] Images follow the size/format rules above.
- [ ] Correct directory: `frontend/public/assets/backgrounds/`.
- [ ] Updated this README if new contexts added.
- [ ] Added any required attributions.

---
_This file is auto-generated as part of the **feat/background-assets** branch._