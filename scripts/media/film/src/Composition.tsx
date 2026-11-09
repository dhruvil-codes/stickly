import React, {useEffect, useState} from 'react';
import {AbsoluteFill, CanvasImage, Easing, Sequence, cancelRender, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio, Video} from '@remotion/media';
import {loadFont} from '@remotion/fonts';
import type {Caption} from '@remotion/captions';
import words from './captions.json';
import {brandSvg} from './brand';

const BG='#f2f0e6', INK='#304036', YELLOW='#fef08a';
const asset=(name:string)=>staticFile('generated/'+name);
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const ease=Easing.bezier(.16,1,.3,1);
function Fonts(){const [handle]=useState(()=>delayRender('Loading handwriting'));useEffect(()=>{loadFont({family:'Shantell Sans',url:asset('ShantellSans-Bold.ttf'),weight:'700'}).then(()=>continueRender(handle)).catch(cancelRender)},[handle]);return null}
function Logo({style={}}:{style?:React.CSSProperties}){return <div className="launch-logo" style={style} dangerouslySetInnerHTML={{__html:brandSvg}}/>}
function Brand(){return <Logo style={{position:'absolute',left:120,top:68,width:205,height:62}}/>}
function ImageCard({src,style={}}:{src:string;style?:React.CSSProperties}){return <div style={{position:'absolute',filter:'drop-shadow(0 25px 28px #34462b29)',...style}}><CanvasImage src={asset(src)} style={{width:'100%',height:'100%',objectFit:'contain'}}/></div>}
function KineticTitle({text,at=0,style={}}:{text:string;at?:number;style?:React.CSSProperties}){
 const f=useCurrentFrame();let index=0;
 return <h1 style={{fontSize:108,lineHeight:1.16,letterSpacing:-4,margin:0,fontWeight:700,...style}}>{text.split('\n').map((line,l)=><div key={l}>{line.split(' ').map(word=>{const i=index++;return <span key={i} style={{display:'inline-block',marginRight:'.24em',opacity:interpolate(f,[at+i*3,at+i*3+6],[0,1],clamp),translate:`0px ${interpolate(f,[at+i*3,at+i*3+19],[48,0],{...clamp,easing:ease})}px`,rotate:`${interpolate(f,[at+i*3,at+i*3+19],[4,0],{...clamp,easing:ease})}deg`}}>{word}</span>})}</div>)}</h1>
}
function Label({children,style={}}:{children:React.ReactNode;style?:React.CSSProperties}){return <div style={{fontSize:24,letterSpacing:2,color:'#75826b',...style}}>{children}</div>}
const clutter=[{text:'reply to that email',x:45,y:80,r:-12,c:'#e9d5ff'},{text:'the idea from 2am',x:1390,y:100,r:8,c:'#bae6fd'},{text:'one more deadline',x:80,y:820,r:5,c:'#fed7aa'},{text:'remember everything',x:1370,y:850,r:-8,c:'#a7f3d0'},{text:'that thing for later',x:760,y:900,r:12,c:'#fef08a'}];
function Hook(){const f=useCurrentFrame();const {fps}=useVideoConfig();return <AbsoluteFill style={{background:INK,color:BG,overflow:'hidden'}}>
 {clutter.map((t,i)=><div key={t.text} style={{position:'absolute',left:t.x,top:t.y,width:390,padding:'25px 25px 45px',fontSize:30,lineHeight:1.4,color:INK,background:t.c,borderRadius:6,rotate:`${t.r}deg`,opacity:interpolate(f,[65,105],[.55,0],clamp),scale:spring({fps,frame:f-i*5,config:{damping:17,stiffness:150}}),translate:`${interpolate(f,[65,108],[0,t.x>960?250:-250],{...clamp,easing:ease})}px 0px`}}>{t.text}</div>)}
 <div style={{position:'absolute',left:160,right:160,top:265,textAlign:'center'}}>
 <h1 style={{fontSize:155,letterSpacing:-7,lineHeight:1.1,margin:0,scale:interpolate(f,[0,14],[1.08,1],{...clamp,easing:ease})}}>Your <span style={{color:YELLOW}}>brain.</span></h1>
 <div style={{height:190,marginTop:25}}><KineticTitle text={'is not a to-do list.'} at={30} style={{fontSize:104,letterSpacing:-4}}/></div>
 <div style={{display:'inline-block',fontSize:39,padding:'10px 26px',background:YELLOW,color:INK,borderRadius:8,rotate:'-3deg',scale:interpolate(f,[91,103],[0,1],{...clamp,easing:ease})}}>Seriously. Give it a break.</div>
 </div>
 <Label style={{position:'absolute',left:120,bottom:85,color:'#bec8b3'}}>LESS MENTAL CLUTTER STARTS HERE</Label>
 </AbsoluteFill>}
function Intro(){const f=useCurrentFrame();const {fps}=useVideoConfig();return <AbsoluteFill><Brand/>
 <div style={{position:'absolute',left:120,top:280,width:900}}><Label style={{marginBottom:28}}>MEET YOUR NEXT LITTLE THING</Label><KineticTitle text={'Meet\nStickly.'} style={{fontSize:139}}/><p style={{fontSize:38,lineHeight:1.5,width:780,color:'#64735e'}}>Cute handwritten notes.<br/>Right on your Windows desktop.</p></div>
 <ImageCard src="plain-note.png" style={{left:1100,top:210,width:610,height:610,rotate:`${interpolate(f,[0,32],[8,-4],{...clamp,easing:ease})}deg`,scale:spring({fps,frame:f-4,config:{damping:18,stiffness:130}}),translate:`0px ${interpolate(f,[0,30],[200,0],{...clamp,easing:ease})}px`}}/>
 <div style={{position:'absolute',left:1130,top:850,fontSize:29,color:'#64735e',rotate:'-3deg'}}>Thought caught. Brain relieved.</div>
 </AbsoluteFill>}
function Features(){const f=useCurrentFrame();const phase=f<50?0:f<99?1:2;const at=phase===0?0:phase===1?50:99;return <AbsoluteFill><Brand/>
 <div style={{position:'absolute',left:120,top:310,width:850}}><KineticTitle text={phase===0?'Brain dump?\nDone.':phase===1?'Tiny wins?\nTick.':'Make it\nyour colour.'} at={at}/><p style={{fontSize:36,color:'#64735e',marginTop:35}}>{phase===0?'A note can just be a note.':phase===1?'Checklists, only when you want them.':'Seven papers. Three text sizes. Your vibe.'}</p>
 {phase===2&&<div style={{display:'flex',gap:18,marginTop:42}}>{['#fef08a','#fed7aa','#fecdd3','#a7f3d0','#bae6fd','#e9d5ff','#262626'].map((c,i)=><div key={c} style={{width:55,height:55,borderRadius:50,background:c,border:'2px solid #30403622',scale:interpolate(f,[99+i*3,107+i*3],[0,1],{...clamp,easing:ease})}}/>)}</div>}</div>
 {phase===0&&<ImageCard src="plain-note.png" style={{left:1100,top:200,width:610,height:610,rotate:'3deg'}}/>}
 <Sequence from={50} durationInFrames={49} name="Check off a task in the real app"><div style={{position:'absolute',left:1010,top:165,width:780,height:680,overflow:'hidden',borderRadius:28}}><Video src={asset('checklist-demo.mp4')} muted objectFit="cover" style={{width:'100%',height:'100%'}}/></div></Sequence>
 {phase===2&&<ImageCard src="paper-colors.png" style={{left:1090,top:185,width:630,height:630,rotate:'-2deg'}}/>}
 </AbsoluteFill>}
function Peel(){const f=useCurrentFrame();const title=f<30?'And this bit?':f<75?'Peel it up.':f<112?'Take it with you.':'Click. Stuck.';const at=f<30?0:f<75?30:f<112?75:112;return <AbsoluteFill>
 <Video src={asset('peel-demo.mp4')} playbackRate={1.35} muted style={{position:'absolute',width:1440,height:1080,left:240,top:30}}/>
 <div style={{position:'absolute',left:150,right:150,top:45,textAlign:'center'}}><KineticTitle text={title} at={at} style={{fontSize:76,letterSpacing:-3}}/></div>
 <Label style={{position:'absolute',right:90,top:155,fontSize:18}}>REAL STICKLY DEMO</Label>
 </AbsoluteFill>}
function Desktop(){const f=useCurrentFrame();return <AbsoluteFill>
 <Video src={asset('native-desktop.mp4')} trimBefore={12*30} muted style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
 <div style={{position:'absolute',left:0,top:0,bottom:0,width:1100,background:'linear-gradient(90deg,#f2f0e6 0%,#f2f0e6ed 60%,#f2f0e600 100%)'}}/>
 <Brand/><div style={{position:'absolute',left:120,top:315,width:900}}><KineticTitle text={'Your desktop.\nYour little corner.'} style={{fontSize:95}}/><p style={{fontSize:36,color:'#64735e'}}>Resize it. Pin it. Keep it in view.</p>
 <div style={{display:'flex',gap:15,alignItems:'center',fontSize:35,opacity:interpolate(f,[42,49],[0,1],clamp)}}><kbd style={{padding:'12px 22px',border:'2px solid #aeba9e',borderBottomWidth:5,borderRadius:12,fontFamily:'inherit'}}>Alt</kbd> + <kbd style={{padding:'12px 22px',border:'2px solid #aeba9e',borderBottomWidth:5,borderRadius:12,fontFamily:'inherit'}}>N</kbd><span style={{fontSize:27,marginLeft:10}}>and it's back.</span></div></div>
 <Label style={{position:'absolute',right:95,top:76,fontSize:20}}>RECORDED ON WINDOWS</Label>
 </AbsoluteFill>}
function Relief(){const f=useCurrentFrame();return <AbsoluteFill><Brand/>
 <div style={{position:'absolute',left:120,right:120,top:300,textAlign:'center'}}><div style={{display:'flex',gap:45,justifyContent:'center',fontSize:66}}>{['No account.','No cloud.'].map((t,i)=><div key={t} style={{padding:'15px 28px',border:'2px solid #bec8b3',borderRadius:18,opacity:interpolate(f,[i*24,i*24+7],[0,1],clamp),translate:`0px ${interpolate(f,[i*24,i*24+18],[30,0],{...clamp,easing:ease})}px`}}>{t}</div>)}</div><KineticTitle text={'Less mental clutter.'} at={52} style={{fontSize:112,marginTop:55}}/><div style={{margin:'25px auto 0',width:600,height:13,borderRadius:'50%',background:YELLOW,scale:interpolate(f,[66,76],[0,1],clamp)}}/></div>
 </AbsoluteFill>}
function CTA(){const f=useCurrentFrame();return <AbsoluteFill style={{background:'#e9eedf'}}>
 <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',paddingBottom:80}}>
 <Logo style={{width:415,height:123,scale:interpolate(f,[0,22],[.85,1],{...clamp,easing:ease}),opacity:interpolate(f,[0,7],[0,1],clamp)}}/>
 <KineticTitle text={'Good ideas stick.'} at={11} style={{fontSize:83,marginTop:35,textAlign:'center'}}/>
 <div style={{fontSize:40,marginTop:33,padding:'17px 34px',borderRadius:17,background:INK,color:BG,display:'flex',gap:24,alignItems:'center',scale:interpolate(f,[19,35],[.8,1],{...clamp,easing:ease}),opacity:interpolate(f,[19,26],[0,1],clamp)}}>Get Stickly on GitHub <span style={{translate:`${interpolate(f,[35,60],[0,9],clamp)}px 0px`}}>&#8599;</span></div>
 <p style={{fontSize:30,color:'#64735e',margin:'28px 0 0'}}>github.com/dhruvil-codes/stickly</p>
 <p style={{fontSize:22,color:'#75826b',marginTop:25}}>Windows &#183; Build from source &#183; Early preview</p>
 </div></AbsoluteFill>}
const groups:Caption[][]=[];let batch:Caption[]=[];for(const word of words as Caption[]){batch.push(word);if(batch.length>=6||/[.!?]\s*$/.test(word.text)){groups.push(batch);batch=[]}}if(batch.length)groups.push(batch);
function Captions(){const frame=useCurrentFrame();const {fps}=useVideoConfig();const ms=frame/fps*1000;const group=groups.find(g=>ms>=g[0].startMs&&ms<=g[g.length-1].endMs+60);if(!group||frame<126)return null;return <div style={{position:'absolute',bottom:58,left:120,right:120,textAlign:'center',fontSize:34,lineHeight:1.3,color:INK,pointerEvents:'none'}}><span style={{display:'inline-block',padding:'9px 23px',borderRadius:18,background:'#f2f0e6ee'}}>{group.map((w,i)=><span key={i} style={{background:ms>=w.startMs&&ms<=w.endMs?YELLOW:'transparent',borderRadius:4}}>{w.text}</span>)}</span></div>}
function PaperWipes(){const f=useCurrentFrame();const cut=[126,246,399,552,645,738].find(c=>f>=c-4&&f<=c+5);if(cut===undefined)return null;return <div style={{position:'absolute',top:-200,bottom:-200,width:650,left:interpolate(f,[cut-4,cut+5],[-950,2200],{...clamp,easing:Easing.bezier(.5,0,.5,1)}),background:YELLOW,rotate:'-12deg',opacity:.96}}/>}
export const LaunchFilm:React.FC=()=> <AbsoluteFill style={{background:BG,color:INK,fontFamily:'Shantell Sans',fontWeight:700}}>
 <Fonts/><style>{`.launch-logo svg{display:block;width:100%;height:100%}`}</style>
 <Sequence name="Problem: your brain is not a to-do list" durationInFrames={126}><Hook/></Sequence>
 <Sequence name="Introducing Stickly" from={126} durationInFrames={120}><Intro/></Sequence>
 <Sequence name="Explain: notes, checklists, colours" from={246} durationInFrames={153}><Features/></Sequence>
 <Sequence name="Proof: real corner peel and place" from={399} durationInFrames={153}><Peel/></Sequence>
 <Sequence name="Proof: native Windows workflow" from={552} durationInFrames={93}><Desktop/></Sequence>
 <Sequence name="Benefit: less mental clutter" from={645} durationInFrames={93}><Relief/></Sequence>
 <Sequence name="CTA: get Stickly on GitHub" from={738} durationInFrames={162}><CTA/></Sequence>
 <Audio name="Female narration, music and tactile sound design" src={asset('soundtrack.mp3')}/>
 <PaperWipes/><Captions/>
 </AbsoluteFill>;
