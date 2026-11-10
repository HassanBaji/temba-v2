import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(18);
Config.setPixelFormat("yuv420p");
Config.setColorSpace("bt709");
// A silent track keeps messengers from treating the clip as a GIF.
Config.setEnforceAudioTrack(true);
Config.setOverwriteOutput(true);
Config.setConcurrency(4);

// Point Remotion at a local Chrome Headless Shell when one is provided,
// instead of downloading its own.
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
