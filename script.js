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

        // 计算中心交叉区域的四个方格大小
        const standardPixelSize = {
            width: (this.guidelines.vertical.right - this.guidelines.vertical.left) / 2, // 除以2因为是两个方格
            height: (this.guidelines.horizontal.bottom - this.guidelines.horizontal.top) / 2  // 除以2因为是两个方格
        };

        // 使用较小的值作为标准像素大小，确保是正方形
        const pixelSize = Math.min(standardPixelSize.width, standardPixelSize.height) / this.scale; // 转换回原图尺寸

        // 计算整个图片应该划分的像素数量
        const cols = Math.floor(this.originalWidth / pixelSize);
        const rows = Math.floor(this.originalHeight / pixelSize);

        // 更新网格大小显示
        document.getElementById('gridSize').textContent = `${cols} x ${rows}`;
        document.getElementById('selectionArea').textContent = 
            `像素大小: ${Math.round(pixelSize)}px`;

        // 创建临时画布用于获取原始图片数据
        const sourceCanvas = document.createElement('canvas');
        const sourceCtx = sourceCanvas.getContext('2d');
        sourceCanvas.width = this.originalWidth;
        sourceCanvas.height = this.originalHeight;
        sourceCtx.drawImage(this.originalImage, 0, 0);

        // 创建输出画布
        const outputPixelSize = 1; // 每个像素输出为1x1
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = cols;
        tempCanvas.height = rows;

        // 清空输出画布
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // 遍历每个网格
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // 计算采样区域
                const sampleX = Math.floor(col * pixelSize);
                const sampleY = Math.floor(row * pixelSize);
                const sampleWidth = Math.ceil(pixelSize);
                const sampleHeight = Math.ceil(pixelSize);

                try {
                    // 获取该区域的图像数据
                    const imageData = sourceCtx.getImageData(
                        sampleX,
                        sampleY,
                        Math.min(sampleWidth, this.originalWidth - sampleX),
                        Math.min(sampleHeight, this.originalHeight - sampleY)
                    );

                    // 获取主导颜色
                    const dominantColor = this.getDominantColor(imageData);

                    // 绘制像素
                    tempCtx.fillStyle = `rgb(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b})`;
                    tempCtx.fillRect(col, row, 1, 1);
                } catch (error) {
                    console.error(`Error processing pixel at ${col},${row}:`, error);
                }
            }
        }

        // 保存处理后的图片
        this.processedImage = tempCanvas.toDataURL('image/png');

        // 显示处理后的图片
        const img = new Image();
        img.onload = () => {
            this.mainCtx.clearRect(0, 0, this.width, this.height);
            
            // 计算显示大小，保持像素清晰
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
    }

    getDominantColor(imageData) {
        const colorMap = {};
        const data = imageData.data;
        
        // 遍历所有像素
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // 忽略完全透明的像素
            if (a === 0) continue;
            
            const key = `${r},${g},${b}`;
            colorMap[key] = (colorMap[key] || 0) + 1;
        }
        
        // 找出出现次数最多的颜色
        let maxCount = 0;
        let dominantColor = { r: 0, g: 0, b: 0 };
        
        for (const key in colorMap) {
            if (colorMap[key] > maxCount) {
                maxCount = colorMap[key];
                const [r, g, b] = key.split(',').map(Number);
                dominantColor = { r, g, b };
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