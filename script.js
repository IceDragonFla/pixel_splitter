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
        this.lastX = null;
        this.lastY = null;
        
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
        
        // 添加取色器相关属性
        this.isPicking = false;
        
        // 添加调色板相关属性
        this.colorWheel = document.getElementById('colorWheel');
        this.colorWheelCtx = this.colorWheel.getContext('2d');
        this.isPickingFromWheel = false;
        
        // 初始化调色板
        this.initColorWheel();
        
        // 获取画布容器
        const canvasContainer = document.querySelector('.canvas-container');
        
        // 添加绘制范围画布
        this.boundaryCanvas = document.createElement('canvas');
        this.boundaryCanvas.id = 'boundaryCanvas';
        this.boundaryCtx = this.boundaryCanvas.getContext('2d');
        this.boundaryCanvas.width = this.width;
        this.boundaryCanvas.height = this.height;
        canvasContainer.insertBefore(this.boundaryCanvas, this.editCanvas);
        
        // 添加画笔投影相关属性
        this.cursorCanvas = document.createElement('canvas');
        this.cursorCanvas.id = 'cursorCanvas';
        this.cursorCtx = this.cursorCanvas.getContext('2d');
        this.cursorCanvas.width = this.width;
        this.cursorCanvas.height = this.height;
        canvasContainer.appendChild(this.cursorCanvas);
        
        // 添加取色器预览相关属性
        this.lastPickedColor = null;
        
        // 添加快捷键配置
        this.shortcuts = {
            'KeyB': 'pencilTool',    // B 键切换到铅笔
            'KeyE': 'eraserTool',    // E 键切换到橡皮擦
            'KeyI': 'pickerTool',    // I 键切换到取色器
            'KeyS': 'selectTool',    // S 键切换到选区工具
            'KeyP': 'togglePreview', // P 键切换预览窗口
            'KeyZ': 'undo',          // Ctrl + Z 撤销
            'KeyY': 'redo',          // Ctrl + Y 重做
            'Escape': 'toggleEdit'    // Esc 切换编辑模式
        };
        
        // 初始化快捷键
        this.initShortcuts();
        
        // 添加预览相关属性
        this.previewCanvas = document.getElementById('previewCanvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.previewWindow = document.getElementById('previewWindow');
        
        // 设置预览画布大小
        this.previewCanvas.width = 200;
        this.previewCanvas.height = 150;
        
        // 初始化工具提示
        this.initToolTips();
        
        // 初始化预览窗口拖拽
        this.initPreviewDrag();
        
        // 添加预览窗口状态
        this.previewEnabled = false;
        
        // 初始化时不显示参考线
        this.guidelineCanvas.style.display = 'none';
        
        // 添加选区相关属性
        this.selectionStart = null;
        this.selectionEnd = null;
        this.isSelecting = false;
        this.hasSelection = false;
        
        // 添加选区画布
        this.selectionCanvas = document.createElement('canvas');
        this.selectionCanvas.id = 'selectionCanvas';
        this.selectionCtx = this.selectionCanvas.getContext('2d');
        this.selectionCanvas.width = this.width;
        this.selectionCanvas.height = this.height;
        document.querySelector('.canvas-container').appendChild(this.selectionCanvas);
        
        // 添加上一次使用的工具记录
        this.lastUsedTool = 'pencil';
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
                        
                        // 显示参考线
                        this.guidelineCanvas.style.display = 'block';
                        this.drawGuidelines();
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

        // 添加预览窗口开关按钮事件
        document.getElementById('togglePreview').addEventListener('click', () => {
            this.togglePreview();
        });

        // 添加画笔投影事件
        this.editCanvas.addEventListener('mousemove', this.updateCursor.bind(this));
        this.editCanvas.addEventListener('mouseleave', () => {
            this.cursorCtx.clearRect(0, 0, this.width, this.height);
        });

        // 添加关于按钮事件
        const modal = document.getElementById('aboutModal');
        const aboutBtn = document.getElementById('aboutBtn');
        const closeBtn = modal.querySelector('.close');

        aboutBtn.addEventListener('click', () => {
            // 更新更新日志内容
            document.getElementById('changelogContent').innerHTML = generateChangelogHTML();
            
            // 显示模态框
            modal.style.display = 'block';
            // 触发重排以启动动画
            modal.offsetHeight;
            modal.classList.add('show');
        });

        closeBtn.addEventListener('click', () => {
            closeModal();
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // 添加 ESC 键关闭功能
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeModal();
            }
        });

        // 关闭模态框的函数
        const closeModal = () => {
            modal.classList.remove('show');
            // 等待动画完成后隐藏
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300); // 与 CSS 过渡时间相匹配
        };

        // 添加选区事件监听
        this.editCanvas.addEventListener('mousedown', (e) => {
            if (e.shiftKey) {
                this.handleSelectionStart(e);
            }
        });
        
        this.editCanvas.addEventListener('mousemove', (e) => {
            if (this.isSelecting) {
                this.handleSelectionMove(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isSelecting) {
                this.handleSelectionEnd();
            }
        });
        
        // 添加清除选区的快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.hasSelection) {
                this.clearSelection();
            }
        });

        // 修改 downloadImage 方法
        document.getElementById('downloadBtn').addEventListener('mouseenter', () => {
            // 显示提示信息
            const tip = document.createElement('div');
            tip.className = 'download-tip';
            tip.textContent = '按住 Shift 键并拖动鼠标可以选择要导出的区域';
            document.getElementById('downloadBtn').appendChild(tip);
        });

        document.getElementById('downloadBtn').addEventListener('mouseleave', () => {
            // 移除提示信息
            const tip = document.querySelector('.download-tip');
            if (tip) tip.remove();
        });

        // 添加工具按钮事件
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.id.replace('Tool', '');
                this.selectTool(tool);
            });
        });

        // 添加撤销/重做按钮事件
        document.getElementById('undoBtn').addEventListener('click', () => {
            if (this.editMode) this.undo();
        });

        document.getElementById('redoBtn').addEventListener('click', () => {
            if (this.editMode) this.redo();
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
        if (this.currentTool === 'select') {
            this.isDrawing = true;
            this.handleSelectionStart(e);
            return;
        }
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

                // 同步水平方向的距离
                const verticalDistance = this.guidelines.vertical.right - this.guidelines.vertical.center;
                this.guidelines.horizontal.top = this.guidelines.horizontal.center - verticalDistance;
                this.guidelines.horizontal.bottom = this.guidelines.horizontal.center + verticalDistance;
            } else {
                // 移动侧边线时,保持对称且同步水平方向
                const distance = Math.abs(x - this.guidelines.vertical.center);
                if (this.selectedLine.position === 'left') {
                    this.guidelines.vertical.left = x;
                    this.guidelines.vertical.right = this.guidelines.vertical.center + distance;
                } else {
                    this.guidelines.vertical.right = x;
                    this.guidelines.vertical.left = this.guidelines.vertical.center - distance;
                }
                // 同步水平方向的距离
                this.guidelines.horizontal.top = this.guidelines.horizontal.center - distance;
                this.guidelines.horizontal.bottom = this.guidelines.horizontal.center + distance;
            }
        } else if (this.selectedLine.type === 'horizontal') {
            if (this.selectedLine.position === 'center') {
                // 移动中心线时,同时移动上下辅助线
                const oldCenter = this.guidelines.horizontal.center;
                const diff = y - oldCenter;
                this.guidelines.horizontal.center = y;
                this.guidelines.horizontal.top += diff;
                this.guidelines.horizontal.bottom += diff;

                // 同步垂直方向的距离
                const horizontalDistance = this.guidelines.horizontal.bottom - this.guidelines.horizontal.center;
                this.guidelines.vertical.left = this.guidelines.vertical.center - horizontalDistance;
                this.guidelines.vertical.right = this.guidelines.vertical.center + horizontalDistance;
            } else {
                // 移动上下线时,保持对称且同步垂直方向
                const distance = Math.abs(y - this.guidelines.horizontal.center);
                if (this.selectedLine.position === 'top') {
                    this.guidelines.horizontal.top = y;
                    this.guidelines.horizontal.bottom = this.guidelines.horizontal.center + distance;
                } else {
                    this.guidelines.horizontal.bottom = y;
                    this.guidelines.horizontal.top = this.guidelines.horizontal.center - distance;
                }
                // 同步垂直方向的距离
                this.guidelines.vertical.left = this.guidelines.vertical.center - distance;
                this.guidelines.vertical.right = this.guidelines.vertical.center + distance;
            }
        }

        this.drawGuidelines();
    }

    handleMouseUp() {
        if (this.currentTool === 'select' && this.isSelecting) {
            this.handleSelectionEnd();
        }
        this.isDrawing = false;
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
            
            // 保存像素大小供绘制使用
            this.pixelSize = displayScale;
            
            // 保存显示位置信息供绘制使用
            this.displayOffset = {
                x: displayX,
                y: displayY
            };
            
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

        // 如果有选区，询问用户是否只导出选区
        if (this.hasSelection) {
            const selection = this.getSelectionBounds();
            if (confirm('是否只导出选中区域？\n\n点击"确定"导出选中区域\n点击"取消"导出完整图片')) {
                this.downloadSelectedArea(selection);
                // 导出后自动清除选区
                this.clearSelection();
            } else {
                this.downloadFullImage();
            }
        } else {
            this.downloadFullImage();
        }
    }

    // 添加 downloadFullImage 方法
    downloadFullImage() {
        // 创建临时画布用于合并图层
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // 设置画布大小为处理后图片的实际大小
        const processedWidth = Math.floor((this.width - this.displayOffset.x * 2) / this.pixelSize);
        const processedHeight = Math.floor((this.height - this.displayOffset.y * 2) / this.pixelSize);
        tempCanvas.width = processedWidth;
        tempCanvas.height = processedHeight;
        
        // 绘制处理后的图片
        const img = new Image();
        img.onload = () => {
            // 禁用图像平滑
            tempCtx.imageSmoothingEnabled = false;
            
            // 绘制处理后的图片
            tempCtx.drawImage(
                img,
                0, 0, processedWidth, processedHeight
            );
            
            // 获取编辑画布的内容
            const editData = this.editCtx.getImageData(
                this.displayOffset.x,
                this.displayOffset.y,
                processedWidth * this.pixelSize,
                processedHeight * this.pixelSize
            );
            
            // 创建临时画布来缩放编辑内容
            const editTempCanvas = document.createElement('canvas');
            const editTempCtx = editTempCanvas.getContext('2d');
            editTempCanvas.width = processedWidth * this.pixelSize;
            editTempCanvas.height = processedHeight * this.pixelSize;
            editTempCtx.putImageData(editData, 0, 0);
            
            // 将编辑内容缩放到正确大小并合并
            tempCtx.drawImage(
                editTempCanvas,
                0, 0, editTempCanvas.width, editTempCanvas.height,
                0, 0, processedWidth, processedHeight
            );
            
            // 导出合并后的图片
            const link = document.createElement('a');
            link.download = 'pixel_art.png';
            link.href = tempCanvas.toDataURL('image/png');
            link.click();
        };
        img.src = this.processedImage;
    }

    // 添加选区导出方法
    downloadSelectedArea(bounds) {
        // 创建临时画布
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // 设置画布大小为选区大小
        tempCanvas.width = bounds.width;
        tempCanvas.height = bounds.height;
        
        // 绘制选区内容
        const img = new Image();
        img.onload = () => {
            // 禁用图像平滑
            tempCtx.imageSmoothingEnabled = false;
            
            // 绘制处理后的图片选区
            tempCtx.drawImage(
                img,
                bounds.x, bounds.y, bounds.width, bounds.height,
                0, 0, bounds.width, bounds.height
            );
            
            // 获取编辑画布的选区内容
            const editData = this.editCtx.getImageData(
                bounds.x * this.pixelSize + this.displayOffset.x,
                bounds.y * this.pixelSize + this.displayOffset.y,
                bounds.width * this.pixelSize,
                bounds.height * this.pixelSize
            );
            
            // 创建临时画布来缩放编辑内容
            const editTempCanvas = document.createElement('canvas');
            const editTempCtx = editTempCanvas.getContext('2d');
            editTempCanvas.width = bounds.width * this.pixelSize;
            editTempCanvas.height = bounds.height * this.pixelSize;
            editTempCtx.putImageData(editData, 0, 0);
            
            // 将编辑内容缩放到正确大小并合并
            tempCtx.drawImage(
                editTempCanvas,
                0, 0, editTempCanvas.width, editTempCanvas.height,
                0, 0, bounds.width, bounds.height
            );
            
            // 导出选区图片
            const link = document.createElement('a');
            link.download = 'pixel_art_selection.png';
            link.href = tempCanvas.toDataURL('image/png');
            link.click();
        };
        img.src = this.processedImage;
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
        
        // 重置时隐藏参考线
        if (!this.originalImage) {
            this.guidelineCanvas.style.display = 'none';
        }
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
        
        // 添加取色器工具
        document.getElementById('pickerTool').addEventListener('click', () => this.selectTool('picker'));
    }

    // 工具选择方法
    selectTool(tool) {
        // 记录上一次使用的工具（不包括取色器和选区工具）
        if (tool !== 'picker' && tool !== 'select') {
            this.lastUsedTool = tool;
        }
        
        this.currentTool = tool;
        
        // 更新工具按钮状态
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // 安全地获取工具按钮
        const toolBtn = document.getElementById(`${tool}Tool`);
        if (toolBtn) {
            toolBtn.classList.add('active');
        } else {
            console.warn(`Tool button not found for: ${tool}`);
        }
        
        // 如果切换到其他工具，清除选区
        if (tool !== 'select' && this.hasSelection) {
            this.clearSelection();
        }

        // 更新状态栏或显示提示
        const toolNames = {
            'pencil': '铅笔',
            'eraser': '橡皮擦',
            'picker': '取色器',
            'select': '选区工具'
        };
        
        const toolName = toolNames[tool] || tool;
        this.showToolTip(`已切换到${toolName}`);
    }

    // 添加工具名称转换方法
    getToolName(tool) {
        const toolNames = {
            'pencil': '铅笔',
            'eraser': '橡皮擦',
            'picker': '取色器'
        };
        return toolNames[tool] || tool;
    }

    // 添加提示信息显示方法
    showToolTip(message) {
        // 创建或获取提示元素
        let tooltip = document.getElementById('toolTip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'toolTip';
            document.body.appendChild(tooltip);
            
            // 添加提示框样式
            const style = document.createElement('style');
            style.textContent = `
                #toolTip {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 4px;
                    font-size: 14px;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.3s;
                    z-index: 1000;
                }
                #toolTip.show {
                    opacity: 1;
                }
            `;
            document.head.appendChild(style);
        }

        // 显示提示信息
        tooltip.textContent = message;
        tooltip.classList.add('show');
        
        // 2秒后隐藏提示
        setTimeout(() => {
            tooltip.classList.remove('show');
        }, 2000);
    }

    // 添加色卡生成方法
    generateColorPalette(sourceCanvas = null) {
        this.colorPalette = new Set();
        
        if (!sourceCanvas) {
            // 如果没有提供源画布，从编辑画布获取颜色
            const imageData = this.editCtx.getImageData(
                this.displayOffset.x,
                this.displayOffset.y,
                Math.floor((this.width - this.displayOffset.x * 2) / this.pixelSize) * this.pixelSize,
                Math.floor((this.height - this.displayOffset.y * 2) / this.pixelSize) * this.pixelSize
            );
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 0) { // 不是完全透明的像素
                    const color = `rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`;
                    this.colorPalette.add(color);
                }
            }
        } else {
            // 如果提供了源画布，从源画布获取颜色
            const ctx = sourceCanvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 0) { // 不是完全透明的像素
                    const color = `rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`;
                    this.colorPalette.add(color);
                }
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
        
        // 更新颜色预览
        document.getElementById('selectedColor').style.backgroundColor = color;
        
        // 更新 RGB 输入框
        const rgb = color.match(/\d+/g).map(Number);
        document.getElementById('redInput').value = rgb[0];
        document.getElementById('greenInput').value = rgb[1];
        document.getElementById('blueInput').value = rgb[2];
        
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
        
        // 计算相对于显示区域的位置
        const relativeX = x - this.displayOffset.x;
        const relativeY = y - this.displayOffset.y;
        
        // 计算网格位置
        const gridX = Math.floor(relativeX / this.pixelSize);
        const gridY = Math.floor(relativeY / this.pixelSize);
        
        // 检查是否在有效的绘制范围内
        if (gridX < 0 || gridY < 0 || 
            gridX >= Math.floor((this.width - this.displayOffset.x * 2) / this.pixelSize) || 
            gridY >= Math.floor((this.height - this.displayOffset.y * 2) / this.pixelSize)) {
            return;
        }

        // 计算像素位置
        const pixelX = gridX * this.pixelSize + this.displayOffset.x;
        const pixelY = gridY * this.pixelSize + this.displayOffset.y;

        // 根据不同工具处理
        switch (this.currentTool) {
            case 'select':
                if (!this.isSelecting) {
                    this.handleSelectionStart(e);
                } else {
                    this.handleSelectionMove(e);
                }
                break;
            
            case 'picker':
                // 获取编辑画布上的颜色
                const editPixel = this.editCtx.getImageData(pixelX, pixelY, 1, 1).data;
                if (editPixel[3] > 0) { // 如果编辑画布上有颜色
                    const color = `rgb(${editPixel[0]}, ${editPixel[1]}, ${editPixel[2]})`;
                    this.selectColor(color);
                }
                // 取色后返回上一次使用的工具
                this.selectTool(this.lastUsedTool);
                break;
            
            case 'pencil':
            case 'eraser':
                // 如果是新的绘制操作，保存当前状态
                if (!this.lastX || !this.lastY || 
                    this.lastX !== gridX || this.lastY !== gridY) {
                    this.saveState();
                    this.lastX = gridX;
                    this.lastY = gridY;
                }

                // 设置绘制模式
                if (this.currentTool === 'eraser') {
                    this.editCtx.globalCompositeOperation = 'destination-out';
                    this.editCtx.fillStyle = 'rgba(0, 0, 0, 1)';
                } else {
                    this.editCtx.globalCompositeOperation = 'source-over';
                    this.editCtx.fillStyle = this.currentColor;
                }
                
                // 绘制
                this.editCtx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
                
                // 恢复默认绘制模式
                this.editCtx.globalCompositeOperation = 'source-over';
                break;
        }
    }

    stopDrawing() {
        if (this.isDrawing) {
            // 重置最后绘制的位置
            this.lastX = null;
            this.lastY = null;
        }
        this.isDrawing = false;
    }

    // 历史记录相关方法
    saveState() {
        // 删除当前位置之后的历史记录
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // 添加新的状态
        const newState = this.editCtx.getImageData(0, 0, this.width, this.height);
        this.history.push(newState);
        
        // 如果历史记录超过最大限制，删除最早的记录
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyIndex = Math.max(0, this.historyIndex - 1);
        } else {
            this.historyIndex++;
        }
        
        // 更新按钮状态
        this.updateHistoryButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            // 记住当前工具
            const currentTool = this.currentTool;
            
            this.historyIndex--;
            const imageData = this.history[this.historyIndex];
            this.editCtx.putImageData(imageData, 0, 0);
            this.updateHistoryButtons();
            
            // 如果当前工具是取色器或选区工具，尝试返回上一次使用的工具
            if (currentTool === 'picker' || currentTool === 'select') {
                try {
                    this.selectTool(this.lastUsedTool);
                } catch (error) {
                    console.warn('Failed to switch tool:', error);
                    this.currentTool = this.lastUsedTool;
                }
            }
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            // 记住当前工具
            const currentTool = this.currentTool;
            
            this.historyIndex++;
            const imageData = this.history[this.historyIndex];
            this.editCtx.putImageData(imageData, 0, 0);
            this.updateHistoryButtons();
            
            // 如果当前工具是取色器或选区工具，尝试返回上一次使用的工具
            if (currentTool === 'picker' || currentTool === 'select') {
                try {
                    this.selectTool(this.lastUsedTool);
                } catch (error) {
                    console.warn('Failed to switch tool:', error);
                    this.currentTool = this.lastUsedTool;
                }
            }
        }
    }

    updateHistoryButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        undoBtn.disabled = this.historyIndex <= 0;
        redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    }

    // 添加编辑模式切换方法
    toggleEditMode() {
        this.editMode = !this.editMode;
        
        // 更新按钮状态
        const toggleBtn = document.getElementById('toggleEditMode');
        toggleBtn.textContent = this.editMode ? '关闭编辑' : '开启编辑';
        toggleBtn.classList.toggle('active', this.editMode);
        
        // 更新工具栏显示状态
        document.querySelector('.drawing-tools').classList.toggle('active', this.editMode);
        
        // 更新画布事件状态
        this.editCanvas.style.pointerEvents = this.editMode ? 'all' : 'none';
        
        // 处理参考线显示
        this.guidelineCanvas.style.display = this.editMode ? 'none' : 'block';
        if (!this.editMode) {
            this.drawGuidelines();
        }
        
        if (this.editMode && this.processedImage) {
            // 显示绘制范围
            this.boundaryCanvas.style.display = 'block';
            this.drawBoundary();
            
            // 进入编辑模式时，将处理后的图片映射到编辑画布
            const img = new Image();
            img.onload = () => {
                // 清空编辑画布
                this.editCtx.clearRect(0, 0, this.width, this.height);
                
                // 计算图片显示区域
                const processedWidth = Math.floor((this.width - this.displayOffset.x * 2) / this.pixelSize);
                const processedHeight = Math.floor((this.height - this.displayOffset.y * 2) / this.pixelSize);
                
                // 禁用平滑处理以保持像素清晰
                this.editCtx.imageSmoothingEnabled = false;
                
                // 将图片映射到编辑画布
                this.editCtx.drawImage(
                    img,
                    this.displayOffset.x,
                    this.displayOffset.y,
                    processedWidth * this.pixelSize,
                    processedHeight * this.pixelSize
                );
                
                // 清空主画布上的处理后图片
                this.mainCtx.clearRect(0, 0, this.width, this.height);
                
                // 初始化历史记录
                this.history = [];
                this.historyIndex = -1;
                
                // 保存初始状态
                this.saveState();
                
                // 生成初始颜色调色板
                this.generateColorPalette();
                
                // 显示色卡和调色板
                document.querySelector('.color-palette').style.display = 'flex';
            };
            img.src = this.processedImage;
            
            // 显示预览窗口（如果启用）
            if (this.previewEnabled) {
                this.previewWindow.classList.add('active');
                this.updatePreview();
            }
        } else {
            // 关闭编辑模式时的清理工作
            this.boundaryCanvas.style.display = 'none';
            
            // 隐藏色卡和调色板
            document.querySelector('.color-palette').style.display = 'none';
            
            // 如果有编辑后的图片，将其绘制回主画布
            if (this.editMode === false && this.history.length > 0) {
                const editedImage = this.editCanvas.toDataURL();
                const img = new Image();
                img.onload = () => {
                    this.mainCtx.drawImage(img, 0, 0);
                    // 清空编辑画布
                    this.editCtx.clearRect(0, 0, this.width, this.height);
                };
                img.src = editedImage;
            }
            
            this.history = [];
            this.historyIndex = -1;
            this.updateHistoryButtons();
            this.previewWindow.classList.remove('active');
            
            // 重置工具状态
            this.currentTool = 'pencil';
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('pencilTool').classList.add('active');
        }
    }

    initColorWheel() {
        const width = this.colorWheel.width;
        const height = this.colorWheel.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2;

        // 绘制色轮
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= radius) {
                    // 将坐标转换为色相和饱和度
                    const hue = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
                    const saturation = distance / radius;
                    
                    // 转换 HSV 到 RGB
                    const rgb = this.hsvToRgb(hue, saturation, 1);
                    
                    this.colorWheelCtx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                    this.colorWheelCtx.fillRect(x, y, 1, 1);
                }
            }
        }

        // 添加事件监听
        this.colorWheel.addEventListener('mousedown', (e) => {
            this.isPickingFromWheel = true;
            this.pickColorFromWheel(e);
        });

        this.colorWheel.addEventListener('mousemove', (e) => {
            if (this.isPickingFromWheel) {
                this.pickColorFromWheel(e);
            }
        });

        document.addEventListener('mouseup', () => {
            this.isPickingFromWheel = false;
        });

        // RGB 输入框事件
        ['red', 'green', 'blue'].forEach(color => {
            document.getElementById(`${color}Input`).addEventListener('change', (e) => {
                const r = parseInt(document.getElementById('redInput').value);
                const g = parseInt(document.getElementById('greenInput').value);
                const b = parseInt(document.getElementById('blueInput').value);
                this.selectColor(`rgb(${r}, ${g}, ${b})`);
            });
        });
    }

    pickColorFromWheel(e) {
        const rect = this.colorWheel.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const imageData = this.colorWheelCtx.getImageData(x, y, 1, 1).data;
        if (imageData[3] > 0) { // 确保点击的是有颜色的区域
            const color = `rgb(${imageData[0]}, ${imageData[1]}, ${imageData[2]})`;
            this.selectColor(color);
        }
    }

    // HSV 转 RGB
    hsvToRgb(h, s, v) {
        let r, g, b;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    // 添加绘制范围标记方法
    drawBoundary() {
        this.boundaryCtx.clearRect(0, 0, this.width, this.height);
        
        // 计算可绘制区域
        const processedWidth = Math.floor((this.width - this.displayOffset.x * 2) / this.pixelSize);
        const processedHeight = Math.floor((this.height - this.displayOffset.y * 2) / this.pixelSize);
        
        const x = this.displayOffset.x;
        const y = this.displayOffset.y;
        const width = processedWidth * this.pixelSize;
        const height = processedHeight * this.pixelSize;
        
        // 绘制边界
        this.boundaryCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.boundaryCtx.lineWidth = 1;
        this.boundaryCtx.setLineDash([5, 5]);
        this.boundaryCtx.strokeRect(x - 1, y - 1, width + 2, height + 2);
        
        // 添加半透明遮罩
        this.boundaryCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        // 上方遮罩
        this.boundaryCtx.fillRect(0, 0, this.width, y);
        // 下方遮罩
        this.boundaryCtx.fillRect(0, y + height, this.width, this.height - (y + height));
        // 左侧遮罩
        this.boundaryCtx.fillRect(0, y, x, height);
        // 右侧遮罩
        this.boundaryCtx.fillRect(x + width, y, this.width - (x + width), height);
    }

    // 添加快捷键初始化方法
    initShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 如果正在输入，不触发快捷键
            if (e.target.tagName === 'INPUT') return;

            const shortcut = this.shortcuts[e.code];
            if (!shortcut) return;

            // 处理组合键
            if (e.code === 'KeyZ' && e.ctrlKey) {
                e.preventDefault();
                if (this.editMode) this.undo();
                return;
            }
            if (e.code === 'KeyY' && e.ctrlKey) {
                e.preventDefault();
                if (this.editMode) this.redo();
                return;
            }

            // 处理普通快捷键
            switch (shortcut) {
                case 'pencilTool':
                case 'eraserTool':
                case 'pickerTool':
                case 'selectTool':  // 添加选区工具的快捷键支持
                    if (this.editMode) {
                        e.preventDefault();
                        this.selectTool(shortcut.replace('Tool', ''));
                    }
                    break;
                case 'togglePreview':
                    if (this.editMode) {
                        e.preventDefault();
                        this.togglePreview();
                    }
                    break;
                case 'toggleEdit':
                    e.preventDefault();
                    this.toggleEditMode();
                    break;
            }
        });
    }

    // 添加工具提示初始化方法
    initToolTips() {
        const toolTips = {
            'pencilTool': { name: '铅笔', key: 'B' },
            'eraserTool': { name: '橡皮擦', key: 'E' },
            'pickerTool': { name: '取色器', key: 'I' },
            'selectTool': { name: '选区工具', key: 'S' },
            'togglePreview': { name: '预览窗口', key: 'P' },
            'undoBtn': { name: '撤销', key: 'Ctrl+Z' },
            'redoBtn': { name: '重做', key: 'Ctrl+Y' }
        };

        Object.entries(toolTips).forEach(([id, info]) => {
            const button = document.getElementById(id);
            const tooltip = document.createElement('div');
            tooltip.className = 'tool-tooltip';
            tooltip.innerHTML = `${info.name}<span class="shortcut-key">${info.key}</span>`;
            button.appendChild(tooltip);
        });
    }

    // 添加预览窗口拖拽功能
    initPreviewDrag() {
        const header = this.previewWindow.querySelector('.preview-header');
        let isDragging = false;
        let startX, startY, initialX, initialY;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = this.previewWindow.offsetLeft;
            initialY = this.previewWindow.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const newX = initialX + dx;
            const newY = initialY + dy;

            // 限制在画布范围内
            const container = document.querySelector('.canvas-container');
            const maxX = container.clientWidth - this.previewWindow.clientWidth;
            const maxY = container.clientHeight - this.previewWindow.clientHeight;

            this.previewWindow.style.left = `${Math.max(0, Math.min(maxX, newX))}px`;
            this.previewWindow.style.top = `${Math.max(0, Math.min(maxY, newY))}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // 添加预览更新方法
    updatePreview() {
        if (!this.originalImage) return;
        
        // 清空预览画布
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        
        // 计算缩放比例以适应预览窗口
        const scale = Math.min(
            this.previewCanvas.width / this.originalImage.width,
            this.previewCanvas.height / this.originalImage.height
        );
        
        // 计算居中位置
        const x = (this.previewCanvas.width - this.originalImage.width * scale) / 2;
        const y = (this.previewCanvas.height - this.originalImage.height * scale) / 2;
        
        // 绘制预览图
        this.previewCtx.drawImage(
            this.originalImage,
            x, y,
            this.originalImage.width * scale,
            this.originalImage.height * scale
        );
    }

    // 添加预览窗口开关方法
    togglePreview() {
        this.previewEnabled = !this.previewEnabled;
        
        // 更新按钮状态（只切换 active 类，不改变文字）
        const toggleBtn = document.getElementById('togglePreview');
        toggleBtn.classList.toggle('active', this.previewEnabled);
        
        // 显示/隐藏预览窗口
        if (this.editMode && this.previewEnabled) {
            this.previewWindow.classList.add('active');
            this.updatePreview();
        } else {
            this.previewWindow.classList.remove('active');
        }
    }

    // 添加画笔投影更新方法
    updateCursor(e) {
        if (!this.editMode || !this.currentTool) return;
        
        const rect = this.editCanvas.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        
        // 计算网格位置
        const gridX = Math.floor((x - this.displayOffset.x) / this.pixelSize);
        const gridY = Math.floor((y - this.displayOffset.y) / this.pixelSize);
        
        // 计算精确的像素位置
        const pixelX = Math.floor(gridX * this.pixelSize + this.displayOffset.x);
        const pixelY = Math.floor(gridY * this.pixelSize + this.displayOffset.y);
        
        // 清除之前的投影
        this.cursorCtx.clearRect(0, 0, this.width, this.height);
        
        // 检查是否在有效的绘制范围内
        if (gridX < 0 || gridY < 0 || 
            gridX >= Math.floor((this.width - this.displayOffset.x * 2) / this.pixelSize) || 
            gridY >= Math.floor((this.height - this.displayOffset.y * 2) / this.pixelSize)) {
            return;
        }
        
        // 根据当前工具绘制不同的光标效果
        switch (this.currentTool) {
            case 'picker':
                // 绘制取色器预览框
                this.drawPickerCursor(pixelX, pixelY);
                break;
            case 'select':
                // 绘制选区光标
                this.drawSelectionCursor(pixelX, pixelY);
                break;
            case 'pencil':
            case 'eraser':
                // 绘制画笔/橡皮擦光标
                this.drawToolCursor(pixelX, pixelY);
                break;
        }
    }

    // 添加选区处理方法
    handleSelectionStart(e) {
        const rect = this.editCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left - this.displayOffset.x;
        const y = e.clientY - rect.top - this.displayOffset.y;
        
        this.selectionStart = {
            x: Math.floor(x / this.pixelSize),
            y: Math.floor(y / this.pixelSize)
        };
        
        this.isSelecting = true;
        this.hasSelection = false;
        this.drawSelection();
    }

    handleSelectionMove(e) {
        if (!this.isSelecting) return;
        
        const rect = this.editCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left - this.displayOffset.x;
        const y = e.clientY - rect.top - this.displayOffset.y;
        
        this.selectionEnd = {
            x: Math.floor(x / this.pixelSize),
            y: Math.floor(y / this.pixelSize)
        };
        
        this.drawSelection();
    }

    handleSelectionEnd() {
        if (this.isSelecting && this.selectionStart && this.selectionEnd) {
            this.hasSelection = true;
        }
        this.isSelecting = false;
    }

    drawSelection() {
        this.selectionCtx.clearRect(0, 0, this.width, this.height);
        
        if (!this.selectionStart || !this.selectionEnd) return;
        
        const bounds = this.getSelectionBounds();
        
        // 绘制选区边框
        this.selectionCtx.strokeStyle = '#00ff00';
        this.selectionCtx.lineWidth = 2;
        this.selectionCtx.setLineDash([5, 5]);
        this.selectionCtx.strokeRect(
            bounds.x * this.pixelSize + this.displayOffset.x,
            bounds.y * this.pixelSize + this.displayOffset.y,
            bounds.width * this.pixelSize,
            bounds.height * this.pixelSize
        );
        
        //绘制选区半透明遮罩
        this.selectionCtx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        this.selectionCtx.fillRect(
            bounds.x * this.pixelSize + this.displayOffset.x,
            bounds.y * this.pixelSize + this.displayOffset.y,
            bounds.width * this.pixelSize,
            bounds.height * this.pixelSize
        );
    }

    getSelectionBounds() {
        if (!this.selectionStart || !this.selectionEnd) return null;
        
        const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x) + 1;
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y) + 1;
        
        return { x, y, width, height };
    }

    clearSelection() {
        const currentTool = this.currentTool;
        if (currentTool === 'select') {
            // 尝试切换回铅笔工具，如果失败则不切换工具
            try {
                this.selectTool('pencil');
            } catch (error) {
                console.warn('Failed to switch to pencil tool:', error);
                // 至少更新当前工具状态
                this.currentTool = 'pencil';
            }
        }
        
        this.selectionStart = null;
        this.selectionEnd = null;
        this.isSelecting = false;
        this.hasSelection = false;
        this.selectionCtx.clearRect(0, 0, this.width, this.height);
    }

    // 绘制取色器光标
    drawPickerCursor(pixelX, pixelY) {
        // 获取当前像素的颜色
        const editPixel = this.editCtx.getImageData(pixelX, pixelY, 1, 1).data;
        if (editPixel[3] > 0) {
            this.lastPickedColor = `rgb(${editPixel[0]}, ${editPixel[1]}, ${editPixel[2]})`;
        }
        
        // 绘制取色器预览框
        this.cursorCtx.strokeStyle = 'white';
        this.cursorCtx.lineWidth = 2;
        this.cursorCtx.strokeRect(pixelX - 1, pixelY - 1, this.pixelSize + 2, this.pixelSize + 2);
        this.cursorCtx.strokeStyle = 'black';
        this.cursorCtx.lineWidth = 1;
        this.cursorCtx.strokeRect(pixelX - 2, pixelY - 2, this.pixelSize + 4, this.pixelSize + 4);
        
        // 显示颜色预览
        if (this.lastPickedColor) {
            // 绘制颜色预览框
            this.cursorCtx.fillStyle = this.lastPickedColor;
            this.cursorCtx.fillRect(pixelX + this.pixelSize + 5, pixelY, 20, 20);
            this.cursorCtx.strokeStyle = 'white';
            this.cursorCtx.strokeRect(pixelX + this.pixelSize + 5, pixelY, 20, 20);
        }
    }

    // 绘制选区光标
    drawSelectionCursor(pixelX, pixelY) {
        this.cursorCtx.strokeStyle = '#00ff00';
        this.cursorCtx.lineWidth = 1;
        this.cursorCtx.setLineDash([2, 2]);
        this.cursorCtx.strokeRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
        this.cursorCtx.setLineDash([]); // 重置虚线样式
    }

    // 绘制工具光标（铅笔/橡皮擦）
    drawToolCursor(pixelX, pixelY) {
        // 设置填充样式
        if (this.currentTool === 'eraser') {
            this.cursorCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.cursorCtx.strokeStyle = '#999';
        } else {
            // 对于铅笔工具，使用当前选择的颜色
            this.cursorCtx.fillStyle = this.currentColor ? 
                this.currentColor.replace('rgb', 'rgba').replace(')', ', 0.5)') :
                'rgba(0, 0, 0, 0.5)';
            this.cursorCtx.strokeStyle = this.currentColor || '#000';
        }
        
        // 绘制光标
        this.cursorCtx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
        this.cursorCtx.lineWidth = 1;
        this.cursorCtx.strokeRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
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

// 添加绘制范围画布的样式
const style = document.createElement('style');
style.textContent = `
    #boundaryCanvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2;
        pointer-events: none;
        display: none;
    }
`;
document.head.appendChild(style); 