var xmls = [];
var csvs = [];

var maxRedId = 0;
var maxKey = 0;

var doc1 = [];
var doc2 = [];

class Literature {
    constructor($dom) {
        this.$dom = $dom;
        this.type = 'None';
        bindDomEvent();
    }
    
    uploadtext($where, file) {
        return new Promise(function(resolve, reject) {
            var freader = new FileReader();
            freader.onload = function(e) {
                this.type = 'text';
                this.content = e.target.result.trim();
                this.sentences = splitSentence(this.content);
                resolve();
            };
            freader.readAsText(file);
        });
    }
    
    function uploadXml(file) {
        return new Promise(function(resolve, reject) {
            var freader = new FileReader();
            freader.onload = function(e) {
                var xml = e.target.result.trim();
                xmls.push(xml);
                var xml_idx = xmls.length - 1;
                var txt = getText(e.target.result.trim());
                
                var $content = $where.closest('.content');
                $content.removeData('csv');
                $content.data('xml', xml_idx);
                $content.data('isxml', true);
                $content.data('iscsv', false);
                
                loadtext(txt, $where);
                resolve();
            };
            freader.readAsText(file);
        });
    }
    
    function displayContent() {
        $dom.find('#nocontent').addClass('nodiv');
        $dom.find('#hascontent').removeClass('nodiv');
        $dom.find('#savedoc').removeClass('nodiv');
    }
    
    function bindDomEvent() {
        var $content = $(this);
        var $textblock = $content.find('.textblock');
        
        
        // Bind upload file.
        $content.find('.txtfile').on('change', function() {
            uploadText($textblock, this.files[0]).then(displayContent);
        });
        $content.find('.xmlfile').on('change', function() {
            uploadXml($textblock, this.files[0]).then(displayContent);
        });
        $content.find('.csvfile').on('change', function() {
            uploadCsv($textblock, this.files[0]).then(displayContent);
        });
        
        /*
        // Bind edit document.
        $content.find('#editbutton').click(function() {
            if ($content.data('mode') == 'normal') {
                $textblock.attr('contenteditable', 'true');
                $(this).text('結束編輯');
                $content.data('mode', 'edit');
            } else {
                $textblock.removeAttr('contenteditable');
                $(this).text('編輯文件');
                $content.data('mode', 'normal');
                $content.find('#uploadbutton').removeClass('nodiv');
            }
        });
        $content.find('#editlink').click(function() {
            if ($content.data('mode') == 'normal') {
                $content.find('#nocontent').addClass('nodiv');
                $content.find('#hascontent').removeClass('nodiv');
                $content.find('#uploadbutton').addClass('nodiv');
                $content.find('#editbutton').text('結束編輯');
                $content.data('mode', 'edit');
            }
        });
        
        //Bind save
        $content.find('#savedoc').click(function() {
            var is_xml = $content.data('isxml');
            if(is_xml) {
                var xml_idx = $content.data('xml');
                console.log('xml');
                var doc = xmls[xml_idx].slice(0);
                
                var xml_doc = $.parseXML(doc);
                var content = $(xml_doc).find('doc_content').html();
                $content.find('.highlight').each(function() {
                    $sentence = $(this);
                    var start = $sentence.data('start');
                    var end = $sentence.data('end');
                    //console.log(start, end, $sentence.text());
                    if(Number.isInteger(start) && Number.isInteger(end)) {
                        //insert_tag(content, offset, tagName, tagType, tagRedId, tagTerm, tagKey)
                        
                        var my_align = $sentence.data('my_align') || [];
                        var ot_align = $sentence.data('ot_align') || [];
                        
                        if(my_align) {
                            var tag;
                            var reference = $sentence.data('reference');
                            //console.log(reference[0].data());
                            if(!reference) {
                                tag = null;
                            }
                            else {
                                tag = reference[0].data('tag') || null;
                            }
                            
                            content = insert_tag(content, start, 'AlignBegin', 'test', my_align[0][1], tag, my_align[0][0]);
                            content = insert_tag(content, end + 1, 'AlignEnd', 'test', my_align[0][1], tag, my_align[0][0]);
                        }
                        
                        var cnt = 1;
                        ot_align.forEach(function(e) {
                            console.log(e[2].data(), cnt);
                            cnt += 1;
                            var tag = e[2].data('tag') || null;
                            
                            content = insert_tag(content, start, 'AlignBegin', 'test2', e[1], tag, e[0]);
                            content = insert_tag(content, end + 1, 'AlignEnd', 'test2', e[1], tag, e[0]);
                        });
                    }
                });
                $(xml_doc).find('doc_content').html(content);
                doc = new XMLSerializer().serializeToString(xml_doc.documentElement);
                console.log(doc);
            }
            else {
                console.log('txt');
            }
        });
        */
    }
}


function uploadcsv($where, file) {
    return new Promise(function(resolve, reject) {
        var freader = new FileReader();
        freader.onload = function(e) {
            
            var csv = e.target.result.trim();
            var data = Papa.parse(csv, {header: true});
            csvs.push(data);
            var csv_idx = csvs.length - 1;
            
            var $content = $where.closest('.content');
            $content.removeData('xml');
            $content.data('isxml', false);
            $content.data('iscsv', true);

            $content.data('csv', csv_idx);
            
            
            loadcsv(data, $where);
            resolve();
        };
        freader.readAsText(file, 'big5');
    });
}

function deleteAlign($xml) {
    $xml.find('AlignBegin').remove();
    $xml.find('AlignEnd').remove();
}

function getText(doc) {
    var xmlDoc = $.parseXML(doc);
    var $xml = $(xmlDoc);
    var doc_cont = $xml.find('doc_content').html();
    var tokens = tokenize(doc_cont);
    
    var res = '';
    for(var i=0; i<tokens.length; i++) {
        if(tokens[i][1] == 'word') {
            res += tokens[i][0];
        }
        else if(tokens[i][1] == 'enter') {
            res += '\n';
        }
    }
    return res;
}

function csvJson(csv) {
    var lines = csv.split('\n');
    var result = [];
    var headers = lines[0].split(',');
    for(var i=1; i<lines.length; i++) {
        var obj = {};
        var currentline = lines[i].split(',');

        for(var j=0; j<headers.length; j++){
            obj[headers[j]] = currentline[j];
        }
        
        console.log(obj);
        
        result.push(obj);
    }
    
    return result;
}

function loadtext(words, $where) {
    $where.html('');
    $where.text(words);
    
    var res = splitSentence(words.trim());
    return res;
}

function loadcsv(data, $where) {
    $where.html('');
    
    var res = [];
    for(var obj of data.data) {
        var txt = obj['value'].trim();
        if(!txt) continue;
        
        var sentences = splitSentence(txt);
        for(var j=0; j<sentences.length; j++) {
            res.push(sentences[j]);
            $where.append(sentences[j]);
        }
        $where.append('<br/>');
    }
}

function highlight_ranges($where, hightlights) {
    var content = $where.text();
    $where.html('');
    var p = 0;
    for (var i = 0; i < hightlights.length; i++) {
        var pos = hightlights[i];
        $where.append(content.substring(p, pos.start));
        $where.append($('<span>').addClass('highlight').text(content.substring(pos.start, pos.end)));
        p = pos.end;
    }
    $where.append(content.substring(p, content.length));
}

function splitSentence(doc) {
    var endSymbol = ['。', '」', '？', '！'];
    var sentences = [];
    var p = 0;
    for (var i = 0; i < doc.length; i++) {
        if (endSymbol.includes(doc[i])) {
            var sentence = doc.substring(p, i + 1);
            if (sentence.length == 1 && sentences.length > 0) {
                sentences[sentences.length-1] = sentences[sentences.length-1] + sentence;
            } else {
                sentences.push(sentence);
            }
            p = i + 1;
        }
    }
    if (p < doc.length) {
        var sentence = doc.substring(p, doc.length);
        sentences.push(sentence);
    }
    return sentences;
}

function splitBlock(doc, count) {
    var sentences = [];
    var i = 0;
    var halfcount = parseInt(count/2);
    while (i + count <= doc.length) {
        var sentence = doc.substring(i, i + count);
        sentences.push(sentence);
        i += halfcount;
    }
    return sentences
}

function wordCount(sentence) {
    var result = {};
    for (var i=0; i<sentence.length; i++) {
        if (!(sentence[i] in result)) result[sentence[i]] = 0;
        result[sentence[i]]++;
    }
    return result;
}

function lcs(worda, wordb) {
    var n1 = worda.length;
    var n2 = wordb.length;
    
    var a = ' ' + worda;
    var b = ' ' + wordb;
    
    
    var len = new Array(n1+1);
    var prev = new Array(n1+1);
    
    for (var i=0; i<=n1; i++) {
        len[i] = new Array(n2+1);
        prev[i] = new Array(n2+1);
    }
    
    for (var i=0; i<=n1; i++) {
        len[i][0] = 0;
    }
    for (var j=0; j<=n2; j++) {
        len[0][j] = 0;
    }
    
    for (var i=1; i<=n1; i++) {
        for (var j=1; j<=n2; j++) {
            if (a[i] == b[j]) {
                len[i][j] = len[i-1][j-1] + 1;
                prev[i][j] = 0; //左上
            }
            else if (len[i-1][j] < len[i][j-1]) {
                len[i][j] = len[i][j-1];
                prev[i][j] = 1; //左
            }
            else {
                len[i][j] = len[i-1][j];
                prev[i][j] = 2; //上
            }
        }
    }
    return [len[n1][n2], printLcs(a, prev, len, n1, n2)];
}

function printLcs(a, prev, len, i, j) {
    var res = '';
    var l = len[i][j];
    while (l > 0) {
        if (prev[i][j] == 0) {
            l--;
            res += a[i];
            i--;
            j--;
        }
        else if (prev[i][j] == 1) {
            j--;
        }
        else if (prev[i][j] == 2) {
            i--;
        }
    }
    return res.split('').reverse().join('');
}

function search(query, $data, threshold=0.8) {
    var target = $data.data('reference') || [];
    
    $('#doc-target .textblock .sentence').each(function() {
        var $this = $(this);
        
        if (isMatch(removeSymbol($this.text()), removeSymbol(query), threshold)) {
            var reference = $this.data('reference') || [];
            var max_length = $this.data('max_length') || 0;
            if ($data.text.length > max_length) {
                reference = [$data];
                $this.data('longest', $data);
                $this.data('max_length', $data.text.length);
                
                var r_align = $this.data('my_align') || [];
                r_align = ([maxKey+1, maxRedId+1]);
                $this.data('my_align', r_align);
                
                maxKey += 1;
                maxRedId += 1;
            }
            
            var t_max_len = $data.data('max_length') || 0;
            if ($this.text.length > t_max_len) {
                target = [$this];
                $data.data('longest', $this);
                $data.data('max_length', $this.text.length);
                
                var t_align = $data.data('my_align') || [];
                t_align = ([maxKey+1, maxRedId+1]);
                $data.data('my_align', t_align);
                
                maxKey += 1;
                maxRedId += 1;
            }
            $this.addClass('highlight');
            
            
            //reference.push($data);
            $this.data('reference', reference);
            
            //target.push($this);
        }
        
        $data.data('reference', target);
        
    });
    

    $('#doc-target .textblock .highlight').each(function() {
        $this = $(this);
        console.log($this.data());
        
        var my_align = $this.data('my_align') || [];
        var reference = $this.data('reference');
        
        if(!reference) return;
        
        reference.forEach(function(e) {
            e.addClass('highlight');
            var ot_align = e.data('ot_align') || [];
            console.log(ot_align, my_align);
            ot_align.push([my_align[0][0], my_align[0][1], $this]);
            e.data('ot_align', ot_align);
        });
    });
    
    $('#doc-reference .textblock .highlight').each(function() {
        $data = $(this);
        
        var my_align = $data.data('my_align');
        var target = $data.data('reference');
        
        if(!target) return;
        
        target.forEach(function(e) {
            var ot_align = e.data('ot_align') || [];
            ot_align.push([my_align[0][0], my_align[0][1], $data]);
            e.data('ot_align', ot_align);
        });
    });
}

function tokenize(doc) {
    var tokens = [];
    var tmp = '';
    var istag = false;
    for(var i=0; i<doc.length; i++) {
        if(doc[i] == '<' && !istag) {
            if(tmp) {
                tokens.push([tmp, 'word']);
                tmp = '';
            }
            istag = true;
            tmp += doc[i];
        }
        else if(doc[i] == '>' && istag) {
            tmp += doc[i];
            if(tmp === '<br/>') {
                tokens.push([tmp, 'enter']);
            }
            else {
                tokens.push([tmp, 'tag']);
            }
            tmp = '';
            istag = false;
        }
        else if (doc[i] == '') {
            if(tmp) {
                tokens.push([tmp, 'word']);
                tmp = '';
            }
            tokens.push([doc[i], 'tag']);
        }
        else if (doc[i] != '\n') {
            tmp += doc[i];
        }
    }
    return tokens;
}

function insert_tag(content, offset, tagName, tagType, tagRedId, tagTerm, tagKey) {
    var tokens = tokenize(content);
    var cnt = 0;
    var new_tokens = [];
    
    var tag = '<';
    tag += tagName;
    tag += ' Type="' + tagType + '"';
    tag += ' RedId="' + tagRedId + '"';
    if(tagTerm) {
        tag += ' Term="' + tagTerm + '"';
    }
    tag += ' Key="' + tagKey + '"';
    tag += '/>';
    
    var i = 0;
    for(; i<=tokens.length; i++) {
        if(tokens[i][1] == 'word') {
            var cur_word = tokens[i][0];
            var cur_len = cur_word.length;
            if(cnt+cur_len > offset) {
                new_tokens.push(cur_word.slice(0, offset-cnt));
                new_tokens.push(tag);
                new_tokens.push(cur_word.slice(offset-cnt));
                i += 1;
                break;
            }
            else {
                new_tokens.push(tokens[i][0]);
            }
            cnt += cur_len;
        } else if (tokens[i][1] == 'enter') {
            new_tokens.push(tokens[i][0]);
            cnt += 1;
        }
        else {
            new_tokens.push(tokens[i][0]);
        }
    }
    
    if(cnt >= offset) {
        new_tokens.push(tag);
    }
    
    for(; i<tokens.length; i++) {
        new_tokens.push(tokens[i][0]);
    }
    
    var result = '';
    for(var i=0; i<new_tokens.length; i++) {
        result += new_tokens[i];
    }
    return result;
}

function init() {
    $('.content').each(function() {
        var $content = $(this);
        var $textblock = $content.find('.textblock');
        
        
        // Bind upload file.
        $content.find('.txtfile').on('change', function() {
            uploadtext($textblock, this.files[0]).then(() => {
                $content.find('#nocontent').addClass('nodiv');
                $content.find('#hascontent').removeClass('nodiv');
                $content.find('#savedoc').removeClass('nodiv');
            });
        });
        $content.find('.xmlfile').on('change', function() {
            uploadxml($textblock, this.files[0]).then(() => {
                $content.find('#nocontent').addClass('nodiv');
                $content.find('#hascontent').removeClass('nodiv');
                $content.find('#savedoc').removeClass('nodiv');
            });
        });
        $content.find('.csvfile').on('change', function() {
            uploadcsv($textblock, this.files[0]).then(() => {
                $content.find('#nocontent').addClass('nodiv');
                $content.find('#hascontent').removeClass('nodiv');
                $content.find('#savedoc').addClass('nodiv');
            });
        });
        
        // Bind edit document.
        $content.find('#editbutton').click(function() {
            if ($content.data('mode') == 'normal') {
                $textblock.attr('contenteditable', 'true');
                $(this).text('結束編輯');
                $content.data('mode', 'edit');
            } else {
                $textblock.removeAttr('contenteditable');
                $(this).text('編輯文件');
                $content.data('mode', 'normal');
                $content.find('#uploadbutton').removeClass('nodiv');
            }
        });
        $content.find('#editlink').click(function() {
            if ($content.data('mode') == 'normal') {
                $content.find('#nocontent').addClass('nodiv');
                $content.find('#hascontent').removeClass('nodiv');
                $content.find('#uploadbutton').addClass('nodiv');
                $content.find('#editbutton').text('結束編輯');
                $content.data('mode', 'edit');
            }
        });
        
        //Bind save
        $content.find('#savedoc').click(function() {
            var is_xml = $content.data('isxml');
            if(is_xml) {
                var xml_idx = $content.data('xml');
                console.log('xml');
                var doc = xmls[xml_idx].slice(0);
                
                var xml_doc = $.parseXML(doc);
                var content = $(xml_doc).find('doc_content').html();
                $content.find('.highlight').each(function() {
                    $sentence = $(this);
                    var start = $sentence.data('start');
                    var end = $sentence.data('end');
                    //console.log(start, end, $sentence.text());
                    if(Number.isInteger(start) && Number.isInteger(end)) {
                        //insert_tag(content, offset, tagName, tagType, tagRedId, tagTerm, tagKey)
                        
                        var my_align = $sentence.data('my_align') || [];
                        var ot_align = $sentence.data('ot_align') || [];
                        
                        if(my_align) {
                            var tag;
                            var reference = $sentence.data('reference');
                            //console.log(reference[0].data());
                            if(!reference) {
                                tag = null;
                            }
                            else {
                                tag = reference[0].data('tag') || null;
                            }
                            
                            content = insert_tag(content, start, 'AlignBegin', 'test', my_align[0][1], tag, my_align[0][0]);
                            content = insert_tag(content, end + 1, 'AlignEnd', 'test', my_align[0][1], tag, my_align[0][0]);
                        }
                        
                        var cnt = 1;
                        ot_align.forEach(function(e) {
                            console.log(e[2].data(), cnt);
                            cnt += 1;
                            var tag = e[2].data('tag') || null;
                            
                            content = insert_tag(content, start, 'AlignBegin', 'test2', e[1], tag, e[0]);
                            content = insert_tag(content, end + 1, 'AlignEnd', 'test2', e[1], tag, e[0]);
                        });
                    }
                });
                $(xml_doc).find('doc_content').html(content);
                doc = new XMLSerializer().serializeToString(xml_doc.documentElement);
                console.log(doc);
            }
            else {
                console.log('txt');
            }
        });
        
    });
    
    $('#search-button').click(function() {
        // only search when both blocks has content 
        var hascontent = true;
        $('.content').each(function() {
            if($(this).find('#hascontent').hasClass('nodiv')) {
                hascontent = false;
            }
        });
        if(!hascontent) return;
        
        // set threshold
        var threshold = $(this).siblings('#threshold').val();
        if(threshold < 0 || threshold > 100) {
            threshold = 80;
        }

        $('#doc-target .textblock .sentence').removeClass('highlight').removeData('reference');
        $('#doc-reference .textblock .sentence').removeClass('highlight').removeData('reference');
        
        // reference text
        var doc1 = [];
        $('#doc-reference .textblock .sentence').each(function($e) {
            doc1.push($e.text());
        });
        $('#doc-reference .textblock').html('');
        
        // target text
        var doc2 = [];
        $('#doc-target .textblock .sentence').each(function($e) {
            doc2.push($e.text());
        });
        
        // match
        var match_res = matchText(doc1, doc2, threshold/100);
        var l_longest = findLongest(doc1, match_res[0]);
        var r_longest = findLongest(doc2, match_res[1]);
        
        var r_ind = 0;
        var ind = 0
        /*
        $('#doc-reference .textblock .sentence').each(function() {
            if(ind == 
            
            ind += 1;
        });
        */
        
        $('#doc-reference .textblock .sentence').each(function() {
            var query = $(this).text();
            search(query, $(this), threshold/100);
        });
    });
    
    $('#doc-target .textblock').on('hover', '.sentence', function() {
        var reference = $(this).data('reference');
        if (reference) {
            var $ref_block = $('#doc-reference .textblock');
            $ref_block.find('.sentence').removeClass('overhighlight');
            for (var i = 0; i < reference.length; i++) {
                reference[i].addClass('overhighlight');
            }
        }
    }).on('click', '.sentence', function() {
        var longest = $(this).data('longest');
        if (longest){ 
            var $ref_block = $('#doc-reference .textblock');
            $ref_block.scrollTop($ref_block.scrollTop() + longest.position().top);
        }
    });
    $('#doc-reference .textblock').on('hover', '.sentence', function() {
        var target = $(this).data('reference');
        if (target) {
            var $tar_block = $('#doc-target .textblock');
            $tar_block.find('.sentence').removeClass('overhighlight');
            for (var i = 0; i < target.length; i++) {
                target[i].addClass('overhighlight');
            }
        }
    }).on('click', '.sentence', function() {
        var longest = $(this).data('longest');
        if (longest){ 
            var $tar_block = $('#doc-target .textblock');
            $tar_block.scrollTop($tar_block.scrollTop() + longest.position().top);
        }
    });
    
}

$(function() {
    init();
});
