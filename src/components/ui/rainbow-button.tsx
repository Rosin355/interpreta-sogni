import { cn } from "@/lib/utils";

interface RainbowButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function RainbowButton({
  children,
  className,
  ...props
}: RainbowButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex h-12 animate-rainbow cursor-pointer items-center justify-center rounded-2xl border-0 bg-[length:200%] px-8 py-3 font-semibold text-white transition-all duration-700 [background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:calc(0.08*1rem)_solid_transparent] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 overflow-hidden",
        // before styles (glow)
        "before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))] before:bg-[length:200%] before:[filter:blur(calc(0.8*1rem))]",
        // Rainbow background
        "bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))]",
        "hover:scale-[1.02] active:scale-95",
        className,
      )}
      {...props}
    >
      {/* Glass Distortion Layer */}
      <div
        className="absolute inset-0 z-10 pointer-events-none opacity-60"
        style={{
          backdropFilter: "blur(2px)",
          filter: "url(#glass-distortion)",
          isolation: "isolate",
        }}
      />
      
      {/* Glossy Overlay */}
      <div
        className="absolute inset-0 z-20 rounded-inherit pointer-events-none"
        style={{ 
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 50%, rgba(255, 255, 255, 0.05) 100%)",
          boxShadow: "inset 1px 1px 1px 0 rgba(255, 255, 255, 0.3), inset -1px -1px 1px 0 rgba(255, 255, 255, 0.1)"
        }}
      />

      {/* Content */}
      <span className="relative z-30 flex items-center gap-2">
        {children}
      </span>
    </button>
  );
}
