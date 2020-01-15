let docuSkyGetDocsObj = null;
let target = 'USER';
let db = '', corpus = ''; // empty string: force the simpleUI to display a menu for user selection


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
        const xml = xmlToXml(this.content, this.sentences, this.matches);

        const blob = new Blob([xml], {type: "text/plain;charset=utf-8"});
        saveAs(blob, filename);

      } else if(this.type == 'txt') {
        const xml = txtToXml(this.content, this.sentences, this.matches);

        const blob = new Blob([xml], {type: "text/plain;charset=utf-8"});
        saveAs(blob, filename);
      } else if(this.type == 'csv') {
        tags = this.getTags();
        const xml = csvToXml(this.content, this.sentences, this.matches);

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

function saveResult(literature) {
}

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

  window.addEventListener("message", (event) => {
    if (event.data.type === 'close') {
      $('#comparePage').addClass('nodiv');
    } else if (event.data['type'] === 'matchResult') {
      for (let i in event.data['reference']) {
        console.log(i, event.data['reference'][i]);
      }
      for (let i in event.data['target']) {
        console.log(i, event.data['target'][i]);
      }
      $('#comparePage').addClass('nodiv');
    }
  }, false) ;

  $('.compare').on('click', function() {
    const data = {};
    data['reference'] = [{
      'type': reference.type,
      'content': reference.content
    }, {
      'type': reference.type,
      'content': reference.content
    }, {
      'type': 'txt',
      'content': '呂太后呂太后呂太后呂太后呂太后呂太后呂太后呂太后呂太后呂太后呂太后呂太后呂太后呂太后'
    }];
    data['target'] = [{
      'type': target.type,
      'content': target.content
    }, {
      'type': target.type,
      'content': target.content
    }];
    data['type'] = 'compareData';
    $('.compare-space').removeClass('nodiv');
    comparePage.contentWindow.postMessage(data, '*');
  });

});
