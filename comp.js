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
  }

  resetMatch() {
    delete this.matches;
    delete this.longest;
    const $sentences = this.$dom.find('.sentence');
    $sentences.removeClass('highlight').removeData('identity');
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
          this.uploadText(event.currentTarget.files[0])
              .then(() => this.displayContent());
        });
    this.$dom.find('.xmlfile').click(() => $(event.currentTarget).val(''))
        .on('change', (event) => {
          this.uploadXml(event.currentTarget.files[0])
              .then(() => this.displayContent());
        });
    this.$dom.find('.csvfile').click(() => $(event.currentTarget).val(''))
        .on('change', (event) => {
          this.uploadCsv(event.currentTarget.files[0])
              .then(() => this.displayContent());
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
      this.other.resetMatch();
    });

    // Bind lighlights.
    this.$dom.on('mouseenter', '.sentence.highlight', (event) => {
      const $sentence = $(event.currentTarget);
      this.highlightSentence($sentence.data('identity'));
      this.other.highlightSentence($sentence.data('identity'));
    }).on('mouseleave', '.sentence.highlight', (event) => {
      this.removeHighlight();
      this.other.removeHighlight();
    }).on('click', '.sentence.highlight', (event) => {
      const $sentence = $(event.currentTarget);
      this.other.scrollToLongest($sentence.data('identity'));
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
