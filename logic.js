class DisjointSet {
  constructor(num) {
    this.boss = new Array(num);
    this.count = new Array(num);
    for (const i of this.boss.keys()) {
      this.boss[i] = i;
      this.count[i] = 1;
    }
  }

  getGroup(index) {
    if (this.boss[index] == index) {
      return index;
    }
    return this.boss[index] = this.getGroup(this.boss[index]);
  }

  merge(a, b) {
    a = this.getGroup(a);
    b = this.getGroup(b);
    this.boss[b] = a;
    this.count[a] += this.count[b];
  }

  getCount(index) {
    return this.count[this.getGroup(index)];
  }
}

/* exported tokenize */
function tokenize(doc) {
  const tokens = [];
  let tmp = '';
  let istag = false;
  for (let i=0; i<doc.length; i++) {
    if (doc[i] == '<' && !istag) {
      if (tmp) {
        tokens.push([tmp, 'word']);
        tmp = '';
      }
      istag = true;
      tmp += doc[i];
    } else if (doc[i] == '>' && istag) {
      tmp += doc[i];
      if (tmp === '<br/>') {
        tokens.push([tmp, 'enter']);
      } else {
        tokens.push([tmp, 'tag']);
      }
      tmp = '';
      istag = false;
    } else if (doc[i] != '\n') {
      tmp += doc[i];
    }
  }
  
  if (tmp) {
    tokens.push(tmp);
    tmp = '';
  }
  
  return tokens;
}

/* exported tokenizeTxt */
function tokenizeTxt(doc) {
  const tokens = [];
  let tmp = '';
  for (let i=0; i<doc.length; i++) {
    if (doc[i] == '\n') {
      if (tmp) {
        tokens.push([tmp, 'word']);
        tmp = '';
      }
      tokens.push(['<br/>', 'enter']);
    } else {
      tmp += doc[i];
    }
  }
  
  if (tmp) {
    tokens.push([tmp, 'word']);
    tmp = '';
  }
  
  return tokens; 
}

/* exported matchText */
function matchText(doc1, doc2, threshold=0.8) {
  const disjointSet = new DisjointSet(doc1.length + doc2.length);

  const doc1Cleared = doc1.map(removeSymbol);
  const doc2Cleared = doc2.map(removeSymbol);
  const doc1Wc = doc1Cleared.map(wordCount);
  const doc2Wc = doc2Cleared.map(wordCount);

  for (let i = 0; i < doc1.length; i++) {
    for (let j = 0; j < doc2.length; j++) {
      const wcRatio = intersectWordCount(doc1Wc[i], doc2Wc[j])
          / Math.min(doc1Cleared[i].length, doc2Cleared[j].length);
      if (wcRatio >= threshold &&
          similar(doc1Cleared[i], doc2Cleared[j], threshold)) {
        disjointSet.merge(i, j + doc1.length);
      }
    }
  }

  const doc1Matched = {};
  const doc2Matched = {};

  for (let i = 0; i < doc1.length; i++) {
    if (disjointSet.getCount(i) > 1) {
      const id = disjointSet.getGroup(i);
      if (!(id in doc1Matched)) doc1Matched[id] = [];
      doc1Matched[id].push(i);
    }
  }
  for (let i = 0; i < doc2.length; i++) {
    if (disjointSet.getCount(i + doc1.length) > 1) {
      const id = disjointSet.getGroup(i + doc1.length);
      if (!(id in doc2Matched)) doc2Matched[id] = [];
      doc2Matched[id].push(i);
    }
  }
  return [doc1Matched, doc2Matched];
}

/* exported flattenMatched */
function flattenMatched(matched) {
  const result = [];
  for (const id of Object.keys(matched)) {
    for (const index of matched[id]) {
      result.push({'id': id, 'index': index});
    }
  }
  result.sort((a, b) => a.index - b.index);
  return result;
}

/* exported findLongest */
function findLongest(doc, matched) {
  const longest = {};
  for (const id of Object.keys(matched)) {
    for (const index of matched[id]) {
      const length = doc[index].length;
      if (!(id in longest) || length < longest[id].length) {
        longest[id] = {
          length: length,
          index: index,
        };
      }
    }
  }
  return longest;
}

function intersectWordCount(a, b) {
  let ans = 0;
  for (const word of Object.keys(a)) {
    if (word in b) {
      ans += Math.min(a[word], b[word]);
    }
  }
  return ans;
}

function similar(a, b, threshold) {
  if (a.length <= 6 || b.length <= 6) return false;

  const totalLen = Math.min(a.length, b.length);
  const res = lcs(a, b);
  return res[0] >= totalLen * threshold;
}

function removeSymbol(sentence) {
  const reg = new RegExp([
    '[\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018',
    '|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e',
    '|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e',
    '|\ufe4f|\uffe5]',
  ].join(''));

  let res = '';
  for (let i=0; i<sentence.length; i++) {
    if (!reg.test(sentence[i])) {
      res += sentence[i];
    }
  }
  return res;
}

function lcs(worda, wordb) {
  const n1 = worda.length;
  const n2 = wordb.length;

  const a = ' ' + worda;
  const b = ' ' + wordb;


  const len = new Array(n1+1);
  const prev = new Array(n1+1);

  for (let i=0; i<=n1; i++) {
    len[i] = new Array(n2+1);
    prev[i] = new Array(n2+1);
  }

  for (let i=0; i<=n1; i++) {
    len[i][0] = 0;
  }
  for (let j=0; j<=n2; j++) {
    len[0][j] = 0;
  }

  for (let i=1; i<=n1; i++) {
    for (let j=1; j<=n2; j++) {
      if (a[i] == b[j]) {
        len[i][j] = len[i-1][j-1] + 1;
        prev[i][j] = 'topleft';
      } else if (len[i-1][j] < len[i][j-1]) {
        len[i][j] = len[i][j-1];
        prev[i][j] = 'left';
      } else {
        len[i][j] = len[i-1][j];
        prev[i][j] = 'top';
      }
    }
  }
  return [len[n1][n2], printLcs(a, prev, len, n1, n2)];
}

function printLcs(a, prev, len, i, j) {
  let res = '';
  let l = len[i][j];
  while (l > 0) {
    if (prev[i][j] == 'topleft') {
      l--;
      res += a[i];
      i--;
      j--;
    } else if (prev[i][j] == 'left') {
      j--;
    } else if (prev[i][j] == 'top') {
      i--;
    }
  }
  return res.split('').reverse().join('');
}

function wordCount(sentence) {
  const result = {};
  for (let i=0; i<sentence.length; i++) {
    if (!(sentence[i] in result)) result[sentence[i]] = 0;
    result[sentence[i]]++;
  }
  return result;
}
