from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/local/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width':1672,'height':941})
    logs=[]
    pg.on('console', lambda m: logs.append(m.type+': '+m.text))
    pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)))
    pg.on('requestfailed', lambda r: logs.append('REQFAIL '+r.url))
    pg.on('response', lambda r: logs.append('HTTP %s %s'%(r.status,r.url)) if r.status>=400 else None)
    pg.goto('http://127.0.0.1:8080/'); pg.wait_for_timeout(1200)
    pg.click('#btn-start', force=True); pg.wait_for_timeout(300)
    pg.evaluate("""()=>{const g=window.__beast; g.waveDelay=99; g.wave=4;
      g.spawnEnemy('heros',1000); g.spawnEnemy('cops',1250); g.spawnEnemy('dogs',1500);g.spawnEnemy('bots',300);g.spawnEnemy('drones',1450);g.spawnEnemy('fents',200);
      g.spawnPickup('gold_can',500); g.spawnPickup('gold_mask',650);}""")
    pg.keyboard.down('Digit1'); pg.wait_for_timeout(450)
    pg.screenshot(path='/tmp/shots/play1.png')
    pg.wait_for_timeout(500)
    pg.screenshot(path='/tmp/shots/play2.png')
    pg.keyboard.up('Digit1')
    print(pg.evaluate("()=>{const g=window.__beast;return JSON.stringify({score:g.score,kills:g.kills,health:g.health,enemies:g.enemies.length})}"))
    print('\n'.join(logs))
    b.close()
