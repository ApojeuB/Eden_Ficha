import sys, json, re
from playwright.sync_api import sync_playwright
SH='/tmp/claude-0/-home-claude/19e8ce63-7bd3-5da2-9208-5b2a64482f0e/scratchpad/shots/'
URL='http://localhost:8765/index.html'
errs=[]
def check(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: errs.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome') if False else p.chromium.launch()
    ctx=b.new_context(viewport={'width':1400,'height':900})
    pg=ctx.new_page()
    logs=[]; pg.on('console',lambda m: logs.append(m.text) if m.type in('error',) else None); pg.on('pageerror',lambda e: logs.append('PAGEERR '+str(e)))
    pg.goto(URL); pg.wait_for_selector('.auth-card')
    # criar conta jogador
    pg.click('[data-m=criar]'); pg.fill('[name=nome]','Ana'); pg.fill('[name=email]','ana@x.com'); pg.fill('[name=pw]','123456'); pg.click('button[type=submit]')
    pg.wait_for_selector('#newc'); check(True,'login/criar conta')
    pg.click('#newc'); pg.wait_for_selector('.sheet')
    pg.fill('[data-b="c.nome"]','Kael'); 
    pg.select_option('[data-b="casca"]','anjo')
    check(pg.inner_text('[data-d="pvMax"]')=='45','PV Anjo CON1 = 40+5 =45 (got %s)'%pg.inner_text('[data-d="pvMax"]'))
    pg.fill('[data-b="attrs.CON"]','3'); 
    check(pg.inner_text('[data-d="pvMax"]')=='55','PV max auto 55 (got %s)'%pg.inner_text('[data-d="pvMax"]'))
    check(pg.input_value('[data-b="rec.pv"]')=='55','PV atual acompanha máx quando cheio')
    pg.fill('[data-b="attrs.DES"]','3'); check(pg.inner_text('[data-d="evasao"]')=='10','Evasão 10+DES (Anjo DES 3−4 → 0)')
    check(pg.inner_text('[data-d="paMax"]')=='8','PA 8 (DES efetivo 0 do Anjo)')
    pg.screenshot(path=SH+'sheet_desktop.png',full_page=True)
    # arquivo
    pg.click('[data-act=toggleArq]'); pg.wait_for_selector('#arqPanel')
    check(not pg.is_visible('.attrs'),'atributos escondidos no modo arquivo')
    check(pg.locator('.slot').count()==2,'nível 1 → 2 espaços')
    pg.click('[data-act=arqAdd][data-k=FOR]'); pg.click('[data-act=arqAdd][data-k=DES]')
    check(pg.locator('.slot.full').count()==2,'2 pontos arquivados')
    check(pg.locator('[data-act=arqAdd]').first.is_disabled(),'botões desativados quando cheio')
    pg.screenshot(path=SH+'arquivo.png')
    # subir nível → 3 espaços
    pg.click('[data-act=toggleArq]'); pg.fill('#sec-id [data-b="c.nivel"]','2'); pg.press('#sec-id [data-b="c.nivel"]','Tab')
    pg.click('[data-act=toggleArq]'); check(pg.locator('.slot').count()==3,'nível 2 → 3 espaços')
    pg.click('[data-act=arqAdd][data-k=CON]'); check(pg.locator('.slot.full').count()==3,'3º ponto')
    # consolidar FOR
    pg.click('.slot.full >> nth=0'); pg.click('[data-act=consolidar]')
    check(pg.locator('.slot.full').count()==2,'consolidado libera espaço')
    pg.click('[data-act=toggleArq]'); check(pg.input_value('[data-b="attrs.FOR"]')=='2','FOR 1→2')
    # voltar nível 1 com 2 pontos: ok; polaridade
    pg.click('[data-act=polSet][data-k=pos][data-n="6"]'); pg.click('[data-act=polSet][data-k=neg][data-n="4"]')
    pg.select_option('#polT','pos'); pg.fill('#polQ','3'); pg.click('[data-act=polGastar]')
    check(pg.inner_text('.pol-pos .polv').startswith('3') and pg.inner_text('.pol-neg .polv').startswith('7'),'polaridade: gastar +3 → +3 | −7')
    # ordem − n +
    order=pg.eval_on_selector_all('.pol','els=>els.map(e=>e.className)')
    check('pol-neg' in order[0] and 'pol-neu' in order[1] and 'pol-pos' in order[2],'ordem − n +')
    # insanidade
    pg.click('[data-act=step][data-path="surv.insan"][data-d="1"]')
    for _ in range(4): pg.click('[data-act=step][data-path="surv.insan"][data-d="1"]')
    check(pg.inner_text('[data-d=insanLim]')=='10','insanidade 5 → limite 10 e condição psicológica')
    check(pg.locator('.psi').count()==1,'condição psicológica criada')
    # fome severa → penalidade
    pg.fill('[data-b="surv.fome"]','8'); pg.press('[data-b="surv.fome"]','Tab')
    check('Fome' in pg.inner_text('#penBox'),'penalidade de fome listada')
    # morte
    pg.check('[data-b="c.morto"]'); check(pg.is_visible('#deadbar'),'barra de morte'); 
    check(pg.input_value('[data-b="c.data_morte"]')!='','data da morte preenchida')
    check('h' in pg.inner_text('[data-d=almaTxt]'),'tempo restante da alma')
    # rolagem
    pg.click('[data-act=rollApt][data-n=Luta]'); pg.wait_for_selector('dialog.roller'); pg.click('#rlGo'); check(pg.locator('.die').count()>=1,'rolagem funciona')
    pg.screenshot(path=SH+'roller.png'); pg.keyboard.press('Escape')
    # foto (portrait)
    from PIL import Image
    Image.new('RGB',(900,1200),(120,60,60)).save('/tmp/claude-0/-home-claude/19e8ce63-7bd3-5da2-9208-5b2a64482f0e/scratchpad/t.png')
    with pg.expect_file_chooser() as fc: pg.click('[data-act=photo]')
    fc.value.set_files('/tmp/claude-0/-home-claude/19e8ce63-7bd3-5da2-9208-5b2a64482f0e/scratchpad/t.png'); pg.wait_for_selector('.photo img')
    check(True,'foto do personagem')
    with pg.expect_file_chooser() as fc: pg.click('[data-act=addImg]')
    fc.value.set_files('/tmp/claude-0/-home-claude/19e8ce63-7bd3-5da2-9208-5b2a64482f0e/scratchpad/t.png'); pg.wait_for_selector('.gal img')
    check(True,'galeria')
    pg.fill('[data-b="manifest.0.nome"]','Lança de Éter'); pg.click('[data-act=manPol][data-i="0"][data-k=neg]')
    pg.fill('[data-b="ataques.0.nome"]','Soco'); pg.fill('[data-b="ataques.0.teste"]','FOR+Luta'); pg.press('[data-b="ataques.0.teste"]','Tab')
    check(pg.locator('[data-act=rollAtk]').count()==1,'botão de rolagem do ataque')
    pg.wait_for_timeout(1200)
    pg.reload(); pg.wait_for_selector('.sheet')
    check(pg.input_value('[data-b="c.nome"]')=='Kael' and pg.input_value('[data-b="manifest.0.nome"]')=='Lança de Éter','persistência após recarregar')
    check(pg.inner_text('[data-d="pvMax"]')=='55','PV persistido/recalculado')
    pg.screenshot(path=SH+'sheet_full.png',full_page=True)
    # colocar em sala: criar mestre em outro contexto compartilha localStorage? contexto separado → usar mesmo contexto
    pg.click('[data-act=back]'); pg.wait_for_selector('#newc')
    pg.click('a[href="#/salas"]'); pg.fill('#fcr [name=n]','Mesa do Vale'); pg.click('#fcr button'); pg.wait_for_selector('.code b')
    code=pg.inner_text('#code'); check(len(code)==6,'sala criada, código '+code)
    pg.click('#out'); pg.wait_for_selector('.auth-card')
    # jogador 2 (Bia) entra
    pg.click('[data-m=criar]'); pg.fill('[name=nome]','Bia'); pg.fill('[name=email]','bia@x.com'); pg.fill('[name=pw]','123456'); pg.click('button[type=submit]'); pg.wait_for_selector('#newc')
    pg.click('#newc'); pg.wait_for_selector('.sheet'); pg.fill('[data-b="c.nome"]','Lis'); pg.wait_for_timeout(1000); pg.click('[data-act=back]'); pg.wait_for_selector('#newc')
    pg.click('a[href="#/salas"]'); pg.fill('#fjn [name=c]',code); pg.click('#fjn button'); pg.wait_for_selector('#place')
    pg.click('#placeBtn'); pg.wait_for_selector('[data-unplace]'); check(True,'jogador colocou ficha na sala')
    pg.click('#out'); pg.wait_for_selector('.auth-card')
    # Mestre (Ana) entra: ela tem a ficha Kael — mas Kael não está na sala; entra e coloca
    pg.fill('[name=email]','ana@x.com'); pg.fill('[name=pw]','123456'); pg.click('button[type=submit]'); pg.wait_for_selector('#newc')
    pg.click('a[href="#/salas"]'); pg.click('.room'); pg.wait_for_selector('.gm-grid')
    check(pg.locator('.gmc').count()==1 and 'Lis' in pg.inner_text('.gmc'),'Mestre vê a ficha do jogador na sala')
    pg.click('[data-give]'); pg.select_option('#gA','FOR'); pg.fill('#gF','50'); pg.click('#gOk'); pg.wait_for_timeout(500)
    check('FOR' in pg.inner_text('.gmc'),'Mestre concedeu ponto arquivado')
    pg.click('[data-give]'); pg.select_option('#gA','DES'); pg.click('#gOk'); pg.wait_for_timeout(300)
    pg.click('[data-give]'); pg.select_option('#gA','CON'); pg.click('#gOk'); pg.wait_for_timeout(300)
    check('Limite' in pg.inner_text('#gE') or 'limite' in pg.inner_text('#gE').lower(),'Mestre bloqueado pelo limite do nível 1 (2 espaços): '+pg.inner_text('#gE')[:60])
    pg.screenshot(path=SH+'gm.png',full_page=True); pg.keyboard.press('Escape')
    pg.click('.gmc-top'); pg.wait_for_selector('.sheet'); check('mestre' in pg.inner_text('.sheet-bar').lower(),'Mestre abre/edita a ficha')
    pg.screenshot(path=SH+'gm_sheet.png')
    # mobile
    m=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True); mp=m.new_page()
    mp.goto(URL); mp.wait_for_selector('.auth-card'); mp.screenshot(path=SH+'m_login.png')
    mp.click('[data-m=criar]'); mp.fill('[name=nome]','Mob'); mp.fill('[name=email]','m@x.com'); mp.fill('[name=pw]','123456'); mp.click('button[type=submit]'); mp.wait_for_selector('#newc'); mp.click('#newc'); mp.wait_for_selector('.sheet')
    mp.fill('[data-b="c.nome"]','Móvel'); mp.screenshot(path=SH+'m_sheet.png',full_page=True)
    ov=mp.evaluate('document.documentElement.scrollWidth>window.innerWidth'); check(not ov,'sem rolagem horizontal no celular')
    mp.click('[data-act=toggleArq]'); mp.screenshot(path=SH+'m_arq.png')
    print('console errors:',logs)
    b.close()
print('FAILS:',errs); sys.exit(1 if errs else 0)
