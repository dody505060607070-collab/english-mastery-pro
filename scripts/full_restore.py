"""Full restore into an empty backend: sections + units + unit_contents + vocabulary.

Usage: python3 scripts/full_restore.py   (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
Idempotent-ish: skips levels that already have units.
"""
import json, os, uuid, requests

URL = os.environ['SUPABASE_URL'].rstrip('/') + '/rest/v1'
K = os.environ['SUPABASE_SERVICE_ROLE_KEY']
S = requests.Session()
S.headers.update({'apikey': K, 'Authorization': 'Bearer ' + K,
                  'Content-Type': 'application/json', 'Prefer': 'return=representation'})
base = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'content-backup')
levels = ["A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2", "B2.1", "B2.2", "C1.1", "C1.2", "C2.1", "C2.2"]
TMAP = {'multiple_choice': 'mcq', 'true_false': 'truefalse', 'text': 'text',
        'fill_blank': 'fill', 'fill': 'fill', 'matching': 'match', 'ordering': 'order'}


def chk(r):
    if r.status_code >= 300:
        raise SystemExit((r.status_code, r.text[:500]))
    return r


def conv(qs):
    out = []
    for q in qs or []:
        t = TMAP.get(q.get('question_type') or q.get('type') or 'text', 'text')
        ans = q.get('correct_answer')
        if t == 'truefalse':
            ans = str(ans).strip().lower()
        it = {'id': str(uuid.uuid4()), 'type': t,
              'prompt': q.get('question_text') or q.get('prompt') or '', 'points': 1}
        if q.get('options'):
            it['options'] = q['options']
        if ans not in (None, ''):
            it['answer'] = ans
        if q.get('explanation'):
            it['explanation'] = q['explanation']
        out.append(it)
    return out


for li, lv in enumerate(levels):
    got = S.get(f'{URL}/sections?select=id&name=eq.{lv}').json()
    if got:
        sid = got[0]['id']
    else:
        sid = chk(S.post(f'{URL}/sections', json={
            'name': lv, 'description': f'CEFR level {lv}', 'order_index': li + 1,
            'is_visible': True, 'is_locked': False})).json()[0]['id']

    if S.get(f'{URL}/units?select=id&section_id=eq.{sid}&limit=1').json():
        print(lv, 'skip (units exist)', flush=True)
        continue

    d = json.load(open(f'{base}/content/{lv}.json'))
    try:
        arunits = {x['order_index']: x for x in json.load(open(f'{base}/content-ar/{lv}.json'))['units']}
    except Exception:
        arunits = {}

    for u in d['units']:
        uid = chk(S.post(f'{URL}/units', json={
            'section_id': sid, 'title': u['title'], 'description': u.get('description'),
            'order_index': u['order_index'], 'is_active': True, 'is_published': True})).json()[0]['id']
        au = arunits.get(u['order_index']) or {}
        rows = []
        for c in u['contents']:
            data = dict(c.get('data') or {})
            asrc = next((x for x in (au.get('contents') or []) if x['content_type'] == c['content_type']), None)
            if asrc:
                data['ar_title'] = asrc.get('title')
                data['ar_body'] = asrc.get('body')
            if 'questions' in data:
                data['questions'] = conv(data['questions'])
            if c['content_type'] == 'listening':
                data['transcript'] = c.get('body')
            rows.append({'unit_id': uid, 'content_type': c['content_type'], 'title': c['title'],
                         'body': c.get('body'), 'order_index': c.get('order_index', 0),
                         'is_published': True, 'data': data})
        chk(S.post(f'{URL}/unit_contents', json=rows, headers={'Prefer': 'return=minimal'}))
    print(lv, 'ok', flush=True)

# vocabulary
vdir = f'{base}/vocabulary'
if os.path.isdir(vdir) and not S.get(f'{URL}/vocabulary?select=id&limit=1').json():
    batch = []
    for f in sorted(os.listdir(vdir)):
        for w in json.load(open(os.path.join(vdir, f))):
            batch.append({k: w.get(k) for k in
                          ('word', 'translation', 'phonetic', 'phonetic_us', 'phonetic_uk',
                           'example', 'example_ar', 'category') if w.get(k) is not None})
    for i in range(0, len(batch), 500):
        chk(S.post(f'{URL}/vocabulary', json=batch[i:i + 500], headers={'Prefer': 'return=minimal'}))
    print('vocabulary', len(batch), flush=True)
print('DONE')
