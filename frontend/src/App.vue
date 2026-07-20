<template>
  <router-view />
</template>

<script setup></script>

<style>
:root {
  --brand-blue: #409eff;
  --brand-green: #67c23a;
  --brand-gradient: linear-gradient(90deg, #409eff, #67c23a);
  --page-bg: #f5f7fa;
}

html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: var(--page-bg);
  color: #303133;
}

/* 主内容区留白 */
.el-main { background: var(--page-bg); padding: 22px 26px; }

/* 卡片精致化 */
.el-card {
  border-radius: 14px !important;
  border: none !important;
  box-shadow: 0 2px 14px rgba(31, 45, 61, 0.07) !important;
  transition: box-shadow .25s ease, transform .25s ease;
}
.el-card:hover { box-shadow: 0 6px 22px rgba(31, 45, 61, 0.12) !important; }
.el-card__header {
  font-weight: 600;
  color: #1f2d3d;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.07), rgba(103, 194, 58, 0.03));
  border-bottom: 1px solid #eef1f5;
  border-radius: 14px 14px 0 0;
  padding: 14px 18px;
}
.el-card__body { padding: 18px; }

/* 统计卡：蓝绿渐变左边条 */
.brand-stat { position: relative; overflow: hidden; }
.brand-stat::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  background: var(--brand-gradient);
}

/* 统一工具栏 */
.page-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

/* 页面头部（图标 + 标题 + 副说明），呼应导航栏品牌区 */
.page-head { display: flex; align-items: center; gap: 12px; }
.page-icon {
  width: 40px; height: 40px; border-radius: 11px;
  background: linear-gradient(135deg, #409eff, #67c23a);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 21px; flex-shrink: 0;
}
.page-title { font-size: 17px; font-weight: 700; color: #1f2d3d; }
.page-sub { font-size: 12px; color: #909399; margin-top: 2px; }
.page-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

/* 表格精致化 */
.el-table { border-radius: 10px; overflow: hidden; }
.el-table th.el-table__cell {
  background: #f4f6f9 !important;
  color: #5a6573;
  font-weight: 600;
}
.el-table .el-table__row:hover > td { background: #f7faff !important; }

/* 主按钮用品牌渐变，与导航栏呼应 */
.el-button--primary {
  background: var(--brand-gradient) !important;
  border-color: transparent !important;
  color: #fff !important;
}
.el-button--primary:hover { filter: brightness(1.05); }

/* 标签页激活条渐变 */
.el-tabs__active-bar { background: var(--brand-gradient) !important; }
.el-tabs__item.is-active { font-weight: 600; color: #303133; }

/* 对话框圆角与渐变头 */
.el-dialog { border-radius: 14px; overflow: hidden; }
.el-dialog__header {
  padding: 16px 20px;
  margin: 0;
  border-bottom: 1px solid #eef1f5;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.06), rgba(103, 194, 58, 0.03));
}
.el-dialog__title { font-weight: 600; color: #1f2d3d; }

/* ===== 移动端专属适配（仅 max-width:768px 生效，PC 端零影响） ===== */
@media (max-width: 768px) {
  /* 对话框近全屏，避免小屏被截断 */
  .el-dialog {
    width: 92vw !important;
    max-width: 92vw !important;
    margin-top: 8vh !important;
  }
  /* 对话框内表单改为单列 */
  .el-dialog .el-row { display: block; }
  .el-dialog .el-col {
    width: 100% !important;
    max-width: 100% !important;
    flex: none !important;
    float: none !important;
  }
  .el-dialog .el-form-item { margin-bottom: 16px; }
  /* 确认框适配小屏 */
  .el-message-box { width: 88vw !important; max-width: 360px; }

  /* 日期/选择器等在窄屏内自然占满 */
  .el-picker-panel { max-width: 92vw; }
}
</style>
