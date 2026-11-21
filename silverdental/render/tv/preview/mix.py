import subprocess, sys
K = '/home/user/Baydounurgentcare/.claude/skills/brand-posts/kit/snd/'
V, OUT, DUR = sys.argv[1], sys.argv[2], float(sys.argv[3])
cues = [(0.1, 'whoosh', .55), (1.8, 'chime', .35), (2.9, 'whoosh', .7), (11.3, 'whoosh', .8), (12.75, 'impact', .75)]
for c in (15.1, 17.7, 20.0, 22.6, 24.7, 26.7): cues.append((c - .05, 'snip', .5))
cues += [(28.6, 'whoosh', .6), (30.1, 'chime', .4)]
ins = ['-i', V, '-stream_loop', '-1', '-i', K + 'loop.mp3']; ch = ['[1:a]atrim=0:%.2f,asetpts=N/SR/TB,volume=0.5,afade=t=in:d=0.8,afade=t=out:st=%.2f:d=2.2[m]' % (DUR, DUR - 2.2)]
for i, (t, n, g) in enumerate(cues):
    ins += ['-i', K + n + '.mp3']; ch.append('[%d:a]adelay=%d|%d,volume=%s[c%d]' % (i + 2, t * 1000, t * 1000, g, i))
fc = ';'.join(ch) + ';[m]' + ''.join('[c%d]' % i for i in range(len(cues))) + 'amix=inputs=%d:normalize=0:duration=first,atrim=0:%.2f,alimiter=limit=0.9[a]' % (len(cues) + 1, DUR)
subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT], check=True)
print('ok', OUT)
