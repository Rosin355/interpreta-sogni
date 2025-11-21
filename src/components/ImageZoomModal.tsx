import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { toast } from "@/hooks/use-toast";

interface ImageZoomModalProps {
  src: string;
  alt: string;
  children?: React.ReactNode;
}

export const ImageZoomModal = ({ src, alt, children }: ImageZoomModalProps) => {
  const [open, setOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Swipe to close detection
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 150) {
      // Swipe up
      console.log('Swipe up detected');
    }
    
    if (touchEnd - touchStart > 150) {
      // Swipe down to close
      setOpen(false);
      toast({
        description: "Immagine chiusa",
      });
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sogno-${alt || 'immagine'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Successo",
        description: "Immagine scaricata!",
      });
    } catch (error) {
      console.error('Errore nel download:', error);
      toast({
        title: "Errore",
        description: "Impossibile scaricare l'immagine",
        variant: "destructive",
      });
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="cursor-zoom-in transition-all hover:opacity-90"
      >
        {children || (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover rounded-lg"
          />
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-full w-screen h-screen p-0 bg-black/95 backdrop-blur-xl border-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          ref={contentRef}
        >
          {/* Header Controls */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
              <span className="text-white text-sm font-medium truncate max-w-[200px]">
                {alt}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/20"
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>

          {/* Image with Zoom Controls */}
          <div className="w-full h-full flex items-center justify-center">
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={5}
              doubleClick={{
                mode: "zoomIn"
              }}
              wheel={{
                step: 0.1
              }}
              pinch={{
                step: 0.1
              }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  {/* Zoom Controls */}
                  <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => zoomIn()}
                      className="bg-white/90 hover:bg-white shadow-lg"
                    >
                      <ZoomIn className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => zoomOut()}
                      className="bg-white/90 hover:bg-white shadow-lg"
                    >
                      <ZoomOut className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => resetTransform()}
                      className="bg-white/90 hover:bg-white shadow-lg text-xs"
                    >
                      Reset
                    </Button>
                  </div>

                  <TransformComponent
                    wrapperClass="w-full h-full flex items-center justify-center"
                    contentClass="w-full h-full flex items-center justify-center"
                  >
                    <img
                      src={src}
                      alt={alt}
                      className="max-w-full max-h-full object-contain select-none"
                      draggable={false}
                    />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>

          {/* Bottom Hint */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white/60 text-xs text-center">
              📱 Pizzica per ingrandire • 👆 Scorri verso il basso per chiudere • 🖱️ Doppio click per zoom
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
