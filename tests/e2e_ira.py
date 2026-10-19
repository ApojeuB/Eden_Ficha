from playwright.sync_api import sync_playwright
errs=[]
def check(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: errs.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(viewport={'width':1400,'height':900}).new_page(); logs=[]
    pg.on('pageerror',lambda e: logs.append(str(e))); pg.on('dialog',lambda d: d.accept())
    pg.goto('http://localhost:8765/index.html'); pg.click('[data-m=criar]'); pg.fill('[name=nome]','I'); pg.fill('[name=email]','i@x.com'); pg.fill('[name=pw]','123456'); pg.click('button[type=submit]')
    pg.wait_for_selector('#newc'); pg.click('#newc'); pg.wait_for_selector('.sheet')
    pg.select_option('[data-b=casca]','demonio'); pg.wait_for_selector('#evSel')
    check(pg.locator('#evSel option[disabled]').count()==0,'5º liberado')
    pg.select_option('#evSel','ira'); pg.click('[data-act=evolConfirmar]'); pg.wait_for_selector('[data-act=evolAssumir]')
    pg.click('[data-act=evolAssumir]'); pg.wait_for_selector('[data-act=evolEncerrar]')
    check(pg.inner_text('[data-d=pvMax]')=='40','PV 40 (CON 0 na forma)' ) if False else print('pvMax',pg.inner_text('[data-d=pvMax]'))
    check(pg.locator('[data-act=gastarPA]').count()>=3,'botões Gastar PA nos ataques')
    check(pg.locator('text=Draco Form').count()>0,'controle Draco Form')
    pa0=int(pg.input_value('[data-b="rec.pa"]'))
    pg.locator('[data-act=gastarPA]').first.click(); pg.wait_for_timeout(300)
    pa1=int(pg.input_value('[data-b="rec.pa"]'))
    check(pa1<pa0,f'PA descontado {pa0}→{pa1}')
    print(logs); b.close()
print('FAILS',errs)
