import { Composition } from 'remotion';
import { LaunchFilm } from './Composition';
export const RemotionRoot:React.FC=()=> <Composition id="SticklyLaunch" component={LaunchFilm} durationInFrames={900} fps={30} width={1920} height={1080}/>;
