import json, urllib.parse as up
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
F='/usr/share/fonts/truetype/dejavu/'
pdfmetrics.registerFont(TTFont('S',F+'DejaVuSans.ttf'));pdfmetrics.registerFont(TTFont('SB',F+'DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('M',F+'DejaVuSansMono.ttf'));pdfmetrics.registerFont(TTFont('MB',F+'DejaVuSansMono-Bold.ttf'))
from reportlab.lib.fonts import addMapping
addMapping('S',0,0,'S');addMapping('S',1,0,'SB');addMapping('S',0,1,'S');addMapping('S',1,1,'SB')
D=json.load(open('src/data.json'));P=D['P'];DAYS=D['DAYS'];CATS=D['CATS']
NIGHT='#130f22';PANEL='#1d1733';SAND='#f3e7d3';MUTED='#a89cc8';PINK='#ff4fa3';CYAN='#3fe0e8';AMBER='#ffb547';GO='#5ee39a'
CITY={'lv':PINK,'la':CYAN,'az':AMBER}
W,H=360,780
def bg(c,doc):
    c.saveState();c.setFillColor(HexColor(NIGHT));c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(HexColor(MUTED));c.setFont('M',7);c.drawString(18,14,"Sai's Vegas & LA Trip · Oct 24–31, 2026");c.drawRightString(W-18,14,str(doc.page));c.restoreState()
doc=BaseDocTemplate('exports/Sai-Vegas-LA-Trip-Guide.pdf',pagesize=(W,H),leftMargin=18,rightMargin=18,topMargin=22,bottomMargin=28,title="Sai's Vegas & LA Trip",author='Claude')
doc.addPageTemplates([PageTemplate(frames=[Frame(18,28,W-36,H-50,id='f',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=bg)])
def st(n,**k):
    b=dict(fontName='S',fontSize=10,leading=14,textColor=HexColor(SAND));b.update(k);return ParagraphStyle(n,**b)
T=st('t',fontName='SB',fontSize=24,leading=28,textColor=HexColor(PINK))
H1=st('h1',fontName='SB',fontSize=17,leading=21)
H2=st('h2',fontName='SB',fontSize=12.5,leading=16,spaceBefore=8,spaceAfter=4)
B=st('b');SM=st('sm',fontSize=8.5,leading=11.5,textColor=HexColor(MUTED))
EY=st('ey',fontName='M',fontSize=8,leading=11,textColor=HexColor(MUTED))
TM=st('tm',fontName='MB',fontSize=9,leading=13,textColor=HexColor(AMBER))
def esc(s):return str(s).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
def links(p):
    ll=f"{p['lat']},{p['lng']}"
    g='https://www.google.com/maps/search/?api=1&query='+up.quote(p['q'])
    d=f'https://www.google.com/maps/dir/?api=1&destination={ll}&travelmode=transit'
    a=f'https://maps.apple.com/?daddr={ll}&dirflg=r'
    e='https://earth.google.com/web/search/'+up.quote(p['q'])
    c=lambda h,t,col:f'<a href="{h}" color="{col}"><u>{t}</u></a>'
    return f"{c(g,'Map',CYAN)}  ·  {c(d,'Directions',CYAN)}  ·  {c(a,'Apple Maps',CYAN)}  ·  {c(e,'3D',AMBER)}"
def box(flow,col=PANEL,line=None):
    t=Table([[flow]],colWidths=[W-36])
    s=[('BACKGROUND',(0,0),(-1,-1),HexColor(col)),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('ROUNDEDCORNERS',[8,8,8,8])]
    if line:s.append(('LINEBEFORE',(0,0),(0,-1),3,HexColor(line)))
    t.setStyle(TableStyle(s));return t
S=[]
# Cover
S+= [Paragraph('OCT 24 – 31, 2026 · NO CAR',EY),Spacer(1,6),Paragraph('Neon, Pacific<br/>&amp; the Canyon',T),Spacer(1,8),
 Paragraph('Your full plan, built around your free hours. Tap any <font color="%s">blue link</font> to open that place in Google Maps or Apple Maps, or <font color="%s">3D</font> to fly over it in Google Earth.'%(CYAN,AMBER),B),Spacer(1,12),
 Paragraph('Hotels',H2)]
for k in ['circus','fontainebleau','westgate']:
    p=P[k];S.append(box([Paragraph(f"<b>{esc(p['n'])}</b>",B),Paragraph(esc(p['see'][0]),SM),Paragraph(links(p),SM)]));S.append(Spacer(1,5))
S.append(Paragraph('When you are free',H2))
rows=[[Paragraph(f"<b>{d['short']}</b>",B),Paragraph(esc(d['win']),st('w',fontSize=9,textColor=HexColor(GO))),Paragraph(esc(d['title']),SM)] for d in DAYS]
t=Table(rows,colWidths=[52,110,W-36-162]);t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-2),0.4,HexColor('#3a3160')),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),('LEFTPADDING',(0,0),(-1,-1),2)]))
S+=[t,PageBreak()]
# Days
for d in DAYS:
    col=CITY[d['city']]
    S+=[Paragraph(f"{d['short'].upper()} · {'LOS ANGELES' if d['city']=='la' else 'ARIZONA + VEGAS' if d['city']=='az' else 'LAS VEGAS'}",st('e2',fontName='MB',fontSize=8.5,textColor=HexColor(col))),Spacer(1,3),Paragraph(esc(d['title']),H1),Spacer(1,3),
        Paragraph(esc(d['win']),st('w2',fontName='MB',fontSize=9,textColor=HexColor(GO))),Spacer(1,8)]
    seen=set()
    for s in d['steps']:
        tm,pid,txt,how=s[0],s[1],s[2],s[3];cab=len(s)>4 and s[4];bk=len(s)>5 and s[5]
        tags=(' <font color="%s" name="MB" size="7.5">CAB</font>'%AMBER if cab else '')+(' <font color="%s" name="MB" size="7.5">BOOK</font>'%PINK if bk else '')
        inner=[Paragraph(esc(txt)+tags,B)]
        if how:inner.append(Paragraph(esc(how),SM))
        if pid and pid in P and not P[pid].get('goto'):
            p=P[pid];inner.append(Paragraph(f"<b>{esc(p['n'])}</b>",st('pn',fontSize=9,textColor=HexColor(col))))
            if pid not in seen:
                inner.append(Paragraph('• '+'<br/>• '.join(esc(x) for x in p['see']),SM))
                inner.append(Paragraph('<b>Tip:</b> '+esc(p['tip']),SM))
            inner.append(Paragraph(links(p),SM));seen.add(pid)
        row=Table([[Paragraph(esc(tm),TM),inner]],colWidths=[52,W-36-52-20])
        row.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0)]))
        S+=[KeepTogether(box(row,line=col)),Spacer(1,6)]
    S.append(PageBreak())
# Universal
S+=[Paragraph('SUN OCT 25 · OPEN 8 AM – 6 PM',st('e3',fontName='MB',fontSize=8.5,textColor=HexColor(CYAN))),Spacer(1,3),Paragraph('Universal, no scary rides',H1),Spacer(1,6),
 Paragraph('Be inside by about 9:20 and leave by 3:00 so Hollywood and the sunset still fit. The park closes at 6 PM for Halloween Horror Nights, a separate scare event.',B),Paragraph('Your route',H2)]
for tm,tx in [('9:20','<b>Studio Tour first.</b> ~60-min tram through real backlots; small staged surprises, no drops or spins.'),('10:30','<b>Secret Life of Pets: Off the Leash.</b> Gentle dark ride.'),('11:00','<b>Wizarding World.</b> Hogsmeade, Ollivanders wand show, Hogwarts photos, Butterbeer.'),('12:15','<b>Lunch</b> at Three Broomsticks or Krusty Burger. WaterWorld show if a time fits.'),('1:15','<b>Starway escalators</b> down to the Lower Lot.'),('1:30','<b>Super Nintendo World.</b> Mario Kart: Bowser\'s Challenge (no drops), Power-Up Band games.'),('2:30','<b>Kung Fu Panda Adventure,</b> then out through Springfield.'),('3:00','<b>Exit</b> to Universal City/Studio City station.')]:
    r=Table([[Paragraph(tm,TM),Paragraph(tx,B)]],colWidths=[44,W-36-44]);r.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),5)]));S.append(r)
S.append(Paragraph('Ride guide for you',H2))
VC={'go':GO,'maybe':'#ffd166','skip':'#ff6b6b'}
for v,n,dsc in D['RIDES']:
    r=Table([[Paragraph(f'<font name="MB" color="{VC[v]}">{v.upper()}</font>',st('v',fontSize=8.5)),[Paragraph(f'<b>{esc(n)}</b>',B),Paragraph(esc(dsc),SM)]]],colWidths=[44,W-36-44])
    r.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),5)]));S.append(r)
S.append(PageBreak())
# LA + AZ
S+=[Paragraph('Santa Monica sunset: yes, go',H1),Spacer(1,6),box([Paragraph('Sunset is about 6:05 PM straight over the Pacific. The pier lights and Ferris wheel switch on as the sky turns orange. Get there by 5:30 to walk the pier first.',B)],line=AMBER),Paragraph('More in LA',H2)]
for h,p,m in D['LACARDS']:S+=[box([Paragraph(f'<b>{esc(h)}</b>  <font color="{MUTED}" size="8">{esc(m)}</font>',B),Paragraph(esc(p),SM)]),Spacer(1,5)]
S+=[Paragraph('Arizona day · Sat Oct 31',H2)]
for h,p,m in D['AZCARDS']:S+=[box([Paragraph(f'<b>{esc(h)}</b>  <font color="{MUTED}" size="8">{esc(m)}</font>',B),Paragraph(esc(p),SM)]),Spacer(1,5)]
S.append(PageBreak())
# Transit + book
S+=[Paragraph('Getting around',H1),Spacer(1,6)]
for h,p in [('The Deuce bus · Vegas','Whole Strip to Fremont Street, 24 hours. $8 for 24 hours, $20 for 3 days, in the rideRTC app.'),('Las Vegas Monorail','Sahara to MGM Grand, with a stop at Westgate. 24-hour pass $15. Mon until midnight, Tue–Thu until 2 AM, Fri–Sun until 3 AM.'),('LA Metro','B Line: Union Station → Hollywood/Highland → Universal City. E Line: 7th St/Metro → Downtown Santa Monica. Tap your phone wallet or a TAP card.'),('Only 4 cab rides','Airport → Circus Circus · Hollywood → Santa Monica · Seven Magic Mountains (driver waits) · Westgate → airport.')]:
    S+=[box([Paragraph(f'<b>{h}</b>',B),Paragraph(p,SM)]),Spacer(1,5)]
S+=[Paragraph('Book this week',H2)]
for x in ['Grand Canyon West + Hoover Dam tour with Skywalk; confirm pickup 48 hours ahead','The Wizard of Oz at Sphere, Fri Oct 30, 3–4 PM showing','High Roller night ticket, Tue Oct 27','rideRTC and Monorail passes on your phone','Check exactly where your LA bus leaves and arrives']:
    S.append(Paragraph(f'<font color="{AMBER}">☐</font>  {x}',st('c',leading=17)))
S.append(PageBreak())
# Index
S+=[Paragraph('Every place',H1),Spacer(1,6)]
for k,p in P.items():
    if p.get('goto'):continue
    S+=[KeepTogether(box([Paragraph(f"<b>{esc(p['n'])}</b>  <font color='{MUTED}' size='8'>{CATS[p['cat']][0]}</font>",B),Paragraph(links(p),SM)])),Spacer(1,4)]
doc.build(S)
