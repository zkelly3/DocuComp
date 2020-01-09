class Document {
  constructor(data) {
    this.type = data.type;
    this.content = data.content.trim();

    if (this.type === 'txt') {
      this.sentences = splitSentence(this.content);
    } else if (this.type === 'xml') {
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
  }
  setMatch(matches) {
    this.matches = matches;
    this.longest = findLongest(this.sentences, matches);
  }
}

class Literature {
  constructor($dom) {
    this.$dom = $dom;
    this.doc = 'none';
    this.bindDomEvents();
  }

  setDocument(doc) {
    this.doc = doc;
  }

  displayContent() {
    const $textblock = this.$dom.find('.textblock');

    $textblock.html('');
    for (const sentence of this.doc.sentences) {
      $textblock.append($('<span>').addClass('sentence').text(sentence));
    }
    $textblock.scrollTop(0);
  }

  setMatch(matches) {
    this.doc.setMatch(matches);

    const $sentences = this.$dom.find('.sentence');
    $sentences.removeClass('highlight').removeData('identity');
    for (const id of Object.keys(matches)) {
      for (const index of matches[id]) {
        $sentences.eq(index).addClass('highlight').data('identity', id);
      }
    }
  }

  resetMatch() {
    const $textblock = this.$dom.find('.textblock');
    $textblock.html('');
  }

  highlightSentence(id) {
    const $sentences = this.$dom.find('.sentence');
    $sentences.removeClass('overhighlight');
    for (const index of this.doc.matches[id]) {
      $sentences.eq(index).addClass('overhighlight');
    }
  }

  removeHighlight() {
    const $sentences = this.$dom.find('.sentence');
    $sentences.removeClass('overhighlight');
  }

  scrollToLongest(id) {
    const $longest = this.$dom.find('.sentence').eq(this.doc.longest[id].index);
    const $textblock = this.$dom.find('.textblock');
    $textblock.scrollTop($textblock.scrollTop() + $longest.position().top);
  }


  bindDomEvents() {
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
let matches = {};

function setLoadingMessage(message) {
  let element = document.querySelector('.pg-loading-html .loading-message');
  if (element) {
    element.innerHTML = message;
  }
}

function resetPage() {
  $('.select-display').empty();
  $('#left-display').append($('<option>').attr('disabled', true).text('Reference').val('w'));
  $('#right-display').append($('<option>').attr('disabled', true).text('Target').val('w'));
  $('.select-display').val('w');
  $('.select-display').attr('disabled', true);
  literatures['doc-reference'].resetMatch();
  literatures['doc-target'].resetMatch();
  $('#save-result').attr('disabled', true);
}

$(function() {
  $('#cancel').click(() => {
    parent.postMessage('close', '*');
  });

  $('.content').each(function() {
    const $this = $(this);
    literatures[$this.attr('id')] = new Literature($this);
  });

  const reference = literatures['doc-reference'];
  const target = literatures['doc-target'];

  reference.other = target;
  target.other = reference;

  let reference_docs = [];
  let target_docs = [];

  window.addEventListener("message", (event) => {
    if (event.data['type'] === 'compareData') {
      resetPage();
      reference_docs = [];
      target_docs = [];

      for (const d of event.data['reference']) {
        reference_docs.push(new Document(d));
      }
      for (const d of event.data['target']) {
        target_docs.push(new Document(d));
      }

      for (let i = 0; i < reference_docs.length; i++) {
        $('#left-display').append($('<option>').val(i).text('RefDoc' + (parseInt(i)+1)))
      }
      for (let i = 0; i < target_docs.length; i++) {
        $('#right-display').append($('<option>').val(i).text('TargetDoc' + (parseInt(i)+1)))
      }
    }
  }, false) ;

  $('#search-button').click(() => {
    /* loading scene */
    var loading = pleaseWait({
      logo: '',
      backgroundColor: 'rgba(150, 150, 150, 0.3)',
      loadingHtml: '<p class="loading-message">Reference / Target</p><div class="sk-rotating-plane"></div>'
    });

    $('.select-display').val('w');
    literatures['doc-reference'].resetMatch();
    literatures['doc-target'].resetMatch();
    $('#save-result').attr('disabled', true);

    const threshold = $('#threshold').val() / 100;
    const oldtime = (new Date()).getTime() / 1000;

    matches = {};
    const worker = new Worker('worker.js');
    worker.onmessage = (e) => {
      if (e.data.type === 'workerend') {
        loading.finish();
        $('#save-result').attr('disabled', false);
        $('.select-display').attr('disabled', false);
      } else if (e.data.type === 'setmatch') {
        matches[e.data.matchid] = e.data.match;
      } else if (e.data.type === 'handlenum') {
        const wording = 'Reference' + e.data.reference + ' / Target' + e.data.target;
        setLoadingMessage(wording);
        //loading.updateLoadingHtml(wording);
      }
    };
    worker.postMessage({
      'reference_docs': reference_docs,
      'target_docs': target_docs,
      'threshold': threshold
    });
    /*
    setTimeout(() => {
      for (let i = 0; i < reference_docs.length; i++) {
        for (let j = 0; j < target_docs.length; j++) {
          const [referenceRes, targetRes] =
            matchText(reference_docs[i].sentences, target_docs[j].sentences, threshold);
          matches['r' + i + ',' + 't' + j] = referenceRes;
          matches['t' + j + ',' + 'r' + i] = targetRes;
        }
      }
      loading.finish();
      $('#save-result').attr('disabled', false);
      $('#left-display').attr('disabled', false);
      $('#right-display').attr('disabled', false);
    }, 1000);
    */
  });

  $('.select-display').on('change', () => {
    let left_value = parseInt($('#left-display').val());
    let right_value = parseInt($('#right-display').val());

    if (!isNaN(left_value) && !isNaN(right_value)) {
      literatures['doc-reference'].setDocument(reference_docs[left_value]);
      literatures['doc-target'].setDocument(target_docs[right_value]);
      literatures['doc-reference'].displayContent();
      literatures['doc-target'].displayContent();
      literatures['doc-reference'].setMatch(matches['r' + left_value + ',' + 't' + right_value]);
      literatures['doc-target'].setMatch(matches['t' + right_value + ',' + 'r' + left_value]);
    }
  });

  $('#save-result').click(() => {
    const data = {};
    data['reference'] = reference.matches;
    data['target'] = target.matches;
    data['type'] = 'matchResult';
    parent.postMessage(data, '*')
  });
});