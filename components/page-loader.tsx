"use client";

import { useEffect, useState } from "react";

/**
 * Full-screen splash shown on the initial (hard) page load. It displays the
 * venue logo with an animated progress bar, then fades out once the window has
 * finished loading its resources. Soft client-side navigations do not re-trigger
 * it because the component is mounted once from the root layout.
 */
export function PageLoader() {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    let finished = false;
    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      if (finished) return;
      const elapsed = now - start;
      // Ease quickly toward ~90% and slow down, leaving the last stretch for
      // the real "load" event so the bar never sits full while assets finish.
      const target = 90 * (1 - Math.exp(-elapsed / 1100));
      setProgress((prev) => (target > prev ? target : prev));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      setProgress(100);
      setDone(true);
      // Allow the fade-out transition to play before unmounting.
      window.setTimeout(() => setRemoved(true), 650);
    };

    if (document.readyState === "complete") {
      window.setTimeout(finish, 450);
    } else {
      window.addEventListener("load", finish, { once: true });
    }

    // Safety net so the splash can never get stuck if "load" never fires.
    const fallback = window.setTimeout(finish, 7000);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", finish);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (removed) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [removed]);

  if (removed) return null;

  return (
    <div
      className={`page-loader${done ? " page-loader--done" : ""}`}
      role="status"
      aria-label="Loading the page"
    >
      <div className="page-loader__inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/court-logo.png"
          alt=""
          width={168}
          height={168}
          fetchPriority="high"
          className="page-loader__logo"
        />
        <div className="page-loader__bar">
          <span
            className="page-loader__bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="page-loader__pct" aria-hidden="true">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}
