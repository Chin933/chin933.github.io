(function () {
  'use strict';

  var API_URL = 'https://qinnanzhou90--court-text-coding-api-courtcodingservice-web.modal.run';
  var example = '北京市朝阳区人民法院\n民事判决书\n（2025）京0105民初12345号\n原告张三。\n被告李四。\n原告张三诉称：一、请求判令被告偿还借款人民币100000元；二、请求支付利息。\n被告李四辩称借款已经清偿。\n经审理查明：2024年1月5日，原告通过银行转账向被告支付100000元，被告出具借条。原告提交借款合同、银行转账记录作为证据。被告对借款合同真实性无异议，但对转账记录的证明目的有异议。\n本院于2025年3月1日公开开庭审理本案。\n本院认为，合法的借贷关系受法律保护。\n判决如下：一、被告李四于本判决生效之日起十日内偿还原告张三借款100000元；二、驳回原告其他诉讼请求。案件受理费2300元，由被告负担。\n二〇二五年三月十日';

  var textBox = document.getElementById('court-text');
  var runButton = document.getElementById('run-pipeline');
  var status = document.getElementById('run-status');
  var results = document.getElementById('results');
  var lastResult = null;

  document.getElementById('load-example').addEventListener('click', function () {
    textBox.value = example;
    textBox.focus();
  });

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, function (char) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[char];
    });
  }

  function collectSpans(data) {
    var groups = [
      ['claim', data.claim_spans || []],
      ['evidence', data.evidence_item_spans || []],
      ['objection', data.evidence_objection_spans || []],
      ['event', data.fact_event_spans || []],
      ['amount', data.amount_mentions || []]
    ];
    var spans = [];
    groups.forEach(function (group) {
      group[1].forEach(function (row) {
        var span = row.source_span || {};
        if (Number.isInteger(span.start) && Number.isInteger(span.end) && span.end > span.start) {
          spans.push({
            type: group[0], start: span.start, end: span.end,
            confidence: row.confidence == null ? null : Number(row.confidence)
          });
        }
      });
    });
    spans.sort(function (a, b) {
      return a.start - b.start || b.end - a.end || (b.confidence || 0) - (a.confidence || 0);
    });
    var selected = [];
    spans.forEach(function (span) {
      var overlap = selected.some(function (kept) { return span.start < kept.end && span.end > kept.start; });
      if (!overlap) selected.push(span);
    });
    return selected.sort(function (a, b) { return a.start - b.start; });
  }

  function renderAnnotated(text, data) {
    var spans = collectSpans(data);
    var cursor = 0;
    var html = '';
    spans.forEach(function (span) {
      html += escapeHtml(text.slice(cursor, span.start));
      var confidence = span.confidence == null ? '' : '<span class="confidence">' + (span.confidence * 100).toFixed(1) + '%</span>';
      html += '<mark class="span-' + span.type + '" title="' + span.type + '">' + escapeHtml(text.slice(span.start, span.end)) + confidence + '</mark>';
      cursor = span.end;
    });
    html += escapeHtml(text.slice(cursor));
    document.getElementById('annotated-text').innerHTML = html || escapeHtml(text);
  }

  function displayValue(value) {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
    return String(value);
  }

  function renderMeasures(data) {
    var c = data.case_measures;
    var m = c.metadata || {};
    var values = [
      ['Court', m.court], ['Case number', m.case_number], ['Document type', m.document_type],
      ['Procedure stage', c.procedure_stage], ['Parties', c.parties.total_party_count],
      ['Claims', c.claims.count], ['Evidence items', c.evidence.count],
      ['Objections', c.objections.count], ['Fact-event burden', c.fact_event_burden.soft_count],
      ['Amount mentions', c.amount_exposure.mention_count], ['Maximum amount', c.amount_exposure.normalized_max],
      ['Hearings', (c.hearings || []).length], ['Duration days', c.duration.days],
      ['Decision date', m.decision_date], ['Disposition', m.document_disposition]
    ];
    document.getElementById('case-measures').innerHTML = values.map(function (item) {
      return '<div class="measure"><span>' + escapeHtml(item[0]) + '</span><strong>' + escapeHtml(displayValue(item[1])) + '</strong></div>';
    }).join('');
    document.getElementById('runtime').textContent = 'Runtime: ' + data.runtime_ms.toLocaleString() + ' ms';
  }

  runButton.addEventListener('click', async function () {
    var text = textBox.value.trim();
    if (text.length < 20) {
      status.textContent = '请输入至少 20 个字符。';
      status.className = 'error';
      return;
    }
    runButton.disabled = true;
    status.className = '';
    status.textContent = 'Running four classifiers…';
    try {
      var response = await fetch(API_URL + '/v1/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text: text})
      });
      if (!response.ok) throw new Error('API request failed (' + response.status + ')');
      lastResult = await response.json();
      renderAnnotated(text, lastResult);
      renderMeasures(lastResult);
      document.getElementById('structured-json').textContent = JSON.stringify(lastResult, null, 2);
      results.hidden = false;
      status.textContent = 'Complete · ' + lastResult.runtime_ms.toLocaleString() + ' ms';
      results.scrollIntoView({behavior: 'smooth', block: 'start'});
    } catch (error) {
      status.textContent = error.message;
      status.className = 'error';
    } finally {
      runButton.disabled = false;
    }
  });

  document.getElementById('copy-json').addEventListener('click', async function () {
    if (!lastResult) return;
    await navigator.clipboard.writeText(JSON.stringify(lastResult, null, 2));
    this.textContent = 'Copied';
    var button = this;
    setTimeout(function () { button.textContent = 'Copy JSON'; }, 1200);
  });
}());
