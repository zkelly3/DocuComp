let docuSkyGetDocsObj = null;
let target = 'USER';
let db = '', corpus = ''; // empty string: force the simpleUI to display a menu for user selection

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
    const txt = obj['value'].trim();
    const tag = obj['tag'].trim() || '';
    if (txt) {
      resTxt.push(txt);
      resTag.push(tag);
    }
  }

  return [resTxt, resTag];
}

class Literature {
  constructor($dom) {
    this.$dom = $dom;
    this.type = 'none';
    this.bindDomEvents();
  }

  uploadTxt(file) {
    return new Promise((resolve, reject) => {
      const freader = new FileReader();
      freader.onload = (e) => {
        this.type = 'txt';
        this.content = e.target.result.trim();
        this.sentences = splitSentence(this.content);
        resolve();
      };
      freader.readAsText(file);
    });
  }

  uploadXml(file) {
    return new Promise((resolve, reject) => {
      const freader = new FileReader();
      freader.onload = (e) => {
        this.type = 'xml';
        this.content = e.target.result.trim();

        const xmlDoc = $.parseXML(this.content);
        const $xml = $(xmlDoc);

        this.sentences = [];
        this.offsets = [0];
        $xml.find('doc_content').each((ind, ele) => {
          const s = splitSentence(xmlToTxt($(ele).html()));
          this.sentences = this.sentences.concat(s);
          this.offsets.push(this.sentences.length);
        });
        resolve();
      };
      freader.readAsText(file);
    });
  }

  uploadCsv (file) {
    return new Promise((resolve, reject) => {
      const freader = new FileReader();
      freader.onload = (e) => {
        this.type = 'csv';
        this.content = e.target.result.trim();
        const [txts, tags] = csvToTxt(this.content);

        this.sentences = [];
        this.tags = [];
        for (let i = 0; i < txts.length; i++) {
          const s = splitSentence(txts[i]);
          for (let j = 0; j < s.length; j++) {
            this.tags.push(tags[i]);
          }
          this.sentences = this.sentences.concat(s);
        }
        resolve();
      };
      freader.readAsText(file, 'big5');
    });
  }
  
  getDocuXml() {
    let documents = {};
    for (let i in docuSkyGetDocsObj.docList) {
      documents[docuSkyGetDocsObj.docList[i].number] = docuSkyGetDocsObj.docList[i].docInfo
    }
    
    let exporter = new DocuSkyExporter();
    let spotlights = docuSkyGetDocsObj.spotlights;
    let featureAnalysisSettings = docuSkyGetDocsObj.featureAnalysisSettings;
    let xml = '<?xml version="1.0"?>\n' + exporter.generateDocuXml(documents, db, corpus, spotlights, featureAnalysisSettings);
    
    this.type = 'xml';
    this.content = xml.trim();

    const xmlDoc = $.parseXML(this.content);
    const $xml = $(xmlDoc);

    this.sentences = [];
    this.offsets = [0];
    $xml.find('doc_content').each((ind, ele) => {
      const s = splitSentence(xmlToTxt($(ele).html()));
      this.sentences = this.sentences.concat(s);
      this.offsets.push(this.sentences.length);
    });
  }

  displayContent() {
    const $textblock = this.$dom.find('.textblock');

    $textblock.html('');
    for (const sentence of this.sentences) {
      $textblock.append($('<span>').addClass('sentence').text(sentence));
    }

    this.$dom.find('#nocontent').addClass('nodiv');
    this.$dom.find('#hascontent').removeClass('nodiv');
    this.$dom.find('#savedoc').removeClass('nodiv');
    this.mode = 'normal';
  }

  resetContent() {
    this.type = 'none';
    delete this.content;
    delete this.sentences;

    this.$dom.find('#nocontent').removeClass('nodiv');
    this.$dom.find('#hascontent').addClass('nodiv');
    this.$dom.find('#savedoc').addClass('nodiv');
    delete this.mode;
  }

  setMatch(matches) {
    this.matches = matches;
    this.longest = findLongest(this.sentences, matches);

    const $sentences = this.$dom.find('.sentence');
    $sentences.removeClass('highlight').removeData('identity');
    for (const id of Object.keys(matches)) {
      for (const index of matches[id]) {
        $sentences.eq(index).addClass('highlight').data('identity', id);
      }
    }

    this.$dom.find('#save-button').removeAttr('disabled');
  }

  getTags() {
    if (this.type != 'csv') {
      console.log('You cannot call this.');
      return;
    }

    const tags = {};
    for (const id of Object.keys(this.longest)) {
      tags[id] = this.tags[this.longest[id].index];
    }

    return tags;
  }

  resetMatch() {
    delete this.matches;
    delete this.longest;
    const $sentences = this.$dom.find('.sentence');
    $sentences.removeClass('highlight').removeData('identity');
    this.$dom.find('#save-button').attr('disabled', true);
  }

  highlightSentence(id) {
    const $sentences = this.$dom.find('.sentence');
    $sentences.removeClass('overhighlight');
    for (const index of this.matches[id]) {
      $sentences.eq(index).addClass('overhighlight');
    }
  }

  removeHighlight() {
    const $sentences = this.$dom.find('.sentence');
    $sentences.removeClass('overhighlight');
  }

  scrollToLongest(id) {
    const $longest = this.$dom.find('.sentence').eq(this.longest[id].index);
    const $textblock = this.$dom.find('.textblock');
    $textblock.scrollTop($textblock.scrollTop() + $longest.position().top);
  }

  bindDomEvents() {
    // Bind upload file.
    this.$dom.find('.txtfile').click(() => $(event.currentTarget).val(''))
        .on('change', (event) => {
          this.uploadTxt(event.currentTarget.files[0]).then(() => {
            this.$dom.find('#edit-old').removeAttr('disabled');
            this.displayContent();
          });
        });
    this.$dom.find('.xmlfile').click(() => $(event.currentTarget).val(''))
        .on('change', (event) => {
          this.uploadXml(event.currentTarget.files[0]).then(() => {
            this.$dom.find('#edit-old').attr('disabled', true);
            this.displayContent();
          });
        });
    this.$dom.find('.csvfile').click(() => $(event.currentTarget).val(''))
        .on('change', (event) => {
          this.uploadCsv(event.currentTarget.files[0]).then(() => {
            this.$dom.find('#edit-old').attr('disabled', true);
            this.displayContent();
          });
        });
    this.$dom.find('#docuxmllink').on('click', (event) => {
      docuSkyGetDocsObj.getDbCorpusDocuments(target, db, corpus, event, () => {
        this.getDocuXml();
        this.$dom.find('#edit-old').attr('disabled', true);
        this.displayContent();
      });
    });
    this.$dom.find('#edit-new').on('click', () => {
      this.type = 'txt';
      this.content = '';
      this.sentences = [];
      
      const $button = this.$dom.find('#edit-old');
      const $textblock = this.$dom.find('.textblock');
      
      $textblock.attr('contenteditable', 'true');
      $button.text('結束編輯');
      
      this.displayContent();
      this.mode = 'edit';
    });

    // Bind buttons.
    this.$dom.find('#edit-old').click(() => {
      this.resetMatch();
      this.other.resetMatch();
      
      const $button = $(event.currentTarget);
      const $textblock = this.$dom.find('.textblock');

      if (this.mode == 'normal') {
        this.mode = 'edit';
        $textblock.attr('contenteditable', 'true');
        $button.text('結束編輯');
      } else {
        this.content = $textblock.text();
        this.sentences = splitSentence(this.content);
        
        this.mode = 'normal';
        $textblock.removeAttr('contenteditable');
        $button.text('編輯文件');
        
        this.displayContent();
      }
    });

    this.$dom.find('#reset-button').click(() => {
      this.resetContent();
      this.resetMatch();
      this.other.resetMatch();
    });

    this.$dom.find('#save-button').click(() => {
      let tags = this.other.type == 'csv' ? this.other.getTags() : undefined;

      const filename = this.$dom.attr('id').substr(4) + '.xml';
      if (this.type == 'xml') {
        const xml = xmlToXml(this.content, this.sentences, this.matches, tags);
        
        const blob = new Blob([xml], {type: "text/plain;charset=utf-8"});
        saveAs(blob, filename);
        
      } else if(this.type == 'txt') {
        const xml = txtToXml(this.content, this.sentences, this.matches, tags);
        
        const blob = new Blob([xml], {type: "text/plain;charset=utf-8"});
        saveAs(blob, filename);
      } else if(this.type == 'csv') {
        tags = this.getTags();
        const xml = csvToXml(this.content, this.sentences, this.matches, tags);
        
        const blob = new Blob([xml], {type: "text/plain;charset=utf-8"});
        saveAs(blob, filename);
      }
    });

    // Bind highlights.
    this.$dom.on('mouseenter', '.sentence.highlight', (event) => {
      const id = $(event.currentTarget).data('identity');
      this.highlightSentence(id);
      this.other.highlightSentence(id);
    }).on('mouseleave', '.sentence.highlight', (event) => {
      this.removeHighlight();
      this.other.removeHighlight();
    }).on('click', '.sentence.highlight', (event) => {
      const id = $(event.currentTarget).data('identity');
      this.other.scrollToLongest(id);
    });
  }
}

const literatures = {};

$(function() {
  docuSkyGetDocsObj = docuskyGetDbCorpusDocumentsSimpleUI;

  $('.content').each(function() {
    const $this = $(this);
    literatures[$this.attr('id')] = new Literature($this);
  });

  const reference = literatures['doc-reference'];
  const target = literatures['doc-target'];

  reference.other = target;
  target.other = reference;

  $('#search-button').click(() => {
    const threshold = $('#threshold').val() / 100;
    const [referenceRes, targetRes] =
        matchText(reference.sentences, target.sentences, threshold);
    reference.setMatch(referenceRes);
    target.setMatch(targetRes);
  });
});
