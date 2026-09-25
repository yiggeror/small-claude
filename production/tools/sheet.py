"""Contact sheet: python sheet.py out.png cols tileW img1 img2 ..."""
import sys, subprocess
out, cols, tw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
imgs = sys.argv[4:]
th = tw * 9 // 16
n = len(imgs)
rows = (n + cols - 1) // cols
inputs = []
for f in imgs: inputs += ['-i', f]
filt = ''.join(f'[{i}]scale={tw}:{th}[s{i}];' for i in range(n))
layout = '|'.join(f'{(i % cols) * tw}_{(i // cols) * th}' for i in range(n))
if n == 1:
    filt += '[s0]copy[o]'
else:
    filt += ''.join(f'[s{i}]' for i in range(n)) + f'xstack=inputs={n}:layout={layout}:fill=black[o]'
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *inputs, '-filter_complex', filt, '-map', '[o]', '-frames:v', '1', out], check=True)
print(out)
