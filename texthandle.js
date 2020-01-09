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

function insertTag(tokens, offset, tagName, tagAttrs, [i=0, cnt=0], t_offsets) {
  const attrsString = Object.entries(tagAttrs).map(
      ([key, value]) => value !== undefined ? `${key}="${value}"` : '').join(' ');
  const tag = `<${tagName} ${attrsString} />`;

  let index = 0;
  let tokens_added = 0;
  for (; i<tokens.length; i++) {
    if (tokens[i][1] == 'word') {
      const curWord = tokens[i][0];
      const curLen = curWord.length;
      if (cnt + curLen >= offset) {
        const newTokens = [
          [curWord.slice(0, offset-cnt), 'word'],
          [tag, 'tag'],
          [curWord.slice(offset-cnt), 'word'],
        ];
        tokens.splice(i, 1, ...newTokens);
        index = i + 1;
        tokens_added = newTokens.length - 1;
        break;
      }
      cnt += curLen;
    } else if (tokens[i][1] == 'enter') {
      cnt += 1;
      if (cnt == offset) {
        tokens.splice(i + 1, 0, [tag, 'tag']);
        index = i + 1;
        tokens_added = 1;
        break;
      }
    }
  }
  if (i == tokens.length) {
    tokens.push([tag, 'tag']);
    index = i;
    tokens_added = 1;
  }

  if (t_offsets !== undefined) {
    for (let i = 0; i < t_offsets.length; i++) {
      if (t_offsets[i] >= index) {
        t_offsets[i] += tokens_added;
      }
    }
  }
  return [index, offset];
}

function insertAlignTags(tokens, sentences, matches, tags, t_offsets) {
  const flattenMatches = flattenMatched(matches);
  let ptr = 0;
  let state = [0, 0];
  let offset = 0;
  let s_ind = 0;
  for (let i = 0; i < sentences.length; i++) {
    if (ptr < flattenMatches.length && flattenMatches[ptr].index == i) {
      let params = {
        'Type': 'lcsmatch',
        'RefId': flattenMatches[ptr].id,
        'Key': i,
      };
      if (tags !== undefined) {
        params['Term'] = tags[params['RefId']];
      }

      state = insertTag(tokens, offset, 'AlignBegin', params, state, t_offsets);
      offset += sentences[i].length;
      state = insertTag(tokens, offset, 'AlignEnd', {'Key': i}, state, t_offsets);

      ptr++;
    } else {
      offset += sentences[i].length;
    }
  }
}

function txtToXml(content, sentences, matches, tags) {
  const tokens = tokenizeTxt(content);
  insertAlignTags(tokens, sentences, matches, tags);

  const docContent = tokens.map((x) => x[0]).join('');
  const filename = 'test';

  const result = `<?xml version="1.0"?>
<ThdlPrototypeExport>
<documents>
<document filename="${filename}">
<corpus>我的文獻集</corpus>
<doc_content>
${docContent}
</doc_content>
</document>
</documents>
</ThdlPrototypeExport>`;

  return result;
}

function xmlToXml(content, sentences, matches, tags) {
  const xmlDoc = $.parseXML(content);
  const $xml = $(xmlDoc);

  let tokens = [];
  const t_offsets = [0];

  $xml.find('doc_content').each((ind, ele) => {
    const docCont = $(ele).html();
    const tokens_tmp = tokenize(docCont);
    tokens = tokens.concat(tokens_tmp);
    t_offsets.push(tokens.length);
  });

  insertAlignTags(tokens, sentences, matches, tags, t_offsets);

  //const result = tokens.map((x) => x[0]).join('');
  //$xml.find('doc_content').html(result);

  $xml.find('doc_content').each((ind, ele) => {
    const start = t_offsets[ind];
    const end = t_offsets[ind+1];

    let result = '';
    for(let i = start; i < end; i++) {
      result += tokens[i][0];
    }
    ele.outerHTML = '<doc_content>' + result + '</doc_content>';
  });

  return new XMLSerializer().serializeToString($xml.get()[0]);
}

function csvToXml(content, sentences, matches, tags) {
  let tokens = [];
  for(let i = 0; i < sentences.length; i++) {
    tokens = tokens.concat(tokenizeTxt(sentences[i]));
  }
  insertAlignTags(tokens, sentences, matches, tags);

  const docContent = tokens.map((x) => x[0]).join('');
  const filename = 'test';

  const result = `<?xml version="1.0"?>
<ThdlPrototypeExport>
<documents>
<document filename="${filename}">
<corpus>我的文獻集</corpus>
<doc_content>
${docContent}
</doc_content>
</document>
</documents>
</ThdlPrototypeExport>`;

  return result;
}

function xmlToTxt(doc) {
  const tokens = tokenize(doc);

  let res = '';
  for (let i=0; i<tokens.length; i++) {
    if (tokens[i][1] == 'word') {
      res += tokens[i][0];
    } else if (tokens[i][1] == 'enter') {
      res += '\n';
    }
  }
  return res;
}

function csvToTxt(doc) {
  const data = Papa.parse(doc, {header: true});

  const resTxt = [];
  const resTag = [];
  for(let obj of data.data) {
    const txt = obj['tagVal'].trim();
    const tag = obj['@Term'].trim() || '';
    if (txt) {
      resTxt.push(txt);
      resTag.push(tag);
    }
  }

  return [resTxt, resTag];
}

function splitSentence(doc) {
  const endSymbol = ['。', '」', '？', '！'];
  const sentences = [];
  let p = 0;
  for (let i = 0; i < doc.length; i++) {
    if (endSymbol.includes(doc[i])) {
      const sentence = doc.substring(p, i + 1);
      if (sentence.length == 1 && sentences.length > 0) {
        sentences[sentences.length-1] =
            sentences[sentences.length-1] + sentence;
      } else {
        sentences.push(sentence);
      }
      p = i + 1;
    }
  }
  if (p < doc.length) {
    const sentence = doc.substring(p, doc.length);
    sentences.push(sentence);
  }
  return sentences;
}