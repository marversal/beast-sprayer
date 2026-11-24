import sys, time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/local/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width':1672,'height':941})
    logs=[]
    pg.on('console', lambda m: logs.append(m.type+': '+m.text))
    pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)))
    pg.goto('http://127.0.0.1:8080/')
    pg.wait_for_timeout(1500)
    pg.screenshot(path='/tmp/shots/menu.png')
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/shots/menu_sel2.png')
    pg.keyboard.press('ArrowLeft'); pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
    pg.screenshot(path='/tmp/shots/play0.png')
    print('\n'.join(logs))
    b.close()
