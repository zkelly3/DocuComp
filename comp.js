function insertTag(tokens, offset, tagName, tagAttrs, [i=0, cnt=0]) {
  const attrsString = Object.entries(tagAttrs).map(
      ([key, value]) => value ? `${key}="${value}"` : '').join(' ');
  const tag = `<${tagName} ${attrsString} />`;

  let index = 0;
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
        break;
      }
      cnt += curLen;
    } else if (tokens[i][1] == 'enter') {
      cnt += 1;
      if (cnt == offset) {
        tokens.splice(i + 1, 0, [tag, 'tag']);
        index = i + 1;
        break;
      }
    }
  }
  if (i == tokens.length) {
    tokens.push([tag, 'tag']);
    index = i;
  }
  return [index, offset];
}

function generateXml(content, sentences, matches) {
  const xmlDoc = $.parseXML(content);
  const $xml = $(xmlDoc);
  const docCont = $xml.find('doc_content').html();

  const tokens = tokenize(docCont);
  const flattenMatches = flattenMatched(matches);
  let ptr = 0;
  let state = [0, 0];
  let offset = 0;
  for (let i=0; i < sentences.length; i++) {
    if (ptr < flattenMatches.length && flattenMatches[ptr].index == i) {
      state = insertTag(tokens, offset, 'AlignBegin', {
        'Type': 'test',
        'RedId': flattenMatches[ptr].id,
        'Key': i,
      }, state);
      offset += sentences[i].length;
      state = insertTag(tokens, offset, 'AlignEnd', {'Key': i}, state);
      ptr++;
    } else {
      offset += sentences[i].length;
    }
  }

  const result = tokens.map((x) => x[0]).join('');
  $xml.find('doc_content').html(result);
  return new XMLSerializer().serializeToString($xml.get()[0].documentElement);
}

function getText(doc) {
  const xmlDoc = $.parseXML(doc);
  const $xml = $(xmlDoc);
  const docCont = $xml.find('doc_content').html();
  const tokens = tokenize(docCont);

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

class Literature {
  constructor($dom) {
    this.$dom = $dom;
    this.type = 'none';
    this.bindDomEvents();
  }

  uploadText(file) {
    return new Promise((resolve, reject) => {
      const freader = new FileReader();
      freader.onload = (e) => {
        this.type = 'text';
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
        this.sentences = splitSentence(getText(this.content));
        resolve();
      };
      freader.readAsText(file);
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
          this.uploadText(event.currentTarget.files[0]).then(() => {
            this.$dom.find('#edit-button').removeAttr('disabled');
            this.displayContent();
          });
        });
    this.$dom.find('.xmlfile').click(() => $(event.currentTarget).val(''))
        .on('change', (event) => {
          this.uploadXml(event.currentTarget.files[0]).then(() => {
            this.$dom.find('#edit-button').attr('disabled', true);
            this.displayContent();
          });
        });
    this.$dom.find('.csvfile').click(() => $(event.currentTarget).val(''))
        .on('change', (event) => {
          this.uploadCsv(event.currentTarget.files[0]).then(() => {
            this.$dom.find('#edit-button').attr('disabled', true);
            this.displayContent();
          });
        });

    // Bind buttons.
    this.$dom.find('#edit-button').click(() => {
      const $button = $(event.currentTarget);
      const $textblock = this.$dom.find('.textblock');

      if (this.mode == 'normal') {
        this.mode = 'edit';
        $textblock.attr('contenteditable', 'true');
        $button.text('結束編輯');
      } else {
        this.mode = 'normal';
        $textblock.removeAttr('contenteditable');
        $button.text('編輯文件');
      }
    });

    this.$dom.find('#reset-button').click(() => {
      this.resetContent();
      this.resetMatch();
      this.other.resetMatch();
    });

    this.$dom.find('#save-button').click(() => {
      if (this.type == 'xml') {
        const xml = generateXml(this.content, this.sentences, this.matches);
        console.log(xml);
      }
    });

    // Bind lighlights.
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
