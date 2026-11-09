import { Config } from '@remotion/cli/config';
Config.setRspack(true);
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setConcurrency(1);
Config.setOffthreadVideoCacheSizeInBytes(64*1024*1024);
