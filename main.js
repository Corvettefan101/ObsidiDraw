const { Plugin, PluginSettingTab, Setting } = require('obsidian');

const DEFAULT_SETTINGS = {
    penColor: '#000000',
    penWidth: 2,
    eraserSize: 10,
    showToolbar: true
};

module.exports = class FreehandNotesPlugin extends Plugin {
    async onload() {
        // Corrected: Add loadSettings method
        await this.loadSettings();

        // Add ribbon icon to activate drawing mode
        this.addRibbonIcon('pencil', 'Freehand Notes', () => {
            this.initializeDrawingCanvas();
        });

        // Register settings tab
        this.addSettingTab(new FreehandNotesSettingTab(this.app, this));
    }

    // Added loadSettings method
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    // Added saveSettings method
    async saveSettings() {
        await this.saveData(this.settings);
    }

    async initializeDrawingCanvas() {
        // Create full-screen canvas overlay
        this.canvas = document.createElement('canvas');
        this.canvas.classList.add('freehand-notes-canvas');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '9999';
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Get 2D rendering context
        this.ctx = this.canvas.getContext('2d');

        // Load existing drawing if it exists
        await this.loadDrawing();

        // Create toolbar
        this.createToolbar();

        // Add event listeners for drawing
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

        // Append canvas to body
        document.body.appendChild(this.canvas);

        // Create save and close buttons
        const actionContainer = document.createElement('div');
        actionContainer.style.position = 'fixed';
        actionContainer.style.top = '10px';
        actionContainer.style.right = '10px';
        actionContainer.style.zIndex = '10000';
        actionContainer.style.display = 'flex';
        actionContainer.style.gap = '10px';

        // Save button
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.addEventListener('click', () => this.saveDrawing());

        // Close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(this.canvas);
            document.body.removeChild(this.toolbarEl);
            document.body.removeChild(actionContainer);
        });

        actionContainer.appendChild(saveButton);
        actionContainer.appendChild(closeButton);
        document.body.appendChild(actionContainer);
    }

    async saveDrawing() {
        try {
            // Convert canvas to base64 image data
            const imageData = this.canvas.toDataURL();
            
            // Save to plugin data
            await this.saveData({
                drawing: imageData,
                timestamp: Date.now()
            });

            new Obsidian.Notice('Drawing saved successfully!');
        } catch (error) {
            console.error('Failed to save drawing:', error);
            new Obsidian.Notice('Failed to save drawing');
        }
    }

    async loadDrawing() {
        try {
            // Retrieve saved data
            const savedData = await this.loadData();
            
            if (savedData && savedData.drawing) {
                // Create an image to load the saved drawing
                const img = new Image();
                img.onload = () => {
                    // Clear canvas and draw saved image
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx.drawImage(img, 0, 0);
                };
                img.src = savedData.drawing;
            }
        } catch (error) {
            console.error('Failed to load drawing:', error);
        }
    }

    createToolbar() {
        this.toolbarEl = document.createElement('div');
        this.toolbarEl.classList.add('freehand-notes-toolbar');
        this.toolbarEl.style.position = 'fixed';
        this.toolbarEl.style.top = '10px';
        this.toolbarEl.style.left = '10px';
        this.toolbarEl.style.zIndex = '10000';
        this.toolbarEl.style.display = 'flex';
        this.toolbarEl.style.gap = '10px';

        // Pen tool button
        const penButton = this.createToolbarButton('✏️', () => {
            this.currentTool = 'pen';
            this.ctx.globalCompositeOperation = 'source-over';
        });

        // Eraser tool button
        const eraserButton = this.createToolbarButton('🧽', () => {
            this.currentTool = 'eraser';
            this.ctx.globalCompositeOperation = 'destination-out';
        });

        // Color picker
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = this.settings.penColor;
        colorPicker.addEventListener('change', (e) => {
            this.settings.penColor = e.target.value;
        });

        // Pen width slider
        const penWidthSlider = document.createElement('input');
        penWidthSlider.type = 'range';
        penWidthSlider.min = '1';
        penWidthSlider.max = '20';
        penWidthSlider.value = this.settings.penWidth.toString();
        penWidthSlider.addEventListener('input', (e) => {
            this.settings.penWidth = parseInt(e.target.value);
        });

        this.toolbarEl.appendChild(penButton);
        this.toolbarEl.appendChild(eraserButton);
        this.toolbarEl.appendChild(colorPicker);
        this.toolbarEl.appendChild(penWidthSlider);

        document.body.appendChild(this.toolbarEl);
    }

    createToolbarButton(emoji, onClick) {
        const button = document.createElement('button');
        button.textContent = emoji;
        button.addEventListener('click', onClick);
        return button;
    }

    startDrawing(e) {
        this.isDrawing = true;
        this.draw(e);
    }

    draw(e) {
        if (!this.isDrawing) return;

        this.ctx.strokeStyle = this.settings.penColor;
        this.ctx.lineWidth = this.settings.penWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.lineTo(e.clientX, e.clientY);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(e.clientX, e.clientY);
    }

    stopDrawing() {
        this.isDrawing = false;
        this.ctx.beginPath();
    }
};

class FreehandNotesSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Clear Saved Drawing')
            .setDesc('Permanently delete the last saved drawing')
            .addButton(btn => btn
                .setButtonText('Clear Drawing')
                .setCta()
                .onClick(async () => {
                    await this.plugin.saveData(null);
                    new Obsidian.Notice('Saved drawing has been cleared');
                }));
    }
}