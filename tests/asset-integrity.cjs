/* Regression guard for merging branches created before the single design system.
   Every published page must load only stylesheets and scripts that actually exist,
   must use the shared design system, and must carry the same navigation shell. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const pages=fs.readdirSync('.').filter(name=>name.endsWith('.html')).sort();
assert.ok(pages.length>=8,'the audit must cover every published page');

const refs=html=>[
  ...[...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map(m=>m[1]),
  ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1])
].map(value=>value.split('?')[0]).filter(value=>!/^(https?:)?\/\//.test(value));

for(const page of pages){
  const html=fs.readFileSync(page,'utf8');

  /* 1. No page may reference an asset that was deleted on another branch. */
  for(const asset of refs(html)){
    assert.ok(fs.existsSync(path.resolve('.',asset)),
      `${page} loads "${asset}", which does not exist in the repository`);
  }

  /* 2. One design system, one theme script — otherwise the page renders unstyled. */
  assert.match(html,/href="academy-ui\.css/,`${page} must load the shared design system`);
  assert.match(html,/src="theme\.js/,`${page} must load the theme and navigation script`);

  /* 3. One of the two shared desktop shells, and the same bottom navigation everywhere,
        so the learner always knows where they are. studio.html is the read-only archive
        and is reached from the overview, so it only needs the bottom navigation. */
  if(page!=='studio.html'){
    assert.ok(/<nav class="page-nav"/.test(html)||/<nav class="nav-links"/.test(html),
      `${page} must use one of the shared desktop navigation shells`);
  }
  assert.match(html,/<nav class="mobile-nav"/,`${page} must use the shared bottom navigation`);
  assert.ok(/class="mobile-nav"[^>]*>(?:(?!<\/nav>).)*<\/nav>/s.test(html),`${page}: bottom navigation is malformed`);
  const bottom=html.match(/<nav class="mobile-nav"[\s\S]*?<\/nav>/)[0];
  assert.equal((bottom.match(/<a /g)||[]).length,4,`${page}: bottom navigation must offer the same four destinations`);

  /* 4. A keyboard user must be able to skip the navigation, and the target must exist. */
  const skip=html.match(/<a [^>]*class="skip"[^>]*href="#([\w-]+)"[^>]*>|<a [^>]*href="#([\w-]+)"[^>]*class="skip"[^>]*>/);
  assert.ok(skip,`${page} needs a keyboard skip link (class="skip"), not a visible hint box`);
  const target=skip[1]||skip[2];
  assert.ok(new RegExp(`id="${target}"`).test(html),
    `${page}: the skip link points at #${target}, which no element defines`);

  /* 5. External links must not hand the opener to another site. */
  for(const anchor of html.match(/<a [^>]*target="_blank"[^>]*>/g)||[]){
    assert.match(anchor,/rel="noopener noreferrer"/,`${page}: ${anchor} needs rel="noopener noreferrer"`);
  }
}
console.log(`PASS: ${pages.length} pages load only existing assets and share one design system and navigation.`);
