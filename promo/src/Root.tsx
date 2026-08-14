import { Composition } from "remotion";
import { CarbonCreditPromo } from "./CarbonCreditPromo";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="CarbonCreditPromo"
        component={CarbonCreditPromo}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
