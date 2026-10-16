"""V0.4 UI/game/renderer regression checks, including static scene cache, fixed plot scale and page scroll.
The container's Chromium is managed and blocks local HTTP and WebGL; this script tests the genuine
source by injecting HTML/CSS/JS into about:blank, without altering the game itself.
"""
import asyncio,re,os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
html=html.replace('<link rel="stylesheet" href="./style.css">','<style>'+ (ROOT/'style.css').read_text()+'</style>')
for name in ('world3d','game'):
    html=html.replace(f'<script src="./{name}.js" defer></script>',f'<script>\n{(ROOT/(name+".js")).read_text()}\n</script>')

async def check(browser,width,height):
    page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    await page.set_content(html,wait_until='load')
    await page.wait_for_function('Boolean(window.__pikaIslandDebug)',timeout=25000)
    await page.wait_for_timeout(1000)
    async def stats():return await page.evaluate('window.__pikaIslandDebug.getState()')
    start=await stats()
    assert start['scene']['rendererMetrics'].get('staticProjectionCount',1)==1,start
    assert not start['runningRaf'],'main game logic must not tick while idle'
    assert start['graphGridNodes']==25
    assert await page.locator('#graphLines path').count()==0
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert await page.locator('#graphLearning').is_hidden()
    # On controls: changes speed but the plotted scale and grid nodes remain the same.
    initial_grid=await page.locator('#graphGrid').evaluate('(el)=>el.firstElementChild')
    await page.locator('#speedA').fill('48')
    assert initial_grid is not None
    assert (await stats())['graphGridNodes']==start['graphGridNodes']
    # Static island projection is reused during train motion.
    await page.locator('#speedA').fill('30')
    await page.locator('#speedB').fill('30')
    await page.locator('#startButton').click()
    await page.wait_for_timeout(420)
    in_motion=await stats()
    assert in_motion['running'] and in_motion['t']>0,in_motion
    assert in_motion['runningRaf']
    assert in_motion['scene']['rendererMetrics'].get('staticProjectionCount',1)==1,in_motion['scene']
    assert await page.locator('#graphLines path').count()==2
    assert '走行中' in await page.locator('#renderStatus').inner_text()
    await page.locator('#startButton').click()
    paused=await stats()
    assert not paused['running'] and not paused['runningRaf']
    await page.locator('#startButton').click()
    await page.locator('#skipRun').click()
    result=await stats()
    assert result['finished'] and not result['runningRaf']
    assert not await page.locator('#graphLearning').is_hidden()
    assert '同じ時間' in await page.locator('#graphLearning').inner_text()
    await page.locator('#againButton').click()
    await page.locator('#speedB').fill('24')
    await page.locator('#startButton').click()
    await page.locator('#skipRun').click()
    assert '先に到着' in await page.locator('#resultHeading').inner_text()
    assert '速い列車' in await page.locator('#graphLearning').inner_text()
    await page.locator('#againButton').click()
    camera_before=(await stats())['camera']
    await page.locator('#worldCanvas').focus()
    await page.keyboard.press('ArrowRight')
    await page.wait_for_timeout(200)
    camera_after=(await stats())['camera']
    assert camera_before['azimuth']!=camera_after['azimuth']
    scene=(await stats())['scene']
    assert scene['rendererMetrics'].get('staticProjectionCount',2)>=2,'camera change requires static re-projection'
    await page.keyboard.press('r')
    assert (await stats())['camera']==camera_before
    await page.locator('#resetCamera').click()
    # Natural mouse-wheel scrolling should not be intercepted by the island.
    await page.evaluate("document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,0)")
    await page.wait_for_timeout(150)
    bb=await page.locator('#worldCanvas').bounding_box()
    await page.mouse.move(bb['x']+bb['width']*.5,bb['y']+bb['height']*.4)
    await page.mouse.wheel(0,650)
    await page.wait_for_timeout(450)
    assert await page.evaluate('window.scrollY')>50,'wheel should scroll page, not trap it'
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    await page.screenshot(path=str(ROOT/f'v04_{width}_quality.png'),full_page=True,animations='disabled')
    print(f'{width}×{height}: input, frame-stop, curve/camera, static projection cache, fixed graph, scroll, responsive PASS',flush=True)
    await page.close()

async def main():
    async with async_playwright() as p:
        options={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
        if Path('/usr/bin/chromium').exists():options['executable_path']='/usr/bin/chromium'
        browser=await p.chromium.launch(**options)
        for w,h in [(320,740),(390,844),(768,1024),(1280,900)]:
            await check(browser,w,h)
        page=await browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
        await page.set_content(html)
        await page.wait_for_function('Boolean(window.__pikaIslandDebug)')
        await page.locator('#speedB').fill('30')
        await page.locator('#startButton').click()
        assert await page.evaluate('window.__pikaIslandDebug.getState().finished')
        assert not await page.locator('#graphLearning').is_hidden()
        print('reduced motion: immediate feedback, no forced animation PASS')
        await page.close()
        await browser.close()

if __name__=='__main__':asyncio.run(main())
