// Aden The Piper - Portfolio Interactive Script
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lenis Smooth Scroll
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // 2. Ensure all appear animation elements become visible smoothly
  setTimeout(() => {
    const hiddenElements = document.querySelectorAll('[style*="opacity: 0"], [style*="opacity:0"]');
    hiddenElements.forEach(el => {
      el.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.opacity = '1';
      if (el.style.transform && el.style.transform.includes('translateY')) {
        el.style.transform = 'translateY(0px)';
      }
    });
  }, 100);

  // 3. Native Cursor - Exact Framer experience (no artificial cursor overlays)
  // WebGL Liquid Mask Navier-Stokes fluid simulation runs on #stage via liquid-effect.js



  // 4. Category Filter Logic for Services & Performances Page
  const filterMapping = {
    'koto-running': ['All', 'Weddings'],
    'meridian': ['All', 'Memorials'],
    'haus': ['All', 'Military & Civic'],
    'arkfield': ['All', 'Band Direction'],
    'bloom': ['All', 'Military & Civic'],
    'forma-labs': ['All', 'Military & Civic'],
    'norde': ['All', 'Band Direction'],
    'velt-studio': ['All', 'Instruction']
  };

  const filterHeadings = Array.from(document.querySelectorAll('h6')).filter(h => {
    const txt = h.textContent.trim();
    return ['All', 'Weddings', 'Memorials', 'Military & Civic', 'Band Direction', 'Instruction'].includes(txt);
  });

  if (filterHeadings.length > 0) {
    function setActiveButton(activeHeading) {
      filterHeadings.forEach(h => {
        const btn = h.closest('[data-highlight="true"]') || h.parentElement;
        if (h === activeHeading) {
          h.style.setProperty('--framer-text-color', 'rgb(10, 10, 10)');
          h.style.color = '#0a0a0a';
          if (btn) {
            btn.style.backgroundColor = '#ffff00';
            btn.style.borderColor = '#ffff00';
          }
        } else {
          h.style.setProperty('--framer-text-color', 'rgb(138, 138, 138)');
          h.style.color = '#8a8a8a';
          if (btn) {
            btn.style.backgroundColor = 'transparent';
            btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }
        }
      });
    }

    const allHeading = filterHeadings.find(h => h.textContent.trim() === 'All');
    if (allHeading) {
      setActiveButton(allHeading);
    }

    filterHeadings.forEach(heading => {
      const btn = heading.closest('[data-highlight="true"]') || heading.parentElement;
      const targetCategory = heading.textContent.trim();

      const handleClick = (e) => {
        e.preventDefault();
        setActiveButton(heading);

        const projectLinks = document.querySelectorAll('a[href*="koto-running"], a[href*="meridian"], a[href*="haus"], a[href*="arkfield"], a[href*="bloom"], a[href*="forma-labs"], a[href*="norde"], a[href*="velt-studio"]');

        projectLinks.forEach(link => {
          let projectSlug = '';
          for (const key of Object.keys(filterMapping)) {
            if (link.getAttribute('href').includes(key)) {
              projectSlug = key;
              break;
            }
          }

          const cardContainer = link.closest('.framer-nydacf-container') || link.closest('.ssr-variant') || link.parentElement;
          if (!cardContainer || !projectSlug) return;

          const categories = filterMapping[projectSlug] || ['All'];
          if (targetCategory === 'All' || categories.includes(targetCategory)) {
            cardContainer.style.display = '';
            cardContainer.style.opacity = '0';
            cardContainer.style.transform = 'translateY(15px)';
            cardContainer.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            requestAnimationFrame(() => {
              cardContainer.style.opacity = '1';
              cardContainer.style.transform = 'translateY(0px)';
            });
          } else {
            cardContainer.style.display = 'none';
          }
        });
      };

      if (btn) {
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', handleClick);
      }
      heading.style.cursor = 'pointer';
      heading.addEventListener('click', handleClick);
    });
  }

  // 5. Interactive Navigation Drawer
  const menuIcons = document.querySelectorAll('[data-framer-name="Menu "], [data-framer-name="Menu Icon"]');
  
  // Calculate relative base path
  let basePath = './';
  const iconLink = document.querySelector('link[rel="icon"]');
  if (iconLink) {
    const href = iconLink.getAttribute('href') || '';
    if (href.startsWith('../../')) basePath = '../../';
    else if (href.startsWith('../')) basePath = '../';
  }

  // Build Full-screen Navigation Overlay
  let navDrawer = document.getElementById('siteNavDrawer');
  if (!navDrawer) {
    navDrawer = document.createElement('div');
    navDrawer.id = 'siteNavDrawer';
    navDrawer.style.cssText = `
      position: fixed; inset: 0; z-index: 999999;
      background: rgba(10, 10, 10, 0.96); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      display: none; flex-direction: column; justify-content: space-between;
      padding: 40px 32px; box-sizing: border-box; opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    navDrawer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 24px;">
        <span style="font-weight: 700; font-size: 13px; letter-spacing: 0.1em; color: #ffff00; text-transform: uppercase;">Suzanne Aden Kemp · Aden the Piper</span>
        <button id="closeNavDrawer" style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; width: 44px; height: 44px; border-radius: 50%; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">&times;</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 18px; margin: auto 0; padding: 20px 0;">
        <a href="${basePath}" style="color: #fff; text-decoration: none; font-size: clamp(28px, 6vw, 56px); font-weight: 900; text-transform: uppercase; letter-spacing: -0.03em; transition: color 0.2s;">Home</a>
        <a href="${basePath}gallery/" style="color: #ffff00; text-decoration: none; font-size: clamp(28px, 6vw, 56px); font-weight: 900; text-transform: uppercase; letter-spacing: -0.03em; transition: color 0.2s;">Explore Gallery &amp; Videos ★</a>
        <a href="${basePath}projects/" style="color: #fff; text-decoration: none; font-size: clamp(28px, 6vw, 56px); font-weight: 900; text-transform: uppercase; letter-spacing: -0.03em; transition: color 0.2s;">All Performances &amp; Services</a>
        <a href="${basePath}projects/meridian/" style="color: #fff; text-decoration: none; font-size: clamp(28px, 6vw, 56px); font-weight: 900; text-transform: uppercase; letter-spacing: -0.03em; transition: color 0.2s;">Memorial &amp; Funeral Honors</a>
        <a href="${basePath}projects/koto-running/" style="color: #fff; text-decoration: none; font-size: clamp(28px, 6vw, 56px); font-weight: 900; text-transform: uppercase; letter-spacing: -0.03em; transition: color 0.2s;">Weddings &amp; Celebrations</a>
        <a href="${basePath}contact/" style="color: #fff; text-decoration: none; font-size: clamp(28px, 6vw, 56px); font-weight: 900; text-transform: uppercase; letter-spacing: -0.03em; transition: color 0.2s;">Contact &amp; Booking</a>
      </div>
        <div style="display: flex; gap: 24px;">
          <a href="tel:5059770097" style="color: #8a8a8a; text-decoration: none; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">(505) 977-0097</a>
          <a href="mailto:adenthepiper@gmail.com" style="color: #8a8a8a; text-decoration: none; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">adenthepiper@gmail.com</a>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
          <span style="color: #8a8a8a; font-size: 12px; text-transform: uppercase;">SUZANNE ADEN KEMP 2026©</span>
          <span style="color: #777; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;">Made with love by <a href="https://aiwebify.site" target="_blank" rel="noopener noreferrer" style="color: #ffff00; text-decoration: none; font-weight: 600;">AIwebify.site</a></span>
        </div>
      </div>
    `;
    document.body.appendChild(navDrawer);

    const closeBtn = document.getElementById('closeNavDrawer');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        navDrawer.style.opacity = '0';
        setTimeout(() => { navDrawer.style.display = 'none'; }, 300);
      });
    }

    // Hover effects on links
    navDrawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('mouseenter', () => { a.style.color = '#ffff00'; a.style.transform = 'translateX(10px)'; a.style.transition = 'all 0.2s ease'; });
      a.addEventListener('mouseleave', () => {
        if (!a.textContent.includes('Gallery')) a.style.color = '#fff';
        a.style.transform = 'translateX(0px)';
      });
    });
  }

  function toggleNavDrawer() {
    if (navDrawer.style.display === 'flex') {
      navDrawer.style.opacity = '0';
      setTimeout(() => { navDrawer.style.display = 'none'; }, 300);
    } else {
      navDrawer.style.display = 'flex';
      setTimeout(() => { navDrawer.style.opacity = '1'; }, 10);
    }
  }

  menuIcons.forEach(icon => {
    icon.style.cursor = 'pointer';
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      toggleNavDrawer();
    });
  });

  // Dynamic Fit for Hero Title (ADEN THE PIPER)
  function fitHeroTitle() {
    const heroSVGs = document.querySelectorAll('.framer-1qwtnox, [data-framer-name="Hero Name"]');
    heroSVGs.forEach(svg => {
      const p = svg.querySelector('p');
      if (!p) return;
      p.style.whiteSpace = 'nowrap';
      let size = 122;
      p.style.fontSize = `${size}px`;
      p.style.setProperty('--framer-font-size', `${size}px`);

      // Check if it fits within SVG coordinate width (1160)
      const maxW = 1120;
      if (p.scrollWidth > maxW && size > 50) {
        const factor = maxW / p.scrollWidth;
        size = Math.floor(size * factor);
        p.style.fontSize = `${size}px`;
        p.style.setProperty('--framer-font-size', `${size}px`);
      }
    });
  }

  fitHeroTitle();
  window.addEventListener('resize', fitHeroTitle);
  window.addEventListener('load', fitHeroTitle);

  // 6. Ensure Stats Numbers are always accurately 27+, 1000+, 5+ ★
  function ensureStats() {
    document.querySelectorAll('.framer-1pxl28-container').forEach(card => {
      const numDiv = card.querySelector('.framer-ucp7xt-container div');
      if (numDiv) numDiv.textContent = '27+';
      const label = card.querySelector('p');
      if (label) label.textContent = 'Years of Piping (Since 1999)';
    });
    document.querySelectorAll('.framer-1p05uxm-container').forEach(card => {
      const numDiv = card.querySelector('.framer-ucp7xt-container div');
      if (numDiv) numDiv.textContent = '1000+';
      const label = card.querySelector('p');
      if (label) label.textContent = 'Ceremonies Performed';
    });
    document.querySelectorAll('.framer-8m9pzh-container').forEach(card => {
      const numDiv = card.querySelector('.framer-ucp7xt-container div');
      if (numDiv) numDiv.textContent = '5+ ★';
      const label = card.querySelector('p');
      if (label) label.textContent = 'Star Satisfaction';
    });
  }

  ensureStats();
  setTimeout(ensureStats, 300);
  setTimeout(ensureStats, 800);
  setTimeout(ensureStats, 1800);
});
