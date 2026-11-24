from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/local/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width':1672,'height':941})
    pg.goto('http://127.0.0.1:8080/'); pg.wait_for_timeout(1000)
    pg.screenshot(path='/tmp/shots/menu_zoom.png', clip={'x':400,'y':0,'width':900,'height':380})
    pg.click('#btn-start', force=True); pg.wait_for_timeout(300)
    pg.evaluate("()=>{const g=window.__beast; g.waveDelay=99; g.wave=3; g.player.x=500; g.player.face=1; g.spawnEnemy('bots',1000); g.spawnEnemy('cops',1150); g.spawnEnemy('drones',900);g.spawnEnemy('dogs',1300); g.spawnEnemy('fents',1400)}")
    pg.keyboard.down('Digit1')
    for i in range(6):
        pg.wait_for_timeout(260); pg.screenshot(path=f'/tmp/shots/fx{i}.png', clip={'x':400,'y':250,'width':1000,'height':560})
    pg.keyboard.up('Digit1')
    pg.evaluate("()=>{const g=window.__beast; g.enemies=[]; const pk=g.spawnPickup('gold_mask',g.player.x+10); }")
    pg.wait_for_timeout(180); pg.screenshot(path='/tmp/shots/mask0.png')
    pg.wait_for_timeout(250); pg.screenshot(path='/tmp/shots/mask1.png')
    b.close()
