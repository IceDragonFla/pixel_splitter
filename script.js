class PixelSplitter {
    constructor() {
        this.mainCanvas = document.getElementById('mainCanvas');
        this.guidelineCanvas = document.getElementById('guidelineCanvas');
        this.mainCtx = this.mainCanvas.getContext('2d');
        this.guideCtx = this.guidelineCanvas.getContext('2d');
        
        // 设置画布大小
        this.width = 800;
        this.height = 600;
        this.mainCanvas.width = this.width;
        this.mainCanvas.height = this.height;
        this.guidelineCanvas.width = this.width;
        this.guidelineCanvas.height = this.height;
        
        // 辅助线数据
        this.guidelines = {
            vertical: {
                center: this.width / 2,
                left: this.width / 2 - 50,
                right: this.width / 2 + 50
            },
            horizontal: {
                center: this.height / 2,
                top: this.height / 2 - 50,
                bottom: this.height / 2 + 50
            }
        };
        
        this.isDragging = false;
        this.selectedLine = null;
        
        // 添加新的属性
        this.dragOffset = 5; // 判断是否点击到线的范围
        this.processedImage = null; // 存储处理后的图片
        this.originalImage = null; // 存储原始图片
        
        // 添加图片变换相关属性
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDraggingImage = false;
        this.lastX = 0;
        this.lastY = 0;
        
        // 保存原始图片信息
        this.originalImage = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        
        // 放大镜相关
        this.magnifierEnabled = false;
        this.magnifier = document.getElementById('magnifier');
        this.magnifierCanvas = document.getElementById('magnifierCanvas');
        this.magnifierCtx = this.magnifierCanvas.getContext('2d');
        this.magnifierZoom = 4;
        
        // 设置放大镜画布大小
        this.magnifierCanvas.width = 200;
        this.magnifierCanvas.height = 200;
        
        // 编辑相关属性
        this.editCanvas = document.getElementById('editCanvas');
        this.editCtx = this.editCanvas.getContext('2d');
        this.editCanvas.width = this.width;
        this.editCanvas.height = this.height;
        
        // 默认禁用编辑画布的事件
        this.editCanvas.style.pointerEvents = 'none';
        
        this.currentTool = 'pencil';
        this.currentColor = null;
        this.isDrawing = false;
        this.pixelSize = 1;
        this.colorPalette = new Set();
        
        // 撤销/重做历史
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        
        // 添加编辑模式属性
        this.editMode = false;
        
        // 初始化编辑工具
        this.initEditTools();
        
        this.initEventListeners();
        this.drawGuidelines();
    }

    initEventListeners() {
        // 图片上传处理
        document.getElementById('imageInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        this.originalImage = img;
                        this.originalWidth = img.width;
                        this.originalHeight = img.height;
                        this.resetImagePosition();
                        this.updateImageDisplay();
                        document.getElementById('imageSize').textContent = 
                            `${img.width} x ${img.height}`;
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        // 缩放控制
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.scale *= 1.2;
            this.updateImageDisplay();
        });

        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.scale /= 1.2;
            this.updateImageDisplay();
        });

        // 重置按钮
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetImagePosition();
        });

        // 图片拖动
        this.mainCanvas.addEventListener('mousedown', this.handleImageDragStart.bind(this));
        this.mainCanvas.addEventListener('mousemove', this.handleImageDrag.bind(this));
        this.mainCanvas.addEventListener('mouseup', this.handleImageDragEnd.bind(this));
        this.mainCanvas.addEventListener('mouseleave', this.handleImageDragEnd.bind(this));

        // 辅助线拖拽
        this.guidelineCanvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.guidelineCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.guidelineCanvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // 放大镜控制
        document.getElementById('toggleMagnifier').addEventListener('click', () => {
            this.magnifierEnabled = !this.magnifierEnabled;
            document.getElementById('toggleMagnifier').textContent = 
                this.magnifierEnabled ? '关闭放大镜' : '开启放大镜';
            this.magnifier.style.display = this.magnifierEnabled ? 'block' : 'none';
        });
        
        document.getElementById('magnifierZoom').addEventListener('change', (e) => {
            this.magnifierZoom = parseInt(e.target.value);
        });
        
        // 放大镜移动
        this.guidelineCanvas.addEventListener('mousemove', this.updateMagnifier.bind(this));
        this.guidelineCanvas.addEventListener('mouseleave', () => {
            this.magnifier.style.display = 'none';
        });
        this.guidelineCanvas.addEventListener('mouseenter', () => {
            if (this.magnifierEnabled) {
                this.magnifier.style.display = 'block';
            }
        });

        // 添加编辑模式切换按钮事件
        document.getElementById('toggleEditMode').addEventListener('click', () => {
            this.toggleEditMode();
        });
    }

    drawGuidelines() {
        this.guideCtx.clearRect(0, 0, this.width, this.height);
        this.guideCtx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.guideCtx.lineWidth = 1;

        // 绘制垂直线
        this.drawLine(this.guidelines.vertical.center, 0, this.guidelines.vertical.center, this.height);
        this.drawLine(this.guidelines.vertical.left, 0, this.guidelines.vertical.left, this.height);
        this.drawLine(this.guidelines.vertical.right, 0, this.guidelines.vertical.right, this.height);

        // 绘制水平线
        this.drawLine(0, this.guidelines.horizontal.center, this.width, this.guidelines.horizontal.center);
        this.drawLine(0, this.guidelines.horizontal.top, this.width, this.guidelines.horizontal.top);
        this.drawLine(0, this.guidelines.horizontal.bottom, this.width, this.guidelines.horizontal.bottom);
    }

    drawLine(x1, y1, x2, y2) {
        this.guideCtx.beginPath();
        this.guideCtx.moveTo(x1, y1);
        this.guideCtx.lineTo(x2, y2);
        this.guideCtx.stroke();
    }

    handleMouseDown(e) {
        const rect = this.guidelineCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 检查是否点击到垂直辅助线
        if (Math.abs(x - this.guidelines.vertical.left) <= this.dragOffset) {
            this.isDragging = true;
            this.selectedLine = { type: 'vertical', position: 'left' };
        } else if (Math.abs(x - this.guidelines.vertical.right) <= this.dragOffset) {
            this.isDragging = true;
            this.selectedLine = { type: 'vertical', position: 'right' };
        } else if (Math.abs(x - this.guidelines.vertical.center) <= this.dragOffset) {
            this.isDragging = true;
            this.selectedLine = { type: 'vertical', position: 'center' };
        }

        // 检查是否点击到水平辅助线
        if (Math.abs(y - this.guidelines.horizontal.top) <= this.dragOffset) {
            this.isDragging = true;
            this.selectedLine = { type: 'horizontal', position: 'top' };
        } else if (Math.abs(y - this.guidelines.horizontal.bottom) <= this.dragOffset) {
            this.isDragging = true;
            this.selectedLine = { type: 'horizontal', position: 'bottom' };
        } else if (Math.abs(y - this.guidelines.horizontal.center) <= this.dragOffset) {
            this.isDragging = true;
            this.selectedLine = { type: 'horizontal', position: 'center' };
        }
    }

    handleMouseMove(e) {
        if (!this.isDragging || !this.selectedLine) return;

        const rect = this.guidelineCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.selectedLine.type === 'vertical') {
            if (this.selectedLine.position === 'center') {
                // 移动中心线时,同时移动两侧辅助线
                const oldCenter = this.guidelines.vertical.center;
                const diff = x - oldCenter;
                this.guidelines.vertical.center = x;
                this.guidelines.vertical.left += diff;
                this.guidelines.vertical.right += diff;
            } else {
                // 移动侧边线时,保持对称
                const distance = Math.abs(x - this.guidelines.vertical.center);
                if (this.selectedLine.position === 'left') {
                    this.guidelines.vertical.left = x;
                    this.guidelines.vertical.right = this.guidelines.vertical.center + distance;
                } else {
                    this.guidelines.vertical.right = x;
                    this.guidelines.vertical.left = this.guidelines.vertical.center - distance;
                }
            }
        } else {
            if (this.selectedLine.position === 'center') {
                // 移动中心线时,同时移动上下辅助线
                const oldCenter = this.guidelines.horizontal.center;
                const diff = y - oldCenter;
                this.guidelines.horizontal.center = y;
                this.guidelines.horizontal.top += diff;
                this.guidelines.horizontal.bottom += diff;
            } else {
                // 移动上下线时,保持对称
                const distance = Math.abs(y - this.guidelines.horizontal.center);
                if (this.selectedLine.position === 'top') {
                    this.guidelines.horizontal.top = y;
                    this.guidelines.horizontal.bottom = this.guidelines.horizontal.center + distance;
                } else {
                    this.guidelines.horizontal.bottom = y;
                    this.guidelines.horizontal.top = this.guidelines.horizontal.center - distance;
                }
            }
        }

        this.drawGuidelines();
    }

    handleMouseUp() {
        this.isDragging = false;
        this.selectedLine = null;
    }

    processImage() {
        if (!this.originalImage) return;
        
        // 计算图片在画布上的实际位置和大小
        const imageRect = {
            x: this.offsetX,
            y: this.offsetY,
            width: this.originalWidth * this.scale,
            height: this.originalHeight * this.scale
        };

        // 计算中心交叉区域的四个方格大小，使用精确值
        const standardPixelSize = {
            width: (this.guidelines.vertical.right - this.guidelines.vertical.left) / 2,
            height: (this.guidelines.horizontal.bottom - this.guidelines.horizontal.top) / 2
        };

        // 使用精确的像素大小，避免舍入误差
        const pixelSize = Math.min(standardPixelSize.width, standardPixelSize.height) / this.scale;
        
        // 使用ceil来确保覆盖整个图片
        const cols = Math.ceil(this.originalWidth / pixelSize);
        const rows = Math.ceil(this.originalHeight / pixelSize);

        // 更新显示
        document.getElementById('gridSize').textContent = `${cols} x ${rows}`;
        document.getElementById('selectionArea').textContent = 
            `像素大小: ${pixelSize.toFixed(2)}px`;

        // 创建画布
        const sourceCanvas = document.createElement('canvas');
        const sourceCtx = sourceCanvas.getContext('2d');
        sourceCanvas.width = this.originalWidth;
        sourceCanvas.height = this.originalHeight;
        sourceCtx.drawImage(this.originalImage, 0, 0);

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = cols;
        tempCanvas.height = rows;

        // 使用双线性插值进行采样
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // 计算精确的采样区域
                const sampleX = col * pixelSize;
                const sampleY = row * pixelSize;
                
                // 使用子像素采样来提高精度
                const subPixels = 4; // 将每个像素区域分成16个子区域
                const colors = [];
                
                for (let sy = 0; sy < subPixels; sy++) {
                    for (let sx = 0; sx < subPixels; sx++) {
                        const x = sampleX + (sx + 0.5) * (pixelSize / subPixels);
                        const y = sampleY + (sy + 0.5) * (pixelSize / subPixels);
                        
                        if (x < this.originalWidth && y < this.originalHeight) {
                            const data = sourceCtx.getImageData(
                                Math.floor(x), 
                                Math.floor(y), 
                                1, 
                                1
                            ).data;
                            
                            colors.push({
                                r: data[0],
                                g: data[1],
                                b: data[2],
                                a: data[3]
                            });
                        }
                    }
                }
                
                // 计算更精确的主导颜色
                const dominantColor = this.getImprovedDominantColor(colors);
                
                // 绘制像素
                tempCtx.fillStyle = `rgb(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b})`;
                tempCtx.fillRect(col, row, 1, 1);
            }
        }

        // 保存和显示结果
        this.processedImage = tempCanvas.toDataURL('image/png');
        const img = new Image();
        img.onload = () => {
            this.mainCtx.clearRect(0, 0, this.width, this.height);
            
            const displayScale = Math.min(
                this.width / cols,
                this.height / rows
            );
            const displayWidth = cols * displayScale;
            const displayHeight = rows * displayScale;
            const displayX = (this.width - displayWidth) / 2;
            const displayY = (this.height - displayHeight) / 2;
            
            this.mainCtx.imageSmoothingEnabled = false;
            this.mainCtx.drawImage(img, displayX, displayY, displayWidth, displayHeight);
        };
        img.src = this.processedImage;

        // 处理完成后清空编辑画布
        this.editCtx.clearRect(0, 0, this.width, this.height);
        this.history = [];
        this.historyIndex = -1;
        this.updateHistoryButtons();
        
        // 如果在编辑模式，关闭编辑模式
        if (this.editMode) {
            this.toggleEditMode();
        }
        
        // 生成色卡
        this.generateColorPalette(tempCanvas);
    }

    // 改进的主导颜色计算方法
    getImprovedDominantColor(colors) {
        if (colors.length === 0) {
            return { r: 0, g: 0, b: 0 };
        }

        // 使用加权平均来计算颜色
        const colorGroups = {};
        
        // 对相似颜色进行分组
        colors.forEach(color => {
            if (color.a < 128) return; // 忽略高度透明的像素
            
            // 将RGB值量化到较少的级别以合并相似颜色
            const quantizedColor = {
                r: Math.round(color.r / 8) * 8,
                g: Math.round(color.g / 8) * 8,
                b: Math.round(color.b / 8) * 8
            };
            
            const key = `${quantizedColor.r},${quantizedColor.g},${quantizedColor.b}`;
            if (!colorGroups[key]) {
                colorGroups[key] = {
                    sum: { r: 0, g: 0, b: 0 },
                    count: 0
                };
            }
            
            colorGroups[key].sum.r += color.r;
            colorGroups[key].sum.g += color.g;
            colorGroups[key].sum.b += color.b;
            colorGroups[key].count++;
        });

        // 找出出现次数最多的颜色组
        let maxCount = 0;
        let dominantColor = { r: 0, g: 0, b: 0 };

        for (const key in colorGroups) {
            const group = colorGroups[key];
            if (group.count > maxCount) {
                maxCount = group.count;
                // 使用该组的平均颜色
                dominantColor = {
                    r: Math.round(group.sum.r / group.count),
                    g: Math.round(group.sum.g / group.count),
                    b: Math.round(group.sum.b / group.count)
                };
            }
        }

        return dominantColor;
    }

    downloadImage() {
        if (!this.processedImage) return;

        const link = document.createElement('a');
        link.download = 'pixel_art.png';
        link.href = this.processedImage;
        link.click();
    }

    resetImagePosition() {
        if (!this.originalImage) return;
        
        // 计算适合的缩放比例
        const scaleX = this.width / this.originalWidth;
        const scaleY = this.height / this.originalHeight;
        this.scale = Math.min(scaleX, scaleY) * 0.9; // 留出一些边距
        
        // 居中图片
        this.offsetX = (this.width - this.originalWidth * this.scale) / 2;
        this.offsetY = (this.height - this.originalHeight * this.scale) / 2;
        
        this.updateImageDisplay();
    }

    updateImageDisplay() {
        if (!this.originalImage) return;
        
        this.mainCtx.clearRect(0, 0, this.width, this.height);
        
        // 绘制缩放和平移后的图片
        this.mainCtx.save();
        this.mainCtx.translate(this.offsetX, this.offsetY);
        this.mainCtx.scale(this.scale, this.scale);
        this.mainCtx.drawImage(this.originalImage, 0, 0);
        this.mainCtx.restore();
        
        // 更新缩放显示
        document.getElementById('zoomLevel').textContent = 
            `${Math.round(this.scale * 100)}%`;
    }

    handleImageDragStart(e) {
        if (!this.originalImage) return;
        
        this.isDraggingImage = true;
        const rect = this.mainCanvas.getBoundingClientRect();
        this.lastX = e.clientX - rect.left;
        this.lastY = e.clientY - rect.top;
    }

    handleImageDrag(e) {
        if (!this.isDraggingImage) return;
        
        const rect = this.mainCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.offsetX += x - this.lastX;
        this.offsetY += y - this.lastY;
        
        this.lastX = x;
        this.lastY = y;
        
        this.updateImageDisplay();
    }

    handleImageDragEnd() {
        this.isDraggingImage = false;
    }

    // 添加放大镜更新方法
    updateMagnifier(e) {
        if (!this.magnifierEnabled || !this.originalImage) return;
        
        const rect = this.guidelineCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 更新放大镜位置
        this.magnifier.style.left = (x + 20) + 'px';
        this.magnifier.style.top = (y + 20) + 'px';
        
        // 清除放大镜画布
        this.magnifierCtx.clearRect(0, 0, this.magnifierCanvas.width, this.magnifierCanvas.height);
        
        // 计算需要放大的区域
        const zoomSize = this.magnifierCanvas.width / this.magnifierZoom;
        const sourceX = x - zoomSize / 2;
        const sourceY = y - zoomSize / 2;
        
        // 绘制放大的图像
        this.magnifierCtx.save();
        this.magnifierCtx.imageSmoothingEnabled = false;
        
        // 绘制原图
        this.magnifierCtx.drawImage(
            this.mainCanvas,
            sourceX, sourceY, zoomSize, zoomSize,
            0, 0, this.magnifierCanvas.width, this.magnifierCanvas.height
        );
        
        // 绘制辅助线
        this.magnifierCtx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.magnifierCtx.lineWidth = 1;
        
        // 转换辅助线坐标到放大视图
        const guidelines = this.guidelines;
        const drawGuideline = (pos) => {
            return (pos - sourceX) * this.magnifierZoom;
        };
        
        // 绘制垂直辅助线
        [guidelines.vertical.left, guidelines.vertical.center, guidelines.vertical.right].forEach(x => {
            const lineX = drawGuideline(x);
            if (lineX >= 0 && lineX <= this.magnifierCanvas.width) {
                this.magnifierCtx.beginPath();
                this.magnifierCtx.moveTo(lineX, 0);
                this.magnifierCtx.lineTo(lineX, this.magnifierCanvas.height);
                this.magnifierCtx.stroke();
            }
        });
        
        // 绘制水平辅助线
        [guidelines.horizontal.top, guidelines.horizontal.center, guidelines.horizontal.bottom].forEach(y => {
            const lineY = (y - sourceY) * this.magnifierZoom;
            if (lineY >= 0 && lineY <= this.magnifierCanvas.height) {
                this.magnifierCtx.beginPath();
                this.magnifierCtx.moveTo(0, lineY);
                this.magnifierCtx.lineTo(this.magnifierCanvas.width, lineY);
                this.magnifierCtx.stroke();
            }
        });
        
        this.magnifierCtx.restore();
    }

    // 添加编辑工具初始化方法
    initEditTools() {
        // 工具选择
        document.getElementById('pencilTool').addEventListener('click', () => this.selectTool('pencil'));
        document.getElementById('eraserTool').addEventListener('click', () => this.selectTool('eraser'));
        
        // 撤销/重做
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        
        // 绘制事件
        this.editCanvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.editCanvas.addEventListener('mousemove', this.draw.bind(this));
        this.editCanvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.editCanvas.addEventListener('mouseleave', this.stopDrawing.bind(this));
    }

    // 工具选择方法
    selectTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${tool}Tool`).classList.add('active');
    }

    // 添加色卡生成方法
    generateColorPalette(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        this.colorPalette.clear();
        
        // 收集所有颜色
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) { // 不是完全透明的像素
                const color = `rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`;
                this.colorPalette.add(color);
            }
        }
        
        // 更新色卡显示
        this.updateColorPaletteDisplay();
    }

    // 更新色卡显示
    updateColorPaletteDisplay() {
        const colorList = document.getElementById('colorList');
        colorList.innerHTML = '';
        
        this.colorPalette.forEach(color => {
            const colorItem = document.createElement('div');
            colorItem.className = 'color-item';
            colorItem.style.backgroundColor = color;
            colorItem.addEventListener('click', () => this.selectColor(color));
            colorList.appendChild(colorItem);
        });
    }

    // 颜色选择方法
    selectColor(color) {
        this.currentColor = color;
        document.querySelectorAll('.color-item').forEach(item => {
            item.classList.toggle('active', item.style.backgroundColor === color);
        });
        document.getElementById('currentColor').textContent = color;
    }

    // 绘制相关方法
    startDrawing(e) {
        if (!this.editMode || (!this.currentColor && this.currentTool === 'pencil')) return;
        
        this.isDrawing = true;
        this.draw(e);
    }

    draw(e) {
        if (!this.editMode || !this.isDrawing) return;
        
        const rect = this.editCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 计算像素位置
        const pixelX = Math.floor(x / this.pixelSize) * this.pixelSize;
        const pixelY = Math.floor(y / this.pixelSize) * this.pixelSize;
        
        // 保存当前状态
        this.saveState();
        
        // 绘制
        this.editCtx.fillStyle = this.currentTool === 'eraser' ? 'transparent' : this.currentColor;
        if (this.currentTool === 'eraser') {
            this.editCtx.clearRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
        } else {
            this.editCtx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
        }
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    // 历史记录相关方法
    saveState() {
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push(this.editCtx.getImageData(0, 0, this.width, this.height));
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        
        this.historyIndex = this.history.length - 1;
        this.updateHistoryButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.editCtx.putImageData(this.history[this.historyIndex], 0, 0);
            this.updateHistoryButtons();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.editCtx.putImageData(this.history[this.historyIndex], 0, 0);
            this.updateHistoryButtons();
        }
    }

    updateHistoryButtons() {
        document.getElementById('undoBtn').disabled = this.historyIndex <= 0;
        document.getElementById('redoBtn').disabled = this.historyIndex >= this.history.length - 1;
    }

    // 添加编辑模式切换方法
    toggleEditMode() {
        this.editMode = !this.editMode;
        
        // 更新按钮状态
        const toggleBtn = document.getElementById('toggleEditMode');
        toggleBtn.textContent = this.editMode ? '关闭编辑' : '开启编辑';
        toggleBtn.classList.toggle('active', this.editMode);
        
        // 更新工具栏和色卡显示
        document.querySelector('.drawing-tools').classList.toggle('active', this.editMode);
        document.querySelector('.color-palette').classList.toggle('active', this.editMode);
        
        // 更新画布事件处理
        this.editCanvas.style.pointerEvents = this.editMode ? 'all' : 'none';
        this.guidelineCanvas.style.pointerEvents = this.editMode ? 'none' : 'all';
        
        // 如果关闭编辑模式，重置当前工具状态
        if (!this.editMode) {
            this.isDrawing = false;
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('pencilTool').classList.add('active');
        }
    }
}

// 初始化应用
window.onload = () => {
    const pixelSplitter = new PixelSplitter();
    
    // 添加处理按钮事件监听
    document.getElementById('processBtn').addEventListener('click', () => {
        pixelSplitter.processImage();
    });

    // 添加下载按钮事件监听
    document.getElementById('downloadBtn').addEventListener('click', () => {
        pixelSplitter.downloadImage();
    });
}; 