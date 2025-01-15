// 当前版本
const CURRENT_VERSION = 'v1.2.0';

// 版本历史记录
const CHANGELOG = {
    'v1.2.0': {
        date: '2025-01-15',
        changes: [
            '优化编辑模式界面，色卡和调色板只在编辑模式下显示',
            '修复取色器精确度问题',
            '改进工具切换逻辑',
            '添加选区工具（快捷键: S）',
            '优化撤销/重做功能',
            '添加工具切换提示',
            '改进画笔预览效果'
        ]
    },
    'v1.1.0': {
        date: '2025-01-15',
        changes: [
            '添加预览窗口功能',
            '优化取色器精确度',
            '添加画笔预览效果'
        ]
    },
    'v1.0.0': {
        date: '2025-01-14',
        changes: [
            '首次发布',
            '基础编辑功能',
            '颜色管理系统'
        ]
    }
    // 可以继续添加更多历史版本...
};

// 获取最新的更新记录
function getRecentChangelog(count = 2) {
    const versions = Object.keys(CHANGELOG).sort().reverse();
    const recentVersions = versions.slice(0, count);
    
    return recentVersions.map(version => ({
        version,
        ...CHANGELOG[version]
    }));
}

// 生成更新日志 HTML
function generateChangelogHTML() {
    const recentChanges = getRecentChangelog();
    
    return recentChanges.map(change => `
        <div class="version">
            <h4>${change.version} (${change.date})</h4>
            <ul>
                ${change.changes.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>
    `).join('');
} 