"""Verify completely self-contained HTML on an injected about:blank document.
Chromium inside this testing environment has URL navigation and WebGL blocked by policy.
"""
from pathlib import Path
import asyncio, hashlib, os, re
from playwright.async_api import async_playwright
P=Path(__file__).resolve().parents[1]
source=(P/'index.html').read_text(encoding='utf-8')
html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',source)
html=html.replace('<link rel="stylesheet" href="./style.css">','<style>\n'+(P/'style.css').read_text(encoding='utf-8')+'\n</style>')
for script in ['world3d.js','game.js']:
 html=html.replace(f'<script src="./{script}" defer></script>','<script>\n'+(P/script).read_text(encoding='utf-8')+'\n</script>')
html=html.replace('<script>/* Intentionally no inline behavior. */</script>','')
async def one(browser,w,h):
 page=await browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 await page.set_content(html,wait_until='load',timeout=30000)
 await page.wait_for_function('Boolean(window.__pikaIslandDebug)',timeout=20000)
 await page.wait_for_timeout(550)
 data=await page.evaluate('window.__pikaIslandDebug.getState()')
 assert data['renderer'] in ('software3d','webgl'),data
 assert data['scene']['faces']>5000
 assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),w
 assert not errors,errors
 # Check camera projection responds to pointer drag.
 c=page.locator('#worldCanvas');bb=await c.bounding_box();
 if bb:
  before=await c.screenshot()
  await page.mouse.move(bb['x']+bb['width']*.52,bb['y']+bb['height']*.40)
  await page.mouse.down();await page.mouse.move(bb['x']+bb['width']*.69,bb['y']+bb['height']*.53,steps=4);await page.mouse.up()
  await page.wait_for_timeout(250)
  after=await c.screenshot()
  assert hashlib.sha256(before).hexdigest()!=hashlib.sha256(after).hexdigest(),'Camera did not change the real 3D view'
  await page.locator('#resetCamera').click()
 await page.locator('#speedB').fill('30')
 await page.locator('#startButton').click()
 await page.wait_for_timeout(350)
 middle=await page.evaluate('window.__pikaIslandDebug.getState()')
 assert middle['running'] and middle['t']>0,middle
 await page.locator('#startButton').click()
 assert (await page.evaluate('window.__pikaIslandDebug.getState().running')) is False
 await page.locator('#startButton').click()
 await page.evaluate('window.__pikaIslandDebug.jumpToEnd()')
 assert 'ぴったり' in await page.locator('#resultHeading').inner_text()
 await page.locator('#againButton').click()
 await page.locator('#speedB').fill('24')
 await page.locator('#startButton').click()
 await page.evaluate('window.__pikaIslandDebug.jumpToEnd()')
 assert '先に到着' in await page.locator('#resultHeading').inner_text()
 assert not errors,errors
 await page.locator('#againButton').click()
 await page.locator('#resetCamera').click()
 await page.screenshot(path=str(P/f'preview_{w}_final.png'),full_page=True,animations='disabled')
 print(w,'×',h,'3d faces:',data['scene']['faces'],'3D rotate: PASS','success/failure/pause: PASS','overflows: none','errors:',errors)
 await page.close()
async def main():
 async with async_playwright() as p:
  chrome=os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
  launch_args=dict(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  if chrome:launch_args['executable_path']=chrome
  browser=await p.chromium.launch(**launch_args)
  for w,h in [(320,740),(390,844),(768,1024),(1280,900)]:await one(browser,w,h)
  await browser.close()
asyncio.run(main())
