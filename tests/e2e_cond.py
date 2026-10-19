from playwright.sync_api import sync_playwright
errs=[]
def check(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: errs.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(viewport={'width':1400,'height':900}).new_page(); logs=[]
    pg.on('pageerror',lambda e: logs.append(str(e)))
    pg.goto('http://localhost:8765/index.html'); pg.click('[data-m=criar]'); pg.fill('[name=nome]','C'); pg.fill('[name=email]','c@x.com'); pg.fill('[name=pw]','123456'); pg.click('button[type=submit]')
    pg.wait_for_selector('#newc'); pg.click('#newc'); pg.wait_for_selector('.sheet')
    check('Anjo' in pg.inner_text('[data-b=casca]') and 'Porcelana' not in pg.inner_text('[data-b=casca]'),'Porcelana não é mais Casca')
    pg.select_option('[data-b=casca]','condenado')
    check('CORPO' in pg.inner_text('#sec-id').upper(),'rótulo "Corpo"')
    pg.select_option('[data-b=raca]','porcelana')
    check(pg.inner_text('[data-d=pvMax]')=='40','Porcelana CON3 → 25+15=40')
    check(pg.inner_text('.pol-neu .polv').startswith('3'),'polaridade neutra 3')
    pg.select_option('[data-b=raca]','sombra')
    check(pg.inner_text('.pol-neg .polv').startswith('3') and pg.inner_text('.pol-neu .polv').startswith('0'),'mutação para Sombra −3')
    check(pg.locator('#sec-rac .trait').count()>=4,'características do Corpo listadas')
    check(pg.locator('#sec-rac .trait.neg').count()==2,'2 pontos negativos marcados')
    check(pg.locator('#sec-virt').is_hidden(),'sem card de Virtudes')
    print(logs); b.close()
print('FAILS',errs)
