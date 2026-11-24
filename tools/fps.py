from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/local/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width':1672,'height':941})
    pg.goto('http://127.0.0.1:8080/'); pg.wait_for_timeout(1000)
    js="""()=>new Promise(r=>{let n=0;const t0=performance.now();function f(){n++;if(performance.now()-t0>2000)r(n/2);else requestAnimationFrame(f)};requestAnimationFrame(f)})"""
    print('menu fps',pg.evaluate(js))
    pg.click('#btn-start', force=True); pg.wait_for_timeout(500)
    print('play fps',pg.evaluate(js))
    print(pg.evaluate("""()=>{const g=window.__beast;const t=performance.now();for(let i=0;i<30;i++){g.update(0.016);g.render()};return (performance.now()-t)/30}"""),'ms per update+render')
    b.close()
