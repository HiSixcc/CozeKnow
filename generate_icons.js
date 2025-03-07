// 这是一个使用Canvas API创建图标的示例代码
// 你可以将这段代码在浏览器控制台中运行来生成图标

function createIcon(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // 设置背景
  ctx.fillStyle = '#4285f4';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.fill();

  // 绘制"C"字母
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('C', size/2, size/2);

  // 添加导入箭头
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.1;
  ctx.beginPath();
  ctx.moveTo(size * 0.7, size * 0.3);
  ctx.lineTo(size * 0.7, size * 0.7);
  ctx.lineTo(size * 0.5, size * 0.5);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}

// 生成三种尺寸的图标
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const link = document.createElement('a');
  link.download = `icon${size}.png`;
  link.href = createIcon(size);
  link.click();
}); 