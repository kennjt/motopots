import { useEffect, useRef, useState } from "react";

function Reveal({ children, className = "", delay = 0, scale = false }) {
  const elementRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener?.("change", updateMotionPreference);

    return () => mediaQuery.removeEventListener?.("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (!elementRef.current) return undefined;
    if (reducedMotion) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div
      ref={elementRef}
      className={`mp-reveal ${scale ? "mp-reveal-scale" : ""} ${visible ? "mp-reveal-visible" : ""} ${className}`}
      style={{ "--mp-reveal-delay": `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default Reveal;
