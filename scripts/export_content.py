import json,os,requests,re
U="https://yymdypgktyttlhschtcu.supabase.co/rest/v1"
K=os.environ["SUPABASE_SERVICE_ROLE_KEY"]
S=requests.Session();S.headers.update({"apikey":K,"Authorization":"Bearer "+K})
base="content-backup"
secs=S.get(f"{U}/sections?select=id,name,order_index&order=order_index").json()
if not isinstance(secs,list): print(secs); raise SystemExit
print("sections",len(secs))
for s in secs:
    units=S.get(f"{U}/units?select=id,title,description,order_index&section_id=eq.{s['id']}&order=order_index").json()
    out={"level":s["name"],"units":[]}
    for u in units:
        cs=S.get(f"{U}/unit_contents?select=content_type,title,body,order_index,data&unit_id=eq.{u['id']}&order=order_index").json()
        out["units"].append({"title":u["title"],"description":u["description"],"order_index":u["order_index"],"contents":cs})
    json.dump(out,open(f"{base}/content/{s['name']}.json","w"),ensure_ascii=False,indent=1)
    print(s["name"],len(units))
voc=[]
off=0
while True:
    b=S.get(f"{U}/vocabulary?select=*&order=id&offset={off}&limit=1000").json()
    if not b:break
    voc+=b;off+=1000
    if len(b)<1000:break
os.makedirs(f"{base}/vocabulary",exist_ok=True)
json.dump(voc,open(f"{base}/vocabulary/all.json","w"),ensure_ascii=False,indent=1)
print("vocab",len(voc))
