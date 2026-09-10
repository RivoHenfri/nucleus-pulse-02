// THE NUCLEUS MARK — opening and closing.
//
// The artwork is the real brand asset (public/brand/nucleus-logo.webp, 39 KB),
// so the logo is exactly the logo. What is native is the way it arrives: a
// radial mask opens from the centre outwards, so the nucleus lights first, then
// the orbits, then the ring, then the wordmark — the mark igniting rather than
// a picture fading in. A short brightness overshoot at the end reads as the
// neon striking.
//
// Two details that matter:
//
// * The asset ships with alpha baked in (each pixel's alpha is how lit it is),
//   because `mix-blend-mode: screen` stops blending the moment an ancestor
//   is transformed — and the mark gets scaled on the first screen.
//
// * The reveal rides on a MotionValue rather than on the `animate` prop. A
//   mask-image is a string, not an interpolatable value; animating the radius
//   as a number and rebuilding the gradient from it is the only version that
//   actually moves.
//
// Done this way it costs one small image and no video, it re-times freely
// against narration, and it can be replayed at the end without a second asset.

import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import React, { useEffect } from 'react';

interface Props {
  /** Rendered width in px. The mark scales as one unit. */
  size?: number;
  /** Ignite it. False holds the finished mark, already lit. */
  ignite?: boolean;
  /** Seconds before the reveal starts. */
  delay?: number;
  /** Keep breathing once lit. */
  breathe?: boolean;
}

const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
const SRC = `${base}brand/nucleus-logo.webp`;

const IGNITION_S = 3.2;

const NucleusLogo: React.FC<Props> = ({ size = 280, ignite = true, delay = 0, breathe = true }) => {
  // 0 = dark, 1 = fully lit.
  const reveal = useMotionValue(ignite ? 0 : 1);
  const mask = useTransform(
    reveal,
    r => `radial-gradient(circle at 50% 46%, #000 ${r * 96}%, rgba(0,0,0,0) ${r * 96 + 16}%)`,
  );
  const brightness = useTransform(reveal, [0, 0.78, 1], [0.55, 1.28, 1]);
  const filter = useTransform(brightness, b => `brightness(${b})`);

  useEffect(() => {
    if (!ignite) return;
    reveal.set(0);
    // Near-linear on purpose: an ease-out sweep clears the ring in the first
    // third and the rest of the reveal is spent on empty corners.
    const run = animate(reveal, 1, {
      duration: IGNITION_S,
      delay,
      ease: [0.35, 0.15, 0.5, 1],
    });
    return () => run.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ignite, delay]);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <motion.img
        src={SRC}
        alt="Nucleus"
        width={size}
        height={size}
        draggable={false}
        className="h-full w-full select-none"
        style={{
          WebkitMaskImage: mask as unknown as string,
          maskImage: mask as unknown as string,
          filter,
        }}
        // No opacity fade: the mask is the reveal, and fading underneath it
        // just washes the sweep out into a generic dissolve.
        initial={ignite ? { scale: 1.04 } : false}
        animate={{ scale: 1 }}
        transition={{ duration: IGNITION_S, delay, ease: 'easeOut' }}
      />

      {/* The bloom the neon throws onto the black around it. Pure CSS — it has
          no business knowing what the participant is doing. */}
      {breathe && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-2xl"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.18), transparent 62%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: delay + 2.2 }}
        />
      )}
    </div>
  );
};

export default NucleusLogo;
