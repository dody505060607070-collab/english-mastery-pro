import json,os,requests,uuid
URL=os.environ['SUPABASE_URL'].rstrip('/')+'/rest/v1'
K=os.environ['SUPABASE_SERVICE_ROLE_KEY']
S=requests.Session(); S.headers.update({'apikey':K,'Authorization':'Bearer '+K,'Content-Type':'application/json','Prefer':'return=minimal'})
base='/dev-server/content-backup'
levels=["A1.1","A1.2","A2.1","A2.2","B1.1","B1.2","B2.1","B2.2","C1.1","C1.2","C2.1","C2.2"]
TMAP={'multiple_choice':'mcq','true_false':'truefalse','text':'text','fill_blank':'fill','fill':'fill','matching':'match','ordering':'order'}
def conv(qs):
    out=[]
    for q in qs or []:
        t=TMAP.get(q.get('question_type') or q.get('type') or 'text','text')
        ans=q.get('correct_answer')
        if t=='truefalse': ans=str(ans).strip().lower()
        it={'id':str(uuid.uuid4()),'type':t,'prompt':q.get('question_text') or q.get('prompt') or '','points':1}
        if q.get('options'): it['options']=q['options']
        if ans not in (None,''): it['answer']=ans
        if q.get('explanation'): it['explanation']=q['explanation']
        out.append(it)
    return out
def chk(r):
    if r.status_code>=300: raise SystemExit((r.status_code,r.text[:400]))
for lv in levels:
    sid=S.get(f'{URL}/sections?select=id&name=eq.{lv}').json()[0]['id']
    units={u['order_index']:u['id'] for u in S.get(f'{URL}/units?select=id,order_index&section_id=eq.{sid}').json()}
    d=json.load(open(f'{base}/content/{lv}.json'))
    dar=json.load(open(f'{base}/content-ar/{lv}.json'))
    arunits={x['order_index']:x for x in dar['units']}
    for u in d['units']:
        uid=units.get(u['order_index'])
        if not uid: continue
        chk(S.patch(f'{URL}/units?id=eq.{uid}',json={'title':u['title'],'description':u.get('description'),'is_published':True,'is_active':True}))
        rows=S.get(f'{URL}/unit_contents?select=id,content_type,data&unit_id=eq.{uid}').json()
        for r in rows:
            src=next((c for c in u['contents'] if c['content_type']==r['content_type']),None)
            if not src: continue
            data=dict(r.get('data') or {})
            au=arunits.get(u['order_index']) or {}
            asrc=next((c for c in (au.get('contents') or []) if c['content_type']==r['content_type']),None)
            if asrc:
                data['ar_title']=asrc.get('title'); data['ar_body']=asrc.get('body')
            sd=src.get('data') or {}
            if 'questions' in sd: data['questions']=conv(sd['questions'])
            if r['content_type']=='listening':
                if sd.get('tts_text'): data['tts_text']=sd['tts_text']
                if sd.get('accent'): data['accent']=sd['accent']
                data['transcript']=src.get('body')
            chk(S.patch(f"{URL}/unit_contents?id=eq.{r['id']}",json={'title':src['title'],'body':src.get('body'),'data':data}))
    print(lv,'ok',flush=True)
