(function () {
  'use strict';

  var API = 'https://qinnanzhou90--cjk-layout-api-layoutservice-web.modal.run';
  var fileInput = document.getElementById('page-file');
  var fileName = document.getElementById('file-name');
  var pageKind = document.getElementById('page-kind');
  var analyzeButton = document.getElementById('analyze-page');
  var randomButton = document.getElementById('random-example');
  var status = document.getElementById('layout-status');
  var results = document.getElementById('layout-results');
  var image = document.getElementById('result-image');
  var overlay = document.getElementById('layout-overlay');
  var dropZone = document.getElementById('drop-zone');
  var selectedFile = null;
  var activeResult = null;
  var objectUrl = null;

  function setStatus(message, error) {
    status.textContent = message;
    status.className = error ? 'error' : '';
  }

  function selectFile(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setStatus('Choose a JPEG, PNG, or WebP image.', true);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus('The image exceeds 10 MB.', true);
      return;
    }
    selectedFile = file;
    fileName.textContent = file.name + ' · ' + (file.size / 1024).toFixed(0) + ' KB';
    analyzeButton.disabled = false;
    setStatus('Ready to analyze.', false);
  }

  fileInput.addEventListener('change', function () { selectFile(fileInput.files[0]); });
  ['dragenter', 'dragover'].forEach(function (name) {
    dropZone.addEventListener(name, function (event) {
      event.preventDefault();
      dropZone.classList.add('dragging');
    });
  });
  ['dragleave', 'drop'].forEach(function (name) {
    dropZone.addEventListener(name, function (event) {
      event.preventDefault();
      dropZone.classList.remove('dragging');
    });
  });
  dropZone.addEventListener('drop', function (event) { selectFile(event.dataTransfer.files[0]); });

  function svgNode(name, attributes) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attributes).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    return node;
  }

  function activateElement(id) {
    document.querySelectorAll('.layout-shape, .element-row').forEach(function (node) {
      node.classList.toggle('active', node.dataset.elementId === id);
    });
  }

  function renderOverlay(data) {
    overlay.innerHTML = '';
    overlay.setAttribute('viewBox', '0 0 ' + data.image.width + ' ' + data.image.height);
    data.elements.forEach(function (element) {
      var shape;
      if (element.polygon && element.polygon.length) {
        shape = svgNode('polygon', {points: element.polygon.map(function (point) { return point.join(','); }).join(' ')});
      } else {
        var box = element.bbox;
        shape = svgNode('rect', {x: box[0], y: box[1], width: box[2] - box[0], height: box[3] - box[1]});
      }
      shape.setAttribute('class', 'layout-shape ' + element.role);
      shape.dataset.elementId = element.id;
      shape.addEventListener('mouseenter', function () { activateElement(element.id); });
      shape.addEventListener('mouseleave', function () { activateElement(''); });
      overlay.appendChild(shape);
    });
  }

  function renderSidebar(data) {
    var primary = data.elements.filter(function (item) { return item.role === 'primary'; }).length;
    var annotation = data.elements.length - primary;
    document.getElementById('layout-summary').innerHTML = [
      ['Page type', data.page_kind.replaceAll('_', ' ')],
      ['Image', data.image.width + ' × ' + data.image.height],
      ['Bands', data.bands.length],
      ['Primary / notes', primary + ' / ' + annotation]
    ].map(function (item) {
      return '<div><span>' + item[0] + '</span><strong>' + item[1] + '</strong></div>';
    }).join('');
    document.getElementById('element-count').textContent = data.elements.length + ' detected';
    document.getElementById('element-list').innerHTML = data.elements.map(function (element) {
      var location = [element.band == null ? '—' : 'B' + element.band, element.lane == null ? '—' : 'L' + element.lane].join(' · ');
      return '<button class="element-row" data-element-id="' + element.id + '" type="button">' +
        '<i class="role-dot ' + element.role + '"></i><span><strong>' + element.id + '</strong><small>' +
        element.role + (element.source ? ' · ' + element.source.replaceAll('_', ' ') : '') +
        '</small></span><span>' + location + '</span></button>';
    }).join('');
    document.querySelectorAll('.element-row').forEach(function (row) {
      row.addEventListener('mouseenter', function () { activateElement(row.dataset.elementId); });
      row.addEventListener('mouseleave', function () { activateElement(''); });
      row.addEventListener('click', function () { activateElement(row.dataset.elementId); });
    });
  }

  function showResult(data, imageUrl, caption) {
    activeResult = data;
    image.onload = function () {
      renderOverlay(data);
      renderSidebar(data);
      document.getElementById('layout-json').textContent = JSON.stringify(data, null, 2);
      document.getElementById('result-caption').textContent = caption;
      results.hidden = false;
      results.scrollIntoView({behavior: 'smooth', block: 'start'});
    };
    image.src = imageUrl;
  }

  randomButton.addEventListener('click', async function () {
    randomButton.disabled = true;
    setStatus('Loading precomputed example…', false);
    try {
      var response = await fetch(API + '/examples/random');
      if (!response.ok) throw new Error('Example request failed (' + response.status + ')');
      var data = await response.json();
      pageKind.value = data.page_kind;
      var imageUrl = new URL(data.example.image_url, API).href;
      showResult(data, imageUrl, 'Precomputed example · ' + data.example.id);
      setStatus('Example loaded.', false);
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      randomButton.disabled = false;
    }
  });

  analyzeButton.addEventListener('click', async function () {
    if (!selectedFile) return;
    analyzeButton.disabled = true;
    setStatus('Analyzing page geometry…', false);
    var body = new FormData();
    body.append('file', selectedFile);
    body.append('page_kind', pageKind.value);
    try {
      var response = await fetch(API + '/analyze', {method: 'POST', body: body});
      if (!response.ok) throw new Error('Analysis failed (' + response.status + ')');
      var data = await response.json();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(selectedFile);
      showResult(data, objectUrl, 'Live inference · ' + selectedFile.name);
      setStatus('Complete · ' + data.elements.length + ' elements', false);
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      analyzeButton.disabled = false;
    }
  });

  document.getElementById('copy-layout-json').addEventListener('click', async function () {
    if (!activeResult) return;
    await navigator.clipboard.writeText(JSON.stringify(activeResult, null, 2));
    this.textContent = 'Copied';
    var button = this;
    setTimeout(function () { button.textContent = 'Copy JSON'; }, 1200);
  });
}());
