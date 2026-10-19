from playwright.sync_api import sync_playwright
SH='/tmp/claude-0/-home-claude/19e8ce63-7bd3-5da2-9208-5b2a64482f0e/scratchpad/shots/'
errs=[]
def check(c,m):
    print(('PASS ' if c else 'FAIL ')+m); 
    if not c: errs.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(viewport={'width':1400,'height':900}).new_page(); logs=[]
    pg.on('pageerror',lambda e: logs.append(str(e)))
    pg.goto('http://localhost:8765/index.html'); pg.click('[data-m=criar]'); pg.fill('[name=nome]','A'); pg.fill('[name=email]','a@x.com'); pg.fill('[name=pw]','123456'); pg.click('button[type=submit]')
    pg.wait_for_selector('#newc'); pg.click('#newc'); pg.wait_for_selector('.sheet')
    check(pg.locator('#sec-virt').is_hidden() or pg.locator('#sec-virt').count()==1,'seção existe')
    pg.select_option('[data-b="casca"]','anjo')
    check(pg.inner_text('[data-d="pvMax"]')=='45','PV Anjo 45')
    check(pg.inner_text('.pol-pos .polv').startswith('4') and pg.inner_text('.pol-neg .polv').startswith('2'),'polaridade inicial +4/−2')
    check(pg.locator('#sec-virt details.virt').count()==7,'7 Virtudes')
    check('4' in pg.inner_text('.attr:has([data-b="attrs.CAR"]) .eff'),'CAR efetivo 4 mostrado')
    pg.check('[data-b="virt.rep.generosidade"]'); pg.check('[data-b="virt.rep.temperanca"]')
    check('2 representada' in pg.inner_text('#sec-virt').lower(),'conta virtudes representadas')
    pg.locator('details.virt >> nth=1').evaluate('e=>e.open=true')
    btn=pg.locator('[data-act=virtUsar][data-id=transmutar]'); btn.click(); pg.locator('[data-act=virtUsar][data-id=transmutar]').click()
    check(pg.locator('[data-act=virtUsar][data-id=transmutar]').is_disabled(),'Transmutar bloqueado após 2 usos')
    pg.click('[data-act=virtReset][data-por="rotação"]'); check(pg.locator('[data-act=virtUsar][data-id=transmutar]').is_enabled(),'renova na rotação')
    pg.check('[data-b="virt.faltaDeFe"]'); check(pg.locator('#sec-virt .vpow.blocked').count()>=1,'Falta de Fé bloqueia poderes')
    pg.fill('[data-b="rec.pv"]','10'); check(pg.inner_text('[data-d=pbVal]')=='2','Polaridade Bônus 2 com PV 10')
    pg.screenshot(path=SH+'anjo.png',full_page=True)
    print(logs); b.close()
print('FAILS',errs)
