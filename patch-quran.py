from pathlib import Path
import re, shutil

p = Path("index.html")
s = p.read_text(encoding="utf-8")

if "window.OMNIX_QURAN" not in Path("quran-data.js").read_text(encoding="utf-8")[:100]:
    raise SystemExit("Quran data file is invalid")

if "OMNIX_SURAH_NAMES" not in s:
    s = s.replace(
        "<script>",
        '<script src="./quran-data.js"></script>\n'
        '<script src="./quran-names.js"></script>\n<script>',
        1
    )

new_quran = r'''
function quran(){
 const names=window.OMNIX_SURAH_NAMES;
 return `<div class="panel">
 <h3>${en?'The Holy Quran':'القرآن الكريم'}</h3>
 <p>${en?'114 Surahs · Works offline':'114 سورة · يعمل دون إنترنت'}</p>
 <input id="surahSearch" placeholder="${en?'Search Surah':'ابحث عن سورة'}" oninput="filterSurahs()">
 <div id="surahList" class="grid" style="grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:10px">
 ${names.map((name,i)=>`<button class="secondary" onclick="openSurah(${i+1})">${i+1}. ${name}</button>`).join('')}
 </div></div>
 <div class="panel"><h3>${en?'Memorization':'متابعة الحفظ'}</h3>
 <p>${en?'Your review marks are saved on this device.':'علامات المراجعة محفوظة على جهازك.'}</p>
 <div class="status">${names.filter((_,i)=>get('quranDone_'+(i+1))==='yes').length} / 114 ${en?'Surahs reviewed':'سورة تمت مراجعتها'}</div>
 </div>`;
}

function filterSurahs(){
 const q=$('surahSearch').value.trim().toLowerCase();
 const names=window.OMNIX_SURAH_NAMES;
 $('surahList').innerHTML=names.map((name,i)=>({name,i}))
 .filter(x=>(x.name+' '+(x.i+1)).toLowerCase().includes(q))
 .map(x=>`<button class="secondary" onclick="openSurah(${x.i+1})">${x.i+1}. ${x.name}</button>`).join('');
}

function openSurah(n){
 const names=window.OMNIX_SURAH_NAMES;
 const surah=window.OMNIX_QURAN[n-1];
 if(!surah)return showToast('تعذر فتح السورة');
 const done=get('quranDone_'+n)==='yes';
 $('content').innerHTML=`
 <div class="panel">
 <button class="secondary" onclick="$('content').innerHTML=quran()">← ${en?'Surah list':'قائمة السور'}</button>
 <h2 style="text-align:center">${names[n-1]}</h2>
 <p style="text-align:center">${en?'Surah number':'رقم السورة'} ${n} · ${surah.ayahs.length} ${en?'Ayahs':'آية'}</p>
 <div class="ayahs" style="font-size:22px;line-height:2.2;text-align:center">
 ${surah.ayahs.map(a=>`${escapeHtml(a.text)} <span style="color:var(--copper)">۞${a.number}</span>`).join(' ')}
 </div></div>
 <div class="panel">
 <label><input type="checkbox" ${done?'checked':''}
 onchange="set('quranDone_${n}',this.checked?'yes':'no');showToast(this.checked?'تم حفظ المراجعة':'تم إلغاء المراجعة')">
 ${en?'I reviewed this Surah':'أتممت مراجعة هذه السورة'}</label>
 </div>`;
 window.scrollTo(0,0);
}
'''

pattern = r'function quran\(\)\{.*?\nfunction quranStatus\(\)\{.*?\}'
s2, count = re.subn(pattern, new_quran, s, count=1, flags=re.S)

if count != 1:
    raise SystemExit("Could not safely locate Quran functions. No changes saved.")

s2 = s2.replace("renderHome();", "renderHome();", 1)
p.write_text(s2, encoding="utf-8")

shutil.copy2("index.html", "www/index.html")
shutil.copy2("quran-names.js", "www/quran-names.js")
print("QURAN UI PATCHED")
