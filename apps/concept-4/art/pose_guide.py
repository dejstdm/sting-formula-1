"""Draws prompts/run4-pose-guide.png: stick-figure limb positions for the 4-frame half run cycle. Usage: python3 pose_guide.py"""
from PIL import Image, ImageDraw
W,H=1536,1024; CW=384
img=Image.new('RGB',(W,H),(0,255,0)); d=ImageDraw.Draw(img)
# Runner's LEFT = viewer's left (seen from behind). Half cycle: left foot stance, right leg swing.
# Each frame: bob, left leg (hip,knee,foot,foot_size), right leg, left arm (sh,elbow,hand,visible), right arm
frames=[
 # 1 left foot strikes, right leg trailing (foot low & big, heel up), RIGHT arm forward, LEFT arm back
 dict(bob=0, L=[(172,500),(166,700),(164,880),22], R=[(212,500),(224,720),(230,915),30],
      La=[(140,250),(112,380),(130,470)], Ra=[(244,250),(262,330),(222,300)]),
 # 2 mid-stance lowest, right heel kicked up to buttock, sole visible; arms passing at sides
 dict(bob=14, L=[(172,500),(170,700),(168,880),22], R=[(212,500),(226,690),(222,590),30],
      La=[(140,250),(122,370),(140,440)], Ra=[(244,250),(262,370),(246,430)]),
 # 3 left toe-off, right knee driving forward (foot small, high, mostly hidden); LEFT arm forward, RIGHT arm back
 dict(bob=4, L=[(172,500),(162,705),(156,905),26], R=[(212,500),(216,640),(214,760),16],
      La=[(140,250),(122,330),(162,300)], Ra=[(244,250),(272,380),(254,470)]),
 # 4 flight highest: left leg stretched back (big sole low), right knee high forward; LEFT arm forward, RIGHT arm back
 dict(bob=-24, L=[(172,500),(160,720),(150,940),32], R=[(212,500),(214,620),(214,740),16],
      La=[(140,250),(124,320),(166,290)], Ra=[(244,250),(276,390),(258,480)]),
]
for i,f in enumerate(frames):
  ox=i*CW; b=f['bob']
  P=lambda p:(p[0]+ox,p[1]+b)
  def line(a,c,w): d.line([P(a),P(c)],fill=(20,20,20),width=w)
  # torso
  d.polygon([P((140,250)),P((244,250)),P((214,505)),P((170,505))],fill=(200,0,0))
  d.ellipse([P((158,130)),P((226,214))],fill=(60,30,20))
  for leg,col in ((f['L'],(255,255,255)),(f['R'],(255,255,255))):
    hip,knee,foot,s=leg
    line(hip,knee,34); line(knee,foot,28)
    fx,fy=P(foot); d.ellipse([fx-s*0.7,fy-s,fx+s*0.7,fy+s],fill=(0,0,0),outline=col,width=3)
  for arm in (f['La'],f['Ra']):
    sh,el,ha=arm; line(sh,el,22); line(el,ha,20)
  d.text((ox+10,10),f'{i+1}',fill=(0,0,0))
img.save(__import__('pathlib').Path(__file__).parent / 'prompts' / 'run4-pose-guide.png')
