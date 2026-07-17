(function () {
  'use strict';

  var elasticityInput = document.getElementById('voc-elasticity');
  var maturationInput = document.getElementById('voc-maturation');
  var discountInput = document.getElementById('voc-discount');
  var root = document.getElementById('voc-chart-root');
  var fallback = document.getElementById('voc-chart-fallback');
  if (!elasticityInput || !maturationInput || !discountInput || !root) return;

  var NS = 'http://www.w3.org/2000/svg';
  var historicalTrees = 6901192;
  var observedMarkup = 14.898477855074034;
  var observedAnnualGrossReturn = 4117299.7225261903;
  var plot = { left: 110, top: 80, width: 980, height: 480, xmax: 1.05 };

  function add(name, attrs, text) {
    var element = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (key) { element.setAttribute(key, attrs[key]); });
    if (text !== undefined) element.textContent = text;
    root.appendChild(element);
    return element;
  }

  function formatMillions(value) { return (value / 1000000).toFixed(2) + 'm'; }
  function formatGuilders(value) { return (value / 1000000).toFixed(1) + 'm gld'; }
  function xScale(x) { return plot.left + (x / plot.xmax) * plot.width; }

  function model(epsilon, maturation, discount) {
    var monopolyMarkup = epsilon / (epsilon - 1);
    var optimum = Math.log(monopolyMarkup) / Math.log(observedMarkup);
    optimum = Math.max(0, Math.min(plot.xmax, optimum));

    function commercialReturn(x) {
      return (Math.pow(observedMarkup, x) - 1) * Math.pow(observedMarkup, -epsilon * x);
    }

    var peakReturn = commercialReturn(optimum);
    var points = [];
    for (var i = 0; i <= 210; i += 1) {
      var x = plot.xmax * i / 210;
      var value = commercialReturn(x) / peakReturn;
      points.push({ x: x, value: value });
    }
    var historicalValue = commercialReturn(1) / peakReturn;
    var lossShare = Math.max(0, 1 - historicalValue);
    var annuityFactor = Math.pow(discount, maturation) / (1 - discount);
    var peakAnnualGrossReturn = observedAnnualGrossReturn / historicalValue;
    var discountedLoss = (peakAnnualGrossReturn - observedAnnualGrossReturn) * annuityFactor;
    var revealedThreshold = 0;
    for (var j = 0; j < 10000; j += 1) {
      var alternative = j / 10000;
      var normalizedAlternative = commercialReturn(alternative) / peakReturn;
      var secant = (normalizedAlternative - historicalValue) / (1 - alternative);
      revealedThreshold = Math.max(revealedThreshold, secant);
    }
    var coercionValue = revealedThreshold * peakAnnualGrossReturn * annuityFactor / historicalTrees;
    return {
      points: points,
      optimum: optimum,
      maxReturn: 1,
      historicalReturn: historicalValue,
      lossShare: lossShare,
      discountedLoss: discountedLoss,
      coercionValue: coercionValue
    };
  }

  function render() {
    var epsilon = Number(elasticityInput.value);
    var maturation = Number(maturationInput.value);
    var discount = Number(discountInput.value);
    var result = model(epsilon, maturation, discount);
    var ymin = 0;
    var ymax = 1.08;
    function yScale(y) { return plot.top + plot.height - ((y - ymin) / (ymax - ymin)) * plot.height; }

    root.replaceChildren();
    if (fallback) fallback.style.display = 'none';

    add('rect', { x: xScale(result.optimum), y: plot.top, width: xScale(plot.xmax) - xScale(result.optimum), height: plot.height, fill: '#a34435', opacity: '0.055' });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (tick) {
      add('line', { x1: plot.left, x2: plot.left + plot.width, y1: yScale(tick), y2: yScale(tick), stroke: '#e2e5e8' });
      add('text', { x: 91, y: yScale(tick) + 6, 'text-anchor': 'end', fill: '#59616a', 'font-family': 'Times New Roman, serif', 'font-size': 17 }, Math.round(tick * 100));
      add('text', { x: xScale(tick), y: 591, 'text-anchor': 'middle', fill: '#59616a', 'font-family': 'Times New Roman, serif', 'font-size': 17 }, Math.round(tick * 100) + '%');
    });
    add('line', { x1: plot.left, x2: plot.left, y1: plot.top, y2: plot.top + plot.height, stroke: '#30353a', 'stroke-width': 1.5 });
    add('line', { x1: plot.left, x2: plot.left + plot.width, y1: plot.top + plot.height, y2: plot.top + plot.height, stroke: '#30353a', 'stroke-width': 1.5 });

    var path = result.points.map(function (point, index) {
      return (index ? 'L' : 'M') + xScale(point.x).toFixed(1) + ',' + yScale(point.value).toFixed(1);
    }).join(' ');
    add('path', { d: path, fill: 'none', stroke: '#244f3b', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

    var optimumY = yScale(result.maxReturn);
    var historicalY = yScale(result.historicalReturn);
    add('line', { x1: xScale(result.optimum), x2: xScale(result.optimum), y1: optimumY, y2: plot.top + plot.height, stroke: '#c5933d', 'stroke-width': 2, 'stroke-dasharray': '6 6' });
    add('circle', { cx: xScale(result.optimum), cy: optimumY, r: 9, fill: '#c5933d', stroke: '#fff', 'stroke-width': 4 });
    add('text', { x: xScale(result.optimum), y: optimumY - 24, 'text-anchor': 'middle', fill: '#7e5c23', 'font-family': 'Times New Roman, serif', 'font-size': 16, 'font-weight': 700 }, 'COMMERCIAL OPTIMUM');
    add('line', { x1: xScale(1), x2: xScale(1), y1: historicalY, y2: plot.top + plot.height, stroke: '#a34435', 'stroke-width': 2, 'stroke-dasharray': '6 6' });
    add('circle', { cx: xScale(1), cy: historicalY, r: 10, fill: '#a34435', stroke: '#fff', 'stroke-width': 4 });
    add('text', { x: xScale(1) - 16, y: historicalY - 24, 'text-anchor': 'end', fill: '#84372d', 'font-family': 'Times New Roman, serif', 'font-size': 16, 'font-weight': 700 }, 'HISTORICAL SCALE');
    add('text', { x: (xScale(result.optimum) + xScale(plot.xmax)) / 2, y: 104, 'text-anchor': 'middle', fill: '#9d5a50', 'font-family': 'Times New Roman, serif', 'font-size': 15, 'font-weight': 700, 'letter-spacing': 1.5 }, 'SELF-DEFEATING RESTRICTION');
    add('text', { x: 600, y: 649, 'text-anchor': 'middle', fill: '#30353a', 'font-family': 'Times New Roman, serif', 'font-size': 19, 'font-weight': 700 }, 'SUPPLY-RESTRICTION INTENSITY');
    add('text', { x: 31, y: 320, 'text-anchor': 'middle', fill: '#30353a', 'font-family': 'Times New Roman, serif', 'font-size': 19, 'font-weight': 700, transform: 'rotate(-90 31 320)' }, 'DISCOUNTED GROSS RETURN (PEAK = 100)');

    var optimalTrees = historicalTrees * result.optimum;
    document.getElementById('voc-optimal-trees').textContent = formatMillions(optimalTrees);
    document.getElementById('voc-excess-trees').textContent = formatMillions(Math.max(0, historicalTrees - optimalTrees));
    document.getElementById('voc-discounted-loss').textContent = formatGuilders(result.discountedLoss);
    document.getElementById('voc-coercion-value').textContent = result.coercionValue.toFixed(1) + ' gld/tree';
    document.getElementById('voc-elasticity-output').textContent = epsilon.toFixed(2);
    document.getElementById('voc-maturation-output').textContent = maturation + ' years';
    document.getElementById('voc-discount-output').textContent = discount.toFixed(2);
  }

  [elasticityInput, maturationInput, discountInput].forEach(function (input) {
    input.addEventListener('input', render);
  });
  render();
}());
