"""Local Chromium QA harness using about:blank DOM injection, due to environment URL navigation policy.
No external HTTP or data navigation. Uses the same source CSS & JS contents as the site.
"""
import asyncio, re, json, pathlib, time, os
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).parents[1]
html=(ROOT/'index.html').read_text()
html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
html=re.sub(r'<link rel="stylesheet" href="\./style\.css">','<style>'+ (ROOT/'style.css').read_text()+'</style>',html)
html=re.sub(r'<script src="\./(?:world3d|game)\.js" defer></script>','',html)
html=re.sub(r'<script>\/\* Intentionally no inline behavior\. \*\/</script>','',html)
async def load(page):
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 await page.set_content(html,wait_until='domcontentloaded',timeout=25000)
 await page.add_script_tag(content=(ROOT/'world3d.js').read_text())
 await page.add_script_tag(content=(ROOT/'game.js').read_text())
 try:
  await page.wait_for_function('!!window.__pikaIslandDebug',timeout=20000)
 except Exception as e:
  print('Failed to boot',await page.locator('#renderStatus').inner_text(),errors)
  raise
 await page.wait_for_timeout(2000)
 return errors
async def main():
 async with async_playwright() as p:
  chrome=os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if pathlib.Path('/usr/bin/chromium').exists() else None)
  opts=dict(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'],timeout=15000)
  if chrome:opts['executable_path']=chrome
  b=await p.chromium.launch(**opts)
  for width,height in [(1280,900),(390,844)]:
   page=await b.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
   begin=time.monotonic()
   errors=await load(page)
   print('size',width,'boot secs',round(time.monotonic()-begin,2),'errors',errors,'state',await page.evaluate('window.__pikaIslandDebug.getState()'))
   await page.screenshot(path=str(ROOT/f'preview_{width}.png'),full_page=True,timeout=60000,animations='disabled')
   print('screenshot',ROOT/f'preview_{width}.png')
   await page.locator('#startButton').click(timeout=15000)
   await page.wait_for_timeout(500)
   s1=await page.evaluate('window.__pikaIslandDebug.getState()')
   print('after start',width,'time',round(s1['t'],2),'pos',s1['scene']['trainProgress'],'result hidden',await page.locator('#result').is_hidden())
   await page.locator('#startButton').click()
   s2=await page.evaluate('window.__pikaIslandDebug.getState()')
   print('paused',s2['running'])
   await page.locator('#againButton').click()
   await page.locator('#speedB').fill('30')
   await page.locator('#startButton').click()
   await page.evaluate('window.__pikaIslandDebug.jumpToEnd()')
   print('success',await page.locator('#resultHeading').inner_text(),'errors',errors)
   await page.screenshot(path=str(ROOT/f'preview_success_{width}.png'),full_page=True,timeout=60000,animations='disabled')
   print('overflow',await page.evaluate('document.documentElement.scrollWidth - innerWidth'))
   await page.close()
  await b.close()
asyncio.run(main())
