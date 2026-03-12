export function HelpTooltip() {
  return (
    <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-full text-[11px] font-medium text-gray-600 shadow-lg border border-gray-200/60 pointer-events-none z-10 flex items-center gap-2">
      Right-click drag to pan 
      <span className="text-gray-300">|</span>
      Scroll to zoom
      <span className="text-gray-300">|</span>
      Esc to cancel
      <span className="text-gray-300">|</span>
      Del to delete
    </div>
  );
}
