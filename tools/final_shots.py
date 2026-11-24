import sys
from playwright.sync_api import sync_playwright
M=sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/local/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width':1672,'height':941})
    errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('http://127.0.0.1:8080/'); pg.wait_for_timeout(1200)
    pg.screenshot(path=M+'/01-splash-menu.png')
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(300)
    pg.screenshot(path=M+'/02-splash-white-horned-selected.png')
    pg.keyboard.press('ArrowLeft'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    pg.evaluate("()=>{const g=window.__beast; g.waveDelay=99; g.wave=3; g.player.x=520; g.player.face=1; g.spawnEnemy('bots',1000); g.spawnEnemy('cops',1180); g.spawnEnemy('drones',900);g.spawnEnemy('dogs',1350); g.spawnEnemy('fents',1450); g.spawnPickup('gold_can',300); g.spawnPickup('gold_mask',1500)}")
    pg.keyboard.down('Digit1'); pg.wait_for_timeout(1250); pg.screenshot(path=M+'/03-gameplay-spray-hud.png'); 
    pg.wait_for_timeout(700); pg.keyboard.up('Digit1')
    pg.evaluate("()=>{const g=window.__beast; g.enemies=[]; g.spawnPickup('gold_mask',g.player.x+10)}")
    pg.wait_for_timeout(200); pg.screenshot(path=M+'/04-gold-mask-pickup-effect.png')
    pg.evaluate("()=>{const g=window.__beast; g.spawnEnemy('cops',g.player.x+80); g.player.invuln=0}")
    pg.wait_for_timeout(500); pg.screenshot(path=M+'/05-damage-health-bar.png')
    pg.click('#btn-replay'); pg.wait_for_timeout(400)
    pg.screenshot(path=M+'/06-after-replay-reset.png')
    pg.evaluate("()=>{const g=window.__beast; g.lives=1; g.health=5; g.waveDelay=99; g.player.invuln=0}")
    for i in range(40):
        pg.evaluate("()=>{const g=window.__beast; g.player.invuln=0; g.spawnEnemy('cops', g.player.x+90)}")
        pg.wait_for_timeout(120)
        if pg.evaluate("()=>window.__beast.mode")=='gameover': break
    pg.wait_for_timeout(1500); pg.screenshot(path=M+'/07-game-over.png')
    print('errors:',errs)
    b.close()
