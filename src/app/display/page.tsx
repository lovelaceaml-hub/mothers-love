import { ColorPolishHost } from '@/components/display/color-polish-host/ColorPolishHost';
import { DisplayBackgroundSong } from '@/components/display/DisplayBackgroundSong';
import { DisplayBuildWatch } from '@/components/display/DisplayBuildWatch';
import { DisplayKioskControl } from '@/components/display/DisplayKioskControl';

export default function DisplayPage() {
  return (
    <>
      <ColorPolishHost />
      <DisplayKioskControl />
      <DisplayBackgroundSong />
      <DisplayBuildWatch />
    </>
  );
}
