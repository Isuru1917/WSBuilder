import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { X } from 'lucide-react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';

// Register GSAP plugins
gsap.registerPlugin(Draggable);

import { imageStorageService } from '../../lib/supabase';

export interface ImageItem {
  id: string;
  src: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface ImageGalleryHandle {
  triggerUpload: () => void;
}

interface ImageGalleryProps {
  projectId: string;
  initialImages?: ImageItem[];
  onImagesChange?: (images: ImageItem[]) => void;
}

const ImageGallery = forwardRef<ImageGalleryHandle, ImageGalleryProps>(
  ({ projectId, initialImages = [], onImagesChange }, ref) => {
  const [images, setImages] = useState<ImageItem[]>(initialImages);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Notify parent on image changes
  useEffect(() => {
    if (onImagesChange) onImagesChange(images);
  }, [images, onImagesChange]);

  // Add image and upload to Supabase
  const addImageWithSupabase = useCallback(async (file: File) => {
    setUploadError(null);
    console.log('Starting image upload for file:', file.name, 'size:', file.size, 'type:', file.type);
    console.log('Project ID:', projectId);
    
    try {
      // Upload to Supabase
      const publicUrl = await imageStorageService.uploadImage(file, projectId);
      if (!publicUrl) {
        console.error('Upload failed: No public URL returned');
        setUploadError('Image upload failed. Please check your connection or Supabase settings.');
        return;
      }
      console.log('Upload successful, public URL:', publicUrl);
      
      // Get dimensions
      const img = new window.Image();
      img.onload = () => {
        const newImage: ImageItem = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          src: publicUrl,
          width: Math.min(300, img.width),
          height: Math.min(300, img.height),
          x: 10 + (images.length * 20) % 100,
          y: 10 + (images.length * 20) % 100
        };
        setImages(prevImages => [...prevImages, newImage]);
        setTimeout(() => {
          const newImageElement = document.querySelector(`[data-id="${newImage.id}"]`);
          if (newImageElement) {
            gsap.from(newImageElement, {
              scale: 0.5,
              opacity: 0,
              duration: 0.4,
              ease: "back.out(1.7)"
            });
          }
        }, 0);
      };
      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return;
    }
  }, [projectId, images.length]);

  // Setup paste event listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              addImageWithSupabase(blob);
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [addImageWithSupabase]);

  // Handle scroll-to-resize functionality
  const handleImageResize = useCallback((event: Event, imageId: string) => {
    // Cast to WheelEvent to get access to deltaY
    const e = event as WheelEvent;
    e.preventDefault(); // Prevent page scrolling
    
    // Find the image in our state
    const image = images.find(img => img.id === imageId);
    if (!image) return;
    
    // Determine resize amount based on scroll direction
    // Negative deltaY means scrolling up (make bigger), positive means scrolling down (make smaller)
    const resizeStep = 10; // pixels to resize per scroll step
    const deltaSize = e.deltaY < 0 ? resizeStep : -resizeStep;
    
    // Calculate new dimensions while maintaining aspect ratio
    const aspectRatio = image.width / image.height;
    let newWidth = Math.max(50, image.width + deltaSize);
    let newHeight = Math.max(50, Math.round(newWidth / aspectRatio));
    
    // If holding shift key, resize proportionally larger/smaller
    if (e.shiftKey) {
      newWidth = Math.max(50, image.width + deltaSize * 2);
      newHeight = Math.max(50, Math.round(newWidth / aspectRatio));
    }
    
    // Get the target element
    const target = document.querySelector(`[data-id="${imageId}"]`) as HTMLElement;
    if (!target) return;
    
    // Apply visual resize with animation
    gsap.to(target, {
      width: newWidth,
      height: newHeight,
      duration: 0.2,
      ease: "power1.out"
    });
    
    // Update state with new dimensions
    setImages(prevImages => 
      prevImages.map(img => 
        img.id === imageId 
          ? { ...img, width: newWidth, height: newHeight }
          : img
      )
    );
    
    // Show resize feedback
    const resizeIndicator = target.querySelector('.resize-indicator') as HTMLElement;
    if (resizeIndicator) {
      gsap.to(resizeIndicator, { opacity: 1, duration: 0.1 });
      gsap.to(resizeIndicator, { opacity: 0, duration: 0.3, delay: 0.7 });
    }
  }, [images]);

  // Setup draggable images when images change
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const imageElements = canvasContainerRef.current.querySelectorAll('.resizable-image');
    const wheelEventHandlers: { [key: string]: EventListener } = {};
    
    imageElements.forEach(element => {
      const imageId = element.getAttribute('data-id');
      if (!imageId) return;

      // Make each image draggable
      Draggable.create(element, {
        type: 'x,y',
        bounds: canvasContainerRef.current,
        edgeResistance: 0.65,
        inertia: true,
        zIndexBoost: true,
        cursor: 'move',
        onPress: function() {
          // Show resize indicator
          const resizeIndicator = this.target.querySelector('.resize-indicator');
          if (resizeIndicator) {
            gsap.to(resizeIndicator, { opacity: 1, duration: 0.2 });
            // Auto-hide after 1.5 seconds
            gsap.to(resizeIndicator, { opacity: 0, duration: 0.3, delay: 1.5 });
          }
        },
        onDragStart: function() {
          // Bring to front on drag
          gsap.set(this.target, { zIndex: 10 });
        },
        onDragEnd: function() {
          // Save position to state
          const x = this.x;
          const y = this.y;
          
          setImages(prevImages => 
            prevImages.map(img => 
              img.id === imageId ? { ...img, x, y } : img
            )
          );
        }
      });
      
      // Create a wheel event handler for this specific image
      const wheelHandler = (event: Event) => {
        handleImageResize(event, imageId);
      };
      
      // Store reference to the handler for cleanup
      wheelEventHandlers[imageId] = wheelHandler;
      
      // Add wheel/scroll event listener for resizing
      element.addEventListener('wheel', wheelHandler);
      
      // Show resize indicator on hover
      element.addEventListener('mouseenter', () => {
        const resizeIndicator = element.querySelector('.resize-indicator');
        if (resizeIndicator) {
          gsap.to(resizeIndicator, { opacity: 1, duration: 0.2 });
          // Auto-hide after 1.5 seconds
          gsap.to(resizeIndicator, { opacity: 0, duration: 0.3, delay: 1.5 });
        }
      });
    });
    
    // Cleanup function
    return () => {
      imageElements.forEach(element => {
        const imageId = element.getAttribute('data-id');
        if (imageId && wheelEventHandlers[imageId]) {
          element.removeEventListener('wheel', wheelEventHandlers[imageId]);
        }
      });
    };
  }, [images, handleImageResize]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(file => {
        addImageWithSupabase(file);
      });
    }
  };
  
  // Handle image upload button click
  const triggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Expose upload trigger to parent via ref
  useImperativeHandle(ref, () => ({
    triggerUpload
  }));

  // Remove image
  const removeImage = (id: string) => {
    // Find the image element
    const imageElement = document.querySelector(`[data-id="${id}"]`);
    
    if (imageElement) {
      // Animate removal
      gsap.to(imageElement, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          // Remove from state after animation
          setImages(prevImages => prevImages.filter(img => img.id !== id));
        }
      });
    } else {
      // Fallback if element not found
      setImages(prevImages => prevImages.filter(img => img.id !== id));
    }
  };

  const hasImages = images.length > 0;
  const hasError = !!uploadError;
  const shouldHaveVisualOutput = hasImages || hasError;

  return (
    <div ref={galleryRef} className={shouldHaveVisualOutput ? "" : ""}>
      {/* Upload options - button moved to action bar */}
      <div className={`flex items-center ${hasImages ? "mb-1" : ""}`}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*"
          multiple
        />
        {hasImages && (
          <div className="text-sm text-gray-500">
            <span>{images.length} image{images.length !== 1 ? 's' : ''} added - Drag to reposition, scroll to resize</span>
          </div>
        )}
      </div>
      {uploadError && (
        <div style={{ color: 'red', marginBottom: 8 }}>{uploadError}</div>
      )}
      {/* Canvas container with improved layout */}
      {hasImages && (
        <div 
          ref={canvasContainerRef} 
          className="image-canvas-container"
          style={{ 
            minHeight: Math.max(120, Math.max(...images.map(img => img.y + img.height)) + 30) + 'px',
            position: 'relative', 
            width: '100%',
            overflow: 'visible'
          }}
        >
          {images.map(image => (
            <div
              key={image.id}
              data-id={image.id}
              className="resizable-image cursor-move"
              style={{
                width: `${image.width}px`,
                height: `${image.height}px`,
                transform: `translate(${image.x}px, ${image.y}px)`,
                zIndex: 1,
                position: 'absolute'
              }}
            >
              <img 
                src={image.src} 
                className="w-full h-full object-contain"
                alt="Uploaded"
              />
              
              {/* Resize indicator - shows when scrolling is available */}
              <div className="resize-indicator absolute bottom-0 left-0 right-0 bg-blue-500 bg-opacity-70 text-white px-2 py-1 text-xs pointer-events-none text-center opacity-0">
                Scroll to resize
              </div>
              
              {/* Remove button */}
              <button 
                onClick={() => removeImage(image.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors z-10"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default ImageGallery;
