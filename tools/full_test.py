import json
from playwright.sync_api import sync_playwright
def st(pg): return json.loads(pg.evaluate("()=>{const g=window.__beast;return JSON.stringify({mode:g.mode,score:g.score,kills:g.kills,gold:g.gold,health:g.health,lives:g.lives,en:g.enemies.length,wave:g.wave,px:g.player.x})}"))
def hud(pg): return pg.evaluate("()=>({score:document.getElementById('hud-score').textContent,can:document.getElementById('hud-can').textContent,mask:document.getElementById('hud-mask').textContent,bots:document.getElementById('k-bots').textContent,drones:document.getElementById('k-drones').textContent,segs:document.querySelectorAll('.seg.on').length,lost:document.querySelectorAll('.lives img.lost').length,id:document.getElementById('hud-id').textContent})")
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/local/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width':1672,'height':941})
    logs=[]
    pg.on('console', lambda m: logs.append(m.type+': '+m.text))
    pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)))
    pg.goto('http://127.0.0.1:8080/'); pg.wait_for_timeout(1000)
    # choose white horned by clicking frame, then start with button
    pg.click('.frame[data-key=white_horned]')
    pg.wait_for_timeout(300); pg.screenshot(path='/tmp/shots/menu_white.png')
    pg.click('#btn-start', force=True); pg.wait_for_timeout(300)
    print('hud after start', hud(pg))
    pg.evaluate("()=>{const g=window.__beast; g.waveDelay=99; g.wave=4; g.spawnPickup('gold_mask', g.player.x+330); g.spawnPickup('gold_can', g.player.x-330)}")
    pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(520); pg.screenshot(path='/tmp/shots/mask_fx.png'); pg.wait_for_timeout(200); pg.keyboard.up('ArrowRight')
    pg.keyboard.down('ArrowLeft'); pg.wait_for_timeout(1500); pg.keyboard.up('ArrowLeft')
    print('after pickups', st(pg), hud(pg))
    pg.evaluate("()=>{window.__beast.player.face=1;window.__beast.player.x=300}")
    # kill a bot and drone for HUD counters
    pg.evaluate("()=>{const g=window.__beast; g.spawnEnemy('bots',g.player.x+500); g.spawnEnemy('drones',g.player.x+600)}")
    pg.keyboard.down('Digit1'); pg.wait_for_timeout(3500); pg.keyboard.up('Digit1')
    print('after sprays', st(pg), hud(pg))
    # take damage
    pg.evaluate("()=>{const g=window.__beast; g.enemies=[]; for(let i=0;i<3;i++) g.spawnEnemy('cops', g.player.x+120+i*10)}")
    pg.wait_for_timeout(400)
    print('after cops', st(pg), hud(pg)); pg.screenshot(path='/tmp/shots/hurt.png')
    # REPLAY mid-session
    pg.click('#btn-replay'); pg.wait_for_timeout(300)
    print('after replay', st(pg), hud(pg))
    # die
    for i in range(150):
        pg.evaluate("()=>{const g=window.__beast; g.waveDelay=99; g.player.invuln=0; g.spawnEnemy('cops', g.player.x+90)}")
        pg.wait_for_timeout(120)
        if st(pg)['mode']=='gameover': break
    pg.wait_for_timeout(1500)
    print('gameover', st(pg)); pg.screenshot(path='/tmp/shots/gameover.png')
    pg.click('#btn-restart'); pg.wait_for_timeout(400)
    print('restart', st(pg), hud(pg))
    print('\n'.join(logs))
    b.close()
