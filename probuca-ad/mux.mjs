// Combines the silent render with the music bed into the final deliverable.
import { execSync, spawnSync } from 'node:child_process';
const ff = process.env.FFMPEG || execSync(`python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"`).toString().trim();
const r = spawnSync(ff, ['-y', '-i', 'out/video-silent.mp4', '-i', 'out/music.wav', '-map', '0:v', '-map', '1:a',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
  'probuca-nouvelle-specialiste.mp4'], { stdio: 'inherit' });
process.exit(r.status);
