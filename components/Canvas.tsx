import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';

interface CanvasProps {
  width: number;
  height: number;
}

export interface CanvasRef {
  clear: () => void;
  getDataURL: () => string | null;
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ width, height }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  const getContext = () => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext('2d') : null;
  };

  useEffect(() => {
    const context = getContext();
    if (context) {
      context.fillStyle = 'white';
      context.fillRect(0, 0, width, height);
      context.strokeStyle = 'black';
      context.lineWidth = 2.5;
      context.lineCap = 'round';
      context.lineJoin = 'round';
    }
  }, [width, height]);
  
  const getCoords = (event: React.MouseEvent | React.TouchEvent) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      if ('touches' in event) {
        return {
          x: event.touches[0].clientX - rect.left,
          y: event.touches[0].clientY - rect.top,
        };
      }
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    const context = getContext();
    if (context) {
      const { x, y } = getCoords(event);
      context.beginPath();
      context.moveTo(x, y);
      setIsDrawing(true);
      setHasDrawing(true);
    }
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const context = getContext();
    if (context) {
      const { x, y } = getCoords(event);
      context.lineTo(x, y);
      context.stroke();
    }
  };

  const stopDrawing = () => {
    const context = getContext();
    if (context) {
      context.closePath();
    }
    setIsDrawing(false);
  };

  useImperativeHandle(ref, () => ({
    clear: () => {
      const context = getContext();
      if (context && canvasRef.current) {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        context.fillStyle = 'white';
        context.fillRect(0, 0, width, height);
        setHasDrawing(false);
      }
    },
    getDataURL: () => {
      if (!hasDrawing || !canvasRef.current) return null;
      return canvasRef.current.toDataURL('image/png');
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      className="bg-white rounded-lg shadow-inner border border-gray-300 touch-none"
    />
  );
});

export default Canvas;
