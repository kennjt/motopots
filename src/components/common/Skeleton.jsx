import { useEffect, useRef, useState } from "react";

export function Skeleton({ className = "" }) {
  return <span aria-hidden="true" className={`mp-skeleton ${className}`} />;
}

export function SkeletonText({ lines = 2, className = "" }) {
  return <div aria-hidden="true" className={`space-y-2 ${className}`}>{Array.from({ length: lines }, (_, index) => <Skeleton key={index} className={`h-3 ${index === lines - 1 ? "w-2/3" : "w-full"}`} />)}</div>;
}

export function MenuGridSkeleton({ count = 8 }) {
  return <div aria-busy="true" aria-label="Loading menu items" className="grid grid-cols-1 gap-x-8 gap-y-20 pt-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: count }, (_, index) => <article key={index} className="relative flex min-h-[250px] flex-col rounded-2xl border border-white/10 bg-[#15151C] px-5 pb-5 pt-28">
      <Skeleton className="absolute -top-20 left-1/2 h-[190px] w-[190px] -translate-x-1/2 rounded-full" />
      <div className="mt-auto flex flex-col items-center gap-3"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-10 w-10 self-end rounded-xl" /></div>
    </article>)}
  </div>;
}

export function ImageWithSkeleton({ src, alt = "", className = "", skeletonClassName = "", fallbackClassName = "", ...props }) {
  const imageRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (imageRef.current?.complete) {
      // Cached images can finish before React attaches the load listener.
      setLoaded(imageRef.current.naturalWidth > 0);
      setFailed(imageRef.current.naturalWidth === 0);
    }
  }, [src]);

  return <span className="relative block h-full w-full" aria-busy={!loaded && !failed}>
    {!loaded && !failed && <Skeleton className={`absolute inset-0 ${skeletonClassName}`} />}
    {failed ? <span role="img" aria-label={alt || "Image unavailable"} className={`flex h-full w-full items-center justify-center rounded-xl border border-white/10 bg-[#22222B] px-3 text-center text-xs text-[#A1A1AA] ${fallbackClassName}`}>Image unavailable</span> : <img ref={imageRef} src={src} alt={alt} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className={`relative h-full w-full transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className}`} {...props} />}
  </span>;
}
