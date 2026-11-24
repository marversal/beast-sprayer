from playwright.sync_api import sync_playwright
js="""()=>{
const g=window.__beast; g.start('bear'); const out=[];
for(let t=0;t<60*180;t++){
  // naive AI: face nearest alive enemy, spray; keep distance
  let best=null,bd=1e9;
  for(const e of g.enemies){ if(e.state!=='alive')continue; const d=Math.abs(e.x-g.player.x); if(d<bd){bd=d;best=e;} }
  g.input.left=g.input.right=false; g.input.spray=false;
  if(best){ const dir=Math.sign(best.x-g.player.x);
    if(g.player.face!==dir){ if(dir>0)g.input.right=true; else g.input.left=true; }
    else { g.input.spray=true; if(bd<200){ if(dir>0)g.input.left=true; else g.input.right=true; g.player.face=dir; g.input.spray=true; } }
  }
  g.update(1/60);
  if(t%(60*20)===0) out.push({t:t/60,wave:g.wave,score:g.score,health:g.health,lives:g.lives,en:g.enemies.length});
  if(g.mode==='gameover'){out.push({over:t/60,score:g.score,wave:g.wave});break;}
}
return JSON.stringify(out)}"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/local/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(); pg.goto('http://127.0.0.1:8080/'); pg.wait_for_timeout(800)
    print(pg.evaluate(js)); b.close()
