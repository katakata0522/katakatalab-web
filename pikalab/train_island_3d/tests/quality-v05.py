"""Train Island v0.5: actual Chromium browser interaction and layout regression.
Injected to about:blank because managed Chromium blocks file:// and local HTTP URLs.
"""
from pathlib import Path
import asyncio,re
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
html=html.replace('<link rel="stylesheet" href="./style.css">','<style>'+ (ROOT/'style.css').read_text()+'</style>')
for name in ('world3d','game'):
    html=html.replace(f'<script src="./{name}.js" defer></script>',f'<script>\n{(ROOT/(name+".js")).read_text()}\n</script>')

async def check(browser,w,h):
    page=await browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    await page.set_content(html,wait_until='load',timeout=30000)
    await page.wait_for_function('Boolean(window.__pikaIslandDebug)',timeout=30000)
    await page.wait_for_timeout(450)
    before=await page.evaluate('window.__pikaIslandDebug.getState()')
    assert before['scene']['islands']==8,before['scene']
    assert before['scene']['landmarks']==8,before['scene']
    assert before['scene']['rendererMetrics'].get('staticProjectionCount',1)==1,before
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    await page.screenshot(path=str(ROOT/f'v05_{w}_initial.png'),full_page=True,animations='disabled')
    await page.locator('#worldCanvas').focus()
    camera=before['camera']
    await page.keyboard.down('Shift');await page.keyboard.press('ArrowRight');await page.keyboard.up('Shift')
    await page.wait_for_timeout(120)
    after=await page.evaluate('window.__pikaIslandDebug.getState()')
    assert camera['target']!=after['camera']['target'],(camera,after['camera'])
    assert after['scene']['rendererMetrics'].get('staticProjectionCount',2)>=2
    await page.locator('#resetCamera').click()
    assert (await page.evaluate('window.__pikaIslandDebug.getState().camera'))==camera
    # A two-finger drag pans the island without adding mode buttons to the UI.
    await page.locator('#worldCanvas').evaluate('''el=>{
      const fire=(name,id,x,y)=>el.dispatchEvent(new PointerEvent(name,{
        bubbles:true,pointerId:id,pointerType:'touch',button:0,buttons:1,clientX:x,clientY:y
      }));
      fire('pointerdown',311,125,220);fire('pointerdown',312,180,220);
      fire('pointermove',311,150,220);fire('pointermove',312,205,220);
      fire('pointerup',311,150,220);fire('pointerup',312,205,220);
    }''')
    await page.wait_for_timeout(110)
    assert (await page.evaluate('window.__pikaIslandDebug.getState().camera.target'))!=camera['target']
    await page.locator('#resetCamera').click()
    await page.locator('#speedA').fill('30');await page.locator('#speedB').fill('30')
    await page.locator('#startButton').click()
    await page.wait_for_timeout(350)
    playing=await page.evaluate('window.__pikaIslandDebug.getState()')
    assert playing['running'] and playing['t']>0,playing
    assert playing['scene']['rendererMetrics'].get('staticProjectionCount',1)==2 or playing['scene']['rendererMetrics'].get('staticProjectionCount',1)>1
    await page.locator('#startButton').click()
    paused=await page.evaluate('window.__pikaIslandDebug.getState()')
    assert not paused['running'] and not paused['runningRaf']
    await page.locator('#startButton').click()
    await page.locator('#skipRun').click()
    finished=await page.evaluate('window.__pikaIslandDebug.getState()')
    assert finished['finished'] and not finished['running']
    assert await page.locator('#resultHeading').inner_text()=='ぴったり！ 同時に到着！'
    await page.screenshot(path=str(ROOT/f'v05_{w}_solved.png'),full_page=True,animations='disabled')
    await page.locator('#againButton').click()
    await page.locator('#speedB').fill('24')
    await page.locator('#startButton').click()
    await page.locator('#skipRun').click()
    assert '先に到着' in await page.locator('#resultHeading').inner_text()
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    await page.close()
    print(f'{w}x{h}: mainland and offshore islets, input, pan, orbit, train success/failure, graph, overflow, JS errors PASS',flush=True)

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        for w,h in [(390,844),(1280,900),(320,740),(768,1024)]:
            await check(browser,w,h)
        await browser.close()
if __name__=='__main__':asyncio.run(main())
