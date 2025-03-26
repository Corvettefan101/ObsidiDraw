import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface FreehandNotesSettings {
	penColor: string;
	penWidth: number;
	eraserSize: number;
	showToolbar: boolean;
}

const DEFAULT_SETTINGS: FreehandNotesSettings = {
	penColor: '#000000',
	penWidth: 2,
	eraserSize: 10,
	showToolbar: true
}

export default class FreehandNotesPlugin extends Plugin {
	settings: FreehandNotesSettings;
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	toolbarEl: HTMLDivElement;
	isDrawing: boolean = false;
	currentTool: 'pen' | 'eraser' | 'select' = 'pen';

	async onload() {
		await this.loadSettings();

		// Add ribbon icon to activate drawing mode
		this.addRibbonIcon('pencil', 'Freehand Notes', () => {
			this.initializeDrawingCanvas();
		});

		// Register settings tab
		this.addSettingTab(new FreehandNotesSettingTab(this.app, this));
	}

	initializeDrawingCanvas() {
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
		this.ctx = this.canvas.getContext('2d')!;

		// Create toolbar
		this.createToolbar();

		// Add event listeners for drawing
		this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
		this.canvas.addEventListener('mousemove', this.draw.bind(this));
		this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
		this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

		// Append canvas to body
		document.body.appendChild(this.canvas);

		// Create close button
		const closeButton = document.createElement('button');
		closeButton.textContent = 'Close';
		closeButton.style.position = 'fixed';
		closeButton.style.top = '10px';
		closeButton.style.right = '10px';
		closeButton.style.zIndex = '10000';
		closeButton.addEventListener('click', () => {
			document.body.removeChild(this.canvas);
			document.body.removeChild(this.toolbarEl);
			document.body.removeChild(closeButton);
		});

		document.body.appendChild(closeButton);
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
			this.settings.penColor = (e.target as HTMLInputElement).value;
		});

		// Pen width slider
		const penWidthSlider = document.createElement('input');
		penWidthSlider.type = 'range';
		penWidthSlider.min = '1';
		penWidthSlider.max = '20';
		penWidthSlider.value = this.settings.penWidth.toString();
		penWidthSlider.addEventListener('input', (e) => {
			this.settings.penWidth = parseInt((e.target as HTMLInputElement).value);
		});

		this.toolbarEl.appendChild(penButton);
		this.toolbarEl.appendChild(eraserButton);
		this.toolbarEl.appendChild(colorPicker);
		this.toolbarEl.appendChild(penWidthSlider);

		document.body.appendChild(this.toolbarEl);
	}

	createToolbarButton(emoji: string, onClick: () => void) {
		const button = document.createElement('button');
		button.textContent = emoji;
		button.addEventListener('click', onClick);
		return button;
	}

	startDrawing(e: MouseEvent) {
		this.isDrawing = true;
		this.draw(e);
	}

	draw(e: MouseEvent) {
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

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class FreehandNotesSettingTab extends PluginSettingTab {
	plugin: FreehandNotesPlugin;

	constructor(app: App, plugin: FreehandNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Pen Color')
			.setDesc('Default color for drawing')
			.addColorPicker(cb => cb
				.setValue(this.plugin.settings.penColor)
				.onChange(async (value) => {
					this.plugin.settings.penColor = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Pen Width')
			.setDesc('Default width of the drawing pen')
			.addSlider(sl => sl
				.setLimits(1, 20, 1)
				.setValue(this.plugin.settings.penWidth)
				.onChange(async (value) => {
					this.plugin.settings.penWidth = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show Toolbar')
			.setDesc('Toggle visibility of drawing toolbar')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showToolbar)
				.onChange(async (value) => {
					this.plugin.settings.showToolbar = value;
					await this.plugin.saveSettings();
				}));
	}
}
