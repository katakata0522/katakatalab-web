"""Chromium browser smoke for rendered UI. Works by injecting local assets into about:blank
when the browser policy prevents navigating to localhost/file://. No external network."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]


def inline_html():
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    html=re.sub(r'\s*<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
    html=html.replace('<link rel="stylesheet" href="./style.css">','<style>\n'+(ROOT/'style.css').read_text(encoding='utf-8')+'\n</style>')
    for name in ['game-core.js','scene.js','main.js']:
        html=html.replace(f'<script src="./{name}" defer></script>',f'<script>\n'+(ROOT/name).read_text(encoding='utf-8')+'\n</script>')
    return html


def run():
    text=inline_html()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
        for width,height in [(320,750),(390,844),(768,970),(1280,950)]:
            context=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce')
            page=context.new_page()
            errors=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.set_content(text,wait_until='load')
            assert page.locator('#trainA').count()==1
            assert page.locator('#trainB').count()==1
            assert page.locator('#missionTabs button').count()==3
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'horizontal overflow at {width}'
            for mid,wrong,right,place,time in [
                ('meeting','12','24','600','1.5'),('delay','0','1.5','600','3'),('target','12','24','800','2')
            ]:
                page.locator(f'[data-mission="{mid}"]').click()
                page.locator('#playButton').click()
                page.locator('#resultCard').wait_for(state='visible')
                assert 'あと少し' in page.locator('#resultTitle').inner_text(), f'{width},{mid}: wrong must fail'
                assert page.locator('#graphTraces path').count()>0
                page.locator('#controlSlider').fill(right)
                page.locator('#playButton').click()
                assert 'ミッション成功' in page.locator('#resultTitle').inner_text(), f'{width},{mid}: correct must succeed'
                assert place+'m' in page.locator('#resultText').inner_text(),(width,mid,page.locator('#resultText').inner_text())
                assert time+'分' in page.locator('#resultText').inner_text()
                assert page.locator('#sceneMeetPin').get_attribute('opacity') == '1'
            assert page.locator('#progressBadge').inner_text()=='できた 3 / 3'
            page.locator('#openGuide').click()
            assert page.locator('#guideDialog').evaluate('(d)=>d.open')
            page.locator('#closeGuide').click()
            assert not page.locator('#guideDialog').evaluate('(d)=>d.open')
            assert not errors, errors
            page.locator('[data-mission="meeting"]').click()
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
            page.screenshot(path=str(ROOT.parent/f'preview_{width}px.png'),full_page=True,animations='disabled')
            print(f'{width}px: 3 wrong answers + 3 successes + guide + layout: PASS')
            context.close()
        browser.close()

if __name__=='__main__':run()
