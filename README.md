# Kern - Swiss-Editorial Portfolio Template

A full, self-contained replica of the **Kern** portfolio template ([https://kern-template.framer.website/](https://kern-template.framer.website/)).

Built with a bold Swiss-editorial aesthetic, dark mode styling (`#0a0a0a`), vibrant yellow accents (`#ffff00`), refined Geist & Inter typography, smooth Lenis inertia scrolling, and responsive layouts.

---

## 📁 Project Structure

```
├── index.html                   # Home page (Selected works, About & Bio, Services, Massive fit-text footer)
├── projects/                    # Projects directory
│   ├── index.html               # All Projects page with interactive category filters
│   ├── koto-running/index.html  # Case study: Koto Running (E-commerce redesign)
│   ├── meridian/index.html      # Case study: Meridian (Architecture magazine identity)
│   ├── haus/index.html          # Case study: Haus (SaaS Design system & tokens)
│   ├── arkfield/index.html      # Case study: Arkfield (Art direction & product launch)
│   ├── bloom/index.html         # Case study: Bloom (Sustainable packaging)
│   ├── forma-labs/index.html    # Case study: Forma Labs (Biotech visual identity)
│   ├── norde/index.html         # Case study: Norde (Fintech UX platform)
│   └── velt-studio/index.html   # Case study: Velt Studio (Creative web studio)
├── contact/
│   └── index.html               # Contact page (Get in touch, sitemap, socials)
├── assets/
│   ├── images/                  # 49 High-resolution images and vector SVGs (all local)
│   ├── fonts/                   # 19 Geist & Inter web fonts (all local)
│   ├── css/
│   │   └── lenis.css            # Smooth scroll styles
│   └── js/
│       ├── lenis.min.js         # Smooth scroll engine
│       └── main.js              # Category filtering, smooth scroll setup & menu interactivity
├── server.js                    # Zero-dependency local web server
├── package.json                 # Scripts for local running & building
└── README.md
```

---

## 🚀 How to Run Locally

### Option 1: Using Node.js (Zero external dependencies)
```bash
npm start
```
or:
```bash
node server.js
```
Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Using Any Static Server
You can also serve this directory using any tool:
- `npx serve .`
- `python -m http.server 3000`
- VS Code Live Server extension

---

## ✨ Features Included

1. **Complete Swiss-Editorial Aesthetic**:
   - Signature high-contrast dark palette (`#0a0a0a` background, `#ffff00` accent, `#ffffff` headers).
   - Massive responsive fit-text hero branding and footer.
   - Clean grid alignments with fine border dividers.

2. **All 11 Pages Included**:
   - Home (`/`)
   - All Projects (`/projects/`)
   - 8 Complete Project Case Studies with sticky metadata sidebars, client testimonials, deliverables, and gallery views.
   - Contact (`/contact/`)

3. **Fully Self-Contained Assets**:
   - **49 images and vector SVGs** downloaded locally to `assets/images/`.
   - **19 Geist and Inter web font files** bundled in `assets/fonts/`.
   - No external Framer CDN dependencies required for images or fonts.

4. **Interactive Category Filtering**:
   - On the `/projects/` page, filter by:
     - **All** (8 projects)
     - **Branding** (Meridian, Bloom, Forma Labs)
     - **Product Design** (Koto Running, Norde)
     - **Art Direction** (Arkfield)
     - **Web Design** (Koto Running, Velt Studio)
     - **Design System** (Haus)

5. **Lenis Smooth Scrolling**:
   - Inertia scrolling configured locally via `assets/js/lenis.min.js`.

6. **Unbranded & Clean**:
   - Removed third-party tracking beacons and Framer badge overlays.
