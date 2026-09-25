import sys
from PIL import Image
ts=sys.argv[1].split(',')
ims=[Image.open(f'out/still-{t}.jpg').resize((640,360)) for t in ts]
rows=(len(ims)+1)//2
sheet=Image.new('RGB',(1280,360*rows),'grey')
for i,im in enumerate(ims): sheet.paste(im,((i%2)*640,(i//2)*360))
sheet.save('out/sheet.jpg',quality=85)
