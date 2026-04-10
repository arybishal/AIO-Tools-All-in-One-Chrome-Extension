/**
 * AIO Screenshot Editor
 * Full-featured screenshot editor
 * Version 1.0-beta
 * Author: Bishal Aryal
 */

class ScreenshotEditor {
  constructor() {
    this.canvas = document.getElementById('screenshotCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvasWrapper = document.querySelector('.canvas-wrapper');
    
    // State
    this.currentTool = 'select';
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.lastX = 0;
    this.lastY = 0;
    
    // History
    this.undoStack = [];
    this.redoStack = [];
    
    // Settings
    this.brushColor = '#dc143c';
    this.brushSize = 4;
    this.fontSize = 16;
    this.textColor = '#dc143c';
    
    // Crop
    this.cropStart = null;
    this.cropEnd = null;
    
    // Drawing shapes
    this.shapes = [];
    this.currentShape = null;
    
    // Initialize
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.loadScreenshot();
    this.updateStatus('Ready');
  }
  
  bindEvents() {
    // Tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => this.selectTool(btn.dataset.tool));
    });
    
    // Color picker
    document.getElementById('markerColor').addEventListener('input', (e) => {
      this.brushColor = e.target.value;
      this.textColor = e.target.value;
      this.updateColorPresets();
    });
    
    // Color presets
    document.querySelectorAll('.color-preset').forEach(preset => {
      preset.addEventListener('click', () => {
        const color = preset.dataset.color;
        this.brushColor = color;
        this.textColor = color;
        document.getElementById('markerColor').value = color;
        this.updateColorPresets();
      });
    });
    
    // Brush size
    document.getElementById('brushSize').addEventListener('input', (e) => {
      this.brushSize = parseInt(e.target.value);
      document.getElementById('brushSizeValue').textContent = `${this.brushSize}px`;
    });
    
    // Font size
    document.getElementById('fontSize').addEventListener('change', (e) => {
      this.fontSize = parseInt(e.target.value);
    });
    
    // Text input
    document.getElementById('textInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addText(e.target.value);
        e.target.value = '';
      }
    });
    
    // Canvas events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
    
    // Touch events
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    
    // Action buttons
    document.getElementById('btnUndo').addEventListener('click', () => this.undo());
    document.getElementById('btnRedo').addEventListener('click', () => this.redo());
    document.getElementById('btnDownloadScreenshot').addEventListener('click', () => this.download());
    document.getElementById('btnCloseEditor').addEventListener('click', () => this.close());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        this.undo();
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        this.redo();
      }
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }
  
  async loadScreenshot() {
    try {
      // Get screenshot data from chrome.storage.local (shared across extension)
      const result = await chrome.storage.local.get(['aio-screenshot']);
      const screenshotData = result['aio-screenshot'];
      
      if (screenshotData) {
        const img = new Image();
        img.onload = () => {
          this.canvas.width = img.width;
          this.canvas.height = img.height;
          this.ctx.drawImage(img, 0, 0);
          this.saveState();
          this.updateCanvasInfo();
          this.updateStatus('Screenshot loaded');
          // Clear the storage after loading
          chrome.storage.local.remove(['aio-screenshot']);
        };
        img.src = screenshotData;
      } else {
        this.updateStatus('No screenshot data found');
      }
    } catch (error) {
      console.error('Error loading screenshot:', error);
      this.updateStatus('Error loading screenshot');
    }
  }
  
  selectTool(tool) {
    this.currentTool = tool;
    
    // Update UI
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    
    // Show/hide crop overlay
    const cropOverlay = document.getElementById('cropOverlay');
    if (tool === 'crop') {
      cropOverlay.classList.remove('hidden');
      this.updateStatus('Click and drag to select crop area');
    } else {
      cropOverlay.classList.add('hidden');
      this.updateStatus(`Tool: ${tool}`);
    }
  }
  
  updateColorPresets() {
    document.querySelectorAll('.color-preset').forEach(preset => {
      preset.classList.toggle('active', preset.dataset.color === this.brushColor);
    });
  }
  
  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }
  
  handleMouseDown(e) {
    if (e.button !== 0) return;
    
    const coords = this.getCanvasCoords(e);
    this.isDrawing = true;
    this.startX = coords.x;
    this.startY = coords.y;
    this.lastX = coords.x;
    this.lastY = coords.y;
    
    switch (this.currentTool) {
      case 'marker':
        this.ctx.beginPath();
        this.ctx.moveTo(coords.x, coords.y);
        break;
        
      case 'eraser':
        this.ctx.beginPath();
        this.ctx.moveTo(coords.x, coords.y);
        break;
        
      case 'text':
        const text = document.getElementById('textInput').value.trim();
        if (text) {
          this.drawText(coords.x, coords.y, text);
          document.getElementById('textInput').value = '';
        }
        break;
        
      case 'rect':
      case 'circle':
      case 'arrow':
        this.currentShape = {
          type: this.currentTool,
          startX: coords.x,
          startY: coords.y,
          endX: coords.x,
          endY: coords.y,
          color: this.brushColor,
          size: this.brushSize
        };
        break;
    }
  }
  
  handleMouseMove(e) {
    if (!this.isDrawing) return;
    
    const coords = this.getCanvasCoords(e);
    
    switch (this.currentTool) {
      case 'marker':
        this.ctx.strokeStyle = this.brushColor;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(coords.x, coords.y);
        this.ctx.stroke();
        this.lastX = coords.x;
        this.lastY = coords.y;
        break;
        
      case 'eraser':
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = this.brushSize * 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(coords.x, coords.y);
        this.ctx.stroke();
        this.ctx.globalCompositeOperation = 'source-over';
        this.lastX = coords.x;
        this.lastY = coords.y;
        break;
        
      case 'rect':
      case 'circle':
      case 'arrow':
        if (this.currentShape) {
          this.currentShape.endX = coords.x;
          this.currentShape.endY = coords.y;
          this.redrawCanvas();
          this.drawShape(this.currentShape);
        }
        break;
    }
  }
  
  handleMouseUp(e) {
    if (!this.isDrawing) return;
    
    const coords = this.getCanvasCoords(e);
    
    switch (this.currentTool) {
      case 'marker':
      case 'eraser':
        this.ctx.closePath();
        this.saveState();
        break;
        
      case 'rect':
      case 'circle':
      case 'arrow':
        if (this.currentShape) {
          this.currentShape.endX = coords.x;
          this.currentShape.endY = coords.y;
          this.shapes.push({ ...this.currentShape });
          this.currentShape = null;
          this.saveState();
        }
        break;
    }
    
    this.isDrawing = false;
  }
  
  // Touch handlers
  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.canvas.dispatchEvent(mouseEvent);
  }
  
  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.canvas.dispatchEvent(mouseEvent);
  }
  
  handleTouchEnd(e) {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    this.canvas.dispatchEvent(mouseEvent);
  }
  
  drawShape(shape) {
    this.ctx.strokeStyle = shape.color;
    this.ctx.lineWidth = shape.size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    const { startX, startY, endX, endY } = shape;
    
    switch (shape.type) {
      case 'rect':
        this.ctx.strokeRect(startX, startY, endX - startX, endY - startY);
        break;
        
      case 'circle':
        const centerX = (startX + endX) / 2;
        const centerY = (startY + endY) / 2;
        const radiusX = Math.abs(endX - startX) / 2;
        const radiusY = Math.abs(endY - startY) / 2;
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
        
      case 'arrow':
        const headLength = 20;
        const angle = Math.atan2(endY - startY, endX - startX);
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
        // Arrow head
        this.ctx.beginPath();
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(
          endX - headLength * Math.cos(angle - Math.PI / 6),
          endY - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(
          endX - headLength * Math.cos(angle + Math.PI / 6),
          endY - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.stroke();
        break;
    }
  }
  
  drawText(x, y, text) {
    this.ctx.font = `${this.fontSize}px 'Segoe UI', sans-serif`;
    this.ctx.fillStyle = this.textColor;
    this.ctx.fillText(text, x, y);
    this.saveState();
  }
  
  redrawCanvas() {
    // Restore to the last saved state
    if (this.undoStack.length > 0) {
      const img = new Image();
      img.onload = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);
      };
      img.src = this.undoStack[this.undoStack.length - 1];
    }
  }
  
  saveState() {
    const dataUrl = this.canvas.toDataURL();
    this.undoStack.push(dataUrl);
    this.redoStack = [];
    
    // Limit stack size
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }
  
  undo() {
    if (this.undoStack.length > 1) {
      this.redoStack.push(this.undoStack.pop());
      this.restoreState(this.undoStack[this.undoStack.length - 1]);
      this.updateStatus('Undo');
    }
  }
  
  redo() {
    if (this.redoStack.length > 0) {
      const state = this.redoStack.pop();
      this.undoStack.push(state);
      this.restoreState(state);
      this.updateStatus('Redo');
    }
  }
  
  restoreState(dataUrl) {
    const img = new Image();
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  }
  
  async download() {
    const dataUrl = this.canvas.toDataURL('image/png');
    
    // Use File System Access API if available, otherwise use traditional download
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `aio-screenshot-${new Date().toISOString().slice(0, 10)}.png`,
          types: [{
            description: 'PNG Image',
            accept: { 'image/png': ['.png'] }
          }]
        });
        
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        this.updateStatus('Screenshot saved!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Save failed:', err);
          this.fallbackDownload(dataUrl);
        }
      }
    } else {
      this.fallbackDownload(dataUrl);
    }
  }
  
  fallbackDownload(dataUrl) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `aio-screenshot-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.updateStatus('Screenshot downloaded!');
  }
  
  close() {
    // Close the editor window/tab
    if (window.opener) {
      window.close();
    } else {
      // If opened in same tab, redirect back
      window.location.href = 'about:blank';
      window.close();
    }
  }
  
  updateStatus(message) {
    document.getElementById('statusText').textContent = message;
  }
  
  updateCanvasInfo() {
    document.getElementById('canvasInfo').textContent = 
      `${this.canvas.width} × ${this.canvas.height}px`;
  }
}

// Initialize editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ScreenshotEditor();
});