"""Build ../media/* (webp) from the public sources downloaded into the scratchpad (see facts.md for where each came from).
usage: python3 -I media.py <scratch dir with thumbs/ shorts/ imgs/>"""
import os, sys, subprocess, json
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.dirname(HERE)
SRC = sys.argv[1]
def out(*p):
    f = os.path.join(SITE, 'media', *p); os.makedirs(os.path.dirname(f), exist_ok=True); return f
def cv(src, dst, *ops, q=74):
    subprocess.run(['convert', src, '-auto-orient', *ops, '-strip', '-quality', str(q), '-define', 'webp:method=6', dst], check=True)

EP = [l.split('\t')[0] for l in open(os.path.join(SRC, 'yt/videos.tsv')) if l.strip()]
for i in EP:
    src = os.path.join(SRC, 'thumbs', i + '.jpg')
    if i == 'bI3J9MSVi0c':  # no maxres thumbnail; sddefault is 4:3 letterboxed
        subprocess.run(['curl', '-s', '-o', src, f'https://i.ytimg.com/vi/{i}/sddefault.jpg'], check=True)
        cv(src, out('ep', i + '.webp'), '-gravity', 'center', '-crop', '640x360+0+0', '+repage', q=72)
        continue
    cv(src, out('ep', i + '.webp'), '-resize', '640x360^', '-gravity', 'center', '-extent', '640x360', q=72)
SH = ['p7g68hbv-XI', 'A7k4ob2Tm5w', 'SpfTpU3eJWY', 'XxQe1F1TVwE', 'C2OQjpCWSCk', 'NJgTRlj1Io8', 'K1iVOFf355U', 'gBvW_b1_ZYI',
      'Aq-kUkDbkho', 'ndByYrayKkk', 'lgAz-fMnf0g', 'sS7cAag-D9o', 'L97-Tp-GpPo', 'CJV-lcAgUIg', 'FwM_9-JKQlM', 'J0pjqCTmmzc',
      'RnAk1RY8AXA', 'VPB_9F0xD80']
for i in SH:
    cv(os.path.join(SRC, 'shorts', i + '.jpg'), out('sh', i + '.webp'), '-resize', '360x640^', '-gravity', 'center', '-extent', '360x640', q=70)

I = lambda n: os.path.join(SRC, 'imgs', n)
TEAM = {'omar': '2024_08_Omar-Thabet-1.jpg', 'abeer': '2024_08_Abeer-Thabet.jpg', 'sarah': '2024_08_Sarah-Thabet.jpg',
        'yousif': '2024_08_Yousif-Thabet-1.jpg', 'zack': '2024_08_Zack-Thabet.jpg', 'hamza': '2024_08_Hamza-Thabet.jpg',
        'ramsey': '2024_08_Ramsey-Ali.jpg', 'ali': '2024_08_Ali-Abdullah-1.jpg', 'muhammad': '2024_08_Muhammad-Thabet.jpg',
        'hussain': '2024_09_IMG_1954.jpeg', 'abee': '2024_09_IMG_1956.jpeg', 'amal': '2024_09_IMG_5503.jpeg'}
for k, f in TEAM.items():
    cv(I(f), out('team', k + '.webp'), '-resize', '420x420^', '-gravity', 'north', '-extent', '420x420', q=72)
SP = {'detroitfurniture': '2026_10_IMG_1516.jpeg', 'atlaw': '2026_08_IMG_0894.jpeg', 'hausofbrunch': '2026_09_IMG_1451.jpeg',
      'familyrehab': '2026_08_IMG_9243.png', 'chillbox': '2025_09_ChillBox-Logo.jpg', 'hanley': '2024_07_hanleyInternational.jpg',
      'familydoc': '2025_09_IMG_4290.jpg', 'wingfellas': '2024_09_Wingfellas-Banner-transparent.jpg', 'emari': '2026_08_IMG_0710.jpeg',
      'balkan': '2024_06_The-Balkan-House-11.jpg', 'specialty': '2024_06_Mask-group4.jpg', 'jabal': '2024_08_Jabal.jpg',
      'varaprint': '2026_11_varaprint.jpeg', 'missionford': '2026_11_IMG_2002.png', 'halalbros': '2026_11_IMG_9262.jpg',
      'sidrbees': '2024_06_Sidr-Bees-12.jpg', 'uniqueconey': '2024_06_Mask-group7.jpg', 'bmi': '2024_08_BMI-Towing.jpg'}
for k, f in SP.items():
    cv(I(f), out('sp', k + '.webp'), '-background', 'white', '-flatten', '-fuzz', '6%', '-trim', '+repage', '-resize', '360x180>', q=82)
PH = {'jerseys': '2024_09_3d202ff4e04d67ca-e1725372655835.png', 'crew': '2024_08_IMG_5181.jpg', 'crew2': '2024_08_IMG_5183.jpg',
      'game': '2024_08_groupPic-e1723744374749.jpg', 'live': '2024_08_podcastLive-scaled.jpg', 'set-jerseys': '2024_07_podcast.jpg',
      'guests': '2024_06_unnamed-4.jpg', 'guests2': '2024_06_unnamed-5.jpg', 'welcome': '2024_06_unnamed-6-scaled.jpg',
      'award1': '2024_08_IMG_5174.jpg', 'award2': '2024_08_IMG_5178.jpg', 'award3': '2024_08_IMG_5175.jpg', 'fans': '2024_08_unnamed-10.jpg',
      'soty2025': '2025_05_Student-of-the-year-photo.jpeg', 'soty2024': '2024_08_IMG_8332.jpeg', 'tmf': '2024_09_IMG_5503.jpeg',
      'mayor': '2024_06_Hammoud20Abdullah.png', 'studio-old': '2024_07_podcast-2-scaled.jpg',
      'book': '2025_03_51FW1ES4ZnL._SL1360_.jpg', 'merch': '2024_06_Group-381.png'}
for k, f in PH.items():
    cv(I(f), out('ph', k + '.webp'), '-background', 'white', '-flatten', '-resize', '900x900>', q=70)
print('done')
