importScripts('logic.js');

onmessage = (e) => {
  const reference_docs = e.data.reference_docs;
  const target_docs = e.data.target_docs;
  const threshold = e.data.threshold;

  for (let i = 0; i < reference_docs.length; i++) {
    for (let j = 0; j < target_docs.length; j++) {
      postMessage({
        'type': 'handlenum',
        'reference': parseInt(i)+1,
        'target': parseInt(j)+1
      });
      const [referenceRes, targetRes] =
        matchText(reference_docs[i].sentences, target_docs[j].sentences, threshold);
      postMessage({
        'type': 'setmatch',
        'matchid': 'r' + i + ',t' + j,
        'match': referenceRes
      });
      postMessage({
        'type': 'setmatch',
        'matchid': 't' + j + ',r' + i,
        'match': targetRes
      });
    }
  }

  postMessage({
    'type': 'workerend'
  });
}