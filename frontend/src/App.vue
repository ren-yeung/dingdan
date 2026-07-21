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

/* ===== 移动端设计系统（仅 max-width:768px 生效，PC 端零影响） ===== */
@media (max-width: 768px) {
  /* —— 对话框近全屏 + 表单单列 —— */
  .el-dialog {
    width: 92vw !important;
    max-width: 92vw !important;
    margin-top: 6vh !important;
  }
  .el-dialog .el-row { display: block; }
  .el-dialog .el-col {
    width: 100% !important; max-width: 100% !important; flex: none !important; float: none !important;
  }
  .el-dialog .el-form-item { margin-bottom: 16px; }
  .el-dialog .form-section-title { margin-top: 6px; }
  .el-message-box { width: 88vw !important; max-width: 360px; }
  .el-picker-panel { max-width: 92vw; }

  /* —— 页面容器 —— */
  .m-page { padding: 14px 14px 28px; }
  .m-head { display: flex; align-items: center; justify-content: space-between; margin: 2px 2px 16px; }
  .m-head-actions { display: flex; gap: 8px; }
  .m-title { font-size: 21px; font-weight: 800; color: #1f2d3d; letter-spacing: .3px; }

  .m-section-title {
    display: flex; align-items: center; gap: 8px;
    font-size: 14px; font-weight: 700; color: #1f2d3d;
    margin: 22px 4px 12px;
  }
  .m-section-title::before {
    content: ''; width: 4px; height: 14px; border-radius: 2px; background: var(--brand-gradient);
  }

  /* —— 通用卡片 —— */
  .m-card {
    background: #fff; border-radius: 16px; padding: 15px;
    box-shadow: 0 4px 18px rgba(31, 45, 61, 0.07); margin-bottom: 12px;
  }
  .m-tappable { cursor: pointer; transition: transform .12s ease, box-shadow .2s ease; }
  .m-tappable:active { transform: scale(.985); box-shadow: 0 2px 10px rgba(31, 45, 61, .10); }

  /* —— 头像 —— */
  .m-avatar {
    width: 40px; height: 40px; border-radius: 12px; flex: 0 0 auto;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 700; font-size: 16px; background: var(--brand-gradient);
  }
  .m-avatar.sm { width: 32px; height: 32px; border-radius: 10px; font-size: 13px; }

  /* —— 卡片头部（头像 + 标题 + 右侧标签） —— */
  .m-card-head { display: flex; align-items: center; gap: 11px; }
  .m-card-text { flex: 1; min-width: 0; }
  .m-card-title { font-size: 15px; font-weight: 700; color: #1f2d3d; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .m-card-sub { font-size: 12px; color: #909399; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .m-card-meta { font-size: 13px; color: #5a6573; margin-top: 10px; line-height: 1.5; }
  .m-muted { color: #a8b0bd; }

  /* —— 卡片操作区 —— */
  .m-card-actions {
    display: flex; gap: 2px; margin-top: 12px; padding-top: 10px;
    border-top: 1px solid #f1f3f6;
  }
  .m-card-actions .el-button { font-weight: 600; }

  /* —— 列表行（紧凑，带头像） —— */
  .m-row { padding: 11px 2px; border-bottom: 1px solid #f2f4f7; }
  .m-row:last-child { border-bottom: none; }
  .m-row-head { display: flex; align-items: center; gap: 10px; }
  .m-row-title { font-size: 14px; font-weight: 600; color: #1f2d3d; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .m-row-date { font-size: 12px; color: #a8b0bd; flex: 0 0 auto; }
  .m-row-meta { font-size: 12px; color: #5a6573; margin-top: 6px; padding-left: 42px; }

  /* —— Hero 业绩卡 —— */
  .m-hero {
    position: relative; overflow: hidden; border-radius: 20px; padding: 20px 18px;
    background: linear-gradient(125deg, #2b6cff 0%, #409eff 48%, #67c23a 130%);
    color: #fff; box-shadow: 0 12px 26px rgba(64, 158, 255, .30);
  }
  .m-hero-label { font-size: 13px; opacity: .92; }
  .m-hero-value { font-size: 30px; font-weight: 800; margin-top: 6px; letter-spacing: .5px; }
  .m-hero-stats { display: flex; gap: 10px; margin-top: 16px; }
  .m-hero-stat { flex: 1; background: rgba(255, 255, 255, .16); border-radius: 12px; padding: 10px 12px; }
  .m-hero-stat .v { font-size: 18px; font-weight: 700; }
  .m-hero-stat .l { font-size: 11px; opacity: .92; margin-top: 2px; }

  /* —— 销售排行 —— */
  .m-rank { display: flex; align-items: center; gap: 11px; padding: 11px 2px; }
  .m-rank .no {
    width: 24px; height: 24px; line-height: 24px; text-align: center; flex: 0 0 auto;
    border-radius: 8px; background: #eef1f6; color: #8a94a6; font-size: 12px; font-weight: 700;
  }
  .m-rank .no.top { background: linear-gradient(135deg, #ff8a5b, #f56c6c); color: #fff; }
  .m-rank .body { flex: 1; min-width: 0; }
  .m-rank .name { font-size: 14px; font-weight: 600; color: #1f2d3d; }
  .m-rank .bar { height: 6px; border-radius: 3px; background: #eef1f6; margin-top: 7px; overflow: hidden; }
  .m-rank .bar > i { display: block; height: 100%; border-radius: 3px; background: var(--brand-gradient); }
  .m-rank .val { font-size: 12px; color: #606266; margin-left: 10px; text-align: right; white-space: nowrap; line-height: 1.4; }

  /* —— 筛选 chips（紧凑换行，不截断） —— */
  .m-chips {
    display: flex; flex-wrap: wrap; gap: 7px;
    margin: 0 2px 14px;
  }
  .m-chip {
    flex: 0 0 auto; padding: 5px 13px; border-radius: 20px;
    background: #fff; color: #5a6573; font-size: 12px; font-weight: 600;
    border: 1px solid #e8ebf0;
    transition: all .2s ease; user-select: none; cursor: pointer;
  }
  .m-chip.active {
    color: #fff; border-color: transparent; background: var(--brand-gradient);
    box-shadow: 0 3px 10px rgba(64, 158, 255, .25);
  }

  /* —— 付款提示 —— */
  .m-pay {
    display: inline-flex; align-items: center; gap: 5px; margin-top: 10px;
    padding: 5px 10px; border-radius: 9px; background: #f4f6f9; color: #606266; font-size: 12px; font-weight: 600;
  }
  .m-pay.urgent { background: #fef0f0; color: #f56c6c; }

  /* —— 空状态 —— */
  .m-empty { text-align: center; padding: 44px 0; color: #a8b0bd; }
  .m-empty .ic { font-size: 40px; opacity: .45; }
  .m-empty .tx { font-size: 13px; margin-top: 10px; }
}
</style>
