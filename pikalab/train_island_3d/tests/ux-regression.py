"""Browser smoke test for navigable child-friendly controls and reduced motion.
Executed via local HTML/CSS/JS injected into about:blank because test sandbox forbids HTTP URLs.
"""
from pathlib import Path
import asyncio,re,os
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1]
html=(R/'index.html').read_text()
html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
html=html.replace('<link rel="stylesheet" href="./style.css">','<style>'+ (R/'style.css').read_text() + '</style>')
for name in ('world3d','game'):
    html=html.replace(f'<script src="./{name}.js" defer></script>',f'<script>\n{(R/(name+".js")).read_text()}\n</script>')
async def boot(browser,w=390,h=844,reduced=False):
    page=await browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion='reduce' if reduced else 'no-preference')
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    await page.set_content(html,wait_until='load')
    await page.wait_for_function('Boolean(window.__pikaIslandDebug)',timeout=30000)
    return page,errors
async def main():
    async with async_playwright() as p:
        opts={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
        if Path('/usr/bin/chromium').exists():opts['executable_path']='/usr/bin/chromium'
        browser=await p.chromium.launch(**opts)
        for w,h in [(320,740),(390,844),(768,1024),(1280,900)]:
            page,errors=await boot(browser,w,h)
            assert await page.locator('#worldCanvas').get_attribute('tabindex')=='0'
            assert await page.locator('#graphLines').locator('path').count()==0,'Graph must not reveal end paths before play'
            assert await page.locator('#worldOutcome').is_hidden()
            if w<=600:
                assert await page.locator('#worldCanvas').evaluate('(el)=>getComputedStyle(el).touchAction')=='pan-y'
            initial=await page.evaluate('window.__pikaIslandDebug.getState().camera')
            await page.locator('#worldCanvas').focus()
            await page.keyboard.press('ArrowLeft')
            turned=await page.evaluate('window.__pikaIslandDebug.getState().camera')
            assert turned['azimuth']!=initial['azimuth'],'Keyboard orbit not implemented'
            await page.keyboard.press('r')
            assert await page.evaluate('window.__pikaIslandDebug.getState().camera')==initial,'Keyboard reset did not restore initial view'
            await page.locator('#jumpControls').click()
            await page.wait_for_timeout(450)
            assert await page.evaluate('window.scrollY')>0,'Jump-to-controls did not move page'
            # A and B match: success after optional skip.
            await page.locator('#speedB').fill('30')
            await page.locator('#startButton').click()
            await page.wait_for_timeout(350)
            state=await page.evaluate('window.__pikaIslandDebug.getState()')
            assert state['running'] and state['t']>0,state
            assert not await page.locator('#skipRun').is_hidden()
            await page.locator('#skipRun').click()
            assert '同時に到着' in await page.locator('#resultHeading').inner_text()
            assert not await page.locator('#worldOutcome').is_hidden()
            assert await page.locator('#worldOutcome').get_attribute('data-success')=='true'
            assert await page.locator('#graphLines').locator('path').count()>0
            await page.locator('#viewGraph').click()
            await page.wait_for_timeout(400)
            assert await page.evaluate('window.scrollY')>0,'Graph CTA scroll failed'
            # Replay wrong setup produces actionable guidance.
            await page.locator('#againButton').click()
            await page.locator('#speedB').fill('24')
            await page.locator('#startButton').click()
            await page.locator('#skipRun').click()
            assert '先に到着' in await page.locator('#resultHeading').inner_text()
            assert 'Bを速くするか' in await page.locator('#resultExplanation').inner_text()
            assert await page.locator('#worldOutcome').get_attribute('data-success')=='false'
            await page.locator('#againButton').click()
            assert await page.locator('#worldOutcome').is_hidden()
            assert not await page.locator('#speedB').is_disabled()
            assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            assert not errors,errors
            await page.close()
            print(f'{w}px: navigability/keyboard orbit/touch scroll/graph gating/success/failure/reset PASS')
        page,errors=await boot(browser,390,844,reduced=True)
        await page.locator('#speedB').fill('30')
        await page.locator('#startButton').click()
        state=await page.evaluate('window.__pikaIslandDebug.getState()')
        assert state['finished'] and not state['running'],'Reduce-motion users must get an instant result'
        assert not await page.locator('#worldOutcome').is_hidden()
        assert not errors,errors
        print('prefers-reduced-motion: immediate result PASS')
        await page.close()
        await browser.close()
asyncio.run(main())
