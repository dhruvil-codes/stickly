import React, { useEffect, useState } from 'react';
import { AbsoluteFill, CanvasImage, Easing, Sequence, cancelRender, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio, Video } from '@remotion/media';
import { loadFont } from '@remotion/fonts';
import type { Caption } from '@remotion/captions';
import words from './captions.json';
import {brandSvg} from './brand';

const BG='#f2f0e6';
const INK='#304036';
const asset=(name:string)=>staticFile('generated/'+name);
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const ease=Easing.bezier(.16,1,.3,1);
function Fonts(){
 const [handle]=useState(()=>delayRender('Loading Stickly handwriting'));
 useEffect(()=>{loadFont({family:'Shantell Sans',url:asset('ShantellSans-Bold.ttf'),weight:'700'}).then(()=>continueRender(handle)).catch(cancelRender)},[handle]);
 return null;
}
function Logo({style={}}:{style?:React.CSSProperties}){return <div className="launch-logo" style={style} dangerouslySetInnerHTML={{__html:brandSvg}}/>}
function Brand(){return <Logo style={{position:'absolute',left:120,top:68,width:205,height:62}}/>}
function ImageCard({src,style={}}:{src:string;style?:React.CSSProperties}){
 return <div style={{position:'absolute',filter:'drop-shadow(0 25px 28px #34462b29)',...style}}><CanvasImage src={asset(src)} style={{width:'100%',height:'100%',objectFit:'contain'}}/></div>
}
function Copy({title,detail}:{title:string;detail?:string}){
 const f=useCurrentFrame();
 return <div style={{position:'absolute',left:120,top:290,width:880,opacity:interpolate(f,[0,13],[0,1],clamp),translate:`0px ${interpolate(f,[0,20],[25,0],{...clamp,easing:ease})}px`}}>
  <h1 style={{fontSize:106,lineHeight:1.12,letterSpacing:-4,whiteSpace:'pre-line',margin:0,fontWeight:700}}>{title}</h1>
  {detail&&<p style={{fontSize:35,lineHeight:1.5,color:'#64735e',maxWidth:800,margin:'32px 0 0'}}>{detail}</p>}
 </div>
}
const tiles=[
 {src:'plain-note.png',x:-100,y:-90,r:-10}, {src:'checklist.png',x:450,y:-180,r:7},
 {src:'paper-colors.png',x:1110,y:-160,r:-5}, {src:'charcoal.png',x:1660,y:-40,r:9},
 {src:'history.png',x:-170,y:590,r:8}, {src:'peel.png',x:425,y:840,r:-6},
 {src:'compact.png',x:1120,y:795,r:9}, {src:'text-size.png',x:1700,y:620,r:-7},
];
function Hook(){
 const f=useCurrentFrame();
 return <AbsoluteFill>
  {tiles.map((t,i)=><ImageCard key={t.src} src={t.src} style={{left:t.x,top:t.y,width:330,height:330,rotate:`${t.r}deg`,opacity:.18,translate:`0px ${interpolate(f,[0,100],[i%2?20:-20,i%2?-16:16],clamp)}px`}}/>)}
  <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center,#f2f0e6 16%,#f2f0e600 78%)'}}/>
  <Brand/>
  <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',paddingBottom:60}}>
   <div style={{fontSize:250,lineHeight:1,letterSpacing:-16,scale:interpolate(f,[0,24],[.82,1],{...clamp,easing:ease}),opacity:interpolate(f,[0,9],[0,1],clamp)}}>1,000</div>
   <h1 style={{fontSize:70,margin:'32px 0 0',letterSpacing:-2,opacity:interpolate(f,[15,30],[0,1],clamp)}}>things on your mind?</h1>
   <div style={{height:12,width:420,background:'#fef08a',borderRadius:'50%',marginTop:20,scale:interpolate(f,[28,45],[0,1],clamp)}}/>
  </div>
 </AbsoluteFill>
}
function Hero(){
 const f=useCurrentFrame();
 return <AbsoluteFill><Brand/><Copy title={'Your next thing.\nRight here.'} detail="Beautiful handwritten notes for your Windows desktop."/>
  <ImageCard src="plain-note.png" style={{left:1100,top:210,width:610,height:610,rotate:'-4deg',scale:interpolate(f,[0,27],[.92,1],{...clamp,easing:ease}),opacity:interpolate(f,[0,12],[0,1],clamp)}}/>
  <div style={{position:'absolute',left:126,top:720,fontSize:28,color:'#64735e'}}>A little paper. A little more headspace.</div>
 </AbsoluteFill>
}
function Features(){
 const f=useCurrentFrame();
 const title=f<36?'Catch the idea.':f<92?'Make a little\nprogress.':'Make it yours.';
 const detail=f<36?'A thought worth keeping.':f<92?'Optional checklists, with little wins built in.':'Seven papers. S / M / L. Pin what matters.';
 return <AbsoluteFill><Brand/><Copy title={title} detail={detail}/>
  {f<36&&<ImageCard src="plain-note.png" style={{left:1110,top:185,width:610,height:610,rotate:'2deg'}}/>}
  <Sequence from={36} durationInFrames={56} name="Real checklist interaction">
   <div style={{position:'absolute',left:1010,top:165,width:780,height:680,overflow:'hidden',borderRadius:28}}>
    <Video src={asset('checklist-demo.mp4')} muted objectFit="cover" style={{width:'100%',height:'100%'}}/>
   </div>
  </Sequence>
  {f>=92&&f<135&&<ImageCard src="paper-colors.png" style={{left:1090,top:175,width:630,height:630,rotate:'-2deg'}}/>}
  {f>=135&&<><ImageCard src={f>=151?"pinned.png":"text-size.png"} style={{left:1130,top:180,width:590,height:590,rotate:'3deg'}}/><div style={{position:'absolute',left:1090,top:810,fontSize:29,color:'#64735e'}}>Your priorities stay in view.</div></>}
 </AbsoluteFill>
}
function Peel(){
 const f=useCurrentFrame();
 const title=f<40?'Grab a corner.':f<95?'Peel it away.':f<145?'Take it with you.':'Click. It sticks.';
 return <AbsoluteFill>
  <Video src={asset('peel-demo.mp4')} trimBefore={0} muted style={{position:'absolute',width:1440,height:1080,left:240,top:30}}/>
  <h1 style={{position:'absolute',left:100,right:100,top:45,textAlign:'center',fontSize:76,letterSpacing:-3,margin:0,opacity:interpolate(f,[0,9],[0,1],clamp)}}>{title}</h1>
  <div style={{position:'absolute',right:100,top:78,fontSize:20,color:'#75826b'}}>REAL STICKLY DEMO</div>
 </AbsoluteFill>
}
function Everyday(){
 const f=useCurrentFrame();
 return <AbsoluteFill><Brand/>
  <Copy title={f<36?'Your space.\nYour size.':f<74?'Good thoughts\ncome back.':'Here when\nyou need it.'} detail={f<36?'Resize it to fit your corner.':f<74?'Restore a finished task or an archived note.':'Alt + N brings Stickly back into view.'}/>
  {f<36&&<ImageCard src="compact.png" style={{left:1110,top:290,width:610,height:510,rotate:'-3deg'}}/>}
  {f>=36&&f<74&&<ImageCard src="history.png" style={{left:1190,top:155,width:470,height:650,rotate:'2deg'}}/>}
  {f>=74&&<><ImageCard src="charcoal.png" style={{left:1120,top:185,width:610,height:610,rotate:'-2deg'}}/><div style={{position:'absolute',left:126,top:720,display:'flex',gap:18,alignItems:'center',fontSize:42}}><kbd style={{padding:'15px 27px',border:'2px solid #aeba9e',borderBottomWidth:5,borderRadius:14,fontFamily:'inherit',background:'#faf9f1'}}>Alt</kbd><span>+</span><kbd style={{padding:'15px 27px',border:'2px solid #aeba9e',borderBottomWidth:5,borderRadius:14,fontFamily:'inherit',background:'#faf9f1'}}>N</kbd></div></>}
 </AbsoluteFill>
}
function Outro(){
 const f=useCurrentFrame();
 return <AbsoluteFill>
  {f<95?<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',paddingBottom:80}}>
   <h1 style={{fontSize:100,lineHeight:1.25,letterSpacing:-4,margin:0,textAlign:'center'}}>No account.<br/>No cloud.</h1>
   <p style={{fontSize:43,color:'#64735e',marginTop:28}}>Just a little more headspace.</p>
  </div>:<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',paddingBottom:80,opacity:interpolate(f,[95,105],[0,1],clamp),scale:interpolate(f,[95,118],[.96,1],{...clamp,easing:ease})}}>
   <Logo style={{width:460,height:135}}/>
   <h1 style={{fontSize:74,letterSpacing:-3,margin:'38px 0 22px'}}>Good ideas stick.</h1>
   <p style={{fontSize:33,color:'#64735e',margin:0}}>github.com/dhruvil-codes/stickly</p>
   <p style={{fontSize:23,color:'#7b866f',marginTop:32}}>Windows · Early preview</p>
  </div>}
 </AbsoluteFill>
}
const captions=words as Caption[];
const groups:Caption[][]=[];
let batch:Caption[]=[];
for(const word of captions){batch.push(word);if(batch.length>=8||/[.!?]\s*$/.test(word.text)){groups.push(batch);batch=[]}}
if(batch.length)groups.push(batch);
function Captions(){
 const frame=useCurrentFrame();const {fps}=useVideoConfig();const ms=frame/fps*1000;
 const group=groups.find(g=>ms>=g[0].startMs&&ms<=g[g.length-1].endMs+65);
 if(!group)return null;
 return <div style={{position:'absolute',bottom:58,left:130,right:130,textAlign:'center',fontSize:34,lineHeight:1.3,color:INK,pointerEvents:'none'}}><span style={{display:'inline-block',padding:'9px 23px',borderRadius:18,background:'#f2f0e6eb'}}>{group.map((w,i)=><span key={i} style={{background:ms>=w.startMs&&ms<=w.endMs?'#fef08a':'transparent',borderRadius:4}}>{w.text}</span>)}</span></div>
}
function PaperWipes(){
 const f=useCurrentFrame();
 const cuts=[100,228,399,603,740];
 const cut=cuts.find(c=>f>=c-5&&f<=c+6);
 if(cut===undefined)return null;
 return <div style={{position:'absolute',top:-200,bottom:-200,width:650,left:interpolate(f,[cut-5,cut+6],[-950,2200],{...clamp,easing:Easing.bezier(.5,0,.5,1)}),background:'#fef08a',rotate:'-12deg',opacity:.94}}/>;
}
export const LaunchFilm:React.FC=()=>{
 return <AbsoluteFill style={{background:BG,color:INK,fontFamily:'Shantell Sans',fontWeight:700}}>
  <Fonts/>
  <style>{`.launch-logo svg{display:block;width:100%;height:100%}`}</style>
  <Sequence name="The productivity hook" durationInFrames={100}><Hook/></Sequence>
  <Sequence name="Meet Stickly" from={100} durationInFrames={128}><Hero/></Sequence>
  <Sequence name="Notes, tasks and paper" from={228} durationInFrames={171}><Features/></Sequence>
  <Sequence name="The real peel and place" from={399} durationInFrames={204}><Peel/></Sequence>
  <Sequence name="Everyday desktop features" from={603} durationInFrames={137}><Everyday/></Sequence>
  <Sequence name="Offline, then the brand" from={740} durationInFrames={160}><Outro/></Sequence>
  <Audio src={asset('voiceover.mp3')} volume={1}/>
  <Audio src={asset('effects.mp3')} volume={.65}/>
  <PaperWipes/>
  <Captions/>
 </AbsoluteFill>
};
