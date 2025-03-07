/**
 * 保存配置到本地存储
 * @param {string} token - Coze access token
 * @param {string} datasetId - 知识库ID
 */
function saveConfig(token, datasetId) {
  chrome.storage.local.set({
    cozeToken: token,
    cozeDatasetId: datasetId
  }, () => {
    showStatus('配置已保存', 'success');
  });
}

/**
 * 显示状态信息
 * @param {string} message - 要显示的消息
 * @param {string} type - 消息类型 (success/error)
 */
function showStatus(message, type) {
  const status = document.getElementById('status');
  // 如果已经显示,先重置动画
  if (status.style.display === 'block') {
    status.style.animation = 'none';
    status.offsetHeight; // 触发重排
    status.style.animation = null;
  }
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  setTimeout(() => {
    status.style.animation = 'fadeOut 0.3s var(--transition-timing)';
    setTimeout(() => {
      status.style.display = 'none';
      status.style.animation = null;
    }, 300);
  }, 3000);
}

/**
 * 获取当前页面的内容
 * @returns {Promise<{title: string, content: string, url: string}>}
 */
async function getPageContent() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // 注入内容脚本来获取页面内容
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      return {
        title: document.title,
        content: document.body.innerText,
        url: window.location.href
      };
    }
  });
  
  return result;
}

/**
 * 设置按钮加载状态
 * @param {boolean} isLoading 
 */
function setLoading(isLoading) {
  const importBtn = document.getElementById('import');
  const saveBtn = document.getElementById('save');
  
  if (isLoading) {
    importBtn.disabled = true;
    saveBtn.disabled = true;
    importBtn.innerHTML = '<span class="loading"></span>导入中...';
  } else {
    importBtn.disabled = false;
    saveBtn.disabled = false;
    importBtn.textContent = '导入当前页面';
  }
}

/**
 * 显示成功模态框
 * @param {Object} data - 导入的数据信息
 */
function showSuccessModal(data) {
  const modal = document.getElementById('successModal');
  modal.style.opacity = '0';
  modal.style.display = 'block';
  // 触发重排以应用动画
  modal.offsetHeight;
  modal.style.opacity = '1';
  
  const title = modal.querySelector('.import-details .title');
  const url = modal.querySelector('.import-details .url');
  const size = modal.querySelector('.import-details .size');
  
  title.textContent = `页面标题：${data.title}`;
  url.textContent = `来源：${data.url}`;
  size.textContent = `内容大小：${Math.round(data.content.length / 1024)}KB`;
  
  // 点击关闭按钮关闭模态框
  const closeBtn = modal.querySelector('.close');
  closeBtn.onclick = () => {
    modal.style.animation = 'fadeOut 0.3s var(--transition-timing)';
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.animation = null;
    }, 300);
  };
  
  // 点击模态框外部关闭
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
}

/**
 * 导入当前页面到Coze知识库
 * @param {string} token - Coze access token
 * @param {string} datasetId - 知识库ID
 * @param {string} pageData - 页面数据
 */
async function importToCoze(token, datasetId, pageData) {
  setLoading(true);
  try {
    const response = await fetch('https://api.coze.cn/open_api/knowledge/document/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Agw-Js-Conv': 'str'
      },
      body: JSON.stringify({
        dataset_id: datasetId,
        document_bases: [{
          name: pageData.title || pageData.url,
          content: pageData.content,
          source_info: {
            web_url: pageData.url,
            document_source: 1
          },
          update_rule: {
            update_type: 1,
            update_interval: 24
          }
        }],
        chunk_strategy: {
          separator: "\n\n",
          max_tokens: 800,
          remove_extra_spaces: false,
          remove_urls_emails: false,
          chunk_type: 1
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '导入失败');
    }

    showSuccessModal(pageData);
  } catch (error) {
    showStatus(error.message || '导入失败', 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * 验证Coze配置
 * @param {string} token 
 * @param {string} datasetId 
 */
async function validateConfig(token, datasetId) {
  try {
    const response = await fetch(`https://api.coze.cn/open_api/knowledge/dataset/info?dataset_id=${datasetId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('配置验证失败');
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 加载已保存的配置
  chrome.storage.local.get(['cozeToken', 'cozeDatasetId'], (result) => {
    if (result.cozeToken) {
      document.getElementById('token').value = result.cozeToken;
    }
    if (result.cozeDatasetId) {
      document.getElementById('datasetId').value = result.cozeDatasetId;
    }
  });

  // 保存配置按钮点击事件
  document.getElementById('save').addEventListener('click', () => {
    const token = document.getElementById('token').value.trim();
    const datasetId = document.getElementById('datasetId').value.trim();
    
    if (!token || !datasetId) {
      showStatus('请填写完整配置信息', 'error');
      return;
    }
    
    saveConfig(token, datasetId);
  });

  // 导入按钮点击事件
  document.getElementById('import').addEventListener('click', async () => {
    const token = document.getElementById('token').value.trim();
    const datasetId = document.getElementById('datasetId').value.trim();
    
    if (!token || !datasetId) {
      showStatus('请先完成配置', 'error');
      return;
    }

    try {
      const pageData = await getPageContent();
      importToCoze(token, datasetId, pageData);
    } catch (error) {
      showStatus('获取页面内容失败', 'error');
    }
  });

  // 添加打开Coze设置页面的事件处理
  const openCozeSettingsLinks = document.querySelectorAll('#openCozeSettings');
  openCozeSettingsLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({
        url: 'https://www.coze.cn/open/oauth/pats'
      });
    });
  });

  // 添加打开知识库ID指南的事件处理
  document.getElementById('openDatasetGuide').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({
      url: 'https://lvg1xn27qd.feishu.cn/docx/RwzpdbO3voAkGUxgp5KcGmnXnCt?from=from_copylink'
    });
  });

  // 添加打开隐私政策的事件处理
  document.getElementById('openPrivacyPolicy').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({
      url: "https://github.com/HiSixcc/CozeKnow"
    });
  });
}); 