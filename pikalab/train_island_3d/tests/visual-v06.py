"""Review final local source in an isolated Chromium doc; keep no network access."""
import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
html=html.replace('<link rel="stylesheet" href="./style.css">','<style>'+(root/'style.css').read_text()+'</style>')
for script in ('world3d.js','game.js'):
  html=html.replace(f'<script src="./{script}" defer></script>',f'<script>\n{(root/script).read_text()}\n</script>')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
  for w,h in [(1280,900),(390,844),(320,740),(768,1024)]:
   page=await browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.set_content(html,wait_until='load',timeout=30000)
   await page.wait_for_function('Boolean(window.__pikaIslandDebug)',timeout=30000)
   await page.wait_for_timeout(550)
   v=await page.evaluate('window.__pikaIslandDebug.getState()')
   print(w,'scene', {k:v['scene'][k] for k in ('islands','faces','treeCount','landmarks','trainProgress')}, 'renderer',v['renderer'],'errors',errors,flush=True)
   await page.screenshot(path=str(root/f'v06_{w}.png'),full_page=True,animations='disabled')
   await page.locator('#speedB').fill('30');await page.locator('#startButton').click();await page.wait_for_timeout(180);await page.evaluate('window.__pikaIslandDebug.jumpToEnd()')
   print(w,'solved',await page.locator('#resultHeading').inner_text(),'overflow',await page.evaluate('document.documentElement.scrollWidth-innerWidth'),'errors',errors,flush=True)
   await page.close()
  await browser.close()
asyncio.run(main())
