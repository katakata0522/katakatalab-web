"""Ensure the assembled offline HTML works at desktop and phone sizes, without network."""
import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).parents[1]
project=(ROOT/'index.html').read_text()
project=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',project)
project=project.replace('<link rel="stylesheet" href="./style.css">','<style>'+ (ROOT/'style.css').read_text()+'</style>')
for name in ('world3d','game'):
    project=project.replace(f'<script src="./{name}.js" defer></script>',f'<script>\n{(ROOT/(name+".js")).read_text()}\n</script>')
async def main():
 async with async_playwright() as p:
    options={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']}
    if Path('/usr/bin/chromium').exists():options['executable_path']='/usr/bin/chromium'
    browser=await p.chromium.launch(**options)
    for w,h in [(1280,720),(390,844)]:
        page=await browser.new_page(viewport={'width':w,'height':h})
        requests=[];errors=[]
        page.on('request',lambda request:requests.append(request.url))
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.set_content(project,wait_until='load',timeout=30000)
        await page.wait_for_function('Boolean(window.__pikaIslandDebug)',timeout=30000)
        await page.locator('#speedB').fill('30')
        await page.locator('#startButton').click()
        await page.locator('#skipRun').click()
        assert '同時に到着' in await page.locator('#resultHeading').inner_text()
        assert await page.evaluate('document.documentElement.scrollHeight<=innerHeight')
        assert not requests,requests
        assert not errors,errors
        print(f'Offline standalone {w}x{h}: first-play and result PASS',flush=True)
        await page.close()
    await browser.close()
if __name__=='__main__':asyncio.run(main())
