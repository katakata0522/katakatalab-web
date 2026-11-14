"""One-screen layout, mobile graph sheet, replay and accessibility regression in Chromium.
The exact project HTML/CSS/JS is injected into about:blank because sandbox navigation is restricted.
"""
from pathlib import Path
import asyncio,re,json
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>', '', html)
html=html.replace('<link rel="stylesheet" href="./style.css">','<style>'+(ROOT/'style.css').read_text()+'</style>')
for f in ('world3d','game'):
    html=html.replace(f'<script src="./{f}.js" defer></script>',f'<script>\n{(ROOT/(f+".js")).read_text()}\n</script>')

async def measure(page):
 return await page.evaluate('''()=>{
    const doc=document.documentElement, panel=document.querySelector('.console-inner'),map=document.querySelector('.world-viewport');
    const graph=document.getElementById('graphCard');
    return {pageWidth:doc.scrollWidth-innerWidth,pageHeight:doc.scrollHeight-innerHeight,
      panelOverflow:panel.scrollHeight-panel.clientHeight, sceneHeight:map.clientHeight,
      graphVisible:graph.getClientRects().length>0, graphHeight:graph.getBoundingClientRect().height,
      actionBottom:document.getElementById('startButton').getBoundingClientRect().bottom};
 }''')

async def inspect(browser,width,height):
 page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
 await page.set_content(html,wait_until='load',timeout=30000)
 await page.wait_for_function('!!window.__pikaIslandDebug',timeout=30000)
 await page.wait_for_timeout(220)
 init=await measure(page)
 assert init['pageWidth']<=0 and init['pageHeight']<=0,(width,init)
 assert init['panelOverflow']<=1,(width,'panel scrolled at start',init)
 assert not await page.locator('#result').is_visible()
 assert not await page.locator('#skipRun').is_visible()
 assert await page.locator('#playLabel').inner_text()=='列車を走らせる'
 assert await page.locator('#graphLines path').count()==0,'no graph pre-reveal'
 if width<601:
    assert not init['graphVisible'],init
    await page.locator('#toggleGraph').click()
    assert await page.locator('#graphCard').is_visible()
    assert await page.locator('#toggleGraph').get_attribute('aria-expanded')=='true'
    await page.screenshot(path=str(ROOT/f'v07_{width}_graph.png'),full_page=False,animations='disabled')
    await page.keyboard.press('Escape')
    assert not await page.locator('#graphCard').is_visible()
    assert await page.locator('#toggleGraph').get_attribute('aria-expanded')=='false'
    await page.locator('#toggleGraph').click()
    await page.locator('#closeGraph').click()
    assert not await page.locator('#graphCard').is_visible()
 else:
    assert init['graphVisible'],init
 await page.screenshot(path=str(ROOT/f'v07_{width}_start.png'),full_page=False,animations='disabled')
 # Wrong speeds first: A=30 B=24.
 await page.locator('#startButton').click()
 await page.wait_for_timeout(250)
 assert await page.locator('#playLabel').inner_text()=='一時停止'
 assert await page.locator('#skipRun').is_visible()
 await page.locator('#startButton').click()
 assert await page.locator('#playLabel').inner_text()=='つづきを走らせる'
 await page.locator('#startButton').click()
 await page.locator('#skipRun').click()
 assert 'A列車が先に到着' in await page.locator('#resultHeading').inner_text()
 assert await page.locator('#playLabel').inner_text()=='もう一度走らせる'
 failed=await measure(page)
 assert failed['pageHeight']<=0 and failed['panelOverflow']<=1,(width,'failed state scrolled',failed)
 assert await page.locator('#speedA').is_enabled() and await page.locator('#speedB').is_enabled()
 # One simple action restarts without scrolling to another part of the page.
 await page.locator('#speedB').fill('30')
 assert await page.locator('#result').is_hidden()
 await page.locator('#startButton').click()
 await page.locator('#skipRun').click()
 assert '同時に到着' in await page.locator('#resultHeading').inner_text()
 success=await measure(page)
 assert success['pageHeight']<=0 and success['panelOverflow']<=1,(width,'success state scrolled',success)
 assert await page.locator('#graphLines path').count()==2
 await page.screenshot(path=str(ROOT/f'v07_{width}_result.png'),full_page=False,animations='disabled')
 await page.locator('#startButton').click()
 assert (await page.evaluate('window.__pikaIslandDebug.getState()'))['running'], 'replay must run from the same control'
 assert await page.locator('#result').is_hidden()
 assert not errors,errors
 print(json.dumps({'width':width,'height':height,'initial':init,'failed':failed,'success':success,'jsErrors':errors},ensure_ascii=False),flush=True)
 await page.close()

async def main():
 async with async_playwright() as p:
    opts={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']}
    if Path('/usr/bin/chromium').exists():opts['executable_path']='/usr/bin/chromium'
    browser=await p.chromium.launch(**opts)
    for width,height in [(1280,900),(1280,720),(1024,768),(768,1024),(390,844),(320,740)]:
        await inspect(browser,width,height)
    await browser.close()

if __name__=='__main__':asyncio.run(main())
