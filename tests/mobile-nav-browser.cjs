/* Mobile/tablet navigation: four real links, visible touch targets and no overlap.
   Legacy dashboard link path.html redirects to the new subject chooser. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const routes = ['/', '/path.html', '/courses.html', '/library.html', '/mentor.html', '/sandbox.html', '/skills.html', '/ai.html', '/studio.html'];
    for (const width of [320, 390, 600, 700, 750]) for (const route of routes) {
      const page = await browser.newPage({ viewport: { width, height: 780 }, isMobile: true, hasTouch: true });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:4173' + route, { waitUntil: 'domcontentloaded' });
      const nav = page.locator('body > .mobile-nav, body > .mobile');
      assert.equal(await nav.count(), 1, `${route}: exactly one mobile navigation`);
      const result = await page.evaluate(() => {
        const el = document.querySelector('body > .mobile-nav, body > .mobile');
        const rect = el.getBoundingClientRect();
        const header = document.querySelector('body > .top nav, body > .site-header .library-top-nav');
        return {
          position: getComputedStyle(el).position,
          top: rect.top, bottom: rect.bottom, height: rect.height, viewport: innerHeight,
          reserved: parseFloat(getComputedStyle(document.body).paddingBottom) || 0,
          overflow: document.documentElement.scrollWidth - innerWidth,
          links: [...el.querySelectorAll('a')].map(a => ({ href: a.getAttribute('href'), height: a.getBoundingClientRect().height, glyph: a.querySelector('.nav-glyph')?.textContent || '' })),
          duplicateHeader: !!header && getComputedStyle(header).display !== 'none'
        };
      });
      assert.equal(result.position, 'fixed', `${route} ${width}: navigation must stay pinned`);
      assert.ok(Math.abs(result.bottom - result.viewport) <= 2, `${route} ${width}: bottom position`);
      assert.ok(result.top > result.viewport / 2, `${route} ${width}: navigation must be in lower half`);
      assert.ok(result.reserved >= result.height, `${route} ${width}: page must reserve space`);
      assert.ok(result.overflow <= 2, `${route} ${width}: horizontal overflow ${result.overflow}`);
      assert.equal(result.duplicateHeader, false, `${route} ${width}: duplicated navigation`);
      assert.equal(result.links.length, 4, `${route} ${width}: four destinations`);
      assert.ok(result.links.every(link => link.height >= 44), `${route} ${width}: touch targets`);
      assert.ok(result.links.every(link => link.glyph.trim()), `${route} ${width}: missing glyph`);
      assert.equal(new Set(result.links.map(link => link.glyph)).size, 4, `${route} ${width}: distinct glyphs`);
      /* Stylesheets are still arriving at domcontentloaded on a loaded runner; measuring the
         bottom of a half-styled page is what made this check machine-speed dependent. */
      await page.waitForLoadState('load');
      await page.evaluate(async () => {
        /* Scroll only once the layout has settled. The old loop watched scrollY alone, so on a
           slow machine it finished while the page was still growing and then measured a bottom
           that no longer existed. Require BOTH the document height and the scroll position to
           stop changing: strictly more than before, and the assertions below are unchanged. */
        let stable = 0;
        for (let i = 0; i < 60 && stable < 3; i++) {
          const height = document.documentElement.scrollHeight;
          const before = scrollY;
          scrollTo(0, height);
          await new Promise(resolve => setTimeout(resolve, 60));
          const settled = document.documentElement.scrollHeight === height && Math.abs(scrollY - before) < 1;
          stable = settled ? stable + 1 : 0;
        }
        scrollTo(0, document.documentElement.scrollHeight);
        await new Promise(resolve => requestAnimationFrame(() => resolve()));
      });
      const after = await page.evaluate(() => {
        const nav = document.querySelector('body > .mobile-nav, body > .mobile');
        const rect = nav.getBoundingClientRect();
        const covered = [...document.querySelectorAll('button,a,select,textarea,summary')]
          .filter(node => !nav.contains(node))
          .map(node => ({ node, box: node.getBoundingClientRect() }))
          .filter(({ box }) => box.height > 0 && box.top >= 0 && box.bottom <= innerHeight)
          .filter(({ box }) => {
            const hit = document.elementFromPoint(Math.max(2, Math.min(innerWidth - 2, box.left + box.width / 2)), box.top + box.height / 2);
            return !!hit && nav.contains(hit);
          });
        return {
          bottom: rect.bottom, viewport: innerHeight,
          covered: covered.length,
          coveredDetails: covered.map(({ node, box }) => ({
            tag: node.tagName.toLowerCase(),
            text: (node.textContent || '').trim().slice(0, 90),
            href: node.getAttribute('href'),
            top: Math.round(box.top), bottom: Math.round(box.bottom)
          })),
          scrollY, scrollHeight: document.documentElement.scrollHeight
        };
      });
      assert.ok(Math.abs(after.bottom - after.viewport) <= 2, `${route} ${width}: pinned after scrolling`);
      assert.equal(after.covered, 0, `${route} ${width}: covered controls ${JSON.stringify(after.coveredDetails)} (scrollY=${after.scrollY}, scrollHeight=${after.scrollHeight})`);
      if (route === '/') {
        await page.locator('body > .mobile-nav a[href="path.html"]').click();
        await page.waitForURL('**/courses.html');
        await page.locator('#qaLessons summary').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#englishLessons summary').count(), 1, 'English remains a separate subject');
      }
      assert.deepEqual(errors, [], `${route} ${width}: JavaScript errors`);
      console.log(`PASS bottom navigation ${width}px ${route}`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
