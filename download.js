/*-----------------------downloader------------------------------------*/
const replaceAngleBrackets = ( node ) => { // 2018-09-29 Escape `Angle Brackets`
      let tmp = node.innerHTML;
      tmp = tmp.replace(new RegExp('>', 'g'), '&gt;');
      tmp = tmp.replace(new RegExp('<', 'g'), '&lt;');
      node.innerHTML = tmp;
      return node;
}

var DocuSkyExporter = function() {
    this.corpus = '';
    this.db = '';
    this.spotlights = '';
    this.userDefinedTag = {};
    this.featureAnalysis = {};
    this.featureAnalysisSettings = '';
}

DocuSkyExporter.prototype.generateDocuXml = function(selectedDocList, db, corpus, spotlights, featureAnalysisSettings) {
    let documentXml = '';
    this.db = db;
    this.corpus = corpus;
    this.spotlights = spotlights;
    this.featureAnalysisSettings = featureAnalysisSettings;
    for (let number of Object.keys(selectedDocList)) {
          let doc = selectedDocList[number];
          //documentXml += this.parseDocument({...document, number})
          let d = doc; d.number = number;
          documentXml += this.parseDocument(d);
    }
    const xmlString = "<ThdlPrototypeExport>"
                      + "<corpus name='*'>"
                      + this.generateFeatureAnalysisInfo()
                      + this.generateMetadataFieldSettings()
                      + "</corpus>"
                      + "<documents>"
                      + documentXml
                      + "</documents></ThdlPrototypeExport>";
    return xmlString;
}
DocuSkyExporter.prototype.generateFeatureAnalysisInfo = function() {
    if (!this.featureAnalysisSettings) return ""; // 2019-04-26 prevent from no feature_analysis situation
    let xmlString = '<feature_analysis>'
    const settings = this.featureAnalysisSettings.split(';')
    console.log(this.featureAnalysisSettings);
    for (let i = 0; i < settings.length; i++) {

          const setting = settings[i]
          console.log(i, setting)
          const token = setting.split(',')
          const key = token[0].split('/')
          const spotlight = token[1].split('/')
          if (key[0].substr(0, 4) == 'Udef') {
                xmlString += "<tag name='" + key[0] + "' default_sub_category='" + key[1] + "' default_category='" + key[0] + "' type='contentTagging'/>"
                xmlString += "<spotlight title='" + spotlight[0] + "' display_order='" + (i+1) + "' sub_category='" + '-' + "' category='" + key[0] + "'/>"
          } else {

          }
    }
    // for (let key of Object.keys(this.featureAnalysis)) {
    //       xmlString += "<tag name='" + key + "' default_sub_category='-' default_category='" + key + "' type='contentTagging'/>"
    // }
    xmlString += '</feature_analysis>'
    return xmlString
}
DocuSkyExporter.prototype.generateDocUserTagging = function() {
    let xmlString = ''
    for (let key of Object.keys(this.userDefinedTag)) {
          xmlString += "<tag default_sub_category='-' default_category='" + key + "' type='contentTagging'>" + key + "</tag>"
    }
    return xmlString
}
DocuSkyExporter.prototype.generateMetadataFieldSettings = function() {
  if (!this.spotlights) return ""; // 2019-04-26 prevent from no metafieldsetting situation
  let xmlString = '<metadata_field_settings>'
  const fields = this.spotlights.split(';')
  for (let field of fields) {
      const token = field.split(',')
      if (token[0].substr(1, 3) == 'ADY') {
          xmlString += '<year_for_grouping show_spotlight="Y">' + token[1] + '</year_for_grouping>'
      } else if (token[0].substr(1, 2) == 'AU') {
          xmlString += '<author show_spotlight="Y">' + token[1] + '</author>'
      } else if (token[0].substr(1, 4) == 'COMP') {
          xmlString += '<compilation_name show_spotlight="Y">' + token[1] + '</compilation_name>'
      } else if (token[0].substr(1, 4) == 'GEO3') {
          xmlString += '<geo show_spotlight="Y">' + token[1] + '</geo>'
      } else if (token[0].substr(1, 3) == 'SRC') {
          xmlString += '<doc_source show_spotlight="Y">' + token[1] + '</doc_source>'
      } else if (token[0].substr(1, 5) == 'CLASS') {
          xmlString += '<docclass show_spotlight="Y">' + token[1] + '</docclass>'
      } else if (token[0].substr(1, 6) == 'AD_YMD') {
          xmlString += '<time_varchar show_spotlight="Y">' + token[1] + '</time_varchar>'
      } else if (token[0].substr(1, 6) == 'GEO_XY') {
          //console.log('�𧊋摰𡁶儔嚗�' + token[0])
      } else if (token[0].substr(1, 14) == 'GEO1/GEO2/GEO3') {
          //console.log('�𧊋摰𡁶儔' + token[0])
      } else if (token[0].substr(1, 3) == 'GEO') {
          //console.log('�𧊋摰𡁶儔' + token[0])
      } else {
          //alert("蝻箏�穃���憿墧�嗵惜摰𡁶儔嚗�" + token[0])
      }
  }
  xmlString += '</metadata_field_settings>'
  return xmlString
}
DocuSkyExporter.prototype.convertContent = function(docContentXml) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docContentXml, "text/xml");
    this.userDefinedTag = {}
    let xmlString = this.parseUserDefinedTag(xmlDoc)
    return xmlString
}
DocuSkyExporter.prototype.convertMetadata = function(docMetadataXml) {
    if (docMetadataXml === undefined) return ''
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(docMetadataXml, "text/xml")
    let xmlString = ''
    if (xmlDoc.firstChild.nodeName === "DocMetadata")
          xmlString = xmlDoc.firstChild.innerHTML
    return xmlString
}
DocuSkyExporter.prototype.convertTitle = function(docTitleXml) {
    if (docTitleXml === undefined) return ''
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(docTitleXml, "text/xml")
    let xmlString = ''
    if (xmlDoc.firstChild.nodeName === 'DocTitle')
          xmlString = xmlDoc.firstChild.innerHTML
    return xmlString
}
DocuSkyExporter.prototype.convertTimeInfo = function({
    dateOrigStr='',
    dateDynasty='',
    dateEra='',
    dateChNormYear='',
    dateAdDate='',
    dateAdYear='',
    timeseqType='',
    timeseqNumber='',
    }) {
    return "<time_orig_str>" + dateOrigStr + "</time_orig_str>"
          + "<time_dynasty>" + dateDynasty + "</time_dynasty>"
          + "<time_era>" + dateEra + "</time_era>"
          + "<time_norm_year>" + dateChNormYear + "</time_norm_year>"
          + "<time_ad_date>" + dateAdDate + "</time_ad_date>"
          + "<time_ad_year>" + dateAdYear + "</time_ad_year>"
          + "<timeseq_type>" + timeseqType + "</timeseq_type>"
          + "<timeseq_number>" + timeseqNumber + "</timeseq_number>"
}
DocuSkyExporter.prototype.convertPlaceInfo = function({
    geoLevel1='',
    geoLevel2='',
    geoLevel3='',
    geoX='',
    geoY='',
    }) {
    return "<geo_level1>" + geoLevel1 + "</geo_level1>"
          + "<geo_level2>" + geoLevel2 + "</geo_level2>"
          + "<geo_level3>" + geoLevel3 + "</geo_level3>"
          + "<geo_longitude>" + geoX + "</geo_longitude>"
          + "<geo_latitude>" + geoY + "</geo_latitude>"
}
DocuSkyExporter.prototype.parseUserDefinedTag = function( xmlDoc ) {
    if ( xmlDoc == undefined ) return ''
    let xmlString = ''
    for ( let node of xmlDoc.childNodes) {
          if ( node.nodeName == 'Content' ) {
                xmlString += this.parseUserDefinedTag( node )
          } else if ( node.nodeName == '#text' && node.nodeType == 3 ) {
                xmlString += node.data
          } else if ( node.nodeName == '#text' && node.nodeType == 1) {
                xmlString += replaceAngleBrackets( node ).outerHTML
          } else if ( node.nodeName.substr(0, 4) == 'Udef') {
                this.featureAnalysis[node.nodeName] = node.nodeName
                this.userDefinedTag[node.nodeName] = node.nodeName
                node.innerHTML = this.parseUserDefinedTag( node )
                xmlString += node.outerHTML
          } else {
                node.innerHTML = this.parseUserDefinedTag( node )
                xmlString += node.outerHTML
          }
    }
    return xmlString
}

DocuSkyExporter.prototype.parseDocument = function({
    // 敹�閬�鞈���
    number,
    corpus,                 // corpus
    corpusOrder,            // corpus: corpus_order attribute
    docContentXml,          // doc_content
    docMetadataXml,         // xml_metadata
    docTitleXml,            // title
    docFilename,            // document: filename attribute
    timeInfo,               // dateOrigStr: time_orig_str, dateDynasty: time_dynasty,
    placeInfo,              // geoLevel1: geo_level1 ... geoLevel3: geo_level3, geoX: geo_longitude, geoY: geo_latitude
    //------------------------------------------------------
    docCompilation='',         // compilation
    docCompilationVol='',      // compilation_vol
    docSource='',              // doc_source
    docSourceOrder=0,        // doc_source: doc_source_order attribute
    docType='',                // doctype
    docXmlFormatSubname='',    // docclass; decrypted?
    docClass='',                // docclass 2019-04-22 Wayne
    docAuthor='',                 // author
    docUserTagging='',         // doc_user_tagging (DocuSky don't support this information currently)
    docTopicL1='',             // topic
    docTopicL1Order=0,
    //--------------------- other information--------------
    // �䠷�羓�鞈��� DocuXml Draft 銝行�埝�㗇�𣂷�𤤿㮾撠齿�厩�頧㗇��
    docId='',
    docTimeCreated='',
    xmlFormatName='',
    srcFilename='',
    // extraMetadata='',    // DocuSky銝齿𣈲�螱?
}) {
    const parser = new DOMParser()
    let xmlString = "<document filename='" + docFilename + "' number='" + number + "'>"
          + "<corpus corpus_order='" + corpusOrder + "'>" + this.corpus + "</corpus>" // �䠷�羓� corpus ��� this.corpus ��㕑府�㮾���
          + "<compilation>" + docCompilation + "</compilation>"
          + "<compilation_vol>" + docCompilationVol + "</compilation_vol>"
          + "<doc_content>" + this.convertContent(docContentXml) + "</doc_content>"
          + "<xml_metadata>" + this.convertMetadata(docMetadataXml) + "</xml_metadata>"
          + "<title>" + this.convertTitle(docTitleXml) + "</title>"
          + "<doc_source doc_source_order='" + docSourceOrder + "'>" + docSource + "</doc_source>"
          + "<doctype>" + docType + "</doctype>"
          + "<docclass>" + docClass + "</docclass>"
          + this.convertTimeInfo(timeInfo)
          + this.convertPlaceInfo(placeInfo)
          + "<author>" + docAuthor + "</author>"
          + "<doc_user_tagging>" + this.generateDocUserTagging() + "</doc_user_tagging>"
          + "<topic topic_order='" + docTopicL1Order + "'>" + docTopicL1 + "</topic>"
          + "<doc_id>" + docId + "</doc_id>"
          + "<doc_time_created>" + docTimeCreated + "</doc_time_created>"
          + "<xml_format_name>" + xmlFormatName + "</xml_format_name>"
          + "<src_filename>" + srcFilename + "</src_filename>"
          + "<db>" + this.db + "</db>"
          // + "<extra_metadata>" + extraMetadata + "</extra_metadata>"
          + "</document>"
    const xmlDoc = parser.parseFromString(xmlString, "text/xml")
    return xmlString
}