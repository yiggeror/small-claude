"""Search freesound.org for CC0 sounds and download HQ previews as candidates.
usage: python fs_search.py "<query>" [n] [outdir]"""
import sys, re, os, json, urllib.request, urllib.parse, html

def search(q, n=6, page=1, sort=None):
    params = {"q": q, "f": 'license:"Creative Commons 0"', "page": page}
    if sort: params["s"] = sort
    url = "https://freesound.org/search/?" + urllib.parse.urlencode(params)
    txt = urllib.request.urlopen(url, timeout=30).read().decode("utf8", "ignore")
    out = []
    for m in re.finditer(r'data-mp3="([^"]+)".*?data-title="([^"]*)".*?data-duration="([^"]+)".*?data-num-downloads="(\d+)".*?href="(/people/[^"]+/sounds/(\d+)/)"', txt, re.S):
        mp3, title, dur, dl, page_url, sid = m.groups()
        out.append(dict(id=int(sid), title=html.unescape(title), dur=float(dur), downloads=int(dl),
                        url="https://freesound.org" + page_url, mp3=mp3.replace("-lq.mp3", "-hq.mp3")))
    return out[:n]

if __name__ == "__main__":
    q = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    outdir = sys.argv[3] if len(sys.argv) > 3 else None
    res = search(q, n)
    for r in res:
        print(f'{r["id"]:>7} {r["dur"]:6.2f}s dl={r["downloads"]:<6} {r["title"][:60]}  {r["url"]}')
        if outdir:
            os.makedirs(outdir, exist_ok=True)
            fn = os.path.join(outdir, f'{r["id"]}.mp3')
            if not os.path.exists(fn):
                urllib.request.urlretrieve(r["mp3"], fn)
    if outdir:
        os.makedirs(outdir, exist_ok=True)
        meta = os.path.join(outdir, "meta.json")
        old = json.load(open(meta)) if os.path.exists(meta) else {}
        for r in res: old[str(r["id"])] = r
        json.dump(old, open(meta, "w"), indent=1, ensure_ascii=False)
