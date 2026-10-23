const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
const js=s.slice(s.indexOf('const CATS='),s.indexOf('const RIDES='));
const {P,DAYS,CATS}=new Function(js+';return {P,DAYS,CATS}')();
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const colors={lv:'ff4fa3',la:'3fe0e8',az:'ffb547'};
const kmlc=h=>'ff'+h.slice(4,6)+h.slice(2,4)+h.slice(0,2);
let styles='';for(const c of Object.values(colors))styles+=`<Style id="s${c}"><IconStyle><color>${kmlc(c)}</color><scale>1.2</scale><Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon></IconStyle></Style>`;
styles+=`<Style id="sx"><IconStyle><color>ffc8a8a8</color><Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon></IconStyle></Style>`;
const used=new Set();let folders='';
for(const d of DAYS){
  const c=colors[d.city];let pm='';const seen=new Set();let n=0;
  for(const st of d.steps){const id=st[1];if(!id||seen.has(id)||P[id].v==='trip'&&P[id].goto)continue;seen.add(id);used.add(id);n++;
    const p=P[id];const lines=d.steps.filter(x=>x[1]===id).map(x=>`${x[0]} — ${x[2]}`);
    const desc=`<b>${esc(d.short)}: ${esc(d.title)}</b><br>${lines.map(esc).join('<br>')}<br><br><b>See:</b><br>• ${p.see.map(esc).join('<br>• ')}${p.how?`<br><br><b>Get there:</b> ${esc(p.how)}`:''}<br><br><b>Tip:</b> ${esc(p.tip)}`;
    pm+=`<Placemark><name>${n}. ${esc(p.n)}</name><description><![CDATA[${desc}]]></description><styleUrl>#s${c}</styleUrl><Point><coordinates>${p.lng},${p.lat},0</coordinates></Point></Placemark>`;}
  folders+=`<Folder><name>${esc(d.short)} · ${esc(d.title)}</name><description>${esc(d.win)}</description>${pm}</Folder>`;
}
let ex='';for(const [id,p] of Object.entries(P)){if(used.has(id)||p.goto)continue;
  ex+=`<Placemark><name>${esc(p.n)}</name><description><![CDATA[<b>See:</b><br>• ${p.see.map(esc).join('<br>• ')}<br><br><b>Get there:</b> ${esc(p.how)}<br><br><b>Tip:</b> ${esc(p.tip)}]]></description><styleUrl>#sx</styleUrl><Point><coordinates>${p.lng},${p.lat},0</coordinates></Point></Placemark>`;}
folders+=`<Folder><name>Extras · if time</name>${ex}</Folder>`;
fs.writeFileSync('Sai-Vegas-LA-Trip.kml',`<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Sai's Vegas &amp; LA Trip</name>${styles}${folders}</Document></kml>`);
console.log(DAYS.length+1,'layers', used.size,'places');
