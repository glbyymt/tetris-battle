/** スマホ・タブレットなどタッチ主体の端末か */
export function isMobileDevice() {
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const narrowViewport = window.matchMedia("(max-width: 768px)").matches;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  return (coarsePointer && narrowViewport) || mobileUa;
}
