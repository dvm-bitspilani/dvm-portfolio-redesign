// V2's mercury environment: the kit's teal studio with a near-clear glass body
// (the kit default tints the transmission cyan; V2 wants the page to read through it).
import { MERCURY_ENVS } from "../../../immersive/kit/mercury";

export const GLASS_ENV = { ...MERCURY_ENVS.teal, glass: [1.0, 1.05, 1.07] };
