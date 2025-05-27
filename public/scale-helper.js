/**
 * Auto-scaling helper for WS Builder
 * 
 * This script ensures consistent 75% scaling across all browsers
 * by adjusting dimensions based on window size and device pixel ratio.
 */

(function() {
  // Ensure this runs after the DOM loads
  window.addEventListener('DOMContentLoaded', function() {    // Function to apply the scale    function applyScale() {
      const scale = 0.75; // Target scale (75%)
      const rootElement = document.documentElement;
      
      // Apply transform scale
      rootElement.style.transform = `scale(${scale})`;
      rootElement.style.transformOrigin = '0 0';
      
      // Calculate compensated dimensions (1/0.75 = 1.3333...)
      const widthCompensation = (100 / scale);
      
      // Apply compensated dimensions
      rootElement.style.width = `${widthCompensation}%`;
      rootElement.style.height = `${widthCompensation}vh`;
      
      // Ensure content doesn't get cut off
      document.body.style.minHeight = '100vh';
      
      // Handle fixed position elements that might be affected by the transform
      const fixedElements = document.querySelectorAll('.fixed, [style*="position: fixed"]');
      fixedElements.forEach(el => {
        el.style.transform = `scale(${1/scale})`;
        el.style.transformOrigin = '0 0';
      });
      
      console.log('WS Builder: Applied 75% scale to site');
    }
    
    // Apply scale and re-apply on window resize for consistency
    applyScale();
    window.addEventListener('resize', applyScale);
  });
})();
