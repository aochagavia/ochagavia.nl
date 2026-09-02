(function () {
  'use strict';

  let mount = document.getElementById('huffman-playground-container');
  if (!mount) return;

  let APP = [
    '<label for="hp-input">Input text:</label>',
    '<textarea id="hp-input" rows="4" spellcheck="false"></textarea>',
    '<div id="hp-output"></div>'
  ].join('\n');

  function escapeHTML(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }


  // A printable representation of a byte value, with the hex code as a fallback.
  function byteLabel(b) {
    const NAMED_BYTES = { 9: '\\t', 10: '\\n', 13: '\\r', 32: '<space>' };

    if (NAMED_BYTES[b] !== undefined) return NAMED_BYTES[b];
    if (b >= 0x21 && b <= 0x7e) return String.fromCharCode(b);
    return '0x' + b.toString(16).toUpperCase().padStart(2, '0');
  }

  // Builds the Huffman code table: a map from byte value to its bit string.
  function buildCodes(counts) {
    let nodes = [];
    let nextId = 0;
    for (let b = 0; b < 256; b++) {
      if (counts[b] > 0) {
        nodes.push({ count: counts[b], byte: b, id: nextId++, left: null, right: null });
      }
    }

    if (nodes.length === 0) return {};

    // A single distinct byte would end up with a zero-length code, so it gets
    // a one-bit code instead.
    if (nodes.length === 1) {
      let oneSymbol = {};
      oneSymbol[nodes[0].byte] = '0';
      return oneSymbol;
    }

    // Build the Huffman tree
    while (nodes.length > 1) {
      // Sorting is a poor man's substitute for a priority queue
      nodes.sort(function (x, y) { return x.count - y.count || x.id - y.id; });

      let left = nodes.shift();
      let right = nodes.shift();
      nodes.push({
        count: left.count + right.count,
        byte: -1,
        id: nextId++,
        left: left,
        right: right
      });
    }

    // Build the table
    let codes = {};
    let stack = [[nodes[0], '']];
    while (stack.length > 0) {
      let frame = stack.pop();
      let node = frame[0];
      let prefix = frame[1];
      if (node.left === null) {
        codes[node.byte] = prefix;
      } else {
        stack.push([node.right, prefix + '1']);
        stack.push([node.left, prefix + '0']);
      }
    }
    return codes;
  }

  function renderStats(originalBytes, compressedBits) {
    let compressedBytes = Math.ceil(compressedBits / 8);
    return `<div>Expected compression, using the table below: from ${originalBytes} to ${compressedBytes} bytes.</div>`;
  }

  function renderTable(counts, codes) {
    let rows = [];
    for (let b = 0; b < 256; b++) {
      if (counts[b] > 0) rows.push(b);
    }
    // Most frequent first
    rows.sort(function (x, y) { return counts[y] - counts[x] || x - y; });

    let body = rows.map(function (b) {
      return '<tr>' +
        '<td>' + escapeHTML(byteLabel(b)) + '</td>' +
        '<td>' + counts[b] + '</td>' +
        '<td>' + codes[b] + '</td>' +
      '</tr>';
    }).join('');

    return '<table>' +
      '<thead><tr><th>Byte</th><th>Count</th><th>Code</th></tr></thead>' +
      '<tbody>' + body + '</tbody>' +
      '</table>';
  }

  mount.innerHTML = APP;

  let input = mount.querySelector('#hp-input');
  let output = mount.querySelector('#hp-output');
  let encoder = new TextEncoder();

  function update() {
    let bytesUtf8 = encoder.encode(input.value);

    if (bytesUtf8.length === 0) {
      output.innerHTML = '<div>Type something above.</div>';
      return;
    }

    // Calculate byte frequencies
    let counts = new Uint32Array(256);
    for (let i = 0; i < bytesUtf8.length; i++) {
      counts[bytesUtf8[i]]++;
    }

    // Build the Huffman codes
    let codes = buildCodes(counts);

    // Calculate the length in bits of the compressed data
    let compressedBits = 0;
    for (let b = 0; b < 256; b++) {
      if (counts[b] > 0) compressedBits += counts[b] * codes[b].length;
    }

    output.innerHTML =
      renderStats(bytesUtf8.length, compressedBits) +
      renderTable(counts, codes)
  }

  input.addEventListener('input', update);
  input.value = 'aaaabbcd';
  update();
})();
